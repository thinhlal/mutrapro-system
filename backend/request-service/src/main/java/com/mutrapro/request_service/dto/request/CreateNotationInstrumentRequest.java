package com.mutrapro.request_service.dto.request;

import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateNotationInstrumentRequest {
    
    @NotBlank(message = "Instrument name is required")
    @Size(max = 100, message = "Instrument name must not exceed 100 characters")
    String instrumentName;
    
    @NotNull(message = "Usage is required")
    NotationInstrumentUsage usage;
    
    Boolean isActive;
    
    MultipartFile image;  // Optional image file
}

