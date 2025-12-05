package com.mutrapro.chat_service.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "outbox_events",
    indexes = {
        @Index(name = "idx_outbox_pending", columnList = "next_retry_at")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "outbox_id", nullable = false)
    UUID outboxId;

    @Column(name = "aggregate_id", nullable = false)
    String aggregateId;  // room_id hoặc message_id

    @Column(name = "aggregate_type", nullable = false, length = 50)
    String aggregateType;  // 'chat_room', 'chat_message'

    @Column(name = "event_type", nullable = false, length = 100)
    String eventType;  // 'message.sent', 'room.created', etc.

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "event_payload", nullable = false, columnDefinition = "jsonb")
    JsonNode eventPayload;

    @Builder.Default
    @Column(name = "occurred_at", nullable = false)
    LocalDateTime occurredAt = LocalDateTime.now();

    @Column(name = "published_at")
    LocalDateTime publishedAt;

    @Builder.Default
    @Column(name = "retry_count", nullable = false)
    Integer retryCount = 0;

    @Column(name = "last_error", columnDefinition = "text")
    String lastError;

    @Column(name = "next_retry_at")
    LocalDateTime nextRetryAt;

    @Column(name = "trace_id", length = 100)
    String traceId;

    @Column(name = "correlation_id", length = 100)
    String correlationId;
}

