package com.mutrapro.project_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;

public class SignSessionException extends BusinessException {

    public SignSessionException(String message) {
        super(ProjectServiceErrorCodes.SIGN_SESSION_NOT_FOUND, message);
    }

    public static SignSessionException notFound(String sessionId) {
        return new SignSessionException(
            String.format("Sign session not found or expired: %s", sessionId)
        );
    }

    public static SignSessionException expired(String sessionId) {
        return new SignSessionException(
            String.format("Sign session has expired: %s", sessionId)
        );
    }
}

