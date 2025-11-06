package com.mutrapro.request_service.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Outbox Pattern - Event Publishing
 * Lưu events vào database trong cùng transaction với business data
 * Background job sẽ publish events từ outbox ra Kafka
 */
@Entity
@Table(name = "outbox_events", indexes = {
    @Index(name = "ix_outbox_pending", columnList = "next_retry_at"),
    @Index(name = "ix_outbox_aggregate_id", columnList = "aggregate_id"),
    @Index(name = "ix_outbox_event_type", columnList = "event_type")
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
    private UUID outboxId;

    @Column(name = "aggregate_id", nullable = false)
    private UUID aggregateId; // userId, fileId, requestId, etc.

    @Column(name = "aggregate_type", nullable = false, length = 50)
    private String aggregateType; // "file", "request", etc.

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType; // "file.uploaded", "request.created", etc.

    @Column(name = "event_payload", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private JsonNode eventPayload; // JSON payload của event

    @Column(name = "occurred_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant occurredAt = Instant.now();

    @Column(name = "published_at")
    private Instant publishedAt; // NULL = pending, NOT NULL = published

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "next_retry_at")
    private Instant nextRetryAt;
}

