package com.mutrapro.notification_service.mapper;

import com.mutrapro.notification_service.dto.response.NotificationResponse;
import com.mutrapro.notification_service.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * MapStruct mapper for Notification
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface NotificationMapper {
    
    @Mapping(target = "readAt", source = "readAt", qualifiedByName = "instantToLocalDateTime")
    NotificationResponse toResponse(Notification notification);
    
    /**
     * Convert Instant to LocalDateTime (default timezone: system default)
     * MapStruct sẽ tự động dùng method này khi có @Named annotation
     */
    @Named("instantToLocalDateTime")
    default LocalDateTime instantToLocalDateTime(Instant instant) {
        if (instant == null) {
            return null;
        }
        return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
    }
}

