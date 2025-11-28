package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.enums.FileStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<File, String> {

    List<File> findByRequestId(String requestId);

    // Find files by requestId with fileSource filter (customer_upload or contract_pdf)
    List<File> findByRequestIdAndFileSourceIn(String requestId, List<FileSourceType> fileSources);

    List<File> findByAssignmentId(String assignmentId);

    // Find files by assignmentId, excluding deleted files
    List<File> findByAssignmentIdAndFileStatusNot(String assignmentId, FileStatus fileStatus);

    List<File> findByBookingId(String bookingId);

    List<File> findByCreatedBy(String createdBy);

    Optional<File> findByFileKeyS3(String fileKeyS3);  // For idempotency check

    // Find files by IDs
    List<File> findByFileIdIn(List<String> fileIds);
}

