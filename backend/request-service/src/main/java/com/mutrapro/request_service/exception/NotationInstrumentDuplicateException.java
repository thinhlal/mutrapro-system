package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi tên nhạc cụ ký âm đã tồn tại
 */
public class NotationInstrumentDuplicateException extends BusinessException {

    public NotationInstrumentDuplicateException(String message) {
        super(RequestServiceErrorCodes.INSTRUMENT_NAME_DUPLICATE, message);
    }

    public NotationInstrumentDuplicateException(String message, String instrumentName) {
        super(RequestServiceErrorCodes.INSTRUMENT_NAME_DUPLICATE, message, "instrumentName", instrumentName);
    }

    public static NotationInstrumentDuplicateException create(String instrumentName) {
        return new NotationInstrumentDuplicateException(
            "Instrument name already exists: " + instrumentName,
            instrumentName
        );
    }
}

