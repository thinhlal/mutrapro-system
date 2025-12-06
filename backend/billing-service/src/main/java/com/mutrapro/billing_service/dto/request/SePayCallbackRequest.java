package com.mutrapro.billing_service.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO cho SePay callback/webhook
 * Format chính thức từ SePay API
 * 
 * SePay sẽ gửi webhook với format:
 * {
 *   "id": 92704,
 *   "gateway": "Vietcombank",
 *   "transactionDate": "2023-03-25 14:02:37",
 *   "accountNumber": "0123499999",
 *   "code": null,
 *   "content": "chuyen tien mua iphone",
 *   "transferType": "in",
 *   "transferAmount": 2277000,
 *   "accumulated": 19077000,
 *   "subAccount": null,
 *   "referenceCode": "MBVCB.3278907687",
 *   "description": ""
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class SePayCallbackRequest {
    
    // Format mới từ SePay (chính thức)
    Long id;  // ID giao dịch trên SePay
    
    String gateway;  // Brand name của ngân hàng (VD: "Vietcombank", "MBBank")
    
    @JsonProperty("transactionDate")
    String transactionDate;  // Thời gian xảy ra giao dịch phía ngân hàng (format: "2023-03-25 14:02:37")
    
    @JsonProperty("accountNumber")
    String accountNumber;  // Số tài khoản ngân hàng nhận tiền
    
    String code;  // Mã code thanh toán (SePay tự nhận diện dựa vào cấu hình tại Công ty -> Cấu hình chung)
    
    String content;  // Nội dung chuyển khoản (quan trọng: chứa mã đơn hàng như "MTPTOPUP{paymentOrderId}")
    
    @JsonProperty("transferType")
    String transferType;  // Loại giao dịch: "in" (tiền vào), "out" (tiền ra)
    
    @JsonProperty("transferAmount")
    BigDecimal transferAmount;  // Số tiền giao dịch
    
    BigDecimal accumulated;  // Số dư tài khoản (lũy kế)
    
    @JsonProperty("subAccount")
    String subAccount;  // Tài khoản ngân hàng phụ (tài khoản định danh)
    
    @JsonProperty("referenceCode")
    String referenceCode;  // Mã tham chiếu của tin nhắn sms (VD: "MBVCB.3278907687")
    
    String description;  // Toàn bộ nội dung tin nhắn sms
}

