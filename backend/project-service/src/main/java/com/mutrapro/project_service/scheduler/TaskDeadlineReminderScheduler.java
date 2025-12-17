package com.mutrapro.project_service.scheduler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.entity.StudioBooking;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.MilestoneType;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.repository.StudioBookingRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import com.mutrapro.shared.event.TaskDeadlineReminderEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Scheduler nhắc hạn task (near deadline) để specialist biết và xử lý.
 *
 * Rule:
 * - chỉ nhắc cho các assignment ở trạng thái specialist còn làm được (không nhắc khi chờ manager review)
 * - dựa trên milestone targetDeadline (backend-computed rule workflow 3 vs 4)
 * - gửi ở các mốc: còn 3 ngày, 1 ngày, và trong ngày (0 ngày)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TaskDeadlineReminderScheduler {

    private final TaskAssignmentRepository taskAssignmentRepository;
    private final ContractRepository contractRepository;
    private final ContractMilestoneRepository contractMilestoneRepository;
    private final StudioBookingRepository studioBookingRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    private static final List<Integer> REMINDER_DAYS = List.of(3, 1, 0);

    /**
     * Chạy mỗi ngày 09:00 (Asia/Ho_Chi_Minh). Cron: 0 0 9 * * ?
     */
    @Scheduled(cron = "0 0 9 * * ?")
    public void sendDeadlineReminders() {
        log.info("Starting scheduled job: Task deadline reminders");
        try {
            List<AssignmentStatus> eligibleStatuses = List.of(
                AssignmentStatus.assigned,
                AssignmentStatus.accepted_waiting,
                AssignmentStatus.ready_to_start,
                AssignmentStatus.in_progress,
                AssignmentStatus.revision_requested,
                AssignmentStatus.in_revision,
                AssignmentStatus.delivery_pending
            );

            List<TaskAssignment> assignments = taskAssignmentRepository.findByStatusIn(eligibleStatuses);
            if (assignments.isEmpty()) {
                log.debug("No eligible assignments found for deadline reminders");
                return;
            }

            // Batch load contracts/milestones/bookings to avoid N+1
            List<String> contractIds = assignments.stream()
                .map(TaskAssignment::getContractId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
            Map<String, Contract> contractById = contractRepository.findAllById(contractIds).stream()
                .collect(Collectors.toMap(Contract::getContractId, c -> c));

            Map<String, List<ContractMilestone>> milestonesByContractId = contractMilestoneRepository
                .findByContractIdIn(contractIds).stream()
                .collect(Collectors.groupingBy(ContractMilestone::getContractId));
            milestonesByContractId.values()
                .forEach(list -> list.sort(Comparator.comparing(m -> Optional.ofNullable(m.getOrderIndex()).orElse(999))));

            List<String> milestoneIds = assignments.stream()
                .map(TaskAssignment::getMilestoneId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
            Map<String, StudioBooking> bookingByMilestoneId = studioBookingRepository.findByMilestoneIdIn(milestoneIds).stream()
                .collect(Collectors.toMap(StudioBooking::getMilestoneId, b -> b, (a, b) -> a));

            LocalDate today = LocalDate.now();

            int queued = 0;
            for (TaskAssignment a : assignments) {
                if (a.getSpecialistUserIdSnapshot() == null || a.getSpecialistUserIdSnapshot().isBlank()) {
                    continue;
                }
                Contract contract = contractById.get(a.getContractId());
                List<ContractMilestone> allMilestones = milestonesByContractId.getOrDefault(a.getContractId(), List.of());
                ContractMilestone milestone = allMilestones.stream()
                    .filter(m -> Objects.equals(m.getMilestoneId(), a.getMilestoneId()))
                    .findFirst()
                    .orElse(null);
                if (milestone == null) {
                    continue;
                }

                // Nếu milestone đã có firstSubmissionAt => không nhắc nữa (SLA chốt theo bản nộp đầu)
                if (milestone.getFirstSubmissionAt() != null) {
                    continue;
                }

                LocalDateTime targetDeadline = resolveMilestoneTargetDeadline(
                    milestone,
                    contract,
                    allMilestones,
                    bookingByMilestoneId.get(milestone.getMilestoneId())
                );
                if (targetDeadline == null) {
                    continue;
                }

                long daysLeft = ChronoUnit.DAYS.between(today, targetDeadline.toLocalDate());
                if (daysLeft < 0) {
                    continue; // already overdue - optional future: overdue reminder/escalation
                }
                if (!REMINDER_DAYS.contains((int) daysLeft)) {
                    continue;
                }

                int reminderDays = (int) daysLeft;
                UUID eventId = deterministicEventId(a.getAssignmentId(), reminderDays, targetDeadline);

                String contractLabel = contract != null && contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                    ? contract.getContractNumber()
                    : a.getContractId();
                String milestoneLabel = milestone.getName() != null ? milestone.getName() : a.getMilestoneId();
                String actionUrl = getTaskActionUrl(a.getTaskType());

                TaskDeadlineReminderEvent event = TaskDeadlineReminderEvent.builder()
                    .eventId(eventId)
                    .assignmentId(a.getAssignmentId())
                    .contractId(a.getContractId())
                    .contractNumber(contract != null ? contract.getContractNumber() : null)
                    .specialistId(a.getSpecialistId())
                    .specialistUserId(a.getSpecialistUserIdSnapshot())
                    .taskType(a.getTaskType() != null ? a.getTaskType().name() : null)
                    .milestoneId(a.getMilestoneId())
                    .milestoneName(milestone.getName())
                    .targetDeadline(targetDeadline)
                    .reminderDays(reminderDays)
                    .title(String.format("Task sắp đến hạn (còn %d ngày)", reminderDays))
                    .content(String.format(
                        "Task %s cho contract #%s (Milestone: %s) sắp đến hạn. Deadline: %s. Vui lòng kiểm tra và hoàn thành đúng hạn.",
                        a.getTaskType(),
                        contractLabel,
                        milestoneLabel,
                        targetDeadline
                    ))
                    .referenceType("TASK_ASSIGNMENT")
                    .actionUrl(actionUrl)
                    .timestamp(LocalDateTime.now())
                    .build();

                JsonNode payload = objectMapper.valueToTree(event);
                UUID aggregateId;
                try {
                    aggregateId = UUID.fromString(a.getAssignmentId());
                } catch (Exception ex) {
                    aggregateId = UUID.nameUUIDFromBytes(a.getAssignmentId().getBytes(StandardCharsets.UTF_8));
                }

                OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("TaskAssignment")
                    .eventType("task.deadline.reminder")
                    .eventPayload(payload)
                    .build();

                outboxEventRepository.save(outboxEvent);
                queued++;
            }

            log.info("Scheduled job completed: queued {} task deadline reminder events", queued);
        } catch (Exception e) {
            log.error("Error in scheduled job: Task deadline reminders", e);
        }
    }

    private UUID deterministicEventId(String assignmentId, int reminderDays, LocalDateTime targetDeadline) {
        String key = String.format("task.deadline.reminder:%s:%d:%s",
            assignmentId,
            reminderDays,
            targetDeadline != null ? targetDeadline.toLocalDate() : "null"
        );
        return UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8));
    }

    private String getTaskActionUrl(TaskType taskType) {
        if (taskType == null) {
            return "/transcription/my-tasks";
        }
        return switch (taskType) {
            case transcription -> "/transcription/my-tasks";
            case arrangement -> "/arrangement/my-tasks";
            case recording_supervision -> "/recording-artist/my-tasks";
        };
    }

    /**
     * Deadline mục tiêu/hard deadline (same semantics as ContractService/TaskAssignmentService).
     */
    private LocalDateTime resolveMilestoneTargetDeadline(
        ContractMilestone milestone,
        Contract contract,
        List<ContractMilestone> allContractMilestones,
        StudioBooking booking
    ) {
        if (milestone == null) return null;
        Integer slaDays = milestone.getMilestoneSlaDays();
        if (slaDays == null || slaDays <= 0) return null;

        if (milestone.getMilestoneType() == MilestoneType.recording) {
            if (contract != null && contract.getContractType() == ContractType.arrangement_with_recording) {
                ContractMilestone lastArrangement = (allContractMilestones != null ? allContractMilestones : List.<ContractMilestone>of())
                    .stream()
                    .filter(m -> m.getMilestoneType() == MilestoneType.arrangement)
                    .max(Comparator.comparing(ContractMilestone::getOrderIndex))
                    .orElse(null);
                if (lastArrangement != null && lastArrangement.getActualEndAt() != null) {
                    return lastArrangement.getActualEndAt().plusDays(slaDays);
                }
                // fallback planned
            } else if (contract != null && contract.getContractType() == ContractType.recording) {
                if (booking != null) {
                    List<BookingStatus> activeStatuses = List.of(
                        BookingStatus.TENTATIVE, BookingStatus.PENDING,
                        BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS);
                    if (activeStatuses.contains(booking.getStatus()) && booking.getBookingDate() != null) {
                        LocalTime startTime = booking.getStartTime() != null ? booking.getStartTime() : LocalTime.of(8, 0);
                        LocalDateTime startAt = booking.getBookingDate().atTime(startTime);
                        return startAt.plusDays(slaDays);
                    }
                }
            }

            if (milestone.getPlannedDueDate() != null) return milestone.getPlannedDueDate();
            if (milestone.getPlannedStartAt() != null) return milestone.getPlannedStartAt().plusDays(slaDays);
            return null;
        }

        if (milestone.getActualStartAt() != null) return milestone.getActualStartAt().plusDays(slaDays);
        if (milestone.getPlannedDueDate() != null) return milestone.getPlannedDueDate();
        if (milestone.getPlannedStartAt() != null) return milestone.getPlannedStartAt().plusDays(slaDays);
        return null;
    }
}


