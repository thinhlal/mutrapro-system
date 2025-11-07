package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

public class InstrumentsRequiredException extends BusinessException {
    
    private InstrumentsRequiredException(RequestServiceErrorCodes errorCode, String message) {
        super(errorCode, message);
    }
    
    public static InstrumentsRequiredException create(String requestType) {
        return new InstrumentsRequiredException(
            RequestServiceErrorCodes.INSTRUMENTS_REQUIRED,
            String.format("At least one notation instrument is required for request type: %s", requestType)
        );
    }
}

