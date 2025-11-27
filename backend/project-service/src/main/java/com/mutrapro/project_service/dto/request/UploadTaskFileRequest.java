package com.mutrapro.project_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class UploadTaskFileRequest {
    
    @NotBlank(message = "Assignment ID is required")
    String assignmentId;
    
    String description;  // Optional description/note for this file
    
    String contentType;  // e.g., "notation", "audio", "document"
}

