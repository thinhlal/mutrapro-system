package com.mutrapro.identity_service.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpdateFullUserRequest {
    // users table fields
    @Size(max = 100, message = "Full name must not exceed 100 characters")
    private String fullName;

    @Pattern(regexp = "^\\d{10}$", message = "Phone number must be exactly 10 digits")
    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phone;

    private String address;

    private String avatarUrl;

    private Boolean isActive;

    // users_auth table fields (restricted)
    private Boolean emailVerified;
}


