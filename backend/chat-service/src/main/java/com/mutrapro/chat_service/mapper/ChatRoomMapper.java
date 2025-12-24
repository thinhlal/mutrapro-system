package com.mutrapro.chat_service.mapper;

import com.mutrapro.chat_service.dto.response.ChatRoomResponse;
import com.mutrapro.chat_service.entity.ChatRoom;
import org.mapstruct.*;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ChatRoomMapper {
    
    @Mapping(target = "participantCount", ignore = true)
    @Mapping(target = "participants", ignore = true)
    @Mapping(target = "lastMessage", ignore = true)
    ChatRoomResponse toResponse(ChatRoom chatRoom);
}

