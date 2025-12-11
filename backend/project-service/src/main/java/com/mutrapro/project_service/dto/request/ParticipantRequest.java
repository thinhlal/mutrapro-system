package com.mutrapro.project_service.dto.request;

import com.mutrapro.project_service.enums.InstrumentSource;
import com.mutrapro.project_service.enums.PerformerSource;
import com.mutrapro.project_service.enums.SessionRoleType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO cho participant trong booking
 * Hỗ trợ cả VOCAL và INSTRUMENT roles
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class ParticipantRequest {

    @NotNull(message = "Role type is required")
    SessionRoleType roleType; // VOCAL | INSTRUMENT

    @NotNull(message = "Performer source is required")
    PerformerSource performerSource; // CUSTOMER_SELF | INTERNAL_ARTIST

    // Nếu performerSource = INTERNAL_ARTIST
    String specialistId; // Optional - Soft reference to specialist-service

    // CHỈ CHO INSTRUMENT role
    String skillId; // Optional - Soft reference to specialist-service.skills.skill_id
    // LƯU Ý: skill_id BẮT BUỘC nếu roleType = INSTRUMENT

    // CHỈ CHO INSTRUMENT role
    InstrumentSource instrumentSource; // Optional - STUDIO_SIDE | CUSTOMER_SIDE

    // CHỈ CHO INSTRUMENT role và instrumentSource = STUDIO_SIDE
    String equipmentId; // Optional - Reference to project-service.equipment.equipment_id
    // LƯU Ý: equipment_id PHẢI match với skill_id qua skill_equipment_mapping

    // Phí performer (chỉ cho INTERNAL_ARTIST)
    BigDecimal participantFee; // Optional - Default 0

    // Metadata
    Boolean isPrimary; // Optional - Default false

    String notes; // Optional
}

