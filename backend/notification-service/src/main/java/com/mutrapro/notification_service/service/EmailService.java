package com.mutrapro.notification_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Locale;

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
    
    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

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

    /**
     * Gửi email password reset link
     */
    public void sendPasswordResetLink(String toEmail, String fullName, String resetToken, Long expiryHours) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromName + " <" + fromEmail + ">");
            message.setTo(toEmail);
            message.setSubject("Đặt lại mật khẩu - MuTraPro");
            
            // Construct reset URL with email and token
            String resetUrl = String.format(
                "%s/reset-password?email=%s&token=%s",
                frontendUrl,
                java.net.URLEncoder.encode(toEmail, java.nio.charset.StandardCharsets.UTF_8),
                resetToken
            );
            
            String emailBody = String.format(
                "Xin chào %s,\n\n" +
                "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\n" +
                "Để đặt lại mật khẩu, vui lòng click vào link sau:\n" +
                "%s\n\n" +
                "Link này sẽ hết hạn sau %d giờ.\n\n" +
                "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\n" +
                "Trân trọng,\n" +
                "Đội ngũ MuTraPro",
                fullName, resetUrl, expiryHours
            );
            
            message.setText(emailBody);
            
            mailSender.send(message);
            
            log.info("Password reset email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }

    /**
     * Gửi email OTP cho contract signing
     */
    public void sendContractOtpEmail(String toEmail, String customerName, String contractDisplay,
                                     String otpCode, Long expiresInMinutes, Integer maxAttempts) {
        try {
            long ttl = expiresInMinutes != null && expiresInMinutes > 0 ? expiresInMinutes : 5L;
            int attempts = maxAttempts != null && maxAttempts > 0 ? maxAttempts : 3;

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromName + " <" + fromEmail + ">");
            helper.setTo(toEmail);
            helper.setSubject("OTP Code for Contract E-Signature");

            String body = String.format("""
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <h2 style="color: #1890ff;">MuTraPro - Contract E-Signature</h2>

                        <p>Dear <strong>%s</strong>,</p>

                        <p>You are about to electronically sign the contract <strong>%s</strong>.</p>

                        <p>Please use the following OTP code to complete the signature:</p>

                        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                            <h1 style="color: #1890ff; letter-spacing: 8px; margin: 0; font-size: 36px;">%s</h1>
                        </div>

                        <p style="color: #ff4d4f;"><strong>⚠️ Important:</strong></p>
                        <ul style="color: #666;">
                            <li>This OTP will expire in <strong>%d minutes</strong></li>
                            <li>You have <strong>%d attempts</strong> to enter the correct code</li>
                            <li>Do not share this code with anyone</li>
                            <li>If you did not initiate this signature request, please contact us immediately</li>
                        </ul>

                        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
                            By entering this OTP, you agree to electronically sign the contract with MuTraPro Studio.<br>
                            The signed contract will have the same legal validity as a paper contract.
                        </p>

                        <p style="color: #999; font-size: 12px;">
                            Best regards,<br>
                            <strong>MuTraPro Studio Team</strong>
                        </p>
                    </div>
                </body>
                </html>
                """,
                    customerName,
                    contractDisplay,
                    otpCode,
                    ttl,
                    attempts
            );

            helper.setText(body, true);
            mailSender.send(message);

            log.info("Contract OTP email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send contract OTP email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send contract OTP email", e);
        }
    }

    /**
     * Gửi email xác nhận contract đã ký
     */
    public void sendContractSignedEmail(String toEmail, String customerName,
                                        String contractDisplay, Instant signedAt) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromName + " <" + fromEmail + ">");
            helper.setTo(toEmail);
            helper.setSubject("Contract Successfully Signed - MuTraPro");

            String signedAtFormatted = signedAt != null
                    ? DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM)
                    .withLocale(Locale.US)
                    .withZone(ZoneId.of("Asia/Ho_Chi_Minh"))
                    .format(signedAt)
                    : DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM)
                    .withLocale(Locale.US)
                    .withZone(ZoneId.of("Asia/Ho_Chi_Minh"))
                    .format(Instant.now());

            String body = String.format("""
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <h2 style="color: #52c41a;">✓ Contract Successfully Signed</h2>

                        <p>Dear <strong>%s</strong>,</p>

                        <p>Your contract <strong>%s</strong> has been successfully signed!</p>

                        <div style="background-color: #f6ffed; padding: 15px; margin: 20px 0; border-left: 4px solid #52c41a; border-radius: 4px;">
                            <p style="margin: 0; color: #52c41a;"><strong>✓ Status:</strong> Signed</p>
                            <p style="margin: 5px 0 0 0; color: #666;"><strong>Signed at:</strong> %s</p>
                        </div>

                        <p><strong>Next Steps:</strong></p>
                        <ul>
                            <li>Please pay the deposit to activate the contract and start the work</li>
                            <li>The start date will be calculated from the deposit payment date</li>
                            <li>You can view the signed contract and make payment in your dashboard</li>
                        </ul>
                        
                        <div style="background-color: #fff7e6; padding: 15px; margin: 20px 0; border-left: 4px solid #faad14; border-radius: 4px;">
                            <p style="margin: 0; color: #d46b08;"><strong>⚠ Important:</strong></p>
                            <p style="margin: 5px 0 0 0; color: #666;">The contract will only become active after the deposit payment is completed. Work will begin once the deposit is paid.</p>
                        </div>

                        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
                            Thank you for choosing MuTraPro Studio!<br>
                            If you have any questions, please don't hesitate to contact us.
                        </p>

                        <p style="color: #999; font-size: 12px;">
                            Best regards,<br>
                            <strong>MuTraPro Studio Team</strong>
                        </p>
                    </div>
                </body>
                </html>
                """,
                    customerName,
                    contractDisplay,
                    signedAtFormatted
            );

            helper.setText(body, true);
            mailSender.send(message);

            log.info("Contract signed email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send contract signed email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send contract signed email", e);
        }
    }
}

