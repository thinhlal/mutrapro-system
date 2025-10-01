package com.mutrapro.user_service.service;

import com.mutrapro.user_service.dto.request.*;
import com.mutrapro.user_service.dto.response.*;
import com.mutrapro.user_service.entity.User;
import com.mutrapro.user_service.exception.*;
import com.mutrapro.user_service.mapper.UserMapper;
import com.mutrapro.user_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * User Service implementation với proper exception handlinsg
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
    public UserResponse findById(String id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + id));
        return userMapper.toUserResponse(user);
    }
    
    /**
     * Tìm user theo email và trả về UserResponse
     */
    public UserResponse findByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
        return userMapper.toUserResponse(user);
    }
    
    /**
     * Tạo user mới
     */
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        log.info("Creating new user with email: {}", request.getEmail());
        
        // Validate user data
        validateUserForCreation(request);
        
        // Map request to entity
        User user = userMapper.toUser(request);
        
        // Save user
        User savedUser = userRepository.save(user);
        
        log.info("User created successfully with ID: {}", savedUser.getUserId());
        return userMapper.toUserResponse(savedUser);
    }
    
    /**
     * Cập nhật user
     */
    @Transactional
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
            .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + id));
    }
    
    /**
     * Tìm user entity theo email (internal use)
     */
    public User findUserEntityByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
    }
    
    /**
     * Tìm user entity theo username hoặc email (internal use)
     */
    public User findUserEntityByUsernameOrEmail(String usernameOrEmail) {
        return userRepository.findByUsernameOrEmail(usernameOrEmail)
            .orElseThrow(() -> new UserNotFoundException("User not found with username or email: " + usernameOrEmail));
    }
    
    /**
     * Validate user data for creation
     */
    private void validateUserForCreation(CreateUserRequest request) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("User already exists with email: " + request.getEmail());
        }
        
        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException("User already exists with username: " + request.getUsername());
        }
        
        // Validate email format (basic validation)
        if (!isValidEmail(request.getEmail())) {
            throw new InvalidEmailFormatException("Invalid email format: " + request.getEmail());
        }
        
    }
    
    /**
     * Validate email format
     */
    private boolean isValidEmail(String email) {
        return email != null && email.contains("@") && email.contains(".");
    }
    
}