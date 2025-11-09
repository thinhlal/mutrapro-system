package com.mutrapro.request_service.dto.response;

import com.mutrapro.request_service.enums.CurrencyType;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PriceCalculationResponse {
    
    /**
     * Giá cơ bản từ pricing matrix
     */
    BigDecimal basePrice;
    
    /**
     * Số đơn vị (phút/bài/giờ)
     */
    BigDecimal quantity;
    
    /**
     * Giá tính theo đơn vị
     */
    BigDecimal unitPrice;
    
    /**
     * Phí bổ sung (ví dụ: artist fee cho arrangement_with_recording)
     */
    BigDecimal additionalFee;
    
    /**
     * Tổng giá
     */
    BigDecimal totalPrice;
    
    /**
     * Loại tiền tệ
     */
    CurrencyType currency;
    
    /**
     * Chi tiết breakdown (optional)
     */
    List<PriceBreakdownItem> breakdown;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class PriceBreakdownItem {
        String label;
        BigDecimal amount;
        String description;
    }
}

