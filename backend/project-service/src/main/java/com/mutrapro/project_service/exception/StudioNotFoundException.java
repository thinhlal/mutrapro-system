package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy studio
 */
public class StudioNotFoundException extends ResourceNotFoundException {

    public StudioNotFoundException(String message) {
        super(ProjectServiceErrorCodes.STUDIO_NOT_FOUND, message);
    }

    public StudioNotFoundException(String message, String studioId) {
        super(ProjectServiceErrorCodes.STUDIO_NOT_FOUND, message, 
              Map.of("studioId", studioId != null ? studioId : "unknown"));
    }

    public static StudioNotFoundException create(String studioId) {
        return new StudioNotFoundException(
            "Studio not found: " + studioId,
            studioId
        );
    }
    
    public static StudioNotFoundException byId(String studioId) {
        return new StudioNotFoundException(
            "Studio not found with id: " + studioId,
            studioId
        );
    }
}

