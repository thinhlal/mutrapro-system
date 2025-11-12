package com.mutrapro.project_service.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO để nhận thông tin ServiceRequest từ request-service
 * Chỉ chứa các field cần thiết để tạo contract
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
}

