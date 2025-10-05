package com.mutrapro.user_service.repository;

import com.mutrapro.user_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho User Entity
 */
@Repository
public interface UserRepository extends JpaRepository<User, String> {

    /**
     * Tìm user theo email
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Kiểm tra email đã tồn tại chưa
     */
    boolean existsByEmail(String email);
    
    /**
     * Tìm user theo email verification token
     */
    Optional<User> findByEmailVerificationToken(String token);
    
    /**
     * Tìm user theo password reset token
     */
    Optional<User> findByPasswordResetToken(String token);
    
    /**
     * Tìm users theo role
     */
    List<User> findByRole(com.mutrapro.shared.enums.Role role);
    
    /**
     * Tìm users theo active status
     */
    List<User> findByIsActive(boolean isActive);
    
    /**
     * Tìm users theo email verified status
     */
    List<User> findByEmailVerified(boolean emailVerified);
}
