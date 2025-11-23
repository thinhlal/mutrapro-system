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
 * Kafka Consumer để nhận deposit paid events và update contract status
 * Được gọi khi DEPOSIT installment được thanh toán
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
        
        log.info("Received deposit paid event from topic: {}, eventId: {}, contractId: {}, installmentId: {}", 
                topic, event.getEventId(), event.getContractId(), event.getInstallmentId());
        
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
            log.info("🔄 Processing deposit paid event: eventId={}, contractId={}, installmentId={}, paidAt={}", 
                    event.getEventId(), event.getContractId(), event.getInstallmentId(), event.getPaidAt());
            
            // Xử lý khi DEPOSIT được thanh toán
            contractService.handleDepositPaid(
                event.getContractId(), 
                event.getInstallmentId(),
                event.getPaidAt()
            );
            
            log.info("✅ Deposit paid event processed successfully: contractId={}, installmentId={}", 
                    event.getContractId(), event.getInstallmentId());
        } catch (Exception e) {
            log.error("❌ Failed to process deposit paid event: eventId={}, contractId={}, installmentId={}, error={}", 
                    event.getEventId(), event.getContractId(), event.getInstallmentId(), e.getMessage(), e);
            throw e; // Re-throw để trigger retry
        }
    }
}

