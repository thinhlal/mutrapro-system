package com.mutrapro.project_service.dto.request;

import com.mutrapro.project_service.enums.RecordingSessionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO để tạo studio booking từ service request (Luồng 3: Recording)
 * 
 * Flow:
 * 1. Customer tạo service request (request-service)
 * 2. Customer tạo booking từ request với participants và equipment (project-service)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class CreateStudioBookingFromRequestRequest {

    @NotNull(message = "Booking date is required")
    LocalDate bookingDate;

    @NotNull(message = "Start time is required")
    LocalTime startTime;

    @NotNull(message = "End time is required")
    LocalTime endTime;

    @NotNull(message = "Duration hours is required")
    BigDecimal durationHours;

    RecordingSessionType sessionType; // Optional - Default SELF_RECORDING hoặc ARTIST_ASSISTED

    Integer externalGuestCount; // Optional, default 0

    // Session details
    String purpose; // Optional
    String specialInstructions; // Optional
    String notes; // Optional

    // Participants (vocal và instrumental)
    @Valid
    List<ParticipantRequest> participants; // Optional - Danh sách participants

    // Required equipment (CHỈ equipment có instrument_source = STUDIO_SIDE)
    @Valid
    List<RequiredEquipmentRequest> requiredEquipment; // Optional - Danh sách equipment cần thuê
}

