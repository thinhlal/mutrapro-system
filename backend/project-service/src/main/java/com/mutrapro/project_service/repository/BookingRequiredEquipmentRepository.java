package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.BookingRequiredEquipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRequiredEquipmentRepository extends JpaRepository<BookingRequiredEquipment, String> {
    
    /**
     * Lấy tất cả equipment của một booking
     */
    List<BookingRequiredEquipment> findByBooking_BookingId(String bookingId);
    
    /**
     * Lấy equipment theo equipment_id
     */
    List<BookingRequiredEquipment> findByEquipmentId(String equipmentId);
    
    /**
     * Lấy equipment theo participant_id
     */
    List<BookingRequiredEquipment> findByParticipantId(String participantId);
    
    /**
     * Tìm equipment theo booking_id và equipment_id
     */
    Optional<BookingRequiredEquipment> findByBooking_BookingIdAndEquipmentId(String bookingId, String equipmentId);
    
    /**
     * Kiểm tra xem booking đã có equipment này chưa
     */
    boolean existsByBooking_BookingIdAndEquipmentId(String bookingId, String equipmentId);
    
    /**
     * Xóa tất cả equipment của một booking
     */
    void deleteByBooking_BookingId(String bookingId);
    
    /**
     * Tính tổng rental fee của một booking
     */
    @Query("SELECT COALESCE(SUM(b.totalRentalFee), 0) FROM BookingRequiredEquipment b WHERE b.booking.bookingId = :bookingId")
    java.math.BigDecimal sumTotalRentalFeeByBookingId(@Param("bookingId") String bookingId);
}

