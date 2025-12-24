package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi review đã tồn tại cho assignment và customer
 */
public class ReviewAlreadyExistsException extends BusinessException {

    public ReviewAlreadyExistsException(String assignmentId, String customerId) {
        super(
            ProjectServiceErrorCodes.REVIEW_ALREADY_EXISTS,
            String.format("Review already exists for assignment %s by customer %s", assignmentId, customerId)
        );
    }

    public static ReviewAlreadyExistsException byAssignmentAndCustomer(String assignmentId, String customerId) {
        return new ReviewAlreadyExistsException(assignmentId, customerId);
    }
}

