package com.mutrapro.request_service.mapper;

import com.mutrapro.request_service.dto.response.ServiceRequestResponse;
import com.mutrapro.request_service.entity.ServiceRequest;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.List;

/**
 * MapStruct Mapper giữa ServiceRequest entity và ServiceRequestResponse DTO
 */
@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ServiceRequestMapper {

    /**
     * Map ServiceRequest entity sang ServiceRequestResponse DTO
     * MapStruct sẽ tự động map các field có cùng tên
     * Field instrumentIds sẽ được map bằng @AfterMapping
     */
    @Mapping(target = "instrumentIds", ignore = true)
    ServiceRequestResponse toServiceRequestResponse(ServiceRequest serviceRequest);

    /**
     * Map List<ServiceRequest> sang List<ServiceRequestResponse>
     */
    List<ServiceRequestResponse> toServiceRequestResponseList(List<ServiceRequest> serviceRequests);

    /**
     * Sau khi map các field thông thường, map instrumentIds từ notationInstruments
     */
    @AfterMapping
    default void mapInstrumentIds(
            ServiceRequest serviceRequest, 
            @MappingTarget ServiceRequestResponse response) {
        if (serviceRequest.getNotationInstruments() != null 
                && !serviceRequest.getNotationInstruments().isEmpty()) {
            List<String> instrumentIds = serviceRequest.getNotationInstruments().stream()
                    .map(req -> req.getNotationInstrument().getInstrumentId())
                    .toList();
            response.setInstrumentIds(instrumentIds);
        } else {
            response.setInstrumentIds(List.of());
        }
    }
}

