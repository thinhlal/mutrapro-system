package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi specialist type không hợp lệ
 */
public class InvalidSpecialistTypeException extends BusinessException {
    
    public InvalidSpecialistTypeException(String message) {
        super(SpecialistServiceErrorCodes.INVALID_SPECIALIST_TYPE, message);
    }
    
    public InvalidSpecialistTypeException(String message, Map<String, Object> details) {
        super(SpecialistServiceErrorCodes.INVALID_SPECIALIST_TYPE, message, details);
    }
    
    /**
     * Khi SpecialistType là null
     */
    public static InvalidSpecialistTypeException cannotBeNull() {
        return new InvalidSpecialistTypeException(
            "SpecialistType cannot be null"
        );
    }
    
    /**
     * Khi SpecialistType không được nhận diện
     */
    public static InvalidSpecialistTypeException unknown(String specialistType) {
        return new InvalidSpecialistTypeException(
            "Unknown SpecialistType: " + specialistType,
            Map.of("specialistType", specialistType != null ? specialistType : "unknown")
        );
    }
}

