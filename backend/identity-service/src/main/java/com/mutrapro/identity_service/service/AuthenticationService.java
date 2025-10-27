package com.mutrapro.identity_service.service;

import com.mutrapro.identity_service.dto.request.AuthenticationRequest;
import com.mutrapro.identity_service.dto.request.IntrospectRequest;
import com.mutrapro.identity_service.dto.request.LogoutRequest;
import com.mutrapro.identity_service.dto.request.RegisterRequest;
import com.mutrapro.identity_service.dto.response.AuthenticationResponse;
import com.mutrapro.identity_service.dto.response.IntrospectResponse;
import com.mutrapro.identity_service.dto.response.RegisterResponse;
import com.mutrapro.identity_service.entity.EmailVerification;
import com.mutrapro.identity_service.entity.User;
import com.mutrapro.identity_service.enums.VerificationChannel;
import com.mutrapro.identity_service.enums.VerificationStatus;
import com.mutrapro.identity_service.exception.*;
import com.mutrapro.identity_service.entity.UsersAuth;
import com.mutrapro.identity_service.repository.EmailVerificationRepository;
import com.mutrapro.identity_service.repository.UserRepository;
import com.mutrapro.identity_service.repository.UsersAuthRepository;
import com.mutrapro.shared.enums.Role;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.mutrapro.identity_service.mapper.UsersAuthMapper;
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

    public IntrospectResponse introspect(IntrospectRequest request)
            throws JOSEException, ParseException {
        var token = request.getToken();

       verifyToken(token);

        return IntrospectResponse.builder()
                .valid(true)
                .build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request, HttpServletResponse response){
        UsersAuth user = usersAuthRepository
                .findByEmail(request.getEmail())
                .orElseThrow(() -> UserNotFoundException.byEmail(request.getEmail()));

        if (!user.isActive()) {
            throw UserDisabledException.create();
        }

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());

        if (!authenticated) {
            throw InvalidCredentialsException.create();
        }

        String accessToken = generateAccessToken(user);
        String refreshToken = generateRefreshToken(user);
        
        // Save refresh token to cookie
        saveCookieToResponse(response, "refreshToken", refreshToken, REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60);
        
        return AuthenticationResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn((long) ACCESS_TOKEN_EXPIRY_SECONDS)
                .email(user.getEmail())
                .role(user.getRole().name())
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
        SignedJWT refreshJWT = verifyToken(refreshToken);

        // Get email from JWT subject
        String userEmail = refreshJWT.getJWTClaimsSet().getSubject();

        // Find user by email
        UsersAuth user = usersAuthRepository.findByEmail(userEmail)
                .orElseThrow(() -> UserNotFoundException.byEmail(userEmail));
        
        if (!user.isActive()) {
            throw UserDisabledException.create();
        }

        // Create new access token and refresh token
        var newAccessToken = generateAccessToken(user);
        var newRefreshToken = generateRefreshToken(user);

        // Save new refresh token to cookie
        saveCookieToResponse(response, "refreshToken", newRefreshToken, REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60);

        return AuthenticationResponse.builder()
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .expiresIn((long) ACCESS_TOKEN_EXPIRY_SECONDS)
                .email(user.getEmail())
                .role(user.getRole().name())
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

    public void logout(LogoutRequest request) throws ParseException, JOSEException {
        String token = request.getToken();

        //Decode token to get ClaimsSet
        var signedJWT = verifyToken(token);
        JWTClaimsSet claimsSet = signedJWT.getJWTClaimsSet();
        Date expirationTime = claimsSet.getExpirationTime();

        // Get JWT ID (jti) from token
        String jti = claimsSet.getJWTID();

        if (jti == null || jti.isEmpty()) {
            log.warn("Token does not have jti claim, cannot logout");
            return;
        }

        // Calculate remaining time of token (TTL)
        long ttl = expirationTime.getTime() - System.currentTimeMillis();

        if (ttl > 0) {
            // Save jti to Redis with TTL = remaining time of token
            // Key format: "blacklist:jti:" + jti
            String key = "blacklist:jti:" + jti;
            redisTemplate.opsForValue().set(key, "logout",
                    java.time.Duration.ofMillis(ttl));

            log.info("JWT ID {} has been added to Redis blacklist with TTL: {}ms", jti, ttl);
        } else {
            log.warn("Token has expired, no need to add to blacklist");
        }
    }

    private SignedJWT verifyToken(String token) throws JOSEException, ParseException {
        JWSVerifier verifier = new MACVerifier(SIGNER_KEY.getBytes());

        SignedJWT signedJWT = SignedJWT.parse(token);

        Date expiryTime = signedJWT.getJWTClaimsSet().getExpirationTime();

        var verified = signedJWT.verify(verifier);

        if (!(verified && expiryTime.after(new Date())))
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
                .claim("scope", usersAuth.getRole())
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
                .claim("scope", usersAuth.getRole())
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

