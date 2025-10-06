package com.mutrapro.auth_service.mapper;

import com.mutrapro.auth_service.dto.request.RegisterRequest;
import com.mutrapro.auth_service.entity.UsersAuth;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UsersAuthMapper {

    UsersAuth toUsersAuth(RegisterRequest request);
}



