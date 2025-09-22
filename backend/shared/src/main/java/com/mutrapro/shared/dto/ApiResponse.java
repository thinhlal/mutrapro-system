package com.mutrapro.shared.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Class chung cho tất cả API responses
 * Hỗ trợ cả success và error responses trong 1 class
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    
    /**
     * Trạng thái của response (success, error)
     */
    @Builder.Default
    private String status = "success";
    
    /**
     * Mã lỗi (chỉ có khi status = "error")
     */
    private String errorCode;
    
    /**
     * Thông điệp chính
     */
    private String message;
    
    /**
     * Dữ liệu trả về (chỉ có khi status = "success")
     */
    private T data;
    
    /**
     * Chi tiết lỗi (chỉ có khi status = "error")
     */
    private Map<String, Object> details;
    
    /**
     * Validation errors (chỉ có khi status = "error" và có validation errors)
     */
    private List<ValidationError> validationErrors;
    
    /**
     * Thông tin bổ sung
     */
    private Map<String, Object> additionalInfo;
    
    /**
     * Đường dẫn API
     */
    private String path;
    
    /**
     * HTTP status code
     */
    @Builder.Default
    private Integer statusCode = 200;
    
    /**
     * Timestamp
     */
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    
    /**
     * Tên service
     */
    private String serviceName;
    
    /**
     * Trace ID để tracking
     */
    private String traceId;
    
    /**
     * Pagination info (chỉ có khi có pagination)
     */
    private PaginationInfo pagination;
    
    /**
     * Metadata (chỉ có khi cần thiết)
     */
    private Map<String, Object> metadata;
    
    
    // ===========================================
    // BUILDER METHODS
    // ===========================================
    
    /**
     * Thêm path vào response
     */
    public ApiResponse<T> withPath(String path) {
        this.path = path;
        return this;
    }
    
    /**
     * Thêm service name vào response
     */
    public ApiResponse<T> withServiceName(String serviceName) {
        this.serviceName = serviceName;
        return this;
    }
    
    /**
     * Thêm trace ID vào response
     */
    public ApiResponse<T> withTraceId(String traceId) {
        this.traceId = traceId;
        return this;
    }
    
    /**
     * Thêm metadata vào response
     */
    public ApiResponse<T> withMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
        return this;
    }
    
    /**
     * Thêm pagination vào response
     */
    public ApiResponse<T> withPagination(PaginationInfo pagination) {
        this.pagination = pagination;
        return this;
    }
    
    // ===========================================
    // INNER CLASSES
    // ===========================================
    
    /**
     * Class cho validation error
     */
    @Data
    @Builder
    public static class ValidationError {
        private String field;
        private String message;
        private Object rejectedValue;
        private String code;
    }
    
    /**
     * Class cho pagination info
     */
    @Data
    @Builder
    public static class PaginationInfo {
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
        private boolean hasNext;
        private boolean hasPrevious;
        private boolean isFirst;
        private boolean isLast;
        
        /**
         * Factory method để tạo PaginationInfo
         */
        public static PaginationInfo of(int page, int size, long totalElements) {
            int totalPages = (int) Math.ceil((double) totalElements / size);
            return PaginationInfo.builder()
                    .page(page)
                    .size(size)
                    .totalElements(totalElements)
                    .totalPages(totalPages)
                    .hasNext(page < totalPages - 1)
                    .hasPrevious(page > 0)
                    .isFirst(page == 0)
                    .isLast(page == totalPages - 1)
                    .build();
        }
    }
}
