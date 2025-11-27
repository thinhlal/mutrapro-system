package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.CreateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.request.UpdateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.response.MilestoneAssignmentSlotsResult;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.project_service.service.TaskAssignmentService;
import jakarta.validation.Valid;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.PageResponse;
import com.mutrapro.shared.dto.SpecialistTaskStats;
import com.mutrapro.shared.dto.TaskStatsRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Lấy danh sách tất cả task assignments với pagination và filters")
    public ApiResponse<PageResponse<TaskAssignmentResponse>> getAllTaskAssignments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String taskType,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageResponse<TaskAssignmentResponse> result = taskAssignmentService
            .getAllTaskAssignments(status, taskType, keyword, page, size);
        return ApiResponse.<PageResponse<TaskAssignmentResponse>>builder()
                .message("Task assignments retrieved successfully")
                .data(result)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/slots")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Lấy danh sách milestone slots phục vụ gán task")
    public ApiResponse<PageResponse<com.mutrapro.project_service.dto.response.MilestoneAssignmentSlotResponse>> getMilestoneSlots(
            @RequestParam(required = false) String contractId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String taskType,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean onlyUnassigned,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        MilestoneAssignmentSlotsResult result = taskAssignmentService
            .getMilestoneAssignmentSlots(contractId, status, taskType, keyword, onlyUnassigned, page, size);
        return ApiResponse.<PageResponse<com.mutrapro.project_service.dto.response.MilestoneAssignmentSlotResponse>>builder()
                .message("Milestone slots retrieved successfully")
                .data(result.getPage())
                .metadata(Map.of(
                    "totalUnassigned", result.getTotalUnassigned(),
                    "totalInProgress", result.getTotalInProgress(),
                    "totalCompleted", result.getTotalCompleted()))
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

    @PostMapping("/{assignmentId}/resolve-issue")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Manager resolve issue (clear hasIssue flag - cho specialist tiếp tục)")
    public ApiResponse<TaskAssignmentResponse> resolveIssue(
            @Parameter(description = "ID của contract")
            @RequestParam String contractId,
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId) {
        log.info("Resolving issue: contractId={}, assignmentId={}", contractId, assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService.resolveIssue(contractId, assignmentId);
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Issue resolved successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{assignmentId}/cancel")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Manager cancel task (có thể cancel task ở bất kỳ status nào, trừ completed)")
    public ApiResponse<TaskAssignmentResponse> cancelTaskByManager(
            @Parameter(description = "ID của contract")
            @RequestParam String contractId,
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId) {
        log.info("Manager cancelling task: contractId={}, assignmentId={}", contractId, assignmentId);
        TaskAssignmentResponse assignment = taskAssignmentService.cancelTaskByManager(contractId, assignmentId);
        return ApiResponse.<TaskAssignmentResponse>builder()
                .message("Task assignment cancelled successfully")
                .data(assignment)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/by-specialist/{specialistId}")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Lấy danh sách task assignments theo specialistId (cho internal use)")
    public ApiResponse<List<TaskAssignmentResponse>> getTaskAssignmentsBySpecialistId(
            @Parameter(description = "ID của specialist")
            @PathVariable String specialistId) {
        log.info("Getting task assignments for specialist: specialistId={}", specialistId);
        List<TaskAssignmentResponse> assignments = taskAssignmentService
            .getTaskAssignmentsBySpecialistId(specialistId);
        return ApiResponse.<List<TaskAssignmentResponse>>builder()
                .message("Task assignments retrieved successfully")
                .data(assignments)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/by-specialists")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Lấy danh sách task assignments cho nhiều specialists cùng lúc (batch query, cho internal use)")
    public ApiResponse<Map<String, List<TaskAssignmentResponse>>> getTaskAssignmentsBySpecialistIds(
            @Parameter(description = "Danh sách ID của specialists")
            @RequestBody List<String> specialistIds) {
        log.info("Getting task assignments for {} specialists (batch)", specialistIds != null ? specialistIds.size() : 0);
        Map<String, List<TaskAssignmentResponse>> assignments = taskAssignmentService
            .getTaskAssignmentsBySpecialistIds(specialistIds);
        return ApiResponse.<Map<String, List<TaskAssignmentResponse>>>builder()
                .message("Task assignments retrieved successfully")
                .data(assignments)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/stats")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Lấy thống kê task (totalOpenTasks, tasksInSlaWindow) cho nhiều specialists cùng lúc")
    public ApiResponse<Map<String, SpecialistTaskStats>> getTaskStats(
            @Valid @RequestBody TaskStatsRequest request) {
        log.info("Getting task stats for {} specialists", request != null && request.getSpecialistIds() != null
            ? request.getSpecialistIds().size() : 0);
        Map<String, SpecialistTaskStats> stats = taskAssignmentService.getTaskStats(request);
        return ApiResponse.<Map<String, SpecialistTaskStats>>builder()
                .message("Task stats retrieved successfully")
                .data(stats)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

}

