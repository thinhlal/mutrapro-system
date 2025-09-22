package com.mutrapro.user_service.repository;

import com.mutrapro.user_service.entity.User;
import com.mutrapro.user_service.entity.UserRole;
import com.mutrapro.user_service.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho UserRole Entity
 */
@Repository
public interface UserRoleRepository extends JpaRepository<com.mutrapro.user_service.entity.UserRole, String> {
    
    /**
     * Tìm user roles theo user
     */
    List<com.mutrapro.user_service.entity.UserRole> findByUser(User user);
    
    /**
     * Tìm active user roles theo user
     */
    List<com.mutrapro.user_service.entity.UserRole> findByUserAndIsActive(User user, boolean isActive);
    
    /**
     * Tìm user role theo user và role
     */
    Optional<com.mutrapro.user_service.entity.UserRole> findByUserAndRole(User user, com.mutrapro.user_service.enums.UserRole role);
    
    /**
     * Kiểm tra user có role cụ thể không
     */
    boolean existsByUserAndRoleAndIsActive(User user, com.mutrapro.user_service.enums.UserRole role, boolean isActive);
    
    /**
     * Tìm tất cả users có role cụ thể
     */
    @Query("SELECT ur.user FROM UserRole ur WHERE ur.role = :role AND ur.isActive = true")
    List<User> findUsersByRole(@Param("role") com.mutrapro.user_service.enums.UserRole role);
    
    /**
     * Đếm số users có role cụ thể
     */
    @Query("SELECT COUNT(ur) FROM UserRole ur WHERE ur.role = :role AND ur.isActive = true")
    long countUsersByRole(@Param("role") com.mutrapro.user_service.enums.UserRole role);
}
