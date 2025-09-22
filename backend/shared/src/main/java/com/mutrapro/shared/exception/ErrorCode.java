package com.mutrapro.shared.exception;

/**
 * Interface định nghĩa error code cho exception
 * Mỗi service sẽ có enum riêng implement interface này
 */
public interface ErrorCode {
    
    /**
     * Mã lỗi duy nhất
     * @return error code string
     */
    String getCode();
    
    /**
     * HTTP status code tương ứng
     * @return HTTP status code
     */
    int getHttpStatus();
    
    /**
     * URI mô tả chi tiết về lỗi (có thể là link đến documentation)
     * @return URI string, có thể null
     */
    String getType();
    
    /**
     * Mô tả ngắn gọn về lỗi
     * @return error description
     */
    String getDescription();
    
    /**
     * Xác định khả năng retry của lỗi này
     * @return Retryable enum
     */
    default Retryable getRetryable() {
        return Retryable.UNKNOWN;
    }
    
    /**
     * Thời gian retry sau (giây) nếu lỗi có thể retry
     * @return retry after seconds, chỉ có ý nghĩa khi getRetryable() == TRANSIENT
     */
    default long getRetryAfterSeconds() {
        return 30; // Default 30 seconds
    }
}
