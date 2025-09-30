package com.mutrapro.auth_service.repository;

import com.mutrapro.auth_service.entity.UsersAuth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsersAuthRepository extends JpaRepository<UsersAuth, String> {
    Optional<UsersAuth> findByUsername(String username);
    Optional<UsersAuth> findByEmail(String email);
    Optional<UsersAuth> findByUsernameOrEmail(String username, String email);
}


