package com.mutrapro.chat_service.repository;

import com.mutrapro.chat_service.entity.ChatMessage;
import com.mutrapro.chat_service.enums.MessageContextType;
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
    
    /**
     * Count messages excluding specific sender IDs
     */
    long countByChatRoom_RoomIdAndSenderIdNotAndSenderIdNot(
            String roomId, 
            String excludeSenderId1, 
            String excludeSenderId2
    );
    
    /**
     * Count messages after a timestamp, excluding specific sender IDs
     */
    long countByChatRoom_RoomIdAndSentAtAfterAndSenderIdNotAndSenderIdNot(
            String roomId,
            Instant after,
            String excludeSenderId1,
            String excludeSenderId2
    );

    /**
     * Find messages by room, context type and context id
     * Useful for filtering messages related to a specific milestone, submission, etc.
     */
    @Query("SELECT m FROM ChatMessage m " +
           "WHERE m.chatRoom.roomId = :roomId " +
           "AND m.contextType = :contextType " +
           "AND m.contextId = :contextId " +
           "ORDER BY m.sentAt DESC")
    Page<ChatMessage> findByChatRoomAndContextTypeAndContextId(
            @Param("roomId") String roomId,
            @Param("contextType") MessageContextType contextType,
            @Param("contextId") String contextId,
            Pageable pageable
    );

    /**
     * Find messages by room and context type (without specific context id)
     */
    @Query("SELECT m FROM ChatMessage m " +
           "WHERE m.chatRoom.roomId = :roomId " +
           "AND m.contextType = :contextType " +
           "ORDER BY m.sentAt DESC")
    Page<ChatMessage> findByChatRoomAndContextType(
            @Param("roomId") String roomId,
            @Param("contextType") MessageContextType contextType,
            Pageable pageable
    );
}

