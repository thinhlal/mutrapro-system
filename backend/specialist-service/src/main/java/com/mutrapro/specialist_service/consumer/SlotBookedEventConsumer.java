package com.mutrapro.specialist_service.consumer;

import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.SlotBookedEvent;
import com.mutrapro.specialist_service.service.SpecialistSlotService;
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
 * Kafka Consumer để nhận slot booked events từ project-service
 * và mark slots as BOOKED trong specialist-service
 * Extends BaseIdempotentConsumer để tránh duplicate processing
 */
@Component
@Slf4j
public class SlotBookedEventConsumer extends BaseIdempotentConsumer<SlotBookedEvent> {

    private final SpecialistSlotService specialistSlotService;
    private final com.mutrapro.specialist_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "specialist-service";

    public SlotBookedEventConsumer(SpecialistSlotService specialistSlotService,
      com.mutrapro.specialist_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.specialistSlotService = specialistSlotService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.slot.booked:slot-booked-events}",
        groupId = "${spring.kafka.consumer.group-id:specialist-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.SlotBookedEvent"
        }
    )
    @Transactional
    public void handleSlotBookedEvent(
            @Payload SlotBookedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received slot booked event from topic: {}, eventId: {}, specialistId: {}, bookingId: {}", 
                topic, event.getEventId(), event.getSpecialistId(), event.getBookingId());
        
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
    protected UUID getEventId(SlotBookedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(SlotBookedEvent event, Acknowledgment acknowledgment) {
        try {
            log.info("🔄 Processing slot booked event: eventId={}, specialistId={}, bookingId={}, date={}, time={}-{}", 
                    event.getEventId(), event.getSpecialistId(), event.getBookingId(), 
                    event.getBookingDate(), event.getStartTime(), event.getEndTime());
            
            // Mark slots as BOOKED
            specialistSlotService.markSlotsAsBooked(
                event.getSpecialistId(), 
                event.getBookingDate(), 
                event.getStartTime(), 
                event.getEndTime()
            );
            
            log.info("✅ Slot booked event processed successfully: specialistId={}, bookingId={}", 
                    event.getSpecialistId(), event.getBookingId());
        } catch (Exception e) {
            log.error("❌ Failed to process slot booked event: eventId={}, specialistId={}, bookingId={}, error={}", 
                    event.getEventId(), event.getSpecialistId(), event.getBookingId(), e.getMessage(), e);
            throw e; // Re-throw để trigger retry
        }
    }
}

