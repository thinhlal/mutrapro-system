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
    
    @Query("SELECT DISTINCT r FROM ChatRoom r " +
           "LEFT JOIN FETCH r.participants " +
           "WHERE r.roomType = :roomType AND r.contextId = :contextId")
    Optional<ChatRoom> findByRoomTypeAndContextId(
        @Param("roomType") RoomType roomType,
        @Param("contextId") String contextId
    );
    
    boolean existsByRoomTypeAndContextId(RoomType roomType, String contextId);
    
    @Query("SELECT DISTINCT r FROM ChatRoom r " +
           "LEFT JOIN FETCH r.participants p " +
           "WHERE p.userId = :userId AND p.isActive = true " +
           "ORDER BY r.createdAt DESC")
    List<ChatRoom> findAllByParticipantUserId(@Param("userId") String userId);
    
    @Query("SELECT DISTINCT r FROM ChatRoom r " +
           "LEFT JOIN FETCH r.participants p " +
           "WHERE p.userId = :userId AND p.isActive = true " +
           "AND (:roomType IS NULL OR r.roomType = :roomType) " +
           "ORDER BY r.createdAt DESC")
    List<ChatRoom> findAllByParticipantUserIdAndRoomType(
        @Param("userId") String userId,
        @Param("roomType") RoomType roomType
    );
    
    @Query("SELECT DISTINCT r FROM ChatRoom r " +
           "LEFT JOIN FETCH r.participants p " +
           "WHERE r.roomId = :roomId AND p.userId = :userId AND p.isActive = true")
    Optional<ChatRoom> findByRoomIdAndParticipantUserId(
        @Param("roomId") String roomId, 
        @Param("userId") String userId
    );
    
    /**
     * Query tất cả chat rooms (không filter theo participant) - dùng cho SYSTEM_ADMIN
     */
    @Query("SELECT DISTINCT r FROM ChatRoom r " +
           "LEFT JOIN FETCH r.participants " +
           "WHERE (:roomType IS NULL OR r.roomType = :roomType) " +
           "ORDER BY r.createdAt DESC")
    List<ChatRoom> findAllByRoomType(
        @Param("roomType") RoomType roomType
    );
    
    /**
     * Find ChatRoom by ID with participants eagerly loaded
     */
    @Query("SELECT DISTINCT r FROM ChatRoom r " +
           "LEFT JOIN FETCH r.participants " +
           "WHERE r.roomId = :roomId")
    Optional<ChatRoom> findByIdWithParticipants(@Param("roomId") String roomId);
}

