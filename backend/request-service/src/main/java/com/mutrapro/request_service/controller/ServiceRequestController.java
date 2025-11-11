package com.mutrapro.request_service.controller;

import com.mutrapro.request_service.dto.request.AssignManagerRequest;
import com.mutrapro.request_service.dto.request.CreateServiceRequestRequest;
import com.mutrapro.request_service.dto.response.ServiceRequestResponse;
import com.mutrapro.request_service.enums.RequestStatus;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.service.ServiceRequestService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/requests")
@RequiredArgsConstructor
@Tag(name = "Service Requests")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ServiceRequestController {

    ServiceRequestService serviceRequestService;

    @PostMapping(consumes = {"multipart/form-data"})
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tạo yêu cầu dịch vụ mới (có thể upload nhiều file: audio cho transcription, PDF/MusicXML/MIDI cho arrangement)")
    public ApiResponse<ServiceRequestResponse> createServiceRequest(
            @Valid @ModelAttribute CreateServiceRequestRequest request) {
        int fileCount = (request.getFiles() != null) ? request.getFiles().size() : 0;
        log.info("Creating new service request: requestType={}, description={}, fileCount={}", 
                request.getRequestType(), request.getDescription(), fileCount);
        ServiceRequestResponse created = serviceRequestService.createServiceRequest(request);
        return ApiResponse.<ServiceRequestResponse>builder()
                .message("Service request created successfully")
                .data(created)
                .statusCode(201)
                .build();
    }

    @GetMapping("/my-requests")
    @Operation(summary = "Lấy danh sách request mà user hiện tại đã tạo (có thể filter theo status)")
    public ApiResponse<List<ServiceRequestResponse>> getUserRequests(
            @Parameter(description = "Filter theo status (pending, in_progress, completed, cancelled). Nếu không truyền thì trả về tất cả")
            @RequestParam(required = false) RequestStatus status) {
        log.info("Getting user requests with status filter: {}", status != null ? status.name() : "all");
        List<ServiceRequestResponse> requests = serviceRequestService.getUserRequests(status);
        return ApiResponse.<List<ServiceRequestResponse>>builder()
                .message("User requests retrieved successfully")
                .data(requests)
                .statusCode(200)
                .build();
    }

    @GetMapping
    @Operation(summary = "Lấy tất cả service requests với các filter tùy chọn")
    public ApiResponse<List<ServiceRequestResponse>> getAllServiceRequests(
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(required = false) ServiceType requestType,
            @RequestParam(required = false) String managerUserId) {
        log.info("Getting all service requests with filters: status={}, requestType={}, managerUserId={}", 
                status, requestType, managerUserId);
        List<ServiceRequestResponse> requests = serviceRequestService.getAllServiceRequests(
                status, requestType, managerUserId);
        return ApiResponse.<List<ServiceRequestResponse>>builder()
                .message("Service requests retrieved successfully")
                .data(requests)
                .statusCode(200)
                .build();
    }

    @GetMapping("/{requestId}")
    @Operation(summary = "Lấy chi tiết một service request theo requestId")
    public ApiResponse<ServiceRequestResponse> getServiceRequestById(
            @Parameter(description = "ID của request")
            @PathVariable String requestId) {
        log.info("Getting service request by id: requestId={}", requestId);
        ServiceRequestResponse request = serviceRequestService.getServiceRequestById(requestId);
        return ApiResponse.<ServiceRequestResponse>builder()
                .message("Service request retrieved successfully")
                .data(request)
                .statusCode(200)
                .build();
    }

    @PutMapping("/{requestId}/assign")
    @Operation(summary = "Manager nhận trách nhiệm về service request (có thể tự nhận hoặc assign cho manager khác)")
    public ApiResponse<ServiceRequestResponse> assignManager(
            @PathVariable String requestId,
            @RequestBody(required = false) AssignManagerRequest assignRequest) {
        log.info("Assigning manager to service request: requestId={}, managerId={}", 
                requestId, assignRequest != null ? assignRequest.getManagerId() : "self");
        ServiceRequestResponse updated = serviceRequestService.assignManager(requestId, assignRequest);
        return ApiResponse.<ServiceRequestResponse>builder()
                .message("Manager assigned successfully")
                .data(updated)
                .statusCode(200)
                .build();
    }
}

