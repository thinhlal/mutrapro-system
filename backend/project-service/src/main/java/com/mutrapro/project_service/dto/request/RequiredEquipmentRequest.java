package com.mutrapro.project_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO cho equipment cần thiết cho booking
 * CHỈ lưu equipment có instrument_source = STUDIO_SIDE (cần tính phí thuê)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class RequiredEquipmentRequest {

    @NotBlank(message = "Equipment ID is required")
    String equipmentId; // Reference to project-service.equipment.equipment_id

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be positive")
    Integer quantity; // Default 1

    @NotNull(message = "Rental fee per unit is required")
    BigDecimal rentalFeePerUnit; // Phí thuê mỗi đơn vị

    // Optional: Total rental fee (nếu không có, sẽ tính = quantity * rentalFeePerUnit)
    BigDecimal totalRentalFee; // Optional - Tổng phí thuê = quantity * rentalFeePerUnit

    // Optional: Link to specific participant using this equipment
    String participantId; // Optional - Ref to booking_participants.participant_id
}

