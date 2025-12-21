package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.request.BulkUpdateSlotsRequest;
import com.mutrapro.specialist_service.dto.request.BulkUpdateSlotsForDateRangeRequest;
import com.mutrapro.specialist_service.dto.request.CreateSlotRequest;
import com.mutrapro.specialist_service.dto.request.UpdateSlotStatusRequest;
import com.mutrapro.specialist_service.dto.response.DaySlotsResponse;
import com.mutrapro.specialist_service.dto.response.SlotResponse;
import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.entity.SpecialistSlot;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.enums.SlotStatus;
import com.mutrapro.specialist_service.exception.AccessDeniedException;
import com.mutrapro.specialist_service.exception.InvalidSlotException;
import com.mutrapro.specialist_service.exception.SpecialistNotFoundException;
import com.mutrapro.specialist_service.mapper.SpecialistSlotMapper;
import com.mutrapro.specialist_service.repository.SpecialistRepository;
import com.mutrapro.specialist_service.repository.SpecialistSlotRepository;
import com.mutrapro.specialist_service.util.SecurityUtils;
import com.mutrapro.specialist_service.util.SlotGridConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service cho Specialist quản lý work slots
 * Chỉ Recording Artist mới được phép sử dụng
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SpecialistSlotService {
    
    private final SpecialistRepository specialistRepository;
    private final SpecialistSlotRepository slotRepository;
    private final SpecialistSlotMapper slotMapper;
    
    /**
     * Lấy slots của một ngày (cho giao diện calendar)
     * Trả về tất cả 5 slots (08:00, 10:00, 12:00, 14:00, 16:00)
     * Nếu slot chưa tồn tại, trả về với status UNAVAILABLE
     */
    public DaySlotsResponse getDaySlots(LocalDate date) {
        String currentUserId = getCurrentUserId();
        log.info("Getting day slots for specialist with user ID: {}, date: {}", currentUserId, date);
        
        Specialist specialist = getCurrentSpecialist();
        
        // Lấy slots đã tồn tại trong DB
        List<SpecialistSlot> existingSlots = slotRepository.findBySpecialistAndSlotDateOrderByStartTimeAsc(
            specialist, date);
        
        return slotMapper.toDaySlotsResponse(date, existingSlots);
    }
    
    /**
     * Lấy slots trong một khoảng thời gian (cho calendar view)
     */
    public List<DaySlotsResponse> getSlotsByDateRange(LocalDate startDate, LocalDate endDate) {
        String currentUserId = getCurrentUserId();
        log.info("Getting slots for specialist with user ID: {}, date range: {} to {}", 
            currentUserId, startDate, endDate);
        
        Specialist specialist = getCurrentSpecialist();
        
        // Lấy slots trong khoảng thời gian
        List<SpecialistSlot> slots = slotRepository.findBySpecialistAndDateRange(
            specialist, startDate, endDate);
        
        // Group by date
        return startDate.datesUntil(endDate.plusDays(1))
            .map(date -> {
                List<SpecialistSlot> daySlots = slots.stream()
                    .filter(s -> s.getSlotDate().equals(date))
                    .collect(Collectors.toList());
                return slotMapper.toDaySlotsResponse(date, daySlots);
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Tạo hoặc update slot
     * Nếu slot đã tồn tại → update status
     * Nếu chưa tồn tại → tạo mới
     */
    @Transactional
    public SlotResponse createOrUpdateSlot(CreateSlotRequest request) {
        String currentUserId = getCurrentUserId();
        log.info("Creating or updating slot for specialist with user ID: {}, date: {}, startTime: {}", 
            currentUserId, request.getSlotDate(), request.getStartTime());
        
        Specialist specialist = getCurrentSpecialist();
        
        // Validate startTime phải align với grid
        if (!SlotGridConstants.isValidStartTime(request.getStartTime())) {
            throw InvalidSlotException.invalidStartTime(request.getStartTime().toString());
        }
        
        // Tìm slot đã tồn tại
        SpecialistSlot existingSlot = slotRepository.findBySpecialistAndSlotDateAndStartTime(
            specialist, request.getSlotDate(), request.getStartTime())
            .orElse(null);
        
        if (existingSlot != null) {
            // Không cho phép đóng slot nếu đã BOOKED
            if (existingSlot.getSlotStatus() == SlotStatus.BOOKED && request.getSlotStatus() != SlotStatus.BOOKED) {
                throw InvalidSlotException.cannotUpdateBookedSlot(existingSlot.getSlotId());
            }
            
            // Nếu đóng slot (UNAVAILABLE) → xóa record khỏi DB
            if (request.getSlotStatus() == SlotStatus.UNAVAILABLE) {
                slotRepository.delete(existingSlot);
                log.info("Deleted slot (closed): slotId={}", existingSlot.getSlotId());
                // Trả về slot với status UNAVAILABLE (không có trong DB nữa)
                return SlotResponse.builder()
                    .slotId(null)
                    .slotDate(request.getSlotDate())
                    .startTime(request.getStartTime())
                    .endTime(SlotGridConstants.getSlotEndTime(request.getStartTime()))
                    .slotStatus(SlotStatus.UNAVAILABLE)
                    .isRecurring(false)
                    .dayOfWeek(null)
                    .build();
            }
            
            // Update existing slot (AVAILABLE, HOLD, BOOKED)
            existingSlot.setSlotStatus(request.getSlotStatus());
            existingSlot.setIsRecurring(request.getIsRecurring());
            if (Boolean.TRUE.equals(request.getIsRecurring()) && request.getSlotDate() != null) {
                DayOfWeek dayOfWeek = request.getSlotDate().getDayOfWeek();
                existingSlot.setDayOfWeek(dayOfWeek.getValue());
            }
            SpecialistSlot saved = slotRepository.save(existingSlot);
            log.info("Updated slot: slotId={}", saved.getSlotId());
            return slotMapper.toSlotResponse(saved);
        } else {
            // Tạo slot mới
            SpecialistSlot slot = slotMapper.toSpecialistSlot(request);
            slot.setSpecialist(specialist);
            SpecialistSlot saved = slotRepository.save(slot);
            log.info("Created slot: slotId={}", saved.getSlotId());
            return slotMapper.toSlotResponse(saved);
        }
    }
    
    /**
     * Update status của một slot
     * Không cho phép đóng slot nếu đã BOOKED
     */
    @Transactional
    public SlotResponse updateSlotStatus(String slotId, UpdateSlotStatusRequest request) {
        String currentUserId = getCurrentUserId();
        log.info("Updating slot status {} for specialist with user ID: {}", slotId, currentUserId);
        
        Specialist specialist = getCurrentSpecialist();
        
        SpecialistSlot slot = slotRepository.findBySlotIdAndSpecialist(slotId, specialist)
            .orElseThrow(() -> InvalidSlotException.slotNotFound(slotId));
        
        // Không cho phép đóng slot nếu đã BOOKED
        if (slot.getSlotStatus() == SlotStatus.BOOKED && request.getSlotStatus() != SlotStatus.BOOKED) {
            throw InvalidSlotException.cannotUpdateBookedSlot(slotId);
        }
        
        // Nếu đóng slot (UNAVAILABLE) → xóa record khỏi DB
        if (request.getSlotStatus() == SlotStatus.UNAVAILABLE) {
            slotRepository.delete(slot);
            log.info("Deleted slot (closed): slotId={}", slotId);
            // Trả về slot với status UNAVAILABLE (không có trong DB nữa)
            return SlotResponse.builder()
                .slotId(null)
                .slotDate(slot.getSlotDate())
                .startTime(slot.getStartTime())
                .endTime(SlotGridConstants.getSlotEndTime(slot.getStartTime()))
                .slotStatus(SlotStatus.UNAVAILABLE)
                .isRecurring(slot.getIsRecurring())
                .dayOfWeek(slot.getDayOfWeek())
                .build();
        }
        
        // Update existing slot (AVAILABLE, HOLD, BOOKED)
        slot.setSlotStatus(request.getSlotStatus());
        SpecialistSlot saved = slotRepository.save(slot);
        
        log.info("Updated slot status: slotId={}, newStatus={}", saved.getSlotId(), saved.getSlotStatus());
        return slotMapper.toSlotResponse(saved);
    }
    
    /**
     * Bulk update nhiều slots cùng lúc (cho giao diện calendar)
     * Tạo hoặc update tất cả slots được chọn
     */
    @Transactional
    public List<SlotResponse> bulkUpdateSlots(BulkUpdateSlotsRequest request) {
        String currentUserId = getCurrentUserId();
        log.info("Bulk updating slots for specialist with user ID: {}, date: {}, startTimes: {}, status: {}", 
            currentUserId, request.getSlotDate(), request.getStartTimes(), request.getSlotStatus());
        
        Specialist specialist = getCurrentSpecialist();
        
        // Validate tất cả startTimes phải align với grid
        for (LocalTime startTime : request.getStartTimes()) {
            if (!SlotGridConstants.isValidStartTime(startTime)) {
                throw InvalidSlotException.invalidStartTime(startTime.toString());
            }
        }
        
        List<SlotResponse> results = new ArrayList<>();
        DayOfWeek dayOfWeek = request.getSlotDate().getDayOfWeek();
        Integer dayOfWeekValue = request.getIsRecurring() ? dayOfWeek.getValue() : null;
        
        for (LocalTime startTime : request.getStartTimes()) {
            // Tìm slot đã tồn tại
            SpecialistSlot existingSlot = slotRepository.findBySpecialistAndSlotDateAndStartTime(
                specialist, request.getSlotDate(), startTime)
                .orElse(null);
            
            if (existingSlot != null) {
                // Không cho phép đóng slot nếu đã BOOKED
                if (existingSlot.getSlotStatus() == SlotStatus.BOOKED && request.getSlotStatus() != SlotStatus.BOOKED) {
                    log.warn("Cannot update slot with status BOOKED: slotId={}, date={}, startTime={}", 
                        existingSlot.getSlotId(), request.getSlotDate(), startTime);
                    continue; // Skip slot này, không update
                }
                
                // Nếu đóng slot (UNAVAILABLE) → xóa record khỏi DB
                if (request.getSlotStatus() == SlotStatus.UNAVAILABLE) {
                    slotRepository.delete(existingSlot);
                    log.info("Deleted slot (closed): slotId={}, date={}, startTime={}", 
                        existingSlot.getSlotId(), request.getSlotDate(), startTime);
                    // Trả về slot với status UNAVAILABLE (không có trong DB nữa)
                    results.add(SlotResponse.builder()
                        .slotId(null)
                        .slotDate(request.getSlotDate())
                        .startTime(startTime)
                        .endTime(SlotGridConstants.getSlotEndTime(startTime))
                        .slotStatus(SlotStatus.UNAVAILABLE)
                        .isRecurring(false)
                        .dayOfWeek(null)
                        .build());
                    continue;
                }
                
                // Update existing slot (AVAILABLE, HOLD, BOOKED)
                existingSlot.setSlotStatus(request.getSlotStatus());
                existingSlot.setIsRecurring(request.getIsRecurring());
                existingSlot.setDayOfWeek(dayOfWeekValue);
                SpecialistSlot saved = slotRepository.save(existingSlot);
                results.add(slotMapper.toSlotResponse(saved));
            } else {
                // Tạo slot mới
                SpecialistSlot slot = SpecialistSlot.builder()
                    .specialist(specialist)
                    .slotDate(request.getSlotDate())
                    .startTime(startTime)
                    .isRecurring(request.getIsRecurring())
                    .dayOfWeek(dayOfWeekValue)
                    .slotStatus(request.getSlotStatus())
                    .build();
                SpecialistSlot saved = slotRepository.save(slot);
                results.add(slotMapper.toSlotResponse(saved));
            }
        }
        
        log.info("Bulk updated {} slots", results.size());
        return results;
    }
    
    /**
     * Bulk update slots cho nhiều ngày cùng lúc (tối ưu cho "Mở slots cho 7 ngày")
     * Sử dụng batch save để tăng hiệu suất
     */
    @Transactional
    public List<SlotResponse> bulkUpdateSlotsForDateRange(BulkUpdateSlotsForDateRangeRequest request) {
        String currentUserId = getCurrentUserId();
        log.info("Bulk updating slots for date range: {} to {}, startTimes: {}, status: {} for specialist with user ID: {}", 
            request.getStartDate(), request.getEndDate(), request.getStartTimes(), request.getSlotStatus(), currentUserId);
        
        Specialist specialist = getCurrentSpecialist();
        
        // Validate date range
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw InvalidSlotException.invalidDateRange(
                request.getStartDate().toString(), 
                request.getEndDate().toString());
        }
        
        // Validate tất cả startTimes phải align với grid
        for (LocalTime startTime : request.getStartTimes()) {
            if (!SlotGridConstants.isValidStartTime(startTime)) {
                throw InvalidSlotException.invalidStartTime(startTime.toString());
            }
        }
        
        // Lấy tất cả existing slots trong date range
        List<SpecialistSlot> existingSlots = slotRepository.findBySpecialistAndDateRange(
            specialist, request.getStartDate(), request.getEndDate());
        
        // Tạo map để track existing slots: key = "date_startTime"
        java.util.Map<String, SpecialistSlot> existingSlotsMap = existingSlots.stream()
            .collect(Collectors.toMap(
                slot -> slot.getSlotDate().toString() + "_" + slot.getStartTime().toString(),
                slot -> slot,
                (existing, replacement) -> existing // Nếu duplicate, giữ existing
            ));
        
        List<SpecialistSlot> slotsToSave = new ArrayList<>();
        List<SpecialistSlot> slotsToDelete = new ArrayList<>();
        LocalDate currentDate = request.getStartDate();
        
        // Loop qua tất cả các ngày trong range
        while (!currentDate.isAfter(request.getEndDate())) {
            DayOfWeek dayOfWeek = currentDate.getDayOfWeek();
            Integer dayOfWeekValue = request.getIsRecurring() ? dayOfWeek.getValue() : null;
            
            // Loop qua tất cả startTimes
            for (LocalTime startTime : request.getStartTimes()) {
                String key = currentDate.toString() + "_" + startTime.toString();
                SpecialistSlot existingSlot = existingSlotsMap.get(key);
                
                if (existingSlot != null) {
                    // Không cho phép đóng slot nếu đã BOOKED
                    if (existingSlot.getSlotStatus() == SlotStatus.BOOKED && request.getSlotStatus() != SlotStatus.BOOKED) {
                        log.warn("Cannot update slot with status BOOKED: slotId={}, date={}, startTime={}", 
                            existingSlot.getSlotId(), currentDate, startTime);
                        continue; // Skip slot này, không update
                    }
                    
                    // Nếu đóng slot (UNAVAILABLE) → xóa record khỏi DB
                    if (request.getSlotStatus() == SlotStatus.UNAVAILABLE) {
                        slotsToDelete.add(existingSlot);
                        log.info("Will delete slot (closed): slotId={}, date={}, startTime={}", 
                            existingSlot.getSlotId(), currentDate, startTime);
                        continue; // Không thêm vào slotsToSave
                    }
                    
                    // Update existing slot (AVAILABLE, HOLD, BOOKED)
                    existingSlot.setSlotStatus(request.getSlotStatus());
                    existingSlot.setIsRecurring(request.getIsRecurring());
                    existingSlot.setDayOfWeek(dayOfWeekValue);
                    slotsToSave.add(existingSlot);
                } else {
                    // Chỉ tạo slot mới nếu không phải UNAVAILABLE (UNAVAILABLE = không có slot)
                    if (request.getSlotStatus() != SlotStatus.UNAVAILABLE) {
                        SpecialistSlot slot = SpecialistSlot.builder()
                            .specialist(specialist)
                            .slotDate(currentDate)
                            .startTime(startTime)
                            .isRecurring(request.getIsRecurring())
                            .dayOfWeek(dayOfWeekValue)
                            .slotStatus(request.getSlotStatus())
                            .build();
                        slotsToSave.add(slot);
                    }
                }
            }
            
            currentDate = currentDate.plusDays(1);
        }
        
        // Xóa slots UNAVAILABLE trước (batch delete)
        if (!slotsToDelete.isEmpty()) {
            slotRepository.deleteAll(slotsToDelete);
            log.info("Deleted {} slots (closed) for date range {} to {}", 
                slotsToDelete.size(), request.getStartDate(), request.getEndDate());
        }
        
        // Batch save tất cả slots còn lại (nhanh hơn nhiều so với save từng cái)
        List<SpecialistSlot> savedSlots = slotsToSave.isEmpty() 
            ? List.of() 
            : slotRepository.saveAll(slotsToSave);
        
        log.info("Bulk updated {} slots for date range {} to {}", 
            savedSlots.size(), request.getStartDate(), request.getEndDate());
        
        return savedSlots.stream()
            .map(slotMapper::toSlotResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Xóa slot (chỉ xóa nếu status = UNAVAILABLE)
     */
    @Transactional
    public void deleteSlot(String slotId) {
        String currentUserId = getCurrentUserId();
        log.info("Deleting slot {} for specialist with user ID: {}", slotId, currentUserId);
        
        Specialist specialist = getCurrentSpecialist();
        
        SpecialistSlot slot = slotRepository.findBySlotIdAndSpecialist(slotId, specialist)
            .orElseThrow(() -> InvalidSlotException.slotNotFound(slotId));
        
        // Chỉ cho phép xóa nếu status = UNAVAILABLE
        if (slot.getSlotStatus() != SlotStatus.UNAVAILABLE) {
            throw InvalidSlotException.cannotUpdateBookedSlot(slotId);
        }
        
        slotRepository.delete(slot);
        log.info("Deleted slot: slotId={}", slotId);
    }
    
    /**
     * Check xem specialist có available trong các slot liên tiếp không
     * (Internal method - có thể được gọi từ project-service)
     */
    public boolean isSpecialistAvailable(String specialistId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        Specialist specialist = specialistRepository.findById(specialistId)
            .orElse(null);
        
        if (specialist == null) {
            return false;
        }
        
        // Validate duration phải là bội số của 2h
        if (!SlotGridConstants.isValidDuration(startTime, endTime)) {
            log.warn("Invalid duration: {} to {} is not a multiple of 2 hours", startTime, endTime);
            return false;
        }
        
        // Validate startTime phải align với grid
        if (!SlotGridConstants.isValidStartTime(startTime)) {
            log.warn("Invalid start time: {} is not aligned with grid", startTime);
            return false;
        }
        
        // Tính dayOfWeek từ date
        int dayOfWeek = date.getDayOfWeek().getValue();
        
        // Tính các startTimes cần check (các slot liên tiếp)
        List<LocalTime> requiredStartTimes = new ArrayList<>();
        LocalTime currentStartTime = startTime;
        while (currentStartTime != null && currentStartTime.isBefore(endTime)) {
            requiredStartTimes.add(currentStartTime);
            currentStartTime = SlotGridConstants.getNextSlotStartTime(currentStartTime);
            if (currentStartTime == null || currentStartTime.isAfter(endTime) || currentStartTime.equals(endTime)) {
                break;
            }
        }
        
        if (requiredStartTimes.isEmpty()) {
            return false;
        }
        
        // Check booked slots trước
        List<SpecialistSlot> bookedSlots = slotRepository.findBookedSlotsForStartTimes(
            specialist, date, dayOfWeek, requiredStartTimes);
        
        if (!bookedSlots.isEmpty()) {
            log.info("Specialist {} has booked slots for date={}, returning false", specialistId, date);
            return false;
        }
        
        // Check available slots (phải có TẤT CẢ slots liên tiếp)
        // CHỈ AVAILABLE mới được tính (HOLD = đang được giữ, không thể book)
        List<SpecialistSlot> availableSlots = slotRepository.findAvailableSlotsForStartTimes(
            specialist, date, dayOfWeek, requiredStartTimes);
        
        // Phải có đủ số lượng slots với status AVAILABLE
        boolean isAvailable = availableSlots.size() == requiredStartTimes.size();
        log.info("Specialist {} availability for date={}, time={}-{}: {} (required {} slots, found {})",
            specialistId, date, startTime, endTime, isAvailable, requiredStartTimes.size(), availableSlots.size());
        return isAvailable;
    }
    
    /**
     * Mark slots as BOOKED sau khi booking thành công
     * (Public method - có thể được gọi từ project-service)
     */
    @Transactional
    public void markSlotsAsBooked(String specialistId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        log.info("Marking slots as BOOKED for specialistId={}, date={}, time={}-{}", 
            specialistId, date, startTime, endTime);
        
        Specialist specialist = specialistRepository.findById(specialistId)
            .orElse(null);
        
        if (specialist == null) {
            log.warn("Specialist not found: {}", specialistId);
            return;
        }
        
        // Validate duration và startTime
        if (!SlotGridConstants.isValidDuration(startTime, endTime)) {
            log.warn("Invalid duration: {} to {} is not a multiple of 2 hours", startTime, endTime);
            return;
        }
        
        if (!SlotGridConstants.isValidStartTime(startTime)) {
            log.warn("Invalid start time: {} is not aligned with grid", startTime);
            return;
        }
        
        // Tính các startTimes cần mark as BOOKED
        List<LocalTime> requiredStartTimes = new ArrayList<>();
        LocalTime currentStartTime = startTime;
        while (currentStartTime != null && currentStartTime.isBefore(endTime)) {
            requiredStartTimes.add(currentStartTime);
            currentStartTime = SlotGridConstants.getNextSlotStartTime(currentStartTime);
            if (currentStartTime == null || currentStartTime.isAfter(endTime) || currentStartTime.equals(endTime)) {
                break;
            }
        }
        
        if (requiredStartTimes.isEmpty()) {
            log.warn("No slots to mark as BOOKED for specialistId={}, date={}, time={}-{}", 
                specialistId, date, startTime, endTime);
            return;
        }
        
        // Lấy các slots cần update
        List<SpecialistSlot> slotsToUpdate = new ArrayList<>();
        for (LocalTime slotStartTime : requiredStartTimes) {
            slotRepository.findBySpecialistAndSlotDateAndStartTime(specialist, date, slotStartTime)
                .ifPresent(slot -> {
                    // Chỉ update nếu slot đang AVAILABLE hoặc HOLD
                    if (slot.getSlotStatus() == SlotStatus.AVAILABLE || slot.getSlotStatus() == SlotStatus.HOLD) {
                        slot.setSlotStatus(SlotStatus.BOOKED);
                        slotsToUpdate.add(slot);
                    } else if (slot.getSlotStatus() == SlotStatus.BOOKED) {
                        log.debug("Slot already BOOKED: specialistId={}, date={}, startTime={}", 
                            specialistId, date, slotStartTime);
                    } else {
                        log.warn("Cannot mark slot as BOOKED (status={}): specialistId={}, date={}, startTime={}", 
                            slot.getSlotStatus(), specialistId, date, slotStartTime);
                    }
                });
        }
        
        // Batch update
        if (!slotsToUpdate.isEmpty()) {
            slotRepository.saveAll(slotsToUpdate);
            log.info("Marked {} slots as BOOKED for specialistId={}, date={}, time={}-{}", 
                slotsToUpdate.size(), specialistId, date, startTime, endTime);
        } else {
            log.warn("No slots found to mark as BOOKED for specialistId={}, date={}, time={}-{}", 
                specialistId, date, startTime, endTime);
        }
    }
    
    /**
     * Get current specialist
     */
    private Specialist getCurrentSpecialist() {
        String currentUserId = getCurrentUserId();
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        // Chỉ Recording Artist mới được phép quản lý slots
        if (specialist.getSpecialization() != SpecialistType.RECORDING_ARTIST) {
            throw AccessDeniedException.cannotAccessSlots();
        }
        
        return specialist;
    }
    
    /**
     * Get current user ID from JWT token
     */
    private String getCurrentUserId() {
        return SecurityUtils.getCurrentUserId();
    }
}
