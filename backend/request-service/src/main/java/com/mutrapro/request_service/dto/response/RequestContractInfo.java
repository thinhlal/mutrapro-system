package com.mutrapro.request_service.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO chứa thông tin contract cho một service request
 * Tương ứng với RequestContractInfo trong project-service
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
@JsonIgnoreProperties(ignoreUnknown = true)
public class RequestContractInfo {
    /**
     * Request ID
     */
    String requestId;
    
    /**
     * Có contract hay không
     */
    Boolean hasContract;
    
    /**
     * Contract ID (nếu có)
     */
    String contractId;
    
    /**
     * Contract status (nếu có)
     */
    String contractStatus;
}

