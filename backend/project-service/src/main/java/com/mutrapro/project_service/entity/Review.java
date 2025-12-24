package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.ReviewType;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Review Entity - Đánh giá của customer về task assignment và specialist
 * Bảng: reviews
 * 
 * QUAN TRỌNG: Rate task assignment = Rate specialist
 * - Mỗi task assignment gắn với 1 specialist cụ thể
 * - Khi customer rate task assignment, họ đang rate cả task và specialist
 * - Rating này được dùng để tính average rating của specialist
 * 
 * Mỗi task assignment chỉ có thể được rate 1 lần bởi 1 customer
 */
@Entity
@Table(name = "reviews", indexes = {
    @Index(name = "idx_reviews_assignment_id", columnList = "assignment_id"),
    @Index(name = "idx_reviews_specialist_id", columnList = "specialist_id"),
    @Index(name = "idx_reviews_contract_id", columnList = "contract_id"),
    @Index(name = "idx_reviews_request_id", columnList = "request_id"),
    @Index(name = "idx_reviews_customer_id", columnList = "customer_id"),
    @Index(name = "idx_reviews_milestone_id", columnList = "milestone_id"),
    @Index(name = "idx_reviews_participant_id", columnList = "participant_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Review extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "review_id", nullable = false)
    String reviewId;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_type", nullable = false, length = 20)
    ReviewType reviewType;

    // Đối tượng được rate
    @Column(name = "assignment_id")
    String assignmentId;  // Task assignment được rate (TASK/PARTICIPANT)

    @Column(name = "specialist_id")
    String specialistId;  // Specialist được rate (soft reference to specialist-service)

    // Context
    @Column(name = "contract_id")
    String contractId;  // Contract ID (cho TASK và PARTICIPANT reviews, nullable cho REQUEST review)

    @Column(name = "request_id")
    String requestId;  // Service request ID (cho REQUEST review type, required cho REQUEST)

    @Column(name = "milestone_id")
    String milestoneId;

    @Column(name = "participant_id")
    String participantId; // booking_participants.participant_id khi review PARTICIPANT

    // Người rate
    @Column(name = "customer_id", nullable = false)
    String customerId;  // Customer đánh giá (soft reference to identity-service)

    // Nội dung đánh giá
    @Column(name = "rating", nullable = false)
    Integer rating;  // 1-5 stars

    @Column(name = "comment", columnDefinition = "TEXT")
    String comment;  // Feedback chi tiết (optional)
}

