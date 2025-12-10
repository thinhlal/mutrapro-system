package com.mutrapro.project_service.dto.request;

import com.mutrapro.project_service.enums.RecordingSessionType;
import jakarta.validation.constraints.NotBlank;
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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class CreateStudioBookingRequest {

    @NotBlank(message = "Milestone ID is required")
    String milestoneId;  // Milestone recording cần tạo booking

    RecordingSessionType sessionType;  // Optional - default ARTIST_ASSISTED cho arrangement_with_recording

    @NotNull(message = "Booking date is required")
    LocalDate bookingDate;

    @NotNull(message = "Start time is required")
    LocalTime startTime;

    @NotNull(message = "End time is required")
    LocalTime endTime;

    @NotNull(message = "Duration hours is required")
    BigDecimal durationHours;

    Integer externalGuestCount;  // Optional, default 0

    // Session details
    String purpose;  // Optional
    String specialInstructions;  // Optional
    String notes;  // Optional

    // Genres từ request (để filter vocalists phù hợp) - Optional
    // Frontend đã có genres từ request, truyền xuống để tránh gọi request-service
    List<String> genres;  // Optional - Danh sách genres (VD: ["Pop", "Rock"])

    // Artists tham gia session (cho luồng 2: arrangement_with_recording)
    // Manager chọn từ preferredSpecialists mà customer đã chọn
    List<ArtistBookingInfo> artists;  // Optional - danh sách artist tham gia
}

