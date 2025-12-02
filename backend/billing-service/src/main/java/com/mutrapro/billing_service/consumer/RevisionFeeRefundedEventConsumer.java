package com.mutrapro.billing_service.consumer;

import com.mutrapro.billing_service.service.WalletService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.RevisionFeeRefundedEvent;
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
 * Kafka Consumer để nhận revision fee refund events và thực hiện refund vào wallet
 * Được gọi khi manager reject paid revision request
 */
@Component
@Slf4j
public class RevisionFeeRefundedEventConsumer extends BaseIdempotentConsumer<RevisionFeeRefundedEvent> {

    private final WalletService walletService;
    private final com.mutrapro.billing_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "billing-service";

    public RevisionFeeRefundedEventConsumer(WalletService walletService,
                          com.mutrapro.billing_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.walletService = walletService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.billing.revision.fee.refunded:billing-revision-fee-refunded}",
        groupId = "${spring.kafka.consumer.group-id:billing-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.RevisionFeeRefundedEvent"
        }
    )
    @Transactional
    public void handleRevisionFeeRefundedEvent(
            @Payload RevisionFeeRefundedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received revision fee refunded event from topic: {}, eventId: {}, paidWalletTxId: {}, revisionRequestId: {}", 
                topic, event.getEventId(), event.getPaidWalletTxId(), event.getRevisionRequestId());
        
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
    protected UUID getEventId(RevisionFeeRefundedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(RevisionFeeRefundedEvent event, Acknowledgment acknowledgment) {
        try {
            log.info("🔄 Processing revision fee refunded event: eventId={}, paidWalletTxId={}, revisionRequestId={}, customerUserId={}", 
                    event.getEventId(), event.getPaidWalletTxId(), event.getRevisionRequestId(), event.getCustomerUserId());
            
            // Thực hiện refund vào wallet và publish event với đầy đủ thông tin
            walletService.refundRevisionFeeAndPublishEvent(
                event.getPaidWalletTxId(),
                event.getRefundReason() != null ? event.getRefundReason() : "Manager rejected revision request",
                event  // Pass original event để lấy thông tin contract, milestone, etc.
            );
            
            log.info("✅ Revision fee refunded event processed successfully: paidWalletTxId={}, revisionRequestId={}", 
                    event.getPaidWalletTxId(), event.getRevisionRequestId());
        } catch (Exception e) {
            log.error("❌ Failed to process revision fee refunded event: eventId={}, paidWalletTxId={}, revisionRequestId={}, error={}", 
                    event.getEventId(), event.getPaidWalletTxId(), event.getRevisionRequestId(), e.getMessage(), e);
            throw e; // Re-throw để trigger retry
        }
    }
}

