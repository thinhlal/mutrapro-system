package com.mutrapro.project_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EquipmentResponse {
    String equipmentId;
    String equipmentName;
    String brand;
    String model;
    String description;
    Object specifications; // JSON object
    BigDecimal rentalFee;
    Integer totalQuantity;
    Integer availableQuantity; // same as totalQuantity (no maintenance tracking)
    Boolean isActive;
    String image; // Public S3 URL
    
    /**
     * Danh sách skill_ids được map với equipment này
     * Chỉ có khi lấy chi tiết equipment
     */
    List<String> skillIds;
}

