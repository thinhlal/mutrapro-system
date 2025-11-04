package com.mutrapro.identity_service.repository;

import com.mutrapro.identity_service.entity.UsersAuth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsersAuthRepository extends JpaRepository<UsersAuth, String> {
    Optional<UsersAuth> findByEmail(String email);
    Optional<UsersAuth> findByUserId(String userId);
}

