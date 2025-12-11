package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi equipment bị trùng (brand + model)
 */
public class EquipmentDuplicateException extends BusinessException {

    public EquipmentDuplicateException(String message) {
        super(RequestServiceErrorCodes.DUPLICATE_RESOURCE, message);
    }

    public static EquipmentDuplicateException create(String brand, String model) {
        return new EquipmentDuplicateException(
            "Equipment already exists with brand: " + brand + ", model: " + model
        );
    }
}

