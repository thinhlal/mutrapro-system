package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class TaskAssignmentResponse {

    String assignmentId;

    String contractId;

    String specialistId;
    String specialistUserId;
    String specialistName;
    String specialistEmail;
    String specialistSpecialization;
    Integer specialistExperienceYears;

    TaskType taskType;

    AssignmentStatus status;

    String milestoneId;

    Instant assignedDate;

    Instant completedDate;

    String notes;

    Boolean specialistCanDo;

    String specialistResponseReason;

    Instant specialistRespondedAt;

    // Issue reporting fields
    Boolean hasIssue;
    String issueReason;
    Instant issueReportedAt;

    // Request info (nested) - chỉ các field quan trọng cho specialist
    RequestInfo request;

    // Milestone info (nested) - name và description
    MilestoneInfo milestone;

    // Optional: Submissions for this assignment (for calculating progress) - luôn được populate
    List<SubmissionInfo> submissions;

    // Optional: Contract info - luôn được populate
    ContractInfo contract;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class SubmissionInfo {
        String submissionId;
        String status;  // draft, pending_review, approved, rejected, revision_requested
        Integer version;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class ContractInfo {
        String contractId;
        String contractNumber;
        String nameSnapshot;  // Customer name
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class RequestInfo {
        String requestId;
        String serviceType; // requestType từ ServiceRequest
        String title;
        String description;
        Integer durationSeconds; // durationMinutes * 60 nếu có
        Integer tempo;
        String timeSignature;
        String specialNotes;
        Object instruments; // List instruments nếu có
        Object files; // List files mà customer đã upload
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class MilestoneInfo {
        String milestoneId;
        String name;
        String description;
        String contractId;            // Hỗ trợ FE tính chuỗi milestone
        Integer orderIndex;              // Thứ tự milestone (1, 2, 3...) để tính start date của milestone sau
        LocalDateTime plannedStartAt;
        LocalDateTime plannedDueDate;  // Deadline của milestone để tính tasksInSlaWindow
        LocalDateTime actualStartAt;   // Thời điểm milestone thực tế bắt đầu
        LocalDateTime actualEndAt;     // Thời điểm milestone thực tế kết thúc
        Integer milestoneSlaDays;
    }
}

