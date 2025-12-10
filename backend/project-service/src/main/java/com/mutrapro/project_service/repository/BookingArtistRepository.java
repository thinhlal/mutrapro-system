package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.BookingArtist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface BookingArtistRepository extends JpaRepository<BookingArtist, String> {

    List<BookingArtist> findByBookingBookingId(String bookingId);

    @Query("""
        SELECT ba FROM BookingArtist ba
        JOIN ba.booking sb
        WHERE ba.specialistId = :specialistId
          AND sb.bookingDate = :bookingDate
          AND sb.status IN ('TENTATIVE', 'PENDING', 'CONFIRMED', 'IN_PROGRESS')
          AND (
            (sb.startTime < :endTime AND sb.endTime > :startTime)
          )
        """)
    List<BookingArtist> findConflictingBookings(
        @Param("specialistId") String specialistId,
        @Param("bookingDate") LocalDate bookingDate,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime
    );

    @Query("""
        SELECT ba FROM BookingArtist ba
        JOIN ba.booking sb
        WHERE ba.specialistId IN :specialistIds
          AND sb.bookingDate = :bookingDate
          AND sb.status IN ('TENTATIVE', 'PENDING', 'CONFIRMED', 'IN_PROGRESS')
          AND (
            (sb.startTime < :endTime AND sb.endTime > :startTime)
          )
        """)
    List<BookingArtist> findConflictingBookingsForMultipleArtists(
        @Param("specialistIds") List<String> specialistIds,
        @Param("bookingDate") LocalDate bookingDate,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime
    );

    /**
     * Tìm tất cả bookings mà một recording artist được book vào
     */
    List<BookingArtist> findBySpecialistId(String specialistId);
}

