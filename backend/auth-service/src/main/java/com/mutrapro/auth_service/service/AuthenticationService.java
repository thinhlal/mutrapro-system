package com.mutrapro.auth_service.service;

import com.mutrapro.auth_service.dto.request.AuthenticationRequest;
import com.mutrapro.auth_service.dto.response.AuthenticationResponse;
import com.mutrapro.auth_service.exception.JwtSigningFailedException;
import com.mutrapro.auth_service.entity.UsersAuth;
import com.mutrapro.auth_service.exception.InvalidCredentialsException;
import com.mutrapro.auth_service.exception.UserDisabledException;
import com.mutrapro.auth_service.exception.UserNotFoundAuthException;
import com.mutrapro.auth_service.repository.UsersAuthRepository;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class AuthenticationService {

    @NonFinal
    protected static final String SIGNER_KEY =
            "QVHfEyXEd7KG4eUfYAWOUvuPjlufU3vImJ0MEialEhHoQPjB6wZTL6Ma9XLnKaYn";

    private final UsersAuthRepository usersAuthRepository;

    public AuthenticationResponse authenticate(AuthenticationRequest request){
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        UsersAuth user = usersAuthRepository
                .findByUsernameOrEmail(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(UserNotFoundAuthException::create);

        if (!user.isActive()) {
            throw UserDisabledException.create();
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw InvalidCredentialsException.create();
        }

        String token = generateToken(user.getUsername());
        return AuthenticationResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(3600L)
                .username(user.getUsername())
                .build();
    }

    private String generateToken(String username){
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(username)
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
