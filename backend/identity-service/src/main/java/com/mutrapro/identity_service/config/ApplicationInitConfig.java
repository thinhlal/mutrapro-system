package com.mutrapro.identity_service.config;

import com.mutrapro.identity_service.entity.UsersAuth;
import com.mutrapro.identity_service.repository.UsersAuthRepository;
import com.mutrapro.shared.enums.Role;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class ApplicationInitConfig {
    PasswordEncoder passwordEncoder;

    @Bean
    ApplicationRunner applicationRunner(UsersAuthRepository usersAuthRepository){
        return args -> {
            if (usersAuthRepository.findByEmail("admin@admin.com").isEmpty()) {
                UsersAuth usersAuth = UsersAuth.builder()
                        .email("admin@admin.com")
                        .passwordHash(passwordEncoder.encode("admin@admin.com"))
                        .role(Role.SYSTEM_ADMIN)
                        .isVerified(true)
                        .build();
                usersAuthRepository.save(usersAuth);
                log.warn("Admin user has been created with default password: admin@admin.com");
            }
        };
    }
}

