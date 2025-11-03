package com.mutrapro.identity_service.controller;

import com.mutrapro.identity_service.dto.response.ResendVerificationInfo;
import com.mutrapro.identity_service.dto.response.VerificationResponse;
import com.mutrapro.identity_service.dto.response.VerificationStatusResponse;
import com.mutrapro.identity_service.service.EmailVerificationService;
import com.mutrapro.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class EmailVerificationController {

    private final EmailVerificationService emailVerificationService;

    /**
     * Verify email with OTP code
     * POST /users/verify-email?code=123456&email=user@example.com
     */
    @PostMapping("/verify-email")
    public ApiResponse<Void> verifyEmail(@RequestParam String code, @RequestParam String email) {
        log.info("Verifying email with code for email: {}", email);
        emailVerificationService.verifyEmail(code, email);
        return ApiResponse.<Void>builder()
                .message("Email verified successfully")
                .build();
    }

    /**
     * Resend verification code
     * POST /users/resend-verification?email=user@example.com
     */
    @PostMapping("/resend-verification")
    public ApiResponse<ResendVerificationInfo> resendVerificationCode(@RequestParam String email) {
        log.info("Resending verification code for email: {}", email);
        VerificationResponse response = emailVerificationService.resendVerificationCode(email);
        return ApiResponse.<ResendVerificationInfo>builder()
                .message(response.getMessage())
                .data(response.getResult())
                .build();
    }

    /**
     * Get verification status
     * GET /users/verification-status?email=user@example.com
     */
    @GetMapping("/verification-status")
    public ApiResponse<VerificationStatusResponse> getVerificationStatus(@RequestParam String email) {
        log.info("Getting verification status for email: {}", email);
        VerificationStatusResponse status = emailVerificationService.getVerificationStatus(email);
        return ApiResponse.<VerificationStatusResponse>builder()
                .message("Verification status retrieved successfully")
                .data(status)
                .build();
    }
}

