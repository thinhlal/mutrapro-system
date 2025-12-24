package com.mutrapro.project_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.project_service.dto.request.CreateReviewRequest;
import com.mutrapro.project_service.dto.response.ReviewResponse;
import com.mutrapro.project_service.entity.BookingParticipant;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.entity.Review;
import com.mutrapro.project_service.entity.StudioBooking;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.ReviewType;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.InvalidStateException;
import com.mutrapro.project_service.exception.ReviewAlreadyExistsException;
import com.mutrapro.project_service.exception.TaskAssignmentNotFoundException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.exception.ValidationException;
import com.mutrapro.project_service.repository.BookingParticipantRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.repository.ReviewRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import com.mutrapro.shared.dto.PageResponse;
import com.mutrapro.shared.event.ReviewCreatedEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReviewService {

    ReviewRepository reviewRepository;
    TaskAssignmentRepository taskAssignmentRepository;
    ContractRepository contractRepository;
    BookingParticipantRepository bookingParticipantRepository;
    OutboxEventRepository outboxEventRepository;
    ObjectMapper objectMapper;

    /**
     * Tạo TASK review cho task assignment
     * 
     * QUAN TRỌNG: Rate task assignment = Rate specialist
     * - Mỗi task assignment gắn với 1 specialist cụ thể
     * - Khi customer rate task assignment, họ đang rate cả:
     *   + Task assignment (công việc cụ thể: transcription/arrangement/recording_supervision)
     *   + Specialist (người làm task đó)
     * - Rating này sẽ được dùng để tính average rating của specialist
     * 
     * TASK review dành cho specialist khi họ làm task assignment và deliver file:
     * - Transcription specialist (transcription task) - ký âm và nộp file
     * - Arrangement specialist (arrangement task) - hòa âm và nộp file
     * - Arrangement specialist (recording_supervision task) - GIÁM SÁT buổi thu và NỘP FILE
     *   → Đây là task assignment bình thường, arrangement specialist phải supervise và deliver file
     *   → Customer review về chất lượng giám sát và file được deliver
     * 
     * PARTICIPANT review dành cho:
     * - Recording artist (vocalist/instrumentalist) trong recording booking - chỉ biểu diễn, không deliver file
     * 
     * Chỉ cho phép customer rate task assignment của chính họ
     * Mỗi assignment chỉ có thể được rate 1 lần
     */
    @Transactional
    public ReviewResponse createReview(
            String assignmentId,
            CreateReviewRequest request,
            String userId,
            List<String> userRoles) {

        log.info("Customer {} creating TASK review for assignment: {}", userId, assignmentId);

        // Verify user is CUSTOMER
        if (!userRoles.contains("CUSTOMER")) {
            throw UnauthorizedException.create("Only customers can create reviews");
        }

        // Validate rating
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw ValidationException.invalidValue("rating", 
                String.format("Rating must be between 1 and 5, got: %s", 
                    request.getRating() != null ? request.getRating() : "null"));
        }

        // Get task assignment
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));

        // Verify assignment is completed
        if (assignment.getStatus() != AssignmentStatus.completed) {
            throw new InvalidStateException(
                "Task assignment must be completed before rating");
        }

        // Verify customer owns the contract
        Contract contract = contractRepository.findById(assignment.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(assignment.getContractId()));

        if (!contract.getUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only review your own task assignments");
        }

        // Check if review already exists
        if (reviewRepository.existsByAssignmentIdAndCustomerId(assignmentId, userId)) {
            throw ReviewAlreadyExistsException.byAssignmentAndCustomer(assignmentId, userId);
        }

        // Create review (TASK type)
        Review review = Review.builder()
                .reviewType(ReviewType.TASK)
                .assignmentId(assignmentId)
                .specialistId(assignment.getSpecialistId())
                .contractId(assignment.getContractId())
                .milestoneId(assignment.getMilestoneId())
                .customerId(userId)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        review = reviewRepository.save(review);
        log.info("Review created: reviewId={}, assignmentId={}, specialistId={}, rating={}", 
                review.getReviewId(), assignmentId, review.getSpecialistId(), review.getRating());

        // Publish ReviewCreatedEvent để update specialist rating
        publishReviewCreatedEvent(review);

        return toResponse(review, assignment);
    }

    /**
     * Lấy review theo assignment ID và customer ID
     */
    public ReviewResponse getReviewByAssignment(String assignmentId, String userId) {
        Review review = reviewRepository.findByAssignmentIdAndCustomerId(assignmentId, userId)
                .orElse(null);
        
        if (review == null) {
            return null;
        }

        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));

        return toResponse(review, assignment);
    }

    /**
     * Lấy tất cả reviews của một specialist (public)
     * Chỉ lấy TASK và PARTICIPANT reviews (không lấy REQUEST reviews vì REQUEST không có specialistId cụ thể)
     */
    public PageResponse<ReviewResponse> getReviewsBySpecialist(String specialistId, Pageable pageable) {
        Page<Review> reviews = reviewRepository.findBySpecialistId(specialistId, pageable);
        
        List<ReviewResponse> content = reviews.getContent().stream()
                .map(review -> {
                    // Load assignment cho TASK reviews
                    TaskAssignment assignment = null;
                    if (review.getAssignmentId() != null) {
                        assignment = taskAssignmentRepository.findById(review.getAssignmentId())
                                .orElse(null);
                    }
                    
                    // Load bookingId cho PARTICIPANT reviews
                    // PARTICIPANT reviews cần link với booking để frontend có thể hiển thị booking info
                    String bookingId = null;
                    if (review.getReviewType() == ReviewType.PARTICIPANT 
                            && review.getParticipantId() != null) {
                        try {
                            // Query bookingId trực tiếp từ database (không cần load booking entity)
                            bookingId = bookingParticipantRepository.findBookingIdByParticipantId(review.getParticipantId());
                        } catch (Exception e) {
                            log.warn("Failed to load bookingId for participant review: participantId={}, error={}", 
                                    review.getParticipantId(), e.getMessage());
                        }
                    }
                    
                    return toResponse(review, assignment, bookingId);
                })
                .collect(java.util.stream.Collectors.toList());
        
        return PageResponse.<ReviewResponse>builder()
                .content(content)
                .pageNumber(reviews.getNumber())
                .pageSize(reviews.getSize())
                .totalElements((int) reviews.getTotalElements())
                .totalPages(reviews.getTotalPages())
                .first(reviews.isFirst())
                .last(reviews.isLast())
                .hasNext(reviews.hasNext())
                .hasPrevious(reviews.hasPrevious())
                .build();
    }

    /**
     * Lấy tất cả reviews của một request (chỉ customer của request đó)
     * Bao gồm TASK, REQUEST, và PARTICIPANT reviews
     */
    public List<ReviewResponse> getReviewsByRequest(String requestId, String userId) {
        // Verify customer owns the request (qua contract)
        List<Contract> contracts = contractRepository.findByRequestId(requestId);
        if (contracts.isEmpty()) {
            throw ValidationException.invalidValue("requestId", "No contract found for requestId: " + requestId);
        }

        // Verify customer owns at least one contract of this request
        boolean ownsRequest = contracts.stream()
                .anyMatch(c -> c.getUserId().equals(userId));
        if (!ownsRequest) {
            throw UnauthorizedException.create("You can only view reviews of your own requests");
        }

        List<Review> reviews = reviewRepository.findByRequestId(requestId);
        
        return reviews.stream()
                .map(review -> {
                    TaskAssignment assignment = null;
                    if (review.getAssignmentId() != null) {
                        assignment = taskAssignmentRepository.findById(review.getAssignmentId())
                                .orElse(null);
                    }
                    return toResponse(review, assignment);
                })
                .collect(Collectors.toList());
    }


    /**
     * Tạo REQUEST-level review cho toàn bộ service request (mỗi customer 1 review / request)
     */
    @Transactional
    public ReviewResponse createRequestReview(
            String requestId,
            CreateReviewRequest request,
            String userId,
            List<String> userRoles) {

        log.info("Customer {} creating REQUEST review for request: {}", userId, requestId);

        if (!userRoles.contains("CUSTOMER")) {
            throw UnauthorizedException.create("Only customers can create request reviews");
        }

        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw ValidationException.invalidValue("rating",
                    String.format("Rating must be between 1 and 5, got: %s",
                            request.getRating() != null ? request.getRating() : "null"));
        }

        // Verify customer owns the request (qua contract)
        List<Contract> contracts = contractRepository.findByRequestId(requestId);
        if (contracts.isEmpty()) {
            throw ValidationException.invalidValue("requestId",
                    "No contract found for requestId: " + requestId);
        }

        // Verify customer owns at least one contract of this request
        boolean ownsRequest = contracts.stream()
                .anyMatch(c -> c.getUserId().equals(userId));
        if (!ownsRequest) {
            throw UnauthorizedException.create("You can only review your own requests");
        }

        // Check if REQUEST review already exists for this request
        if (reviewRepository.existsByRequestIdAndCustomerIdAndReviewType(
                requestId, userId, ReviewType.REQUEST)) {
            throw new ReviewAlreadyExistsException(requestId, userId);
        }

        // REQUEST review không cần contractId, chỉ cần requestId
        Review review = Review.builder()
                .reviewType(ReviewType.REQUEST)
                .contractId(null)  // REQUEST review không cần contractId
                .requestId(requestId)
                .customerId(userId)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        review = reviewRepository.save(review);
        log.info("Request-level review created: reviewId={}, requestId={}, rating={}",
                review.getReviewId(), requestId, review.getRating());

        // Không publish event vì không gắn với 1 specialist cụ thể
        return toResponse(review, null);
    }


    /**
     * Tạo PARTICIPANT review cho recording artist trong booking
     * 
     * QUAN TRỌNG: Chỉ dành cho recording artist (vocalist/instrumentalist)
     * - PARTICIPANT review: cho recording artist trong recording booking
     * - TASK review: cho transcription/arrangement specialist (khi họ làm task assignment)
     * - Recording artist KHÔNG dùng TASK review, mà dùng PARTICIPANT review
     * 
     * Mỗi participant chỉ có thể được rate 1 lần bởi 1 customer
     */
    @Transactional
    public ReviewResponse createParticipantReview(
            String participantId,
            CreateReviewRequest request,
            String userId,
            List<String> userRoles) {

        log.info("Customer {} creating PARTICIPANT review for recording artist (participant: {})", userId, participantId);

        if (!userRoles.contains("CUSTOMER")) {
            throw UnauthorizedException.create("Only customers can create participant reviews");
        }

        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw ValidationException.invalidValue("rating",
                    String.format("Rating must be between 1 and 5, got: %s",
                            request.getRating() != null ? request.getRating() : "null"));
        }

        BookingParticipant participant = bookingParticipantRepository.findById(participantId)
                .orElseThrow(() -> new InvalidStateException("Booking participant not found: " + participantId));

        StudioBooking booking = participant.getBooking();
        if (booking == null || booking.getContractId() == null) {
            throw new InvalidStateException("Participant is not linked to a contract booking");
        }

        String contractId = booking.getContractId();
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));

        if (!contract.getUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only review participants of your own contracts");
        }

        if (reviewRepository.existsByParticipantIdAndCustomerId(participantId, userId)) {
            throw new ReviewAlreadyExistsException(participantId, userId);
        }

        Review review = Review.builder()
                .reviewType(ReviewType.PARTICIPANT)
                .assignmentId(null)
                .specialistId(participant.getSpecialistId())
                .contractId(contractId)
                .milestoneId(booking.getMilestoneId())
                .participantId(participantId)
                .customerId(userId)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        review = reviewRepository.save(review);
        log.info("Participant review created: reviewId={}, participantId={}, specialistId={}, rating={}",
                review.getReviewId(), participantId, review.getSpecialistId(), review.getRating());

        // Publish event để update specialist rating nếu có specialistId
        if (review.getSpecialistId() != null) {
            publishReviewCreatedEvent(review);
        }

        return toResponse(review, null);
    }

    /**
     * Publish ReviewCreatedEvent vào outbox
     */
    private void publishReviewCreatedEvent(Review review) {
        try {
            UUID eventId = UUID.randomUUID();
            ReviewCreatedEvent event = ReviewCreatedEvent.builder()
                    .eventId(eventId)
                    .reviewId(review.getReviewId())
                    .specialistId(review.getSpecialistId())
                    .assignmentId(review.getAssignmentId())
                    .contractId(review.getContractId())
                    .customerId(review.getCustomerId())
                    .rating(review.getRating())
                    .comment(review.getComment())
                    .timestamp(LocalDateTime.now())
                    .build();

            JsonNode payload = objectMapper.valueToTree(event);
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(review.getReviewId());
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }

            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("Review")
                    .eventType("review.created")
                    .eventPayload(payload)
                    .build();

            outboxEventRepository.save(outboxEvent);
            log.info("Queued ReviewCreatedEvent in outbox: eventId={}, reviewId={}, specialistId={}, rating={}", 
                    eventId, review.getReviewId(), review.getSpecialistId(), review.getRating());
        } catch (Exception e) {
            log.error("Failed to enqueue ReviewCreatedEvent: reviewId={}, error={}", 
                    review.getReviewId(), e.getMessage(), e);
            // Không throw exception để không fail transaction
        }
    }

    /**
     * Lấy average rating của specialist (internal API)
     */
    public Double getAverageRatingBySpecialistId(String specialistId) {
        return reviewRepository.calculateAverageRatingBySpecialistId(specialistId);
    }

    /**
     * Admin: Lấy tất cả reviews với filters (chỉ admin)
     */
    public PageResponse<ReviewResponse> getAllReviews(
            ReviewType reviewType,
            String specialistId,
            String requestId,
            Integer minRating,
            Integer maxRating,
            String customerId,
            Pageable pageable) {
        
        Page<Review> reviews = reviewRepository.findAllWithFilters(
                reviewType, specialistId, requestId, minRating, maxRating, customerId, pageable);
        
        List<ReviewResponse> content = reviews.getContent().stream()
                .map(review -> {
                    TaskAssignment assignment = null;
                    if (review.getAssignmentId() != null) {
                        assignment = taskAssignmentRepository.findById(review.getAssignmentId())
                                .orElse(null);
                    }
                    
                    // Load bookingId cho PARTICIPANT reviews
                    String bookingId = null;
                    if (review.getReviewType() == ReviewType.PARTICIPANT
                            && review.getParticipantId() != null) {
                        try {
                            bookingId = bookingParticipantRepository.findBookingIdByParticipantId(review.getParticipantId());
                        } catch (Exception e) {
                            log.warn("Failed to load bookingId for participant review: participantId={}, error={}", 
                                    review.getParticipantId(), e.getMessage());
                        }
                    }
                    
                    return toResponse(review, assignment, bookingId);
                })
                .collect(Collectors.toList());
        
        return PageResponse.<ReviewResponse>builder()
                .content(content)
                .pageNumber(reviews.getNumber())
                .pageSize(reviews.getSize())
                .totalElements((int) reviews.getTotalElements())
                .totalPages(reviews.getTotalPages())
                .first(reviews.isFirst())
                .last(reviews.isLast())
                .hasNext(reviews.hasNext())
                .hasPrevious(reviews.hasPrevious())
                .build();
    }

    /**
     * Convert Review entity to ReviewResponse
     */
    private ReviewResponse toResponse(Review review, TaskAssignment assignment) {
        return toResponse(review, assignment, null);
    }

    /**
     * Convert Review entity to ReviewResponse with bookingId (for PARTICIPANT reviews)
     */
    private ReviewResponse toResponse(Review review, TaskAssignment assignment, String bookingId) {
        return ReviewResponse.builder()
                .reviewId(review.getReviewId())
                .reviewType(review.getReviewType())
                .assignmentId(review.getAssignmentId())
                .specialistId(review.getSpecialistId())
                .specialistName(assignment != null ? assignment.getSpecialistNameSnapshot() : null)
                .contractId(review.getContractId())
                .requestId(review.getRequestId())
                .milestoneId(review.getMilestoneId())
                .participantId(review.getParticipantId())
                .bookingId(bookingId)
                .customerId(review.getCustomerId())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}

