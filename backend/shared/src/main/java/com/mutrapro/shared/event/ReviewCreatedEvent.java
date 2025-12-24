package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event được publish khi customer tạo review cho task assignment
 * Dùng cho Kafka event-driven communication giữa project-service và specialist-service
 * Specialist-service sẽ consume event này để update specialist.rating
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewCreatedEvent implements Serializable {

    private UUID eventId;

    private String reviewId;
    private String specialistId;
    private String assignmentId;
    private String contractId;
    private String customerId;
    private Integer rating;
    private String comment;
    private LocalDateTime timestamp;
}

