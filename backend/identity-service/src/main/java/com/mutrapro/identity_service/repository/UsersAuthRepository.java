package com.mutrapro.identity_service.repository;

import com.mutrapro.identity_service.entity.UsersAuth;
import com.mutrapro.shared.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UsersAuthRepository extends JpaRepository<UsersAuth, String>, JpaSpecificationExecutor<UsersAuth> {
    Optional<UsersAuth> findByEmail(String email);
    Optional<UsersAuth> findByUserId(String userId);
    List<UsersAuth> findByRole(Role role);
    List<UsersAuth> findByEmailVerified(boolean emailVerified);
    
    // Optimized count queries for statistics (avoid loading all records into memory)
    long countByRole(Role role);
    long countByEmailVerified(boolean emailVerified);
    
    /**
     * Count users grouped by date (cast createdAt to date)
     * Returns list of Object arrays where [0] = LocalDate, [1] = Long count
     */
    @Query("SELECT CAST(ua.createdAt AS LocalDate) as date, COUNT(ua) as count " +
           "FROM UsersAuth ua " +
           "WHERE ua.createdAt >= :startDate AND ua.createdAt < :endDate " +
           "GROUP BY CAST(ua.createdAt AS LocalDate) " +
           "ORDER BY date ASC")
    List<Object[]> countUsersByDateRange(@Param("startDate") LocalDateTime startDate, 
                                          @Param("endDate") LocalDateTime endDate);
    
    /**
     * Search users with keyword (userId, email, fullName, phone) using native query
     * Simple native SQL - Spring Data JPA handles pagination automatically
     * Note: Sorting is handled by Pageable, but we use fixed ORDER BY for native query compatibility
     */
    @Query(value = "SELECT DISTINCT ua.* FROM users_auth ua " +
           "LEFT JOIN users u ON u.user_id = ua.user_id " +
           "WHERE (:keyword IS NULL OR :keyword = '' OR " +
           "       LOWER(ua.user_id) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       ua.user_id = :keyword OR " +
           "       LOWER(ua.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(COALESCE(u.full_name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(COALESCE(u.phone, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:role IS NULL OR ua.role = :role) " +
           "AND (:emailVerified IS NULL OR ua.email_verified = :emailVerified) " +
           "AND (:authProvider IS NULL OR :authProvider = '' OR ua.auth_provider = :authProvider) " +
           "ORDER BY ua.created_at DESC",
           countQuery = "SELECT COUNT(DISTINCT ua.user_id) FROM users_auth ua " +
           "LEFT JOIN users u ON u.user_id = ua.user_id " +
           "WHERE (:keyword IS NULL OR :keyword = '' OR " +
           "       LOWER(ua.user_id) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       ua.user_id = :keyword OR " +
           "       LOWER(ua.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(COALESCE(u.full_name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(COALESCE(u.phone, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:role IS NULL OR ua.role = :role) " +
           "AND (:emailVerified IS NULL OR ua.email_verified = :emailVerified) " +
           "AND (:authProvider IS NULL OR :authProvider = '' OR ua.auth_provider = :authProvider)",
           nativeQuery = true)
    Page<UsersAuth> searchUsersWithFilters(
        @Param("keyword") String keyword,
        @Param("role") String role,
        @Param("emailVerified") Boolean emailVerified,
        @Param("authProvider") String authProvider,
        Pageable pageable
    );
}
