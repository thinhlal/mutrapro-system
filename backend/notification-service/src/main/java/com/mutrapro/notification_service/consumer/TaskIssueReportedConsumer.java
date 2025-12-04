package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.TaskIssueReportedEvent;
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
 * Consumer để tạo notification cho manager khi specialist báo issue / không kịp deadline.
 */
@Component
@Slf4j
public class TaskIssueReportedConsumer extends BaseIdempotentConsumer<TaskIssueReportedEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public TaskIssueReportedConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.task.issue.reported:task-issue-reported}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.TaskIssueReportedEvent"
        }
    )
    @Transactional
    public void handleTaskIssueReportedEvent(
            @Payload TaskIssueReportedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received TaskIssueReportedEvent from topic: {}, eventId={}, assignmentId={}, managerUserId={}",
                topic, event.getEventId(), event.getAssignmentId(), event.getManagerUserId());

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
    protected UUID getEventId(TaskIssueReportedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(TaskIssueReportedEvent event, Acknowledgment acknowledgment) {
        notificationService.createTaskIssueReportedNotification(event);
    }
}

