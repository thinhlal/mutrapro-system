package com.mutrapro.specialist_service.consumer;

import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.ReviewCreatedEvent;
import com.mutrapro.specialist_service.service.SpecialistRatingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Kafka Consumer để nhận review created events từ project-service
 * và update specialist rating trong specialist-service
 * Extends BaseIdempotentConsumer để tránh duplicate processing
 */
@Component
@Slf4j
public class ReviewCreatedEventConsumer extends BaseIdempotentConsumer<ReviewCreatedEvent> {

    private final SpecialistRatingService specialistRatingService;
    private final com.mutrapro.specialist_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "specialist-service";

    public ReviewCreatedEventConsumer(
            SpecialistRatingService specialistRatingService,
            com.mutrapro.specialist_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.specialistRatingService = specialistRatingService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.review.created:review-created-events}",
        groupId = "${spring.kafka.consumer.group-id:specialist-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.ReviewCreatedEvent"
        }
    )
    @Transactional
    public void handleReviewCreatedEvent(
            @Payload ReviewCreatedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received review created event from topic: {}, eventId: {}, reviewId: {}, specialistId: {}, rating: {}", 
                topic, event.getEventId(), event.getReviewId(), event.getSpecialistId(), event.getRating());
        
        // Gọi base class method để xử lý với idempotency check
        handleEvent(event, acknowledgment);
    }

    @Override
    protected String getConsumerName() {
        return CONSUMER_NAME;
    }

    @Override
    protected BaseIdempotentConsumer.ConsumedEventRepository getConsumedEventRepository() {
        return consumedEventRepository::insert;
    }

    @Override
    protected UUID getEventId(ReviewCreatedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(ReviewCreatedEvent event, Acknowledgment acknowledgment) {
        try {
            log.info("🔄 Processing review created event: eventId={}, reviewId={}, specialistId={}, rating={}", 
                    event.getEventId(), event.getReviewId(), event.getSpecialistId(), event.getRating());
            
            // Update specialist rating
            specialistRatingService.updateSpecialistRatingFromReview(event.getSpecialistId());
            
            log.info("✅ Review created event processed successfully: specialistId={}, rating={}", 
                    event.getSpecialistId(), event.getRating());
        } catch (Exception e) {
            log.error("❌ Failed to process review created event: eventId={}, specialistId={}, error={}", 
                    event.getEventId(), event.getSpecialistId(), e.getMessage(), e);
            throw e; // Re-throw để trigger retry
        }
    }
}

