package com.mutrapro.project_service.mapper;

import com.mutrapro.project_service.dto.request.CreateContractRequest;
import com.mutrapro.project_service.dto.response.ContractResponse;
import com.mutrapro.project_service.entity.Contract;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ContractMapper {
    
    @Mapping(target = "contractId", ignore = true)
    @Mapping(target = "contractNumber", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "managerUserId", ignore = true)
    @Mapping(target = "requestId", ignore = true)
    @Mapping(target = "nameSnapshot", ignore = true)
    @Mapping(target = "phoneSnapshot", ignore = true)
    @Mapping(target = "emailSnapshot", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "depositAmount", ignore = true)
    @Mapping(target = "finalAmount", ignore = true)
    @Mapping(target = "dueDate", ignore = true)
    @Mapping(target = "freeRevisionsIncluded", ignore = true)
    Contract toEntity(CreateContractRequest request);
    
    @Mapping(target = "bSignatureS3Url", source = "BSignatureS3Url")
    @Mapping(target = "bSignedAt", source = "BSignedAt")
    ContractResponse toResponse(Contract contract);
}

