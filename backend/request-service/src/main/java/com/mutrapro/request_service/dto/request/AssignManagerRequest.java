package com.mutrapro.request_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO cho việc manager nhận trách nhiệm về service request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class AssignManagerRequest {
    
    /**
     * ID của manager sẽ nhận trách nhiệm
     * Nếu null hoặc rỗng, sẽ sử dụng ID của user hiện tại (manager tự nhận)
     */
    String managerId;
}

