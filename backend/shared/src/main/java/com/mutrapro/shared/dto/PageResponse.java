package com.mutrapro.shared.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;

import java.util.List;

import static lombok.AccessLevel.PRIVATE;

/**
 * DTO wrapper cho Spring Data Page để đảm bảo cấu trúc JSON ổn định
 * Sử dụng thay vì serialize Page trực tiếp để tránh warning
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class PageResponse<T> {
    
    List<T> content;
    
    int pageNumber;
    
    int pageSize;
    
    long totalElements;
    
    int totalPages;
    
    boolean first;
    
    boolean last;
    
    boolean hasNext;
    
    boolean hasPrevious;
    
    /**
     * Convert Spring Data Page to PageResponse
     */
    public static <T> PageResponse<T> from(Page<T> page) {
        return PageResponse.<T>builder()
                .content(page.getContent())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }
}

