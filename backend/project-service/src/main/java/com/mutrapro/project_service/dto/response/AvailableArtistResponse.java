package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class AvailableArtistResponse {
    String specialistId;
    String name;  // Tên artist (từ specialist-service)
    String email;  // Email của artist
    String avatarUrl;  // Avatar URL nếu có
    String role;  // VOCALIST, GUITARIST, etc.
    List<String> genres;  // Danh sách genres mà artist có thể làm
    Integer experienceYears;  // Số năm kinh nghiệm
    BigDecimal rating;  // Rating của artist
    Integer totalProjects;  // Tổng số projects đã làm
    Boolean isPreferred;  // true nếu là preferred artist từ customer
    Boolean isAvailable;  // true nếu artist rảnh trong slot này
    String availabilityStatus;  // "available", "busy", "unknown"
    LocalTime conflictStartTime;  // Nếu busy, thời gian bắt đầu conflict
    LocalTime conflictEndTime;  // Nếu busy, thời gian kết thúc conflict
    String skillId;  // Skill ID nếu có
    String skillName;  // Skill name nếu có
    BigDecimal hourlyRate;  // Hourly rate của artist (VND/hour)
}

