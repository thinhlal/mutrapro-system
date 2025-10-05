package com.mutrapro.auth_service.service;

import com.mutrapro.auth_service.dto.request.AuthenticationRequest;
import com.mutrapro.auth_service.dto.request.IntrospectRequest;
import com.mutrapro.auth_service.dto.response.AuthenticationResponse;
import com.mutrapro.auth_service.dto.response.IntrospectResponse;
import com.mutrapro.auth_service.exception.JwtSigningFailedException;
import com.mutrapro.auth_service.entity.UsersAuth;
import com.mutrapro.auth_service.exception.InvalidCredentialsException;
import com.mutrapro.auth_service.exception.UserDisabledException;
import com.mutrapro.auth_service.exception.UserNotFoundAuthException;
import com.mutrapro.auth_service.repository.UsersAuthRepository;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class AuthenticationService {

    @NonFinal
    @Value("${jwt.signerKey}")
    String SIGNER_KEY;

    private final UsersAuthRepository usersAuthRepository;

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
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
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
