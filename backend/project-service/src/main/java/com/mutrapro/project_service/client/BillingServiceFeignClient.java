package com.mutrapro.project_service.client;

import org.springframework.cloud.openfeign.FeignClient;

/**
 * Feign Client to call Billing Service
 */
@FeignClient(
    name = "billing-service",
    url = "${billing.service.base-url:http://billing-service:8083}"
)
public interface BillingServiceFeignClient {
    // Feign client methods sẽ được thêm khi cần
}

