package com.mutrapro.chat_service.repository;

import com.mutrapro.chat_service.entity.ChatParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, String> {
    
    Optional<ChatParticipant> findByChatRoom_RoomIdAndUserId(String roomId, String userId);
    
    Optional<ChatParticipant> findByChatRoom_RoomIdAndUserIdAndIsActiveTrue(String roomId, String userId);
    
    List<ChatParticipant> findAllByChatRoom_RoomIdAndIsActiveTrue(String roomId);
    
    boolean existsByChatRoom_RoomIdAndUserIdAndIsActiveTrue(String roomId, String userId);
    
    @Query("SELECT COUNT(p) FROM ChatParticipant p " +
           "WHERE p.chatRoom.roomId = :roomId AND p.isActive = true")
    Integer countActiveParticipants(@Param("roomId") String roomId);
    
    @Query("SELECT p FROM ChatParticipant p " +
           "WHERE p.userId = :userId AND p.isActive = true " +
           "ORDER BY p.chatRoom.createdAt DESC")
    List<ChatParticipant> findActiveParticipationsByUserId(@Param("userId") String userId);
}

