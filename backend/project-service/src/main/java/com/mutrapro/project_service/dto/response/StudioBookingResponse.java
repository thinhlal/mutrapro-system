package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.RecordingSessionType;
import com.mutrapro.project_service.enums.ReservationFeeStatus;
import com.mutrapro.project_service.enums.StudioBookingContext;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class StudioBookingResponse {

    String bookingId;
    String userId;
    String studioId;
    String studioName;  // Từ Studio entity
    String requestId;
    String contractId;
    String milestoneId;  // Link với milestone recording
    StudioBookingContext context;
    RecordingSessionType sessionType;
    LocalDate bookingDate;
    LocalTime startTime;
    LocalTime endTime;
    BookingStatus status;
    LocalDateTime holdExpiresAt;
    Integer externalGuestCount;
    BigDecimal durationHours;
    BigDecimal artistFee;
    BigDecimal equipmentRentalFee;
    BigDecimal externalGuestFee;
    BigDecimal totalCost;
    String purpose;
    String specialInstructions;
    String notes;
    BigDecimal reservationFeeAmount;
    ReservationFeeStatus reservationFeeStatus;
    String reservationWalletTxId;
    String reservationRefundWalletTxId;
    String reservationAppliedToMilestoneId;
    String refundPolicyJson;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

