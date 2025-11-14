package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.UnauthorizedException;

/**
 * Exception khi user chưa được xác thực
 */
public class UserNotAuthenticatedException extends UnauthorizedException {

    public UserNotAuthenticatedException(String message) {
        super(BillingServiceErrorCodes.USER_NOT_AUTHENTICATED, message);
    }
    
    public static UserNotAuthenticatedException create() {
        return new UserNotAuthenticatedException(
            "User not authenticated"
        );
    }
}

