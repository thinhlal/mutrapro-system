package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.ContentType;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.enums.FileStatus;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "files", indexes = {
    @Index(name = "idx_files_request_id", columnList = "request_id"),
    @Index(name = "idx_files_assignment_id", columnList = "assignment_id"),
    @Index(name = "idx_files_booking_id", columnList = "booking_id"),
    @Index(name = "idx_files_created_by", columnList = "created_by"),
    @Index(name = "idx_files_file_status", columnList = "file_status"),
    @Index(name = "idx_files_content_type", columnList = "content_type"),
    @Index(name = "idx_files_file_source", columnList = "file_source")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class File extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "file_id", nullable = false)
    String fileId;

    // Source references (one of these will be NULL)
    @Column(name = "request_id")
    String requestId;  // Soft reference to request-service

    @Column(name = "assignment_id")
    String assignmentId;  // Reference to task_assignments

    @Column(name = "booking_id")
    String bookingId;  // Soft reference to studio-service

    // File metadata
    @Column(name = "file_name", nullable = false, length = 255)
    String fileName;

    @Column(name = "file_path", nullable = false, length = 500)
    String filePath;  // S3 URL

    @Column(name = "file_size", nullable = false)
    Long fileSize;

    @Column(name = "mime_type", length = 100)
    String mimeType;

    // File classification
    @Enumerated(EnumType.STRING)
    @Column(name = "file_source", nullable = false, length = 30)
    FileSourceType fileSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 30)
    ContentType contentType;

    // General metadata
    @Column(name = "description", columnDefinition = "text")
    String description;

    @Column(name = "upload_date", nullable = false)
    @Builder.Default
    Instant uploadDate = Instant.now();

    @Column(name = "created_by", nullable = false)
    String createdBy;  // Soft reference to identity-service

    // Delivery tracking
    @Builder.Default
    @Column(name = "delivered_to_customer", nullable = false)
    Boolean deliveredToCustomer = false;

    @Column(name = "delivered_at")
    Instant deliveredAt;

    @Column(name = "delivered_by")
    String deliveredBy;  // Soft reference to identity-service

    // File status tracking
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "file_status", nullable = false, length = 30)
    FileStatus fileStatus = FileStatus.uploaded;

    @Column(name = "rejection_reason", columnDefinition = "text")
    String rejectionReason;

    @Column(name = "reviewed_by")
    String reviewedBy;  // Soft reference to identity-service

    @Column(name = "reviewed_at")
    Instant reviewedAt;
}

