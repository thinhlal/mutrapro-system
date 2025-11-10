package com.mutrapro.chat_service.mapper;

import com.mutrapro.chat_service.dto.response.ChatParticipantResponse;
import com.mutrapro.chat_service.entity.ChatParticipant;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ChatParticipantMapper {
    
    ChatParticipantResponse toResponse(ChatParticipant participant);
}

