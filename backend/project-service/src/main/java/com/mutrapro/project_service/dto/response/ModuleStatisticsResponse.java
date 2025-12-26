package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModuleStatisticsResponse {
    private EquipmentStatistics equipment;
    private StudioBookingStatistics studioBookings;
    private RevisionStatistics revisions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EquipmentStatistics {
        private Long available;   // Số equipment available (availableQuantity > 0 && isActive)
        private Long booked;      // Số equipment đang được booking (active bookings)
        private Long maintenance; // Số equipment không available (availableQuantity = 0 hoặc !isActive)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudioBookingStatistics {
        private Long total;     // Tổng số bookings
        private Long upcoming; // Số bookings upcoming (bookingDate >= today và status active)
        private Long completed; // Số bookings completed (status = COMPLETED)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevisionStatistics {
        private Long pending;   // Số revision requests pending
        private Long approved;  // Số revision requests approved
        private Long rejected;  // Số revision requests rejected
    }
}

