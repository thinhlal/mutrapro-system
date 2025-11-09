package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.enums.UnitType;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

public class PricingMatrixNotFoundException extends ResourceNotFoundException {
    
    public PricingMatrixNotFoundException(String message) {
        super(RequestServiceErrorCodes.RESOURCE_NOT_FOUND, message);
    }
    
    public PricingMatrixNotFoundException(String message, String pricingId) {
        super(RequestServiceErrorCodes.RESOURCE_NOT_FOUND, message, 
              Map.of("pricingId", pricingId));
    }
    
    public static PricingMatrixNotFoundException byId(String pricingId) {
        return new PricingMatrixNotFoundException(
                "Pricing matrix not found with id: " + pricingId,
                pricingId
        );
    }
    
    public static PricingMatrixNotFoundException byServiceAndUnit(ServiceType serviceType, UnitType unitType) {
        return new PricingMatrixNotFoundException(
                String.format("Pricing matrix not found for service type: %s, unit type: %s", 
                        serviceType, unitType)
        );
    }
    
    public static PricingMatrixNotFoundException byServiceType(ServiceType serviceType) {
        return new PricingMatrixNotFoundException(
                String.format("Pricing matrix not found for service type: %s", serviceType)
        );
    }
}

