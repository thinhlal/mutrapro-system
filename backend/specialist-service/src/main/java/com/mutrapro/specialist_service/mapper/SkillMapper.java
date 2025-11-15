package com.mutrapro.specialist_service.mapper;

import com.mutrapro.specialist_service.dto.request.AdminUpdateSkillRequest;
import com.mutrapro.specialist_service.dto.request.CreateSkillRequest;
import com.mutrapro.specialist_service.dto.response.SkillResponse;
import com.mutrapro.specialist_service.entity.Skill;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SkillMapper {
    
    SkillResponse toSkillResponse(Skill skill);
    
    List<SkillResponse> toSkillResponseList(List<Skill> skills);
    
    @Mapping(target = "skillId", ignore = true)
    Skill toSkill(CreateSkillRequest request);
    
    @Mapping(target = "skillId", ignore = true)
    void updateSkillFromRequest(@MappingTarget Skill skill, AdminUpdateSkillRequest request);
}

