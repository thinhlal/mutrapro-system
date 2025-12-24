package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.Review;
import com.mutrapro.project_service.enums.ReviewType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, String> {

    // Find review by assignment ID and customer ID (unique constraint check)
    Optional<Review> findByAssignmentIdAndCustomerId(String assignmentId, String customerId);

    // Find all reviews by assignment ID
    List<Review> findByAssignmentId(String assignmentId);

    // Find all reviews by specialist ID (for specialist profile)
    Page<Review> findBySpecialistId(String specialistId, Pageable pageable);

    // Find all reviews by contract ID
    List<Review> findByContractId(String contractId);

    // Find all reviews by milestone ID
    List<Review> findByMilestoneId(String milestoneId);

    // Count reviews by specialist ID
    long countBySpecialistId(String specialistId);

    // Calculate average rating by specialist ID
    // Chỉ tính TASK và PARTICIPANT reviews (không tính REQUEST reviews vì REQUEST không có specialistId cụ thể)
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.specialistId = :specialistId AND (r.reviewType = 'TASK' OR r.reviewType = 'PARTICIPANT')")
    Double calculateAverageRatingBySpecialistId(@Param("specialistId") String specialistId);

    // Check if assignment has been reviewed by customer
    boolean existsByAssignmentIdAndCustomerId(String assignmentId, String customerId);

    // Check if participant has been reviewed by this customer
    boolean existsByParticipantIdAndCustomerId(String participantId, String customerId);

    // Check if request has REQUEST review by this customer
    boolean existsByRequestIdAndCustomerIdAndReviewType(String requestId, String customerId, ReviewType reviewType);

    // Find all reviews by request ID
    List<Review> findByRequestId(String requestId);

    // Admin: Find all reviews with filters
    @Query("SELECT r FROM Review r WHERE " +
            "(:reviewType IS NULL OR r.reviewType = :reviewType) AND " +
            "(:specialistId IS NULL OR r.specialistId = :specialistId) AND " +
            "(:requestId IS NULL OR r.requestId = :requestId) AND " +
            "(:minRating IS NULL OR r.rating >= :minRating) AND " +
            "(:maxRating IS NULL OR r.rating <= :maxRating) AND " +
            "(:customerId IS NULL OR r.customerId = :customerId)")
    Page<Review> findAllWithFilters(
            @Param("reviewType") ReviewType reviewType,
            @Param("specialistId") String specialistId,
            @Param("requestId") String requestId,
            @Param("minRating") Integer minRating,
            @Param("maxRating") Integer maxRating,
            @Param("customerId") String customerId,
            Pageable pageable);
}

