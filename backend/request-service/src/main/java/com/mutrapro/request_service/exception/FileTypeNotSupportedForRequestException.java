package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

public class FileTypeNotSupportedForRequestException extends BusinessException {
    
    private FileTypeNotSupportedForRequestException(RequestServiceErrorCodes errorCode, String message) {
        super(errorCode, message);
    }
    
    public static FileTypeNotSupportedForRequestException create(String fileName, String contentType, String requestType, String supportedTypes) {
        return new FileTypeNotSupportedForRequestException(
            RequestServiceErrorCodes.FILE_TYPE_NOT_SUPPORTED_FOR_REQUEST,
            String.format("File type '%s' (%s) is not supported for request type '%s'. Supported types: %s", 
                    fileName, contentType, requestType, supportedTypes)
        );
    }
}

