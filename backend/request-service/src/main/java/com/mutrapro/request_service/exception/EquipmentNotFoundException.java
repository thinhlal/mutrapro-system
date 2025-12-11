package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy equipment
 */
public class EquipmentNotFoundException extends ResourceNotFoundException {

    public EquipmentNotFoundException(String message) {
        super(RequestServiceErrorCodes.RESOURCE_NOT_FOUND, message);
    }

    public EquipmentNotFoundException(String message, String equipmentId) {
        super(RequestServiceErrorCodes.RESOURCE_NOT_FOUND, message, 
              Map.of("equipmentId", equipmentId));
    }

    public static EquipmentNotFoundException byId(String equipmentId) {
        return new EquipmentNotFoundException(
            "Equipment not found with ID: " + equipmentId,
            equipmentId
        );
    }
}

