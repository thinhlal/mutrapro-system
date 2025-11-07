package com.mutrapro.request_service.controller;

import com.mutrapro.request_service.dto.request.CreateServiceRequestRequest;
import com.mutrapro.request_service.dto.response.ServiceRequestResponse;
import com.mutrapro.request_service.service.ServiceRequestService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
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
}

