package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.response.FileSubmissionResponse;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.project_service.entity.ContractMilestone;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service để quản lý logic liên quan đến ContractMilestone
 * Tách biệt khỏi ContractService để tránh circular dependency và tách biệt trách nhiệm
 */
@Slf4j
@Service
public class ContractMilestoneService {

    private final FileSubmissionService fileSubmissionService;

    public ContractMilestoneService(@Lazy FileSubmissionService fileSubmissionService) {
        this.fileSubmissionService = fileSubmissionService;
    }

    /**
     * Enrich milestone với arrangement submission info (nếu có)
     * Dùng cho recording milestone có link với arrangement submission
     */
    public TaskAssignmentResponse.ArrangementSubmissionInfo enrichMilestoneWithArrangementSubmission(
            ContractMilestone milestone) {
        if (milestone == null || milestone.getSourceArrangementSubmissionId() == null 
            || milestone.getSourceArrangementSubmissionId().isEmpty()) {
            return null;
        }
        
        try {
            FileSubmissionResponse submissionResponse = fileSubmissionService.getSubmissionInternal(
                milestone.getSourceArrangementSubmissionId()
            );
            
            if (submissionResponse != null && submissionResponse.getFiles() != null) {
                // Map files từ FileInfoResponse sang FileInfo với download URL
                // URL format: /api/v1/projects/files/download/{fileId} (khớp với frontend API_ENDPOINTS.FILES.DOWNLOAD)
                List<TaskAssignmentResponse.FileInfo> files = submissionResponse.getFiles().stream()
                    .map(file -> TaskAssignmentResponse.FileInfo.builder()
                        .fileId(file.getFileId())
                        .fileName(file.getFileName())
                        .fileUrl("/api/v1/projects/files/download/" + file.getFileId())  // Download URL
                        .fileSize(file.getFileSize())
                        .mimeType(file.getMimeType())
                        .build())
                    .toList();
                
                return TaskAssignmentResponse.ArrangementSubmissionInfo.builder()
                    .submissionId(submissionResponse.getSubmissionId())
                    .submissionName(submissionResponse.getSubmissionName())
                    .status(submissionResponse.getStatus())
                    .version(submissionResponse.getVersion())
                    .files(files)
                    .build();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch arrangement submission: submissionId={}, error={}", 
                milestone.getSourceArrangementSubmissionId(), e.getMessage());
            // Không throw error, chỉ log warning
        }
        
        return null;
    }
}

