package com.mutrapro.auth_service.dto.request;

import lombok.Data;

@Data
public class AuthenticationRequest {
    private String usernameOrEmail;
    private String password;
}
