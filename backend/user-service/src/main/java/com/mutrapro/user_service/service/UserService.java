package com.mutrapro.user_service.service;

import com.mutrapro.user_service.dto.request.*;
import com.mutrapro.user_service.dto.response.*;
import com.mutrapro.user_service.entity.User;
import com.mutrapro.user_service.entity.UserRole;
import com.mutrapro.user_service.enums.UserRole;
import com.mutrapro.user_service.exception.*;
import com.mutrapro.user_service.mapper.UserMapper;
import com.mutrapro.user_service.repository.UserRepository;
import com.mutrapro.user_service.repository.UserRoleRepository;
import com.mutrapro.user_service.util.AuthenticationUtil;
import com.mutrapro.user_service.util.EmailVerificationUtil;
import com.mutrapro.user_service.util.PasswordUtil;
import com.mutrapro.shared.util.ExceptionUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final UserRoleRepository userRoleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationUtil authUtil;
    private final PasswordUtil passwordUtil;
    private final EmailVerificationUtil emailUtil;
    
    // ===== PUBLIC API METHODS =====
    
    /**
     * Tìm user theo ID và trả về UserResponse
     */
    public UserResponse findById(String id) {
        try {
            User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + id));
            return userMapper.toUserResponse(user);
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "find user by ID");
        }
    }
    
    /**
     * Tìm user theo email và trả về UserResponse
     */
    public UserResponse findByEmail(String email) {
        try {
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
            return userMapper.toUserResponse(user);
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "find user by email");
        }
    }
    
    /**
     * Tạo user mới
     */
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        log.info("Creating new user with email: {}", request.getEmail());
        
        try {
            // Validate user data
            validateUserForCreation(request);
            
            // Map request to entity
            User user = userMapper.toUser(request);
            
            // Hash password
            String hashedPassword = passwordEncoder.encode(request.getPassword());
            user.setPasswordHash(hashedPassword);
            
            // Generate email verification token
            emailUtil.generateEmailVerificationToken(user);
            
            // Save user
            User savedUser = userRepository.save(user);
            
            // Create default role if primaryRole is specified
            if (request.getPrimaryRole() != null) {
                createUserRole(savedUser, request.getPrimaryRole(), savedUser);
            }
            
            log.info("User created successfully with ID: {}", savedUser.getUserId());
            return userMapper.toUserResponse(savedUser);
            
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "create user");
        }
    }
    
    /**
     * Cập nhật user
     */
    @Transactional
    public UserResponse updateUser(String id, UpdateUserRequest request) {
        log.info("Updating user with ID: {}", id);
        
        try {
            User user = findUserEntityById(id);
            
            // Map updates to entity
            userMapper.updateUserFromRequest(user, request);
            
            User updatedUser = userRepository.save(user);
            log.info("User updated successfully with ID: {}", updatedUser.getUserId());
            
            return userMapper.toUserResponse(updatedUser);
            
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "update user");
        }
    }
    
    /**
     * Xóa user
     */
    @Transactional
    public void deleteUser(String id) {
        log.info("Deleting user with ID: {}", id);
        
        try {
            User user = findUserEntityById(id);
            userRepository.delete(user);
            log.info("User deleted successfully with ID: {}", id);
            
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "delete user");
        }
    }
    
    /**
     * Xác thực user credentials
     */
    public AuthenticationResponse authenticateUser(String usernameOrEmail, String password) {
        log.info("Authenticating user: {}", usernameOrEmail);
        
        try {
            User user = findUserEntityByUsernameOrEmail(usernameOrEmail);
            
            // Check if user can login
            if (!authUtil.canLogin(user)) {
                if (user.isLocked()) {
                    throw new UserAccountLockedException("User account is locked");
                }
                if (!user.isAccountActive()) {
                    throw new UserAccountDisabledException("User account is disabled");
                }
            }
            
            // Verify password
            if (!passwordEncoder.matches(password, user.getPasswordHash())) {
                authUtil.incrementFailedLoginAttempts(user);
                userRepository.save(user);
                throw new InvalidUserCredentialsException("Invalid credentials");
            }
            
            // Reset failed login attempts and update last login
            authUtil.resetFailedLoginAttempts(user);
            authUtil.updateLastLogin(user);
            userRepository.save(user);
            
            // Generate tokens (TODO: Implement JWT token generation)
            String accessToken = "dummy_access_token"; // TODO: Generate real JWT
            String refreshToken = "dummy_refresh_token"; // TODO: Generate real JWT
            Long expiresIn = 3600L; // 1 hour
            
            log.info("User authenticated successfully: {}", usernameOrEmail);
            return userMapper.toAuthenticationResponse(user, accessToken, refreshToken, expiresIn);
            
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "authenticate user");
        }
    }
    
    /**
     * Đổi mật khẩu
     */
    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        log.info("Changing password for user ID: {}", userId);
        
        try {
            // Validate request
            if (!passwordUtil.isValidChangePasswordRequest(request)) {
                throw new WeakPasswordException("New password and confirm password do not match");
            }
            
            User user = findUserEntityById(userId);
            
            // Verify current password
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
                throw new InvalidUserCredentialsException("Current password is incorrect");
            }
            
            // Update password
            String newHashedPassword = passwordEncoder.encode(request.getNewPassword());
            passwordUtil.updateUserPassword(user, newHashedPassword);
            
            userRepository.save(user);
            log.info("Password changed successfully for user ID: {}", userId);
            
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "change password");
        }
    }
    
    /**
     * Reset password
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        log.info("Resetting password for email: {}", request.getEmail());
        
        try {
            User user = findUserEntityByEmail(request.getEmail());
            
            // Generate reset token
            String resetToken = passwordUtil.generatePasswordResetToken(user);
            
            userRepository.save(user);
            
            // TODO: Send email with reset token
            log.info("Password reset token generated for user: {}", request.getEmail());
            
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "reset password");
        }
    }
    
    /**
     * Lấy user profile
     */
    public UserProfileResponse getUserProfile(String id) {
        try {
            User user = findUserEntityById(id);
            return userMapper.toUserProfileResponse(user);
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "get user profile");
        }
    }
    
    /**
     * Cập nhật user profile
     */
    @Transactional
    public UserProfileResponse updateUserProfile(String id, UpdateUserRequest request) {
        log.info("Updating profile for user ID: {}", id);
        
        try {
            User user = findUserEntityById(id);
            userMapper.updateUserFromRequest(user, request);
            
            User updatedUser = userRepository.save(user);
            return userMapper.toUserProfileResponse(updatedUser);
            
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "update user profile");
        }
    }
    
    // ===== INTERNAL METHODS =====
    
    /**
     * Tìm user entity theo ID (internal use)
     */
    public User findUserEntityById(String id) {
        try {
            return userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + id));
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "find user entity by ID");
        }
    }
    
    /**
     * Tìm user entity theo email (internal use)
     */
    public User findUserEntityByEmail(String email) {
        try {
            return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "find user entity by email");
        }
    }
    
    /**
     * Tìm user entity theo username hoặc email (internal use)
     */
    public User findUserEntityByUsernameOrEmail(String usernameOrEmail) {
        try {
            return userRepository.findByUsernameOrEmail(usernameOrEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found with username or email: " + usernameOrEmail));
        } catch (DataAccessException ex) {
            throw ExceptionUtils.wrapDatabaseException(ex, "find user entity by username or email");
        }
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
        
        // Validate password strength
        if (isWeakPassword(request.getPassword())) {
            throw new WeakPasswordException("Password does not meet security requirements");
        }
    }
    
    /**
     * Create user role
     */
    @Transactional
    private void createUserRole(User user, UserRole role, User assignedBy) {
        UserRole userRole = UserRole.builder()
                .user(user)
                .role(role)
                .assignedBy(assignedBy)
                .isActive(true)
                .build();
        
        userRoleRepository.save(userRole);
    }
    
    /**
     * Validate email format
     */
    private boolean isValidEmail(String email) {
        return email != null && email.contains("@") && email.contains(".");
    }
    
    /**
     * Check if password is weak
     */
    private boolean isWeakPassword(String password) {
        return password == null || password.length() < 8;
    }
}