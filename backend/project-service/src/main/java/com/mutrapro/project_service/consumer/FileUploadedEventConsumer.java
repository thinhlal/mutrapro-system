package com.mutrapro.project_service.consumer;

import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.FileUploadedEvent;
import com.mutrapro.project_service.service.FileService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Kafka Consumer để nhận file uploaded events và tạo file record
 * Extends BaseIdempotentConsumer để tránh duplicate idempotency logic
 */
@Component
@Slf4j
public class FileUploadedEventConsumer extends BaseIdempotentConsumer<FileUploadedEvent> {

    private final FileService fileService;
    private final com.mutrapro.project_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "project-service";

    public FileUploadedEventConsumer(FileService fileService, 
                                    com.mutrapro.project_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.fileService = fileService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.file.uploaded:file-uploaded}",
        groupId = "${spring.kafka.consumer.group-id:project-service-file-consumer}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.FileUploadedEvent"
        }
    )
    @Transactional
    public void handleFileUploadedEvent(
            @Payload FileUploadedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received file uploaded event from topic: {}, eventId: {}, fileName: {}", 
                topic, event.getEventId(), event.getFileName());
        
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
    protected UUID getEventId(FileUploadedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(FileUploadedEvent event, Acknowledgment acknowledgment) {
        // Xử lý business logic
        fileService.createFileFromEvent(event);
        log.info("File created successfully from event: eventId={}, fileName={}, requestId={}", 
                event.getEventId(), event.getFileName(), event.getRequestId());
    }
}
