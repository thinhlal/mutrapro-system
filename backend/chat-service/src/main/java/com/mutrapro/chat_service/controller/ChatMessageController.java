package com.mutrapro.chat_service.controller;

import com.mutrapro.chat_service.dto.request.SendMessageRequest;
import com.mutrapro.chat_service.dto.response.ChatMessageResponse;
import com.mutrapro.chat_service.dto.response.FileUploadResponse;
import com.mutrapro.chat_service.service.ChatMessageService;
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
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/messages")
@RequiredArgsConstructor
@Tag(name = "Chat Messages", description = "API để load lịch sử messages. Gửi message real-time qua WebSocket (/ws)")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatMessageController {

    ChatMessageService chatMessageService;

    @GetMapping("/room/{roomId}")
    @Operation(summary = "Lấy danh sách tin nhắn trong phòng chat (phân trang) và có thể filter theo context")
    public ApiResponse<PageResponse<ChatMessageResponse>> getRoomMessages(
            @PathVariable String roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String contextType, // Optional: GENERAL, MILESTONE, REVISION_REQUEST, etc.
            @RequestParam(required = false) String contextId) { // Optional: milestoneId, revisionRequestId, etc.
        log.info("Getting messages for room: roomId={}, page={}, size={}, contextType={}, contextId={}",
                roomId, page, size, contextType, contextId);
        Page<ChatMessageResponse> responses = chatMessageService.getRoomMessages(roomId, page, size, contextType, contextId);
        
        PageResponse<ChatMessageResponse> pageResponse = PageResponse.from(responses);
        
        return ApiResponse.<PageResponse<ChatMessageResponse>>builder()
                .message("Messages retrieved successfully")
                .data(pageResponse)
                .statusCode(200)
                .build();
    }

    @GetMapping("/room/{roomId}/recent")
    @Operation(summary = "Lấy tin nhắn mới từ thời điểm cụ thể (dùng để sync khi reconnect)")
    public ApiResponse<List<ChatMessageResponse>> getRecentMessages(
            @PathVariable String roomId,
            @RequestParam long sinceTimestamp) {
        Instant since = Instant.ofEpochMilli(sinceTimestamp);
        log.info("Getting recent messages: roomId={}, since={}", roomId, since);
        List<ChatMessageResponse> responses = chatMessageService.getRecentMessages(roomId, since);
        return ApiResponse.<List<ChatMessageResponse>>builder()
                .message("Recent messages retrieved successfully")
                .data(responses)
                .statusCode(200)
                .build();
    }

    @PostMapping("/system")
    @Operation(summary = "Gửi system message vào chat room (dùng cho các service khác, không cần authentication)")
    public ApiResponse<ChatMessageResponse> sendSystemMessage(@Valid @RequestBody SendMessageRequest request) {
        log.info("Sending system message: roomId={}, type={}", request.getRoomId(), request.getMessageType());
        ChatMessageResponse response = chatMessageService.sendSystemMessage(request);
        return ApiResponse.<ChatMessageResponse>builder()
                .message("System message sent successfully")
                .data(response)
                .statusCode(200)
                .build();
    }

    @GetMapping("/room/{roomId}/unread-count")
    @Operation(summary = "Lấy số lượng tin nhắn chưa đọc trong phòng chat")
    public ApiResponse<Long> getUnreadCount(@PathVariable String roomId) {
        log.info("Getting unread count for room: roomId={}", roomId);
        long count = chatMessageService.getUnreadCount(roomId);
        return ApiResponse.<Long>builder()
                .message("Unread count retrieved successfully")
                .data(count)
                .statusCode(200)
                .build();
    }

    @PostMapping("/room/{roomId}/mark-read")
    @Operation(summary = "Đánh dấu tin nhắn đã đọc trong phòng chat")
    public ApiResponse<Void> markAsRead(@PathVariable String roomId) {
        log.info("Marking messages as read for room: roomId={}", roomId);
        chatMessageService.markAsRead(roomId);
        return ApiResponse.<Void>builder()
                .message("Messages marked as read successfully")
                .statusCode(200)
                .build();
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload file cho chat (trả về fileKey để download sau này)")
    public ApiResponse<FileUploadResponse> uploadFile(
            @Parameter(description = "File cần upload")
            @RequestParam("file") MultipartFile file,
            @Parameter(description = "Room ID (để verify access)")
            @RequestParam("roomId") String roomId) {
        log.info("Uploading file for chat: roomId={}, fileName={}, size={}", 
                roomId, file.getOriginalFilename(), file.getSize());
        
        FileUploadResponse response = chatMessageService.uploadFile(file, roomId);
        
        return ApiResponse.<FileUploadResponse>builder()
                .message("File uploaded successfully")
                .data(response)
                .statusCode(200)
                .build();
    }

    @GetMapping("/download")
    @Operation(summary = "Download file từ chat (requires authentication và participant access)")
    public ResponseEntity<Resource> downloadFile(
            @Parameter(description = "S3 file key (từ fileKey trong message metadata)")
            @RequestParam("fileKey") String fileKey,
            @Parameter(description = "Chat room ID (để verify participant access)")
            @RequestParam("roomId") String roomId) {
        log.info("Downloading file: fileKey={}, roomId={}", fileKey, roomId);
        
        // Download file với authentication check
        byte[] fileContent = chatMessageService.downloadFile(fileKey, roomId);
        
        // Extract file name from fileKey (last part after last /)
        String fileName = fileKey.substring(fileKey.lastIndexOf('/') + 1);
        // Remove UUID prefix if exists (format: name-uuid.ext)
        int lastDash = fileName.lastIndexOf('-');
        if (lastDash > 0) {
            // Try to find extension
            int lastDot = fileName.lastIndexOf('.');
            if (lastDot > lastDash) {
                // Format: name-uuid.ext -> name.ext
                String namePart = fileName.substring(0, lastDash);
                String extPart = fileName.substring(lastDot);
                fileName = namePart + extPart;
            }
        }
        
        // Create Resource
        ByteArrayResource resource = new ByteArrayResource(fileContent);
        
        // Set headers
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, 
                String.format("attachment; filename=\"%s\"", 
                        URLEncoder.encode(fileName, StandardCharsets.UTF_8)));
        
        // Determine content type from file extension
        String contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        if (fileName.toLowerCase().endsWith(".pdf")) {
            contentType = "application/pdf";
        } else if (fileName.toLowerCase().endsWith(".png")) {
            contentType = "image/png";
        } else if (fileName.toLowerCase().endsWith(".jpg") || fileName.toLowerCase().endsWith(".jpeg")) {
            contentType = "image/jpeg";
        } else if (fileName.toLowerCase().endsWith(".mp3")) {
            contentType = "audio/mpeg";
        } else if (fileName.toLowerCase().endsWith(".mp4")) {
            contentType = "video/mp4";
        }
        
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(fileContent.length)
                .body(resource);
    }
}

