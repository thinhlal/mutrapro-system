package com.mutrapro.notification_service.service;

import com.mutrapro.notification_service.entity.Notification;
import com.mutrapro.notification_service.mapper.NotificationMapper;
import com.mutrapro.shared.enums.NotificationType;
import com.mutrapro.notification_service.repository.NotificationRepository;
import com.mutrapro.notification_service.dto.response.NotificationResponse;
import com.mutrapro.notification_service.exception.NotificationNotFoundException;
import com.mutrapro.shared.event.ChatRoomCreatedEvent;
import com.mutrapro.shared.event.RevisionRequestedEvent;
import com.mutrapro.shared.event.RevisionDeliveredEvent;
import com.mutrapro.shared.event.RevisionSubmittedEvent;
import com.mutrapro.shared.event.RevisionApprovedEvent;
import com.mutrapro.shared.event.RevisionRejectedEvent;
import com.mutrapro.shared.event.RevisionFeeRefundedEvent;
import com.mutrapro.shared.event.MilestonePaidNotificationEvent;
import com.mutrapro.shared.event.MilestoneReadyForPaymentNotificationEvent;
import com.mutrapro.shared.event.PaymentOrderCompletedNotificationEvent;
import com.mutrapro.shared.event.SubmissionDeliveredEvent;
import com.mutrapro.shared.event.TaskAssignmentAssignedEvent;
import com.mutrapro.shared.event.TaskAssignmentReadyToStartEvent;
import com.mutrapro.shared.event.TaskAssignmentCanceledEvent;
import com.mutrapro.shared.event.TaskIssueReportedEvent;
import com.mutrapro.shared.event.ContractNotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service để quản lý notifications
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Tạo notification cho chat room mới (từ Kafka event)
     */
    @Transactional
    public void createChatRoomNotifications(ChatRoomCreatedEvent event) {
        if (event.getParticipantIds() == null || event.getParticipantIds().length == 0) {
            log.warn("No participants in event: eventId={}, roomId={}", 
                    event.getEventId(), event.getRoomId());
            return;
        }
        
        log.info("Creating notifications for chat room: roomId={}, participants={}", 
                event.getRoomId(), event.getParticipantIds().length);
        
        for (String participantId : event.getParticipantIds()) {
            try {
                // Tạo notification
                Notification notification = Notification.builder()
                        .userId(participantId)
                        .type(NotificationType.CHAT_ROOM_CREATED)
                        .title("Cuộc trò chuyện mới")
                        .content(String.format(
                            "Bạn đã được thêm vào cuộc trò chuyện '%s'", 
                            event.getRoomName()
                        ))
                        .referenceId(event.getRoomId())
                        .referenceType("CHAT_ROOM")
                        .actionUrl("/chat/" + event.getRoomId())
                        .isRead(false)
                        .build();
                
                Notification saved = notificationRepository.save(notification);
                
                // Gửi real-time qua WebSocket
                sendRealTimeNotification(participantId, saved);
                
                log.debug("Notification created and sent: notificationId={}, userId={}", 
                        saved.getNotificationId(), participantId);
            } catch (Exception e) {
                log.error("Failed to create notification for user: userId={}, error={}", 
                        participantId, e.getMessage(), e);
                // Continue với participants khác
            }
        }
    }

    /**
     * Tạo notification khi specialist được gán task mới (Kafka event).
     */
    @Transactional
    public void createTaskAssignmentAssignedNotification(TaskAssignmentAssignedEvent event) {
        if (event.getSpecialistUserId() == null || event.getSpecialistUserId().isBlank()) {
            log.warn("Cannot create assignment notification, userId missing: assignmentId={}", event.getAssignmentId());
            return;
        }

        String contractLabel = event.getContractNumber() != null && !event.getContractNumber().isBlank()
            ? event.getContractNumber()
            : event.getContractId();
        String milestoneLabel = event.getMilestoneName() != null && !event.getMilestoneName().isBlank()
            ? event.getMilestoneName()
            : event.getMilestoneId();

        String defaultContent = String.format(
            "Manager đã gán task %s cho contract #%s (Milestone: %s). Vui lòng kiểm tra mục My Tasks.",
            event.getTaskType(),
            contractLabel,
            milestoneLabel
        );

        String title = event.getTitle() != null ? event.getTitle() : "Bạn được giao task mới";
        String content = event.getContent() != null ? event.getContent() : defaultContent;
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : "/transcription/my-tasks";
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "TASK_ASSIGNMENT";

        Notification notification = Notification.builder()
            .userId(event.getSpecialistUserId())
            .type(NotificationType.TASK_ASSIGNMENT_ASSIGNED)
            .title(title)
            .content(content)
            .referenceId(event.getAssignmentId())
            .referenceType(referenceType)
            .actionUrl(actionUrl)
            .isRead(false)
            .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getSpecialistUserId(), saved);

        log.info("Task assignment notification created: assignmentId={}, userId={}",
            event.getAssignmentId(), event.getSpecialistUserId());
    }

    /**
     * Tạo notification khi task assignment đã sẵn sàng để specialist bắt đầu làm việc (Kafka event).
     */
    @Transactional
    public void createTaskAssignmentReadyToStartNotification(TaskAssignmentReadyToStartEvent event) {
        if (event.getSpecialistUserId() == null || event.getSpecialistUserId().isBlank()) {
            log.warn("Cannot create task ready to start notification, userId missing: assignmentId={}", event.getAssignmentId());
            return;
        }

        String contractLabel = event.getContractNumber() != null && !event.getContractNumber().isBlank()
            ? event.getContractNumber()
            : event.getContractId();
        String milestoneLabel = event.getMilestoneName() != null && !event.getMilestoneName().isBlank()
            ? event.getMilestoneName()
            : event.getMilestoneId();

        String defaultContent = String.format(
            "Task %s cho contract #%s (Milestone: %s) đã sẵn sàng để bạn bắt đầu làm việc. Vui lòng kiểm tra mục My Tasks.",
            event.getTaskType(),
            contractLabel,
            milestoneLabel
        );

        String title = event.getTitle() != null ? event.getTitle() : "Task đã sẵn sàng để bắt đầu";
        String content = event.getContent() != null ? event.getContent() : defaultContent;
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : "/transcription/my-tasks";
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "TASK_ASSIGNMENT";

        Notification notification = Notification.builder()
            .userId(event.getSpecialistUserId())
            .type(NotificationType.TASK_ASSIGNMENT_READY_TO_START)
            .title(title)
            .content(content)
            .referenceId(event.getAssignmentId())
            .referenceType(referenceType)
            .actionUrl(actionUrl)
            .isRead(false)
            .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getSpecialistUserId(), saved);

        log.info("Task ready to start notification created: assignmentId={}, userId={}",
            event.getAssignmentId(), event.getSpecialistUserId());
    }

    /**
     * Tạo notification khi task assignment bị hủy (Kafka event).
     */
    @Transactional
    public void createTaskAssignmentCanceledNotification(TaskAssignmentCanceledEvent event) {
        if (event.getUserId() == null || event.getUserId().isBlank()) {
            log.warn("Cannot create task assignment canceled notification, userId missing: assignmentId={}, contractId={}",
                    event.getAssignmentId(), event.getContractId());
            return;
        }

        String title = event.getTitle() != null ? event.getTitle() : "Task assignment đã bị hủy";
        String content = event.getContent() != null ? event.getContent() : 
                String.format("Task assignment cho contract #%s đã bị hủy. %s",
                        event.getContractNumber() != null ? event.getContractNumber() : event.getContractId(),
                        event.getReason() != null ? "Lý do: " + event.getReason() : "");
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : 
                (event.getCanceledBy() != null && event.getCanceledBy().equals("SPECIALIST") 
                    ? "/manager/milestone-assignments?contractId=" + event.getContractId()
                    : "/transcription/my-tasks");
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "TASK_ASSIGNMENT";

        Notification notification = Notification.builder()
                .userId(event.getUserId())
                .type(NotificationType.TASK_ASSIGNMENT_CANCELED)
                .title(title)
                .content(content)
                .referenceId(event.getAssignmentId())
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getUserId(), saved);

        log.info("Task assignment canceled notification created: assignmentId={}, userId={}, canceledBy={}",
                event.getAssignmentId(), event.getUserId(), event.getCanceledBy());
    }

    /**
     * Tạo notification cho manager khi specialist báo issue (Kafka event).
     */
    @Transactional
    public void createTaskIssueReportedNotification(TaskIssueReportedEvent event) {
        if (event.getManagerUserId() == null || event.getManagerUserId().isBlank()) {
            log.warn("Cannot create task issue reported notification, managerUserId missing: assignmentId={}, contractId={}",
                    event.getAssignmentId(), event.getContractId());
            return;
        }

        String title = event.getTitle() != null ? event.getTitle() : "Task có vấn đề / không kịp deadline";
        String content = event.getContent() != null ? event.getContent() : 
                String.format("Specialist đã báo issue cho task assignment của contract #%s. Task type: %s. Lý do: %s. Vui lòng kiểm tra và xử lý.",
                        event.getContractNumber() != null ? event.getContractNumber() : event.getContractId(),
                        event.getTaskType() != null ? event.getTaskType() : "",
                        event.getReason() != null ? event.getReason() : "");
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : 
                "/manager/milestone-assignments?contractId=" + event.getContractId();
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "TASK_ASSIGNMENT";

        Notification notification = Notification.builder()
                .userId(event.getManagerUserId())
                .type(NotificationType.TASK_ISSUE_REPORTED)
                .title(title)
                .content(content)
                .referenceId(event.getAssignmentId())
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getManagerUserId(), saved);

        log.info("Task issue reported notification created: assignmentId={}, managerUserId={}",
                event.getAssignmentId(), event.getManagerUserId());
    }

    /**
     * Tạo notification cho contract events (Kafka event).
     */
    @Transactional
    public void createContractNotification(ContractNotificationEvent event) {
        if (event.getUserId() == null || event.getUserId().isBlank()) {
            log.warn("Cannot create contract notification, userId missing: contractId={}, notificationType={}",
                    event.getContractId(), event.getNotificationType());
            return;
        }

        String title = event.getTitle() != null ? event.getTitle() : "Contract notification";
        String content = event.getContent() != null ? event.getContent() : "";
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : "/contracts/" + event.getContractId();
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "CONTRACT";

        // Map notificationType string to NotificationType enum
        NotificationType notificationType;
        try {
            notificationType = NotificationType.valueOf(event.getNotificationType());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown notification type: {}, defaulting to SYSTEM_ANNOUNCEMENT", event.getNotificationType());
            notificationType = NotificationType.SYSTEM_ANNOUNCEMENT;
        }

        Notification notification = Notification.builder()
                .userId(event.getUserId())
                .type(notificationType)
                .title(title)
                .content(content)
                .referenceId(event.getContractId())
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getUserId(), saved);

        log.info("Contract notification created: contractId={}, userId={}, notificationType={}",
                event.getContractId(), event.getUserId(), event.getNotificationType());
    }

    /**
     * Tạo notification cho customer khi submission được deliver (Kafka event).
     */
    @Transactional
    public void createSubmissionDeliveredNotification(SubmissionDeliveredEvent event) {
        if (event.getCustomerUserId() == null || event.getCustomerUserId().isBlank()) {
            log.warn("Cannot create submission delivered notification, customerUserId missing: submissionId={}, assignmentId={}", 
                    event.getSubmissionId(), event.getAssignmentId());
            return;
        }

        String contractLabel = event.getContractNumber() != null && !event.getContractNumber().isBlank()
            ? event.getContractNumber()
            : event.getContractId();

        String defaultContent = String.format(
            "Manager đã gửi submission \"%s\" cho milestone \"%s\" của contract #%s. Vui lòng xem xét và phản hồi.",
            event.getSubmissionName(),
            event.getMilestoneName(),
            contractLabel
        );

        String title = event.getTitle() != null ? event.getTitle() : "Submission đã được gửi cho bạn";
        String content = event.getContent() != null ? event.getContent() : defaultContent;
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : "/contracts/" + event.getContractId();
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "SUBMISSION";

        Notification notification = Notification.builder()
            .userId(event.getCustomerUserId())
            .type(NotificationType.SUBMISSION_DELIVERED)
            .title(title)
            .content(content)
            .referenceId(event.getSubmissionId())
            .referenceType(referenceType)
            .actionUrl(actionUrl)
            .isRead(false)
            .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getCustomerUserId(), saved);

        log.info("Submission delivered notification created: submissionId={}, assignmentId={}, milestoneId={}, customerUserId={}",
            event.getSubmissionId(), event.getAssignmentId(), event.getMilestoneId(), event.getCustomerUserId());
    }

    /**
     * Tạo notification cho manager khi customer yêu cầu revision (Kafka event).
     */
    @Transactional
    public void createRevisionRequestedNotification(RevisionRequestedEvent event) {
        if (event.getManagerUserId() == null || event.getManagerUserId().isBlank()) {
            log.warn("Cannot create revision requested notification, managerUserId missing: revisionRequestId={}, contractId={}", 
                    event.getRevisionRequestId(), event.getContractId());
            return;
        }

        String contractLabel = event.getContractNumber() != null && !event.getContractNumber().isBlank()
            ? event.getContractNumber()
            : event.getContractId();

        String defaultContent = String.format(
            "Customer đã yêu cầu chỉnh sửa cho milestone \"%s\" của contract #%s. %s",
            event.getMilestoneName(),
            contractLabel,
            event.getDescription() != null ? event.getDescription() : ""
        );

        String title = event.getTitle() != null ? event.getTitle() : "Customer yêu cầu chỉnh sửa";
        String content = event.getDescription() != null 
            ? String.format("Customer đã yêu cầu chỉnh sửa cho milestone \"%s\" của contract #%s. %s", 
                event.getMilestoneName(), contractLabel, event.getDescription())
            : defaultContent;
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : "/manager/revision-requests";
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "REVISION_REQUEST";

        Notification notification = Notification.builder()
            .userId(event.getManagerUserId())
            .type(NotificationType.CUSTOMER_REVISION_REQUESTED)
            .title(title)
            .content(content)
            .referenceId(event.getRevisionRequestId())
            .referenceType(referenceType)
            .actionUrl(actionUrl)
            .isRead(false)
            .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getManagerUserId(), saved);

        log.info("Revision requested notification created: revisionRequestId={}, contractId={}, milestoneId={}, managerUserId={}",
            event.getRevisionRequestId(), event.getContractId(), event.getMilestoneId(), event.getManagerUserId());
    }

    
    /**
     * Tạo notification mới (từ API call)
     */
    @Transactional
    public NotificationResponse createNotification(String userId, NotificationType type, 
                                                   String title, String content,
                                                   String referenceId, String referenceType, 
                                                   String actionUrl) {
        log.info("Creating notification: userId={}, type={}, title={}", userId, type, title);
        
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .content(content)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();
        
        Notification saved = notificationRepository.save(notification);
        
        // Gửi real-time qua WebSocket
        sendRealTimeNotification(userId, saved);
        
        log.info("Notification created: notificationId={}, userId={}", 
                saved.getNotificationId(), userId);
        
        return notificationMapper.toResponse(saved);
    }
    
    /**
     * Get notifications cho user (paginated)
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return notifications.map(notificationMapper::toResponse);
    }
    
    /**
     * Get latest N notifications for user
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getLatestNotifications(String userId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<Notification> notifications = notificationRepository.findTopNByUserId(userId, pageable);
        return notifications.stream()
                .map(notificationMapper::toResponse)
                .toList();
    }
    
    /**
     * Get unread count
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
    
    /**
     * Mark notification as read
     */
    @Transactional
    public void markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository
                .findByNotificationIdAndUserId(notificationId, userId)
                .orElseThrow(() -> NotificationNotFoundException.byIdAndUserId(notificationId, userId));
        
        if (!notification.getIsRead()) {
            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
            
            log.info("Notification marked as read: notificationId={}, userId={}", 
                    notificationId, userId);
        }
    }
    
    /**
     * Tạo notification cho customer khi revision được deliver (Kafka event).
     */
    @Transactional
    public void createRevisionDeliveredNotification(RevisionDeliveredEvent event) {
        if (event.getCustomerUserId() == null || event.getCustomerUserId().isBlank()) {
            log.warn("Cannot create revision delivered notification, customerUserId missing: revisionRequestId={}, contractId={}",
                    event.getRevisionRequestId(), event.getContractId());
            return;
        }

        String title = event.getTitle() != null ? event.getTitle() : "Revision đã được chỉnh sửa";
        String content = event.getContent() != null ? event.getContent() : 
                String.format("Manager đã gửi revision đã chỉnh sửa cho milestone \"%s\". Vui lòng xem xét và xác nhận.",
                        event.getMilestoneName() != null ? event.getMilestoneName() : "milestone");
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : 
                "/contracts/" + event.getContractId() + "/milestones/" + event.getMilestoneId() + "/deliveries";
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "REVISION_REQUEST";

        Notification notification = Notification.builder()
                .userId(event.getCustomerUserId())
                .type(NotificationType.SUBMISSION_DELIVERED)
                .title(title)
                .content(content)
                .referenceId(event.getRevisionRequestId())
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getCustomerUserId(), saved);

        log.info("Revision delivered notification created: revisionRequestId={}, customerUserId={}",
                event.getRevisionRequestId(), event.getCustomerUserId());
    }

    /**
     * Tạo notification cho manager khi specialist submit revision (Kafka event).
     */
    @Transactional
    public void createRevisionSubmittedNotification(RevisionSubmittedEvent event) {
        if (event.getManagerUserId() == null || event.getManagerUserId().isBlank()) {
            log.warn("Cannot create revision submitted notification, managerUserId missing: revisionRequestId={}, contractId={}",
                    event.getRevisionRequestId(), event.getContractId());
            return;
        }

        String title = event.getTitle() != null ? event.getTitle() : "Revision đã được chỉnh sửa - cần review";
        String content = event.getContent() != null ? event.getContent() : 
                String.format("Specialist đã hoàn thành chỉnh sửa cho milestone \"%s\". Vui lòng xem xét và duyệt trước khi gửi cho customer.",
                        event.getMilestoneName() != null ? event.getMilestoneName() : "milestone");
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : 
                "/manager/tasks/" + event.getContractId() + "/" + event.getTaskAssignmentId();
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "REVISION_REQUEST";

        Notification notification = Notification.builder()
                .userId(event.getManagerUserId())
                .type(NotificationType.SUBMISSION_DELIVERED)
                .title(title)
                .content(content)
                .referenceId(event.getRevisionRequestId())
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getManagerUserId(), saved);

        log.info("Revision submitted notification created: revisionRequestId={}, managerUserId={}",
                event.getRevisionRequestId(), event.getManagerUserId());
    }

    /**
     * Tạo notification cho specialist khi manager approve revision request (Kafka event).
     */
    @Transactional
    public void createRevisionApprovedNotification(RevisionApprovedEvent event) {
        if (event.getSpecialistUserId() == null || event.getSpecialistUserId().isBlank()) {
            log.warn("Cannot create revision approved notification, specialistUserId missing: revisionRequestId={}, contractId={}",
                    event.getRevisionRequestId(), event.getContractId());
            return;
        }

        String title = event.getTitle() != null ? event.getTitle() : "Yêu cầu chỉnh sửa";
        String content = event.getContent() != null ? event.getContent() : 
                String.format("Manager đã duyệt yêu cầu chỉnh sửa cho milestone \"%s\".",
                        event.getMilestoneName() != null ? event.getMilestoneName() : "milestone");
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : "/transcription/my-tasks";
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "REVISION_REQUEST";

        Notification notification = Notification.builder()
                .userId(event.getSpecialistUserId())
                .type(NotificationType.REVISION_REQUEST_APPROVED)
                .title(title)
                .content(content)
                .referenceId(event.getRevisionRequestId())
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getSpecialistUserId(), saved);

        log.info("Revision approved notification created: revisionRequestId={}, specialistUserId={}",
                event.getRevisionRequestId(), event.getSpecialistUserId());
    }

    /**
     * Tạo notification khi manager reject revision request hoặc submission (Kafka event).
     */
    @Transactional
    public void createRevisionRejectedNotification(RevisionRejectedEvent event) {
        if (event.getRecipientUserId() == null || event.getRecipientUserId().isBlank()) {
            log.warn("Cannot create revision rejected notification, recipientUserId missing: revisionRequestId={}, contractId={}",
                    event.getRevisionRequestId(), event.getContractId());
            return;
        }

        String title = event.getTitle() != null ? event.getTitle() : 
                ("CUSTOMER".equals(event.getRecipientType()) 
                        ? "Yêu cầu chỉnh sửa không được chấp nhận"
                        : "Revision cần chỉnh sửa lại");
        String content = event.getContent() != null ? event.getContent() : 
                String.format("Manager đã từ chối %s cho milestone \"%s\".",
                        "CUSTOMER".equals(event.getRecipientType()) ? "yêu cầu chỉnh sửa" : "revision",
                        event.getMilestoneName() != null ? event.getMilestoneName() : "milestone");
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : 
                ("CUSTOMER".equals(event.getRecipientType()) 
                        ? "/contracts/" + event.getContractId()
                        : "/transcription/my-tasks");
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "REVISION_REQUEST";
        NotificationType notificationType = "CUSTOMER".equals(event.getRecipientType())
                ? NotificationType.REVISION_REQUEST_REJECTED
                : NotificationType.REVISION_REQUEST_APPROVED; // Reuse type này cho specialist

        Notification notification = Notification.builder()
                .userId(event.getRecipientUserId())
                .type(notificationType)
                .title(title)
                .content(content)
                .referenceId(event.getRevisionRequestId())
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getRecipientUserId(), saved);

        log.info("Revision rejected notification created: revisionRequestId={}, recipientUserId={}, recipientType={}",
                event.getRevisionRequestId(), event.getRecipientUserId(), event.getRecipientType());
    }

    /**
     * Tạo notification khi revision fee được refund cho customer (Kafka event).
     * Chỉ xử lý event từ billing service sau khi refund thành công (có refundAmount và currency).
     */
    @Transactional
    public void createRevisionFeeRefundedNotification(RevisionFeeRefundedEvent event) {
        // Chỉ xử lý event từ billing service sau khi refund thành công (có đầy đủ thông tin)
        if (event.getRefundAmount() == null || event.getCurrency() == null || event.getCurrency().isBlank()) {
            log.debug("Skipping notification for RevisionFeeRefundedEvent without refundAmount/currency (from project-service): eventId={}, revisionRequestId={}",
                    event.getEventId(), event.getRevisionRequestId());
            return;
        }
        
        if (event.getCustomerUserId() == null || event.getCustomerUserId().isBlank()) {
            log.warn("Cannot create revision fee refunded notification, customerUserId missing: revisionRequestId={}, contractId={}",
                    event.getRevisionRequestId(), event.getContractId());
            return;
        }

        String contractLabel = event.getContractNumber() != null && !event.getContractNumber().isBlank()
                ? event.getContractNumber()
                : event.getContractId();

        String title = "Phí chỉnh sửa đã được hoàn lại";
        String content;
        if (event.getRefundAmount() != null && event.getCurrency() != null) {
            content = String.format(
                    "Phí chỉnh sửa cho milestone \"%s\" của contract #%s đã được hoàn lại vào wallet của bạn. Số tiền: %s %s. %s",
                    event.getMilestoneName() != null ? event.getMilestoneName() : "milestone",
                    contractLabel,
                    event.getRefundAmount().toPlainString(),
                    event.getCurrency(),
                    event.getRefundReason() != null ? "Lý do: " + event.getRefundReason() : ""
            );
        } else {
            content = String.format(
                    "Phí chỉnh sửa cho milestone \"%s\" của contract #%s đã được hoàn lại vào wallet của bạn. %s",
                    event.getMilestoneName() != null ? event.getMilestoneName() : "milestone",
                    contractLabel,
                    event.getRefundReason() != null ? "Lý do: " + event.getRefundReason() : ""
            );
        }
        // Link tới deliveries page của milestone
        String actionUrl = "/contracts/" + event.getContractId() + "/milestones/" + event.getMilestoneId() + "/deliveries";
        String referenceType = "REVISION_REQUEST";

        Notification notification = Notification.builder()
                .userId(event.getCustomerUserId())
                .type(NotificationType.REVISION_FEE_REFUNDED)
                .title(title)
                .content(content)
                .referenceId(event.getRevisionRequestId())
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getCustomerUserId(), saved);

        log.info("Revision fee refunded notification created: revisionRequestId={}, customerUserId={}, refundAmount={}, currency={}",
                event.getRevisionRequestId(), event.getCustomerUserId(), event.getRefundAmount(), event.getCurrency());
    }

    /**
     * Tạo notification cho manager khi milestone được thanh toán (Kafka event).
     */
    @Transactional
    public void createMilestonePaidNotification(MilestonePaidNotificationEvent event) {
        if (event.getManagerUserId() == null || event.getManagerUserId().isBlank()) {
            log.warn("Cannot create milestone paid notification, managerUserId missing: contractId={}, milestoneId={}",
                    event.getContractId(), event.getMilestoneId());
            return;
        }

        String title = event.getTitle() != null ? event.getTitle() : "Milestone đã được thanh toán";
        String content = event.getContent() != null ? event.getContent() : 
                String.format("Customer đã thanh toán milestone \"%s\" cho contract #%s. Số tiền: %s %s",
                        event.getMilestoneName() != null ? event.getMilestoneName() : "milestone",
                        event.getContractNumber() != null ? event.getContractNumber() : event.getContractId(),
                        event.getAmount() != null ? event.getAmount().toPlainString() : "0",
                        event.getCurrency() != null ? event.getCurrency() : "VND");
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : "/manager/contracts/" + event.getContractId();
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "CONTRACT";

        Notification notification = Notification.builder()
                .userId(event.getManagerUserId())
                .type(NotificationType.MILESTONE_PAID)
                .title(title)
                .content(content)
                .referenceId(event.getContractId())
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getManagerUserId(), saved);

        log.info("Milestone paid notification created: contractId={}, milestoneId={}, managerUserId={}",
                event.getContractId(), event.getMilestoneId(), event.getManagerUserId());
    }

    /**
     * Tạo notification cho customer khi milestone sẵn sàng thanh toán
     */
    @Transactional
    public void createMilestoneReadyForPaymentNotification(MilestoneReadyForPaymentNotificationEvent event) {
        if (event.getCustomerUserId() == null || event.getCustomerUserId().isBlank()) {
            log.warn("Cannot create milestone ready for payment notification, customerUserId missing: contractId={}, milestoneId={}",
                    event.getContractId(), event.getMilestoneId());
            return;
        }

        String title = event.getTitle() != null ? event.getTitle() : "Milestone sẵn sàng thanh toán";
        String content = event.getContent() != null ? event.getContent() : 
                String.format("Milestone \"%s\" của contract #%s đã sẵn sàng thanh toán. Số tiền: %s %s. Vui lòng thanh toán để tiếp tục.",
                        event.getMilestoneName() != null ? event.getMilestoneName() : "milestone",
                        event.getContractNumber() != null ? event.getContractNumber() : event.getContractId(),
                        event.getAmount() != null ? event.getAmount().toPlainString() : "0",
                        event.getCurrency() != null ? event.getCurrency() : "VND");
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : "/contracts/" + event.getContractId();
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "CONTRACT";

        Notification notification = Notification.builder()
                .userId(event.getCustomerUserId())
                .type(NotificationType.MILESTONE_READY_FOR_PAYMENT)
                .title(title)
                .content(content)
                .referenceId(event.getContractId())
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getCustomerUserId(), saved);

        log.info("Milestone ready for payment notification created: contractId={}, milestoneId={}, customerUserId={}",
                event.getContractId(), event.getMilestoneId(), event.getCustomerUserId());
    }

    /**
     * Tạo notification cho user khi payment order được thanh toán thành công
     */
    @Transactional
    public void createPaymentOrderCompletedNotification(PaymentOrderCompletedNotificationEvent event) {
        if (event.getUserId() == null || event.getUserId().isBlank()) {
            log.warn("Cannot create payment order completed notification, userId missing: paymentOrderId={}",
                    event.getPaymentOrderId());
            return;
        }

        String title = event.getTitle() != null ? event.getTitle() : "Thanh toán thành công";
        String content = event.getContent() != null ? event.getContent() : 
                String.format("Bạn đã nạp thành công %s %s vào ví. Mã đơn hàng: %s",
                        event.getAmount() != null ? event.getAmount().toPlainString() : "0",
                        event.getCurrency() != null ? event.getCurrency() : "VND",
                        event.getPaymentOrderId() != null ? event.getPaymentOrderId() : "");
        String actionUrl = event.getActionUrl() != null ? event.getActionUrl() : "/payments/success/" + event.getPaymentOrderId();
        String referenceType = event.getReferenceType() != null ? event.getReferenceType() : "PAYMENT";
        String referenceId = event.getReferenceId() != null ? event.getReferenceId() : event.getPaymentOrderId();

        Notification notification = Notification.builder()
                .userId(event.getUserId())
                .type(NotificationType.PAYMENT_ORDER_COMPLETED)
                .title(title)
                .content(content)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        sendRealTimeNotification(event.getUserId(), saved);

        log.info("Payment order completed notification created: paymentOrderId={}, userId={}, amount={}, currency={}",
                event.getPaymentOrderId(), event.getUserId(), event.getAmount(), event.getCurrency());
    }

    /**
     * Mark all notifications as read
     */
    @Transactional
    public int markAllAsRead(String userId) {
        List<Notification> unreadNotifications = notificationRepository.findByUserIdAndIsReadFalse(userId);
        
        if (unreadNotifications.isEmpty()) {
            return 0;
        }
        
        LocalDateTime now = LocalDateTime.now();
        unreadNotifications.forEach(n -> {
            n.setIsRead(true);
            n.setReadAt(now);
        });
        
        notificationRepository.saveAll(unreadNotifications);
        
        log.info("All notifications marked as read: userId={}, count={}", 
                userId, unreadNotifications.size());
        
        return unreadNotifications.size();
    }

    /**
     * Gửi notification real-time qua WebSocket
     */
    private void sendRealTimeNotification(String userId, Notification notification) {
        try {
            NotificationResponse response = notificationMapper.toResponse(notification);
            
            // Gửi đến user-specific queue
            messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/notifications",
                response
            );
            
            log.debug("Real-time notification sent: userId={}, notificationId={}", 
                    userId, notification.getNotificationId());
        } catch (Exception e) {
            log.error("Failed to send real-time notification: userId={}, error={}", 
                    userId, e.getMessage(), e);
            // Không throw exception - notification đã được lưu vào DB
        }
    }
}

