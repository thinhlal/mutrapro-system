package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO chứa thông tin contract cho một service request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
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

