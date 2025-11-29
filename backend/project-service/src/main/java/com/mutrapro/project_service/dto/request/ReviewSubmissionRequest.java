package com.mutrapro.project_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSubmissionRequest {
    private String submissionId;
    private String action;  // "approve" or "reject"
    private String reason;  // Required if action = "reject"
}

