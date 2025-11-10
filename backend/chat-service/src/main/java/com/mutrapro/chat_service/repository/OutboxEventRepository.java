package com.mutrapro.chat_service.repository;

import com.mutrapro.chat_service.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {
    
    @Query("SELECT e FROM OutboxEvent e " +
           "WHERE e.publishedAt IS NULL " +
           "AND (e.nextRetryAt IS NULL OR e.nextRetryAt <= :now) " +
           "ORDER BY e.occurredAt ASC")
    List<OutboxEvent> findPendingEvents(@Param("now") Instant now);
    
    @Query("SELECT e FROM OutboxEvent e " +
           "WHERE e.publishedAt IS NULL " +
           "AND (e.nextRetryAt IS NULL OR e.nextRetryAt <= :now) " +
           "ORDER BY e.occurredAt ASC")
    List<OutboxEvent> findPendingEventsWithLimit(@Param("now") Instant now, @Param("limit") int limit);
}

