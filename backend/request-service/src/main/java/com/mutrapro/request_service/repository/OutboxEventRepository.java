package com.mutrapro.request_service.repository;

import com.mutrapro.request_service.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {
    
    /**
     * Query pending events để publish
     * published_at IS NULL = chưa publish
     * next_retry_at IS NULL OR <= now = sẵn sàng retry
     */
    @Query("SELECT e FROM OutboxEvent e WHERE e.publishedAt IS NULL " +
           "AND (e.nextRetryAt IS NULL OR e.nextRetryAt <= :now) " +
           "ORDER BY e.occurredAt ASC")
    List<OutboxEvent> findPendingEvents(@Param("now") Instant now);
}

