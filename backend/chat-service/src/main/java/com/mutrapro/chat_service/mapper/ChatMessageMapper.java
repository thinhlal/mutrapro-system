package com.mutrapro.chat_service.mapper;

import com.mutrapro.chat_service.dto.response.ChatMessageResponse;
import com.mutrapro.chat_service.entity.ChatMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ChatMessageMapper {
    
    @Mapping(source = "chatRoom.roomId", target = "roomId")
    ChatMessageResponse toResponse(ChatMessage message);
}

