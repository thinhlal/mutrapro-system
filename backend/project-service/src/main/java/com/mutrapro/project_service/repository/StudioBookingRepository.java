package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.StudioBooking;
import com.mutrapro.project_service.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudioBookingRepository extends JpaRepository<StudioBooking, String> {
    
    List<StudioBooking> findByUserId(String userId);
    
    List<StudioBooking> findByContractId(String contractId);
    
    List<StudioBooking> findByRequestId(String requestId);
    
    List<StudioBooking> findByStudioStudioIdAndBookingDate(String studioId, LocalDate bookingDate);
    
    List<StudioBooking> findByStatus(BookingStatus status);
    
    List<StudioBooking> findByStudioStudioIdAndBookingDateAndStatusNotIn(
        String studioId, 
        LocalDate bookingDate, 
        List<BookingStatus> excludedStatuses
    );
    
    Optional<StudioBooking> findByBookingId(String bookingId);
}
