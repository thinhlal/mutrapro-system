package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

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

    LocalDateTime assignedDate;

    LocalDateTime completedDate;

    String notes;

    Boolean specialistCanDo;

    String specialistResponseReason;

    LocalDateTime specialistRespondedAt;

    // Issue reporting fields
    Boolean hasIssue;
    String issueReason;
    LocalDateTime issueReportedAt;

    // Link to studio booking (for recording tasks)
    String studioBookingId;  // Soft reference to studio_bookings.booking_id (nullable)

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
        Integer revisionDeadlineDays;  // Số ngày SLA để hoàn thành revision (từ khi manager approve)
        LocalDateTime contractCreatedAt;  // Thời điểm tạo contract để sort mới nhất lên trước
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
        String milestoneType;          // transcription, arrangement, recording
        String contractId;            // Hỗ trợ FE tính chuỗi milestone
        Integer orderIndex;              // Thứ tự milestone (1, 2, 3...) để tính start date của milestone sau
        LocalDateTime plannedStartAt;
        LocalDateTime plannedDueDate;  // Deadline của milestone để tính tasksInSlaWindow
        LocalDateTime actualStartAt;   // Thời điểm milestone thực tế bắt đầu
        LocalDateTime actualEndAt;     // Thời điểm milestone thực tế kết thúc (khi thanh toán)
        LocalDateTime firstSubmissionAt;  // Lúc specialist giao bản đầu tiên (để check SLA milestone)
        LocalDateTime finalCompletedAt;  // Lúc customer chấp nhận bản cuối cùng (sau mọi revision)
        Integer milestoneSlaDays;
        LocalDateTime estimatedDeadline;  // Deadline ước tính khi chưa có actual/planned (tính từ deadline milestone trước đó + slaDays)
        
        // Source arrangement info (cho recording milestone)
        String sourceArrangementMilestoneId;  // ID của arrangement milestone tạo ra recording milestone này
        String sourceArrangementSubmissionId;  // ID của arrangement submission final được dùng để recording
        ArrangementSubmissionInfo sourceArrangementSubmission;  // Thông tin arrangement submission (nếu có)
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class ArrangementSubmissionInfo {
        String submissionId;
        String submissionName;
        String status;
        Integer version;
        List<FileInfo> files;  // Danh sách files trong submission
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class FileInfo {
        String fileId;
        String fileName;
        String fileUrl;  // Download URL
        Long fileSize;
        String mimeType;
    }
}

