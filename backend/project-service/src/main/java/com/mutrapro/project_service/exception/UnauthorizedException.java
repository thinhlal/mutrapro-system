package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ForbiddenException;

/**
 * Exception khi không có quyền truy cập
 */
public class UnauthorizedException extends ForbiddenException {

    public UnauthorizedException(String message) {
        super(ProjectServiceErrorCodes.UNAUTHORIZED, message);
    }

    public static UnauthorizedException create(String message) {
        return new UnauthorizedException(message);
    }
}

