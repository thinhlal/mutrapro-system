package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi contract không có customer user ID
 */
public class MissingCustomerUserIdException extends BusinessException {

    public MissingCustomerUserIdException(String message) {
        super(ProjectServiceErrorCodes.MISSING_CUSTOMER_USER_ID, message);
    }

    public static MissingCustomerUserIdException inContract() {
        return new MissingCustomerUserIdException("Contract does not have customer user ID");
    }
}

