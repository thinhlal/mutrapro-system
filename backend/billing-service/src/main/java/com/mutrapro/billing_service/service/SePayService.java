package com.mutrapro.billing_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.billing_service.dto.request.CreateSePayOrderRequest;
import com.mutrapro.billing_service.dto.request.SePayCallbackRequest;
import com.mutrapro.billing_service.dto.request.TopupWalletRequest;
import com.mutrapro.billing_service.entity.PaymentOrder;
import com.mutrapro.billing_service.entity.Wallet;
import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.billing_service.enums.PaymentOrderStatus;
import com.mutrapro.billing_service.repository.PaymentOrderRepository;
import com.mutrapro.billing_service.repository.WalletRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SePayService {

    final PaymentOrderRepository paymentOrderRepository;
    final WalletRepository walletRepository;
    final WalletService walletService;
    final ObjectMapper objectMapper;
    final com.mutrapro.billing_service.repository.OutboxEventRepository outboxEventRepository;

    @Value("${sepay.api.key:}")
    String sepayApiKey;

    @Value("${sepay.account.number:VQRQACQGL7610}")
    String sepayAccountNumber;

    @Value("${sepay.account.bank:MBBank}")
    String sepayBankCode;

    @Value("${sepay.order.expiry.minutes:30}")
    int orderExpiryMinutes;

    @Value("${sepay.order.prefix:MTP-TOPUP}")
    String orderPrefix;

    /**
     * Tạo đơn hàng thanh toán với SePay
     */
    @Transactional
    public PaymentOrder createPaymentOrder(String walletId, CreateSePayOrderRequest request) {
        log.info("Creating SePay payment order: walletId={}, amount={}", walletId, request.getAmount());

        // Lấy wallet
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new RuntimeException("Wallet not found: " + walletId));

        // Validate currency
        CurrencyType currency = request.getCurrency() != null ? request.getCurrency() : CurrencyType.VND;
        if (!wallet.getCurrency().equals(currency)) {
            throw new RuntimeException("Currency mismatch");
        }

        // Validate VA Account và Bank Code trước
        String virtualAccount = sepayAccountNumber; // Dùng VA từ config
        String bankName = getBankName(sepayBankCode); // Convert bank code sang tên ngân hàng
        
        if (virtualAccount == null || virtualAccount.isEmpty() || 
            bankName == null || bankName.isEmpty()) {
            log.error("❌ Missing VA Account or Bank Code configuration");
            throw new RuntimeException("Missing VA Account or Bank Code configuration");
        }

        // Tạo payment order
        PaymentOrder paymentOrder = PaymentOrder.builder()
                .wallet(wallet)
                .amount(request.getAmount())
                .currency(currency)
                .status(PaymentOrderStatus.PENDING)
                .description(request.getDescription() != null ? request.getDescription() : "Nạp tiền vào ví")
                .virtualAccount(virtualAccount)
                .expiresAt(LocalDateTime.now().plusMinutes(orderExpiryMinutes))
                .createdAt(LocalDateTime.now())
                .build();

        PaymentOrder savedOrder = paymentOrderRepository.save(paymentOrder);

        // Format: https://qr.sepay.vn/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG
        // Bỏ dấu "-" vì khi quét QR code, dấu "-" bị mất
        // Format: MTPTOPUP{paymentOrderId} (không có dấu phân cách)
        // Bỏ dấu gạch ngang khỏi paymentOrderId (UUID format: 550e8400-e29b-41d4-a716-446655440000)
        String paymentOrderIdWithoutDash = savedOrder.getPaymentOrderId().replace("-", "");
        String transferContent = orderPrefix.replace("-", "") + paymentOrderIdWithoutDash;
        String qrCodeUrl = generateQrCodeUrl(virtualAccount, bankName, request.getAmount(), transferContent);
        
        // Update QR Code URL vào entity và save lại để đảm bảo được persist
        savedOrder.setQrCodeUrl(qrCodeUrl);
        savedOrder = paymentOrderRepository.save(savedOrder);
        
        log.info("✅ Payment order created with QR Code: paymentOrderId={}, virtualAccount={}, bankName={}, amount={}, transferContent={}, qrCodeUrl={}", 
                savedOrder.getPaymentOrderId(), virtualAccount, bankName, request.getAmount(), transferContent, qrCodeUrl);

        return savedOrder;
    }

    /**
     * Xử lý callback từ SePay
     * Theo chuẩn VietQR + SePay: parse nội dung chuyển khoản để tìm payment order
     */
    @Transactional
    public void handleCallback(SePayCallbackRequest callback) {
        // Log webhook với format mới từ SePay
        log.info("🔔 Received SePay webhook: id={}, gateway={}, transferType={}, transferAmount={}, content={}", 
                callback.getId(), callback.getGateway(), callback.getTransferType(), 
                callback.getTransferAmount(), callback.getContent());

        // Chỉ parse từ nội dung chuyển khoản (content) để tìm PaymentOrder
        // Format: MTPTOPUP{paymentOrderId} (không có dấu "-")
        String content = callback.getContent();
        if (content == null || content.isEmpty()) {
            log.error("❌ Content is empty, cannot find payment order");
            throw new RuntimeException("Content is empty, cannot find payment order");
        }

        String transferContent = content.trim();
        log.info("📝 Parsing content: {}", transferContent);
        
        // Parse format: MTPTOPUP{paymentOrderId}
        final String paymentOrderId;
        String prefixWithoutDash = orderPrefix.replace("-", "");
        
        // Pattern để tìm MTPTOPUP + 32 ký tự hex (UUID format)
        // Cho phép có ký tự phân cách (dấu chấm, khoảng trắng) giữa prefix và UUID
        Pattern pattern = Pattern.compile(prefixWithoutDash + "[.\\s_-]*([a-fA-F0-9]{32})");
        Matcher matcher = pattern.matcher(transferContent);
        
        if (matcher.find()) {
            String extractedId = matcher.group(1); // Extract UUID không có dấu gạch ngang
            // Convert UUID sang format có dấu gạch ngang để tìm trong database
            paymentOrderId = convertToUuidFormat(extractedId);
            log.info("✅ Extracted paymentOrderId from content: {} (converted to UUID: {})", 
                    extractedId, paymentOrderId);
        } else {
            log.error("❌ Could not find payment order prefix '{}' in content: {}", prefixWithoutDash, transferContent);
            throw new RuntimeException("Could not find payment order ID in content");
        }

        // Tìm payment order (không filter status vì cần check COMPLETED để tránh duplicate)
        PaymentOrder paymentOrder = paymentOrderRepository.findById(paymentOrderId)
                .orElse(null);

        if (paymentOrder == null) {
            log.error("❌ Payment order not found: sepayTransactionId={}, extractedPaymentOrderId={}, content={}", 
                    callback.getId(), paymentOrderId, callback.getContent());
            throw new RuntimeException("Payment order not found: " + paymentOrderId);
        }

        log.info("✅ Found payment order: paymentOrderId={}, status={}, amount={}", 
                paymentOrder.getPaymentOrderId(), paymentOrder.getStatus(), paymentOrder.getAmount());

        // Check nếu đã completed rồi thì skip (tránh duplicate webhook)
        if (paymentOrder.getStatus() == PaymentOrderStatus.COMPLETED) {
            log.info("⚠️ Payment order already completed, skipping: paymentOrderId={}, sepayTransactionId={}", 
                    paymentOrder.getPaymentOrderId(), paymentOrder.getSepayTransactionId());
            return;
        }

        // Chỉ xử lý nếu transferType là "in" (tiền vào)
        // Format mới: transferType = "in" nghĩa là tiền vào (thanh toán thành công)
        if (callback.getTransferType() != null && !"in".equalsIgnoreCase(callback.getTransferType())) {
            log.warn("⚠️ Ignoring webhook: transferType={} (only 'in' is processed), paymentOrderId={}", 
                    callback.getTransferType(), paymentOrder.getPaymentOrderId());
            return; // Không xử lý nếu không phải tiền vào
        }

        // Verify amount (chuyển khoản phải khớp với số tiền đơn hàng)
        if (callback.getTransferAmount() != null && 
            callback.getTransferAmount().compareTo(paymentOrder.getAmount()) != 0) {
            log.warn("⚠️ Amount mismatch: expected={}, received={}, paymentOrderId={}", 
                    paymentOrder.getAmount(), callback.getTransferAmount(), paymentOrder.getPaymentOrderId());
            // Có thể cho phép sai số nhỏ hoặc reject tùy business logic
        }

        // Lưu callback data với đầy đủ thông tin (format mới từ SePay)
        Map<String, Object> callbackData = new HashMap<>();
        callbackData.put("id", callback.getId());
        callbackData.put("gateway", callback.getGateway());
        callbackData.put("transactionDate", callback.getTransactionDate());
        callbackData.put("accountNumber", callback.getAccountNumber());
        callbackData.put("code", callback.getCode());
        callbackData.put("content", callback.getContent());
        callbackData.put("transferType", callback.getTransferType());
        callbackData.put("transferAmount", callback.getTransferAmount());
        callbackData.put("accumulated", callback.getAccumulated());
        callbackData.put("subAccount", callback.getSubAccount());
        callbackData.put("referenceCode", callback.getReferenceCode());
        callbackData.put("description", callback.getDescription());
        paymentOrder.setCallbackData(callbackData);

        // Xử lý thanh toán (transferType = "in" đã được verify ở trên)
        String transactionId = callback.getId() != null ? callback.getId().toString() : null;

        // Thanh toán thành công - nạp tiền vào ví
        // Chỉ xử lý nếu status là PENDING hoặc PROCESSING (đã check COMPLETED ở trên)
        if (paymentOrder.getStatus() == PaymentOrderStatus.PENDING || 
            paymentOrder.getStatus() == PaymentOrderStatus.PROCESSING) {
            
            // Lock payment order để tránh race condition
            PaymentOrder lockedOrder = paymentOrderRepository.findByIdWithLock(paymentOrder.getPaymentOrderId())
                    .orElseThrow(() -> new RuntimeException("Payment order not found: " + paymentOrder.getPaymentOrderId()));
            
            // Double check sau khi lock
            if (lockedOrder.getStatus() == PaymentOrderStatus.COMPLETED) {
                log.info("⚠️ Payment order already completed after lock, skipping: paymentOrderId={}", 
                        lockedOrder.getPaymentOrderId());
                return;
            }
            
            lockedOrder.setStatus(PaymentOrderStatus.PROCESSING);
            lockedOrder.setSepayTransactionId(transactionId);
            paymentOrderRepository.save(lockedOrder);

            try {
                // Nạp tiền vào ví
                TopupWalletRequest topupRequest = 
                        TopupWalletRequest.builder()
                                .amount(lockedOrder.getAmount())
                                .currency(lockedOrder.getCurrency())
                                .paymentMethod("sepay")
                                .transactionId(transactionId)
                                .gatewayResponse(objectMapper.writeValueAsString(callbackData))
                                .paymentOrderId(lockedOrder.getPaymentOrderId()) // Thêm payment order ID
                                .build();

                walletService.topupWalletFromPayment(lockedOrder.getWallet().getWalletId(), topupRequest);

                // Cập nhật trạng thái đơn hàng
                LocalDateTime completedAt = LocalDateTime.now();
                lockedOrder.setStatus(PaymentOrderStatus.COMPLETED);
                lockedOrder.setCompletedAt(completedAt);
                paymentOrderRepository.save(lockedOrder);

                // Gửi notification event qua Kafka
                publishPaymentCompletedNotification(lockedOrder, completedAt);

                log.info("✅ Payment order completed: paymentOrderId={}, sepayTransactionId={}", 
                        lockedOrder.getPaymentOrderId(), transactionId);
            } catch (Exception e) {
                log.error("❌ Error processing payment: paymentOrderId={}, error={}", 
                        lockedOrder.getPaymentOrderId(), e.getMessage(), e);
                lockedOrder.setStatus(PaymentOrderStatus.FAILED);
                paymentOrderRepository.save(lockedOrder);
                throw new RuntimeException("Error processing payment: " + e.getMessage(), e);
            }
        } else {
            log.warn("⚠️ Payment order status is not PENDING or PROCESSING: status={}, paymentOrderId={}", 
                    paymentOrder.getStatus(), paymentOrder.getPaymentOrderId());
        }
    }

    /**
     * Publish payment completed notification event
     */
    private void publishPaymentCompletedNotification(PaymentOrder paymentOrder, LocalDateTime completedAt) {
        try {
            com.mutrapro.shared.event.PaymentOrderCompletedNotificationEvent event = 
                    com.mutrapro.shared.event.PaymentOrderCompletedNotificationEvent.builder()
                            .eventId(UUID.randomUUID())
                            .paymentOrderId(paymentOrder.getPaymentOrderId())
                            .walletId(paymentOrder.getWallet().getWalletId())
                            .userId(paymentOrder.getWallet().getUserId())
                            .amount(paymentOrder.getAmount())
                            .currency(paymentOrder.getCurrency() != null ? paymentOrder.getCurrency().toString() : "VND")
                            .title("Thanh toán thành công")
                            .content(String.format("Bạn đã nạp thành công %s %s vào ví. Mã đơn hàng: %s", 
                                    paymentOrder.getAmount().toPlainString(),
                                    paymentOrder.getCurrency() != null ? paymentOrder.getCurrency().toString() : "VND",
                                    paymentOrder.getPaymentOrderId()))
                            .referenceType("PAYMENT")
                            .referenceId(paymentOrder.getPaymentOrderId())
                            .actionUrl("/payments/success/" + paymentOrder.getPaymentOrderId())
                            .completedAt(completedAt)
                            .timestamp(LocalDateTime.now())
                            .build();
            
            com.fasterxml.jackson.databind.JsonNode payload = objectMapper.valueToTree(event);
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(paymentOrder.getPaymentOrderId());
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }
            
            com.mutrapro.billing_service.entity.OutboxEvent outboxEvent = 
                    com.mutrapro.billing_service.entity.OutboxEvent.builder()
                            .aggregateId(aggregateId)
                            .aggregateType("PaymentOrder")
                            .eventType("payment.order.completed.notification")
                            .eventPayload(payload)
                            .build();
            
            outboxEventRepository.save(outboxEvent);
            log.info("Queued PaymentOrderCompletedNotificationEvent in outbox: eventId={}, paymentOrderId={}, userId={}", 
                    event.getEventId(), paymentOrder.getPaymentOrderId(), paymentOrder.getWallet().getUserId());
        } catch (Exception e) {
            log.error("Failed to enqueue PaymentOrderCompletedNotificationEvent: paymentOrderId={}, error={}", 
                    paymentOrder.getPaymentOrderId(), e.getMessage(), e);
            // Không throw exception để không fail transaction
        }
    }

    /**
     * Verify API Key từ SePay webhook
     * SePay gửi webhook với header: Authorization: "Apikey API_KEY_CUA_BAN"
     */
    public boolean verifyApiKey(String apiKeyFromHeader) {
        if (sepayApiKey == null || sepayApiKey.isEmpty()) {
            log.warn("⚠️ SePay API Key not configured");
            return false;
        }
        boolean isValid = sepayApiKey.equals(apiKeyFromHeader);
        if (!isValid) {
            log.warn("⚠️ API Key mismatch: expected={}, received={}", sepayApiKey, apiKeyFromHeader);
        }
        return isValid;
    }

    /**
     * Lấy thông tin đơn hàng thanh toán
     */
    @Transactional(readOnly = true)
    public PaymentOrder getPaymentOrder(String paymentOrderId) {
        return paymentOrderRepository.findById(paymentOrderId)
                .orElseThrow(() -> new RuntimeException("Payment order not found: " + paymentOrderId));
    }

    /**
     * Lấy payment order PENDING đầu tiên (dùng cho test)
     */
    @Transactional(readOnly = true)
    public PaymentOrder getFirstPendingOrder() {
        return paymentOrderRepository.findByStatusAndExpiresAtAfter(
                PaymentOrderStatus.PENDING, 
                LocalDateTime.now()
        ).stream()
        .findFirst()
        .orElse(null);
    }

    /**
     * Kiểm tra và cập nhật các đơn hàng đã hết hạn
     */
    @Transactional
    public void expireOldOrders() {
        LocalDateTime now = LocalDateTime.now();
        List<PaymentOrder> expiredOrders = paymentOrderRepository.findByStatusAndExpiresAtBefore(
                PaymentOrderStatus.PENDING, now);

        for (PaymentOrder order : expiredOrders) {
            order.setStatus(PaymentOrderStatus.EXPIRED);
            paymentOrderRepository.save(order);
            log.info("Expired payment order: paymentOrderId={}", order.getPaymentOrderId());
        }
    }

    /**
     * Tạo QR Code URL theo format SePay
     * Format: https://qr.sepay.vn/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG
     * 
     * @param accountNumber Số tài khoản (VA Account) - bắt buộc
     * @param bankName Tên ngân hàng (VD: Vietcombank, MBBank) - bắt buộc
     * @param amount Số tiền chuyển khoản - không bắt buộc
     * @param description Nội dung chuyển khoản - không bắt buộc
     * @return URL của QR Code image
     */
    private String generateQrCodeUrl(String accountNumber, String bankName, BigDecimal amount, String description) {
        StringBuilder url = new StringBuilder("https://qr.sepay.vn/img?");
        url.append("acc=").append(accountNumber);
        url.append("&bank=").append(encodeUrlParameter(bankName));
        
        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            url.append("&amount=").append(amount.intValue());
        }
        
        if (description != null && !description.isEmpty()) {
            url.append("&des=").append(encodeUrlParameter(description));
        }
        
        return url.toString();
    }

    /**
     * Encode URL parameter cho QR code
     */
    private String encodeUrlParameter(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /**
     * Convert bank code sang tên ngân hàng theo format SePay yêu cầu
     * SePay yêu cầu tên ngân hàng đầy đủ, không phải mã ngân hàng
     * 
     * @param bankCode Mã ngân hàng (VD: MBBank, BIDV, VCB)
     * @return Tên ngân hàng đầy đủ (VD: MBBank, BIDV, Vietcombank)
     */
    private String getBankName(String bankCode) {
        if (bankCode == null || bankCode.isEmpty()) {
            return "MBBank"; // Default
        }
        
        // Map các mã ngân hàng phổ biến sang tên đầy đủ
        Map<String, String> bankNameMap = new HashMap<>();
        bankNameMap.put("MBBank", "MBBank");
        bankNameMap.put("MB", "MBBank");
        bankNameMap.put("BIDV", "BIDV");
        bankNameMap.put("VCB", "Vietcombank");
        bankNameMap.put("Vietcombank", "Vietcombank");
        bankNameMap.put("TCB", "Techcombank");
        bankNameMap.put("Techcombank", "Techcombank");
        bankNameMap.put("ACB", "ACB");
        bankNameMap.put("VPBank", "VPBank");
        bankNameMap.put("OCB", "OCB");
        bankNameMap.put("TPBank", "TPBank");
        bankNameMap.put("VIB", "VIB");
        bankNameMap.put("SHB", "SHB");
        bankNameMap.put("MSB", "MSB");
        bankNameMap.put("HDB", "HDBank");
        bankNameMap.put("HDBank", "HDBank");
        bankNameMap.put("SCB", "SCB");
        bankNameMap.put("VTB", "Vietinbank");
        bankNameMap.put("Vietinbank", "Vietinbank");
        
        // Tìm trong map, nếu không có thì dùng chính bankCode
        return bankNameMap.getOrDefault(bankCode, bankCode);
    }

    /**
     * Convert UUID từ format không có dấu gạch ngang sang format có dấu gạch ngang
     * Format input: 32 ký tự hex (VD: "214a61627db4419c95c4c83c4987a356")
     * Format output: UUID chuẩn với dấu gạch ngang (VD: "214a6162-7db4-419c-95c4-c83c4987a356")
     * 
     * @param uuidWithoutDashes UUID không có dấu gạch ngang (32 ký tự hex)
     * @return UUID với format chuẩn (8-4-4-4-12)
     */
    private String convertToUuidFormat(String uuidWithoutDashes) {
        if (uuidWithoutDashes == null || uuidWithoutDashes.isEmpty()) {
            return uuidWithoutDashes;
        }
        
        // Nếu đã có dấu gạch ngang rồi, return ngay
        if (uuidWithoutDashes.contains("-")) {
            return uuidWithoutDashes;
        }
        
        // Loại bỏ các ký tự không phải hex
        String cleanUuid = uuidWithoutDashes.replaceAll("[^0-9a-fA-F]", "");
        
        // Nếu không đủ 32 ký tự, return nguyên bản
        if (cleanUuid.length() < 32) {
            log.warn("⚠️ UUID có độ dài ngắn hơn 32 ký tự: {}", cleanUuid);
            return cleanUuid;
        }
        
        // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8-4-4-4-12)
        if (cleanUuid.length() == 32) {
            return String.format("%s-%s-%s-%s-%s",
                    cleanUuid.substring(0, 8),
                    cleanUuid.substring(8, 12),
                    cleanUuid.substring(12, 16),
                    cleanUuid.substring(16, 20),
                    cleanUuid.substring(20, 32));
        }
        
        // Nếu không phải 32 ký tự, return nguyên bản
        return cleanUuid;
    }
}

