package com.mutrapro.chat_service.entity;

import com.mutrapro.chat_service.enums.ParticipantRole;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(
    name = "chat_participants",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"room_id", "user_id"},
        name = "uk_room_user"
    ),
    indexes = {
        @Index(name = "idx_participant_room", columnList = "room_id"),
        @Index(name = "idx_participant_user", columnList = "user_id")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatParticipant extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "participant_id", nullable = false)
    String participantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    ChatRoom chatRoom;

    @Column(name = "user_id", nullable = false, length = 100)
    String userId;  // Soft reference to identity-service

    @Column(name = "user_name", length = 200)
    String userName;  // Cached user name

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    ParticipantRole role;

    @Column(name = "joined_at", nullable = false)
    java.time.Instant joinedAt;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    Boolean isActive = true;

    @Column(name = "left_at")
    java.time.Instant leftAt;

    @Column(name = "last_seen_at")
    java.time.Instant lastSeenAt;

    public String getId() {
        return participantId;
    }

    public void leave() {
        this.isActive = false;
        this.leftAt = java.time.Instant.now();
    }

    public void markAsSeen() {
        this.lastSeenAt = java.time.Instant.now();
    }
}

