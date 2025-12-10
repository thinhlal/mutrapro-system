package com.mutrapro.project_service.service;

import com.mutrapro.project_service.client.SpecialistServiceFeignClient;
import com.mutrapro.project_service.entity.BookingArtist;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.entity.StudioBooking;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.exception.FileAccessDeniedException;
import com.mutrapro.project_service.exception.FileNotFoundException;
import com.mutrapro.project_service.repository.BookingArtistRepository;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.FileRepository;
import com.mutrapro.project_service.repository.StudioBookingRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import com.mutrapro.shared.dto.ApiResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

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
    ContractMilestoneRepository contractMilestoneRepository;
    BookingArtistRepository bookingArtistRepository;
    StudioBookingRepository studioBookingRepository;
    SpecialistServiceFeignClient specialistServiceFeignClient;

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
            // Trường hợp đặc biệt: File arrangement submission được link với recording milestone
            // Recording specialist cần download file arrangement để làm recording
            if (file.getSubmissionId() != null && !file.getSubmissionId().isEmpty()) {
                if (checkArrangementSubmissionAccessForRecording(file, userId, assignment)) {
                    log.debug("Specialist {} granted access to arrangement submission file {} for recording milestone", 
                        userId, file.getFileId());
                    // Cho phép truy cập, không throw exception
                } else {
                    log.warn("Specialist {} is not owner of assignment {} for file {} and file is not linked to their recording milestone", 
                        userId, assignment.getAssignmentId(), file.getFileId());
                    throw FileAccessDeniedException.withMessage(
                        "You can only access files from your assigned tasks"
                    );
                }
            } else {
                log.warn("Specialist {} is not owner of assignment {} for file {}", 
                    userId, assignment.getAssignmentId(), file.getFileId());
                throw FileAccessDeniedException.withMessage(
                    "You can only access files from your assigned tasks"
                );
            }
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
        
        // Nếu file có bookingId, check booking access (studio bookings trong cùng project-service)
        // TODO: Implement booking manager check
        
        return false;
    }

    /**
     * Kiểm tra xem customer có phải là owner của file không
     * Dựa vào requestId, contractId, hoặc createdBy (cho customer_upload)
     * @param file File entity
     * @param userId UserId từ JWT (UUID)
     */
    private boolean isCustomerOwner(File file, String userId) {
        // Đối với file customer_upload, nếu customer là người upload (createdBy),
        // thì họ có quyền truy cập ngay cả khi chưa có contract
        if (file.getFileSource() == FileSourceType.customer_upload) {
            String createdBy = file.getCreatedBy();
            if (userId != null && userId.equals(createdBy)) {
                log.debug("Customer {} is owner of customer_upload file {} (via createdBy userId)", 
                    userId, file.getFileId());
                return true;
            }
        }
        
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
        
        // Nếu file có bookingId, check booking access (studio bookings trong cùng project-service)
        // TODO: Implement booking owner check
        
        return false;
    }

    /**
     * Kiểm tra xem file arrangement submission có được link với recording milestone 
     * mà recording artist được book vào studio booking không
     * Dùng cho trường hợp recording artist cần download file arrangement để làm recording
     */
    private boolean checkArrangementSubmissionAccessForRecording(
            File file, String userId, TaskAssignment fileAssignment) {
        try {
            // 1. Lấy specialistId từ userId (cho recording artist)
            String specialistId = getSpecialistIdFromUserId(userId);
            if (specialistId == null || specialistId.isEmpty()) {
                log.debug("Could not get specialistId for userId {}, skipping arrangement submission access check", userId);
                return false;
            }
            
            // 2. Tìm recording milestone có sourceArrangementSubmissionId = submissionId này
            List<ContractMilestone> recordingMilestones = contractMilestoneRepository
                    .findBySourceArrangementSubmissionId(file.getSubmissionId());
            
            if (recordingMilestones.isEmpty()) {
                return false;
            }
            
            // 3. Check xem recording artist có được book vào studio booking của recording milestone không
            for (ContractMilestone recordingMilestone : recordingMilestones) {
                String milestoneId = recordingMilestone.getMilestoneId();
                
                // Tìm studio bookings cho milestone này (có thể có nhiều bookings)
                // Sử dụng findByMilestoneId trả về Optional, nhưng để an toàn, check cả trường hợp có nhiều bookings
                StudioBooking studioBooking = studioBookingRepository.findByMilestoneId(milestoneId)
                        .orElse(null);
                
                if (studioBooking != null) {
                    // Check xem recording artist có được book vào studio booking này không
                    List<BookingArtist> bookingArtists = bookingArtistRepository
                            .findByBookingBookingId(studioBooking.getBookingId());
                    
                    boolean isBooked = bookingArtists.stream()
                            .anyMatch(ba -> specialistId.equals(ba.getSpecialistId()));
                    
                    if (isBooked) {
                        log.debug("Recording artist {} (specialistId={}) is booked in studio booking {} for recording milestone {} linked to arrangement submission {}", 
                            userId, specialistId, studioBooking.getBookingId(), milestoneId, file.getSubmissionId());
                        return true;
                    }
                }
                
                // Fallback: Check xem specialist có task assignment trong cùng contract với recording milestone không
                // (cho recording supervision specialist)
                String contractId = recordingMilestone.getContractId();
                if (contractId != null) {
                    List<TaskAssignment> specialistAssignments = taskAssignmentRepository
                            .findByContractId(contractId);
                    
                    boolean hasAssignment = specialistAssignments.stream().anyMatch(assignment -> {
                        // Check cả specialistUserIdSnapshot (userId) và specialistId
                        String assignmentSpecialistUserId = assignment.getSpecialistUserIdSnapshot();
                        String assignmentSpecialistId = assignment.getSpecialistId();
                        
                        // Match nếu userId khớp với specialistUserIdSnapshot HOẶC specialistId khớp
                        boolean userIdMatch = userId.equals(assignmentSpecialistUserId);
                        boolean specialistIdMatch = specialistId != null && specialistId.equals(assignmentSpecialistId);
                        
                        return (userIdMatch || specialistIdMatch) 
                                && milestoneId.equals(assignment.getMilestoneId());
                    });
                    
                    if (hasAssignment) {
                        log.debug("Specialist {} (specialistId={}) has assignment in recording milestone {} linked to arrangement submission {}", 
                            userId, specialistId, milestoneId, file.getSubmissionId());
                        return true;
                    }
                }
            }
            
            return false;
        } catch (Exception e) {
            log.warn("Error checking arrangement submission access for recording: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Lấy specialistId từ userId
     * Ưu tiên lấy từ JWT token (nếu có), nếu không thì gọi specialist-service
     */
    private String getSpecialistIdFromUserId(String userId) {
        try {
            // Thử lấy từ JWT token trước (nếu identity-service set specialistId claim)
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
                // Verify userId từ JWT khớp với userId parameter
                String jwtUserId = jwt.getClaimAsString("userId");
                if (jwtUserId != null && jwtUserId.equals(userId)) {
                    String specialistId = jwt.getClaimAsString("specialistId");
                    if (specialistId != null && !specialistId.isEmpty()) {
                        log.debug("Got specialistId from JWT token: {} for userId: {}", specialistId, userId);
                        return specialistId;
                    }
                } else {
                    log.warn("UserId mismatch: JWT userId={}, parameter userId={}", jwtUserId, userId);
                }
            }
            
            // Fallback: gọi specialist-service để lấy specialistId từ userId hiện tại
            // Note: getMySpecialistInfo() lấy thông tin của user hiện tại từ JWT
            // Trong context này, userId parameter = userId từ JWT, nên OK
            ApiResponse<Map<String, Object>> response = specialistServiceFeignClient.getMySpecialistInfo();
            if (response != null && "success".equals(response.getStatus()) 
                && response.getData() != null) {
                Map<String, Object> data = response.getData();
                String specialistId = (String) data.get("specialistId");
                if (specialistId != null && !specialistId.isEmpty()) {
                    log.debug("Got specialistId from specialist-service: {} for userId: {}", specialistId, userId);
                    return specialistId;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get specialistId from userId {}: {}", userId, e.getMessage());
        }
        return null;
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

