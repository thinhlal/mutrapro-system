package com.mutrapro.request_service.dto.request;

import com.mutrapro.request_service.enums.ServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateServiceRequestRequest {
    
    @NotNull(message = "Request type is required")
    ServiceType requestType;
    
    @Size(max = 100, message = "Contact name must not exceed 100 characters")
    String contactName;  // Optional
    
    @Size(max = 20, message = "Contact phone must not exceed 20 characters")
    String contactPhone;  // Optional
    
    @Size(max = 100, message = "Contact email must not exceed 100 characters")
    String contactEmail;  // Optional
    
    List<String> genres;  // Optional - Danh sách genres (VD: ["Pop", "Rock"]) cho arrangement
    
    String purpose;  // Optional - Mục đích (VD: "karaoke_cover", "performance") cho arrangement
    
    BigDecimal tempoPercentage;  // Optional - VD: 80.00, 50.00 (tốc độ phát cho transcription)
    
    BigDecimal durationMinutes;  // Optional - Độ dài audio file (phút) - dùng để tính giá transcription
    
    Boolean hasVocalist;  // Optional - Customer có chọn ca sĩ cho arrangement_with_recording
    
    Integer externalGuestCount;  // Optional - Số người customer mang theo cho studio booking
    
    @Size(max = 200, message = "Title must not exceed 200 characters")
    String title;  // Optional
    
    @NotBlank(message = "Description is required")
    @Size(min = 10, message = "Description must be at least 10 characters")
    String description;
    
    List<String> instrumentIds;  // Optional - Danh sách instrument IDs mà customer chọn
    
    List<MultipartFile> files;  // Optional - Files: audio cho transcription, PDF/MusicXML/MIDI cho arrangement
}
