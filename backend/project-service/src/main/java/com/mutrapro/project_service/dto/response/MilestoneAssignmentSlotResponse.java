package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class MilestoneAssignmentSlotResponse {

    String contractId;
    String contractNumber;
    String contractType;
    String customerName;
    LocalDateTime contractCreatedAt;  // Thời điểm tạo contract để sort mới nhất lên trước

    String milestoneId;
    Integer milestoneOrderIndex;
    String milestoneName;
    String milestoneDescription;
    LocalDateTime plannedStartAt;
    LocalDateTime plannedDueDate;
    LocalDateTime actualStartAt;
    LocalDateTime actualEndAt;  // Thời điểm milestone thực tế kết thúc (khi thanh toán)
    LocalDateTime firstSubmissionAt;  // Lúc specialist giao bản đầu tiên (để check SLA milestone)
    LocalDateTime finalCompletedAt;  // Lúc customer chấp nhận bản cuối cùng (sau mọi revision)
    Integer milestoneSlaDays;
    String milestoneWorkStatus;  // PLANNED, READY_TO_START, IN_PROGRESS, WAITING_CUSTOMER, READY_FOR_PAYMENT, COMPLETED, CANCELLED

    String assignmentId;
    TaskType taskType;
    String assignmentStatus;
    String specialistId;
    String specialistName;
    LocalDateTime assignedDate;

    Boolean hasIssue;

    boolean canAssign;
}


