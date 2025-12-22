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
    String fullName;  // Full name của artist (alias của name, để tương thích với frontend)
    String email;  // Email của artist
    String avatarUrl;  // Avatar URL nếu có
    String mainDemoPreviewUrl;  // Main demo preview URL để play audio
    String gender;  // Gender của artist (MALE, FEMALE, OTHER)
    String bio;  // Bio/description của artist
    Integer reviews;  // Số lượng reviews (khác với totalProjects)
    List<String> credits;  // Danh sách credits/demos của artist
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

