package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

/**
 * Exception khi tài khoản chưa có mật khẩu local
 */
public class NoLocalPasswordException extends BusinessException {

    public NoLocalPasswordException(String message) {
        super(IdentityServiceErrorCodes.NO_LOCAL_PASSWORD, message);
    }

    public static NoLocalPasswordException create() {
        return new NoLocalPasswordException("No local password set. Please sign in with Google or create a password.");
    }
}


