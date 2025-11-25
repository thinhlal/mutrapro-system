package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.File;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<File, String> {

    List<File> findByRequestId(String requestId);

    List<File> findByAssignmentId(String assignmentId);

    List<File> findByBookingId(String bookingId);

    List<File> findByCreatedBy(String createdBy);

    Optional<File> findByFilePath(String filePath);  // For idempotency check
}

