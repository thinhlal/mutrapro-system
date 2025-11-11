package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi duration minutes không được cung cấp hoặc không hợp lệ cho transcription
 */
public class DurationRequiredException extends BusinessException {

    public DurationRequiredException(String message) {
        super(RequestServiceErrorCodes.DURATION_REQUIRED, message);
    }

    public static DurationRequiredException create() {
        return new DurationRequiredException("Duration minutes is required for transcription");
    }
}

