package com.mutrapro.chat_service.repository;

import com.mutrapro.chat_service.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    
    @Query("SELECT m FROM ChatMessage m " +
           "WHERE m.chatRoom.roomId = :roomId " +
           "ORDER BY m.sentAt DESC")
    Page<ChatMessage> findByRoomIdOrderBySentAtDesc(@Param("roomId") String roomId, Pageable pageable);
    
    @Query("SELECT m FROM ChatMessage m " +
           "WHERE m.chatRoom.roomId = :roomId " +
           "AND m.sentAt > :since " +
           "ORDER BY m.sentAt ASC")
    List<ChatMessage> findRecentMessages(
        @Param("roomId") String roomId, 
        @Param("since") Instant since
    );
    
    @Query("SELECT m FROM ChatMessage m " +
           "WHERE m.chatRoom.roomId = :roomId " +
           "ORDER BY m.sentAt DESC")
    List<ChatMessage> findLatestMessage(@Param("roomId") String roomId, Pageable pageable);
}

