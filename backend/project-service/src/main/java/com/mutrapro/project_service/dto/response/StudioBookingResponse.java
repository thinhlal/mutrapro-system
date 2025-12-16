package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.RecordingSessionType;
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
import java.util.List;

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
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    List<BookingParticipantInfo> participants;  // Danh sách participants (cho tất cả luồng)
    List<BookingEquipmentInfo> requiredEquipment;  // Danh sách equipment (cho luồng 3)
    
    // Arrangement submission info (cho recording milestones)
    ArrangementSubmissionInfo sourceArrangementSubmission;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class ArrangementSubmissionInfo {
        String submissionId;
        String submissionName;
        String status;
        Integer version;
        List<FileInfo> files;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class FileInfo {
        String fileId;
        String fileName;
        String fileUrl;
        Long fileSize;
        String mimeType;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class BookingParticipantInfo {
        String participantId;
        String specialistId;
        String specialistName;  // Enriched from specialist-service
        String roleType;  // VOCAL or INSTRUMENT
        String performerSource;  // INTERNAL_ARTIST or CUSTOMER_SELF
        String skillId;
        String skillName;  // Enriched
        String instrumentSource;  // STUDIO_SIDE or CUSTOMER_SIDE
        String equipmentId;
        BigDecimal participantFee;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class BookingEquipmentInfo {
        String equipmentId;
        String equipmentName;  // Enriched from Equipment entity
        Integer quantity;
        BigDecimal rentalFeePerUnit;
        BigDecimal totalRentalFee;
    }
}

