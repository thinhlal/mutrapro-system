package com.mutrapro.project_service.dto.response;

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
public class FileSubmissionResponse {
    String submissionId;
    String assignmentId;
    String submissionName;
    String status;  // draft, pending_review, approved, rejected, revision_requested
    String createdBy;
    LocalDateTime createdAt;
    LocalDateTime submittedAt;
    String reviewedBy;
    LocalDateTime reviewedAt;
    String rejectionReason;
    Integer version;
    List<FileInfoResponse> files;  // Danh sách files trong submission
    Integer fileCount;  // Tổng số files
    Long totalSize;  // Tổng dung lượng
}

