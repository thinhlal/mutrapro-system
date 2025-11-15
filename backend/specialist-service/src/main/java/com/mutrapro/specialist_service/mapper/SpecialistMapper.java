package com.mutrapro.specialist_service.mapper;

import com.mutrapro.specialist_service.dto.request.CreateSpecialistRequest;
import com.mutrapro.specialist_service.dto.request.UpdateProfileRequest;
import com.mutrapro.specialist_service.dto.request.UpdateSpecialistSettingsRequest;
import com.mutrapro.specialist_service.dto.response.SpecialistResponse;
import com.mutrapro.specialist_service.entity.Specialist;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SpecialistMapper {
    
    SpecialistResponse toSpecialistResponse(Specialist specialist);
    
    List<SpecialistResponse> toSpecialistResponseList(List<Specialist> specialists);
    
    @Mapping(target = "specialistId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "rating", ignore = true)
    @Mapping(target = "totalProjects", ignore = true)
    Specialist toSpecialist(CreateSpecialistRequest request);
    
    @Mapping(target = "specialistId", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "specialization", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "rating", ignore = true)
    @Mapping(target = "totalProjects", ignore = true)
    void updateProfileFromRequest(@MappingTarget Specialist specialist, UpdateProfileRequest request);
    
    @Mapping(target = "specialistId", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "specialization", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "experienceYears", ignore = true)
    @Mapping(target = "portfolioUrl", ignore = true)
    @Mapping(target = "bio", ignore = true)
    @Mapping(target = "rating", ignore = true)
    @Mapping(target = "totalProjects", ignore = true)
    void updateSettingsFromRequest(@MappingTarget Specialist specialist, UpdateSpecialistSettingsRequest request);
}

