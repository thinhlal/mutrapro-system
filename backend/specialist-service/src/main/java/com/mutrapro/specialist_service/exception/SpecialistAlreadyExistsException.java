package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi specialist đã tồn tại
 */
public class SpecialistAlreadyExistsException extends BusinessException {
    
    public SpecialistAlreadyExistsException(String message) {
        super(SpecialistServiceErrorCodes.SPECIALIST_ALREADY_EXISTS, message);
    }
    
    public SpecialistAlreadyExistsException(String message, String userId) {
        super(SpecialistServiceErrorCodes.SPECIALIST_ALREADY_EXISTS, message, 
              Map.of("userId", userId != null ? userId : "unknown"));
    }
    
    public static SpecialistAlreadyExistsException byUserId(String userId) {
        return new SpecialistAlreadyExistsException(
            "Specialist already exists for user ID: " + userId,
            userId
        );
    }
}

