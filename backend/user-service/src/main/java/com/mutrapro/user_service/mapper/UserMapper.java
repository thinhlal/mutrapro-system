package com.mutrapro.user_service.mapper;

import com.mutrapro.user_service.dto.request.CreateUserRequest;
import com.mutrapro.user_service.dto.request.UpdateUserRequest;
import com.mutrapro.user_service.dto.response.UserProfileResponse;
import com.mutrapro.user_service.dto.response.UserResponse;
import com.mutrapro.user_service.entity.User;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct Mapper giữa User (users_profile) và DTOs (không roles/credentials)
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    @Mapping(source = "userId", target = "userId")
    UserResponse toUserResponse(User user);

    @Mapping(source = "userId", target = "userId")
    @Mapping(constant = "0", target = "totalProjects")
    @Mapping(constant = "0", target = "completedTasks")
    @Mapping(constant = "0", target = "activeProjects")
    @Mapping(constant = "null", target = "specialization")
    @Mapping(constant = "null", target = "experienceYears")
    @Mapping(constant = "null", target = "hourlyRate")
    UserProfileResponse toUserProfileResponse(User user);

    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    User toUser(CreateUserRequest request);

    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateUserFromRequest(User user, UpdateUserRequest request);

    List<UserResponse> toUserResponseList(List<User> users);
    List<UserProfileResponse> toUserProfileResponseList(List<User> users);
}
