package com.mutrapro.billing_service.entity;

import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.billing_service.enums.PaymentOrderStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "payment_orders", indexes = {
    @Index(name = "idx_payment_order_wallet_id", columnList = "wallet_id"),
    @Index(name = "idx_payment_order_status", columnList = "status"),
    @Index(name = "idx_payment_order_virtual_account", columnList = "virtual_account"),
    @Index(name = "idx_payment_order_created_at", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "payment_order_id", nullable = false)
    String paymentOrderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    Wallet wallet;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    BigDecimal amount;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false, length = 10)
    CurrencyType currency = CurrencyType.VND;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    PaymentOrderStatus status = PaymentOrderStatus.PENDING;

    @Column(name = "sepay_transaction_id")
    String sepayTransactionId;  // Transaction ID từ SePay sau khi thanh toán thành công

    @Column(name = "virtual_account")
    String virtualAccount;  // Virtual Account (VA) từ SePay - dùng để nhận tiền

    @Column(name = "qr_code_url", length = 1000)
    String qrCodeUrl;  // URL của QR code để quét thanh toán

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "callback_data", columnDefinition = "jsonb")
    Map<String, Object> callbackData;  // Dữ liệu từ SePay callback

    @Column(name = "description")
    String description;  // Mô tả đơn hàng

    @Column(name = "expires_at")
    LocalDateTime expiresAt;  // Thời gian hết hạn đơn hàng

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @Column(name = "completed_at")
    LocalDateTime completedAt;  // Thời gian hoàn thành thanh toán

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

