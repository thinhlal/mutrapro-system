package com.mutrapro.auth_service.service;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jwt.JWTClaimsSet;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {
    private String generateToken(String username){
        JWSHeader header = new JWSHeader(JWSAlgorithm.ES512);

        JWTClaimsSet jwtClaimsSet =
    }
}
