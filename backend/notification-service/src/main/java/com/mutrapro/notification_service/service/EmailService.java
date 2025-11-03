package com.mutrapro.notification_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Email Service để gửi email verification code
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.email.from-name:MuTraPro}")
    private String fromName;

    /**
     * Gửi email verification code
     */
    public void sendVerificationCode(String toEmail, String otp, String fullName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromName + " <" + fromEmail + ">");
            message.setTo(toEmail);
            message.setSubject("Xác thực email của bạn - MuTraPro");
            
            String emailBody = String.format(
                "Xin chào %s,\n\n" +
                "Cảm ơn bạn đã đăng ký tài khoản tại MuTraPro!\n\n" +
                "Mã xác thực email của bạn là: %s\n\n" +
                "Mã này sẽ hết hạn sau 15 phút.\n\n" +
                "Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.\n\n" +
                "Trân trọng,\n" +
                "Đội ngũ MuTraPro",
                fullName, otp
            );
            
            message.setText(emailBody);
            
            mailSender.send(message);
            
            log.info("Verification email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send verification email", e);
        }
    }
}

