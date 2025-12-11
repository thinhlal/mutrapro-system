package com.mutrapro.request_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateEquipmentRequest {
    
    @NotBlank(message = "Equipment name is required")
    @Size(max = 100, message = "Equipment name must not exceed 100 characters")
    String equipmentName;
    
    @Size(max = 50, message = "Brand must not exceed 50 characters")
    String brand;
    
    @Size(max = 100, message = "Model must not exceed 100 characters")
    String model;
    
    String description;
    
    Object specifications; // JSON object for technical specs
    
    @PositiveOrZero(message = "Rental fee must be 0 or greater")
    BigDecimal rentalFee; // Optional - default 0
    
    @PositiveOrZero(message = "Total quantity must be 0 or greater")
    Integer totalQuantity; // Optional - default 1
    
    Boolean isActive; // Optional - default true
    
    MultipartFile image; // Optional image file
    
    /**
     * Danh sách skill_ids để map với equipment này
     * Nếu null hoặc empty, equipment sẽ không được map với skill nào
     */
    List<String> skillIds;
}

