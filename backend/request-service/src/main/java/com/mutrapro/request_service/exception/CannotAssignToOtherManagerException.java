package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.ForbiddenException;

/**
 * Exception khi manager cố gắng assign request cho người khác khi tự nhận
 */
public class CannotAssignToOtherManagerException extends ForbiddenException {

    public CannotAssignToOtherManagerException(String message) {
        super(RequestServiceErrorCodes.CANNOT_ASSIGN_TO_OTHER_MANAGER, message);
    }

    public static CannotAssignToOtherManagerException create(String requestedManagerId, String currentUserId) {
        return new CannotAssignToOtherManagerException(
            String.format("Manager can only assign requests to themselves. Requested managerId: %s, Current userId: %s", 
                    requestedManagerId, currentUserId)
        );
    }
}

