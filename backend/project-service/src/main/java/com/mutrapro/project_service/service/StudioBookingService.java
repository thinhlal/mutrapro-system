package com.mutrapro.project_service.service;

import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.client.SpecialistServiceFeignClient;
import com.mutrapro.project_service.dto.request.ArtistBookingInfo;
import com.mutrapro.project_service.dto.request.CreateStudioBookingFromRequestRequest;
import com.mutrapro.project_service.dto.request.CreateStudioBookingRequest;
import com.mutrapro.project_service.dto.request.ParticipantRequest;
import com.mutrapro.project_service.dto.request.RequiredEquipmentRequest;
import com.mutrapro.project_service.dto.response.AvailableArtistResponse;
import com.mutrapro.project_service.dto.response.AvailableTimeSlotResponse;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.project_service.dto.response.StudioBookingResponse;
import com.mutrapro.project_service.dto.response.StudioInfoResponse;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.event.SlotBookedEvent;
import com.mutrapro.shared.event.SlotReleasedEvent;
import com.mutrapro.project_service.entity.BookingParticipant;
import com.mutrapro.project_service.entity.BookingRequiredEquipment;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.Equipment;
import com.mutrapro.project_service.entity.Studio;
import com.mutrapro.project_service.entity.StudioBooking;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.InstrumentSource;
import com.mutrapro.project_service.enums.MilestoneType;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.PerformerSource;
import com.mutrapro.project_service.enums.RecordingSessionType;
import com.mutrapro.project_service.enums.SessionRoleType;
import com.mutrapro.project_service.enums.StudioBookingContext;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.exception.ArrangementMilestoneNotCompletedException;
import com.mutrapro.project_service.exception.ArrangementMilestoneNotPaidException;
import com.mutrapro.project_service.exception.ArrangementMilestoneNotFoundException;
import com.mutrapro.project_service.exception.ArtistBookingConflictException;
import com.mutrapro.project_service.exception.ContractMilestoneNotFoundException;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.InvalidBookingDateException;
import com.mutrapro.project_service.exception.InvalidContractStatusException;
import com.mutrapro.project_service.exception.InvalidContractTypeException;
import com.mutrapro.project_service.exception.InvalidMilestoneTypeException;
import com.mutrapro.project_service.exception.InvalidParticipantException;
import com.mutrapro.project_service.exception.InvalidRequestTypeException;
import com.mutrapro.project_service.exception.InvalidStateException;
import com.mutrapro.project_service.exception.InvalidTimeRangeException;
import com.mutrapro.project_service.exception.MissingCustomerUserIdException;
import com.mutrapro.project_service.exception.MissingSlaException;
import com.mutrapro.project_service.exception.NoActiveStudioException;
import com.mutrapro.project_service.exception.ServiceRequestNotFoundException;
import com.mutrapro.project_service.exception.StudioNotFoundException;
import com.mutrapro.project_service.exception.SpecialistIdNotFoundException;
import com.mutrapro.project_service.exception.StudioBookingConflictException;
import com.mutrapro.project_service.exception.StudioBookingNotFoundException;
import com.mutrapro.project_service.exception.UserNotAuthenticatedException;
import com.mutrapro.project_service.repository.BookingParticipantRepository;
import com.mutrapro.project_service.repository.BookingRequiredEquipmentRepository;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.EquipmentRepository;
import com.mutrapro.project_service.repository.SkillEquipmentMappingRepository;
import com.mutrapro.project_service.repository.StudioBookingRepository;
import com.mutrapro.project_service.repository.StudioRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static lombok.AccessLevel.PRIVATE;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = PRIVATE, makeFinal = true)
public class StudioBookingService {

    StudioBookingRepository studioBookingRepository;
    StudioRepository studioRepository;
    ContractRepository contractRepository;
    ContractMilestoneRepository contractMilestoneRepository;
    BookingParticipantRepository bookingParticipantRepository;
    BookingRequiredEquipmentRepository bookingRequiredEquipmentRepository;
    EquipmentRepository equipmentRepository;
    TaskAssignmentRepository taskAssignmentRepository;
    RequestServiceFeignClient requestServiceFeignClient;
    SpecialistServiceFeignClient specialistServiceFeignClient;
    TaskAssignmentService taskAssignmentService;
    ContractMilestoneService contractMilestoneService;
    SkillEquipmentMappingRepository skillEquipmentMappingRepository;
    OutboxEventRepository outboxEventRepository;
    ObjectMapper objectMapper;
    
    /**
     * Lấy specialistId của user hiện tại từ JWT token
     * Bắt buộc phải có trong JWT token (identity-service đã thêm khi login)
     * Không có fallback để tránh gọi API chậm
     */
    private String getCurrentSpecialistId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw UserNotAuthenticatedException.create();
        }
        
        String specialistId = jwt.getClaimAsString("specialistId");
        if (specialistId == null || specialistId.isEmpty()) {
            throw SpecialistIdNotFoundException.inToken();
        }
        
        return specialistId;
    }

    /**
     * Tạo booking cho recording milestone trong arrangement_with_recording contract
     * 
     * Validation:
     * 1. Milestone phải là recording type
     * 2. Contract phải là arrangement_with_recording
     * 3. TẤT CẢ arrangement milestones phải đã accepted (COMPLETED hoặc READY_FOR_PAYMENT) và đã thanh toán (actualEndAt != null)
     *    - Check tất cả arrangement milestones (không chỉ orderIndex = 1)
     *    - Arrangement milestone cuối cùng phải có actualEndAt != null (đã thanh toán)
     * 4. Booking date phải trong SLA range của recording milestone
     * 5. Studio phải active
     * 
     * Logic:
     * - context = CONTRACT_RECORDING
     * - status = CONFIRMED (vì manager đã chốt lịch)
     * - total_cost = 0 (không tính lại giá, contract price đã được tính từ pricing matrix)
     * - equipment_rental_fee = 0
     */
    @Transactional
    public StudioBookingResponse createBookingForRecordingMilestone(CreateStudioBookingRequest request) {
        // 1. Validate milestone
        ContractMilestone recordingMilestone = contractMilestoneRepository
            .findById(request.getMilestoneId())
            .orElseThrow(() -> new ContractMilestoneNotFoundException(
                "Recording milestone not found: " + request.getMilestoneId(),
                request.getMilestoneId(),
                null));
        
        // Check milestone type = recording
        if (recordingMilestone.getMilestoneType() != MilestoneType.recording) {
            throw InvalidMilestoneTypeException.notRecording(request.getMilestoneId());
        }
        
        // 2. Validate contract
        Contract contract = contractRepository.findById(recordingMilestone.getContractId())
            .orElseThrow(() -> ContractNotFoundException.byId(recordingMilestone.getContractId()));
        
        // Check contract type = arrangement_with_recording
        if (contract.getContractType() != ContractType.arrangement_with_recording) {
            throw InvalidContractTypeException.notArrangementWithRecording(contract.getContractId());
        }
        
        // Check contract status
        if (contract.getStatus() != ContractStatus.active && 
            contract.getStatus() != ContractStatus.active_pending_assignment) {
            throw InvalidContractStatusException.cannotUpdate(
                contract.getContractId(),
                contract.getStatus(),
                "Contract must be active to create booking for recording milestone");
        }
        
        // 3. Validate tất cả arrangement milestones đã accepted
        // (hoặc ít nhất milestone arrangement cuối cùng - gần nhất với recording milestone)
        List<ContractMilestone> allMilestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(contract.getContractId());
        
        List<ContractMilestone> arrangementMilestones = allMilestones.stream()
            .filter(m -> m.getMilestoneType() == MilestoneType.arrangement)
            .toList();
        
        if (arrangementMilestones.isEmpty()) {
            throw ArrangementMilestoneNotFoundException.inContract(contract.getContractId());
        }
        
        // Check TẤT CẢ milestone arrangement đều phải COMPLETED (hoặc READY_FOR_PAYMENT) 
        // trước khi được phép tạo booking cho recording milestone
        // 
        // Lý do: Cần có file arrangement cuối cùng để thu âm
        // Vì milestones unlock tuần tự, nếu milestone cuối cùng đã accepted thì các milestone trước đó cũng đã accepted
        // Nhưng vẫn check tất cả để đảm bảo không có milestone nào bị skip
        List<ContractMilestone> unacceptedArrangements = arrangementMilestones.stream()
            .filter(m -> m.getWorkStatus() != MilestoneWorkStatus.COMPLETED &&
                        m.getWorkStatus() != MilestoneWorkStatus.READY_FOR_PAYMENT)
            .toList();
        
        if (!unacceptedArrangements.isEmpty()) {
            List<String> unacceptedDetails = unacceptedArrangements.stream()
                .map(m -> String.format("orderIndex=%d (status=%s)", m.getOrderIndex(), m.getWorkStatus()))
                .toList();
            throw ArrangementMilestoneNotCompletedException.withUnacceptedMilestones(unacceptedDetails);
        }
        
        // ⚠️ QUAN TRỌNG: Check TẤT CẢ arrangement milestones đã có actualEndAt (đã thanh toán)
        // Lý do: Đảm bảo booking date validation chính xác, không bị lệch nếu customer thanh toán muộn
        ContractMilestone lastArrangementMilestone = arrangementMilestones.getLast();
        
        if (lastArrangementMilestone.getActualEndAt() == null) {
            throw ArrangementMilestoneNotPaidException.lastMilestoneNotPaid(lastArrangementMilestone.getOrderIndex());
        }
        
        log.info("All arrangement milestones are completed and paid. Proceeding with recording booking: contractId={}, recordingMilestoneId={}, arrangementCount={}, lastArrangementActualEndAt={}",
            contract.getContractId(), recordingMilestone.getMilestoneId(), arrangementMilestones.size(), 
            lastArrangementMilestone.getActualEndAt());
        
        // 4. Tính start date và due date thực tế cho recording milestone
        // Dùng actualEndAt của arrangement milestone cuối cùng (đã được validate ở trên)
        // (vì nếu arrangement bị revision, planned dates có thể không còn chính xác)
        LocalDateTime recordingStartDate = lastArrangementMilestone.getActualEndAt();
            log.info("Using actualEndAt of last arrangement milestone as recording start date: actualEndAt={}",
                recordingStartDate);
        
        // Tính due date = start date + SLA days
        Integer recordingSlaDays = recordingMilestone.getMilestoneSlaDays();
        if (recordingSlaDays == null || recordingSlaDays <= 0) {
            throw MissingSlaException.forRecordingMilestone();
        }
        
        LocalDateTime recordingDueDate = recordingStartDate.plusDays(recordingSlaDays);
        
        LocalDate validStartDate = recordingStartDate.toLocalDate();
        LocalDate validDueDate = recordingDueDate.toLocalDate();
        
        // Validate booking date trong range thực tế
        if (request.getBookingDate().isBefore(validStartDate) || 
            request.getBookingDate().isAfter(validDueDate)) {
            throw InvalidBookingDateException.outsideSlaRange(request.getBookingDate(), validStartDate, validDueDate);
        }
        
        // 5. Tự động lấy studio active duy nhất (single studio system)
        List<Studio> activeStudios = studioRepository.findByIsActiveTrue();
        if (activeStudios.isEmpty()) {
            throw NoActiveStudioException.notFound();
        }
        if (activeStudios.size() > 1) {
            throw NoActiveStudioException.multipleFound(activeStudios.size());
        }
        Studio studio = activeStudios.getFirst();
        log.info("Auto-selected studio for booking: studioId={}, studioName={}",
            studio.getStudioId(), studio.getStudioName());
        
        // 6. Validate time range
        if (request.getStartTime().isAfter(request.getEndTime())) {
            throw InvalidTimeRangeException.startAfterEnd(request.getStartTime(), request.getEndTime());
        }
        if (request.getStartTime().equals(request.getEndTime())) {
            throw InvalidTimeRangeException.startEqualsEnd(request.getStartTime(), request.getEndTime());
        }
        
        // 6.5. Validate grid system: duration phải là bội số của 2h
        long durationHours = java.time.Duration.between(request.getStartTime(), request.getEndTime()).toHours();
        if (durationHours <= 0 || durationHours % 2 != 0) {
            throw InvalidTimeRangeException.invalidDuration(
                request.getStartTime(), request.getEndTime(), 
                "Duration must be a multiple of 2 hours (2h, 4h, 6h, etc.)");
        }
        
        // 6.6. Validate startTime phải align với grid (08:00, 10:00, 12:00, 14:00, 16:00)
        List<LocalTime> validStartTimes = List.of(
            LocalTime.of(8, 0), LocalTime.of(10, 0), LocalTime.of(12, 0), 
            LocalTime.of(14, 0), LocalTime.of(16, 0));
        if (!validStartTimes.contains(request.getStartTime())) {
            throw InvalidTimeRangeException.invalidStartTime(
                request.getStartTime(), 
                "Start time must be one of: 08:00, 10:00, 12:00, 14:00, 16:00");
        }
        
        // 7. Check studio availability (tránh double booking)
        // Lấy tất cả bookings trong ngày đó để check conflict
        List<StudioBooking> bookingsOnDate = studioBookingRepository
            .findByStudioStudioIdAndBookingDate(studio.getStudioId(), request.getBookingDate());
        
        // Chỉ check conflict với bookings có status active (không phải CANCELLED, NO_SHOW, COMPLETED)
        List<BookingStatus> activeStatuses = List.of(
            BookingStatus.TENTATIVE, BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS);
        
        // Check time overlap với bookings active
        boolean hasConflict = bookingsOnDate.stream()
            .filter(booking -> activeStatuses.contains(booking.getStatus()))
            .anyMatch(existing -> {
                LocalTime existingStart = existing.getStartTime();
                LocalTime existingEnd = existing.getEndTime();
                LocalTime newStart = request.getStartTime();
                LocalTime newEnd = request.getEndTime();
                
                // Overlap nếu: newStart < existingEnd && newEnd > existingStart
                return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
            });
        
        if (hasConflict) {
            throw StudioBookingConflictException.forTimeSlot(
                request.getBookingDate(), request.getStartTime(), request.getEndTime());
        }
        
        // 7.5. Check artist availability (nếu có artists trong request)
        // Booking chỉ valid nếu studio rảnh AND tất cả artists rảnh
        if (request.getArtists() != null && !request.getArtists().isEmpty()) {
            List<String> artistIds = request.getArtists().stream()
                .map(ArtistBookingInfo::getSpecialistId)
                .toList();
            
            List<BookingParticipant> conflictingParticipants = bookingParticipantRepository
                .findConflictingBookingsForMultipleSpecialists(
                    artistIds,
                    request.getBookingDate(),
                    request.getStartTime(),
                    request.getEndTime()
                );
            
            if (!conflictingParticipants.isEmpty()) {
                // Group by specialistId để show message rõ ràng
                List<String> conflictingSpecialistIds = conflictingParticipants.stream()
                    .map(BookingParticipant::getSpecialistId)
                    .filter(id -> id != null && !id.isBlank())
                    .distinct()
                    .toList();
                
                throw ArtistBookingConflictException.forArtists(conflictingSpecialistIds);
            }
            
            // Check work slots (BẮT BUỘC) - Grid system
            // Logic: Nếu specialist không đăng ký slot → không available
            //         Chỉ available khi có TẤT CẢ slots liên tiếp đều AVAILABLE
            // Batch check availability cho tất cả artists cùng lúc (tối ưu hiệu suất)
            if (!artistIds.isEmpty()) {
                String dateStr = request.getBookingDate().toString();
                String startTimeStr = request.getStartTime().toString();
                String endTimeStr = request.getEndTime().toString();
                
                ApiResponse<Map<String, Boolean>> batchAvailabilityResponse = specialistServiceFeignClient
                    .batchCheckAvailability(dateStr, startTimeStr, endTimeStr, artistIds);
                
                if (batchAvailabilityResponse == null || 
                    !"success".equals(batchAvailabilityResponse.getStatus()) ||
                    batchAvailabilityResponse.getData() == null) {
                    throw new RuntimeException("Failed to check artist availability");
                }
                
                Map<String, Boolean> availabilityMap = batchAvailabilityResponse.getData();
                
                // Check từng artist và throw exception nếu không available
                for (String artistId : artistIds) {
                    Boolean isAvailable = availabilityMap.get(artistId);
                    if (isAvailable == null || !isAvailable) {
                        throw ArtistBookingConflictException.artistNotAvailable(artistId);
                    }
                }
            }
        }
        
        // 8. Get customer user ID từ contract
        String customerUserId = contract.getUserId();
        if (customerUserId == null || customerUserId.isBlank()) {
            throw MissingCustomerUserIdException.inContract();
        }
        
        // 9. Tạo booking
        // Set default sessionType = ARTIST_ASSISTED nếu không có (vì arrangement_with_recording thường cần artist)
        RecordingSessionType sessionType = request.getSessionType() != null 
            ? request.getSessionType() 
            : RecordingSessionType.ARTIST_ASSISTED;
        
        StudioBooking booking = StudioBooking.builder()
            .userId(customerUserId)
            .studio(studio)
            .requestId(contract.getRequestId())
            .contractId(contract.getContractId())
            .milestoneId(recordingMilestone.getMilestoneId())
            .context(StudioBookingContext.CONTRACT_RECORDING)
            .sessionType(sessionType)
            .bookingDate(request.getBookingDate())
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .status(BookingStatus.CONFIRMED)  // Đã chốt lịch
            .durationHours(request.getDurationHours())
            .externalGuestCount(request.getExternalGuestCount() != null ? request.getExternalGuestCount() : 0)
            .artistFee(BigDecimal.ZERO)  // Artist fee được tính từ booking_participants, không set ở đây
            .equipmentRentalFee(BigDecimal.ZERO)  // Không có equipment cho luồng 2
            .externalGuestFee(BigDecimal.ZERO)  // Không có guest fee cho luồng 2
            .totalCost(BigDecimal.ZERO)  // Không tính lại giá
            .purpose(request.getPurpose())
            .specialInstructions(request.getSpecialInstructions())
            .notes(request.getNotes())
            .build();
        
        StudioBooking saved = studioBookingRepository.save(booking);
        log.info("Created studio booking for recording milestone: bookingId={}, milestoneId={}, contractId={}, bookingDate={}",
            saved.getBookingId(), recordingMilestone.getMilestoneId(), contract.getContractId(), request.getBookingDate());
        
        // 9.5. Tạo booking_participants records (nếu có artists trong request)
        if (request.getArtists() != null && !request.getArtists().isEmpty()) {
            for (ArtistBookingInfo artistInfo : request.getArtists()) {
                // Convert role string to SessionRoleType
                SessionRoleType roleType = SessionRoleType.INSTRUMENT; // Default
                if (artistInfo.getRole() != null) {
                    String role = artistInfo.getRole().toUpperCase();
                    if (role.contains("VOCAL") || role.contains("VOCALIST")) {
                        roleType = SessionRoleType.VOCAL;
                    }
                }
                
                BookingParticipant participant = BookingParticipant.builder()
                    .booking(saved)
                    .roleType(roleType)
                    .performerSource(PerformerSource.INTERNAL_ARTIST)
                    .specialistId(artistInfo.getSpecialistId())
                    .skillId(artistInfo.getSkillId())
                    .participantFee(artistInfo.getArtistFee() != null ? artistInfo.getArtistFee() : BigDecimal.ZERO)
                    .isPrimary(artistInfo.getIsPrimary() != null ? artistInfo.getIsPrimary() : false)
                    .build();
                
                bookingParticipantRepository.save(participant);
                log.info("Created booking participant: bookingId={}, specialistId={}, roleType={}, isPrimary={}",
                    saved.getBookingId(), artistInfo.getSpecialistId(), participant.getRoleType(), participant.getIsPrimary());
                
                // Publish Kafka event để mark slots as BOOKED (async)
                if (artistInfo.getSpecialistId() != null) {
                    publishSlotBookedEvent(
                        artistInfo.getSpecialistId(),
                        saved.getBookingId(),
                        request.getBookingDate(),
                        request.getStartTime(),
                        request.getEndTime()
                    );
                }
            }
            // LƯU Ý: Không cần update artistFee vì:
            // - Luồng 2 (arrangement_with_recording) không tính phí trong booking (totalCost = 0)
            // - Phí đã được tính trong contract/milestone
            // - artistFee trong studio_bookings chỉ để tracking, không ảnh hưởng payment
        }
        
        // 10. Update studioBookingId vào recording task (nếu đã có task)
        // Tìm task recording_supervision cho milestone này
        List<TaskAssignment> recordingTasks = 
            taskAssignmentRepository.findByMilestoneId(recordingMilestone.getMilestoneId())
                .stream()
                .filter(task -> task.getTaskType() == TaskType.recording_supervision)
                .toList();
        
        if (!recordingTasks.isEmpty()) {
            for (TaskAssignment task : recordingTasks) {
                if (task.getStudioBookingId() == null || task.getStudioBookingId().isEmpty()) {
                    task.setStudioBookingId(saved.getBookingId());
                    taskAssignmentRepository.save(task);
                    log.info("Updated studioBookingId for recording task: taskId={}, bookingId={}, milestoneId={}",
                        task.getAssignmentId(), saved.getBookingId(), recordingMilestone.getMilestoneId());
                } else {
                    log.warn("Recording task already has studioBookingId: taskId={}, existingBookingId={}, newBookingId={}",
                        task.getAssignmentId(), task.getStudioBookingId(), saved.getBookingId());
                }
            }
        } else {
            log.info("No recording task found for milestone yet, studioBookingId will be linked when task is created: milestoneId={}",
                recordingMilestone.getMilestoneId());
        }
        
        // 11. Unlock recording milestone nếu cần (theo đúng flow)
        // Logic unlock milestone:
        // - Nếu milestone chưa có task → không unlock (giữ nguyên status)
        // - Nếu milestone đã có task nhưng chưa accepted → không unlock (giữ nguyên status)
        // - Nếu milestone đã có task và đã accepted → unlock về TASK_ACCEPTED_WAITING_ACTIVATION, sau đó gọi activateAssignmentsForMilestone
        // - Nếu milestone đã READY_TO_START hoặc IN_PROGRESS → không thay đổi
        
        if (recordingMilestone.getWorkStatus() != MilestoneWorkStatus.READY_TO_START &&
            recordingMilestone.getWorkStatus() != MilestoneWorkStatus.IN_PROGRESS) {
            
            // Tìm task recording_supervision cho milestone này
            List<TaskAssignment> tasks = 
                taskAssignmentRepository.findByMilestoneId(recordingMilestone.getMilestoneId())
                    .stream()
                    .filter(task -> task.getTaskType() == TaskType.recording_supervision)
                    .filter(task -> task.getStatus() != AssignmentStatus.cancelled)
                    .toList();
            
            if (!tasks.isEmpty()) {
                // Đã có task → kiểm tra task đã accepted chưa
                boolean hasAcceptedTask = tasks.stream()
                    .anyMatch(task -> task.getStatus() == AssignmentStatus.accepted_waiting);
                
                if (hasAcceptedTask) {
                    // Đã có task accepted → unlock về TASK_ACCEPTED_WAITING_ACTIVATION
                    // Sau đó gọi activateAssignmentsForMilestone để check booking và activate
                    recordingMilestone.setWorkStatus(MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION);
                    contractMilestoneRepository.save(recordingMilestone);
                    log.info("Unlocked recording milestone to TASK_ACCEPTED_WAITING_ACTIVATION after booking created: milestoneId={}",
                        recordingMilestone.getMilestoneId());
                    
                    // Gọi activateAssignmentsForMilestone để check booking và activate milestone
                    // (sẽ check studioBookingId và chuyển sang READY_TO_START nếu OK)
                    try {
                        taskAssignmentService.activateAssignmentsForMilestone(
                            contract.getContractId(), recordingMilestone.getMilestoneId());
                    } catch (Exception e) {
                        log.warn("Failed to activate assignments for milestone after booking created: milestoneId={}, error={}",
                            recordingMilestone.getMilestoneId(), e.getMessage());
                    }
                } else {
                    // Đã có task nhưng chưa accepted → không unlock (giữ nguyên status)
                    log.info("Recording milestone has task but not accepted yet, keeping current status: milestoneId={}, status={}",
                        recordingMilestone.getMilestoneId(), recordingMilestone.getWorkStatus());
                }
            } else {
                // Chưa có task → không unlock (giữ nguyên status)
                log.info("Recording milestone has no task yet, keeping current status: milestoneId={}, status={}",
                    recordingMilestone.getMilestoneId(), recordingMilestone.getWorkStatus());
            }
        } else {
            log.info("Recording milestone already in ready/progress state: milestoneId={}, status={}",
                recordingMilestone.getMilestoneId(), recordingMilestone.getWorkStatus());
        }
        
        return mapToResponse(saved);
    }

    /**
     * Tạo studio booking từ service request (Luồng 3: Recording)
     * 
     * Flow:
     * 1. Customer tạo service request (request-service)
     * 2. Customer tạo booking từ request với participants và equipment (project-service)
     * 
     * Validation:
     * 1. RequestId phải tồn tại và có request_type = 'recording'
     * 2. Studio phải active
     * 3. Time range hợp lệ
     * 4. Studio availability
     * 5. Participants validation:
     *    - VOCAL: không có skill_id, equipment_id, instrument_source
     *    - INSTRUMENT: bắt buộc skill_id, equipment match skill_id (nếu STUDIO_SIDE)
     * 6. Equipment validation: equipment phải match skill_id qua skill_equipment_mapping
     * 
     * Logic:
     * - context = PRE_CONTRACT_HOLD
     * - status = TENTATIVE (chờ Manager tạo contract)
     * - Tính toán fees: participant_fee + equipment_rental_fee
     */
    @Transactional
    public StudioBookingResponse createBookingFromServiceRequest(
            String requestId, 
            CreateStudioBookingFromRequestRequest request) {
        
        log.info("Creating studio booking from service request: requestId={}, bookingDate={}, startTime={}, endTime={}",
            requestId, request.getBookingDate(), request.getStartTime(), request.getEndTime());
        
        // 1. Validate requestId tồn tại và có request_type = 'recording'
        ApiResponse<ServiceRequestInfoResponse> serviceRequestResponse = 
            requestServiceFeignClient.getServiceRequestById(requestId);
        
        if (serviceRequestResponse == null || !"success".equals(serviceRequestResponse.getStatus()) 
            || serviceRequestResponse.getData() == null) {
            throw ServiceRequestNotFoundException.byId(requestId);
        }
        
        ServiceRequestInfoResponse serviceRequest = serviceRequestResponse.getData();
        
        // Validate request_type = 'recording'
        if (!"recording".equalsIgnoreCase(serviceRequest.getRequestType())) {
            throw InvalidRequestTypeException.forBooking(requestId, serviceRequest.getRequestType());
        }
        
        // 2. Get customer user ID từ service request
        String customerUserId = serviceRequest.getUserId();
        if (customerUserId == null || customerUserId.isBlank()) {
            throw new InvalidStateException("Service request does not have user ID");
        }
        
        // 3. Tự động lấy studio active duy nhất (single studio system)
        List<Studio> activeStudios = studioRepository.findByIsActiveTrue();
        if (activeStudios.isEmpty()) {
            throw NoActiveStudioException.notFound();
        }
        if (activeStudios.size() > 1) {
            throw NoActiveStudioException.multipleFound(activeStudios.size());
        }
        Studio studio = activeStudios.getFirst();
        log.info("Auto-selected studio for booking: studioId={}, studioName={}",
            studio.getStudioId(), studio.getStudioName());
        
        // 4. Validate time range
        if (request.getStartTime().isAfter(request.getEndTime())) {
            throw InvalidTimeRangeException.startAfterEnd(request.getStartTime(), request.getEndTime());
        }
        if (request.getStartTime().equals(request.getEndTime())) {
            throw InvalidTimeRangeException.startEqualsEnd(request.getStartTime(), request.getEndTime());
        }
        
        // 4.5. Validate grid system: duration phải là bội số của 2h
        long durationHours = java.time.Duration.between(request.getStartTime(), request.getEndTime()).toHours();
        if (durationHours <= 0 || durationHours % 2 != 0) {
            throw InvalidTimeRangeException.invalidDuration(
                request.getStartTime(), request.getEndTime(), 
                "Duration must be a multiple of 2 hours (2h, 4h, 6h, etc.)");
        }
        
        // 4.6. Validate startTime phải align với grid (08:00, 10:00, 12:00, 14:00, 16:00)
        List<LocalTime> validStartTimes = List.of(
            LocalTime.of(8, 0), LocalTime.of(10, 0), LocalTime.of(12, 0), 
            LocalTime.of(14, 0), LocalTime.of(16, 0));
        if (!validStartTimes.contains(request.getStartTime())) {
            throw InvalidTimeRangeException.invalidStartTime(
                request.getStartTime(), 
                "Start time must be one of: 08:00, 10:00, 12:00, 14:00, 16:00");
        }
        
        // 5. Check studio availability (tránh double booking)
        List<StudioBooking> bookingsOnDate = studioBookingRepository
            .findByStudioStudioIdAndBookingDate(studio.getStudioId(), request.getBookingDate());
        
        List<BookingStatus> activeStatuses = List.of(
            BookingStatus.TENTATIVE, BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS);
        
        List<StudioBooking> conflictingBookings = bookingsOnDate.stream()
            .filter(booking -> activeStatuses.contains(booking.getStatus()))
            .filter(booking -> {
                LocalTime bookingStart = booking.getStartTime();
                LocalTime bookingEnd = booking.getEndTime();
                // Overlap: requestStart < bookingEnd && requestEnd > bookingStart
                return request.getStartTime().isBefore(bookingEnd) && request.getEndTime().isAfter(bookingStart);
            })
            .toList();
        
        if (!conflictingBookings.isEmpty()) {
            throw StudioBookingConflictException.forTimeSlot(
                request.getBookingDate(), request.getStartTime(), request.getEndTime());
        }
        
        // 6. Validate participants
        if (request.getParticipants() != null && !request.getParticipants().isEmpty()) {
            for (ParticipantRequest participant : request.getParticipants()) {
                // Validate VOCAL: không có skill_id, equipment_id, instrument_source
                if (participant.getRoleType() == SessionRoleType.VOCAL) {
                    if (participant.getSkillId() != null && !participant.getSkillId().isBlank()) {
                        throw InvalidParticipantException.vocalWithSkillId();
                    }
                    if (participant.getEquipmentId() != null && !participant.getEquipmentId().isBlank()) {
                        throw InvalidParticipantException.vocalWithEquipmentId();
                    }
                    if (participant.getInstrumentSource() != null) {
                        throw InvalidParticipantException.vocalWithInstrumentSource();
                    }
                    // Validate INTERNAL_ARTIST có specialistId
                    if (participant.getPerformerSource() == PerformerSource.INTERNAL_ARTIST) {
                        if (participant.getSpecialistId() == null || participant.getSpecialistId().isBlank()) {
                            throw InvalidParticipantException.internalArtistWithoutSpecialistId();
                        }
                    }
                }
                
                // Validate INSTRUMENT
                if (participant.getRoleType() == SessionRoleType.INSTRUMENT) {
                    // Custom instruments: skillId có thể null nếu CUSTOMER_SELF + CUSTOMER_SIDE
                    boolean isCustomInstrument = participant.getPerformerSource() == PerformerSource.CUSTOMER_SELF
                        && participant.getInstrumentSource() == InstrumentSource.CUSTOMER_SIDE
                        && (participant.getSkillId() == null || participant.getSkillId().isBlank());
                    
                    if (!isCustomInstrument) {
                        // Non-custom instruments: skillId bắt buộc
                        if (participant.getSkillId() == null || participant.getSkillId().isBlank()) {
                            throw InvalidParticipantException.instrumentWithoutSkillId();
                        }
                    } else {
                        // Custom instruments: skillName bắt buộc
                        if (participant.getSkillName() == null || participant.getSkillName().isBlank()) {
                            throw InvalidParticipantException.customInstrumentWithoutSkillName();
                        }
                    }
                    
                    // Validate INTERNAL_ARTIST có specialistId
                    if (participant.getPerformerSource() == PerformerSource.INTERNAL_ARTIST) {
                        if (participant.getSpecialistId() == null || participant.getSpecialistId().isBlank()) {
                            throw InvalidParticipantException.internalArtistWithoutSpecialistId();
                        }
                    }
                    
                    // Validate STUDIO_SIDE có equipmentId (custom instruments không thể STUDIO_SIDE)
                    if (participant.getInstrumentSource() == InstrumentSource.STUDIO_SIDE) {
                        if (isCustomInstrument) {
                            throw InvalidParticipantException.customInstrumentCannotRentFromStudio();
                        }
                        if (participant.getEquipmentId() == null || participant.getEquipmentId().isBlank()) {
                            throw InvalidParticipantException.studioSideWithoutEquipmentId();
                        }
                        // Validate equipment match skill_id qua skill_equipment_mapping
                        String equipmentId = participant.getEquipmentId();
                        String skillId = participant.getSkillId();
                        boolean equipmentMatchesSkill = skillEquipmentMappingRepository
                            .existsBySkillIdAndEquipment_EquipmentId(skillId, equipmentId);
                        if (!equipmentMatchesSkill) {
                            throw InvalidParticipantException.equipmentNotMatchingSkill(equipmentId, skillId);
                        }
                        log.debug("Validated equipment-skill mapping: equipmentId={}, skillId={}", equipmentId, skillId);
                    }
                }
            }
            
            // Check artist availability (nếu có INTERNAL_ARTIST)
            List<String> specialistIds = request.getParticipants().stream()
                .filter(p -> p.getPerformerSource() == PerformerSource.INTERNAL_ARTIST)
                .filter(p -> p.getSpecialistId() != null && !p.getSpecialistId().isBlank())
                .map(ParticipantRequest::getSpecialistId)
                .distinct()
                .toList();
            
            if (!specialistIds.isEmpty()) {
                // Check conflict với booking_participants (chỉ check INTERNAL_ARTIST)
                List<BookingParticipant> conflictingParticipants = bookingParticipantRepository
                    .findConflictingBookingsForMultipleSpecialists(
                        specialistIds,
                        request.getBookingDate(),
                        request.getStartTime(),
                        request.getEndTime()
                    );
                
                // Filter chỉ lấy INTERNAL_ARTIST conflicts
                List<String> uniqueConflicts = conflictingParticipants.stream()
                    .filter(bp -> bp.getPerformerSource() == PerformerSource.INTERNAL_ARTIST)
                    .map(BookingParticipant::getSpecialistId)
                    .filter(id -> id != null && !id.isBlank())
                    .distinct()
                    .toList();
                
                if (!uniqueConflicts.isEmpty()) {
                    throw ArtistBookingConflictException.forArtists(uniqueConflicts);
                }
                
                // Check work slots (BẮT BUỘC) - Grid system
                // Logic: Nếu specialist không đăng ký slot → không available
                //         Chỉ available khi có TẤT CẢ slots liên tiếp đều AVAILABLE
                // Batch check availability cho tất cả specialists cùng lúc (tối ưu hiệu suất)
                if (!specialistIds.isEmpty()) {
                    String dateStr = request.getBookingDate().toString();
                    String startTimeStr = request.getStartTime().toString();
                    String endTimeStr = request.getEndTime().toString();
                    
                    ApiResponse<Map<String, Boolean>> batchAvailabilityResponse = specialistServiceFeignClient
                        .batchCheckAvailability(dateStr, startTimeStr, endTimeStr, specialistIds);
                    
                    if (batchAvailabilityResponse == null || 
                        !"success".equals(batchAvailabilityResponse.getStatus()) ||
                        batchAvailabilityResponse.getData() == null) {
                        throw new RuntimeException("Failed to check specialist availability");
                    }
                    
                    Map<String, Boolean> availabilityMap = batchAvailabilityResponse.getData();
                    
                    // Check từng specialist và throw exception nếu không available
                    for (String specialistId : specialistIds) {
                        Boolean isAvailable = availabilityMap.get(specialistId);
                        if (isAvailable == null || !isAvailable) {
                            throw ArtistBookingConflictException.artistNotAvailable(specialistId);
                        }
                    }
                }
            }
        }
        
        // 7. Set default sessionType
        RecordingSessionType sessionType = request.getSessionType() != null 
            ? request.getSessionType() 
            : RecordingSessionType.SELF_RECORDING; // Default cho luồng 3
        
        // 8. Tính toán fees
        BigDecimal totalParticipantFee = BigDecimal.ZERO;
        BigDecimal totalEquipmentRentalFee = BigDecimal.ZERO;
        
        if (request.getParticipants() != null) {
            for (ParticipantRequest participant : request.getParticipants()) {
                if (participant.getPerformerSource() == PerformerSource.INTERNAL_ARTIST 
                    && participant.getParticipantFee() != null) {
                    totalParticipantFee = totalParticipantFee.add(participant.getParticipantFee());
                }
            }
        }
        
        if (request.getRequiredEquipment() != null) {
            for (RequiredEquipmentRequest equipment : request.getRequiredEquipment()) {
                BigDecimal equipmentTotalFee = equipment.getTotalRentalFee();
                if (equipmentTotalFee == null) {
                    // Tính từ quantity * rentalFeePerUnit
                    Integer quantity = equipment.getQuantity() != null ? equipment.getQuantity() : 1;
                    equipmentTotalFee = equipment.getRentalFeePerUnit().multiply(BigDecimal.valueOf(quantity));
                }
                totalEquipmentRentalFee = totalEquipmentRentalFee.add(equipmentTotalFee);
            }
        }
        
        // 8.5. Tính studio cost = hourlyRate * durationHours
        BigDecimal durationHoursDecimal = request.getDurationHours() != null 
            ? request.getDurationHours() 
            : BigDecimal.valueOf(durationHours);
        BigDecimal studioCost = studio.getHourlyRate()
            .multiply(durationHoursDecimal)
            .setScale(2, java.math.RoundingMode.HALF_UP);
        
        // 8.6. Tính guest fee dựa trên externalGuestCount và studio policy
        Integer externalGuestCount = request.getExternalGuestCount() != null
            ? request.getExternalGuestCount()
            : 0;
        
        int freeGuestLimit = studio.getFreeExternalGuestsLimit() != null
            ? studio.getFreeExternalGuestsLimit()
            : 0;
        int chargeableGuests = Math.max(0, externalGuestCount - freeGuestLimit);
        
        BigDecimal guestFee = BigDecimal.ZERO;
        if (chargeableGuests > 0 && studio.getExtraGuestFeePerPerson() != null) {
            guestFee = studio.getExtraGuestFeePerPerson()
                .multiply(BigDecimal.valueOf(chargeableGuests))
                .setScale(2, java.math.RoundingMode.HALF_UP);
        }
        
        // 9. Tạo booking
        StudioBooking booking = StudioBooking.builder()
            .userId(customerUserId)
            .studio(studio)
            .requestId(requestId)
            .contractId(null) // Chưa có contract
            .milestoneId(null) // Không có milestone cho luồng 3
            .context(StudioBookingContext.PRE_CONTRACT_HOLD)
            .sessionType(sessionType)
            .bookingDate(request.getBookingDate())
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .status(BookingStatus.TENTATIVE) // Chờ Manager tạo contract
            .durationHours(request.getDurationHours())
            .externalGuestCount(externalGuestCount)
            .artistFee(totalParticipantFee)
            .equipmentRentalFee(totalEquipmentRentalFee)
            .externalGuestFee(guestFee)
            .totalCost(studioCost.add(totalParticipantFee).add(totalEquipmentRentalFee).add(guestFee)) // Studio cost + participant fees + equipment fees + guest fee
            .purpose(request.getPurpose())
            .specialInstructions(request.getSpecialInstructions())
            .notes(request.getNotes())
            .build();
        
        StudioBooking saved = studioBookingRepository.save(booking);
        log.info("Created studio booking from service request: bookingId={}, requestId={}, bookingDate={}, totalCost={}",
            saved.getBookingId(), requestId, request.getBookingDate(), saved.getTotalCost());
        
        // 9.5. Cập nhật snapshot totalPrice cho service request (totalPrice = booking.totalCost, currency = VND)
        try {
            if (saved.getTotalCost() != null) {
                requestServiceFeignClient.updateRequestTotalPrice(
                    requestId,
                    saved.getTotalCost(),
                    "VND"
                );
            }
        } catch (Exception e) {
            // Non-blocking: log warning nhưng không rollback booking
            log.warn("Failed to update totalPrice for service request {} from booking {}: {}", 
                requestId, saved.getBookingId(), e.getMessage());
        }
        
        // 10. Tạo booking_participants
        if (request.getParticipants() != null && !request.getParticipants().isEmpty()) {
            for (ParticipantRequest participantRequest : request.getParticipants()) {
                // Lưu skillName vào notes nếu là custom instrument (skillId = null)
                String notes = participantRequest.getNotes();
                if ((participantRequest.getSkillId() == null || participantRequest.getSkillId().isBlank())
                    && participantRequest.getSkillName() != null && !participantRequest.getSkillName().isBlank()) {
                    // Custom instrument: lưu skillName vào notes
                    notes = participantRequest.getSkillName();
                }
                
                BookingParticipant participant = BookingParticipant.builder()
                    .booking(saved)
                    .roleType(participantRequest.getRoleType())
                    .performerSource(participantRequest.getPerformerSource())
                    .specialistId(participantRequest.getSpecialistId())
                    .skillId(participantRequest.getSkillId()) // null cho custom instruments
                    .instrumentSource(participantRequest.getInstrumentSource())
                    .equipmentId(participantRequest.getEquipmentId())
                    .participantFee(participantRequest.getParticipantFee() != null 
                        ? participantRequest.getParticipantFee() 
                        : BigDecimal.ZERO)
                    .isPrimary(participantRequest.getIsPrimary() != null ? participantRequest.getIsPrimary() : false)
                    .notes(notes) // Lưu skillName cho custom instruments
                    .build();
                
                bookingParticipantRepository.save(participant);
                log.info("Created booking participant: participantId={}, roleType={}, performerSource={}, specialistId={}",
                    participant.getParticipantId(), participant.getRoleType(), 
                    participant.getPerformerSource(), participant.getSpecialistId());
                
                // Publish Kafka event để mark slots as BOOKED (async) - chỉ cho INTERNAL_ARTIST
                // Mark ngay khi tạo booking để tránh conflict với booking khác
                // Nếu contract cancel/expired → sẽ release slots qua SlotReleasedEvent
                if (participant.getPerformerSource() == PerformerSource.INTERNAL_ARTIST 
                    && participant.getSpecialistId() != null) {
                    publishSlotBookedEvent(
                        participant.getSpecialistId(),
                        saved.getBookingId(),
                        request.getBookingDate(),
                        request.getStartTime(),
                        request.getEndTime()
                    );
                }
            }
        }
        
        // 11. Tạo booking_required_equipment
        if (request.getRequiredEquipment() != null && !request.getRequiredEquipment().isEmpty()) {
            for (RequiredEquipmentRequest equipmentRequest : request.getRequiredEquipment()) {
                Integer quantity = equipmentRequest.getQuantity() != null ? equipmentRequest.getQuantity() : 1;
                BigDecimal rentalFeePerUnit = equipmentRequest.getRentalFeePerUnit();
                // Tính totalRentalFee nếu không có
                BigDecimal totalRentalFee = equipmentRequest.getTotalRentalFee();
                if (totalRentalFee == null) {
                    totalRentalFee = rentalFeePerUnit.multiply(BigDecimal.valueOf(quantity));
                }
                
                BookingRequiredEquipment equipment = BookingRequiredEquipment.builder()
                    .booking(saved)
                    .equipmentId(equipmentRequest.getEquipmentId())
                    .quantity(quantity)
                    .rentalFeePerUnit(rentalFeePerUnit)
                    .totalRentalFee(totalRentalFee)
                    .participantId(equipmentRequest.getParticipantId())
                    .build();
                
                bookingRequiredEquipmentRepository.save(equipment);
                log.info("Created booking required equipment: equipmentId={}, quantity={}, totalRentalFee={}",
                    equipment.getEquipmentId(), equipment.getQuantity(), equipment.getTotalRentalFee());
            }
        }
        
        return mapToResponse(saved);
    }
    
    /**
     * Map StudioBooking entity sang StudioBookingResponse
     * Tối ưu: Batch fetch specialist info để tránh N+1 query
     */
    private StudioBookingResponse mapToResponse(StudioBooking booking) {
        // Lấy danh sách participants (tất cả luồng - cả luồng 2 và luồng 3)
        List<BookingParticipant> bookingParticipants = bookingParticipantRepository.findByBooking_BookingId(booking.getBookingId());
        
        // Tối ưu: Batch fetch specialist info cho tất cả unique specialistIds
        Set<String> uniqueSpecialistIds = bookingParticipants.stream()
                .map(BookingParticipant::getSpecialistId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());
        
        Map<String, Map<String, Object>> specialistInfoMap = new HashMap<>();
        for (String specialistId : uniqueSpecialistIds) {
            try {
                ApiResponse<Map<String, Object>> response = specialistServiceFeignClient.getPublicSpecialistById(specialistId);
                if (response != null && "success".equals(response.getStatus()) && response.getData() != null) {
                    specialistInfoMap.put(specialistId, response.getData());
                }
            } catch (Exception e) {
                // Giảm log level từ WARN xuống DEBUG cho lỗi JWT expired (client-side error)
                log.debug("Failed to fetch specialist info for specialistId={}: {}", specialistId, e.getMessage());
            }
        }
        
        List<StudioBookingResponse.BookingParticipantInfo> participants = bookingParticipants.stream()
            .map(p -> {
                String specialistName = null;
                String skillName = null;
                
                // Lấy specialist info từ map đã fetch sẵn
                Map<String, Object> specialistData = specialistInfoMap.get(p.getSpecialistId());
                if (specialistData != null) {
                            // Response structure: { specialist: {...}, skills: [...], demos: [...] }
                            @SuppressWarnings("unchecked")
                    Map<String, Object> specialist = (Map<String, Object>) specialistData.get("specialist");
                            if (specialist != null) {
                                specialistName = (String) specialist.get("fullName");
                            }
                            
                            // Lấy skill name nếu là INSTRUMENT
                    if (p.getSkillId() != null && specialistData.get("skills") != null) {
                                @SuppressWarnings("unchecked")
                        List<Map<String, Object>> skills = (List<Map<String, Object>>) specialistData.get("skills");
                                for (Map<String, Object> skill : skills) {
                                    if (p.getSkillId().equals(skill.get("skillId"))) {
                                        skillName = (String) skill.get("skillName");
                                        break;
                                    }
                                }
                            }
                } else if (p.getSpecialistId() != null && !p.getSpecialistId().isBlank()) {
                    // Fallback nếu không fetch được
                        specialistName = "Specialist " + p.getSpecialistId().substring(0, Math.min(8, p.getSpecialistId().length()));
                }
                
                // Custom instruments: skillId = null, skillName lưu trong notes
                if (p.getRoleType() == SessionRoleType.INSTRUMENT 
                    && (p.getSkillId() == null || p.getSkillId().isBlank())
                    && p.getNotes() != null && !p.getNotes().isBlank()) {
                    skillName = p.getNotes(); // Lấy skillName từ notes cho custom instruments
                }
                
                return StudioBookingResponse.BookingParticipantInfo.builder()
                    .participantId(p.getParticipantId())
                    .specialistId(p.getSpecialistId())
                    .specialistName(specialistName)
                    .roleType(p.getRoleType() != null ? p.getRoleType().name() : null)
                    .performerSource(p.getPerformerSource() != null ? p.getPerformerSource().name() : null)
                    .skillId(p.getSkillId())
                    .skillName(skillName)
                    .instrumentSource(p.getInstrumentSource() != null ? p.getInstrumentSource().name() : null)
                    .equipmentId(p.getEquipmentId())
                    .participantFee(p.getParticipantFee())
                    .build();
            })
            .toList();
        
        // Lấy danh sách required equipment
        List<BookingRequiredEquipment> bookingEquipments = bookingRequiredEquipmentRepository.findByBooking_BookingId(booking.getBookingId());
        List<StudioBookingResponse.BookingEquipmentInfo> requiredEquipment = bookingEquipments.stream()
            .map(eq -> {
                // Fetch equipment name từ Equipment entity
                Equipment equipment = equipmentRepository.findById(eq.getEquipmentId()).orElse(null);
                String equipmentName = equipment != null ? equipment.getEquipmentName() : "Unknown Equipment";
                
                return StudioBookingResponse.BookingEquipmentInfo.builder()
                    .equipmentId(eq.getEquipmentId())
                    .equipmentName(equipmentName)
                    .quantity(eq.getQuantity())
                    .rentalFeePerUnit(eq.getRentalFeePerUnit())
                    .totalRentalFee(eq.getTotalRentalFee())
                    .build();
            })
            .toList();
        
        return StudioBookingResponse.builder()
            .bookingId(booking.getBookingId())
            .userId(booking.getUserId())
            .studioId(booking.getStudio() != null ? booking.getStudio().getStudioId() : null)
            .studioName(booking.getStudio() != null ? booking.getStudio().getStudioName() : null)
            .requestId(booking.getRequestId())
            .contractId(booking.getContractId())
            .milestoneId(booking.getMilestoneId())
            .context(booking.getContext())
            .sessionType(booking.getSessionType())
            .bookingDate(booking.getBookingDate())
            .startTime(booking.getStartTime())
            .endTime(booking.getEndTime())
            .status(booking.getStatus())
            .freeExternalGuestsLimit(
                booking.getStudio() != null
                    ? booking.getStudio().getFreeExternalGuestsLimit()
                    : null)
            .holdExpiresAt(booking.getHoldExpiresAt())
            .externalGuestCount(booking.getExternalGuestCount())
            .durationHours(booking.getDurationHours())
            .artistFee(booking.getArtistFee())
            .equipmentRentalFee(booking.getEquipmentRentalFee())
            .externalGuestFee(booking.getExternalGuestFee())
            .totalCost(booking.getTotalCost())
            .purpose(booking.getPurpose())
            .specialInstructions(booking.getSpecialInstructions())
            .notes(booking.getNotes())
            .createdAt(booking.getCreatedAt())
            .updatedAt(booking.getUpdatedAt())
            .participants(participants)
            .requiredEquipment(requiredEquipment)
            .build();
    }
    
    /**
     * Lấy thông tin studio active (single studio system)
     * GET /studio-bookings/active-studio
     */
    @Transactional(readOnly = true)
    public StudioInfoResponse getActiveStudio() {
        log.info("Getting active studio info");
        
        List<Studio> activeStudios = studioRepository.findByIsActiveTrue();
        if (activeStudios.isEmpty()) {
            throw NoActiveStudioException.notFound();
        }
        if (activeStudios.size() > 1) {
            throw NoActiveStudioException.multipleFound(activeStudios.size());
        }
        Studio studio = activeStudios.getFirst();
        
        return StudioInfoResponse.builder()
                .studioId(studio.getStudioId())
                .studioName(studio.getStudioName())
                .location(studio.getLocation())
                .hourlyRate(studio.getHourlyRate())
                .freeExternalGuestsLimit(studio.getFreeExternalGuestsLimit())
                .extraGuestFeePerPerson(studio.getExtraGuestFeePerPerson())
                .isActive(studio.getIsActive())
                .build();
    }
    
    /**
     * Lấy tất cả studios (cho admin)
     * GET /admin/studios
     */
    @Transactional(readOnly = true)
    public List<StudioInfoResponse> getAllStudios() {
        log.info("Getting all studios for admin");
        
        List<Studio> studios = studioRepository.findAll();
        
        return studios.stream()
                .map(studio -> StudioInfoResponse.builder()
                        .studioId(studio.getStudioId())
                        .studioName(studio.getStudioName())
                        .location(studio.getLocation())
                        .hourlyRate(studio.getHourlyRate())
                        .freeExternalGuestsLimit(studio.getFreeExternalGuestsLimit())
                        .extraGuestFeePerPerson(studio.getExtraGuestFeePerPerson())
                        .isActive(studio.getIsActive())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Cập nhật studio (cho admin)
     * PUT /admin/studios/{studioId}
     */
    @Transactional
    public StudioInfoResponse updateStudio(String studioId, com.mutrapro.project_service.dto.request.UpdateStudioRequest request) {
        log.info("Updating studio: studioId={}", studioId);
        
        Studio studio = studioRepository.findById(studioId)
                .orElseThrow(() -> StudioNotFoundException.byId(studioId));
        
        if (request.getStudioName() != null) {
            studio.setStudioName(request.getStudioName());
        }
        if (request.getLocation() != null) {
            studio.setLocation(request.getLocation());
        }
        if (request.getHourlyRate() != null) {
            studio.setHourlyRate(request.getHourlyRate());
        }
        if (request.getFreeExternalGuestsLimit() != null) {
            studio.setFreeExternalGuestsLimit(request.getFreeExternalGuestsLimit());
        }
        if (request.getExtraGuestFeePerPerson() != null) {
            studio.setExtraGuestFeePerPerson(request.getExtraGuestFeePerPerson());
        }
        if (request.getIsActive() != null) {
            studio.setIsActive(request.getIsActive());
        }
        
        Studio saved = studioRepository.save(studio);
        log.info("Updated studio: studioId={}, studioName={}", saved.getStudioId(), saved.getStudioName());
        
        return StudioInfoResponse.builder()
                .studioId(saved.getStudioId())
                .studioName(saved.getStudioName())
                .location(saved.getLocation())
                .hourlyRate(saved.getHourlyRate())
                .freeExternalGuestsLimit(saved.getFreeExternalGuestsLimit())
                .extraGuestFeePerPerson(saved.getExtraGuestFeePerPerson())
                .isActive(saved.getIsActive())
                .build();
    }
    
    /**
     * Lấy available time slots của studio trong một ngày
     * GET /studio-bookings/available-slots?date={date}
     * 
     * Flow: Manager chọn Studio + Date → hiển thị slot giờ trống
     * Tự động lấy studio active (single studio system)
     */
    public List<AvailableTimeSlotResponse> getAvailableSlots(LocalDate date) {
        log.info("Getting available slots for active studio, date={}", date);
        
        // 1. Tự động lấy studio active (single studio system)
        List<Studio> activeStudios = studioRepository.findByIsActiveTrue();
        if (activeStudios.isEmpty()) {
            throw NoActiveStudioException.notFound();
        }
        if (activeStudios.size() > 1) {
            throw NoActiveStudioException.multipleFound(activeStudios.size());
        }
        Studio studio = activeStudios.getFirst();
        String studioId = studio.getStudioId();
        
        // 2. Lấy tất cả bookings trong ngày đó
        List<StudioBooking> bookingsOnDate = studioBookingRepository
            .findByStudioStudioIdAndBookingDate(studioId, date);
        
        // 3. Filter bookings có status active (không bao gồm COMPLETED, CANCELLED, NO_SHOW)
        // COMPLETED booking đã xong, không nên block slot nữa
        List<BookingStatus> activeStatuses = List.of(
            BookingStatus.TENTATIVE, BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS);
        
        List<StudioBooking> activeBookings = bookingsOnDate.stream()
            .filter(booking -> activeStatuses.contains(booking.getStatus()))
            .toList();
        
        // 4. Tạo available slots (8:00 - 18:00, mỗi slot 2 giờ, không overlap)
        // Slots: 08:00-10:00, 10:00-12:00, 12:00-14:00, 14:00-16:00, 16:00-18:00
        List<AvailableTimeSlotResponse> slots = new java.util.ArrayList<>();
        LocalTime endHour = LocalTime.of(18, 0);
        int slotDurationHours = 2;
        int startHour = 8;
        
        for (int hour = startHour; hour < 18; hour += slotDurationHours) { // 9, 11, 13, 15, 17
            final LocalTime currentStart = LocalTime.of(hour, 0);
            final LocalTime currentEnd = currentStart.plusHours(slotDurationHours);
            
            if (currentEnd.isAfter(endHour)) {
                break;
            }
            
            // Check if slot conflicts with any active booking
            final LocalTime finalStart = currentStart;
            final LocalTime finalEnd = currentEnd;
            boolean isAvailable = activeBookings.stream().noneMatch(booking -> {
                LocalTime bookingStart = booking.getStartTime();
                LocalTime bookingEnd = booking.getEndTime();
                // Overlap: finalStart < bookingEnd && finalEnd > bookingStart
                return finalStart.isBefore(bookingEnd) && finalEnd.isAfter(bookingStart);
            });
            
            String status = isAvailable ? "available" : "booked";
            if (!isAvailable) {
                // Check if it's tentative
                boolean isTentative = activeBookings.stream()
                    .anyMatch(booking -> booking.getStatus() == BookingStatus.TENTATIVE &&
                        finalStart.isBefore(booking.getEndTime()) && finalEnd.isAfter(booking.getStartTime()));
                if (isTentative) {
                    status = "tentative";
                }
            }
            
            slots.add(AvailableTimeSlotResponse.builder()
                .startTime(currentStart)
                .endTime(currentEnd)
                .available(isAvailable)
                .status(status)
                .build());
        }
        
        log.info("Found {} available slots for studio: studioId={}, date={}", slots.size(), studioId, date);
        return slots;
    }
    
    /**
     * Lấy available artists cho một slot cụ thể
     * GET /api/v1/studio-bookings/available-artists?milestoneId={milestoneId}&date={date}&startTime={startTime}&endTime={endTime}
     * 
     * Flow: Sau khi chọn slot → hiển thị artists với:
     * - Preferred artists từ customer (highlight)
     * - Available/Busy status cho slot đó
     * - Có thể ẩn artists đang bận
     */
    public List<AvailableArtistResponse> getAvailableArtists(
            String milestoneId, 
            LocalDate bookingDate, 
            LocalTime startTime, 
            LocalTime endTime,
            List<String> genres,  // Optional - genres từ frontend để tránh gọi request-service
            List<String> preferredSpecialistIds) {  // Optional - preferred specialist IDs từ frontend để tránh gọi request-service
        log.info("Getting available artists for slot: milestoneId={}, date={}, time={}-{}, genres={}, preferredSpecialistIds={}", 
            milestoneId, bookingDate, startTime, endTime, genres, preferredSpecialistIds);
        
        // 2. Lấy preferred specialists từ parameter
        List<String> preferredIds = preferredSpecialistIds != null && !preferredSpecialistIds.isEmpty()
            ? preferredSpecialistIds
            : new java.util.ArrayList<>();
        
        // 3. Lấy TẤT CẢ vocalists từ specialist-service
        List<Map<String, Object>> allVocalists = new java.util.ArrayList<>();
        try {
            // Dùng genres từ parameter (nếu có), nếu không thì mới gọi request-service

            ApiResponse<List<Map<String, Object>>> vocalistsResponse = 
                specialistServiceFeignClient.getVocalists(null, genres); // gender = null (lấy tất cả)
            if (vocalistsResponse != null && vocalistsResponse.getData() != null) {
                allVocalists = vocalistsResponse.getData();
            }
        } catch (Exception e) {
            log.error("Failed to fetch vocalists from specialist-service: {}", e.getMessage());
            // Fallback: nếu không lấy được tất cả, chỉ trả về preferred ones
            allVocalists = new java.util.ArrayList<>();
        }
        
        // 4. Lấy tất cả artists đã book trong slot này để check availability
        List<String> allVocalistIds = allVocalists.stream()
            .map(v -> (String) v.get("specialistId"))
            .toList();
        
        List<BookingParticipant> conflictingParticipants = allVocalistIds.isEmpty() 
            ? List.of()
            : bookingParticipantRepository.findConflictingBookingsForMultipleSpecialists(
                allVocalistIds,
                bookingDate,
                startTime,
                endTime
            );
        
        // 5. Tạo response cho TẤT CẢ vocalists, mark preferred ones
        List<AvailableArtistResponse> artists = new java.util.ArrayList<>();
        
        for (Map<String, Object> vocalist : allVocalists) {
            String specialistId = (String) vocalist.get("specialistId");
            // SpecialistResponse có field fullName, không phải name
            String artistName = (String) vocalist.getOrDefault("fullName", "Unknown Artist");
            
            // Debug log nếu name là Unknown
            if ("Unknown Artist".equals(artistName)) {
                log.warn("Artist name is Unknown for specialistId={}, available keys: {}", 
                    specialistId, vocalist.keySet());
            }
            
            // Check if artist is preferred
            boolean isPreferred = preferredIds.contains(specialistId);
            
            // Check if artist is busy (chỉ check INTERNAL_ARTIST)
            boolean isBusy = conflictingParticipants.stream()
                .filter(bp -> bp.getPerformerSource() == PerformerSource.INTERNAL_ARTIST)
                .anyMatch(bp -> specialistId.equals(bp.getSpecialistId()));
            
            BookingParticipant conflict = conflictingParticipants.stream()
                .filter(bp -> bp.getPerformerSource() == PerformerSource.INTERNAL_ARTIST)
                .filter(bp -> specialistId.equals(bp.getSpecialistId()))
                .findFirst()
                .orElse(null);
            
            // Check slot availability (BẮT BUỘC) - Grid system
            // Nếu không có slot AVAILABLE → không available
            boolean hasAvailableSlots = true;
            if (!isBusy) { // Chỉ check nếu không busy (tránh gọi API không cần thiết)
                try {
                    String dateStr = bookingDate.toString();
                    String startTimeStr = startTime.toString();
                    String endTimeStr = endTime.toString();
                    
                    ApiResponse<Boolean> availabilityResponse = specialistServiceFeignClient
                        .checkSpecialistAvailability(specialistId, dateStr, startTimeStr, endTimeStr);
                    
                    if (availabilityResponse != null && 
                        "success".equals(availabilityResponse.getStatus()) &&
                        availabilityResponse.getData() != null) {
                        hasAvailableSlots = availabilityResponse.getData();
                    } else {
                        // Nếu không check được (API error), giả sử không available để an toàn
                        log.warn("Failed to check slot availability for artist {}: response={}", 
                            specialistId, availabilityResponse);
                        hasAvailableSlots = false;
                    }
                } catch (Exception e) {
                    // Nếu API error, giả sử không available để an toàn
                    log.warn("Failed to check slot availability for artist {}: {}", specialistId, e.getMessage());
                    hasAvailableSlots = false;
                }
            }
            
            // Artist chỉ available nếu không busy VÀ có slot AVAILABLE
            boolean isAvailable = !isBusy && hasAvailableSlots;
            
            // Get role (default VOCALIST)
            // recordingRoles là List<RecordingRole> enum, cần convert sang String
            // Ưu tiên VOCALIST nếu artist có cả VOCALIST và INSTRUMENT_PLAYER
            String role = "VOCALIST";
            if (vocalist.get("recordingRoles") != null) {
                @SuppressWarnings("unchecked")
                List<Object> roles = (List<Object>) vocalist.get("recordingRoles");
                if (roles != null && !roles.isEmpty()) {
                    // Tìm VOCALIST trước (ưu tiên)
                    boolean foundVocalist = false;
                    for (Object roleObj : roles) {
                        String roleStr = roleObj instanceof String 
                            ? (String) roleObj 
                            : roleObj.toString();
                        if ("VOCALIST".equalsIgnoreCase(roleStr)) {
                            role = "VOCALIST";
                            foundVocalist = true;
                            break;
                        }
                    }
                    // Nếu không có VOCALIST, lấy role đầu tiên
                    if (!foundVocalist) {
                        Object firstRole = roles.get(0);
                        role = firstRole instanceof String 
                            ? (String) firstRole 
                            : firstRole.toString();
                    }
                }
            }
            
            // Lấy các thông tin khác từ vocalist
            String email = (String) vocalist.getOrDefault("email", null);
            String avatarUrl = (String) vocalist.getOrDefault("avatarUrl", null);
            String mainDemoPreviewUrl = (String) vocalist.getOrDefault("mainDemoPreviewUrl", null);
            String gender = vocalist.get("gender") != null 
                ? vocalist.get("gender").toString() 
                : null;
            String bio = (String) vocalist.getOrDefault("bio", null);
            Integer reviews = vocalist.get("reviews") != null
                ? ((Number) vocalist.get("reviews")).intValue()
                : null;
            Integer experienceYears = vocalist.get("experienceYears") != null 
                ? ((Number) vocalist.get("experienceYears")).intValue() 
                : null;
            BigDecimal rating = vocalist.get("rating") != null
                ? (vocalist.get("rating") instanceof BigDecimal 
                    ? (BigDecimal) vocalist.get("rating")
                    : new BigDecimal(vocalist.get("rating").toString()))
                : null;
            Integer totalProjects = vocalist.get("totalProjects") != null
                ? ((Number) vocalist.get("totalProjects")).intValue()
                : null;
            
            // Lấy hourlyRate
            BigDecimal hourlyRate = null;
            if (vocalist.get("hourlyRate") != null) {
                Object hourlyRateObj = vocalist.get("hourlyRate");
                if (hourlyRateObj instanceof BigDecimal) {
                    hourlyRate = (BigDecimal) hourlyRateObj;
                } else if (hourlyRateObj instanceof Number) {
                    hourlyRate = new BigDecimal(hourlyRateObj.toString());
                }
            }
            log.info("hourlyRate: {}", hourlyRate);
            // Lấy genres
            @SuppressWarnings("unchecked")
            List<String> artistGenres = vocalist.get("genres") != null
                ? (List<String>) vocalist.get("genres")
                : null;
            
            // Lấy credits (có thể từ demos hoặc credits field)
            @SuppressWarnings("unchecked")
            List<String> credits = vocalist.get("credits") != null
                ? (List<String>) vocalist.get("credits")
                : null;
            
            artists.add(AvailableArtistResponse.builder()
                .specialistId(specialistId)
                .name(artistName)
                .fullName(artistName)  // Set fullName = name để tương thích với frontend
                .email(email)
                .avatarUrl(avatarUrl)
                .mainDemoPreviewUrl(mainDemoPreviewUrl)
                .gender(gender)
                .bio(bio)
                .reviews(reviews)
                .credits(credits)
                .role(role)
                .genres(artistGenres)
                .experienceYears(experienceYears)
                .rating(rating)
                .totalProjects(totalProjects)
                .hourlyRate(hourlyRate)
                .isPreferred(isPreferred)  // Mark preferred ones
                .isAvailable(isAvailable)
                .availabilityStatus(isAvailable ? "available" : (isBusy ? "busy" : "no_slots"))
                .conflictStartTime(conflict != null ? conflict.getBooking().getStartTime() : null)
                .conflictEndTime(conflict != null ? conflict.getBooking().getEndTime() : null)
                .build());
        }
        
        // Chuẩn hoá genres filter để tính match score
        final List<String> normalizedGenres = genres != null
            ? genres.stream().filter(Objects::nonNull).map(String::toLowerCase).toList()
            : java.util.List.of();

        // Filter: Chỉ lấy artists có slot AVAILABLE và không có booking conflict
        artists = artists.stream()
            .filter(a -> Boolean.TRUE.equals(a.getIsAvailable()))
            .collect(java.util.stream.Collectors.toList());
        
        // Sort:
        // 1. Preferred artists trước
        // 2. Nghệ sĩ match nhiều genres hơn (theo request) đứng trước
        // 3. Rating cao hơn (nếu có) đứng trước
        // 4. Cuối cùng sort theo tên
        artists.sort((a1, a2) -> {
            // 1. Preferred
            if (Boolean.TRUE.equals(a1.getIsPreferred()) && !Boolean.TRUE.equals(a2.getIsPreferred())) return -1;
            if (!Boolean.TRUE.equals(a1.getIsPreferred()) && Boolean.TRUE.equals(a2.getIsPreferred())) return 1;

            // Helper: tính số genres match với filter
            java.util.function.Function<AvailableArtistResponse, Integer> matchCountFn = artist -> {
                if (normalizedGenres.isEmpty() || artist.getGenres() == null) return 0;
                int count = 0;
                for (String g : artist.getGenres()) {
                    if (g == null) continue;
                    if (normalizedGenres.contains(g.toLowerCase())) {
                        count++;
                    }
                }
                return count;
            };

            int m1 = matchCountFn.apply(a1);
            int m2 = matchCountFn.apply(a2);
            if (m1 != m2) {
                // Nhiều match hơn đứng trước
                return Integer.compare(m2, m1);
            }

            // 3. Rating (null-safe, cao hơn đứng trước)
            BigDecimal r1 = a1.getRating();
            BigDecimal r2 = a2.getRating();
            if (r1 != null || r2 != null) {
                if (r1 == null) return 1;
                if (r2 == null) return -1;
                int cmp = r2.compareTo(r1);
                if (cmp != 0) return cmp;
            }

            // 4. Tên
            return a1.getName().compareToIgnoreCase(a2.getName());
        });
        
        log.info("Found {} available artists ({} preferred) for slot: milestoneId={}, date={}, time={}-{}", 
            artists.size(), preferredIds.size(), milestoneId, bookingDate, startTime, endTime);
        return artists;
    }
    
    /**
     * Lấy available artists/instrumentalists cho luồng 3 (booking từ service request)
     * GET /studio-bookings/available-artists-for-request?date={date}&startTime={startTime}&endTime={endTime}&skillId={skillId}&roleType={roleType}
     * 
     * Flow: Sau khi chọn slot → hiển thị artists/instrumentalists với:
     * - Available/Busy status cho slot đó
     * - Filter theo skillId nếu là INSTRUMENT
     * - Check conflict từ booking_participants (chỉ check INTERNAL_ARTIST)
     * 
     * LƯU Ý: Luồng 3 không có "preferred" artists vì customer tự chọn
     * 
     * @param bookingDate Ngày booking
     * @param startTime Thời gian bắt đầu
     * @param endTime Thời gian kết thúc
     * @param skillId Optional - Skill ID để filter instrumentalists (chỉ dùng khi roleType = INSTRUMENT)
     * @param roleType Optional - VOCAL hoặc INSTRUMENT (mặc định lấy cả 2)
     * @param genres Optional - Genres để filter vocalists
     */
    @Transactional(readOnly = true)
    public List<AvailableArtistResponse> getAvailableArtistsForRequest(
            LocalDate bookingDate,
            LocalTime startTime,
            LocalTime endTime,
            String skillId,
            String roleType,
            List<String> genres) {
        
        log.info("Getting available artists for request: date={}, time={}-{}, skillId={}, roleType={}, genres={}", 
            bookingDate, startTime, endTime, skillId, roleType, genres);
        
        // 1. Lấy artists từ specialist-service
        List<Map<String, Object>> allArtists = new java.util.ArrayList<>();
        
        // Nếu roleType = INSTRUMENT và có skillId
        if ("INSTRUMENT".equalsIgnoreCase(roleType) && skillId != null && !skillId.isBlank()) {
            try {
                ApiResponse<List<Map<String, Object>>> specialistsResponse = 
                    specialistServiceFeignClient.getSpecialistsBySkillId(skillId);
                if (specialistsResponse != null && specialistsResponse.getData() != null) {
                    allArtists = specialistsResponse.getData();
                }
            } catch (Exception e) {
                log.error("Failed to fetch specialists by skillId from specialist-service: skillId={}, error={}", 
                    skillId, e.getMessage());
            }
        } 
        // Nếu roleType = VOCAL hoặc không có roleType
        else if ("VOCAL".equalsIgnoreCase(roleType) || roleType == null || roleType.isBlank()) {
            try {
                ApiResponse<List<Map<String, Object>>> vocalistsResponse = 
                    specialistServiceFeignClient.getVocalists(null, genres);
                if (vocalistsResponse != null && vocalistsResponse.getData() != null) {
                    allArtists = vocalistsResponse.getData();
                }
            } catch (Exception e) {
                log.error("Failed to fetch vocalists from specialist-service: {}", e.getMessage());
            }
        }
        // Nếu roleType = INSTRUMENT nhưng không có skillId, lấy tất cả recording artists và filter sau
        else if ("INSTRUMENT".equalsIgnoreCase(roleType)) {
            // Fallback: lấy vocalists (có thể có cả instrumentalists) và filter sau
            try {
                ApiResponse<List<Map<String, Object>>> vocalistsResponse = 
                    specialistServiceFeignClient.getVocalists(null, genres);
                if (vocalistsResponse != null && vocalistsResponse.getData() != null) {
                    allArtists = vocalistsResponse.getData();
                    // Filter chỉ lấy những artist có INSTRUMENT_PLAYER role
                    allArtists = allArtists.stream()
                        .filter(artist -> {
                            @SuppressWarnings("unchecked")
                            List<Object> roles = (List<Object>) artist.get("recordingRoles");
                            if (roles == null) return false;
                            return roles.stream()
                                .anyMatch(role -> "INSTRUMENT_PLAYER".equalsIgnoreCase(role.toString()));
                        })
                        .toList();
                }
            } catch (Exception e) {
                log.error("Failed to fetch instrumentalists from specialist-service: {}", e.getMessage());
            }
        }
        
        // 3. Lấy tất cả specialist IDs để check conflict
        List<String> allSpecialistIds = allArtists.stream()
            .map(a -> (String) a.get("specialistId"))
            .filter(id -> id != null && !id.isBlank())
            .toList();
        
        // 4. Check conflict từ booking_participants (chỉ check INTERNAL_ARTIST)
        List<BookingParticipant> conflictingParticipants = allSpecialistIds.isEmpty()
            ? List.of()
            : bookingParticipantRepository.findConflictingBookingsForMultipleSpecialists(
                allSpecialistIds,
                bookingDate,
                startTime,
                endTime
            );
        
        // Filter chỉ lấy INTERNAL_ARTIST conflicts
        List<String> allConflictingIds = conflictingParticipants.stream()
            .filter(bp -> bp.getPerformerSource() == PerformerSource.INTERNAL_ARTIST)
            .map(BookingParticipant::getSpecialistId)
            .filter(id -> id != null && !id.isBlank())
            .toList();
        
        // 5. Batch check slot availability cho tất cả specialists không busy (tối ưu hiệu suất)
        Map<String, Boolean> availabilityMap = new java.util.HashMap<>();
        List<String> specialistsToCheck = allSpecialistIds.stream()
            .filter(id -> !allConflictingIds.contains(id)) // Chỉ check những specialist không busy
            .collect(java.util.stream.Collectors.toList());
        
        if (!specialistsToCheck.isEmpty()) {
            String dateStr = bookingDate.toString();
            String startTimeStr = startTime.toString();
            String endTimeStr = endTime.toString();
            
            ApiResponse<Map<String, Boolean>> batchAvailabilityResponse = specialistServiceFeignClient
                .batchCheckAvailability(dateStr, startTimeStr, endTimeStr, specialistsToCheck);
            
            if (batchAvailabilityResponse != null && 
                "success".equals(batchAvailabilityResponse.getStatus()) &&
                batchAvailabilityResponse.getData() != null) {
                availabilityMap = batchAvailabilityResponse.getData();
            } else {
                // Nếu batch check fail, set tất cả là false để an toàn
                for (String id : specialistsToCheck) {
                    availabilityMap.put(id, false);
                }
            }
        }
        
        // 6. Tạo response
        List<AvailableArtistResponse> artists = new java.util.ArrayList<>();
        
        for (Map<String, Object> artist : allArtists) {
            String specialistId = (String) artist.get("specialistId");
            if (specialistId == null || specialistId.isBlank()) {
                continue;
            }
            
            String artistName = (String) artist.getOrDefault("fullName", "Unknown Artist");
            
            // Check if artist is busy (chỉ check INTERNAL_ARTIST)
            boolean isBusy = allConflictingIds.contains(specialistId);
            
            // Get conflict info
            BookingParticipant participantConflict = conflictingParticipants.stream()
                .filter(bp -> bp.getPerformerSource() == PerformerSource.INTERNAL_ARTIST)
                .filter(bp -> specialistId.equals(bp.getSpecialistId()))
                .findFirst()
                .orElse(null);
            
            LocalTime conflictStartTime = null;
            LocalTime conflictEndTime = null;
            if (participantConflict != null) {
                conflictStartTime = participantConflict.getBooking().getStartTime();
                conflictEndTime = participantConflict.getBooking().getEndTime();
            }
            
            // Get slot availability từ batch check result
            boolean hasAvailableSlots = availabilityMap.getOrDefault(specialistId, false);
            
            // Artist chỉ available nếu không busy VÀ có slot AVAILABLE
            boolean isAvailable = !isBusy && hasAvailableSlots;
            
            // Get role
            String role = "VOCALIST";
            if (artist.get("recordingRoles") != null) {
                @SuppressWarnings("unchecked")
                List<Object> roles = (List<Object>) artist.get("recordingRoles");
                if (roles != null && !roles.isEmpty()) {
                    // Nếu có skillId, ưu tiên role liên quan đến skill đó
                    if (skillId != null && !skillId.isBlank()) {
                        // Tìm role phù hợp với skillId (có thể cần check skills của artist)
                        // Tạm thời lấy role đầu tiên
                        Object firstRole = roles.get(0);
                        role = firstRole instanceof String 
                            ? (String) firstRole 
                            : firstRole.toString();
                    } else {
                        // Ưu tiên VOCALIST nếu có
                        boolean foundVocalist = false;
                        for (Object roleObj : roles) {
                            String roleStr = roleObj instanceof String 
                                ? (String) roleObj 
                                : roleObj.toString();
                            if ("VOCALIST".equalsIgnoreCase(roleStr)) {
                                role = "VOCALIST";
                                foundVocalist = true;
                                break;
                            }
                        }
                        if (!foundVocalist) {
                            Object firstRole = roles.get(0);
                            role = firstRole instanceof String 
                                ? (String) firstRole 
                                : firstRole.toString();
                        }
                    }
                }
            }
            
            // Get skill info
            String artistSkillId = null;
            String artistSkillName = null;
            if (skillId != null && !skillId.isBlank()) {
                artistSkillId = skillId;
                // Có thể lấy skillName từ specialist-service nếu cần
            }
            
            // Lấy các thông tin khác
            String email = (String) artist.getOrDefault("email", null);
            String avatarUrl = (String) artist.getOrDefault("avatarUrl", null);
            String mainDemoPreviewUrl = (String) artist.getOrDefault("mainDemoPreviewUrl", null);
            String gender = artist.get("gender") != null 
                ? artist.get("gender").toString() 
                : null;
            String bio = (String) artist.getOrDefault("bio", null);
            Integer reviews = artist.get("reviews") != null
                ? ((Number) artist.get("reviews")).intValue()
                : null;
            Integer experienceYears = artist.get("experienceYears") != null 
                ? ((Number) artist.get("experienceYears")).intValue() 
                : null;
            BigDecimal rating = artist.get("rating") != null
                ? (artist.get("rating") instanceof BigDecimal 
                    ? (BigDecimal) artist.get("rating")
                    : new BigDecimal(artist.get("rating").toString()))
                : null;
            Integer totalProjects = artist.get("totalProjects") != null
                ? ((Number) artist.get("totalProjects")).intValue()
                : null;
            
            // Lấy hourlyRate
            BigDecimal hourlyRate = null;
            if (artist.get("hourlyRate") != null) {
                Object hourlyRateObj = artist.get("hourlyRate");
                if (hourlyRateObj instanceof BigDecimal) {
                    hourlyRate = (BigDecimal) hourlyRateObj;
                } else if (hourlyRateObj instanceof Number) {
                    hourlyRate = new BigDecimal(hourlyRateObj.toString());
                }
            }
            
            @SuppressWarnings("unchecked")
            List<String> artistGenres = artist.get("genres") != null
                ? (List<String>) artist.get("genres")
                : null;
            
            // Lấy credits (có thể từ demos hoặc credits field)
            @SuppressWarnings("unchecked")
            List<String> credits = artist.get("credits") != null
                ? (List<String>) artist.get("credits")
                : null;
            
            artists.add(AvailableArtistResponse.builder()
                .specialistId(specialistId)
                .name(artistName)
                .fullName(artistName)  // Set fullName = name để tương thích với frontend
                .email(email)
                .avatarUrl(avatarUrl)
                .mainDemoPreviewUrl(mainDemoPreviewUrl)
                .gender(gender)
                .bio(bio)
                .reviews(reviews)
                .credits(credits)
                .role(role)
                .genres(artistGenres)
                .experienceYears(experienceYears)
                .rating(rating)
                .totalProjects(totalProjects)
                .hourlyRate(hourlyRate)
                .isPreferred(false)
                .isAvailable(isAvailable)
                .availabilityStatus(isAvailable ? "available" : (isBusy ? "busy" : "no_slots"))
                .conflictStartTime(conflictStartTime)
                .conflictEndTime(conflictEndTime)
                .skillId(artistSkillId)
                .skillName(artistSkillName)
                .build());
        }
        
        // Filter: Chỉ lấy artists có slot AVAILABLE và không có booking conflict
        artists = artists.stream()
            .filter(a -> Boolean.TRUE.equals(a.getIsAvailable()))
            .collect(java.util.stream.Collectors.toList());
        
        // Sort: by name
        artists.sort((a1, a2) -> a1.getName().compareToIgnoreCase(a2.getName()));
        
        log.info("Found {} available artists (filtered) for request: date={}, time={}-{}, roleType={}, skillId={}", 
            artists.size(), bookingDate, startTime, endTime, roleType, skillId);
        return artists;
    }
    
    /**
     * Lấy danh sách studio bookings với filter
     * GET /studio-bookings?contractId={contractId}&milestoneId={milestoneId}&status={status}
     * Tối ưu: Batch fetch tất cả participants, equipment, và specialist info để tránh N+1 query
     */
    @Transactional(readOnly = true)
    public List<StudioBookingResponse> getStudioBookings(String contractId, String milestoneId, String status) {
        long startTime = System.currentTimeMillis();
        log.info("[Performance] ===== getStudioBookings STARTED - contractId={}, milestoneId={}, status={} =====", 
            contractId, milestoneId, status);
        
        long step1Start = System.currentTimeMillis();
        List<StudioBooking> bookings;
        
        if (milestoneId != null && !milestoneId.isBlank()) {
            // Filter theo milestone - cần eager load studio
            bookings = studioBookingRepository.findByMilestoneIdOrderByBookingDateDescStartTimeAsc(milestoneId);
        } else if (contractId != null && !contractId.isBlank()) {
            // Filter theo contract - cần eager load studio
            bookings = studioBookingRepository.findByContractIdOrderByBookingDateDescStartTimeAsc(contractId);
        } else {
            // Lấy tất cả - cần eager load studio
            bookings = studioBookingRepository.findAllByOrderByBookingDateDescStartTimeAsc();
        }
        log.info("[Performance] Step 1 - Fetch bookings: {}ms (found {} bookings)", 
            System.currentTimeMillis() - step1Start, bookings.size());
        
        long step2Start = System.currentTimeMillis();
        // Eager load studio để tránh LazyInitializationException
        bookings.forEach(booking -> {
            if (booking.getStudio() != null) {
                booking.getStudio().getStudioId(); // Trigger lazy load trong transaction
                booking.getStudio().getStudioName(); // Trigger lazy load trong transaction
            }
        });
        log.info("[Performance] Step 2 - Eager load studios: {}ms", 
            System.currentTimeMillis() - step2Start);
        
        long step3Start = System.currentTimeMillis();
        // Filter theo status nếu có
        if (status != null && !status.isBlank()) {
            try {
                BookingStatus bookingStatus = BookingStatus.valueOf(status.toUpperCase());
                bookings = bookings.stream()
                    .filter(b -> b.getStatus() == bookingStatus)
                    .toList();
            } catch (IllegalArgumentException e) {
                log.warn("Invalid booking status: {}", status);
            }
        }
        log.info("[Performance] Step 3 - Filter by status: {}ms (after filter: {} bookings)", 
            System.currentTimeMillis() - step3Start, bookings.size());
        
        if (bookings.isEmpty()) {
            log.info("[Performance] ===== getStudioBookings COMPLETED in {}ms (TOTAL) =====", 
                System.currentTimeMillis() - startTime);
            return List.of();
        }
        
        // Tối ưu: Bỏ qua fetch participants, equipment, và specialist info cho list view
        // List view không hiển thị participants và equipment, chỉ detail page mới cần
        // Điều này giảm đáng kể số queries và data transfer (Step 4, 5, 6, 7 đã bỏ)
        
        long step4Start = System.currentTimeMillis();
        // Convert sang response (không có participants và equipment cho list view)
        List<StudioBookingResponse> responses = bookings.stream()
            .map(booking -> {
                // Build response không có participants và equipment (tối ưu cho list view)
                return StudioBookingResponse.builder()
                    .bookingId(booking.getBookingId())
                    .userId(booking.getUserId())
                    .studioId(booking.getStudio() != null ? booking.getStudio().getStudioId() : null)
                    .studioName(booking.getStudio() != null ? booking.getStudio().getStudioName() : null)
                    .requestId(booking.getRequestId())
                    .contractId(booking.getContractId())
                    .milestoneId(booking.getMilestoneId())
                    .context(booking.getContext())
                    .sessionType(booking.getSessionType())
                    .bookingDate(booking.getBookingDate())
                    .startTime(booking.getStartTime())
                    .endTime(booking.getEndTime())
                    .status(booking.getStatus())
                    .holdExpiresAt(booking.getHoldExpiresAt())
                    .externalGuestCount(booking.getExternalGuestCount())
                    .durationHours(booking.getDurationHours())
                    .artistFee(booking.getArtistFee())
                    .equipmentRentalFee(booking.getEquipmentRentalFee())
                    .externalGuestFee(booking.getExternalGuestFee())
                    .totalCost(booking.getTotalCost())
                    .purpose(booking.getPurpose())
                    .specialInstructions(booking.getSpecialInstructions())
                    .notes(booking.getNotes())
                    .createdAt(booking.getCreatedAt())
                    .updatedAt(booking.getUpdatedAt())
                    .participants(null) // Không cần cho list view
                    .requiredEquipment(null) // Không cần cho list view
                    .build();
            })
            .toList();
        log.info("[Performance] Step 4 - Map to response: {}ms (mapped {} responses)", 
            System.currentTimeMillis() - step4Start, responses.size());
        
        log.info("[Performance] ===== getStudioBookings COMPLETED in {}ms (TOTAL) =====", 
            System.currentTimeMillis() - startTime);
        
        return responses;
    }
    
    /**
     * Lấy chi tiết một studio booking
     * GET /studio-bookings/{bookingId}
     */
    @Transactional(readOnly = true)
    public StudioBookingResponse getStudioBookingById(String bookingId) {
        StudioBooking booking = studioBookingRepository.findByBookingId(bookingId)
            .orElseThrow(() -> new IllegalArgumentException("Studio booking not found: " + bookingId));
        
        // Eager load studio để tránh LazyInitializationException
        if (booking.getStudio() != null) {
            booking.getStudio().getStudioId(); // Trigger lazy load trong transaction
            booking.getStudio().getStudioName(); // Trigger lazy load trong transaction
        }
        
        StudioBookingResponse response = mapToResponse(booking);
        
        // Enrich với arrangement submission info nếu là recording milestone
        // (không cần check contract access vì đây là internal call từ studio booking)
        if (booking.getMilestoneId() != null && !booking.getMilestoneId().isEmpty()) {
            try {
                ContractMilestone milestone = contractMilestoneRepository.findById(booking.getMilestoneId())
                    .orElse(null);
                
                if (milestone != null && milestone.getMilestoneType() == MilestoneType.recording) {
                    TaskAssignmentResponse.ArrangementSubmissionInfo arrangementInfo = 
                        contractMilestoneService.enrichMilestoneWithArrangementSubmission(milestone);
                    
                    if (arrangementInfo != null) {
                        // Map sang StudioBookingResponse.ArrangementSubmissionInfo
                        StudioBookingResponse.ArrangementSubmissionInfo mappedInfo = 
                            StudioBookingResponse.ArrangementSubmissionInfo.builder()
                                .submissionId(arrangementInfo.getSubmissionId())
                                .submissionName(arrangementInfo.getSubmissionName())
                                .status(arrangementInfo.getStatus())
                                .version(arrangementInfo.getVersion())
                                .files(arrangementInfo.getFiles() != null ? arrangementInfo.getFiles().stream()
                                    .map(file -> StudioBookingResponse.FileInfo.builder()
                                        .fileId(file.getFileId())
                                        .fileName(file.getFileName())
                                        .fileUrl(file.getFileUrl())
                                        .fileSize(file.getFileSize())
                                        .mimeType(file.getMimeType())
                                        .build())
                                    .toList() : null)
                                .build();
                        response.setSourceArrangementSubmission(mappedInfo);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to enrich studio booking with arrangement submission: bookingId={}, milestoneId={}, error={}",
                    bookingId, booking.getMilestoneId(), e.getMessage());
                // Không throw error, chỉ log warning
            }
        }
        
        return response;
    }
    
    /**
     * Lấy studio booking theo requestId
     * GET /studio-bookings/by-request/{requestId}
     */
    @Transactional(readOnly = true)
    public StudioBookingResponse getStudioBookingByRequestId(String requestId) {
        log.info("Getting studio booking by requestId: {}", requestId);
        
        List<StudioBooking> bookings = studioBookingRepository.findByRequestId(requestId);
        
        if (bookings.isEmpty()) {
            throw StudioBookingNotFoundException.forRequestId(requestId);
        }
        
        // Lấy booking đầu tiên (should be only one)
        StudioBooking booking = bookings.getFirst();
        
        // Eager load studio để tránh LazyInitializationException
        if (booking.getStudio() != null) {
            booking.getStudio().getStudioId();
            booking.getStudio().getStudioName();
        }
        
        return mapToResponse(booking);
    }
    
    /**
     * Lấy danh sách studio bookings của recording artist hiện tại
     * GET /studio-bookings/my-bookings
     * 
     * Query từ BookingParticipant với performerSource = INTERNAL_ARTIST
     */
    @Transactional(readOnly = true)
    public List<StudioBookingResponse> getMyStudioBookings() {
        String specialistId = getCurrentSpecialistId();
        log.info("Getting studio bookings for recording artist: specialistId={}", specialistId);
        
        // Lấy booking IDs từ BookingParticipant với performerSource = INTERNAL_ARTIST
        List<String> bookingIds = bookingParticipantRepository.findBySpecialistId(specialistId)
            .stream()
            .filter(bp -> bp.getPerformerSource() == PerformerSource.INTERNAL_ARTIST)
            .map(bp -> bp.getBooking().getBookingId())
            .distinct()
            .toList();
        
        log.info("Found {} bookings from BookingParticipant for specialistId={}",
            bookingIds.size(), specialistId);
        
        if (bookingIds.isEmpty()) {
            return List.of();
        }
        
        // Lấy tất cả bookings (đã JOIN FETCH studio trong query)
        List<StudioBooking> bookings = studioBookingRepository.findByBookingIdIn(bookingIds);
        
        // Convert sang response (trong cùng transaction)
        return bookings.stream()
            .map(this::mapToResponse)
            .toList();
    }
    
    /**
     * Link booking với contract và milestone khi contract được signed
     * Được gọi từ ESignService khi contract được ký
     * 
     * Logic:
     * - Check contract có recording milestone (chỉ link cho recording contracts)
     * - Tìm booking theo requestId với context = PRE_CONTRACT_HOLD và chưa có contractId
     * - Link booking với contract và milestone
     * - Giữ nguyên status TENTATIVE (sẽ update khi deposit paid)
     */
    @Transactional
    public void linkBookingToContract(String requestId, String contractId) {
        log.info("Linking booking to contract: requestId={}, contractId={}", requestId, contractId);
        
        // Check contract có recording milestone (chỉ link cho recording contracts)
        List<ContractMilestone> milestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(contractId);
        ContractMilestone recordingMilestone = milestones.stream()
            .filter(m -> m.getMilestoneType() == MilestoneType.recording)
            .findFirst()
            .orElse(null);
        
        if (recordingMilestone == null) {
            log.debug("No recording milestone found in contract: contractId={}, skipping booking link", contractId);
            return;
        }
        
        // Tìm booking theo requestId với context PRE_CONTRACT_HOLD và chưa có contractId
        List<StudioBooking> bookings = studioBookingRepository.findByRequestId(requestId);
        StudioBooking booking = bookings.stream()
            .filter(b -> b.getContext() == StudioBookingContext.PRE_CONTRACT_HOLD 
                && b.getContractId() == null)
            .findFirst()
            .orElse(null);
        
        if (booking == null) {
            log.debug("No PRE_CONTRACT_HOLD booking found for requestId={}, skipping link", requestId);
            return;
        }
        
        // Link booking với contract và milestone
        booking.setContractId(contractId);
        booking.setMilestoneId(recordingMilestone.getMilestoneId());
        studioBookingRepository.save(booking);
        
        log.info("Linked booking to contract and milestone: bookingId={}, contractId={}, milestoneId={}", 
            booking.getBookingId(), contractId, recordingMilestone.getMilestoneId());
    }
    
    /**
     * Update booking status từ TENTATIVE → CONFIRMED khi deposit được paid
     * Được gọi từ ContractService.handleDepositPaid
     * 
     * Logic:
     * - Chỉ update cho luồng 3 (PRE_CONTRACT_HOLD context)
     * - Tìm booking theo contractId với status = TENTATIVE và context = PRE_CONTRACT_HOLD
     * - Update status thành CONFIRMED
     * 
     * Lưu ý: Luồng 2 (CONTRACT_RECORDING) booking đã là CONFIRMED khi tạo, không cần update
     */
    @Transactional
    public void updateBookingStatusOnDepositPaid(String contractId) {
        log.info("Updating booking status on deposit paid: contractId={}", contractId);
        
        // Tìm booking theo contractId với status TENTATIVE và context PRE_CONTRACT_HOLD (luồng 3)
        List<StudioBooking> bookings = studioBookingRepository.findByContractId(contractId);
        StudioBooking booking = bookings.stream()
            .filter(b -> b.getStatus() == BookingStatus.TENTATIVE 
                && b.getContext() == StudioBookingContext.PRE_CONTRACT_HOLD)
            .findFirst()
            .orElse(null);
        
        if (booking == null) {
            log.debug("No TENTATIVE PRE_CONTRACT_HOLD booking found for contractId={}, skipping status update", contractId);
            return;
        }
        
        // Update status
        booking.setStatus(BookingStatus.CONFIRMED);
        studioBookingRepository.save(booking);
        
        log.info("Updated booking status to CONFIRMED: bookingId={}, contractId={}", 
            booking.getBookingId(), contractId);
        
        // Lưu ý: Slots đã được mark as BOOKED khi tạo booking (TENTATIVE)
        // Không cần mark lại vì đã BOOKED rồi
    }
    
    /**
     * Helper method để publish slot booked event vào Kafka (via Outbox Pattern)
     */
    private void publishSlotBookedEvent(String specialistId, String bookingId, 
                                        LocalDate bookingDate, LocalTime startTime, LocalTime endTime) {
        try {
            // Tạo event với eventId
            UUID eventId = UUID.randomUUID();
            SlotBookedEvent event = SlotBookedEvent.builder()
                    .eventId(eventId)
                    .specialistId(specialistId)
                    .bookingId(bookingId)
                    .bookingDate(bookingDate)
                    .startTime(startTime)
                    .endTime(endTime)
                    .timestamp(LocalDateTime.now())
                    .build();
            
            JsonNode payload = objectMapper.valueToTree(event);
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(bookingId);
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }
            
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("StudioBooking")
                    .eventType("slot.booked")
                    .eventPayload(payload)
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            log.info("Queued slot booked event in outbox: eventId={}, specialistId={}, bookingId={}, date={}, time={}-{}", 
                eventId, specialistId, bookingId, bookingDate, startTime, endTime);
        } catch (Exception e) {
            log.error("Failed to enqueue slot booked event to outbox: specialistId={}, bookingId={}, error={}", 
                specialistId, bookingId, e.getMessage(), e);
            // Không throw exception để không fail transaction
        }
    }
    
    /**
     * Helper method để publish slot released event vào Kafka (via Outbox Pattern)
     * Được gọi khi contract cancel/expired
     */
    private void publishSlotReleasedEvent(String specialistId, String bookingId, 
                                          LocalDate bookingDate, LocalTime startTime, LocalTime endTime,
                                          String reason) {
        try {
            // Tạo event với eventId
            UUID eventId = UUID.randomUUID();
            SlotReleasedEvent event = SlotReleasedEvent.builder()
                    .eventId(eventId)
                    .specialistId(specialistId)
                    .bookingId(bookingId)
                    .bookingDate(bookingDate)
                    .startTime(startTime)
                    .endTime(endTime)
                    .reason(reason)
                    .timestamp(LocalDateTime.now())
                    .build();
            
            JsonNode payload = objectMapper.valueToTree(event);
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(bookingId);
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }
            
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("StudioBooking")
                    .eventType("slot.released")
                    .eventPayload(payload)
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            log.info("Queued slot released event in outbox: eventId={}, specialistId={}, bookingId={}, date={}, time={}-{}, reason={}", 
                eventId, specialistId, bookingId, bookingDate, startTime, endTime, reason);
        } catch (Exception e) {
            log.error("Failed to enqueue slot released event to outbox: specialistId={}, bookingId={}, error={}", 
                specialistId, bookingId, e.getMessage(), e);
            // Không throw exception để không fail transaction
        }
    }
    
    /**
     * Release slots và cancel booking khi contract cancel/expired
     * Được gọi từ ContractService khi contract bị cancel/expired
     * 
     * Hỗ trợ cả 2 luồng:
     * - Luồng 3 (PRE_CONTRACT_HOLD): Customer cancel/expired → cancel booking + release slots
     * - Luồng 2 (CONTRACT_RECORDING): Nếu contract bị cancel sau khi active → release slots (hiếm xảy ra)
     */
    @Transactional
    public void releaseSlotsForBooking(String contractId, String reason) {
        log.info("Releasing slots and canceling booking: contractId={}, reason={}", contractId, reason);
        
        // Tìm tất cả bookings theo contractId (cả luồng 2 và luồng 3)
        List<StudioBooking> bookings = studioBookingRepository.findByContractId(contractId);
        
        if (bookings.isEmpty()) {
            log.debug("No bookings found for contractId={}, skipping slot release", contractId);
            return;
        }
        
        // Xử lý từng booking
        for (StudioBooking booking : bookings) {
            // Chỉ xử lý bookings chưa bị cancel/completed
            if (booking.getStatus() == BookingStatus.CANCELLED || 
                booking.getStatus() == BookingStatus.COMPLETED ||
                booking.getStatus() == BookingStatus.NO_SHOW) {
                log.debug("Skipping booking with status {}: bookingId={}", 
                    booking.getStatus(), booking.getBookingId());
                continue;
            }
            
            // Update booking status thành CANCELLED (chỉ cho luồng 3 - PRE_CONTRACT_HOLD)
            // Luồng 2 (CONTRACT_RECORDING) đã CONFIRMED, chỉ release slots
            if (booking.getContext() == StudioBookingContext.PRE_CONTRACT_HOLD) {
                booking.setStatus(BookingStatus.CANCELLED);
                studioBookingRepository.save(booking);
                log.info("Updated booking status to CANCELLED: bookingId={}, contractId={}, reason={}", 
                    booking.getBookingId(), contractId, reason);
            } else {
                log.info("Releasing slots for CONTRACT_RECORDING booking (status unchanged): bookingId={}, contractId={}, reason={}", 
                    booking.getBookingId(), contractId, reason);
            }
            
            // Lấy tất cả participants là INTERNAL_ARTIST để release slots
            List<BookingParticipant> participants = bookingParticipantRepository.findByBooking_BookingId(booking.getBookingId());
            for (BookingParticipant participant : participants) {
                if (participant.getPerformerSource() == PerformerSource.INTERNAL_ARTIST 
                    && participant.getSpecialistId() != null) {
                    publishSlotReleasedEvent(
                        participant.getSpecialistId(),
                        booking.getBookingId(),
                        booking.getBookingDate(),
                        booking.getStartTime(),
                        booking.getEndTime(),
                        reason
                    );
                    log.info("Published slot released event: specialistId={}, bookingId={}, reason={}", 
                        participant.getSpecialistId(), booking.getBookingId(), reason);
                }
            }
        }
    }
    
}

