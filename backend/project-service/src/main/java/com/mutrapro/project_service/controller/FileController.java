package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.response.FileInfoResponse;
import com.mutrapro.project_service.service.FileService;
import com.mutrapro.project_service.service.FileAccessService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@Tag(name = "Files")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileController {

    FileService fileService;

    @GetMapping("/by-request/{requestId}")
    @Operation(summary = "Lấy danh sách files theo requestId (requires authentication)")
    public ApiResponse<List<FileInfoResponse>> getFilesByRequestId(
            @Parameter(description = "ID của service request")
            @PathVariable String requestId,
            Authentication authentication) {
        log.info("Getting files by requestId: {}", requestId);
        
        // Lấy user context từ authentication
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        
        List<FileInfoResponse> fileResponses = fileService.getFilesByRequestId(
            requestId,
            userContext.getUserId(),
            userContext.getRoles()
        );

        return ApiResponse.<List<FileInfoResponse>>builder()
                .message("Files retrieved successfully")
                .data(fileResponses)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @GetMapping("/by-assignment/{assignmentId}")
    @Operation(summary = "Lấy danh sách files theo assignmentId (requires authentication)")
    public ApiResponse<List<FileInfoResponse>> getFilesByAssignmentId(
            @Parameter(description = "ID của task assignment")
            @PathVariable String assignmentId,
            Authentication authentication) {
        log.info("Getting files by assignmentId: {}", assignmentId);
        
        // Lấy user context từ authentication
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        
        List<FileInfoResponse> fileResponses = fileService.getFilesByAssignmentId(
            assignmentId,
            userContext.getUserId(),
            userContext.getRoles()
        );

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

    @GetMapping("/download/{fileId}")
    @Operation(summary = "Download file by fileId (requires authentication)")
    public ResponseEntity<Resource> downloadFile(
            @Parameter(description = "ID của file")
            @PathVariable String fileId,
            Authentication authentication) {
        log.info("Downloading file with id: {}", fileId);
        
        // Lấy user context từ authentication
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        
        // Get file info để lấy tên file (với security check)
        FileInfoResponse fileInfo = fileService.getFileInfo(
            fileId, 
            userContext.getUserId(), 
            userContext.getRoles()
        );
        
        // Download file content từ S3 (với security check)
        byte[] fileContent = fileService.downloadFile(
            fileId, 
            userContext.getUserId(), 
            userContext.getRoles()
        );
        
        // Tạo Resource từ byte array
        ByteArrayResource resource = new ByteArrayResource(fileContent);
        
        // Set headers cho download
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, 
                String.format("attachment; filename=\"%s\"", fileInfo.getFileName()));
        
        // Dùng mimeType thay vì contentType (enum) vì mimeType là MIME type hợp lệ
        String mimeType = fileInfo.getMimeType();
        if (mimeType == null || mimeType.isEmpty()) {
            // Fallback: dựa vào file extension để đoán MIME type
            String fileName = fileInfo.getFileName().toLowerCase();
            if (fileName.endsWith(".xml") || fileName.endsWith(".musicxml")) {
                mimeType = "application/xml";
            } else if (fileName.endsWith(".mid") || fileName.endsWith(".midi")) {
                mimeType = "audio/midi";
            } else if (fileName.endsWith(".pdf")) {
                mimeType = "application/pdf";
            } else if (fileName.endsWith(".mp3")) {
                mimeType = "audio/mpeg";
            } else if (fileName.endsWith(".wav")) {
                mimeType = "audio/wav";
            } else {
                mimeType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }
        }
        headers.add(HttpHeaders.CONTENT_TYPE, mimeType);
        
        return ResponseEntity.ok()
                .headers(headers)
                .contentLength(fileContent.length)
                .body(resource);
    }
    
    @GetMapping("/{fileId}")
    @Operation(summary = "Get file info by fileId (requires authentication)")
    public ApiResponse<FileInfoResponse> getFileInfo(
            @Parameter(description = "ID của file")
            @PathVariable String fileId,
            Authentication authentication) {
        log.info("Getting file info with id: {}", fileId);
        
        // Lấy user context từ authentication
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        
        // Get file info với security check
        FileInfoResponse fileInfo = fileService.getFileInfo(
            fileId, 
            userContext.getUserId(), 
            userContext.getRoles()
        );
        
        return ApiResponse.<FileInfoResponse>builder()
                .message("File info retrieved successfully")
                .data(fileInfo)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @PostMapping("/{fileId}/approve")
    @Operation(summary = "Manager approve file (requires MANAGER role)")
    public ApiResponse<FileInfoResponse> approveFile(
            @Parameter(description = "ID của file")
            @PathVariable String fileId,
            Authentication authentication) {
        log.info("Approving file: {}", fileId);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        
        FileInfoResponse fileInfo = fileService.approveFile(
            fileId,
            userContext.getUserId(),
            userContext.getRoles()
        );
        
        return ApiResponse.<FileInfoResponse>builder()
                .message("File approved successfully")
                .data(fileInfo)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @PostMapping("/{fileId}/reject")
    @Operation(summary = "Manager reject file (requires MANAGER role)")
    public ApiResponse<FileInfoResponse> rejectFile(
            @Parameter(description = "ID của file")
            @PathVariable String fileId,
            @Parameter(description = "Lý do từ chối")
            @RequestBody(required = false) Map<String, String> requestBody,
            Authentication authentication) {
        String reason = requestBody != null ? requestBody.get("reason") : null;
        log.info("Rejecting file: {}, reason: {}", fileId, reason);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        
        FileInfoResponse fileInfo = fileService.rejectFile(
            fileId,
            userContext.getUserId(),
            userContext.getRoles(),
            reason
        );
        
        return ApiResponse.<FileInfoResponse>builder()
                .message("File rejected successfully")
                .data(fileInfo)
                .statusCode(HttpStatus.OK.value())
                .build();
    }

    @PostMapping("/{fileId}/deliver")
    @Operation(summary = "Manager deliver file to customer (requires MANAGER role)")
    public ApiResponse<FileInfoResponse> deliverFileToCustomer(
            @Parameter(description = "ID của file")
            @PathVariable String fileId,
            Authentication authentication) {
        log.info("Delivering file to customer: {}", fileId);
        
        FileAccessService.UserContext userContext = FileAccessService.getUserContext(authentication);
        
        FileInfoResponse fileInfo = fileService.deliverFileToCustomer(
            fileId,
            userContext.getUserId(),
            userContext.getRoles()
        );
        
        return ApiResponse.<FileInfoResponse>builder()
                .message("File delivered to customer successfully")
                .data(fileInfo)
                .statusCode(HttpStatus.OK.value())
                .build();
    }
}

