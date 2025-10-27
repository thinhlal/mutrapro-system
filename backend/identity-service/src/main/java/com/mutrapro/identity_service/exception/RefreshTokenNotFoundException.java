package com.mutrapro.identity_service.exception;

import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

public class RefreshTokenNotFoundException extends BusinessException {

    public RefreshTokenNotFoundException(String message) {
        super(IdentityServiceErrorCodes.REFRESH_TOKEN_NOT_FOUND, message);
    }

    public static RefreshTokenNotFoundException create() {
        return new RefreshTokenNotFoundException("Refresh token not found in cookie");
    }
}

