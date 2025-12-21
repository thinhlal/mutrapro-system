package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Event được publish khi slot được release (từ BOOKED về AVAILABLE)
 * Dùng cho Kafka event-driven communication giữa project-service và specialist-service
 * 
 * Trường hợp sử dụng:
 * - Contract bị cancel/expired
 * - Booking bị CANCELLED/NO_SHOW
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotReleasedEvent implements Serializable {

    private UUID eventId;

    private String specialistId;
    private String bookingId;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDateTime timestamp;
    
    /**
     * Lý do release slot (optional)
     * Ví dụ: "CONTRACT_CANCELLED", "CONTRACT_EXPIRED", "BOOKING_CANCELLED", "BOOKING_NO_SHOW"
     */
    private String reason;
}

