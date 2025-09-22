package com.mutrapro.shared.exception;

/**
 * Enum định nghĩa khả năng retry của exception
 */
public enum Retryable {
    
    /**
     * Lỗi tạm thời, có thể retry được
     * Ví dụ: network timeout, database connection timeout
     */
    TRANSIENT(true, "Lỗi tạm thời, có thể thử lại"),
    
    /**
     * Lỗi không tạm thời, không nên retry
     * Ví dụ: validation error, business logic error, authentication error
     */
    NON_TRANSIENT(false, "Lỗi không tạm thời, không nên thử lại"),
    
    /**
     * Không xác định, để hệ thống quyết định
     */
    UNKNOWN(null, "Không xác định khả năng retry");
    
    private final Boolean retryable;
    private final String description;
    
    Retryable(Boolean retryable, String description) {
        this.retryable = retryable;
        this.description = description;
    }
    
    /**
     * Kiểm tra xem có thể retry được không
     * @return true nếu có thể retry, false nếu không thể, null nếu không xác định
     */
    public Boolean isRetryable() {
        return retryable;
    }
    
    /**
     * Kiểm tra xem có thể retry được không (boolean rõ ràng)
     * @return true nếu chắc chắn có thể retry, false trong các trường hợp khác
     */
    public boolean canRetry() {
        return Boolean.TRUE.equals(retryable);
    }
    
    /**
     * Kiểm tra xem chắc chắn không thể retry
     * @return true nếu chắc chắn không thể retry, false trong các trường hợp khác
     */
    public boolean cannotRetry() {
        return Boolean.FALSE.equals(retryable);
    }
    
    /**
     * Lấy mô tả của retry type
     */
    public String getDescription() {
        return description;
    }
    
    /**
     * Tạo Retryable từ boolean value
     */
    public static Retryable fromBoolean(Boolean retryable) {
        if (retryable == null) {
            return UNKNOWN;
        }
        return retryable ? TRANSIENT : NON_TRANSIENT;
    }
}
