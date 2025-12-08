package com.mutrapro.request_service.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Thông tin specialist mà customer chọn
 * Lưu trong preferred_specialists (JSONB) của ServiceRequest
 * Để tránh phải query lại từ specialist-service mỗi khi hiển thị
 * 
 * Dùng chung cho cả entity (ServiceRequest) và DTO (CreateServiceRequestRequest, ServiceRequestResponse)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreferredSpecialistInfo {
    
    String specialistId;  // Specialist ID
    
    String name;  // Tên specialist (snapshot tại thời điểm customer chọn)
    
    String role;  // Role: "VOCALIST" hoặc "INSTRUMENT_PLAYER"
}

