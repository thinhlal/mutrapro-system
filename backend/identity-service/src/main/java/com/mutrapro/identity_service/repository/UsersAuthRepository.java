package com.mutrapro.identity_service.repository;

import com.mutrapro.identity_service.entity.UsersAuth;
import com.mutrapro.shared.enums.Role;
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
}
