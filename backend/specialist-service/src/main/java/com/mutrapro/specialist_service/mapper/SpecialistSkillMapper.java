package com.mutrapro.specialist_service.mapper;

import com.mutrapro.specialist_service.dto.request.AddSkillRequest;
import com.mutrapro.specialist_service.dto.request.UpdateSkillRequest;
import com.mutrapro.specialist_service.dto.response.SpecialistSkillResponse;
import com.mutrapro.specialist_service.entity.SpecialistSkill;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = {SkillMapper.class})
public interface SpecialistSkillMapper {
    
    @Mapping(source = "specialist.specialistId", target = "specialistId")
    @Mapping(source = "skill", target = "skill")
    SpecialistSkillResponse toSpecialistSkillResponse(SpecialistSkill specialistSkill);
    
    List<SpecialistSkillResponse> toSpecialistSkillResponseList(List<SpecialistSkill> specialistSkills);
    
    @Mapping(target = "specialistSkillId", ignore = true)
    @Mapping(target = "specialist", ignore = true)
    @Mapping(target = "skill", ignore = true)
    SpecialistSkill toSpecialistSkill(AddSkillRequest request);
    
    @Mapping(target = "specialistSkillId", ignore = true)
    @Mapping(target = "specialist", ignore = true)
    @Mapping(target = "skill", ignore = true)
    void updateSkillFromRequest(@MappingTarget SpecialistSkill specialistSkill, UpdateSkillRequest request);
}

