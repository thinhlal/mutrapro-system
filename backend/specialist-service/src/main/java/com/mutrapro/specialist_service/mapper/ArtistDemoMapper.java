package com.mutrapro.specialist_service.mapper;

import com.mutrapro.specialist_service.dto.request.CreateDemoRequest;
import com.mutrapro.specialist_service.dto.request.UpdateDemoRequest;
import com.mutrapro.specialist_service.dto.request.UpdateDemoVisibilityRequest;
import com.mutrapro.specialist_service.dto.response.ArtistDemoResponse;
import com.mutrapro.specialist_service.entity.ArtistDemo;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = {SkillMapper.class})
public interface ArtistDemoMapper {
    
    @Mapping(source = "specialist.specialistId", target = "specialistId")
    @Mapping(source = "skill", target = "skill")
    ArtistDemoResponse toArtistDemoResponse(ArtistDemo artistDemo);
    
    List<ArtistDemoResponse> toArtistDemoResponseList(List<ArtistDemo> artistDemos);
    
    @Mapping(target = "demoId", ignore = true)
    @Mapping(target = "specialist", ignore = true)
    @Mapping(target = "skill", ignore = true)
    @Mapping(source = "previewUrl", target = "previewUrl")
    ArtistDemo toArtistDemo(CreateDemoRequest request);
    
    @Mapping(target = "demoId", ignore = true)
    @Mapping(target = "specialist", ignore = true)
    @Mapping(target = "skill", ignore = true)
    void updateDemoFromRequest(@MappingTarget ArtistDemo artistDemo, UpdateDemoRequest request);
    
    @Mapping(target = "demoId", ignore = true)
    @Mapping(target = "specialist", ignore = true)
    @Mapping(target = "title", ignore = true)
    @Mapping(target = "description", ignore = true)
    @Mapping(target = "skill", ignore = true)
    @Mapping(target = "previewUrl", ignore = true)
    void updateVisibilityFromRequest(@MappingTarget ArtistDemo artistDemo, UpdateDemoVisibilityRequest request);
}

