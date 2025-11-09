package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.enums.UnitType;
import com.mutrapro.shared.exception.BusinessException;

public class PricingMatrixDuplicateException extends BusinessException {
    
    public PricingMatrixDuplicateException(String message) {
        super(RequestServiceErrorCodes.DUPLICATE_RESOURCE, message);
    }
    
    public PricingMatrixDuplicateException(String message, ServiceType serviceType, UnitType unitType) {
        super(RequestServiceErrorCodes.DUPLICATE_RESOURCE, message, 
              "serviceType", serviceType.toString());
    }
    
    public static PricingMatrixDuplicateException create(ServiceType serviceType, UnitType unitType) {
        return new PricingMatrixDuplicateException(
                String.format("Pricing matrix already exists for service type: %s, unit type: %s", 
                        serviceType, unitType),
                serviceType,
                unitType
        );
    }
    
    public static PricingMatrixDuplicateException create(ServiceType serviceType) {
        return new PricingMatrixDuplicateException(
                String.format("Pricing matrix already exists for service type: %s. Each service type can only have one pricing matrix.", 
                        serviceType),
                serviceType,
                null
        );
    }
}

