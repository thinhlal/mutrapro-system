package com.mutrapro.chat_service.mapper;

import com.mutrapro.chat_service.dto.response.ChatParticipantResponse;
import com.mutrapro.chat_service.dto.response.ChatRoomResponse;
import com.mutrapro.chat_service.entity.ChatParticipant;
import com.mutrapro.chat_service.entity.ChatRoom;
import org.mapstruct.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public abstract class ChatRoomMapper {
    
    @Autowired
    protected ChatParticipantMapper participantMapper;
    
    @Mapping(target = "participantCount", ignore = true)
    @Mapping(target = "participants", ignore = true)
    @Mapping(target = "lastMessage", ignore = true)
    public abstract ChatRoomResponse toResponse(ChatRoom chatRoom);
    
    @AfterMapping
    protected void setParticipants(@MappingTarget ChatRoomResponse response, ChatRoom chatRoom) {
        List<ChatParticipantResponse> participants = chatRoom.getParticipants().stream()
                .filter(ChatParticipant::getIsActive)
                .map(participantMapper::toResponse)
                .collect(Collectors.toList());
        
        response.setParticipants(participants);
        response.setParticipantCount(participants.size());
    }
}

