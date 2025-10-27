package com.mutrapro.identity_service.mapper;

import com.mutrapro.identity_service.dto.request.CreateUserRequest;
import com.mutrapro.identity_service.dto.request.UpdateUserRequest;
import com.mutrapro.identity_service.dto.response.UserProfileResponse;
import com.mutrapro.identity_service.dto.response.UserResponse;
import com.mutrapro.identity_service.entity.User;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct Mapper giữa User (users table) và DTOs
 * Note: User entity không chứa email/role (thuộc users_auth)
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    UserResponse toUserResponse(User user);

    UserProfileResponse toUserProfileResponse(User user);

    User toUser(CreateUserRequest request);

    void updateUserFromRequest(@MappingTarget User user, UpdateUserRequest request);

    List<UserResponse> toUserResponseList(List<User> users);
    List<UserProfileResponse> toUserProfileResponseList(List<User> users);
}

