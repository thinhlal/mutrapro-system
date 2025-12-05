package com.mutrapro.billing_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Idempotency Pattern - Event Consumption
 * Lưu events đã xử lý để tránh duplicate processing
 * Composite PK: (event_id, consumer_name)
 */
@Entity
@Table(name = "consumed_events")
@IdClass(ConsumedEventId.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsumedEvent {

    @Id
    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Id
    @Column(name = "consumer_name", nullable = false, length = 100)
    private String consumerName;

    @Column(name = "processed_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime processedAt = LocalDateTime.now();
}

