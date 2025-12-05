package com.mutrapro.shared.event;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event khi file được upload lên S3
 * file_id sẽ được project-service generate khi tạo file record trong database
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FileUploadedEvent implements Serializable {
    
    // eventId - Dùng làm idempotency key
    UUID eventId;
    
    // file_name varchar(255) [not null]
    String fileName;
    
    // file_key_s3 varchar(500) [not null] - S3 object key (e.g., "task-outputs/123/file-uuid.pdf"), not URL
    String fileKeyS3;
    
    // file_size bigint [not null]
    Long fileSize;
    
    // mime_type varchar(100)
    String mimeType;
    
    // file_source file_source_type [not null] - enum: customer_upload, task_deliverable, studio_recording
    String fileSource;
    
    // content_type content_type [not null] - enum: audio, sheet_music, project_file, documentation, video, archive
    String contentType;
    
    // description text
    String description;
    
    // upload_date timestamp [default: `now()`]
    LocalDateTime uploadDate;
    
    // created_by uuid [not null]
    String createdBy;
    
    // request_id uuid (optional) - Soft reference to request-service
    String requestId;
    
    // assignment_id (optional) - Soft reference to project-service task_assignments
    String assignmentId;
    
    // booking_id (optional) - Reference to studio_bookings (project-service)
    String bookingId;
}

