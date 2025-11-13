package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.EmailService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.ContractSignedEmailEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@Slf4j
public class ContractSignedEmailConsumer extends BaseIdempotentConsumer<ContractSignedEmailEvent> {

    private final EmailService emailService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public ContractSignedEmailConsumer(EmailService emailService,
                                       com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.emailService = emailService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
            topics = "${app.event-topics.mappings.contract.signed-email:contract-signed-email}",
            groupId = "${spring.kafka.consumer.group-id:notification-service}",
            properties = {
                    "spring.json.value.default.type=com.mutrapro.shared.event.ContractSignedEmailEvent"
            }
    )
    @Transactional
    public void handleContractSignedEmailEvent(
            @Payload ContractSignedEmailEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received ContractSignedEmailEvent: topic={}, eventId={}, contractId={}, email={}",
                topic, event.getEventId(), event.getContractId(), event.getCustomerEmail());

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
    protected UUID getEventId(ContractSignedEmailEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(ContractSignedEmailEvent event, Acknowledgment acknowledgment) {
        emailService.sendContractSignedEmail(
                event.getCustomerEmail(),
                event.getCustomerName(),
                event.getContractNumber(),
                event.getSignedAt()
        );

        log.info("Contract signed email sent: eventId={}, contractId={}, email={}",
                event.getEventId(), event.getContractId(), event.getCustomerEmail());
    }
}

