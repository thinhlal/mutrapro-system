package com.mutrapro.project_service.consumer;

import com.mutrapro.project_service.service.ContractService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.MilestonePaidEvent;
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
 * Kafka Consumer để nhận milestone paid events và update contract status
 * Được gọi khi bất kỳ milestone nào có payment status = PAID
 * Extends BaseIdempotentConsumer để tránh duplicate idempotency logic
 */
@Component
@Slf4j
public class MilestonePaidEventConsumer extends BaseIdempotentConsumer<MilestonePaidEvent> {

    private final ContractService contractService;
    private final com.mutrapro.project_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "project-service";

    public MilestonePaidEventConsumer(ContractService contractService,
                                    com.mutrapro.project_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.contractService = contractService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.billing.milestone-paid:billing-milestone-paid}",
        groupId = "${spring.kafka.consumer.group-id:project-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.MilestonePaidEvent"
        }
    )
    @Transactional
    public void handleMilestonePaidEvent(
            @Payload MilestonePaidEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received milestone paid event from topic: {}, eventId: {}, contractId: {}, milestoneId: {}", 
                topic, event.getEventId(), event.getContractId(), event.getMilestoneId());
        
        // Gọi base class method để xử lý với idempotency check
        handleEvent(event, acknowledgment);
    }

    @Override
    protected String getConsumerName() {
        return CONSUMER_NAME;
    }

    @Override
    protected ConsumedEventRepository getConsumedEventRepository() {
        return consumedEventRepository::insert;
    }

    @Override
    protected UUID getEventId(MilestonePaidEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(MilestonePaidEvent event, Acknowledgment acknowledgment) {
        try {
            log.info("🔄 Processing milestone paid event: eventId={}, contractId={}, milestoneId={}, orderIndex={}, paidAt={}", 
                    event.getEventId(), event.getContractId(), event.getMilestoneId(), event.getOrderIndex(), event.getPaidAt());
            
            // Xử lý khi milestone được thanh toán
            contractService.handleMilestonePaid(
                event.getContractId(), 
                event.getMilestoneId(),
                event.getOrderIndex(),
                event.getPaidAt()
            );
            
            log.info("✅ Milestone paid event processed successfully: contractId={}, milestoneId={}", 
                    event.getContractId(), event.getMilestoneId());
        } catch (Exception e) {
            log.error("❌ Failed to process milestone paid event: eventId={}, contractId={}, milestoneId={}, error={}", 
                    event.getEventId(), event.getContractId(), event.getMilestoneId(), e.getMessage(), e);
            throw e; // Re-throw để trigger retry
        }
    }
}

