package com.mutrapro.chat_service.controller;

import com.mutrapro.chat_service.dto.request.SendMessageRequest;
import com.mutrapro.chat_service.dto.response.ChatMessageResponse;
import com.mutrapro.chat_service.service.ChatMessageService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

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
    @Operation(summary = "Lấy danh sách tin nhắn trong phòng chat (phân trang)")
    public ApiResponse<Page<ChatMessageResponse>> getRoomMessages(
            @PathVariable String roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        log.info("Getting messages for room: roomId={}, page={}, size={}", roomId, page, size);
        Page<ChatMessageResponse> responses = chatMessageService.getRoomMessages(roomId, page, size);
        return ApiResponse.<Page<ChatMessageResponse>>builder()
                .message("Messages retrieved successfully")
                .data(responses)
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
}

