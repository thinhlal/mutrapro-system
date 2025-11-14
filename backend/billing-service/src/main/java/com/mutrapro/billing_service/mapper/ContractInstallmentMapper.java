package com.mutrapro.billing_service.mapper;

import com.mutrapro.billing_service.dto.response.ContractInstallmentResponse;
import com.mutrapro.billing_service.entity.ContractInstallment;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ContractInstallmentMapper {
    
    ContractInstallmentResponse toResponse(ContractInstallment installment);
}

