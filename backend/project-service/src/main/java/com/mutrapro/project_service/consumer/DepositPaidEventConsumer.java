package com.mutrapro.project_service.consumer;

import com.mutrapro.project_service.service.ContractService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.DepositPaidEvent;
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
 * Kafka Consumer để nhận deposit paid events và update contract start date
 * Extends BaseIdempotentConsumer để tránh duplicate idempotency logic
 */
@Component
@Slf4j
public class DepositPaidEventConsumer extends BaseIdempotentConsumer<DepositPaidEvent> {

    private final ContractService contractService;
    private final com.mutrapro.project_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "project-service";

    public DepositPaidEventConsumer(ContractService contractService,
                                    com.mutrapro.project_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.contractService = contractService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.billing.deposit-paid:billing-deposit-paid}",
        groupId = "${spring.kafka.consumer.group-id:project-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.DepositPaidEvent"
        }
    )
    @Transactional
    public void handleDepositPaidEvent(
            @Payload DepositPaidEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received deposit paid event from topic: {}, eventId: {}, contractId: {}", 
                topic, event.getEventId(), event.getContractId());
        
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
    protected UUID getEventId(DepositPaidEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(DepositPaidEvent event, Acknowledgment acknowledgment) {
        try {
            // Update contract start date
            contractService.updateContractStartDateAfterDepositPaid(
                event.getContractId(), 
                event.getDepositPaidAt()
            );
            
            log.info("Contract start date updated successfully from deposit paid event: contractId={}, installmentId={}, depositPaidAt={}", 
                    event.getContractId(), event.getInstallmentId(), event.getDepositPaidAt());
        } catch (Exception e) {
            log.error("Failed to process deposit paid event: eventId={}, contractId={}, error={}", 
                    event.getEventId(), event.getContractId(), e.getMessage(), e);
            throw e; // Re-throw để trigger retry
        }
    }
}

