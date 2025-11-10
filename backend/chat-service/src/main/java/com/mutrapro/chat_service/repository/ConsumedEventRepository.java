package com.mutrapro.chat_service.repository;

import com.mutrapro.chat_service.entity.ConsumedEvent;
import com.mutrapro.chat_service.entity.ConsumedEventId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface ConsumedEventRepository extends JpaRepository<ConsumedEvent, ConsumedEventId> {
    
    /**
     * Insert event vào consumed_events với idempotency
     * ON CONFLICT DO NOTHING - nếu đã có thì không insert
     * 
     * @return số rows affected (0 nếu duplicate, 1 nếu success)
     */
    @Modifying
    @Query(value = "INSERT INTO consumed_events (event_id, consumer_name, processed_at) " +
                   "VALUES (:eventId, :consumerName, :processedAt) " +
                   "ON CONFLICT (event_id, consumer_name) DO NOTHING", 
           nativeQuery = true)
    int insert(
        @Param("eventId") UUID eventId,
        @Param("consumerName") String consumerName,
        @Param("processedAt") Instant processedAt
    );
}

