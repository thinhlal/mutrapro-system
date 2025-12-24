package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.CreateReviewRequest;
import com.mutrapro.project_service.dto.response.ReviewResponse;
import com.mutrapro.project_service.enums.ReviewType;
import com.mutrapro.project_service.service.FileAccessService;
import com.mutrapro.project_service.service.ReviewService;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.PageResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
@Tag(name = "Reviews")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReviewController {

    ReviewService reviewService;

    @PostMapping("/assignments/{assignmentId}")
    @Operation(summary = "Tạo review cho task assignment (chỉ customer)")
    public ApiResponse<ReviewResponse> createReview(
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId,
            @RequestBody CreateReviewRequest request,
            Authentication authentication) {
        log.info("Creating review for assignment: {}", assignmentId);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        ReviewResponse response = reviewService.createReview(
                assignmentId,
                request,
                userContext.getUserId(),
                userContext.getRoles());

        return ApiResponse.<ReviewResponse>builder()
                .message("Review created successfully")
                .data(response)
                .statusCode(HttpStatus.CREATED.value())
                .build();
    }

    @PostMapping("/requests/{requestId}")
    @Operation(summary = "Tạo REQUEST-level review cho toàn bộ service request (chỉ customer)")
    public ApiResponse<ReviewResponse> createRequestReview(
            @Parameter(description = "ID của service request")
            @PathVariable String requestId,
            @RequestBody CreateReviewRequest request,
            Authentication authentication) {
        log.info("Creating REQUEST review for request: {}", requestId);

        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        ReviewResponse response = reviewService.createRequestReview(
                requestId,
                request,
                userContext.getUserId(),
                userContext.getRoles());

        return ApiResponse.<ReviewResponse>builder()
                .message("Request review created successfully")
                .data(response)
                .statusCode(HttpStatus.CREATED.value())
                .build();
    }

    @PostMapping("/participants/{participantId}")
    @Operation(summary = "Tạo PARTICIPANT-level review cho từng artist trong booking (chỉ customer)")
    public ApiResponse<ReviewResponse> createParticipantReview(
            @Parameter(description = "ID của booking participant")
            @PathVariable String participantId,
            @RequestBody CreateReviewRequest request,
            Authentication authentication) {
        log.info("Creating PARTICIPANT review for participant: {}", participantId);

        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        ReviewResponse response = reviewService.createParticipantReview(
                participantId,
                request,
                userContext.getUserId(),
                userContext.getRoles());

        return ApiResponse.<ReviewResponse>builder()
                .message("Participant review created successfully")
                .data(response)
                .statusCode(HttpStatus.CREATED.value())
                .build();
    }

    @GetMapping("/assignments/{assignmentId}")
    @Operation(summary = "Lấy review của assignment (customer)")
    public ApiResponse<ReviewResponse> getReviewByAssignment(
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId,
            Authentication authentication) {
        log.info("Getting review for assignment: {}", assignmentId);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        ReviewResponse response = reviewService.getReviewByAssignment(assignmentId, userContext.getUserId());

        return ApiResponse.<ReviewResponse>builder()
                .message(response != null ? "Review retrieved successfully" : "No review found")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @GetMapping("/specialists/{specialistId}")
    @Operation(summary = "Lấy tất cả reviews của specialist (public)")
    public ApiResponse<com.mutrapro.shared.dto.PageResponse<ReviewResponse>> getReviewsBySpecialist(
            @Parameter(description = "ID của specialist")
            @PathVariable String specialistId,
            @PageableDefault(size = 10) Pageable pageable) {
        log.info("Getting reviews for specialist: {}", specialistId);
        
        com.mutrapro.shared.dto.PageResponse<ReviewResponse> response = reviewService.getReviewsBySpecialist(specialistId, pageable);

        return ApiResponse.<com.mutrapro.shared.dto.PageResponse<ReviewResponse>>builder()
                .message("Reviews retrieved successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @GetMapping("/requests/{requestId}")
    @Operation(summary = "Lấy tất cả reviews của request (chỉ customer của request)")
    public ApiResponse<List<ReviewResponse>> getReviewsByRequest(
            @Parameter(description = "ID của service request")
            @PathVariable String requestId,
            Authentication authentication) {
        log.info("Getting reviews for request: {}", requestId);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        List<ReviewResponse> response = reviewService.getReviewsByRequest(requestId, userContext.getUserId());

        return ApiResponse.<List<ReviewResponse>>builder()
                .message("Reviews retrieved successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @GetMapping("/specialists/{specialistId}/average-rating")
    @Operation(summary = "Lấy average rating của specialist (internal API cho specialist-service)")
    public Double getAverageRatingBySpecialistId(
            @Parameter(description = "ID của specialist")
            @PathVariable String specialistId) {
        log.info("Getting average rating for specialist: {}", specialistId);
        
        return reviewService.getAverageRatingBySpecialistId(specialistId);
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Admin: Lấy tất cả reviews với filters (chỉ admin)")
    public ApiResponse<com.mutrapro.shared.dto.PageResponse<ReviewResponse>> getAllReviews(
            @Parameter(description = "Filter by review type (TASK, REQUEST, PARTICIPANT)")
            @RequestParam(required = false) String reviewType,
            @Parameter(description = "Filter by specialist ID")
            @RequestParam(required = false) String specialistId,
            @Parameter(description = "Filter by request ID")
            @RequestParam(required = false) String requestId,
            @Parameter(description = "Filter by minimum rating (1-5)")
            @RequestParam(required = false) Integer minRating,
            @Parameter(description = "Filter by maximum rating (1-5)")
            @RequestParam(required = false) Integer maxRating,
            @Parameter(description = "Filter by customer ID")
            @RequestParam(required = false) String customerId,
            @PageableDefault(size = 20) Pageable pageable) {
        log.info("Admin getting all reviews with filters: reviewType={}, specialistId={}, requestId={}, minRating={}, maxRating={}, customerId={}",
                reviewType, specialistId, requestId, minRating, maxRating, customerId);
        
        ReviewType reviewTypeEnum = null;
        if (reviewType != null && !reviewType.trim().isEmpty()) {
            try {
                reviewTypeEnum = ReviewType.valueOf(reviewType.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid review type: {}", reviewType);
            }
        }
        
        PageResponse<ReviewResponse> response = reviewService.getAllReviews(
                reviewTypeEnum, specialistId, requestId, minRating, maxRating, customerId, pageable);
        
        return ApiResponse.<PageResponse<ReviewResponse>>builder()
                .message("Reviews retrieved successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }
}

