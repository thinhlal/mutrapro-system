package com.mutrapro.identity_service.repository;

import com.mutrapro.identity_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository cho User Entity
 */
@Repository
public interface UserRepository extends JpaRepository<User, String> {
    
    /**
     * Tìm users theo active status
     */
    List<User> findByIsActive(boolean isActive);
}

