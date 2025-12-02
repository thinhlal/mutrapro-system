package com.mutrapro.project_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerReviewSubmissionRequest {
    private String action;  // "accept" or "request_revision"
    private String title;   // Required if action = "request_revision"
    private String description;  // Required if action = "request_revision"
}

