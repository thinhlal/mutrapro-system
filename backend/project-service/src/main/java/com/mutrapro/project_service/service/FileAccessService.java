package com.mutrapro.project_service.service;

import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.exception.FileAccessDeniedException;
import com.mutrapro.project_service.exception.FileNotFoundException;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.FileRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service kiểm tra quyền truy cập file
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileAccessService {

    FileRepository fileRepository;
    TaskAssignmentRepository taskAssignmentRepository;
    ContractRepository contractRepository;

    /**
     * Kiểm tra xem user có quyền xem file hay không
     * @param fileId ID của file
     * @param userId ID của user
     * @param userRoles Danh sách roles của user
     * @throws FileNotFoundException nếu file không tồn tại
     * @throws FileAccessDeniedException nếu user không có quyền
     */
    public void checkFileAccess(String fileId, String userId, List<String> userRoles) {
        // Lấy thông tin file
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> FileNotFoundException.byId(fileId));
        
        // SYSTEM_ADMIN có full quyền xem mọi file
        if (hasRole(userRoles, "SYSTEM_ADMIN")) {
            log.debug("User {} (SYSTEM_ADMIN) granted access to file {}", userId, fileId);
            return;
        }
        
        // Kiểm tra quyền theo role và FileSourceType
        FileSourceType fileSource = file.getFileSource();
        
        if (hasRole(userRoles, "MANAGER")) {
            checkManagerAccess(file, userId, fileSource);
            return;
        }
        
        if (hasRole(userRoles, "CUSTOMER")) {
            checkCustomerAccess(file, userId, fileSource);
            return;
        }
        
        // Check nếu là specialist (TRANSCRIPTION, ARRANGEMENT, RECORDING_ARTIST)
        if (isSpecialist(userRoles)) {
            checkSpecialistAccess(file, userId, fileSource);
            return;
        }
        
        // Nếu không có role phù hợp, từ chối truy cập
        throw FileAccessDeniedException.create(fileId, userId);
    }

    /**
     * Kiểm tra quyền truy cập của MANAGER
     * Manager chỉ được xem files của requests mà họ quản lý
     */
    private void checkManagerAccess(File file, String userId, FileSourceType fileSource) {
        // Manager phải là người quản lý request/contract của file này
        if (!isManagerOfFile(file, userId)) {
            log.warn("Manager {} is not managing the request/contract of file {}", 
                userId, file.getFileId());
            throw FileAccessDeniedException.withMessage(
                "You can only access files from requests that you manage"
            );
        }
        
        // Manager được xem tất cả các loại file của requests mình quản lý
        log.debug("Manager {} granted access to {} file {}", 
            userId, fileSource, file.getFileId());
    }

    /**
     * Kiểm tra quyền truy cập của CUSTOMER
     */
    private void checkCustomerAccess(File file, String userId, FileSourceType fileSource) {
        // Customer phải là owner của request/contract
        if (!isCustomerOwner(file, userId)) {
            log.warn("Customer {} is not owner of file {}", userId, file.getFileId());
            throw FileAccessDeniedException.withMessage(
                "You can only access files related to your own requests/contracts"
            );
        }
        
        // Kiểm tra theo FileSourceType
        switch (fileSource) {
            case customer_upload:
            case contract_pdf:
                // Customer luôn được xem file mình upload và contract PDF
                log.debug("Customer {} granted access to {} file {}", 
                    userId, fileSource, file.getFileId());
                break;
                
            case specialist_output:
            case task_deliverable:
            case studio_recording:
                // Chỉ được xem khi đã delivered to customer
                if (!Boolean.TRUE.equals(file.getDeliveredToCustomer())) {
                    log.warn("Customer {} cannot access {} file {} - not yet delivered", 
                        userId, fileSource, file.getFileId());
                    throw FileAccessDeniedException.withMessage(
                        "This file has not been delivered to you yet"
                    );
                }
                log.debug("Customer {} granted access to delivered {} file {}", 
                    userId, fileSource, file.getFileId());
                break;
                
            default:
                throw FileAccessDeniedException.withMessage(
                    "Unknown file source type: " + fileSource
                );
        }
    }

    /**
     * Kiểm tra quyền truy cập của SPECIALIST
     */
    private void checkSpecialistAccess(File file, String userId, FileSourceType fileSource) {
        // Specialist chỉ được xem file của assignment mà họ được assign
        if (file.getAssignmentId() == null) {
            log.warn("Specialist {} tried to access file {} with no assignment", 
                userId, file.getFileId());
            throw FileAccessDeniedException.withMessage(
                "This file is not associated with any assignment"
            );
        }
        
        // Lấy thông tin assignment
        TaskAssignment assignment = taskAssignmentRepository.findById(file.getAssignmentId())
                .orElse(null);
        
        if (assignment == null) {
            log.warn("Assignment {} not found for file {}", 
                file.getAssignmentId(), file.getFileId());
            throw FileAccessDeniedException.withMessage(
                "Assignment not found for this file"
            );
        }
        
        // Kiểm tra xem specialist có phải là owner của assignment không
        // So sánh với specialistUserIdSnapshot (userId của specialist)
        if (!userId.equals(assignment.getSpecialistUserIdSnapshot())) {
            log.warn("Specialist {} is not owner of assignment {} for file {}", 
                userId, assignment.getAssignmentId(), file.getFileId());
            throw FileAccessDeniedException.withMessage(
                "You can only access files from your assigned tasks"
            );
        }
        
        // Specialist được xem customer_upload và specialist_output của task của họ
        switch (fileSource) {
            case customer_upload:
            case specialist_output:
            case task_deliverable:
                log.debug("Specialist {} granted access to {} file {} from their assignment", 
                    userId, fileSource, file.getFileId());
                break;
                
            case studio_recording:
                // Studio recording: chỉ specialist recording mới được xem
                // Có thể check thêm taskType nếu cần
                log.debug("Specialist {} granted access to {} file {}", 
                    userId, fileSource, file.getFileId());
                break;
                
            case contract_pdf:
                // Specialist không được xem contract PDF (đây là giữa customer và manager)
                log.warn("Specialist {} tried to access contract_pdf file {}", 
                    userId, file.getFileId());
                throw FileAccessDeniedException.withMessage(
                    "Specialists cannot access contract PDF files"
                );
                
            default:
                throw FileAccessDeniedException.withMessage(
                    "Unknown file source type: " + fileSource
                );
        }
    }

    /**
     * Kiểm tra xem manager có phải là người quản lý file này không
     * Dựa vào Contract.managerUserId
     */
    private boolean isManagerOfFile(File file, String managerId) {
        // Nếu file có assignmentId, lấy contract từ assignment
        if (file.getAssignmentId() != null) {
            TaskAssignment assignment = taskAssignmentRepository.findById(file.getAssignmentId())
                    .orElse(null);
            if (assignment != null && assignment.getContractId() != null) {
                Contract contract = contractRepository.findById(assignment.getContractId())
                        .orElse(null);
                if (contract != null) {
                    return managerId.equals(contract.getManagerUserId());
                }
            }
        }
        
        // Nếu file có requestId, lấy contract từ requestId
        if (file.getRequestId() != null) {
            List<Contract> contracts = contractRepository.findByRequestId(file.getRequestId());
            if (!contracts.isEmpty()) {
                // Lấy contract đầu tiên (thường là contract active)
                return managerId.equals(contracts.get(0).getManagerUserId());
            }
        }
        
        // Nếu file có bookingId, check qua studio-service (chưa implement)
        // TODO: Implement booking manager check
        
        return false;
    }

    /**
     * Kiểm tra xem customer có phải là owner của file không
     * Dựa vào requestId hoặc contractId
     */
    private boolean isCustomerOwner(File file, String userId) {
        // Nếu file có requestId, cần gọi request-service để check
        // Hiện tại chưa có Feign client, nên check qua Contract
        
        // Nếu file có assignmentId, lấy contract từ assignment
        if (file.getAssignmentId() != null) {
            TaskAssignment assignment = taskAssignmentRepository.findById(file.getAssignmentId())
                    .orElse(null);
            if (assignment != null && assignment.getContractId() != null) {
                Contract contract = contractRepository.findById(assignment.getContractId())
                        .orElse(null);
                if (contract != null) {
                    return userId.equals(contract.getUserId());
                }
            }
        }
        
        // Nếu file có requestId, lấy contract từ requestId
        if (file.getRequestId() != null) {
            List<Contract> contracts = contractRepository.findByRequestId(file.getRequestId());
            if (!contracts.isEmpty()) {
                // Lấy contract đầu tiên (thường là contract active)
                return userId.equals(contracts.get(0).getUserId());
            }
        }
        
        // Nếu file có bookingId, check qua studio-service (chưa implement)
        // TODO: Implement booking owner check
        
        return false;
    }

    /**
     * Kiểm tra xem user có role hay không (case-insensitive)
     */
    private boolean hasRole(List<String> userRoles, String role) {
        return userRoles.stream()
                .anyMatch(r -> r.equalsIgnoreCase(role));
    }

    /**
     * Kiểm tra xem user có phải là specialist không
     * Specialist roles: TRANSCRIPTION, ARRANGEMENT, RECORDING_ARTIST
     */
    private boolean isSpecialist(List<String> userRoles) {
        return hasRole(userRoles, "TRANSCRIPTION") 
            || hasRole(userRoles, "ARRANGEMENT") 
            || hasRole(userRoles, "RECORDING_ARTIST");
    }

    /**
     * Lấy userId và roles từ JWT token
     */
    public static class UserContext {
        private final String userId;
        private final List<String> roles;

        public UserContext(String userId, List<String> roles) {
            this.userId = userId;
            this.roles = roles;
        }

        public String getUserId() {
            return userId;
        }

        public List<String> getRoles() {
            return roles;
        }
    }

    /**
     * Lấy thông tin user từ Authentication context
     */
    @SuppressWarnings("unchecked")
    public static UserContext getUserContext(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw FileAccessDeniedException.withMessage("User not authenticated");
        }

        // Extract userId from JWT
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isEmpty()) {
            throw FileAccessDeniedException.withMessage("JWT missing userId claim");
        }

        // Lấy role từ scope claim
        // Identity-service set: .claim("scope", usersAuth.getRole())
        // Role là enum (CUSTOMER, MANAGER, SYSTEM_ADMIN, TRANSCRIPTION, ARRANGEMENT, RECORDING_ARTIST)
        // Mỗi user chỉ có 1 role duy nhất
        List<String> roles;
        Object scopeObject = jwt.getClaim("scope");
        if (scopeObject instanceof String scopeString) {
            // Single role: "CUSTOMER", "MANAGER", etc.
            roles = List.of(scopeString);
        } else if (scopeObject instanceof List) {
            roles = (List<String>) scopeObject;
        } else {
            roles = List.of();
        }

        return new UserContext(userId, roles);
    }
}

