package com.mutrapro.specialist_service.repository;

import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.entity.SpecialistSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SpecialistSlotRepository extends JpaRepository<SpecialistSlot, String> {
    
    /**
     * Lấy tất cả slots của một specialist
     */
    List<SpecialistSlot> findBySpecialistAndSlotDateOrderByStartTimeAsc(Specialist specialist, LocalDate date);
    
    /**
     * Lấy slots trong một khoảng thời gian
     */
    @Query("SELECT s FROM SpecialistSlot s " +
           "WHERE s.specialist = :specialist " +
           "AND s.slotDate BETWEEN :startDate AND :endDate " +
           "ORDER BY s.slotDate ASC, s.startTime ASC")
    List<SpecialistSlot> findBySpecialistAndDateRange(
        @Param("specialist") Specialist specialist,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Lấy slot theo specialist, date và startTime (unique constraint)
     */
    Optional<SpecialistSlot> findBySpecialistAndSlotDateAndStartTime(
        Specialist specialist,
        LocalDate slotDate,
        LocalTime startTime
    );
    
    /**
     * Lấy slot theo ID và specialist
     */
    Optional<SpecialistSlot> findBySlotIdAndSpecialist(String slotId, Specialist specialist);
    
    /**
     * Check xem specialist có available trong các slot liên tiếp không
     * (cho grid system: check các slot liên tiếp có AVAILABLE không)
     * CHỈ AVAILABLE mới được tính là available (HOLD = đang được giữ, không thể book)
     */
    @Query("SELECT s FROM SpecialistSlot s " +
           "WHERE s.specialist = :specialist " +
           "AND s.slotStatus = 'AVAILABLE' " +
           "AND (" +
           "  (s.slotDate = :date AND s.isRecurring = false) OR " +
           "  (s.isRecurring = true AND s.dayOfWeek = :dayOfWeek)" +
           ") " +
           "AND s.startTime IN :startTimes " +
           "ORDER BY s.startTime ASC")
    List<SpecialistSlot> findAvailableSlotsForStartTimes(
        @Param("specialist") Specialist specialist,
        @Param("date") LocalDate date,
        @Param("dayOfWeek") Integer dayOfWeek,
        @Param("startTimes") List<LocalTime> startTimes
    );
    
    /**
     * Check xem specialist có booked slots trong các startTimes không
     */
    @Query("SELECT s FROM SpecialistSlot s " +
           "WHERE s.specialist = :specialist " +
           "AND s.slotStatus = 'BOOKED' " +
           "AND (" +
           "  (s.slotDate = :date AND s.isRecurring = false) OR " +
           "  (s.isRecurring = true AND s.dayOfWeek = :dayOfWeek)" +
           ") " +
           "AND s.startTime IN :startTimes")
    List<SpecialistSlot> findBookedSlotsForStartTimes(
        @Param("specialist") Specialist specialist,
        @Param("date") LocalDate date,
        @Param("dayOfWeek") Integer dayOfWeek,
        @Param("startTimes") List<LocalTime> startTimes
    );
    
    /**
     * Đếm số slots của một specialist
     */
    long countBySpecialist(Specialist specialist);
}
