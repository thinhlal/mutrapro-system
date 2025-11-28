package com.mutrapro.project_service.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitForReviewRequest {
    @NotEmpty(message = "File IDs cannot be empty")
    private List<String> fileIds;
}

