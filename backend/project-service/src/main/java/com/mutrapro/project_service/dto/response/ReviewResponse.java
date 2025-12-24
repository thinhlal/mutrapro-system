package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.ReviewType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private String reviewId;
    private ReviewType reviewType;
    private String assignmentId;
    private String specialistId;
    private String specialistName;  // Snapshot from assignment
    private String contractId;
    private String requestId;
    private String milestoneId;
    private String participantId;
    private String bookingId;  // Booking ID (cho PARTICIPANT reviews)
    private String customerId;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

