package com.mutrapro.identity_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ResetPasswordRequest {
    
    @Email(message = "Email must be valid")
    @NotBlank(message = "Email is required")
    String email;
    
    @NotBlank(message = "Token is required")
    String token;
    
    @NotBlank(message = "New password is required")
    String newPassword;
    
    @NotBlank(message = "Confirm password is required")
    String confirmPassword;
}

