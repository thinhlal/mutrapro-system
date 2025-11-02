package com.mutrapro.shared.exception;

import com.mutrapro.shared.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global Exception Handler cho toàn bộ microservice system
 * Xử lý tất cả các loại exception và trả về response thống nhất
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @Value("${spring.application.name:unknown}")
    private String serviceName;
    
    /**
     * Xử lý các custom MicroserviceException
     */
    @ExceptionHandler(MicroserviceException.class)
    public ResponseEntity<ApiResponse<Void>> handleMicroserviceException(
            MicroserviceException ex, HttpServletRequest request) {
        
        log.warn("Microservice exception occurred: {}", ex.getMessage(), ex);
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(ex.getErrorCodeString())
                .message(ex.getMessage())
                .details(ex.getDetails())
                .path(request.getRequestURI())
                .statusCode(ex.getHttpStatus())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.status(ex.getHttpStatus());
        
        // Thêm Retry-After header nếu retryable
        if (ex.canRetry()) {
            responseBuilder.header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()));
        }
        
        return responseBuilder.body(errorResponse);
    }
    
    /**
     * Xử lý DataIntegrityViolationException (vi phạm ràng buộc CSDL)
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        log.warn("Data integrity violation: {}", ex.getMessage());
        ex.getMostSpecificCause();
        String mostSpecific = ex.getMostSpecificCause().getMessage();

        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.DATABASE_CONSTRAINT_VIOLATION.getCode())
                .message("Data integrity violation")
                .details(Map.of("error", mostSpecific))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.CONFLICT.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }

    /**
     * Xử lý DataAccessException tổng quát (lỗi truy cập CSDL)
     */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataAccess(
            DataAccessException ex, HttpServletRequest request) {
        log.error("Database access error: {}", ex.getMessage(), ex);
        ex.getMostSpecificCause();
        String mostSpecific = ex.getMostSpecificCause().getMessage();

        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.DATABASE_CONNECTION_ERROR.getCode())
                .message("Database access error")
                .details(Map.of("error", mostSpecific))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    /**
     * Xử lý ValidationException với validation errors
     */
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(
            ValidationException ex, HttpServletRequest request) {
        
        log.warn("Validation exception occurred: {}", ex.getMessage(), ex);
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(ex.getErrorCodeString())
                .message(ex.getMessage())
                .details(ex.getDetails())
                .path(request.getRequestURI())
                .statusCode(ex.getHttpStatus())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.status(ex.getHttpStatus()).body(errorResponse);
    }
    
    /**
     * Xử lý MethodArgumentNotValidException (Spring validation)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        
        log.warn("Method argument validation failed: {}", ex.getMessage());
        
        List<ApiResponse.ValidationError> validationErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::mapToValidationError)
                .collect(Collectors.toList());
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.VALIDATION_ERROR.getCode())
                .message("Validation failed")
                .path(request.getRequestURI())
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .validationErrors(validationErrors)
                .build();
        
        return ResponseEntity.badRequest().body(errorResponse);
    }
    
    /**
     * Xử lý ConstraintViolationException (Bean validation)
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(
            ConstraintViolationException ex, HttpServletRequest request) {
        
        log.warn("Constraint violation occurred: {}", ex.getMessage());
        
        List<ApiResponse.ValidationError> validationErrors = ex.getConstraintViolations()
                .stream()
                .map(this::mapToValidationError)
                .collect(Collectors.toList());
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.VALIDATION_ERROR.getCode())
                .message("Constraint validation failed")
                .path(request.getRequestURI())
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .validationErrors(validationErrors)
                .build();
        
        return ResponseEntity.badRequest().body(errorResponse);
    }
    
    /**
     * Xử lý AuthenticationException
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(
            AuthenticationException ex, HttpServletRequest request) {
        
        log.warn("Authentication failed: {}", ex.getMessage());
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.UNAUTHORIZED.getCode())
                .message("Authentication failed")
                .details(Map.of("error", ex.getMessage()))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.UNAUTHORIZED.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }
    
    /**
     * Xử lý AccessDeniedException
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(
            AccessDeniedException ex, HttpServletRequest request) {
        
        log.warn("Access denied: {}", ex.getMessage());
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.FORBIDDEN.getCode())
                .message("Access denied")
                .details(Map.of("error", ex.getMessage()))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.FORBIDDEN.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }
    
    /**
     * Xử lý BadCredentialsException
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(
            BadCredentialsException ex, HttpServletRequest request) {
        
        log.warn("Bad credentials: {}", ex.getMessage());
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.UNAUTHORIZED.getCode())
                .message("Invalid credentials")
                .path(request.getRequestURI())
                .statusCode(HttpStatus.UNAUTHORIZED.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }
    
    /**
     * Xử lý HttpMessageNotReadableException
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        
        log.warn("HTTP message not readable: {}", ex.getMessage());
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.VALIDATION_ERROR.getCode())
                .message("Invalid request body format")
                .details(Map.of("error", ex.getMessage()))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.badRequest().body(errorResponse);
    }
    
    /**
     * Xử lý MethodArgumentTypeMismatchException
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        
        log.warn("Method argument type mismatch: {}", ex.getMessage());
        
        String message = String.format("Parameter '%s' should be of type %s", 
                ex.getName(), ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown");
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.VALIDATION_ERROR.getCode())
                .message("Invalid parameter type")
                .details(Map.of("error", message))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.badRequest().body(errorResponse);
    }
    
    /**
     * Xử lý MissingServletRequestParameterException
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingServletRequestParameter(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        
        log.warn("Missing request parameter: {}", ex.getMessage());
        
        String message = String.format("Required parameter '%s' is missing", ex.getParameterName());
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.VALIDATION_ERROR.getCode())
                .message("Missing required parameter")
                .details(Map.of("error", message))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.badRequest().body(errorResponse);
    }
    
    /**
     * Xử lý HttpRequestMethodNotSupportedException
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpRequestMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        
        log.warn("HTTP method not supported: {}", ex.getMessage());

        assert ex.getSupportedMethods() != null;
        String message = String.format("Method '%s' is not supported. Supported methods: %s",
                ex.getMethod(), String.join(", ", ex.getSupportedMethods()));
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.VALIDATION_ERROR.getCode())
                .message("HTTP method not supported")
                .details(Map.of("error", message))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.METHOD_NOT_ALLOWED.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(errorResponse);
    }
    
    /**
     * Xử lý NoHandlerFoundException
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoHandlerFound(
            NoHandlerFoundException ex, HttpServletRequest request) {
        
        log.warn("No handler found: {}", ex.getMessage());
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.RESOURCE_NOT_FOUND.getCode())
                .message("Endpoint not found")
                .details(Map.of("error", String.format("No handler found for %s %s", ex.getHttpMethod(), ex.getRequestURL())))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.NOT_FOUND.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }
    
    /**
     * Xử lý HttpMediaTypeNotSupportedException (Content-Type không được support)
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        
        log.warn("HTTP media type not supported: {}", ex.getMessage());
        
        String message = String.format("Content-Type '%s' is not supported. Required: %s",
                ex.getContentType(),
                ex.getSupportedMediaTypes() != null && !ex.getSupportedMediaTypes().isEmpty()
                        ? ex.getSupportedMediaTypes().get(0)
                        : "application/json");
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.VALIDATION_ERROR.getCode())
                .message("Unsupported media type")
                .details(Map.of("error", message))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.UNSUPPORTED_MEDIA_TYPE.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(errorResponse);
    }
    
    /**
     * Xử lý tất cả các exception khác (fallback)
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(
            Exception ex, HttpServletRequest request) {
        
        log.error("Unexpected error occurred: {}", ex.getMessage(), ex);
        
        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.INTERNAL_SERVER_ERROR.getCode())
                .message("An unexpected error occurred")
                .details(Map.of("error", "Please contact support if the problem persists"))
                .path(request.getRequestURI())
                .statusCode(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .timestamp(LocalDateTime.now())
                .serviceName(serviceName)
                .traceId(getTraceId(request))
                .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
    
    /**
     * Helper method để map FieldError thành ValidationError
     */
    private ApiResponse.ValidationError mapToValidationError(FieldError fieldError) {
        return ApiResponse.ValidationError.builder()
                .field(fieldError.getField())
                .rejectedValue(fieldError.getRejectedValue())
                .message(fieldError.getDefaultMessage())
                .build();
    }
    
    /**
     * Helper method để map ConstraintViolation thành ValidationError
     */
    private ApiResponse.ValidationError mapToValidationError(ConstraintViolation<?> violation) {
        return ApiResponse.ValidationError.builder()
                .field(getFieldName(violation.getPropertyPath().toString()))
                .rejectedValue(violation.getInvalidValue())
                .message(violation.getMessage())
                .build();
    }
    
    /**
     * Helper method để extract field name từ property path
     */
    private String getFieldName(String propertyPath) {
        if (propertyPath == null || propertyPath.isEmpty()) {
            return "unknown";
        }
        String[] parts = propertyPath.split("\\.");
        return parts[parts.length - 1];
    }
    
    /**
     * Helper method để lấy trace ID từ request
     */
    private String getTraceId(HttpServletRequest request) {
        String traceId = request.getHeader("X-Trace-Id");
        if (traceId == null || traceId.isEmpty()) {
            traceId = request.getHeader("X-Request-Id");
        }
        return traceId != null ? traceId : "unknown";
    }
}