package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
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
    
    // List of delivered submissions
    List<FileSubmissionResponse> submissions;
    
    // List of revision requests for assignments in this milestone
    List<RevisionRequestResponse> revisionRequests;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class ContractInfo {
        String contractId;
        String contractNumber;
        String contractType;
        String requestId;
        Integer freeRevisionsIncluded;  // Số lần revision free được bao gồm trong contract
        BigDecimal additionalRevisionFeeVnd;  // Phí revision bổ sung (nếu hết lượt free)
        Integer revisionDeadlineDays;  // Số ngày SLA để hoàn thành revision (từ khi manager approve)
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
        String milestoneType;  // transcription, arrangement, recording
        String workStatus;  // PLANNED, IN_PROGRESS, WAITING_CUSTOMER, etc.
        // Baseline (plan) - kept for backward compatibility
        LocalDateTime plannedDueDate;

        // Deadline mục tiêu/hard deadline do backend tính (workflow 3 vs 4)
        LocalDateTime targetDeadline;

        // Lúc specialist giao bản đầu tiên (để check SLA milestone)
        LocalDateTime firstSubmissionAt;

        // Computed SLA status: true if firstSubmissionAt > targetDeadline; false if <=; null if cannot decide
        Boolean firstSubmissionLate;

        // Computed at query time: overdue when not yet submitted (firstSubmissionAt == null && now > targetDeadline)
        Boolean overdueNow;
        LocalDateTime actualStartAt;
        LocalDateTime finalCompletedAt;  // Thời điểm customer chấp nhận bản cuối cùng (sau mọi revision)
        LocalDateTime actualEndAt;  // Thời điểm milestone được thanh toán (nếu có payment)
        String installmentStatus;  // PENDING, DUE, PAID - để frontend check xem đã thanh toán chưa
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
        Object instruments; // List instruments nếu có
        Object files; // List files mà customer đã upload
    }
}

