package com.mutrapro.chat_service.entity;

import com.mutrapro.chat_service.enums.RoomType;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "chat_rooms",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"room_type", "context_id"},
        name = "uk_chat_room_type_context"
    ),
    indexes = {
        @Index(name = "idx_room_type_context", columnList = "room_type, context_id"),
        @Index(name = "idx_context_id", columnList = "context_id")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatRoom extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "room_id", nullable = false)
    String roomId;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false, length = 30)
    RoomType roomType;

    @Column(name = "context_id", nullable = false, length = 100)
    String contextId;  // request_id, project_id, hoặc user_id pair

    @Column(name = "room_name", length = 200)
    String roomName;

    @Column(name = "description", columnDefinition = "text")
    String description;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    Boolean isActive = true;

    @Builder.Default
    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    List<ChatParticipant> participants = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    List<ChatMessage> messages = new ArrayList<>();

    public String getId() {
        return roomId;
    }
}

