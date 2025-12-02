package com.mutrapro.project_service.consumer;

import com.mutrapro.project_service.dto.response.RevisionRequestResponse;
import com.mutrapro.project_service.service.RevisionRequestService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.RevisionFeePaidEvent;
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
 * Kafka Consumer để nhận revision fee paid events và tạo RevisionRequest
 * Được gọi khi customer thanh toán revision fee thành công
 * Extends BaseIdempotentConsumer để tránh duplicate idempotency logic
 */
@Component
@Slf4j
public class RevisionFeePaidEventConsumer extends BaseIdempotentConsumer<RevisionFeePaidEvent> {

    private final RevisionRequestService revisionRequestService;
    private final com.mutrapro.project_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "project-service";

    public RevisionFeePaidEventConsumer(RevisionRequestService revisionRequestService,
                                    com.mutrapro.project_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.revisionRequestService = revisionRequestService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.billing.revision.fee.paid:billing-revision-fee-paid}",
        groupId = "${spring.kafka.consumer.group-id:project-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.RevisionFeePaidEvent"
        }
    )
    @Transactional
    public void handleRevisionFeePaidEvent(
            @Payload RevisionFeePaidEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received revision fee paid event from topic: {}, eventId: {}, walletTxId: {}, contractId: {}, submissionId: {}", 
                topic, event.getEventId(), event.getWalletTxId(), event.getContractId(), event.getSubmissionId());
        
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
    protected UUID getEventId(RevisionFeePaidEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(RevisionFeePaidEvent event, Acknowledgment acknowledgment) {
        try {
            log.info("🔄 Processing revision fee paid event: eventId={}, walletTxId={}, contractId={}, submissionId={}, customerUserId={}", 
                    event.getEventId(), event.getWalletTxId(), event.getContractId(), event.getSubmissionId(), event.getCustomerUserId());
            // Update revision request khi customer reject và tạo revision request mới (gọi từ event consumer)
            // updateRevisionRequestOnCustomerReject sẽ tự xử lý cả 2 trường hợp:
            // - Có revision cũ → mark COMPLETED và tạo mới với paidWalletTxId
            // - Không có revision cũ → tạo mới trực tiếp với paidWalletTxId
            RevisionRequestResponse newRevisionRequest = revisionRequestService.updateRevisionRequestOnCustomerReject(
                event.getTaskAssignmentId(),
                event.getCustomerUserId(),
                event.getTitle() != null ? event.getTitle() : "Revision Request",
                event.getDescription() != null ? event.getDescription() : "Customer requested revision",
                event.getSubmissionId(),
                event.getContractId(),
                event.getMilestoneId(),
                event.getWalletTxId()  // paidWalletTxId
            );
            
            log.info("✅ Revision request created/updated via updateRevisionRequestOnCustomerReject: assignmentId={}, walletTxId={}, newRevisionRequestId={}", 
                    event.getTaskAssignmentId(), event.getWalletTxId(), newRevisionRequest.getRevisionRequestId());
            
            log.info("✅ Revision fee paid event processed successfully: walletTxId={}, contractId={}, submissionId={}", 
                    event.getWalletTxId(), event.getContractId(), event.getSubmissionId());
        } catch (Exception e) {
            log.error("❌ Failed to process revision fee paid event: eventId={}, walletTxId={}, contractId={}, submissionId={}, error={}", 
                    event.getEventId(), event.getWalletTxId(), event.getContractId(), event.getSubmissionId(), e.getMessage(), e);
            throw e; // Re-throw để trigger retry
        }
    }
}

