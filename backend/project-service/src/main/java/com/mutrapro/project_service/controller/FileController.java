package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.response.FileInfoResponse;
import com.mutrapro.project_service.service.FileService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@Tag(name = "Files")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileController {

    FileService fileService;

    @GetMapping("/by-request/{requestId}")
    @Operation(summary = "Lấy danh sách files theo requestId")
    public ApiResponse<List<FileInfoResponse>> getFilesByRequestId(
            @Parameter(description = "ID của service request")
            @PathVariable String requestId) {
        log.info("Getting files by requestId: {}", requestId);
        List<FileInfoResponse> fileResponses = fileService.getFilesByRequestId(requestId);

        return ApiResponse.<List<FileInfoResponse>>builder()
                .message("Files retrieved successfully")
                .data(fileResponses)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @GetMapping("/by-assignment/{assignmentId}")
    @Operation(summary = "Lấy danh sách files theo assignmentId (files do specialist upload)")
    public ApiResponse<List<FileInfoResponse>> getFilesByAssignmentId(
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId) {
        log.info("Getting files by assignmentId: {}", assignmentId);
        List<FileInfoResponse> fileResponses = fileService.getFilesByAssignmentId(assignmentId);

        return ApiResponse.<List<FileInfoResponse>>builder()
                .message("Files retrieved successfully")
                .data(fileResponses)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload file output cho task assignment (specialist)")
    public ApiResponse<FileInfoResponse> uploadTaskFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("assignmentId") String assignmentId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "contentType", required = false, defaultValue = "notation") String contentType,
            Authentication authentication) {
        log.info("Uploading file for assignmentId: {}, fileName: {}, size: {}", 
                assignmentId, file.getOriginalFilename(), file.getSize());
        
        String userId = authentication != null ? authentication.getName() : null;
        FileInfoResponse response = fileService.uploadTaskFile(
                file, assignmentId, description, contentType, userId);

        return ApiResponse.<FileInfoResponse>builder()
                .message("File uploaded successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .build();
    }
}

