package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.CreateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.request.ReassignDecisionRequest;
import com.mutrapro.project_service.dto.request.UpdateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.project_service.service.TaskAssignmentService;
import jakarta.validation.Valid;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/task-assignments")
@RequiredArgsConstructor
@Tag(name = "Task Assignment", description = "Task Assignment Management API")
public class TaskAssignmentController {

    private final TaskAssignmentService taskAssignmentService;

    @GetMapping
    @Operation(summary = "Lấy danh sách task assignments theo contract ID")
    public ApiResponse<List<TaskAssignmentResponse>> getTaskAssignmentsByContract(
            @Parameter(description = "ID của contract")
            @RequestParam(required = true) String contractId) {
        log.info("Getting task assignments for contract: contractId={}", contractId);
        List<TaskAssignmentResponse> assignments = taskAssignmentService.getTaskAssignmentsByContract(contractId);
        return ApiResponse.<List<TaskAssignmentResponse>>builder()
                .message("Task assignments retrieved successfully")
                .data(assignments)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/milestones/{milestoneId}")
    @Operation(summary = "Lấy danh sách task assignments theo milestone ID")
    public ApiResponse<List<TaskAssignmentResponse>> getTaskAssignmentsByMilestone(
            @Parameter(description = "ID của contract")
            @RequestParam String contractId,
            @Parameter(description = "ID của milestone")
            @PathVariable String milestoneId) {
        log.info("Getting task assignments for milestone: contractId={}, milestoneId={}", 
            contractId, milestoneId);
        List<TaskAssignmentResponse> assignments = taskAssignmentService
            .getTaskAssignmentsByMilestone(contractId, milestoneId);
        return ApiResponse.<List<TaskAssignmentResponse>>builder()
                .message("Task assignments retrieved successfully")
                .data(assignments)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/{assignmentId}")
    @Operation(summary = "Lấy chi tiết task assignment")
    public ApiResponse<TaskAssignmentResponse> getTaskAssignmentById(
            @Parameter(description = "ID của contract")
            @RequestParam String contractId,
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId) {
        log.info("Getting task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService
            .getTaskAssignmentById(contractId, assignmentId);
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Task assignment retrieved successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping
    @Operation(summary = "Tạo task assignment mới")
    public ApiResponse<TaskAssignmentResponse> createTaskAssignment(
            @Parameter(description = "ID của contract")
            @RequestParam String contractId,
            @Valid @RequestBody CreateTaskAssignmentRequest request) {
        log.info("Creating task assignment: contractId={}, specialistId={}, taskType={}", 
            contractId, request.getSpecialistId(), request.getTaskType());
        TaskAssignmentResponse assignment = taskAssignmentService
            .createTaskAssignment(contractId, request);
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Task assignment created successfully")
                .data(assignment)
                .statusCode(HttpStatus.CREATED.value())
                .status("success")
                .build();
    }

    @PutMapping("/{assignmentId}")
    @Operation(summary = "Cập nhật task assignment")
    public ApiResponse<TaskAssignmentResponse> updateTaskAssignment(
            @Parameter(description = "ID của contract")
            @RequestParam String contractId,
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId,
            @Valid @RequestBody UpdateTaskAssignmentRequest request) {
        log.info("Updating task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService
            .updateTaskAssignment(contractId, assignmentId, request);
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Task assignment updated successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @DeleteMapping("/{assignmentId}")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Xóa task assignment")
    public ApiResponse<Void> deleteTaskAssignment(
            @Parameter(description = "ID của contract")
            @RequestParam String contractId,
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId) {
        log.info("Deleting task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        taskAssignmentService.deleteTaskAssignment(contractId, assignmentId);
        return ApiResponse.<Void>builder()
                .message("Task assignment deleted successfully")
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{assignmentId}/approve-reassign")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Manager approve reassign request (reassign_requested → assigned)")
    public ApiResponse<TaskAssignmentResponse> approveReassign(
            @Parameter(description = "ID của contract")
            @RequestParam String contractId,
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId,
            @Valid @RequestBody ReassignDecisionRequest request) {
        log.info("Manager approving reassign: contractId={}, assignmentId={}", contractId, assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService.approveReassign(
            contractId, assignmentId, request.getReason());
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Reassign request approved successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{assignmentId}/reject-reassign")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Manager reject reassign request (reassign_requested → in_progress)")
    public ApiResponse<TaskAssignmentResponse> rejectReassign(
            @Parameter(description = "ID của contract")
            @RequestParam String contractId,
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId,
            @Valid @RequestBody ReassignDecisionRequest request) {
        log.info("Manager rejecting reassign: contractId={}, assignmentId={}", contractId, assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService.rejectReassign(
            contractId, assignmentId, request.getReason());
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Reassign request rejected successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }
}

