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
public class CustomerDeliveriesResponse {
    
    // Contract info
    ContractInfo contract;
    
    // Milestone info
    MilestoneInfo milestone;
    
    // Request info
    RequestInfo request;
    
    // List of delivered submissions
    List<FileSubmissionResponse> submissions;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class ContractInfo {
        String contractId;
        String contractNumber;
        String contractType;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class MilestoneInfo {
        String milestoneId;
        String name;
        String description;
        String workStatus;  // PLANNED, IN_PROGRESS, WAITING_CUSTOMER, etc.
        LocalDateTime plannedDueDate;
        LocalDateTime actualStartAt;
        LocalDateTime actualEndAt;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class RequestInfo {
        String requestId;
        String serviceType; // requestType từ ServiceRequest
        String title;
        String description;
        Integer durationSeconds; // durationMinutes * 60 nếu có
        Integer tempo;
        String timeSignature;
        String specialNotes;
        Object instruments; // List instruments nếu có
        Object files; // List files mà customer đã upload
    }
}

