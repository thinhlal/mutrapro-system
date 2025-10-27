package com.mutrapro.identity_service.exception;

import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

public class TokenInvalidException extends BusinessException {

    public TokenInvalidException(String message) {
        super(IdentityServiceErrorCodes.TOKEN_INVALID, message);
    }

    public static TokenInvalidException create() {
        return new TokenInvalidException("The authentication token is invalid");
    }
}

