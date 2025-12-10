package com.mutrapro.project_service.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO để nhận thông tin ServiceRequest từ request-service
 * Chứa các field cần thiết để tạo contract và hiển thị cho specialist
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ServiceRequestInfoResponse {
    String requestId;
    String userId;
    String managerUserId;
    String status;       // pending, contract_sent, contract_approved, contract_signed, in_progress, completed, cancelled, rejected
    String requestType;  // transcription, arrangement, arrangement_with_recording, recording
    String contactName;
    String contactPhone;
    String contactEmail;
    String title;
    String description;
    BigDecimal totalPrice;
    String currency;  // VND, USD, EUR
    
    // Thêm các field cho specialist (từ ServiceRequestResponse)
    BigDecimal durationMinutes;  // Độ dài audio file (phút)
    BigDecimal tempoPercentage;  // Tempo percentage
    List<String> genres;  // Danh sách genres (VD: ["Pop", "Rock"]) cho arrangement
    String purpose;  // Mục đích (VD: "karaoke_cover", "performance") cho arrangement
    List<Object> instruments;  // Danh sách instruments
    List<Object> files;  // Danh sách files mà customer đã upload
    List<PreferredSpecialistInfo> preferredSpecialists;  // Danh sách specialist mà customer chọn (cho arrangement_with_recording)
}

