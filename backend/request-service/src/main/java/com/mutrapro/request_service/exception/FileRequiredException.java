package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi file không được cung cấp hoặc rỗng
 */
public class FileRequiredException extends BusinessException {

    public FileRequiredException(String message) {
        super(RequestServiceErrorCodes.FILE_REQUIRED, message);
    }

    public static FileRequiredException create() {
        return new FileRequiredException("File is required");
    }
}

