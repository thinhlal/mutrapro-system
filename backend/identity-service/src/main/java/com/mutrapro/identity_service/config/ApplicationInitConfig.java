package com.mutrapro.identity_service.config;

import com.mutrapro.identity_service.entity.User;
import com.mutrapro.identity_service.entity.UsersAuth;
import com.mutrapro.identity_service.repository.UserRepository;
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
    ApplicationRunner applicationRunner(
            UsersAuthRepository usersAuthRepository,
            UserRepository userRepository) {
        return args -> {
            // Tạo account cho tất cả các role
            createUserIfNotExists(
                    usersAuthRepository,
                    userRepository,
                    "admin@admin.com",
                    "12345678",
                    Role.SYSTEM_ADMIN,
                    "System Administrator",
                    "0123456789",
                    "Hà Nội, Việt Nam"
            );

            createUserIfNotExists(
                    usersAuthRepository,
                    userRepository,
                    "manager@manager.com",
                    "12345678",
                    Role.MANAGER,
                    "Manager",
                    "0123456788",
                    "Hà Nội, Việt Nam"
            );

            createUserIfNotExists(
                    usersAuthRepository,
                    userRepository,
                    "transcription@transcription.com",
                    "12345678",
                    Role.CUSTOMER,
                    "Transcription",
                    "0123456787",
                    "Hà Nội, Việt Nam"
            );

            createUserIfNotExists(
                    usersAuthRepository,
                    userRepository,
                    "arrangement@arrangement.com",
                    "12345678",
                    Role.CUSTOMER,
                    "Arrangement",
                    "0123456786",
                    "Hà Nội, Việt Nam"
            );

            createUserIfNotExists(
                    usersAuthRepository,
                    userRepository,
                    "recording@recording.com",
                    "12345678",
                    Role.CUSTOMER,
                    "Recording Artist",
                    "0123456785",
                    "Hà Nội, Việt Nam"
            );

            // Giữ lại admin cũ để tương thích
            if (usersAuthRepository.findByEmail("admin@admin.com").isEmpty()) {
                UsersAuth usersAuth = UsersAuth.builder()
                        .email("admin@admin.com")
                        .passwordHash(passwordEncoder.encode("12345678"))
                        .role(Role.SYSTEM_ADMIN)
                        .emailVerified(true)
                        .status("active")
                        .authProvider("LOCAL")
                        .hasLocalPassword(true)
                        .build();
                usersAuth = usersAuthRepository.save(usersAuth);
                
                User user = User.builder()
                        .userId(usersAuth.getUserId())
                        .fullName("System Administrator")
                        .isActive(true)
                        .build();
                userRepository.save(user);
                
                log.warn("Admin user has been created with default password: admin@admin.com");
            }
        };
    }

    private void createUserIfNotExists(
            UsersAuthRepository usersAuthRepository,
            UserRepository userRepository,
            String email,
            String password,
            Role role,
            String fullName,
            String phone,
            String address) {
        
        if (usersAuthRepository.findByEmail(email).isEmpty()) {
            // Tạo UsersAuth
            UsersAuth usersAuth = UsersAuth.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(password))
                    .role(role)
                    .emailVerified(true)
                    .status("active")
                    .authProvider("LOCAL")
                    .hasLocalPassword(true)
                    .build();
            usersAuth = usersAuthRepository.save(usersAuth);

            // Tạo User profile
            User user = User.builder()
                    .userId(usersAuth.getUserId())
                    .fullName(fullName)
                    .phone(phone)
                    .address(address)
                    .isActive(true)
                    .build();
            userRepository.save(user);

            log.info("Created user: {} with role: {} - Password: {}", email, role, password);
        } else {
            log.debug("User with email {} already exists, skipping creation", email);
        }
    }
}

