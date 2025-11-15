package com.mutrapro.specialist_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO để nhận thông tin user từ identity-service
 * Chỉ chứa các field cần thiết cho specialist-service
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoResponse {
    private String userId;
    private String email;
    private String fullName;
}

