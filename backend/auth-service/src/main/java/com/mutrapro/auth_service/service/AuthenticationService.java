package com.mutrapro.auth_service.service;

import com.mutrapro.auth_service.dto.request.AuthenticationRequest;
import com.mutrapro.auth_service.dto.request.IntrospectRequest;
import com.mutrapro.auth_service.dto.request.RegisterRequest;
import com.mutrapro.auth_service.dto.response.AuthenticationResponse;
import com.mutrapro.auth_service.dto.response.IntrospectResponse;
import com.mutrapro.auth_service.dto.response.RegisterResponse;
import com.mutrapro.auth_service.entity.EmailVerification;
import com.mutrapro.auth_service.enums.VerificationChannel;
import com.mutrapro.auth_service.enums.VerificationStatus;
import com.mutrapro.auth_service.exception.*;
import com.mutrapro.auth_service.entity.UsersAuth;
import com.mutrapro.auth_service.repository.EmailVerificationRepository;
import com.mutrapro.auth_service.repository.UsersAuthRepository;
import com.mutrapro.shared.enums.Role;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.mutrapro.auth_service.mapper.UsersAuthMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class AuthenticationService {

    private final EmailVerificationRepository emailVerificationRepository;
    private final UsersAuthRepository usersAuthRepository;
    private final UsersAuthMapper usersAuthMapper;
    private final SecureRandom secureRandom = new SecureRandom();
    private final PasswordEncoder passwordEncoder;

    @NonFinal
    @Value("${jwt.signerKey}")
    String SIGNER_KEY;
    
    @NonFinal
    @Value("${verification.email-otp.expiry-seconds:900}")
    long otpExpirySeconds;

    public IntrospectResponse introspect(IntrospectRequest request)
            throws JOSEException, ParseException {
        var token = request.getToken();

        JWSVerifier verifier = new MACVerifier(SIGNER_KEY.getBytes());

        SignedJWT signedJWT = SignedJWT.parse(token);

        Date expiryTime = signedJWT.getJWTClaimsSet().getExpirationTime();

        var verified = signedJWT.verify(verifier);

        return IntrospectResponse.builder()
                .valid(verified && expiryTime.after(new Date()))
                .build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request){
        UsersAuth user = usersAuthRepository
                .findByEmail(request.getEmail())
                .orElseThrow(UserNotFoundAuthException::create);

        if (!user.isActive()) {
            throw UserDisabledException.create();
        }

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());

        if (!authenticated) {
            throw InvalidCredentialsException.create();
        }

        String token = generateToken(user.getEmail());
        return AuthenticationResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(3600L)
                .email(user.getEmail())
                .build();
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request){
        usersAuthRepository.findByEmail(request.getEmail()).ifPresent(u -> {
            throw UserAlreadyExistsException.create();
        });

        var user = usersAuthMapper.toUsersAuth(request);
        user.setRole(request.getRole() != null ? request.getRole() : Role.CUSTOMER);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        UsersAuth userSaved = usersAuthRepository.save(user);

        long expiresInSeconds = otpExpirySeconds;

        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        var verification = EmailVerification.builder()
                .userId(userSaved.getId())
                .otpHash(passwordEncoder.encode(otp))
                .channel(VerificationChannel.EMAIL_OTP)
                .expiresAt(Instant.now().plus(expiresInSeconds, ChronoUnit.SECONDS))
                .status(VerificationStatus.PENDING)
                .build();
        var emailVerification = emailVerificationRepository.save(verification);

        return RegisterResponse.builder()
                .userId(userSaved.getId())
                .email(userSaved.getEmail())
                .role(userSaved.getRole().name())
                .verification(RegisterResponse.VerificationInfo.builder()
                        .channel("EMAIL_OTP")
                        .expiresInSeconds(expiresInSeconds)
                        .requestId(emailVerification.getId())
                        .nextStep("Check your email to verify your account")
                        .build())
                .build();
    }

    private String generateToken(String email){
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(email)
                .issuer("custom-music")
                .issueTime(new Date())
                .expirationTime(new Date(
                        Instant.now().plus(1, ChronoUnit.HOURS).toEpochMilli()
                ))
                .claim("customClaim", "custom")
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
}
