package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi file không được cung cấp hoặc rỗng
 */
public class FileRequiredException extends BusinessException {

    public FileRequiredException(String message) {
        super(ProjectServiceErrorCodes.FILE_REQUIRED, message);
    }

    public static FileRequiredException create() {
        return new FileRequiredException("File is required");
    }
}

