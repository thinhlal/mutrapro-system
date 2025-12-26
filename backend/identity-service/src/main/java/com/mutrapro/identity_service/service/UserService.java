package com.mutrapro.identity_service.service;

import com.mutrapro.identity_service.dto.request.*;
import com.mutrapro.identity_service.dto.response.*;
import com.mutrapro.identity_service.dto.response.UserDashboardStatisticsResponse;
import com.mutrapro.identity_service.entity.User;
import com.mutrapro.identity_service.entity.UsersAuth;
import com.mutrapro.identity_service.exception.*;
import com.mutrapro.identity_service.mapper.UserMapper;
import com.mutrapro.identity_service.repository.UserRepository;
import com.mutrapro.identity_service.repository.UsersAuthRepository;
import com.mutrapro.shared.enums.Role;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * User Service implementation với proper exception handling
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {
    
    private final UserRepository userRepository;
    private final UsersAuthRepository usersAuthRepository;
    private final UserMapper userMapper;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    // ===== PUBLIC API METHODS =====
    
    /**
     * Lấy danh sách tất cả users (chỉ SYSTEM_ADMIN)
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public List<FullUserResponse> getAllUsers() {
        log.info("Getting all users");
        List<UsersAuth> usersAuthList = usersAuthRepository.findAll();
        
        return usersAuthList.stream()
            .map(userAuth -> {
                User user = userRepository.findByUserId(userAuth.getUserId()).orElse(null);
                return FullUserResponse.builder()
                    .userId(userAuth.getUserId())
                    .fullName(user != null ? user.getFullName() : null)
                    .phone(user != null ? user.getPhone() : null)
                    .address(user != null ? user.getAddress() : null)
                    .avatarUrl(user != null ? user.getAvatarUrl() : null)
                    .active(user != null && user.isActive())
                    .email(userAuth.getEmail())
                    .role(userAuth.getRole().name())
                    .emailVerified(userAuth.isEmailVerified())
                    .authProvider(userAuth.getAuthProvider())
                    .authProviderId(userAuth.getAuthProviderId())
                    .isNoPassword(!userAuth.isHasLocalPassword())
                    .build();
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Tìm user theo ID và trả về UserResponse
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN') or authentication.name == @userRepository.findById(#id).orElse(null)?.email")
    public UserResponse findById(String id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> UserNotFoundException.byId(id));
        return userMapper.toUserResponse(user);
    }
    
    
    /**
     * Tạo user mới (Admin only - dùng CreateUserRequest cũ, không khuyến khích dùng)
     * Note: Nên dùng createFullUser thay vì method này
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserResponse createUser(CreateUserRequest request) {
        throw new UnsupportedOperationException(
            "User creation not supported via this endpoint. Use createFullUser instead."
        );
    }
    
    /**
     * Tạo user mới đầy đủ (bao gồm users và users_auth) - Admin only
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public FullUserResponse createFullUser(CreateFullUserRequest request) {
        log.info("Creating new user with email: {}", request.getEmail());
        
        // Check if email already exists
        usersAuthRepository.findByEmail(request.getEmail()).ifPresent(u -> {
            throw UserAlreadyExistsException.create();
        });
        
        // Create UsersAuth
        UsersAuth usersAuth = UsersAuth.builder()
            .email(request.getEmail())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .role(request.getRole())
            .emailVerified(request.getEmailVerified() != null ? request.getEmailVerified() : false)
            .status(request.getIsActive() != null && request.getIsActive() ? "active" : "inactive")
            .authProvider("LOCAL")
            .hasLocalPassword(true)
            .build();
        UsersAuth savedUsersAuth = usersAuthRepository.save(usersAuth);
        
        // Create User profile
        User user = User.builder()
            .userId(savedUsersAuth.getUserId())
            .fullName(request.getFullName())
            .phone(request.getPhone())
            .address(request.getAddress())
            .isActive(request.getIsActive() != null ? request.getIsActive() : true)
            .build();
        userRepository.save(user);
        
        log.info("User created successfully with ID: {}", savedUsersAuth.getUserId());
        
        return FullUserResponse.builder()
            .userId(savedUsersAuth.getUserId())
            .email(savedUsersAuth.getEmail())
            .role(savedUsersAuth.getRole().name())
            .emailVerified(savedUsersAuth.isEmailVerified())
            .authProvider(savedUsersAuth.getAuthProvider())
            .authProviderId(savedUsersAuth.getAuthProviderId())
            .isNoPassword(!savedUsersAuth.isHasLocalPassword())
            .fullName(user.getFullName())
            .phone(user.getPhone())
            .address(user.getAddress())
            .avatarUrl(user.getAvatarUrl())
            .active(user.isActive())
            .build();
    }
    
    /**
     * Cập nhật user
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN') or authentication.name == @userRepository.findById(#id).orElse(null)?.email")
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
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public void deleteUser(String id) {
        log.info("Deleting user with ID: {}", id);
        
        User user = findUserEntityById(id);
        userRepository.delete(user);
        log.info("User deleted successfully with ID: {}", id);
    }

    /**
     * Lấy đầy đủ thông tin user (users + users_auth)
     */
    public FullUserResponse getFullUser(String id) {
        UsersAuth userAuth = usersAuthRepository.findByUserId(id)
            .orElseThrow(() -> UserNotFoundException.byId(id));
        User user = userRepository.findByUserId(userAuth.getUserId())
            .orElseThrow(() -> UserNotFoundException.byId(userAuth.getUserId()));

        return FullUserResponse.builder()
            .userId(user.getUserId())
            .fullName(user.getFullName())
            .phone(user.getPhone())
            .address(user.getAddress())
            .avatarUrl(user.getAvatarUrl())
            .active(user.isActive())
            .email(userAuth.getEmail())
            .role(userAuth.getRole().name())
            .emailVerified(userAuth.isEmailVerified())
            .authProvider(userAuth.getAuthProvider())
            .authProviderId(userAuth.getAuthProviderId())
            .isNoPassword(!userAuth.isHasLocalPassword())
            .build();
    }

    /**
     * Cập nhật đầy đủ thông tin (users + users_auth)
     */
    @Transactional
    public FullUserResponse updateFullUser(String id, UpdateFullUserRequest request) {
        log.info("Updating full user for ID: {}", id);

        UsersAuth userAuth = usersAuthRepository.findByUserId(id)
            .orElseThrow(() -> UserNotFoundException.byId(id));
        User user = userRepository.findByUserId(userAuth.getUserId())
            .orElseThrow(() -> UserNotFoundException.byId(userAuth.getUserId()));

        // Update users fields if provided
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getIsActive() != null) {
            user.setActive(request.getIsActive());
        }

        // Update users_auth restricted fields if provided
        if (request.getEmailVerified() != null) {
            userAuth.setEmailVerified(request.getEmailVerified());
        }

        // Persist
        userRepository.save(user);
        usersAuthRepository.save(userAuth);

        return FullUserResponse.builder()
            .userId(user.getUserId())
            .fullName(user.getFullName())
            .phone(user.getPhone())
            .address(user.getAddress())
            .avatarUrl(user.getAvatarUrl())
            .active(user.isActive())
            .email(userAuth.getEmail())
            .role(userAuth.getRole().name())
            .emailVerified(userAuth.isEmailVerified())
            .authProvider(userAuth.getAuthProvider())
            .authProviderId(userAuth.getAuthProviderId())
            .isNoPassword(!userAuth.isHasLocalPassword())
            .build();
    }
    
    // ===== INTERNAL METHODS =====
    
    /**
     * Tìm user entity theo ID (internal use)
     */
    public User findUserEntityById(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> UserNotFoundException.byId(id));
    }

    /**
     * Get user by email (Admin only)
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public FullUserResponse getUserByEmail(String email) {
        log.info("Getting user by email: {}", email);
        UsersAuth userAuth = usersAuthRepository.findByEmail(email)
            .orElseThrow(() -> UserNotFoundException.byEmail(email));
        User user = userRepository.findByUserId(userAuth.getUserId())
            .orElse(null);

        return FullUserResponse.builder()
            .userId(userAuth.getUserId())
            .email(userAuth.getEmail())
            .fullName(user != null ? user.getFullName() : null)
            .phone(user != null ? user.getPhone() : null)
            .address(user != null ? user.getAddress() : null)
            .avatarUrl(user != null ? user.getAvatarUrl() : null)
            .role(userAuth.getRole().name())
            .emailVerified(userAuth.isEmailVerified())
            .active(user != null && user.isActive())
            .authProvider(userAuth.getAuthProvider())
            .authProviderId(userAuth.getAuthProviderId())
            .isNoPassword(!userAuth.isHasLocalPassword())
            .build();
    }

    // ===== PROFILE MANAGEMENT =====

    /**
     * Get current user's profile
     */
    public FullUserResponse getMyProfile() {
        String email = getCurrentUserEmail();
        log.info("Getting profile for user: {}", email);

        UsersAuth userAuth = usersAuthRepository.findByEmail(email)
            .orElseThrow(() -> UserNotFoundException.byEmail(email));

        User user = userRepository.findByUserId(userAuth.getUserId())
            .orElse(null);

        return FullUserResponse.builder()
            .userId(userAuth.getUserId())
            .email(userAuth.getEmail())
            .fullName(user != null ? user.getFullName() : null)
            .phone(user != null ? user.getPhone() : null)
            .address(user != null ? user.getAddress() : null)
            .avatarUrl(user != null ? user.getAvatarUrl() : null)
            .role(userAuth.getRole().name())
            .emailVerified(userAuth.isEmailVerified())
            .active(user != null && user.isActive())
            .authProvider(userAuth.getAuthProvider())
            .authProviderId(userAuth.getAuthProviderId())
            .isNoPassword(!userAuth.isHasLocalPassword())
            .build();
    }

    /**
     * Update current user's profile
     */
    @Transactional
    public UserResponse updateMyProfile(UpdateUserRequest request) {
        String email = getCurrentUserEmail();
        log.info("Updating profile for user: {}", email);

        UsersAuth userAuth = usersAuthRepository.findByEmail(email)
            .orElseThrow(() -> UserNotFoundException.byEmail(email));

        // Use existing updateUser method
        return updateUser(userAuth.getUserId(), request);
    }

    // ===== SECURITY =====

    /**
     * Change password
     */
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        String email = getCurrentUserEmail();
        log.info("Changing password for user: {}", email);

        // Validate password match
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new PasswordMismatchException();
        }

        UsersAuth userAuth = usersAuthRepository.findByEmail(email)
            .orElseThrow(() -> UserNotFoundException.byEmail(email));

        // Check if user has local password
        if (!userAuth.isHasLocalPassword()) {
            throw NoLocalPasswordException.create();
        }

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), userAuth.getPasswordHash())) {
            throw new InvalidCurrentPasswordException();
        }

        // Check if new password is same as current
        if (passwordEncoder.matches(request.getNewPassword(), userAuth.getPasswordHash())) {
            throw new SamePasswordException();
        }

        // Update password
        userAuth.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        usersAuthRepository.save(userAuth);

        log.info("Password changed successfully for user: {}", email);
    }

    // ===== STATISTICS =====

    /**
     * Get user statistics for admin dashboard
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserStatisticsResponse getUserStatistics() {
        log.info("Getting user statistics");

        long totalUsers = usersAuthRepository.count();
        // Use count queries instead of .size() to avoid loading all records into memory
        long activeUsers = userRepository.countByIsActive(true);
        long verifiedUsers = usersAuthRepository.countByEmailVerified(true);

        // Count by role - use count queries for better performance
        long systemAdmins = usersAuthRepository.countByRole(Role.SYSTEM_ADMIN);
        long managers = usersAuthRepository.countByRole(Role.MANAGER);
        long transcriptions = usersAuthRepository.countByRole(Role.TRANSCRIPTION);
        long arrangements = usersAuthRepository.countByRole(Role.ARRANGEMENT);
        long recordingArtists = usersAuthRepository.countByRole(Role.RECORDING_ARTIST);
        long customers = usersAuthRepository.countByRole(Role.CUSTOMER);

        return UserStatisticsResponse.builder()
            .totalUsers(totalUsers)
            .activeUsers(activeUsers)
            .inactiveUsers(totalUsers - activeUsers)
            .verifiedUsers(verifiedUsers)
            .unverifiedUsers(totalUsers - verifiedUsers)
            .systemAdmins(systemAdmins)
            .managers(managers)
            .transcriptions(transcriptions)
            .arrangements(arrangements)
            .recordingArtists(recordingArtists)
            .customers(customers)
            .build();
    }

    /**
     * Get user statistics grouped by date for a given time range
     * @param days Number of days to look back (7, 30, etc.)
     * @return UserStatisticsByDateResponse with daily counts
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserStatisticsByDateResponse getUserStatisticsByDate(int days) {
        log.info("Getting user statistics by date for last {} days", days);
        
        // Set endDate to start of tomorrow to include all users from today
        // Query uses < :endDate, so this will include everything up to end of today
        LocalDateTime endDate = LocalDateTime.now().toLocalDate().plusDays(1).atStartOfDay();
        
        // For "today" (days=1), start from beginning of today (00:00:00)
        // For other ranges, use last N days from now
        LocalDateTime startDate;
        if (days == 1) {
            startDate = LocalDateTime.now().toLocalDate().atStartOfDay();
        } else {
            startDate = endDate.minusDays(days);
        }
        
        log.debug("User statistics date range: startDate={}, endDate={}, days={}", startDate, endDate, days);
        
        List<Object[]> results = usersAuthRepository.countUsersByDateRange(startDate, endDate);
        
        // Convert results to DailyUserStats
        List<UserStatisticsByDateResponse.DailyUserStats> dailyStats = results.stream()
            .map(result -> {
                LocalDate date = (LocalDate) result[0];
                Long count = (Long) result[1];
                return UserStatisticsByDateResponse.DailyUserStats.builder()
                    .date(date)
                    .count(count)
                    .build();
            })
            .collect(Collectors.toList());
        
        return UserStatisticsByDateResponse.builder()
                .dailyStats(dailyStats)
                .build();
    }

    /**
     * Get all user dashboard statistics (statistics và statistics over time)
     * Gộp tất cả user statistics vào một response để giảm số lượng API calls
     * @param days Number of days to look back for statistics over time
     * @return UserDashboardStatisticsResponse với đầy đủ statistics
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserDashboardStatisticsResponse getUserDashboardStatistics(int days) {
        log.info("Getting all user dashboard statistics for last {} days", days);
        
        UserStatisticsResponse statistics = getUserStatistics();
        UserStatisticsByDateResponse statisticsOverTime = getUserStatisticsByDate(days);
        
        return UserDashboardStatisticsResponse.builder()
                .statistics(statistics)
                .statisticsOverTime(statisticsOverTime)
                .build();
    }

    // ===== SEARCH =====

    /**
     * Search and filter users with pagination
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserPageResponse searchUsers(UserSearchRequest request) {
        log.info("Searching users with filters: {}", request);

        // Prepare parameters
        String keyword = (request.getKeyword() != null && !request.getKeyword().trim().isEmpty()) 
            ? request.getKeyword().trim() : null;
        String roleStr = request.getRole() != null ? request.getRole().name() : null;
        Boolean emailVerified = request.getEmailVerified();
        String authProvider = request.getAuthProvider();

        // Simple pagination - sorting is handled in query (ORDER BY created_at DESC)
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize());

        // Execute native query - Spring Data JPA handles pagination automatically!
        Page<UsersAuth> usersAuthPage = usersAuthRepository.searchUsersWithFilters(
            keyword, roleStr, emailVerified, authProvider, pageable
        );
        List<UsersAuth> usersAuthList = usersAuthPage.getContent();

        // Batch load all User entities to avoid N+1 query problem
        Map<String, User> userMap = Map.of();
        if (!usersAuthList.isEmpty()) {
            List<String> userIds = usersAuthList.stream()
                .map(UsersAuth::getUserId)
                .collect(Collectors.toList());
            
            userMap = userRepository.findAllByUserIdIn(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, user -> user));
        }

        // Map to response using pre-loaded userMap
        final Map<String, User> finalUserMap = userMap;
        List<FullUserResponse> userResponses = usersAuthList.stream()
            .map(userAuth -> mapToFullUserResponse(userAuth, finalUserMap.get(userAuth.getUserId())))
            .collect(Collectors.toList());

        return UserPageResponse.builder()
            .users(userResponses)
            .currentPage(usersAuthPage.getNumber())
            .totalPages(usersAuthPage.getTotalPages())
            .totalElements(usersAuthPage.getTotalElements())
            .pageSize(usersAuthPage.getSize())
            .build();
    }

    /**
     * Map UsersAuth to FullUserResponse (with pre-loaded User entity to avoid N+1 queries)
     */
    private FullUserResponse mapToFullUserResponse(UsersAuth userAuth, User user) {
        return FullUserResponse.builder()
            .userId(userAuth.getUserId())
            .email(userAuth.getEmail())
            .role(userAuth.getRole().name())
            .emailVerified(userAuth.isEmailVerified())
            .authProvider(userAuth.getAuthProvider())
            .authProviderId(userAuth.getAuthProviderId())
            .isNoPassword(!userAuth.isHasLocalPassword())
            .fullName(user != null ? user.getFullName() : null)
            .phone(user != null ? user.getPhone() : null)
            .address(user != null ? user.getAddress() : null)
            .avatarUrl(user != null ? user.getAvatarUrl() : null)
            .active(user != null && user.isActive())
            .build();
    }

    /**
     * Get security settings
     */
    public SecuritySettingsResponse getSecuritySettings() {
        String email = getCurrentUserEmail();
        log.info("Getting security settings for user: {}", email);

        UsersAuth userAuth = usersAuthRepository.findByEmail(email)
            .orElseThrow(() -> UserNotFoundException.byEmail(email));

        return SecuritySettingsResponse.builder()
            .hasLocalPassword(userAuth.isHasLocalPassword())
            .authProvider(userAuth.getAuthProvider())
            .lastPasswordChange(userAuth.getUpdatedAt())
            .twoFactorEnabled(false) // TODO: Implement 2FA
            .lastLoginAt(null) // TODO: Track last login
            .build();
    }

    /**
     * Update user role (Admin only)
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public void updateUserRole(String id, Role role) {
        log.info("Updating role for user ID: {} to role: {}", id, role);
        
        UsersAuth userAuth = usersAuthRepository.findByUserId(id)
            .orElseThrow(() -> UserNotFoundException.byId(id));
        
        userAuth.setRole(role);
        usersAuthRepository.save(userAuth);
        
        log.info("User role updated successfully for user ID: {}", id);
    }

    /**
     * Get current authenticated user's email
     */
    private String getCurrentUserEmail() {
        org.springframework.security.core.Authentication authentication =
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }
        return authentication.getName();
    }
}
