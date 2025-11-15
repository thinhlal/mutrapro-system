package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

public class SamePasswordException extends BusinessException {
    public SamePasswordException() {
        super(IdentityServiceErrorCodes.SAME_PASSWORD, "New password cannot be the same as current password");
    }
}
