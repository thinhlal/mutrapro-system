package com.mutrapro.identity_service.repository;

import com.mutrapro.identity_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho User Entity
 */
@Repository
public interface UserRepository extends JpaRepository<User, String> {
    
    Optional<User> findByUserId(String userId);
    
    /**
     * Tìm users theo active status
     */
    List<User> findByIsActive(boolean isActive);
    
    // Optimized count query for statistics (avoid loading all records into memory)
    long countByIsActive(boolean isActive);
    
    /**
     * Batch query - tìm tất cả users theo danh sách userIds
     */
    List<User> findAllByUserIdIn(List<String> userIds);
}

