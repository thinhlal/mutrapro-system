package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.shared.exception.BusinessException;

public class PricingMatrixNotAllowedException extends BusinessException {
    
    public PricingMatrixNotAllowedException(String message) {
        super(RequestServiceErrorCodes.FILE_TYPE_NOT_SUPPORTED_FOR_REQUEST, message);
    }
    
    public PricingMatrixNotAllowedException(String message, ServiceType serviceType) {
        super(RequestServiceErrorCodes.FILE_TYPE_NOT_SUPPORTED_FOR_REQUEST, message, 
              "serviceType", serviceType.toString());
    }
    
    public static PricingMatrixNotAllowedException forRecording() {
        return new PricingMatrixNotAllowedException(
            "Cannot create or manage pricing matrix for recording service. " +
            "Recording pricing is dynamic (studio hourlyRate × durationHours) and " +
            "contract price is calculated from booking.totalCost, not pricing matrix.",
            ServiceType.recording
        );
    }
}

