package com.mutrapro.specialist_service.client;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.enums.Role;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
    name = "identity-service",
    url = "${identity.service.base-url:http://localhost:8081}",
    path = "/admin/users"
)
public interface IdentityServiceFeignClient {

    /**
     * Update user role (Admin only)
     */
    @PutMapping("/{id}/role")
    ApiResponse<Void> updateUserRole(
        @PathVariable("id") String userId,
        @RequestParam("role") Role role
    );
}

