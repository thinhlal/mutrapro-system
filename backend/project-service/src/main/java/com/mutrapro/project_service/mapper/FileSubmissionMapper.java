package com.mutrapro.project_service.mapper;

import com.mutrapro.project_service.dto.response.FileSubmissionResponse;
import com.mutrapro.project_service.entity.FileSubmission;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import java.util.List;

/**
 * MapStruct Mapper giữa FileSubmission entity và FileSubmissionResponse DTO
 */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface FileSubmissionMapper {
    
    /**
     * Map FileSubmission entity sang FileSubmissionResponse DTO
     * Note: fields, fileCount, totalSize được set manually trong service layer
     */
    @Mapping(target = "status", expression = "java(submission.getStatus() == null ? null : submission.getStatus().name())")
    @Mapping(target = "files", ignore = true)
    @Mapping(target = "fileCount", ignore = true)
    @Mapping(target = "totalSize", ignore = true)
    FileSubmissionResponse toResponse(FileSubmission submission);
    
    /**
     * Map List<FileSubmission> sang List<FileSubmissionResponse>
     */
    List<FileSubmissionResponse> toResponseList(List<FileSubmission> submissions);
}

