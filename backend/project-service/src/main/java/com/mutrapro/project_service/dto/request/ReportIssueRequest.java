package com.mutrapro.project_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportIssueRequest {
    @NotBlank(message = "Lý do báo issue là bắt buộc")
    @Size(min = 10, message = "Lý do phải có ít nhất 10 ký tự")
    String reason;
}

