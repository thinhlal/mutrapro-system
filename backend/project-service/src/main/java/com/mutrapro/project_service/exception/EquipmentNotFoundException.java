package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy equipment
 */
public class EquipmentNotFoundException extends ResourceNotFoundException {

    public EquipmentNotFoundException(String message) {
        super(ProjectServiceErrorCodes.EQUIPMENT_NOT_FOUND, message);
    }

    public EquipmentNotFoundException(String message, String equipmentId) {
        super(ProjectServiceErrorCodes.EQUIPMENT_NOT_FOUND, message, 
              Map.of("equipmentId", equipmentId));
    }

    public static EquipmentNotFoundException byId(String equipmentId) {
        return new EquipmentNotFoundException(
            "Equipment not found with ID: " + equipmentId,
            equipmentId
        );
    }
}

