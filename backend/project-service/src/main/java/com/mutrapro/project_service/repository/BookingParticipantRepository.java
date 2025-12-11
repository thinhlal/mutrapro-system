package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.BookingParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingParticipantRepository extends JpaRepository<BookingParticipant, String> {
    
    /**
     * Lấy tất cả participants của một booking
     */
    List<BookingParticipant> findByBooking_BookingId(String bookingId);
    
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
}

