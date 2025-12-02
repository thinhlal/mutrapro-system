package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.ReviewRevisionRequest;
import com.mutrapro.project_service.dto.response.RevisionRequestResponse;
import com.mutrapro.project_service.enums.RevisionRequestStatus;
import com.mutrapro.project_service.exception.InvalidRevisionRequestStatusException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.service.FileAccessService;
import com.mutrapro.project_service.service.RevisionRequestService;
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
@RequestMapping("/revision-requests")
@RequiredArgsConstructor
@Tag(name = "Revision Requests")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RevisionRequestController {

    RevisionRequestService revisionRequestService;

    @GetMapping("/by-assignment/{assignmentId}")
    @Operation(summary = "Get all revision requests by task assignment ID")
    public ApiResponse<List<RevisionRequestResponse>> getRevisionRequestsByAssignment(
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId,
            Authentication authentication) {
        log.info("Getting revision requests for assignment: {}", assignmentId);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        List<RevisionRequestResponse> responses = revisionRequestService.getRevisionRequestsByAssignmentId(
                assignmentId,
                userContext.getUserId(),
                userContext.getRoles());

        return ApiResponse.<List<RevisionRequestResponse>>builder()
                .message("Revision requests retrieved successfully")
                .data(responses)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @PostMapping("/{revisionRequestId}/review")
    @Operation(summary = "Manager review revision request (approve/reject) customer request revision")
    public ApiResponse<RevisionRequestResponse> reviewRevisionRequest(
            @Parameter(description = "ID của revision request")
            @PathVariable String revisionRequestId,
            @RequestBody ReviewRevisionRequest request,
            Authentication authentication) {
        log.info("Manager reviewing revision request: {}, action: {}", revisionRequestId, request.getAction());
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        RevisionRequestResponse response = revisionRequestService.reviewRevisionRequest(
                revisionRequestId,
                request,
                userContext.getUserId(),
                userContext.getRoles());

        return ApiResponse.<RevisionRequestResponse>builder()
                .message("Revision request reviewed successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }
    
    @GetMapping("/manager/my-requests")
    @Operation(summary = "Get all revision requests for current manager (with optional status filter)")
    public ApiResponse<List<RevisionRequestResponse>> getMyRevisionRequests(
            @Parameter(description = "Optional status filter")
            @RequestParam(required = false) String status,
            Authentication authentication) {
        log.info("Manager getting revision requests, status filter: {}", status);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        
        // Verify user is MANAGER
        if (!userContext.getRoles().contains("MANAGER") && !userContext.getRoles().contains("SYSTEM_ADMIN")) {
            throw UnauthorizedException.create("Only managers can access this endpoint");
        }
        
        RevisionRequestStatus statusEnum = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                statusEnum = RevisionRequestStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw InvalidRevisionRequestStatusException.invalidStatus(status);
            }
        }
        
        List<RevisionRequestResponse> responses = revisionRequestService.getRevisionRequestsByManager(
                userContext.getUserId(),
                statusEnum);

        return ApiResponse.<List<RevisionRequestResponse>>builder()
                .message("Revision requests retrieved successfully")
                .data(responses)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

}

