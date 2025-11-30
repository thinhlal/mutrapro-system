package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.ReviewSubmissionRequest;
import com.mutrapro.project_service.dto.request.CustomerReviewSubmissionRequest;
import com.mutrapro.project_service.dto.response.FileSubmissionResponse;
import com.mutrapro.project_service.dto.response.CustomerDeliveriesResponse;
import com.mutrapro.project_service.service.FileSubmissionService;
import com.mutrapro.project_service.service.FileAccessService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/submissions")
@RequiredArgsConstructor
@Tag(name = "File Submissions")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileSubmissionController {

    FileSubmissionService fileSubmissionService;

    @GetMapping("/{submissionId}")
    @Operation(summary = "Lấy thông tin submission (specialist hoặc manager)")
    public ApiResponse<FileSubmissionResponse> getSubmission(
            @Parameter(description = "ID của submission")
            @PathVariable String submissionId,
            Authentication authentication) {
        log.info("Getting submission: {}", submissionId);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        FileSubmissionResponse response = fileSubmissionService.getSubmission(
                submissionId,
                userContext.getUserId(),
                userContext.getRoles());

        return ApiResponse.<FileSubmissionResponse>builder()
                .message("Submission retrieved successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @GetMapping("/by-assignment/{assignmentId}")
    @Operation(summary = "Lấy danh sách submissions theo assignmentId")
    public ApiResponse<List<FileSubmissionResponse>> getSubmissionsByAssignmentId(
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId,
            Authentication authentication) {
        log.info("Getting submissions for assignmentId: {}", assignmentId);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        List<FileSubmissionResponse> responses = fileSubmissionService.getSubmissionsByAssignmentId(
                assignmentId,
                userContext.getUserId(),
                userContext.getRoles());

        return ApiResponse.<List<FileSubmissionResponse>>builder()
                .message("Submissions retrieved successfully")
                .data(responses)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @GetMapping("/by-milestone/{milestoneId}")
    @Operation(summary = "Customer lấy danh sách delivered submissions theo milestoneId (kèm thông tin contract và milestone)")
    public ApiResponse<CustomerDeliveriesResponse> getDeliveredSubmissionsByMilestone(
            @Parameter(description = "ID của milestone")
            @PathVariable String milestoneId,
            @Parameter(description = "ID của contract")
            @RequestParam String contractId,
            Authentication authentication) {
        log.info("Customer getting delivered submissions for milestoneId: {}, contractId: {}", milestoneId, contractId);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        CustomerDeliveriesResponse response = fileSubmissionService.getDeliveredSubmissionsByMilestoneForCustomer(
                milestoneId,
                contractId,
                userContext.getUserId(),
                userContext.getRoles());

        return ApiResponse.<CustomerDeliveriesResponse>builder()
                .message("Delivered submissions retrieved successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @PostMapping("/{submissionId}/review")
    @Operation(summary = "Manager review submission (approve/reject)")
    public ApiResponse<FileSubmissionResponse> reviewSubmission(
            @Parameter(description = "ID của submission")
            @PathVariable String submissionId,
            @RequestBody ReviewSubmissionRequest request,
            Authentication authentication) {
        log.info("Manager reviewing submission: {}, action: {}", submissionId, request.getAction());
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        FileSubmissionResponse response;
        
        if ("approve".equalsIgnoreCase(request.getAction())) {
            response = fileSubmissionService.approveSubmission(
                    submissionId,
                    userContext.getUserId(),
                    userContext.getRoles());
        } else if ("reject".equalsIgnoreCase(request.getAction())) {
            response = fileSubmissionService.rejectSubmission(
                    submissionId,
                    request.getReason(),
                    userContext.getUserId(),
                    userContext.getRoles());
        } else {
            throw new IllegalArgumentException("Invalid action: " + request.getAction() + ". Must be 'approve' or 'reject'");
        }

        return ApiResponse.<FileSubmissionResponse>builder()
                .message("Submission reviewed successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @PostMapping("/{submissionId}/deliver")
    @Operation(summary = "Manager deliver submission to customer (deliver tất cả files trong submission)")
    public ApiResponse<FileSubmissionResponse> deliverSubmission(
            @Parameter(description = "ID của submission")
            @PathVariable String submissionId,
            Authentication authentication) {
        log.info("Manager delivering submission: {}", submissionId);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        FileSubmissionResponse response = fileSubmissionService.deliverSubmission(
                submissionId,
                userContext.getUserId(),
                userContext.getRoles());

        return ApiResponse.<FileSubmissionResponse>builder()
                .message("Submission delivered successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @PostMapping("/{submissionId}/customer-review")
    @Operation(summary = "Customer review submission (accept hoặc request revision)")
    public ApiResponse<FileSubmissionResponse> customerReviewSubmission(
            @Parameter(description = "ID của submission")
            @PathVariable String submissionId,
            @RequestBody CustomerReviewSubmissionRequest request,
            Authentication authentication) {
        log.info("Customer reviewing submission: {}, action: {}", submissionId, request.getAction());
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        FileSubmissionResponse response = fileSubmissionService.customerReviewSubmission(
                submissionId,
                request.getAction(),
                request.getReason(),
                userContext.getUserId(),
                userContext.getRoles());

        return ApiResponse.<FileSubmissionResponse>builder()
                .message("Submission reviewed successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }
}

