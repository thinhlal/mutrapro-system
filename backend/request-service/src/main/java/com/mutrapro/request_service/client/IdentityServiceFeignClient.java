package com.mutrapro.request_service.client;

import com.mutrapro.request_service.dto.response.ManagerInfoResponse;
import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
    name = "identity-service",
    url = "${identity.service.base-url:http://identity-service:8081}",
    path = "/users"
)
public interface IdentityServiceFeignClient {

    @GetMapping("/{id}/full")
    ApiResponse<ManagerInfoResponse> getFullUserById(@PathVariable("id") String userId);
}
