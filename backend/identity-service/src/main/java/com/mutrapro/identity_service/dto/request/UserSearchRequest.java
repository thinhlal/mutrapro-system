package com.mutrapro.identity_service.dto.request;

import com.mutrapro.shared.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchRequest {

    private String keyword; // Search in email, fullName, phone

    private Role role;

    private Boolean emailVerified;

    private Boolean isActive;

    private String authProvider; // LOCAL, GOOGLE

    @Builder.Default
    private Integer page = 0;

    @Builder.Default
    private Integer size = 20;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private String sortDirection = "DESC";
}

