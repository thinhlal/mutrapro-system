package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.TaskAssignmentAssignedEvent;
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
 * Consumer để tạo notification khi specialist được gán task mới.
 */
@Component
@Slf4j
public class TaskAssignmentAssignedConsumer extends BaseIdempotentConsumer<TaskAssignmentAssignedEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public TaskAssignmentAssignedConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.task.assignment.assigned:task-assignment-assigned}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.TaskAssignmentAssignedEvent"
        }
    )
    @Transactional
    public void handleTaskAssignmentAssignedEvent(
            @Payload TaskAssignmentAssignedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received TaskAssignmentAssignedEvent from topic: {}, eventId={}, assignmentId={}",
                topic, event.getEventId(), event.getAssignmentId());

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
    protected UUID getEventId(TaskAssignmentAssignedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(TaskAssignmentAssignedEvent event, Acknowledgment acknowledgment) {
        notificationService.createTaskAssignmentAssignedNotification(event);
    }
}


