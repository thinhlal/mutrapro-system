package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.MilestoneType;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
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
public class ContractMilestoneResponse {
    
    String milestoneId;
    
    String contractId;
    
    String name;
    
    String description;
    
    Integer orderIndex;
    
    MilestoneType milestoneType;  // transcription, arrangement, recording - NULL nếu không áp dụng
    
    MilestoneWorkStatus workStatus;
    
    Boolean hasPayment;  // Milestone này có installment tương ứng không
    
    Integer milestoneSlaDays;  // SLA ngày cho milestone này

    LocalDateTime targetDeadline;  // Deadline mục tiêu/hard deadline do backend tính (workflow 3 vs 4)

    // Deadline ước tính (khi contract chưa Start Work và chưa có plannedStartAt/plannedDueDate)
    // FE dùng để hiển thị "Estimated" thay vì tự tính lại.
    LocalDateTime estimatedDeadline;
    
    LocalDateTime plannedStartAt;  // BE tính khi contract có start date
    
    LocalDateTime plannedDueDate;  // BE tính khi contract có start date

    LocalDateTime actualStartAt;   // Thời điểm milestone thực tế bắt đầu

    LocalDateTime actualEndAt;     // Thời điểm milestone thực tế kết thúc

    LocalDateTime firstSubmissionAt;  // Lúc specialist giao bản đầu tiên (để check SLA milestone)

    /**
     * SLA status (computed):
     * - null: thiếu dữ liệu để kết luận (vd: thiếu targetDeadline)
     * - true: first submission trễ (firstSubmissionAt > targetDeadline)
     * - false: first submission đúng hạn (firstSubmissionAt <= targetDeadline)
     */
    Boolean firstSubmissionLate;

    /**
     * Overdue at query time (computed):
     * - null: thiếu dữ liệu để kết luận (vd: thiếu targetDeadline)
     * - true: chưa có firstSubmissionAt và now > targetDeadline
     * - false: còn hạn hoặc đã có firstSubmissionAt
     */
    Boolean overdueNow;

    LocalDateTime finalCompletedAt;  // Lúc customer chấp nhận bản cuối cùng (sau mọi revision)
    
    // Source arrangement info (cho recording milestone)
    String sourceArrangementMilestoneId;  // ID của arrangement milestone tạo ra recording milestone này
    String sourceArrangementSubmissionId;  // ID của arrangement submission final được dùng để recording
    ArrangementSubmissionInfo sourceArrangementSubmission;  // Thông tin arrangement submission (nếu có)
    
    LocalDateTime createdAt;
    
    LocalDateTime updatedAt;
    
    // Nested class cho ArrangementSubmissionInfo
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

