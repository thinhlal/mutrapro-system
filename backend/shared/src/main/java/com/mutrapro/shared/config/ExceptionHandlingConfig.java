package com.mutrapro.shared.config;

import com.mutrapro.shared.exception.GlobalExceptionHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration class cho Exception Handling
 * Auto-configure GlobalExceptionHandler nếu chưa có
 * 
 * Lưu ý: Chỉ sử dụng @Bean với @ConditionalOnMissingBean
 * Không sử dụng @Import để tránh xung đột khi user muốn override
 */
@Slf4j
@Configuration
public class ExceptionHandlingConfig {
    
    /**
     * Bean để đảm bảo GlobalExceptionHandler được register
     * Chỉ tạo nếu user chưa định nghĩa bean này
     */
    @Bean
    @ConditionalOnMissingBean(GlobalExceptionHandler.class)
    public GlobalExceptionHandler globalExceptionHandler() {
        log.info("Registering GlobalExceptionHandler");
        return new GlobalExceptionHandler();
    }
}
