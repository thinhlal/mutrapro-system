package com.mutrapro.identity_service.service;

import com.mutrapro.identity_service.dto.request.AuthenticationRequest;
import com.mutrapro.identity_service.dto.request.CreatePasswordRequest;
import com.mutrapro.identity_service.dto.request.IntrospectRequest;
import com.mutrapro.identity_service.dto.request.LogoutRequest;
import com.mutrapro.identity_service.dto.request.RegisterRequest;
import com.mutrapro.identity_service.dto.response.AuthenticationResponse;
import com.mutrapro.identity_service.dto.response.IntrospectResponse;
import com.mutrapro.identity_service.dto.response.RegisterResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.identity_service.entity.EmailVerification;
import com.mutrapro.identity_service.entity.OutboxEvent;
import com.mutrapro.identity_service.entity.User;
import com.mutrapro.shared.event.EmailVerificationEvent;
import com.mutrapro.identity_service.enums.VerificationChannel;
import com.mutrapro.identity_service.enums.VerificationStatus;
import com.mutrapro.identity_service.exception.*;
import com.mutrapro.identity_service.entity.UsersAuth;
import com.mutrapro.identity_service.repository.EmailVerificationRepository;
import com.mutrapro.identity_service.repository.OutboxEventRepository;
import com.mutrapro.identity_service.repository.UserRepository;
import com.mutrapro.identity_service.repository.UsersAuthRepository;
import com.mutrapro.shared.enums.Role;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.mutrapro.identity_service.mapper.UsersAuthMapper;
import com.mutrapro.identity_service.dto.request.ExchangeTokenRequest;
import com.mutrapro.identity_service.dto.response.ExchangeTokenResponse;
import com.mutrapro.identity_service.dto.response.OutboundUserResponse;
import com.mutrapro.identity_service.repository.httpclient.OutboundIdentityClient;
import com.mutrapro.identity_service.repository.httpclient.OutboundUserClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.SecureRandom;
import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class AuthenticationService {

    private final EmailVerificationRepository emailVerificationRepository;
    private final UsersAuthRepository usersAuthRepository;
    private final UserRepository userRepository;
    private final UsersAuthMapper usersAuthMapper;
    private final SecureRandom secureRandom = new SecureRandom();
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, String> redisTemplate;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private final OutboundIdentityClient outboundIdentityClient;
    private final OutboundUserClient outboundUserClient;

    @NonFinal
    @Value("${jwt.signerKey}")
    String SIGNER_KEY;
    
    @NonFinal
    @Value("${verification.email-otp.expiry-seconds:900}")
    long otpExpirySeconds;
    
    @NonFinal
    @Value("${jwt.access-token.expiry-seconds:3600}")
    int ACCESS_TOKEN_EXPIRY_SECONDS;
    
    @NonFinal
    @Value("${jwt.refresh-token.expiry-days:7}")
    int REFRESH_TOKEN_EXPIRY_DAYS;

    @NonFinal
    @Value("${outbound.identity.client-id:}")
    String CLIENT_ID;

    @NonFinal
    @Value("${outbound.identity.client-secret:}")
    String CLIENT_SECRET;

    @NonFinal
    @Value("${outbound.identity.redirect-uri:}")
    String REDIRECT_URI;

    @NonFinal
    protected final String GRANT_TYPE = "authorization_code";

    public IntrospectResponse introspect(IntrospectRequest request)
            throws JOSEException, ParseException {
        var token = request.getToken();

        verifyToken(token, "access");

        return IntrospectResponse.builder()
                .valid(true)
                .build();
    }

    @Transactional
    public AuthenticationResponse outboundAuthentication(String code, HttpServletResponse response) {
        // 1) Exchange code for Google access token via Feign client
        ExchangeTokenResponse tokenResp = outboundIdentityClient.exchangeToken(
                ExchangeTokenRequest.builder()
                        .code(code)
                        .clientId(CLIENT_ID)
                        .clientSecret(CLIENT_SECRET)
                        .redirectUri(REDIRECT_URI)
                        .grantType(GRANT_TYPE)
                        .build()
        );
        if (tokenResp == null || tokenResp.getAccessToken() == null) {
            throw InvalidCredentialsException.create();
        }
        String googleAccessToken = tokenResp.getAccessToken();
        // 2) Get user info from Google via Feign client
        OutboundUserResponse userInfo = outboundUserClient.getUserInfo("json", "Bearer " + googleAccessToken);
        if (userInfo == null || userInfo.getEmail() == null) {
            throw InvalidCredentialsException.create();
        }
        String email = userInfo.getEmail();
        String fullName = userInfo.getName();
        // 3) Onboard or load UsersAuth + User
        UsersAuth usersAuth = usersAuthRepository.findByEmail(email).orElse(null);
        if (usersAuth == null) {
            usersAuth = UsersAuth.builder()
                    .email(email)
                    .role(Role.CUSTOMER)
                    .emailVerified(true)
                    .status("active")
                    .authProvider("GOOGLE")
                    .authProviderId(userInfo.getId())
                    .hasLocalPassword(false)
                    .build();
            log.info("UsersAuth: {}", usersAuth);
            usersAuth = usersAuthRepository.save(usersAuth);
            log.info("UsersAuth saved: {}", usersAuth);
            User profile = User.builder()
                    .userId(usersAuth.getUserId())
                    .fullName(fullName != null ? fullName : email)
                    .avatarUrl(userInfo.getPicture())
                    .isActive(true)
                    .build();
            log.info("User: {}", profile);
            userRepository.save(profile);
            log.info("User saved: {}", profile);
        }

        // 4) Issue local tokens
        String accessToken = generateAccessToken(usersAuth);
        String refreshToken = generateRefreshToken(usersAuth);
        saveCookieToResponse(response, "refreshToken", refreshToken, REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60);

        var profile = userRepository.findById(usersAuth.getUserId()).orElse(null);
        return AuthenticationResponse.builder()
                .userId(usersAuth.getUserId())
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn((long) ACCESS_TOKEN_EXPIRY_SECONDS)
                .email(usersAuth.getEmail())
                .role(usersAuth.getRole().name())
                .fullName(profile != null ? profile.getFullName() : fullName)
                .isNoPassword(!usersAuth.isHasLocalPassword())
                .build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request, HttpServletResponse response){
        UsersAuth user = usersAuthRepository
                .findByEmail(request.getEmail())
                .orElseThrow(() -> UserNotFoundException.byEmail(request.getEmail()));

        if (!user.isActive()) {
            throw UserDisabledException.create();
        }

        // Check if email is verified
        if (!user.isEmailVerified()) {
            throw EmailNotVerifiedException.create();
        }

        // Nếu tài khoản chưa có mật khẩu local (đăng nhập OAuth), từ chối đăng nhập bằng password
        if (!user.isHasLocalPassword()) {
            throw NoLocalPasswordException.create();
        }

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());

        if (!authenticated) {
            throw InvalidCredentialsException.create();
        }

        String accessToken = generateAccessToken(user);
        String refreshToken = generateRefreshToken(user);
        
        // Save refresh token to cookie
        saveCookieToResponse(response, "refreshToken", refreshToken, REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60);
        
        var profile = userRepository.findById(user.getUserId()).orElse(null);
        return AuthenticationResponse.builder()
                .userId(user.getUserId())
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn((long) ACCESS_TOKEN_EXPIRY_SECONDS)
                .email(user.getEmail())
                .role(user.getRole().name())
                .fullName(profile != null ? profile.getFullName() : null)
                .isNoPassword(!user.isHasLocalPassword())
                .build();
    }
    
    @Transactional
    public AuthenticationResponse refreshToken(HttpServletRequest request, HttpServletResponse response)
            throws JOSEException, ParseException {
        // Get refresh token from cookie
        Cookie[] cookies = request.getCookies();
        String refreshToken = null;
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("refreshToken".equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (refreshToken == null) {
            throw RefreshTokenNotFoundException.create();
        }

        // Xác thực refresh token
        SignedJWT refreshJWT = verifyToken(refreshToken, "refresh");

        // Get email from JWT subject
        String userEmail = refreshJWT.getJWTClaimsSet().getSubject();

        // Find user by email
        UsersAuth user = usersAuthRepository.findByEmail(userEmail)
                .orElseThrow(() -> UserNotFoundException.byEmail(userEmail));
        
        if (!user.isActive()) {
            throw UserDisabledException.create();
        }

        // Optional: Invalidate current access token (if client sent it in Authorization header)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String oldAccessToken = authHeader.substring(7);
            try {
                SignedJWT oldAccessJWT = SignedJWT.parse(oldAccessToken);
                String oldAccessJti = oldAccessJWT.getJWTClaimsSet().getJWTID();
                Date oldAccessExpiry = oldAccessJWT.getJWTClaimsSet().getExpirationTime();
                invalidateToken(oldAccessJti, oldAccessExpiry);
            } catch (Exception e) {
                log.warn("Failed to parse/blacklist old access token during refresh", e);
            }
        }

        // Invalidate used refresh token (rotate & revoke)
        String usedRefreshJti = refreshJWT.getJWTClaimsSet().getJWTID();
        Date refreshExpiry = refreshJWT.getJWTClaimsSet().getExpirationTime();
        invalidateToken(usedRefreshJti, refreshExpiry);

        // Create new access token and refresh token
        var newAccessToken = generateAccessToken(user);
        var newRefreshToken = generateRefreshToken(user);

        // Save new refresh token to cookie
        saveCookieToResponse(response, "refreshToken", newRefreshToken, REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60);
        
        var profile = userRepository.findById(user.getUserId()).orElse(null);
        return AuthenticationResponse.builder()
                .userId(user.getUserId())
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .expiresIn((long) ACCESS_TOKEN_EXPIRY_SECONDS)
                .email(user.getEmail())
                .role(user.getRole().name())
                .fullName(profile != null ? profile.getFullName() : null)
                .isNoPassword(!user.isHasLocalPassword())
                .build();
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request){
        usersAuthRepository.findByEmail(request.getEmail()).ifPresent(u -> {
            throw UserAlreadyExistsException.create();
        });
        
        // Create UsersAuth
        var userAuth = usersAuthMapper.toUsersAuth(request);
        userAuth.setRole(request.getRole() != null ? request.getRole() : Role.CUSTOMER);
        userAuth.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userAuth.setHasLocalPassword(true);
        UsersAuth userAuthSaved = usersAuthRepository.save(userAuth);

        // Create User (users table)
        User user = User.builder()
                .userId(userAuthSaved.getUserId()) // Use same userId from users_auth
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .address(request.getAddress())
                .isActive(true)
                .build();
        userRepository.save(user);

        long expiresInSeconds = otpExpirySeconds;

        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        var verification = EmailVerification.builder()
                .userId(userAuthSaved.getUserId())
                .otpHash(passwordEncoder.encode(otp))
                .channel(VerificationChannel.EMAIL_OTP)
                .expiresAt(Instant.now().plus(expiresInSeconds, ChronoUnit.SECONDS))
                .status(VerificationStatus.PENDING)
                .build();
        var emailVerification = emailVerificationRepository.save(verification);

        // Save email verification event vào outbox (same transaction)
        UUID eventId = UUID.randomUUID();
        EmailVerificationEvent emailEvent = EmailVerificationEvent.builder()
                .eventId(eventId)
                .email(userAuthSaved.getEmail())
                .otp(otp)
                .fullName(request.getFullName())
                .timestamp(Instant.now())
                .build();
        
        JsonNode eventPayload = objectMapper.valueToTree(emailEvent);
        
        OutboxEvent outboxEvent = OutboxEvent.builder()
                .aggregateId(UUID.fromString(userAuthSaved.getUserId()))
                .aggregateType("user")
                .eventType("email.verification")
                .eventPayload(eventPayload)
                .occurredAt(Instant.now())
                .build();
        
        outboxEventRepository.save(outboxEvent);
        // Background job sẽ publish events từ outbox ra Kafka

        return RegisterResponse.builder()
                .userId(userAuthSaved.getUserId())
                .email(userAuthSaved.getEmail())
                .role(userAuthSaved.getRole().name())
                .verification(RegisterResponse.VerificationInfo.builder()
                        .channel("EMAIL_OTP")
                        .expiresInSeconds(expiresInSeconds)
                        .requestId(emailVerification.getId())
                        .nextStep("Check your email to verify your account")
                        .build())
                .build();
    }

    public void logout(LogoutRequest request, HttpServletResponse response) throws ParseException, JOSEException {
        String token = request.getToken();
        try {
            // Decode token to get ClaimsSet
            SignedJWT signedJWT = verifyToken(token, "access");
            JWTClaimsSet claimsSet = signedJWT.getJWTClaimsSet();
            Date expirationTime = claimsSet.getExpirationTime();

            // Get JWT ID (jti) from token
            String jti = claimsSet.getJWTID();
            if (jti == null || jti.isEmpty()) {
                log.warn("Token does not have jti claim, cannot logout");
            } else {
                invalidateToken(jti, expirationTime);
            }
        } catch (Exception ex) {
            // Tolerant logout: nếu token không hợp lệ/hết hạn, vẫn xóa cookie và coi như thành công
            log.warn("Logout called with invalid/expired token: {}", ex.getMessage());
        } finally {
            // Delete refresh token cookie (idempotent)
            saveCookieToResponse(response, "refreshToken", null, 0);
        }
    }

    public void createPassword(CreatePasswordRequest request) {
        UsersAuth user = usersAuthRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> UserNotFoundException.byEmail(request.getEmail()));
        if (user.getPasswordHash() != null) {
            throw PasswordAlreadySetException.create();
        }
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setHasLocalPassword(true);
        usersAuthRepository.save(user);
    }

    private void invalidateToken(String jwtId, Date expiryTime) {
        if (jwtId == null || expiryTime == null) return;
        long ttlMs = expiryTime.getTime() - System.currentTimeMillis();
        if (ttlMs > 0) {
            String key = "blacklist:jti:" + jwtId;
            redisTemplate.opsForValue().set(key, "revoked", java.time.Duration.ofMillis(ttlMs));
            log.info("JWT ID {} has been added to Redis blacklist with TTL: {}ms", jwtId, ttlMs);
        } else {
            log.warn("Token has expired, no need to add to blacklist");
        }
    }

    private SignedJWT verifyToken(String token, String expectedTokenType) throws JOSEException, ParseException {
        JWSVerifier verifier = new MACVerifier(SIGNER_KEY.getBytes());

        SignedJWT signedJWT = SignedJWT.parse(token);

        Date expiryTime = signedJWT.getJWTClaimsSet().getExpirationTime();
        String tokenType = (String) signedJWT.getJWTClaimsSet().getClaim("type");
        String jti = signedJWT.getJWTClaimsSet().getJWTID();

        var verified = signedJWT.verify(verifier);

        if (!(verified && expiryTime.after(new Date())))
            throw TokenInvalidException.create();

        if (expectedTokenType != null && !expectedTokenType.equals(tokenType))
            throw TokenInvalidException.create();

        // Check blacklist in Redis
        String blacklistKey = "blacklist:jti:" + jti;
        String blacklisted = redisTemplate.opsForValue().get(blacklistKey);
        if (blacklisted != null)
            throw TokenInvalidException.create();

        return signedJWT;
    }

    private String generateAccessToken(UsersAuth usersAuth){
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        // Generate unique JWT ID
        String jti = UUID.randomUUID().toString();

        JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(usersAuth.getEmail())
                .issuer("mutrapro.com")
                .issueTime(new Date())
                .expirationTime(new Date(
                        Instant.now().plus(ACCESS_TOKEN_EXPIRY_SECONDS, ChronoUnit.SECONDS).toEpochMilli()
                ))
                .jwtID(jti) // Add JWT ID claim
                .claim("type", "access")
                .claim("scope", usersAuth.getRole())
                .claim("userId", usersAuth.getUserId())  // Add userId as claim
                .build();

        Payload payload = new Payload(jwtClaimsSet.toJSONObject());
        JWSObject jwsObject = new JWSObject(header, payload);

        try {
            jwsObject.sign(new MACSigner(SIGNER_KEY.getBytes()));
            return jwsObject.serialize();
        } catch (JOSEException e) {
            log.error("Failed to sign JWT token", e);
            throw JwtSigningFailedException.fromCause(e);
        }
    }
    
    private String generateRefreshToken(UsersAuth usersAuth) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        // Generate unique JWT ID
        String jti = UUID.randomUUID().toString();

        JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(usersAuth.getEmail())
                .issuer("mutrapro.com")
                .issueTime(new Date())
                .expirationTime(new Date(
                        Instant.now().plus(REFRESH_TOKEN_EXPIRY_DAYS, ChronoUnit.DAYS).toEpochMilli()
                ))
                .jwtID(jti)
                .claim("type", "refresh")
                .claim("scope", usersAuth.getRole())
                .claim("userId", usersAuth.getUserId())  // Add userId as claim
                .build();

        Payload payload = new Payload(jwtClaimsSet.toJSONObject());
        JWSObject jwsObject = new JWSObject(header, payload);

        try {
            jwsObject.sign(new MACSigner(SIGNER_KEY.getBytes()));
            return jwsObject.serialize();
        } catch (JOSEException e) {
            log.error("Failed to sign refresh token", e);
            throw JwtSigningFailedException.fromCause(e);
        }
    }
    
    private void saveCookieToResponse(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setMaxAge(maxAge);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Set to true in production with HTTPS
        cookie.setPath("/");
        response.addCookie(cookie);
    }
}

