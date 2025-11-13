package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.EmailService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.ContractOtpEmailEvent;
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
public class ContractOtpEmailConsumer extends BaseIdempotentConsumer<ContractOtpEmailEvent> {

    private final EmailService emailService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public ContractOtpEmailConsumer(EmailService emailService,
                                    com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.emailService = emailService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
            topics = "${app.event-topics.mappings.contract.otp-email:contract-otp-email}",
            groupId = "${spring.kafka.consumer.group-id:notification-service}",
            properties = {
                    "spring.json.value.default.type=com.mutrapro.shared.event.ContractOtpEmailEvent"
            }
    )
    @Transactional
    public void handleContractOtpEmailEvent(
            @Payload ContractOtpEmailEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received ContractOtpEmailEvent: topic={}, eventId={}, contractId={}, email={}",
                topic, event.getEventId(), event.getContractId(), event.getEmail());

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
    protected UUID getEventId(ContractOtpEmailEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(ContractOtpEmailEvent event, Acknowledgment acknowledgment) {
        emailService.sendContractOtpEmail(
                event.getEmail(),
                event.getCustomerName(),
                event.getContractNumber(),
                event.getOtpCode(),
                event.getExpiresInMinutes(),
                event.getMaxAttempts()
        );

        log.info("Contract OTP email sent: eventId={}, contractId={}, email={}",
                event.getEventId(), event.getContractId(), event.getEmail());
    }
}

