package com.mutrapro.project_service.service;

import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.client.SpecialistServiceFeignClient;
import com.mutrapro.project_service.dto.request.ArtistBookingInfo;
import com.mutrapro.project_service.dto.request.CreateStudioBookingRequest;
import com.mutrapro.project_service.dto.response.AvailableArtistResponse;
import com.mutrapro.project_service.dto.response.AvailableTimeSlotResponse;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.project_service.dto.response.StudioBookingResponse;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.project_service.entity.BookingArtist;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.Studio;
import com.mutrapro.project_service.entity.StudioBooking;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.MilestoneType;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.RecordingSessionType;
import com.mutrapro.project_service.enums.StudioBookingContext;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.exception.ContractMilestoneNotFoundException;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.InvalidContractStatusException;
import com.mutrapro.project_service.repository.BookingArtistRepository;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.StudioBookingRepository;
import com.mutrapro.project_service.repository.StudioRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

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
    BookingArtistRepository bookingArtistRepository;
    RequestServiceFeignClient requestServiceFeignClient;
    TaskAssignmentRepository taskAssignmentRepository;
    SpecialistServiceFeignClient specialistServiceFeignClient;
    TaskAssignmentService taskAssignmentService;

    /**
     * Tạo booking cho recording milestone trong arrangement_with_recording contract
     * 
     * Validation:
     * 1. Milestone phải là recording type
     * 2. Contract phải là arrangement_with_recording
     * 3. Arrangement milestone (orderIndex = 1) phải đã accepted (COMPLETED hoặc READY_FOR_PAYMENT)
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
            throw new IllegalArgumentException(
                String.format("Milestone %s is not a recording milestone", request.getMilestoneId()));
        }
        
        // 2. Validate contract
        Contract contract = contractRepository.findById(recordingMilestone.getContractId())
            .orElseThrow(() -> ContractNotFoundException.byId(recordingMilestone.getContractId()));
        
        // Check contract type = arrangement_with_recording
        if (contract.getContractType() != ContractType.arrangement_with_recording) {
            throw new IllegalArgumentException(
                String.format("Contract %s is not an arrangement_with_recording contract", contract.getContractId()));
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
            throw new IllegalStateException(
                "Arrangement milestone not found in arrangement_with_recording contract");
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
            throw new IllegalStateException(
                String.format("All arrangement milestones must be completed before creating booking for recording. " +
                    "Unaccepted arrangement milestones: %s", 
                    unacceptedArrangements.stream()
                        .map(m -> String.format("orderIndex=%d (status=%s)", m.getOrderIndex(), m.getWorkStatus()))
                        .collect(java.util.stream.Collectors.joining(", "))));
        }
        
        log.info("All arrangement milestones are completed. Proceeding with recording booking: contractId={}, recordingMilestoneId={}, arrangementCount={}",
            contract.getContractId(), recordingMilestone.getMilestoneId(), arrangementMilestones.size());
        
        // 4. Tính start date và due date thực tế cho recording milestone
        // Ưu tiên: dùng actualEndAt hoặc finalCompletedAt của arrangement milestone cuối cùng
        // (vì nếu arrangement bị revision, planned dates có thể không còn chính xác)
        ContractMilestone lastArrangementMilestone = arrangementMilestones.get(arrangementMilestones.size() - 1);
        
        LocalDateTime recordingStartDate;
        if (lastArrangementMilestone.getFinalCompletedAt() != null) {
            // Dùng finalCompletedAt (thời điểm customer chấp nhận bản cuối cùng sau mọi revision)
            recordingStartDate = lastArrangementMilestone.getFinalCompletedAt();
            log.info("Using finalCompletedAt of last arrangement milestone as recording start date: finalCompletedAt={}",
                recordingStartDate);
        } else if (lastArrangementMilestone.getActualEndAt() != null) {
            // Fallback: dùng actualEndAt
            recordingStartDate = lastArrangementMilestone.getActualEndAt();
            log.info("Using actualEndAt of last arrangement milestone as recording start date: actualEndAt={}",
                recordingStartDate);
        } else if (recordingMilestone.getPlannedStartAt() != null) {
            // Fallback: dùng plannedStartAt nếu chưa có actual dates
            recordingStartDate = recordingMilestone.getPlannedStartAt();
            log.warn("Using plannedStartAt as recording start date (no actual dates available): plannedStartAt={}",
                recordingStartDate);
        } else {
            throw new IllegalStateException(
                "Cannot determine recording milestone start date. Arrangement milestone must have completion date.");
        }
        
        // Tính due date = start date + SLA days
        Integer recordingSlaDays = recordingMilestone.getMilestoneSlaDays();
        if (recordingSlaDays == null || recordingSlaDays <= 0) {
            throw new IllegalStateException(
                "Recording milestone must have SLA days to calculate due date");
        }
        
        LocalDateTime recordingDueDate = recordingStartDate.plusDays(recordingSlaDays);
        
        LocalDate validStartDate = recordingStartDate.toLocalDate();
        LocalDate validDueDate = recordingDueDate.toLocalDate();
        
        // Validate booking date trong range thực tế
        if (request.getBookingDate().isBefore(validStartDate) || 
            request.getBookingDate().isAfter(validDueDate)) {
            throw new IllegalArgumentException(
                String.format("Booking date %s must be within recording milestone SLA range: %s to %s (calculated from arrangement completion date)",
                    request.getBookingDate(), validStartDate, validDueDate));
        }
        
        // 5. Tự động lấy studio active duy nhất (single studio system)
        List<Studio> activeStudios = studioRepository.findByIsActiveTrue();
        if (activeStudios.isEmpty()) {
            throw new IllegalStateException("No active studio found in the system");
        }
        if (activeStudios.size() > 1) {
            throw new IllegalStateException(
                String.format("Multiple active studios found (%d). System expects single studio.",
                    activeStudios.size()));
        }
        Studio studio = activeStudios.get(0);
        log.info("Auto-selected studio for booking: studioId={}, studioName={}",
            studio.getStudioId(), studio.getStudioName());
        
        // 6. Validate time range
        if (request.getStartTime().isAfter(request.getEndTime()) || 
            request.getStartTime().equals(request.getEndTime())) {
            throw new IllegalArgumentException("Start time must be before end time");
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
            throw new IllegalArgumentException(
                "Studio is already booked at the requested time slot");
        }
        
        // 7.5. Check artist availability (nếu có artists trong request)
        // Booking chỉ valid nếu studio rảnh AND tất cả artists rảnh
        if (request.getArtists() != null && !request.getArtists().isEmpty()) {
            List<String> artistIds = request.getArtists().stream()
                .map(ArtistBookingInfo::getSpecialistId)
                .toList();
            
            List<BookingArtist> conflictingArtists = bookingArtistRepository
                .findConflictingBookingsForMultipleArtists(
                    artistIds,
                    request.getBookingDate(),
                    request.getStartTime(),
                    request.getEndTime()
                );
            
            if (!conflictingArtists.isEmpty()) {
                // Group by specialistId để show message rõ ràng
                String conflictingSpecialists = conflictingArtists.stream()
                    .map(ba -> ba.getSpecialistId())
                    .distinct()
                    .collect(java.util.stream.Collectors.joining(", "));
                
                throw new IllegalArgumentException(
                    String.format("One or more artists are already booked at the requested time slot: %s", 
                        conflictingSpecialists));
            }
        }
        
        // 8. Get customer user ID từ contract
        String customerUserId = contract.getUserId();
        if (customerUserId == null || customerUserId.isBlank()) {
            throw new IllegalStateException("Contract does not have customer user ID");
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
            .artistFee(BigDecimal.ZERO)  // Artist fee được tính từ booking_artists, không set ở đây
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
        
        // 9.5. Tạo booking_artists records (nếu có artists trong request)
        if (request.getArtists() != null && !request.getArtists().isEmpty()) {
            for (ArtistBookingInfo artistInfo : request.getArtists()) {
                BookingArtist bookingArtist = BookingArtist.builder()
                    .booking(saved)
                    .specialistId(artistInfo.getSpecialistId())
                    .role(artistInfo.getRole() != null ? artistInfo.getRole() : "VOCALIST")
                    .isPrimary(artistInfo.getIsPrimary() != null ? artistInfo.getIsPrimary() : false)
                    .artistFee(artistInfo.getArtistFee() != null ? artistInfo.getArtistFee() : BigDecimal.ZERO)
                    .skillId(artistInfo.getSkillId())
                    .build();
                
                bookingArtistRepository.save(bookingArtist);
                log.info("Created booking artist: bookingId={}, specialistId={}, role={}, isPrimary={}",
                    saved.getBookingId(), artistInfo.getSpecialistId(), bookingArtist.getRole(), bookingArtist.getIsPrimary());
            }
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
     * Map StudioBooking entity sang StudioBookingResponse
     */
    private StudioBookingResponse mapToResponse(StudioBooking booking) {
        return StudioBookingResponse.builder()
            .bookingId(booking.getBookingId())
            .userId(booking.getUserId())
            .studioId(booking.getStudio().getStudioId())
            .studioName(booking.getStudio().getStudioName())
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
            .reservationFeeAmount(booking.getReservationFeeAmount())
            .reservationFeeStatus(booking.getReservationFeeStatus())
            .reservationWalletTxId(booking.getReservationWalletTxId())
            .reservationRefundWalletTxId(booking.getReservationRefundWalletTxId())
            .reservationAppliedToMilestoneId(booking.getReservationAppliedToMilestoneId())
            .refundPolicyJson(booking.getRefundPolicyJson())
            .createdAt(booking.getCreatedAt())
            .updatedAt(booking.getUpdatedAt())
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
            throw new IllegalStateException("No active studio found");
        }
        if (activeStudios.size() > 1) {
            throw new IllegalStateException("Multiple active studios found. Expected single studio system.");
        }
        Studio studio = activeStudios.get(0);
        String studioId = studio.getStudioId();
        
        // 2. Lấy tất cả bookings trong ngày đó
        List<StudioBooking> bookingsOnDate = studioBookingRepository
            .findByStudioStudioIdAndBookingDate(studioId, date);
        
        // 3. Filter bookings có status active
        List<BookingStatus> activeStatuses = List.of(
            BookingStatus.TENTATIVE, BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS);
        
        List<StudioBooking> activeBookings = bookingsOnDate.stream()
            .filter(booking -> activeStatuses.contains(booking.getStatus()))
            .toList();
        
        // 4. Tạo available slots (9:00 - 18:00, mỗi slot 2 giờ, không overlap)
        // Slots: 09:00-11:00, 11:00-13:00, 13:00-15:00, 15:00-17:00, 17:00-19:00
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
        
        // 1. Validate milestone và lấy contract
        ContractMilestone milestone = contractMilestoneRepository.findById(milestoneId)
            .orElseThrow(() -> ContractMilestoneNotFoundException.byId(milestoneId, null));
        
        Contract contract = contractRepository.findById(milestone.getContractId())
            .orElseThrow(() -> ContractNotFoundException.byId(milestone.getContractId()));
        
        // 2. Lấy preferred specialists từ parameter
        List<String> preferredIds = preferredSpecialistIds != null && !preferredSpecialistIds.isEmpty()
            ? preferredSpecialistIds
            : new java.util.ArrayList<>();
        
        // 3. Lấy TẤT CẢ vocalists từ specialist-service
        List<Map<String, Object>> allVocalists = new java.util.ArrayList<>();
        try {
            // Dùng genres từ parameter (nếu có), nếu không thì mới gọi request-service
            List<String> genresToUse = genres;
            
            ApiResponse<List<Map<String, Object>>> vocalistsResponse = 
                specialistServiceFeignClient.getVocalists(null, genresToUse); // gender = null (lấy tất cả)
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
        
        List<BookingArtist> conflictingArtists = allVocalistIds.isEmpty() 
            ? List.of()
            : bookingArtistRepository.findConflictingBookingsForMultipleArtists(
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
            
            // Check if artist is busy
            boolean isBusy = conflictingArtists.stream()
                .anyMatch(ba -> ba.getSpecialistId().equals(specialistId));
            
            BookingArtist conflict = conflictingArtists.stream()
                .filter(ba -> ba.getSpecialistId().equals(specialistId))
                .findFirst()
                .orElse(null);
            
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
            Integer experienceYears = vocalist.get("experienceYears") != null 
                ? ((Number) vocalist.get("experienceYears")).intValue() 
                : null;
            java.math.BigDecimal rating = vocalist.get("rating") != null
                ? (vocalist.get("rating") instanceof java.math.BigDecimal 
                    ? (java.math.BigDecimal) vocalist.get("rating")
                    : new java.math.BigDecimal(vocalist.get("rating").toString()))
                : null;
            Integer totalProjects = vocalist.get("totalProjects") != null
                ? ((Number) vocalist.get("totalProjects")).intValue()
                : null;
            
            // Lấy genres
            @SuppressWarnings("unchecked")
            List<String> artistGenres = vocalist.get("genres") != null
                ? (List<String>) vocalist.get("genres")
                : null;
            
            artists.add(AvailableArtistResponse.builder()
                .specialistId(specialistId)
                .name(artistName)
                .email(email)
                .avatarUrl(avatarUrl)
                .role(role)
                .genres(artistGenres)
                .experienceYears(experienceYears)
                .rating(rating)
                .totalProjects(totalProjects)
                .isPreferred(isPreferred)  // Mark preferred ones
                .isAvailable(!isBusy)
                .availabilityStatus(isBusy ? "busy" : "available")
                .conflictStartTime(conflict != null ? conflict.getBooking().getStartTime() : null)
                .conflictEndTime(conflict != null ? conflict.getBooking().getEndTime() : null)
                .build());
        }
        
        // Sort: preferred artists first, then by name
        artists.sort((a1, a2) -> {
            if (a1.getIsPreferred() && !a2.getIsPreferred()) return -1;
            if (!a1.getIsPreferred() && a2.getIsPreferred()) return 1;
            return a1.getName().compareToIgnoreCase(a2.getName());
        });
        
        log.info("Found {} available artists ({} preferred) for slot: milestoneId={}, date={}, time={}-{}", 
            artists.size(), preferredIds.size(), milestoneId, bookingDate, startTime, endTime);
        return artists;
    }
    
    /**
     * Lấy danh sách studio bookings với filter
     * GET /studio-bookings?contractId={contractId}&milestoneId={milestoneId}&status={status}
     */
    @Transactional(readOnly = true)
    public List<StudioBookingResponse> getStudioBookings(String contractId, String milestoneId, String status) {
        List<StudioBooking> bookings;
        
        if (milestoneId != null && !milestoneId.isBlank()) {
            // Filter theo milestone - cần eager load studio
            bookings = studioBookingRepository.findByMilestoneId(milestoneId)
                .map(List::of)
                .orElse(List.of());
        } else if (contractId != null && !contractId.isBlank()) {
            // Filter theo contract - cần eager load studio
            bookings = studioBookingRepository.findByContractId(contractId);
        } else {
            // Lấy tất cả - cần eager load studio
            bookings = studioBookingRepository.findAll();
        }
        
        // Eager load studio để tránh LazyInitializationException
        bookings.forEach(booking -> {
            if (booking.getStudio() != null) {
                booking.getStudio().getStudioId(); // Trigger lazy load trong transaction
                booking.getStudio().getStudioName(); // Trigger lazy load trong transaction
            }
        });
        
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
        
        // Convert sang response (trong cùng transaction)
        return bookings.stream()
            .map(this::mapToResponse)
            .toList();
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
        
        return mapToResponse(booking);
    }
    
}

