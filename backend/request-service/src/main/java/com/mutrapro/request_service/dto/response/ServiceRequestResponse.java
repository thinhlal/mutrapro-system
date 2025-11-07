package com.mutrapro.request_service.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.mutrapro.request_service.enums.RequestStatus;
import com.mutrapro.request_service.enums.ServiceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)  // Chỉ include các field không null
public class ServiceRequestResponse {
    String requestId;
    String userId;
    String managerUserId;
    ServiceType requestType;
    String contactName;
    String contactPhone;
    String contactEmail;
    JsonNode musicOptions;
    BigDecimal tempoPercentage;
    Boolean hasVocalist;
    Integer externalGuestCount;
    String title;
    String description;
    RequestStatus status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    List<String> instrumentIds;  // Danh sách instrument IDs đã chọn
}

