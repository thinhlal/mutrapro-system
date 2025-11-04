package com.mutrapro.identity_service.controller;

import jakarta.validation.Valid;
import com.mutrapro.identity_service.dto.request.AuthenticationRequest;
import com.mutrapro.identity_service.dto.request.IntrospectRequest;
import com.mutrapro.identity_service.dto.request.LogoutRequest;
import com.mutrapro.identity_service.dto.request.RegisterRequest;
import com.mutrapro.identity_service.dto.request.ResetPasswordRequest;
import com.mutrapro.identity_service.dto.response.AuthenticationResponse;
import com.mutrapro.identity_service.dto.response.IntrospectResponse;
import com.mutrapro.identity_service.dto.response.RegisterResponse;
import com.mutrapro.identity_service.service.AuthenticationService;
import com.mutrapro.identity_service.service.PasswordResetService;
import com.mutrapro.shared.dto.ApiResponse;
import com.nimbusds.jose.JOSEException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.text.ParseException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationController {

    AuthenticationService authenticationService;
    PasswordResetService passwordResetService;

    @PostMapping("/log-in")
    ApiResponse<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest request, HttpServletResponse response){
        var result = authenticationService.authenticate(request, response);
        return ApiResponse.<AuthenticationResponse>builder()
                .data(result)
                .message("Login successfully!!!")
                .build();
    }

    @PostMapping("/register")
    ApiResponse<RegisterResponse> register(@Valid @RequestBody RegisterRequest request){
        var result = authenticationService.register(request);
        return ApiResponse.<RegisterResponse>builder()
                .data(result)
                .message("Register successfully!!!")
                .build();
    }

    @PostMapping("/introspect")
    ApiResponse<IntrospectResponse> introspect(@RequestBody IntrospectRequest request)
            throws JOSEException, ParseException {
        var result = authenticationService.introspect(request);
        return ApiResponse.<IntrospectResponse>builder()
                .data(result)
                .build();
    }

    @PostMapping("/logout")
    ApiResponse<Void> logout(@RequestBody LogoutRequest request, HttpServletResponse response) 
            throws ParseException, JOSEException {
        authenticationService.logout(request, response);
        return ApiResponse.<Void>builder()
                .message("Logout successfully!!!")
                .build();
    }
    
    @PostMapping("/refresh")
    ApiResponse<AuthenticationResponse> refreshToken(HttpServletRequest request, HttpServletResponse response)
            throws JOSEException, ParseException {
        var result = authenticationService.refreshToken(request, response);
        return ApiResponse.<AuthenticationResponse>builder()
                .data(result)
                .message("Token refreshed successfully!!!")
                .build();
    }
    
    @PostMapping("/forgot-password")
    ApiResponse<Void> forgotPassword(@RequestParam String email) {
        passwordResetService.forgotPassword(email);
        return ApiResponse.<Void>builder()
                .message("Password reset link sent to your email")
                .build();
    }
    
    @PostMapping("/reset-password")
    ApiResponse<Void> resetPassword(@RequestBody @Valid ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return ApiResponse.<Void>builder()
                .message("Password reset successfully")
                .build();
    }
}

