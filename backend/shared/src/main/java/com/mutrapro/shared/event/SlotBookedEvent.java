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
 * Event được publish khi slot được book thành công
 * Dùng cho Kafka event-driven communication giữa project-service và specialist-service
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotBookedEvent implements Serializable {

    private UUID eventId;

    private String specialistId;
    private String bookingId;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDateTime timestamp;
}

