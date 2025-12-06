package com.mutrapro.billing_service.controller;

import com.mutrapro.billing_service.dto.request.CreateSePayOrderRequest;
import com.mutrapro.billing_service.dto.request.SePayCallbackRequest;
import com.mutrapro.billing_service.dto.response.PaymentOrderResponse;
import com.mutrapro.billing_service.entity.PaymentOrder;
import com.mutrapro.billing_service.mapper.PaymentOrderMapper;
import com.mutrapro.billing_service.repository.WalletRepository;
import com.mutrapro.billing_service.service.SePayService;
import com.mutrapro.billing_service.service.WalletService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@Tag(name = "Payment", description = "Payment Gateway API (SePay)")
public class PaymentController {

    private final SePayService sePayService;
    private final WalletService walletService;
    private final PaymentOrderMapper paymentOrderMapper;
    private final WalletRepository walletRepository;

    @PostMapping("/orders")
    @Operation(summary = "Tạo đơn hàng thanh toán với SePay để nạp tiền vào ví")
    public ApiResponse<PaymentOrderResponse> createPaymentOrder(
            @Valid @RequestBody CreateSePayOrderRequest request) {
        log.info("Creating payment order: amount={}", request.getAmount());
        
        // Lấy wallet của user hiện tại
        String walletId = walletService.getOrCreateWallet().getWalletId();
        
        PaymentOrder order = sePayService.createPaymentOrder(walletId, request);
        PaymentOrderResponse response = paymentOrderMapper.toResponse(order);
        
        return ApiResponse.<PaymentOrderResponse>builder()
                .message("Payment order created successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/orders/{walletId}")
    @Operation(summary = "Tạo đơn hàng thanh toán với SePay cho wallet cụ thể")
    public ApiResponse<PaymentOrderResponse> createPaymentOrderForWallet(
            @Parameter(description = "ID của ví")
            @PathVariable String walletId,
            @Valid @RequestBody CreateSePayOrderRequest request) {
        log.info("Creating payment order for wallet: walletId={}, amount={}", walletId, request.getAmount());
        
        PaymentOrder order = sePayService.createPaymentOrder(walletId, request);
        PaymentOrderResponse response = paymentOrderMapper.toResponse(order);
        
        return ApiResponse.<PaymentOrderResponse>builder()
                .message("Payment order created successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/sepay/webhook")
    @Operation(summary = "Webhook callback từ SePay (xác thực bằng API Key trong header)")
    @ResponseStatus(HttpStatus.OK)  // SePay yêu cầu HTTP status 200 hoặc 201
    public Map<String, Object> handleSePayWebhook(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody SePayCallbackRequest callback) {
        log.info("Received SePay webhook: id={}, gateway={}, transferType={}, transferAmount={}", 
                callback.getId(), callback.getGateway(), callback.getTransferType(), callback.getTransferAmount());
        
        // Xác thực API Key từ header Authorization
        // Format: "Apikey API_KEY_CUA_BAN"
        if (authorization == null || !authorization.startsWith("Apikey ")) {
            log.error("❌ Invalid Authorization header: {}", authorization);
            return Map.of("success", false, "message", "Invalid Authorization header");
        }
        
        String apiKeyFromHeader = authorization.substring(7); // Bỏ "Apikey "
        if (!sePayService.verifyApiKey(apiKeyFromHeader)) {
            log.error("❌ Invalid API Key: {}", apiKeyFromHeader);
            return Map.of("success", false, "message", "Invalid API Key");
        }
        
        try {
            sePayService.handleCallback(callback);
            // SePay yêu cầu response: {"success": true} với HTTP status 200 hoặc 201
            log.info("✅ Webhook processed successfully: id={}", callback.getId());
            return Map.of("success", true, "message", "Webhook processed successfully");
        } catch (Exception e) {
            log.error("❌ Error processing SePay webhook: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "Error processing webhook: " + e.getMessage());
        }
    }

    @GetMapping("/orders/{paymentOrderId}")
    @Operation(summary = "Lấy thông tin đơn hàng thanh toán")
    public ApiResponse<PaymentOrderResponse> getPaymentOrder(
            @Parameter(description = "ID của đơn hàng thanh toán")
            @PathVariable String paymentOrderId) {
        log.info("Getting payment order: paymentOrderId={}", paymentOrderId);
        
        PaymentOrder order = sePayService.getPaymentOrder(paymentOrderId);
        PaymentOrderResponse response = paymentOrderMapper.toResponse(order);
        
        return ApiResponse.<PaymentOrderResponse>builder()
                .message("Payment order retrieved successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/orders/{paymentOrderId}/qr")
    @Operation(summary = "Lấy QR code để quét thanh toán")
    public ApiResponse<Map<String, String>> getPaymentOrderQrCode(
            @Parameter(description = "ID của đơn hàng thanh toán")
            @PathVariable String paymentOrderId) {
        log.info("Getting QR code for payment order: paymentOrderId={}", paymentOrderId);
        
        PaymentOrder order = sePayService.getPaymentOrder(paymentOrderId);
        
        Map<String, String> qrData = new HashMap<>();
        if (order.getQrCodeUrl() != null && !order.getQrCodeUrl().isEmpty()) {
            qrData.put("qr_code_url", order.getQrCodeUrl());
            qrData.put("type", "url");
        } else {
            qrData.put("error", "QR code not available for this payment order");
            qrData.put("type", "error");
        }
        
        return ApiResponse.<Map<String, String>>builder()
                .message("QR code retrieved successfully")
                .data(qrData)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/orders/test")
    @Operation(summary = "Test tạo payment order (chỉ dùng cho development, tự động tạo wallet nếu chưa có)")
    public ApiResponse<PaymentOrderResponse> testCreatePaymentOrder(
            @Parameter(description = "Số tiền nạp")
            @RequestParam(required = false, defaultValue = "100000") String amount,
            @Parameter(description = "Mô tả đơn hàng")
            @RequestParam(required = false) String description,
            @Parameter(description = "ID của wallet (nếu không có sẽ tự động tạo wallet mới)")
            @RequestParam(required = false) String walletId) {
        log.info("🧪 Testing create payment order: amount={}, walletId={}", amount, walletId);
        
        try {
            // Tạo hoặc lấy wallet
            String targetWalletId;
            if (walletId != null && !walletId.isEmpty()) {
                targetWalletId = walletId;
            } else {
                // Tự động tạo wallet mới cho test
                try {
                    targetWalletId = walletService.getOrCreateWallet().getWalletId();
                } catch (Exception e) {
                    // Nếu không có authentication, tạo wallet test với userId = "test-user"
                    log.warn("⚠️ No authentication, creating test wallet");
                    com.mutrapro.billing_service.entity.Wallet testWallet = com.mutrapro.billing_service.entity.Wallet.builder()
                            .userId("test-user-" + System.currentTimeMillis())
                            .balance(java.math.BigDecimal.ZERO)
                            .currency(com.mutrapro.billing_service.enums.CurrencyType.VND)
                            .build();
                    com.mutrapro.billing_service.entity.Wallet savedWallet = walletRepository.save(testWallet);
                    targetWalletId = savedWallet.getWalletId();
                }
            }
            
            // Tạo request
            CreateSePayOrderRequest request = CreateSePayOrderRequest.builder()
                    .amount(new java.math.BigDecimal(amount))
                    .currency(com.mutrapro.billing_service.enums.CurrencyType.VND)
                    .description(description != null ? description : "Test payment order")
                    .build();
            
            // Tạo payment order
            PaymentOrder order = sePayService.createPaymentOrder(targetWalletId, request);
            PaymentOrderResponse response = paymentOrderMapper.toResponse(order);
            
            log.info("✅ Test payment order created: paymentOrderId={}, walletId={}, amount={}", 
                    order.getPaymentOrderId(), targetWalletId, amount);
            
            return ApiResponse.<PaymentOrderResponse>builder()
                    .message("Test payment order created successfully")
                    .data(response)
                    .statusCode(HttpStatus.OK.value())
                    .status("success")
                    .build();
        } catch (Exception e) {
            log.error("❌ Error creating test payment order: {}", e.getMessage(), e);
            throw new RuntimeException("Error creating test payment order: " + e.getMessage(), e);
        }
    }


    @PostMapping("/sepay/webhook/test")
    @Operation(summary = "Test webhook từ SePay (chỉ dùng cho development, không cần API Key)")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> testSePayWebhook(
            @Parameter(description = "ID của payment order để test")
            @RequestParam(required = false) String paymentOrderId,
            @Parameter(description = "Số tiền (nếu không có sẽ dùng số tiền của payment order)")
            @RequestParam(required = false) String amount,
            @Parameter(description = "Nội dung chuyển khoản (nếu không có sẽ tự động tạo theo format MTPTOPUP{paymentOrderId})")
            @RequestParam(required = false) String content) {
        log.info("🧪 Testing SePay webhook: paymentOrderId={}, amount={}, content={}", 
                paymentOrderId, amount, content);
        
        try {
            // Nếu không có paymentOrderId, tìm order PENDING đầu tiên
            PaymentOrder order;
            if (paymentOrderId == null || paymentOrderId.isEmpty()) {
                order = sePayService.getFirstPendingOrder();
                if (order == null) {
                    return Map.of(
                            "success", false,
                            "message", "No pending payment order found. Please create a payment order first.",
                            "hint", "Call POST /payments/orders to create a payment order"
                    );
                }
                paymentOrderId = order.getPaymentOrderId();
            } else {
                order = sePayService.getPaymentOrder(paymentOrderId);
            }
            
            // Tạo mock webhook request
            SePayCallbackRequest mockCallback = SePayCallbackRequest.builder()
                    .id(System.currentTimeMillis()) // Mock transaction ID
                    .gateway("MBBank")
                    .transactionDate(java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                    .accountNumber(order.getVirtualAccount())
                    .code(null)
                    .content(content != null ? content : String.format("MTPTOPUP%s", paymentOrderId))
                    .transferType("in") // Tiền vào
                    .transferAmount(amount != null ? new java.math.BigDecimal(amount) : order.getAmount())
                    .accumulated(new java.math.BigDecimal("100000000")) // Mock số dư
                    .subAccount(null)
                    .referenceCode("TEST." + System.currentTimeMillis())
                    .description("Test webhook from development")
                    .build();
            
            // Gọi handleCallback (bypass API key check)
            sePayService.handleCallback(mockCallback);
            
            log.info("✅ Test webhook processed successfully: paymentOrderId={}", paymentOrderId);
            return Map.of(
                    "success", true,
                    "message", "Test webhook processed successfully",
                    "paymentOrderId", paymentOrderId,
                    "mockData", Map.of(
                            "id", mockCallback.getId(),
                            "transferAmount", mockCallback.getTransferAmount(),
                            "content", mockCallback.getContent(),
                            "transferType", mockCallback.getTransferType()
                    )
            );
        } catch (Exception e) {
            log.error("❌ Error processing test webhook: {}", e.getMessage(), e);
            return Map.of(
                    "success", false,
                    "message", "Error processing test webhook: " + e.getMessage(),
                    "error", e.getClass().getSimpleName()
            );
        }
    }
}

