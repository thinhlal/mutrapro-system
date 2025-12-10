package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import static lombok.AccessLevel.PRIVATE;

/**
 * Thông tin specialist mà customer chọn (từ request-service)
 * Dùng để map từ JSONB preferred_specialists
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class PreferredSpecialistInfo {
    String specialistId;  // Specialist ID
    String name;  // Tên specialist (snapshot tại thời điểm customer chọn)
    String role;  // Role: "VOCALIST" hoặc "INSTRUMENT_PLAYER"
}

