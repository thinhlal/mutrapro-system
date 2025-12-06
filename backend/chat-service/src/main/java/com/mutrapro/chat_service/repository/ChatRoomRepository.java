package com.mutrapro.chat_service.repository;

import com.mutrapro.chat_service.entity.ChatRoom;
import com.mutrapro.chat_service.enums.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, String> {
    
    Optional<ChatRoom> findByRoomTypeAndContextId(RoomType roomType, String contextId);
    
    boolean existsByRoomTypeAndContextId(RoomType roomType, String contextId);
    
    @Query("SELECT r FROM ChatRoom r " +
           "JOIN r.participants p " +
           "WHERE p.userId = :userId AND p.isActive = true " +
           "ORDER BY r.createdAt DESC")
    List<ChatRoom> findAllByParticipantUserId(@Param("userId") String userId);
    
    @Query("SELECT r FROM ChatRoom r " +
           "JOIN r.participants p " +
           "WHERE p.userId = :userId AND p.isActive = true " +
           "AND (:roomType IS NULL OR r.roomType = :roomType) " +
           "ORDER BY r.createdAt DESC")
    List<ChatRoom> findAllByParticipantUserIdAndRoomType(
        @Param("userId") String userId,
        @Param("roomType") RoomType roomType
    );
    
    @Query("SELECT r FROM ChatRoom r " +
           "JOIN r.participants p " +
           "WHERE r.roomId = :roomId AND p.userId = :userId AND p.isActive = true")
    Optional<ChatRoom> findByRoomIdAndParticipantUserId(
        @Param("roomId") String roomId, 
        @Param("userId") String userId
    );
}

