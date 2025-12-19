package com.mutrapro.request_service.controller;

import com.mutrapro.request_service.dto.request.AssignManagerRequest;
import com.mutrapro.request_service.dto.request.CreateServiceRequestRequest;
import com.mutrapro.request_service.dto.response.ServiceRequestResponse;
import com.mutrapro.request_service.enums.RequestStatus;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.service.ServiceRequestService;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

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
    @Operation(summary = "Lấy danh sách request mà user hiện tại đã tạo (có thể filter theo status và requestType, có phân trang)")
    public ApiResponse<PageResponse<ServiceRequestResponse>> getUserRequests(
            @Parameter(description = "Filter theo status (pending, in_progress, completed, cancelled). Nếu không truyền thì trả về tất cả")
            @RequestParam(required = false) RequestStatus status,
            @Parameter(description = "Filter theo request type (transcription, arrangement, arrangement_with_recording, recording). Nếu không truyền thì trả về tất cả")
            @RequestParam(required = false) ServiceType requestType,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "createdAt,desc") String sort) {
        log.info("Getting user requests with filters: status={}, requestType={}, page={}, size={}, sort={}", 
                status != null ? status.name() : "all",
                requestType != null ? requestType.name() : "all",
                page, size, sort);
        
        // Parse sort string (format: "field,direction")
        Sort.Direction direction = Sort.Direction.DESC;
        String sortField = "createdAt";
        if (sort != null && !sort.isEmpty()) {
            String[] sortParts = sort.split(",");
            sortField = sortParts[0].trim();
            if (sortParts.length > 1) {
                direction = sortParts[1].trim().equalsIgnoreCase("asc")
                    ? Sort.Direction.ASC
                    : Sort.Direction.DESC;
            }
        }
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
        Page<ServiceRequestResponse> requestsPage = serviceRequestService.getUserRequests(status, requestType, pageable);
        
        PageResponse<ServiceRequestResponse> pageResponse = PageResponse.from(requestsPage);
        
        return ApiResponse.<PageResponse<ServiceRequestResponse>>builder()
                .message("User requests retrieved successfully")
                .data(pageResponse)
                .statusCode(200)
                .build();
    }

    @GetMapping
    @Operation(summary = "Lấy tất cả service requests với các filter tùy chọn (có phân trang)")
    public ApiResponse<PageResponse<ServiceRequestResponse>> getAllServiceRequests(
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(required = false) ServiceType requestType,
            @RequestParam(required = false) String managerUserId,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "createdAt,desc") String sort) {
        log.info("Getting all service requests with filters: status={}, requestType={}, managerUserId={}, page={}, size={}, sort={}", 
                status, requestType, managerUserId, page, size, sort);
        
        // Parse sort string (format: "field,direction")
        Sort.Direction direction = Sort.Direction.DESC;
        String sortField = "createdAt";
        if (sort != null && !sort.isEmpty()) {
            String[] sortParts = sort.split(",");
            sortField = sortParts[0].trim();
            if (sortParts.length > 1) {
                direction = sortParts[1].trim().equalsIgnoreCase("asc") 
                    ? Sort.Direction.ASC 
                    : Sort.Direction.DESC;
            }
        }
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
        Page<ServiceRequestResponse> requestsPage = serviceRequestService.getAllServiceRequests(
                status, requestType, managerUserId, pageable);
        
        PageResponse<ServiceRequestResponse> pageResponse = PageResponse.from(requestsPage);
        
        return ApiResponse.<PageResponse<ServiceRequestResponse>>builder()
                .message("Service requests retrieved successfully")
                .data(pageResponse)
                .statusCode(200)
                .build();
    }

    @GetMapping("/{requestId}")
    @Operation(summary = "Lấy chi tiết một service request theo requestId (đầy đủ thông tin kèm files)")
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

    @GetMapping("/{requestId}/basic")
    @Operation(summary = "Lấy thông tin cơ bản của service request (không kèm files và manager info) - Tối ưu cho performance")
    public ApiResponse<ServiceRequestResponse> getServiceRequestBasicInfo(
            @Parameter(description = "ID của request")
            @PathVariable String requestId) {
        log.info("Getting service request basic info: requestId={}", requestId);
        ServiceRequestResponse request = serviceRequestService.getServiceRequestBasicInfo(requestId);
        return ApiResponse.<ServiceRequestResponse>builder()
                .message("Service request basic info retrieved successfully")
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

    @PutMapping("/{requestId}/status")
    @Operation(summary = "Cập nhật status của service request (dùng cho các service khác như project-service)")
    public ApiResponse<ServiceRequestResponse> updateRequestStatus(
            @Parameter(description = "ID của request")
            @PathVariable String requestId,
            @Parameter(description = "Status mới")
            @RequestParam RequestStatus status) {
        log.info("Updating request status: requestId={}, status={}", requestId, status);
        ServiceRequestResponse updated = serviceRequestService.updateRequestStatus(requestId, status);
        return ApiResponse.<ServiceRequestResponse>builder()
                .message("Request status updated successfully")
                .data(updated)
                .statusCode(200)
                .build();
    }
}

