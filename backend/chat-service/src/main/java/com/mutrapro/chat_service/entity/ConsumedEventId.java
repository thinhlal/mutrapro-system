package com.mutrapro.chat_service.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConsumedEventId implements Serializable {
    UUID eventId;
    String consumerName;
}

