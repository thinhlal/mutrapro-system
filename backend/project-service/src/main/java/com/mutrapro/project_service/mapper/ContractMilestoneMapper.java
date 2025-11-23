package com.mutrapro.project_service.mapper;

import com.mutrapro.project_service.dto.response.ContractMilestoneResponse;
import com.mutrapro.project_service.entity.ContractMilestone;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ContractMilestoneMapper {
    
    ContractMilestoneResponse toResponse(ContractMilestone milestone);
}

