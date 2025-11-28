package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.CancelTaskAssignmentRequest;
import com.mutrapro.project_service.dto.request.ReportIssueRequest;
import com.mutrapro.project_service.dto.request.SubmitForReviewRequest;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.project_service.service.TaskAssignmentService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller cho Specialist xem và quản lý task assignments của mình
 */
@Slf4j
@RestController
@RequestMapping("/specialist/task-assignments")
@RequiredArgsConstructor
@Tag(name = "Specialist Task Assignment", description = "Specialist Task Assignment Management API")
public class SpecialistTaskAssignmentController {

    private final TaskAssignmentService taskAssignmentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('TRANSCRIPTION','ARRANGEMENT','RECORDING_ARTIST','SYSTEM_ADMIN')")
    @Operation(summary = "Lấy danh sách task assignments của specialist hiện tại")
    public ApiResponse<List<TaskAssignmentResponse>> getMyTaskAssignments() {
        log.info("GET /specialist/task-assignments - Getting my task assignments");
        List<TaskAssignmentResponse> assignments = taskAssignmentService.getMyTaskAssignments();
        return ApiResponse.<List<TaskAssignmentResponse>>builder()
                .message("Task assignments retrieved successfully")
                .data(assignments)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{assignmentId}/accept")
    @PreAuthorize("hasAnyRole('TRANSCRIPTION','ARRANGEMENT','RECORDING_ARTIST','SYSTEM_ADMIN')")
    @Operation(summary = "Specialist accept task (assigned → in_progress)")
    public ApiResponse<TaskAssignmentResponse> acceptTaskAssignment(
            @PathVariable String assignmentId) {
        log.info("POST /specialist/task-assignments/{}/accept - Accepting task", assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService.acceptTaskAssignment(assignmentId);
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Task assignment accepted successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{assignmentId}/start")
    @PreAuthorize("hasAnyRole('TRANSCRIPTION','ARRANGEMENT','RECORDING_ARTIST','SYSTEM_ADMIN')")
    @Operation(summary = "Specialist start task (READY_TO_START → IN_PROGRESS)")
    public ApiResponse<TaskAssignmentResponse> startTaskAssignment(
            @PathVariable String assignmentId) {
        log.info("POST /specialist/task-assignments/{}/start - Starting task", assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService.startTaskAssignment(assignmentId);
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Task assignment started successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{assignmentId}/cancel")
    @PreAuthorize("hasAnyRole('TRANSCRIPTION','ARRANGEMENT','RECORDING_ARTIST','SYSTEM_ADMIN')")
    @Operation(summary = "Specialist cancel task (assigned → cancelled)")
    public ApiResponse<TaskAssignmentResponse> cancelTaskAssignment(
            @PathVariable String assignmentId,
            @Valid @RequestBody CancelTaskAssignmentRequest request) {
        log.info("POST /specialist/task-assignments/{}/cancel - Cancelling task with reason", assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService.cancelTaskAssignment(assignmentId, request.getReason());
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Task assignment cancelled successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{assignmentId}/report-issue")
    @PreAuthorize("hasAnyRole('TRANSCRIPTION','ARRANGEMENT','RECORDING_ARTIST','SYSTEM_ADMIN')")
    @Operation(summary = "Specialist báo issue (không kịp deadline, có vấn đề) - task vẫn IN_PROGRESS, chỉ đánh dấu có issue")
    public ApiResponse<TaskAssignmentResponse> reportIssue(
            @PathVariable String assignmentId,
            @Valid @RequestBody ReportIssueRequest request) {
        log.info("POST /specialist/task-assignments/{}/report-issue - Reporting issue", assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService.reportIssue(assignmentId, request.getReason());
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Issue reported successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{assignmentId}/submit-for-review")
    @PreAuthorize("hasAnyRole('TRANSCRIPTION','ARRANGEMENT','RECORDING_ARTIST','SYSTEM_ADMIN')")
    @Operation(summary = "Specialist submit task for review (chuyển files từ uploaded sang pending_review)")
    public ApiResponse<TaskAssignmentResponse> submitTaskForReview(
            @PathVariable String assignmentId,
            @Valid @RequestBody SubmitForReviewRequest request) {
        log.info("POST /specialist/task-assignments/{}/submit-for-review - Submitting task for review with {} files", 
                assignmentId, request.getFileIds() != null ? request.getFileIds().size() : 0);
        TaskAssignmentResponse assignment = taskAssignmentService.submitTaskForReview(
                assignmentId, request.getFileIds());
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Task submitted for review successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/{assignmentId}")
    @PreAuthorize("hasAnyRole('TRANSCRIPTION','ARRANGEMENT','RECORDING_ARTIST','SYSTEM_ADMIN')")
    @Operation(summary = "Lấy chi tiết task assignment của specialist hiện tại")
    public ApiResponse<TaskAssignmentResponse> getMyTaskAssignmentById(
            @PathVariable String assignmentId) {
        log.info("GET /specialist/task-assignments/{} - Getting my task assignment detail", assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService.getMyTaskAssignmentById(assignmentId);
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Task assignment retrieved successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }
}

