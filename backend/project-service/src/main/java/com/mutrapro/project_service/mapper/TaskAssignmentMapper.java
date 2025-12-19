package com.mutrapro.project_service.mapper;

import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.TaskAssignment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import java.util.List;

/**
 * MapStruct Mapper giữa TaskAssignment entity và TaskAssignmentResponse DTO
 */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface TaskAssignmentMapper {
    
    /**
     * Map TaskAssignment entity sang TaskAssignmentResponse DTO
     * MapStruct sẽ tự động map các field có cùng tên
     */
    @Mapping(target = "specialistName", source = "specialistNameSnapshot")
    @Mapping(target = "specialistEmail", source = "specialistEmailSnapshot")
    @Mapping(target = "specialistSpecialization", source = "specialistSpecializationSnapshot")
    @Mapping(target = "specialistExperienceYears", source = "specialistExperienceYearsSnapshot")
    @Mapping(target = "specialistUserId", source = "specialistUserIdSnapshot")
    @Mapping(target = "progressPercentage", source = "progressPercentage")
    TaskAssignmentResponse toResponse(TaskAssignment assignment);
    
    /**
     * Map List<TaskAssignment> sang List<TaskAssignmentResponse>
     */
    List<TaskAssignmentResponse> toResponseList(List<TaskAssignment> assignments);
    
    /**
     * Map ContractMilestone sang TaskAssignmentResponse.MilestoneInfo
     * MapStruct sẽ tự động map các field có cùng tên
     * Các field computed (targetDeadline, estimatedDeadline, firstSubmissionLate, overdueNow) 
     * sẽ được set sau bằng @AfterMapping hoặc trong service
     */
    @Mapping(target = "milestoneType", expression = "java(milestone.getMilestoneType() != null ? milestone.getMilestoneType().name() : null)")
    @Mapping(target = "targetDeadline", ignore = true) // Sẽ được set trong service
    @Mapping(target = "estimatedDeadline", ignore = true) // Sẽ được set trong service
    @Mapping(target = "firstSubmissionLate", ignore = true) // Sẽ được set trong service
    @Mapping(target = "overdueNow", ignore = true) // Sẽ được set trong service
    @Mapping(target = "sourceArrangementSubmission", ignore = true) // Sẽ được set trong service
    TaskAssignmentResponse.MilestoneInfo toMilestoneInfo(ContractMilestone milestone);
}

