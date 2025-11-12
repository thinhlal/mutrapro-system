package com.mutrapro.project_service.client;

import com.mutrapro.project_service.dto.request.SendSystemMessageRequest;
import com.mutrapro.project_service.dto.response.ChatMessageResponse;
import com.mutrapro.project_service.dto.response.ChatRoomResponse;
import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Feign Client để gọi chat-service
 */
@FeignClient(
    name = "chat-service",
    url = "${chat.service.base-url:http://localhost:8088}",
    path = "/chat"
)
public interface ChatServiceFeignClient {

    /**
     * Lấy chat room theo context (requestId)
     * GET /chat-rooms/by-context?roomType=REQUEST_CHAT&contextId={requestId}
     */
    @GetMapping("/chat-rooms/by-context")
    ApiResponse<ChatRoomResponse> getChatRoomByRequestId(
        @RequestParam("roomType") String roomType,
        @RequestParam("contextId") String contextId);

    /**
     * Gửi system message vào chat room
     * POST /messages/system
     */
    @PostMapping("/messages/system")
    ApiResponse<ChatMessageResponse> sendSystemMessage(@RequestBody SendSystemMessageRequest messageRequest);
}

