package com.mutrapro.project_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InitESignRequest {
    
    @NotBlank(message = "Signature data is required")
    private String signatureBase64;  // Base64 encoded signature image from canvas
}

