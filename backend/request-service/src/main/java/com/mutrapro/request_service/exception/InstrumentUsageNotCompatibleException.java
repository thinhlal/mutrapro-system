package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

public class InstrumentUsageNotCompatibleException extends BusinessException {
    
    private InstrumentUsageNotCompatibleException(RequestServiceErrorCodes errorCode, String message) {
        super(errorCode, message);
    }
    
    public static InstrumentUsageNotCompatibleException create(String instrumentName, String instrumentUsage, String requestType) {
        return new InstrumentUsageNotCompatibleException(
            RequestServiceErrorCodes.INSTRUMENT_USAGE_NOT_COMPATIBLE,
            String.format("Instrument '%s' with usage '%s' is not compatible with request type '%s'", 
                    instrumentName, instrumentUsage, requestType)
        );
    }
}

