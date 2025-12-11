package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi file type không được phép
 */
public class FileTypeNotAllowedException extends BusinessException {

    public FileTypeNotAllowedException(String message) {
        super(ProjectServiceErrorCodes.FILE_TYPE_NOT_ALLOWED, message);
    }

    public FileTypeNotAllowedException(String message, String fileType, String allowedTypes) {
        super(ProjectServiceErrorCodes.FILE_TYPE_NOT_ALLOWED, message, 
            Map.of("fileType", fileType != null ? fileType : "unknown", 
                   "allowedTypes", allowedTypes != null ? allowedTypes : ""));
    }

    public static FileTypeNotAllowedException create(String fileType, String allowedTypes) {
        return new FileTypeNotAllowedException(
            "File type not allowed. Allowed types: " + allowedTypes,
            fileType,
            allowedTypes
        );
    }
}

