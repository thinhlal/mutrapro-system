package com.mutrapro.identity_service.controller;

import jakarta.validation.Valid;
import com.mutrapro.identity_service.dto.request.AuthenticationRequest;
import com.mutrapro.identity_service.dto.request.IntrospectRequest;
import com.mutrapro.identity_service.dto.request.LogoutRequest;
import com.mutrapro.identity_service.dto.request.RegisterRequest;
import com.mutrapro.identity_service.dto.response.AuthenticationResponse;
import com.mutrapro.identity_service.dto.response.IntrospectResponse;
import com.mutrapro.identity_service.dto.response.RegisterResponse;
import com.mutrapro.identity_service.service.AuthenticationService;
import com.mutrapro.shared.dto.ApiResponse;
import com.nimbusds.jose.JOSEException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.text.ParseException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationController {

    AuthenticationService authenticationService;

    @PostMapping("/log-in")
    ApiResponse<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest request){
        var result = authenticationService.authenticate(request);
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
    ApiResponse<Void> logout(@RequestBody LogoutRequest request) 
            throws ParseException, JOSEException {
        authenticationService.logout(request);
        return ApiResponse.<Void>builder()
                .message("Logout successfully!!!")
                .build();
    }
}

