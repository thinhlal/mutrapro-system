package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.FileSourceType;
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
public class FileInfoResponse {
    String fileId;
    String fileName;
    Long fileSize;
    String mimeType;
    String contentType;
    FileSourceType fileSource;  // Thêm field để phân biệt loại file
    String description;  // Note/description từ specialist khi upload
    LocalDateTime uploadDate;
    String fileStatus;  // uploaded, pending_review, approved, rejected, delivered, deleted
    Boolean deliveredToCustomer;
    LocalDateTime deliveredAt;
    LocalDateTime reviewedAt;
    String rejectionReason;  // Lý do từ chối (khi fileStatus = rejected)
}
