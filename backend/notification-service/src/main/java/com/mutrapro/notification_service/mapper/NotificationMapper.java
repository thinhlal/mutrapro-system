package com.mutrapro.notification_service.mapper;

import com.mutrapro.notification_service.dto.response.NotificationResponse;
import com.mutrapro.notification_service.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

/**
 * MapStruct mapper for Notification
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface NotificationMapper {
    
    NotificationResponse toResponse(Notification notification);
}

