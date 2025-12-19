package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.response.ContractStatisticsResponse;
import com.mutrapro.project_service.dto.response.TaskStatisticsResponse;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminStatisticsService {

    private final ContractRepository contractRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;

    @Transactional(readOnly = true)
    public ContractStatisticsResponse getContractStatistics() {
        log.info("Calculating contract statistics for admin");
        long total = contractRepository.count();

        Map<ContractStatus, Long> byStatus = new EnumMap<>(ContractStatus.class);
        for (ContractStatus status : ContractStatus.values()) {
            long count = contractRepository.countByStatus(status);
            if (count > 0) byStatus.put(status, count);
        }

        Map<ContractType, Long> byType = new EnumMap<>(ContractType.class);
        for (ContractType type : ContractType.values()) {
            long count = contractRepository.countByContractType(type);
            if (count > 0) byType.put(type, count);
        }

        return ContractStatisticsResponse.builder()
                .totalContracts(total)
                .byStatus(byStatus)
                .byType(byType)
                .build();
    }

    @Transactional(readOnly = true)
    public TaskStatisticsResponse getTaskStatistics() {
        log.info("Calculating task statistics for admin");
        long total = taskAssignmentRepository.count();

        Map<AssignmentStatus, Long> byStatus = new EnumMap<>(AssignmentStatus.class);
        for (AssignmentStatus status : AssignmentStatus.values()) {
            long count = taskAssignmentRepository.countByStatus(status);
            if (count > 0) byStatus.put(status, count);
        }

        Map<TaskType, Long> byType = new EnumMap<>(TaskType.class);
        for (TaskType type : TaskType.values()) {
            long count = taskAssignmentRepository.countByTaskType(type);
            if (count > 0) byType.put(type, count);
        }

        return TaskStatisticsResponse.builder()
                .totalTasks(total)
                .byStatus(byStatus)
                .byType(byType)
                .build();
    }
}


