# Event-Driven Architecture - MuTraPro System

## Outbox Pattern + Idempotency Implementation (Tối giản)

### 1. Outbox Pattern (Event Publishing)

Mỗi service có bảng `outbox_events` riêng - tối giản và hiệu quả:

```sql
-- Ví dụ trong quotation-service
CREATE TABLE outbox_events (
  event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Dùng làm idempotency key
  aggregate_id    UUID NOT NULL,       -- quotation_id
  aggregate_type  TEXT NOT NULL,       -- 'quotation'
  event_type      TEXT NOT NULL,       -- 'quotation.approved'
  event_payload   JSONB NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ,         -- NULL = pending, NOT NULL = published
  retry_count     INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  next_retry_at   TIMESTAMPTZ,
  trace_id        TEXT,                -- Optional: distributed tracing
  correlation_id  TEXT
);

-- Partial index cho pending events (hiệu quả hơn)
CREATE INDEX IF NOT EXISTS ix_outbox_pending
  ON outbox_events(next_retry_at NULLS FIRST)
  WHERE published_at IS NULL;
```

### 2. Idempotency Pattern (Event Consumption)

Mỗi service có bảng `consumed_events` - tối giản với composite PK:

```sql
-- Ví dụ trong task-service
CREATE TABLE consumed_events (
  event_id       UUID NOT NULL,        -- PK part 1
  consumer_name  TEXT NOT NULL,        -- PK part 2: 'task-service'
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, consumer_name)
);
```

## Event Flow Implementation

### 1. Publishing Events (Outbox Pattern)

```java
@Service
@Transactional
public class QuotationService {
    
    @Autowired
    private OutboxEventRepository outboxRepo;
    
    public void approveQuotation(UUID quotationId) {
        // 1. Update business data
        quotation.setStatus(APPROVED);
        quotationRepo.save(quotation);
        
        // 2. Insert event vào outbox (same transaction)
        OutboxEvent event = OutboxEvent.builder()
            .eventId(UUID.randomUUID()) // Dùng làm idempotency key
            .aggregateId(quotationId)
            .aggregateType("quotation")
            .eventType("quotation.approved")
            .eventPayload(quotation.toEventPayload())
            .traceId(TracingContext.getCurrentTraceId()) // Optional
            .build();
        outboxRepo.save(event);
        
        // 3. Background job sẽ publish events từ outbox
    }
}
```

### 2. Consuming Events (Idempotency - Tối giản)

```java
@KafkaListener(topics = "quotation.approved")
@Transactional
public void handleQuotationApproved(QuotationApprovedEvent event) {
    try {
        // 1. Thử insert vào consumed_events (idempotent-by-schema)
        consumedEventRepo.insert(event.getEventId(), "task-service");
        
    } catch (DuplicateKeyException e) {
        // 2. Đã xử lý rồi → bỏ qua
        log.info("Event already processed, skipping: {}", event.getEventId());
        return;
    }
    
    // 3. Xử lý business logic
    try {
        createTasksForProject(event.getProjectId());
        log.info("Successfully processed event: {}", event.getEventId());
        
    } catch (Exception e) {
        log.error("Failed to process event: {}", event.getEventId(), e);
        throw e; // Rollback transaction → consumed_events cũng bị rollback
    }
}
```

## Event Types per Service

### quotation-service
- `request.created`
- `request.updated`
- `quotation.created`
- `quotation.revised`
- `quotation.approved`
- `quotation.rejected`
- `quotation.expired`
- `milestones.generated`

### task-service
- `task.assigned`
- `task.accepted`
- `task.in_progress`
- `task.completed`
- `task.overdue`

### project-service
- `project.created`
- `project.started`
- `project.completed`
- `project.cancelled`

### payment-service
- `payment.initiated`
- `payment.completed`
- `payment.failed`
- `payment.refunded`

### revision-service
- `revision.requested`
- `revision.approved`
- `revision.completed`
- `package.prepared`
- `package.delivered`

### project-service (includes studio bookings)
- `booking.created`
- `booking.confirmed`
- `booking.completed`
- `booking.cancelled`

### notification-service
- `notification.sent`
- `notification.delivered`
- `notification.failed`

## Background Jobs

### 1. Outbox Publisher (Mỗi service)

```java
@Component
public class OutboxPublisher {
    
    @Scheduled(fixedDelay = 5000) // Every 5 seconds
    public void publishPendingEvents() {
        // Query pending events với retry logic
        List<OutboxEvent> pendingEvents = outboxRepo.findPendingEvents();
        
        for (OutboxEvent event : pendingEvents) {
            try {
                // Publish to message broker (Kafka/RabbitMQ)
                messagePublisher.publish(event);
                
                // Mark as published
                event.setPublishedAt(Instant.now());
                outboxRepo.save(event);
                
            } catch (Exception e) {
                // Handle retry logic
                handlePublishFailure(event, e);
            }
        }
    }
    
    private void handlePublishFailure(OutboxEvent event, Exception e) {
        event.setRetryCount(event.getRetryCount() + 1);
        event.setLastError(e.getMessage());
        
        if (event.getRetryCount() >= MAX_RETRIES) {
            // Mark as published và đẩy vào DLQ
            event.setPublishedAt(Instant.now());
            deadLetterQueueService.send(event);
        } else {
            // Set next retry time (exponential backoff)
            event.setNextRetryAt(calculateNextRetry(event.getRetryCount()));
        }
        
        outboxRepo.save(event);
    }
    
    // Query method trong repository
    @Query("SELECT e FROM OutboxEvent e WHERE e.publishedAt IS NULL " +
           "AND (e.nextRetryAt IS NULL OR e.nextRetryAt <= :now)")
    List<OutboxEvent> findPendingEvents(@Param("now") Instant now);
}
```

### 2. Repository Methods

```java
@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {
    
    @Query("SELECT e FROM OutboxEvent e WHERE e.publishedAt IS NULL " +
           "AND (e.nextRetryAt IS NULL OR e.nextRetryAt <= :now)")
    List<OutboxEvent> findPendingEvents(@Param("now") Instant now);
}

@Repository
public interface ConsumedEventRepository extends JpaRepository<ConsumedEvent, ConsumedEventId> {
    
    @Modifying
    @Query(value = "INSERT INTO consumed_events (event_id, consumer_name, processed_at) " +
                   "VALUES (:eventId, :consumerName, :processedAt) " +
                   "ON CONFLICT (event_id, consumer_name) DO NOTHING", 
           nativeQuery = true)
    int insert(@Param("eventId") UUID eventId, 
               @Param("consumerName") String consumerName, 
               @Param("processedAt") Instant processedAt);
}
```

## Configuration

### application.yml cho mỗi service

```yaml
events:
  outbox:
    enabled: true
    batch-size: 100
    retry-attempts: 3
    retry-delay: 5000
  idempotency:
    enabled: true
    cleanup-after-days: 30
  message-broker:
    type: kafka # or rabbitmq
    bootstrap-servers: localhost:9092
    topic-prefix: mutrapro
```

## Monitoring & Observability

### 1. Metrics
- Events published per second
- Events processed per second
- Failed events count
- Retry attempts count
- Processing latency

### 2. Alerts
- High failure rate (>5%)
- Events stuck in pending (>10 minutes)
- Dead letter queue size (>100)

### 3. Dashboards
- Event flow diagram
- Service dependency map
- Error rate trends
- Processing time distribution

## Best Practices

1. **Idempotency**: Dùng `event_id` làm idempotency key, không cần thêm cột riêng
2. **Status Check**: Dùng `published_at IS NULL` thay vì enum status
3. **Consumer Idempotency**: Dùng `INSERT ... ON CONFLICT DO NOTHING` với composite PK
4. **Error Handling**: Exponential backoff cho retry, DLQ cho events thất bại
5. **Monitoring**: Track event flows, set up alerts cho high failure rate
6. **Testing**: Unit test event handlers, integration test với testcontainers
7. **Tracing**: Thêm `trace_id`/`correlation_id` cho distributed tracing
8. **Performance**: Partial index cho pending events, batch processing
