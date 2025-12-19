package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.TaskDeadlineReminderEvent;
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
 * Consumer tạo notification khi task sắp đến deadline.
 */
@Component
@Slf4j
public class TaskDeadlineReminderConsumer extends BaseIdempotentConsumer<TaskDeadlineReminderEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public TaskDeadlineReminderConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.task.deadline.reminder:task-deadline-reminder}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.TaskDeadlineReminderEvent"
        }
    )
    @Transactional
    public void handleTaskDeadlineReminderEvent(
            @Payload TaskDeadlineReminderEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received TaskDeadlineReminderEvent from topic: {}, eventId={}, assignmentId={}, userId={}, reminderDays={}",
                topic, event.getEventId(), event.getAssignmentId(), event.getSpecialistUserId(), event.getReminderDays());

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
    protected UUID getEventId(TaskDeadlineReminderEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(TaskDeadlineReminderEvent event, Acknowledgment acknowledgment) {
        notificationService.createTaskDeadlineReminderNotification(event);
    }
}


