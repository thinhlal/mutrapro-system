package com.mutrapro.request_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

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
    String fileSource;
    Instant uploadDate;
    String fileStatus;
    Boolean deliveredToCustomer;
    Instant deliveredAt;
    Instant reviewedAt;
    String rejectionReason;  // Lý do từ chối (khi fileStatus = rejected)
}

