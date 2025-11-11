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
    String filePath;
    Long fileSize;
    String mimeType;
    String contentType;
    Instant uploadDate;
}

