package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy demo
 */
public class DemoNotFoundException extends ResourceNotFoundException {
    
    public DemoNotFoundException(String message) {
        super(SpecialistServiceErrorCodes.DEMO_NOT_FOUND, message);
    }
    
    public DemoNotFoundException(String message, String demoId) {
        super(SpecialistServiceErrorCodes.DEMO_NOT_FOUND, message, 
              Map.of("demoId", demoId != null ? demoId : "unknown"));
    }
    
    public static DemoNotFoundException byId(String id) {
        return new DemoNotFoundException(
            "Demo not found with ID: " + id,
            id
        );
    }
}

