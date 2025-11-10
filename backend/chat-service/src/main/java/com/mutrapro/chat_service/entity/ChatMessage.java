package com.mutrapro.chat_service.entity;

import com.fasterxml.jackson.databind.JsonNode;
import com.mutrapro.chat_service.enums.MessageStatus;
import com.mutrapro.chat_service.enums.MessageType;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "chat_messages",
    indexes = {
        @Index(name = "idx_message_room", columnList = "room_id, created_at DESC"),
        @Index(name = "idx_message_sender", columnList = "sender_id"),
        @Index(name = "idx_message_status", columnList = "status")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatMessage extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "message_id", nullable = false)
    String messageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    ChatRoom chatRoom;

    @Column(name = "sender_id", nullable = false, length = 100)
    String senderId;  // Soft reference to identity-service

    @Column(name = "sender_name", length = 200)
    String senderName;  // Cached sender name

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 30)
    MessageType messageType;

    @Column(name = "content", columnDefinition = "text")
    String content;  // Text content hoặc URL của file

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    JsonNode metadata;  // File metadata, image dimensions, etc.

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    MessageStatus status;

    @Column(name = "sent_at", nullable = false)
    java.time.Instant sentAt;

    public String getId() {
        return messageId;
    }
}

