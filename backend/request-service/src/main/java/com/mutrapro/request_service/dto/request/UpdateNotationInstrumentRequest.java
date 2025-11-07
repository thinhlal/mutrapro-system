package com.mutrapro.request_service.dto.request;

import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateNotationInstrumentRequest {
    
    @Size(max = 100, message = "Instrument name must not exceed 100 characters")
    String instrumentName;  // Optional
    
    NotationInstrumentUsage usage;  // Optional
    
    Boolean isActive;  // Optional
    
    MultipartFile image;  // Optional - có thể update image cùng lúc
}

