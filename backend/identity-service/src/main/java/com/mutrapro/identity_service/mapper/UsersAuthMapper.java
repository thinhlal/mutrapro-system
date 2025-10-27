package com.mutrapro.identity_service.mapper;

import com.mutrapro.identity_service.dto.request.RegisterRequest;
import com.mutrapro.identity_service.entity.UsersAuth;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface UsersAuthMapper {

    UsersAuth toUsersAuth(RegisterRequest request);
}

