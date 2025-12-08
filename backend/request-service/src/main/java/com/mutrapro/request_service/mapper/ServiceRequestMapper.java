package com.mutrapro.request_service.mapper;

import com.mutrapro.request_service.dto.response.ServiceRequestResponse;
import com.mutrapro.request_service.entity.ServiceRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

/**
 * MapStruct Mapper giữa ServiceRequest entity và ServiceRequestResponse DTO
 * 
 * Note: Field instruments is handled manually in ServiceRequestService.getServiceRequestById()
 * because it requires extracting full instrument info from nested lazy-loaded entities within a transaction context.
 */
@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ServiceRequestMapper {

    /**
     * Map ServiceRequest entity sang ServiceRequestResponse DTO
     * MapStruct sẽ tự động map các field có cùng tên
     * Field instruments được set manually trong service layer
     * preferredSpecialists sẽ được map tự động vì cùng type PreferredSpecialistInfo
     */
    @Mapping(target = "instruments", ignore = true)
    ServiceRequestResponse toServiceRequestResponse(ServiceRequest serviceRequest);

    /**
     * Map List<ServiceRequest> sang List<ServiceRequestResponse>
     */
    List<ServiceRequestResponse> toServiceRequestResponseList(List<ServiceRequest> serviceRequests);
}

