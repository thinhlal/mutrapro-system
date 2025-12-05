package com.mutrapro.chat_service.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "consumed_events")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@IdClass(ConsumedEventId.class)
public class ConsumedEvent {

    @Id
    @Column(name = "event_id", nullable = false)
    UUID eventId;

    @Id
    @Column(name = "consumer_name", nullable = false, length = 100)
    String consumerName;

    @Column(name = "processed_at", nullable = false)
    LocalDateTime processedAt;
}

