package com.mutrapro.identity_service.service;

import com.mutrapro.identity_service.dto.request.UserSearchRequest;
import com.mutrapro.identity_service.dto.response.FullUserResponse;
import com.mutrapro.identity_service.dto.response.UserPageResponse;
import com.mutrapro.identity_service.entity.User;
import com.mutrapro.identity_service.entity.UsersAuth;
import com.mutrapro.identity_service.repository.UserRepository;
import com.mutrapro.identity_service.repository.UsersAuthRepository;
import com.mutrapro.shared.enums.Role;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for User Search and Filtering (Admin only)
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserSearchService {

    private final UsersAuthRepository usersAuthRepository;
    private final UserRepository userRepository;

    /**
     * Search and filter users with pagination
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserPageResponse searchUsers(UserSearchRequest request) {
        log.info("Searching users with filters: {}", request);

        // Build specification for dynamic filtering
        Specification<UsersAuth> spec = buildSpecification(request);

        // Build pageable
        Sort sort = buildSort(request.getSortBy(), request.getSortDirection());
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), sort);

        // Execute search
        Page<UsersAuth> usersAuthPage = usersAuthRepository.findAll(spec, pageable);
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
     * Build dynamic specification for filtering
     */
    private Specification<UsersAuth> buildSpecification(UserSearchRequest request) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by keyword (search in email)
            if (request.getKeyword() != null && !request.getKeyword().trim().isEmpty()) {
                String keyword = "%" + request.getKeyword().toLowerCase() + "%";
                predicates.add(
                    criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("email")),
                        keyword
                    )
                );
            }

            // Filter by role
            if (request.getRole() != null) {
                predicates.add(criteriaBuilder.equal(root.get("role"), request.getRole()));
            }

            // Filter by email verified
            if (request.getEmailVerified() != null) {
                predicates.add(criteriaBuilder.equal(root.get("emailVerified"), request.getEmailVerified()));
            }

            // Filter by auth provider
            if (request.getAuthProvider() != null && !request.getAuthProvider().trim().isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("authProvider"), request.getAuthProvider()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Build sort criteria
     */
    private Sort buildSort(String sortBy, String sortDirection) {
        Sort.Direction direction = "ASC".equalsIgnoreCase(sortDirection)
            ? Sort.Direction.ASC
            : Sort.Direction.DESC;

        return Sort.by(direction, sortBy);
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
     * Get user statistics for admin dashboard
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserStatisticsResponse getUserStatistics() {
        log.info("Getting user statistics");

        long totalUsers = usersAuthRepository.count();
        long activeUsers = userRepository.findByIsActive(true).size();
        long verifiedUsers = usersAuthRepository.findByEmailVerified(true).size();

        // Count by role
        long systemAdmins = usersAuthRepository.findByRole(Role.SYSTEM_ADMIN).size();
        long managers = usersAuthRepository.findByRole(Role.MANAGER).size();
        long transcriptions = usersAuthRepository.findByRole(Role.TRANSCRIPTION).size();
        long arrangements = usersAuthRepository.findByRole(Role.ARRANGEMENT).size();
        long recordingArtists = usersAuthRepository.findByRole(Role.RECORDING_ARTIST).size();
        long customers = usersAuthRepository.findByRole(Role.CUSTOMER).size();

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
     * Response for user statistics
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class UserStatisticsResponse {
        private long totalUsers;
        private long activeUsers;
        private long inactiveUsers;
        private long verifiedUsers;
        private long unverifiedUsers;
        private long systemAdmins;
        private long managers;
        private long transcriptions;
        private long arrangements;
        private long recordingArtists;
        private long customers;
    }
}
