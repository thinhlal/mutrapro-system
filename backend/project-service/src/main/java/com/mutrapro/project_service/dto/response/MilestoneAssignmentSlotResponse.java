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
    String milestoneType;  // transcription, arrangement, recording
    LocalDateTime plannedStartAt;
    LocalDateTime plannedDueDate;
    LocalDateTime targetDeadline;  // Deadline mục tiêu/hard deadline do backend tính (workflow 3 vs 4)
    LocalDateTime estimatedDeadline;  // Deadline ước tính khi chưa có target/planned (contract chưa Start Work)
    LocalDateTime actualStartAt;
    LocalDateTime actualEndAt;  // Thời điểm milestone thực tế kết thúc (khi thanh toán)
    LocalDateTime firstSubmissionAt;  // Lúc specialist giao bản đầu tiên (để check SLA milestone)
    LocalDateTime finalCompletedAt;  // Lúc customer chấp nhận bản cuối cùng (sau mọi revision)
    Integer milestoneSlaDays;
    // Computed SLA status (see ContractMilestoneResponse for semantics)
    Boolean firstSubmissionLate;
    // Computed at query time: overdue when not yet submitted
    Boolean overdueNow;
    String milestoneWorkStatus;  // PLANNED, READY_TO_START, IN_PROGRESS, WAITING_CUSTOMER, READY_FOR_PAYMENT, COMPLETED, CANCELLED

    String assignmentId;
    TaskType taskType;
    String assignmentStatus;
    String specialistId;
    String specialistName;
    LocalDateTime assignedDate;

    Boolean hasIssue;

    boolean canAssign;

    // For recording milestones - link to studio booking
    String studioBookingId;  // Soft reference to studio_bookings.booking_id (nullable)

    // Contract status for validation
    String contractStatus;  // signed, active, active_pending_assignment, completed, etc.

    // For recording milestones in arrangement_with_recording contracts
    // Indicates if all arrangement milestones are completed/ready_for_payment AND paid (actualEndAt != null)
    // ⚠️ QUAN TRỌNG: Field này check cả workStatus VÀ actualEndAt (đã thanh toán)
    // Đây là điều kiện bắt buộc để tạo booking cho recording milestone
    // Frontend dùng field này để hiển thị button "Book Studio"
    Boolean allArrangementsCompleted;  // true if all arrangement milestones are completed/ready_for_payment AND paid (actualEndAt != null)
}


