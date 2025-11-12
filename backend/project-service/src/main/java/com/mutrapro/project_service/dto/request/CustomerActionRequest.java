package com.mutrapro.project_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO cho các action của customer trên contract
 * - Approve: reason có thể null
 * - Request change: reason bắt buộc (lý do cần chỉnh sửa)
 * - Cancel: reason bắt buộc (lý do hủy)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class CustomerActionRequest {
    
    @NotBlank(message = "Reason is required for cancel or request change actions")
    String reason;  // Lý do hủy/từ chối/yêu cầu chỉnh sửa
}

