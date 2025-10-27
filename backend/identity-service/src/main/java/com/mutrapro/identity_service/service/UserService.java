package com.mutrapro.identity_service.service;

import com.mutrapro.identity_service.dto.request.*;
import com.mutrapro.identity_service.dto.response.*;
import com.mutrapro.identity_service.entity.User;
import com.mutrapro.identity_service.exception.*;
import com.mutrapro.identity_service.mapper.UserMapper;
import com.mutrapro.identity_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * User Service implementation với proper exception handling
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {
    
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    
    // ===== PUBLIC API METHODS =====
    
    /**
     * Tìm user theo ID và trả về UserResponse
     */
    @PreAuthorize("hasRole('ADMIN') or authentication.name == @userRepository.findById(#id).orElse(null)?.email")
    public UserResponse findById(String id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> UserNotFoundException.byId(id));
        return userMapper.toUserResponse(user);
    }
    
    
    /**
     * Tạo user mới
     * Note: User chỉ nên được tạo qua register flow trong AuthenticationService
     * Method này chỉ dùng để update profile sau khi user đã được tạo
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse createUser(CreateUserRequest request) {
        throw new UnsupportedOperationException(
            "User creation not supported via this endpoint. Users must be created via registration flow."
        );
    }
    
    /**
     * Cập nhật user
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or authentication.name == @userRepository.findById(#id).orElse(null)?.email")
    public UserResponse updateUser(String id, UpdateUserRequest request) {
        log.info("Updating user with ID: {}", id);
        
        User user = findUserEntityById(id);
        
        // Map updates to entity
        userMapper.updateUserFromRequest(user, request);
        
        User updatedUser = userRepository.save(user);
        log.info("User updated successfully with ID: {}", updatedUser.getUserId());
        
        return userMapper.toUserResponse(updatedUser);
    }
    
    /**
     * Xóa user
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(String id) {
        log.info("Deleting user with ID: {}", id);
        
        User user = findUserEntityById(id);
        userRepository.delete(user);
        log.info("User deleted successfully with ID: {}", id);
    }
    
    
    /**
     * Lấy user profile
     */
    public UserProfileResponse getUserProfile(String id) {
        User user = findUserEntityById(id);
        return userMapper.toUserProfileResponse(user);
    }
    
    /**
     * Cập nhật user profile
     */
    @Transactional
    public UserProfileResponse updateUserProfile(String id, UpdateUserRequest request) {
        log.info("Updating profile for user ID: {}", id);
        
        User user = findUserEntityById(id);
        userMapper.updateUserFromRequest(user, request);
        
        User updatedUser = userRepository.save(user);
        return userMapper.toUserProfileResponse(updatedUser);
    }
    
    // ===== INTERNAL METHODS =====
    
    /**
     * Tìm user entity theo ID (internal use)
     */
    public User findUserEntityById(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> UserNotFoundException.byId(id));
    }  
}

