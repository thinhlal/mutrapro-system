package com.mutrapro.chat_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO cho file upload trong chat
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {
    
    String fileUrl;      // Public URL của file trên S3
    String fileName;     // Tên file gốc
    String fileKey;      // S3 object key (để download sau này nếu cần)
    Long fileSize;       // Kích thước file (bytes)
    String mimeType;     // MIME type (e.g., "application/pdf", "image/png")
    String fileType;     // Loại file: "file", "image", "audio", "video"
}

