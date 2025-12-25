package com.mutrapro.identity_service.dto.request;

import com.mutrapro.shared.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Request DTO cho admin tạo user mới (bao gồm cả users và users_auth)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateFullUserRequest {
    
    @NotBlank(message = "Full name is required")
    @Size(max = 100, message = "Full name must not exceed 100 characters")
    String fullName;
    
    @Pattern(regexp = "^\\d{10}$", message = "Phone number must be exactly 10 digits")
    String phone; // Optional
    
    String address;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    String password;
    
    @NotNull(message = "Role is required")
    Role role;
    
    Boolean emailVerified; // Optional, default false
    Boolean isActive; // Optional, default true
}

