package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy specialist
 */
public class SpecialistNotFoundException extends ResourceNotFoundException {
    
    public SpecialistNotFoundException(String message) {
        super(SpecialistServiceErrorCodes.SPECIALIST_NOT_FOUND, message);
    }
    
    public SpecialistNotFoundException(String message, String specialistId) {
        super(SpecialistServiceErrorCodes.SPECIALIST_NOT_FOUND, message, 
              Map.of("specialistId", specialistId != null ? specialistId : "unknown"));
    }
    
    public static SpecialistNotFoundException byId(String id) {
        return new SpecialistNotFoundException(
            "Specialist not found with ID: " + id,
            id
        );
    }
    
    public static SpecialistNotFoundException byUserId(String userId) {
        return new SpecialistNotFoundException(
            "Specialist not found with user ID: " + userId,
            userId
        );
    }
}

