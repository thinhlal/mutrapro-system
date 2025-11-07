package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy notation instrument
 */
public class NotationInstrumentNotFoundException extends ResourceNotFoundException {

    public NotationInstrumentNotFoundException(String message) {
        super(RequestServiceErrorCodes.RESOURCE_NOT_FOUND, message);
    }

    public NotationInstrumentNotFoundException(String message, String instrumentId) {
        super(RequestServiceErrorCodes.RESOURCE_NOT_FOUND, message, 
              Map.of("instrumentId", instrumentId));
    }

    public static NotationInstrumentNotFoundException byId(String instrumentId) {
        return new NotationInstrumentNotFoundException(
            "Notation instrument not found with ID: " + instrumentId,
            instrumentId
        );
    }
}

