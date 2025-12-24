package com.mutrapro.chat_service.controller;

import com.mutrapro.chat_service.dto.request.AddParticipantRequest;
import com.mutrapro.chat_service.dto.request.CreateChatRoomRequest;
import com.mutrapro.chat_service.dto.response.ChatRoomResponse;
import com.mutrapro.chat_service.exception.ChatRoomNotFoundException;
import com.mutrapro.chat_service.service.ChatRoomService;
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

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/chat-rooms")
@RequiredArgsConstructor
@Tag(name = "Chat Rooms")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatRoomController {

    ChatRoomService chatRoomService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tạo phòng chat mới")
    public ApiResponse<ChatRoomResponse> createChatRoom(@Valid @RequestBody CreateChatRoomRequest request) {
        log.info("Creating chat room: type={}, contextId={}", request.getRoomType(), request.getContextId());
        ChatRoomResponse response = chatRoomService.createChatRoom(request);
        return ApiResponse.<ChatRoomResponse>builder()
                .message("Chat room created successfully")
                .data(response)
                .statusCode(201)
                .build();
    }

    @GetMapping("/{roomId}")
    @Operation(summary = "Lấy thông tin phòng chat")
    public ApiResponse<ChatRoomResponse> getChatRoom(@PathVariable String roomId) {
        log.info("Getting chat room: roomId={}", roomId);
        ChatRoomResponse response = chatRoomService.getChatRoom(roomId);
        return ApiResponse.<ChatRoomResponse>builder()
                .message("Chat room retrieved successfully")
                .data(response)
                .statusCode(200)
                .build();
    }

    @GetMapping("/by-context")
    @Operation(summary = "Lấy phòng chat theo context (request_id, contract_id)")
    public ApiResponse<ChatRoomResponse> getChatRoomByContext(
            @RequestParam String roomType,
            @RequestParam String contextId) {
        log.info("Getting chat room by context: type={}, contextId={}", roomType, contextId);
        try {
            ChatRoomResponse response = chatRoomService.getChatRoomByContext(roomType, contextId);
            return ApiResponse.<ChatRoomResponse>builder()
                    .message("Chat room retrieved successfully")
                    .data(response)
                    .statusCode(200)
                    .build();
        } catch (ChatRoomNotFoundException ex) {
            log.info("Chat room not found for context type={}, id={}, return empty result", roomType, contextId);
            return ApiResponse.<ChatRoomResponse>builder()
                    .message("Chat room chưa được tạo")
                    .data(null)
                    .statusCode(200)
                    .build();
        }
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách phòng chat của user hiện tại")
    public ApiResponse<List<ChatRoomResponse>> getUserChatRooms(
            @RequestParam(required = false) String roomType) {
        log.info("Getting user chat rooms: roomType={}", roomType);
        com.mutrapro.chat_service.enums.RoomType type = null;
        if (roomType != null && !roomType.isBlank()) {
            try {
                type = com.mutrapro.chat_service.enums.RoomType.valueOf(roomType);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid roomType: {}, returning all rooms", roomType);
            }
        }
        List<ChatRoomResponse> responses = chatRoomService.getUserChatRooms(type);
        return ApiResponse.<List<ChatRoomResponse>>builder()
                .message("Chat rooms retrieved successfully")
                .data(responses)
                .statusCode(200)
                .build();
    }

    @PostMapping("/{roomId}/participants")
    @Operation(summary = "Thêm người tham gia vào phòng chat")
    public ApiResponse<ChatRoomResponse> addParticipant(
            @PathVariable String roomId,
            @Valid @RequestBody AddParticipantRequest request) {
        log.info("Adding participant to room: roomId={}, userId={}", roomId, request.getUserId());
        ChatRoomResponse response = chatRoomService.addParticipant(roomId, request);
        return ApiResponse.<ChatRoomResponse>builder()
                .message("Participant added successfully")
                .data(response)
                .statusCode(200)
                .build();
    }

    @DeleteMapping("/{roomId}/participants/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Xóa người tham gia khỏi phòng chat")
    public void removeParticipant(@PathVariable String roomId, @PathVariable String userId) {
        log.info("Removing participant from room: roomId={}, userId={}", roomId, userId);
        chatRoomService.removeParticipant(roomId, userId);
    }

    @PutMapping("/{roomId}/deactivate")
    @Operation(summary = "Đóng phòng chat (Admin only)")
    public ApiResponse<Void> deactivateRoom(@PathVariable String roomId) {
        log.info("Deactivating chat room: roomId={}", roomId);
        chatRoomService.deactivateRoom(roomId);
        return ApiResponse.<Void>builder()
                .message("Chat room deactivated successfully")
                .statusCode(200)
                .build();
    }
}

