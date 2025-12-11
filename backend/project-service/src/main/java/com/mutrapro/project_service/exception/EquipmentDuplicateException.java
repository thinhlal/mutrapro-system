package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi equipment bị trùng (brand + model)
 */
public class EquipmentDuplicateException extends BusinessException {

    public EquipmentDuplicateException(String message) {
        super(ProjectServiceErrorCodes.EQUIPMENT_DUPLICATE, message);
    }

    public static EquipmentDuplicateException create(String brand, String model) {
        return new EquipmentDuplicateException(
            "Equipment already exists with brand: " + brand + ", model: " + model
        );
    }
}

