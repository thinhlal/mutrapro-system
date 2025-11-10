# Chat Service

Real-time chat service cho hệ thống Mutrapro - Đơn giản, hiệu quả, event-driven.

---

## 🎯 Overview

Chat Service cung cấp tính năng chat **CỰC MINIMALIST** với chỉ **2 operations cơ bản**:

✅ **Send** - Gửi tin nhắn  
✅ **View** - Xem tin nhắn  

**Không có:** Typing indicators, Online/Offline status, Read receipts, Reply/Thread, Edit, Delete

---

## 🏗️ Architecture

### **Event-Driven Design**

```
Request Service                Chat Service              Notification Service
      |                             |                             |
      |  1. Manager accepts         |                             |
      |     request                 |                             |
      |                             |                             |
      |  2. Publish                 |                             |
      |  RequestAssignedEvent       |                             |
      |─────────────────────────────>                             |
      |          Kafka              |                             |
      |                             |                             |
      |                             |  3. Consume event           |
      |                             |  4. Create chat room        |
      |                             |  5. Add participants        |
      |                             |                             |
      |                             |  6. Publish                 |
      |                             |  ChatRoomCreatedEvent       |
      |                             |─────────────────────────────>
      |                             |          Kafka              |
      |                             |                             |
      |                             |                             |  7. Send notifications
      |                             |                             |     to participants
```

### **Technology Stack**

- **Spring Boot 3.2** - Framework
- **WebSocket (STOMP)** - Real-time communication
- **Kafka** - Event streaming (Consumer + Producer)
- **PostgreSQL** - Persistent storage
- **MapStruct** - Object mapping
- **Shared Module** - Reusable components
  - `BaseIdempotentConsumer` - Kafka consumer base class
  - `BaseOutboxPublisher` - Outbox pattern implementation
  - Event models (`RequestAssignedEvent`, `ChatRoomCreatedEvent`)

---

## 📦 Domain Model

### **Entities**

```
ChatRoom (phòng chat)
├── roomId: UUID
├── roomType: RoomType (REQUEST_CHAT, PROJECT_CHAT...)
├── contextId: String (request_id, project_id...)
├── roomName: String
├── isActive: Boolean
├── lastMessageAt: Instant
└── Relationships:
    ├── participants: List<ChatParticipant>
    └── messages: List<ChatMessage>

ChatParticipant (người tham gia)
├── participantId: UUID
├── chatRoom: ChatRoom (FK)
├── userId: String
├── userName: String (cached)
├── role: ParticipantRole (OWNER, MANAGER, MEMBER, ADMIN)
├── joinedAt: Instant
├── isActive: Boolean
└── leftAt: Instant

ChatMessage (tin nhắn - IMMUTABLE)
├── messageId: UUID
├── chatRoom: ChatRoom (FK)
├── senderId: String
├── senderName: String (cached)
├── messageType: MessageType (TEXT, IMAGE, FILE...)
├── content: String
├── metadata: JsonNode
├── status: MessageStatus (SENT, DELIVERED, READ)
└── sentAt: Instant

OutboxEvent (outbox pattern)
├── outboxId: UUID
├── aggregateId: String
├── aggregateType: String
├── eventType: String
├── eventPayload: JsonNode
├── occurredAt: Instant
├── publishedAt: Instant
├── retryCount: Integer
└── nextRetryAt: Instant

ConsumedEvent (idempotency)
├── eventId: UUID (PK)
├── consumerName: String (PK)
└── processedAt: Instant
```

### **Unique Constraints**

- `chat_rooms`: `UNIQUE(room_type, context_id)` - Mỗi context chỉ 1 room
- `chat_participants`: `UNIQUE(room_id, user_id)` - User không duplicate trong room
- `consumed_events`: `PRIMARY KEY(event_id, consumer_name)` - Idempotency

---

## 🔄 Kafka Integration

### **Consumer**

**Topic:** `request-events`  
**Event:** `RequestAssignedEvent`  
**Trigger:** Khi manager được assign vào request

```java
@Component
public class RequestEventConsumer extends BaseIdempotentConsumer<RequestAssignedEvent> {
    
    @KafkaListener(topics = "${app.event-topics.mappings.request.assigned}")
    public void handleRequestAssignedEvent(RequestAssignedEvent event) {
        // Base class handles:
        // 1. Idempotency check
        // 2. Call processEvent()
        // 3. Acknowledge
    }
    
    @Override
    protected void processEvent(RequestAssignedEvent event, Acknowledgment ack) {
        // Create chat room
        // Add owner + manager as participants
    }
}
```

**Idempotency:**  
- Dùng table `consumed_events` với `ON CONFLICT DO NOTHING`
- Base class `BaseIdempotentConsumer` handle logic

### **Producer (Outbox Pattern)**

**Topic:** `chat-events`  
**Event:** `ChatRoomCreatedEvent`  
**Trigger:** Khi chat room được tạo thành công

```java
@Component
public class OutboxPublisher extends BaseOutboxPublisher<OutboxEvent> {
    
    @Scheduled(fixedDelay = 5000) // Every 5 seconds
    public void publishPendingEvents() {
        // Base class handles:
        // 1. Query pending events
        // 2. Publish to Kafka
        // 3. Mark as published
        // 4. Retry on failure
    }
}
```

**Flow:**
1. Room created → Save event to `outbox_events` table
2. Background job (`OutboxPublisher`) reads pending events
3. Publish to Kafka topic
4. Mark as `publishedAt`
5. Notification Service consumes → Send notifications

---

## 🚀 API Endpoints

### **REST API**

#### **Chat Rooms**

```http
POST /api/chat/rooms
Content-Type: application/json

{
  "roomType": "REQUEST_CHAT",
  "contextId": "req-123",
  "roomName": "Tư vấn Request #123"
}
```

```http
GET /api/chat/rooms/{roomId}
GET /api/chat/rooms/user
GET /api/chat/rooms/context/{roomType}/{contextId}
```

```http
POST /api/chat/rooms/{roomId}/participants
{
  "userId": "user-123",
  "userName": "John Doe",
  "role": "MEMBER"
}
```

#### **Chat Messages**

```http
POST /api/chat/messages
{
  "roomId": "room-uuid",
  "messageType": "TEXT",
  "content": "Hello world"
}
```

```http
GET /api/chat/messages/room/{roomId}?page=0&size=50
GET /api/chat/messages/room/{roomId}/recent?sinceTimestamp=1234567890
```

### **WebSocket (STOMP)**

**Connect:**
```javascript
const socket = new SockJS('http://chat-service/ws');
const stompClient = Stomp.over(socket);

stompClient.connect(headers, () => {
    // Subscribe to room
    stompClient.subscribe('/topic/chat/room-123', (message) => {
        console.log('New message:', JSON.parse(message.body));
    });
});
```

**Send Message:**
```javascript
stompClient.send('/app/chat/room-123/send', {}, JSON.stringify({
    roomId: 'room-123',
    messageType: 'TEXT',
    content: 'Hello'
}));
```

**Subscribe Patterns:**
- `/topic/chat/{roomId}` - Room messages (broadcast to all)
- `/user/queue/messages` - Personal messages
- `/user/queue/errors` - Error notifications

---

## ⚙️ Configuration

### **application.yaml**

```yaml
app:
  event-topics:
    mappings:
      request:
        assigned: request-events
      chat:
        roomCreated: chat-events
  outbox:
    max-retries: 3

spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: chat-service
      auto-offset-reset: earliest
      enable-auto-commit: false
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer

  datasource:
    url: jdbc:postgresql://localhost:5432/chat_db
    username: chat_user
    password: chat_password

  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
```

---

## 🧪 Testing

### **1. Kafka Consumer Test**

Publish test event:
```bash
kafka-console-producer --bootstrap-server localhost:9092 --topic request-events

# Paste JSON:
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "requestId": "req-test-1",
  "title": "Test Request",
  "ownerId": "user-1",
  "ownerName": "User One",
  "managerId": "mgr-1",
  "managerName": "Manager One",
  "timestamp": "2024-01-01T10:00:00Z"
}
```

Verify:
```sql
SELECT * FROM chat_rooms WHERE context_id = 'req-test-1';
SELECT * FROM chat_participants WHERE room_id = '<room_id>';
SELECT * FROM consumed_events WHERE event_id = '550e8400-e29b-41d4-a716-446655440000';
```

### **2. WebSocket Test**

```javascript
// Connect
const socket = new SockJS('http://localhost:8084/ws');
const stompClient = Stomp.over(socket);

stompClient.connect({
    'Authorization': 'Bearer <jwt-token>'
}, () => {
    // Subscribe
    stompClient.subscribe('/topic/chat/room-123', (msg) => {
        console.log('Received:', JSON.parse(msg.body));
    });
    
    // Send
    stompClient.send('/app/chat/room-123/send', {}, JSON.stringify({
        roomId: 'room-123',
        messageType: 'TEXT',
        content: 'Test message'
    }));
});
```

---

## 📊 Database Schema

```sql
CREATE TABLE chat_rooms (
    room_id UUID PRIMARY KEY,
    room_type VARCHAR(30) NOT NULL,
    context_id VARCHAR(100) NOT NULL,
    room_name VARCHAR(200),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    updated_at TIMESTAMP,
    updated_by VARCHAR(100),
    UNIQUE(room_type, context_id)
);

CREATE TABLE chat_participants (
    participant_id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES chat_rooms(room_id),
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(200),
    role VARCHAR(20) NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    left_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    UNIQUE(room_id, user_id)
);

CREATE TABLE chat_messages (
    message_id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES chat_rooms(room_id),
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(200),
    message_type VARCHAR(30) NOT NULL,
    content TEXT,
    metadata JSONB,
    status VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE outbox_events (
    outbox_id UUID PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_payload JSONB NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    published_at TIMESTAMP,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMP
);

CREATE TABLE consumed_events (
    event_id UUID,
    consumer_name VARCHAR(255),
    processed_at TIMESTAMP NOT NULL,
    PRIMARY KEY (event_id, consumer_name)
);
```

---

## 🔐 Security

### **JWT Authentication**

- WebSocket: Header `Authorization: Bearer <token>`
- REST: Header `Authorization: Bearer <token>`
- JWT claims:
  - `sub`: User ID
  - `name`: Full name

### **Authorization**

- User phải là **participant** của room mới được:
  - Gửi message
  - Xem messages
  - Subscribe WebSocket

---

## 📈 Monitoring

### **Metrics**

- Kafka consumer lag
- Message processing time
- WebSocket connection count
- Outbox event publish success/failure rate

### **Logging**

```java
log.info("Received RequestAssignedEvent: eventId={}, requestId={}", ...);
log.info("Chat room created: roomId={}, participants=[{}, {}]", ...);
log.info("Message sent: messageId={}, roomId={}, senderId={}", ...);
log.error("Failed to process event: eventId={}, error={}", ...);
```

---

## 🚀 Deployment

### **Docker Compose**

```yaml
chat-service:
  image: chat-service:latest
  ports:
    - "8084:8084"
  environment:
    - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/chat_db
    - SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092
  depends_on:
    - postgres
    - kafka
```

### **Kubernetes**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: chat-service
spec:
  type: ClusterIP
  sessionAffinity: ClientIP  # Important for WebSocket
  ports:
    - port: 8084
  selector:
    app: chat-service
```

---

## 📚 Related Documentation

- [Kafka Integration](./README_KAFKA.md) - Chi tiết về event-driven architecture
- [Shared Module](../shared/README.md) - Base classes & utilities
- [API Documentation](http://localhost:8084/swagger-ui.html) - Swagger UI

---

## 🎯 Key Design Decisions

### **Why No Edit/Delete?**
- **IMMUTABLE messages** = Full audit trail
- Simpler code, fewer bugs
- Compliance-ready

### **Why Event-Driven?**
- **Loose coupling** giữa services
- **Resilient** - Kafka retry on failure
- **Scalable** - Async processing

### **Why Outbox Pattern?**
- **Guaranteed delivery** - Transaction + Event = Atomic
- **No lost events** - DB first, Kafka second
- **At-least-once** delivery

### **Why BaseIdempotentConsumer?**
- **DRY** - Không duplicate idempotency logic
- **Type-safe** - Generic interface
- **Consistent** - Same pattern across services

---

## ✅ Checklist

- [x] Real-time chat (WebSocket)
- [x] REST API (history, create room)
- [x] Kafka Consumer (RequestAssignedEvent)
- [x] Kafka Producer (ChatRoomCreatedEvent)
- [x] Outbox Pattern
- [x] Idempotency
- [x] MapStruct mapping
- [x] JWT Authentication
- [x] Participant authorization
- [x] Docker & Kubernetes configs
- [x] Swagger documentation

---

Made with ❤️ by Mutrapro Team
