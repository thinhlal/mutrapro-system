package com.mutrapro.billing_service.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Outbox Pattern - lưu event để publish ra Kafka
 */
@Entity
@Table(name = "outbox_events", indexes = {
        @Index(name = "ix_billing_outbox_pending", columnList = "next_retry_at"),
        @Index(name = "ix_billing_outbox_aggregate_id", columnList = "aggregate_id"),
        @Index(name = "ix_billing_outbox_event_type", columnList = "event_type")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "event_id", nullable = false, unique = true)
    UUID outboxId;

    @Column(name = "aggregate_id", nullable = false)
    UUID aggregateId;

    @Column(name = "aggregate_type", nullable = false, length = 50)
    String aggregateType;

    @Column(name = "event_type", nullable = false, length = 100)
    String eventType;

    @Column(name = "event_payload", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    JsonNode eventPayload;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    @Builder.Default
    LocalDateTime occurredAt = LocalDateTime.now();

    @Column(name = "published_at")
    LocalDateTime publishedAt;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    Integer retryCount = 0;

    @Column(name = "last_error", columnDefinition = "TEXT")
    String lastError;

    @Column(name = "next_retry_at")
    LocalDateTime nextRetryAt;
}

