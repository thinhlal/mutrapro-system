package com.mutrapro.chat_service.exception;

import com.mutrapro.shared.exception.CommonErrorCodes;

public class UnauthorizedException extends com.mutrapro.shared.exception.UnauthorizedException {
    
    private UnauthorizedException(String message) {
        super(CommonErrorCodes.UNAUTHORIZED, message);
    }
    
    public static UnauthorizedException create() {
        return new UnauthorizedException("User is not authenticated");
    }
    
    public static UnauthorizedException create(String message) {
        return new UnauthorizedException(message);
    }
}

