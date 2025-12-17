package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.BookingParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface BookingParticipantRepository extends JpaRepository<BookingParticipant, String> {
    
    /**
     * Lấy tất cả participants của một booking
     */
    List<BookingParticipant> findByBooking_BookingId(String bookingId);
    
    /**
     * Batch fetch participants cho nhiều bookings (tối ưu performance)
     */
    @Query("SELECT bp FROM BookingParticipant bp WHERE bp.booking.bookingId IN :bookingIds")
    List<BookingParticipant> findByBooking_BookingIdIn(@Param("bookingIds") List<String> bookingIds);
    
    /**
     * Lấy participants theo role type
     */
    List<BookingParticipant> findByBooking_BookingIdAndRoleType(String bookingId, String roleType);
    
    /**
     * Lấy participants theo performer source
     */
    List<BookingParticipant> findByBooking_BookingIdAndPerformerSource(String bookingId, String performerSource);
    
    /**
     * Lấy participants theo skill_id (cho INSTRUMENT)
     */
    List<BookingParticipant> findBySkillId(String skillId);
    
    /**
     * Lấy participants theo specialist_id (cho INTERNAL_ARTIST)
     */
    List<BookingParticipant> findBySpecialistId(String specialistId);
    
    /**
     * Xóa tất cả participants của một booking
     */
    void deleteByBooking_BookingId(String bookingId);
    
    /**
     * Đếm số participants của một booking
     */
    long countByBooking_BookingId(String bookingId);
    
    /**
     * Tìm các participants có conflict về thời gian với một slot cụ thể
     * (cho một specialist cụ thể)
     */
    @Query("""
        SELECT bp FROM BookingParticipant bp
        JOIN bp.booking sb
        WHERE bp.specialistId = :specialistId
          AND sb.bookingDate = :bookingDate
          AND sb.status IN ('TENTATIVE', 'PENDING', 'CONFIRMED', 'IN_PROGRESS')
          AND (
            (sb.startTime < :endTime AND sb.endTime > :startTime)
          )
        """)
    List<BookingParticipant> findConflictingBookings(
        @Param("specialistId") String specialistId,
        @Param("bookingDate") LocalDate bookingDate,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime
    );
    
    /**
     * Tìm các participants có conflict về thời gian với một slot cụ thể
     * (cho nhiều specialists)
     */
    @Query("""
        SELECT bp FROM BookingParticipant bp
        JOIN bp.booking sb
        WHERE bp.specialistId IN :specialistIds
          AND sb.bookingDate = :bookingDate
          AND sb.status IN ('TENTATIVE', 'PENDING', 'CONFIRMED', 'IN_PROGRESS')
          AND (
            (sb.startTime < :endTime AND sb.endTime > :startTime)
          )
        """)
    List<BookingParticipant> findConflictingBookingsForMultipleSpecialists(
        @Param("specialistIds") List<String> specialistIds,
        @Param("bookingDate") LocalDate bookingDate,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime
    );
}

