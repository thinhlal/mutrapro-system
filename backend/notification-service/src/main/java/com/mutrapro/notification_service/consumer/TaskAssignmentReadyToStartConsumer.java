package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.TaskAssignmentReadyToStartEvent;
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
 * Consumer để tạo notification cho specialist khi task assignment đã sẵn sàng để bắt đầu làm việc.
 */
@Component
@Slf4j
public class TaskAssignmentReadyToStartConsumer extends BaseIdempotentConsumer<TaskAssignmentReadyToStartEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public TaskAssignmentReadyToStartConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.task.assignment.ready.to.start:task-assignment-ready-to-start}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.TaskAssignmentReadyToStartEvent"
        }
    )
    @Transactional
    public void handleTaskAssignmentReadyToStartEvent(
            @Payload TaskAssignmentReadyToStartEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received TaskAssignmentReadyToStartEvent from topic: {}, eventId={}, assignmentId={}, specialistUserId={}",
                topic, event.getEventId(), event.getAssignmentId(), event.getSpecialistUserId());

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
    protected UUID getEventId(TaskAssignmentReadyToStartEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(TaskAssignmentReadyToStartEvent event, Acknowledgment acknowledgment) {
        notificationService.createTaskAssignmentReadyToStartNotification(event);
    }
}

