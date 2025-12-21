package com.mutrapro.specialist_service.util;

import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

/**
 * Constants cho slot grid system
 * Slot cố định theo grid 2 tiếng
 */
public class SlotGridConstants {
    
    /**
     * Độ dài mỗi slot (2 tiếng)
     */
    public static final int SLOT_DURATION_HOURS = 2;
    
    /**
     * Các thời điểm bắt đầu slot trong ngày (theo grid)
     * 08:00-10:00, 10:00-12:00, 12:00-14:00, 14:00-16:00, 16:00-18:00
     */
    public static final List<LocalTime> VALID_START_TIMES = Arrays.asList(
        LocalTime.of(8, 0),   // 08:00-10:00
        LocalTime.of(10, 0),  // 10:00-12:00
        LocalTime.of(12, 0),  // 12:00-14:00
        LocalTime.of(14, 0),  // 14:00-16:00
        LocalTime.of(16, 0)   // 16:00-18:00
    );
    
    /**
     * Check xem startTime có align với grid không
     */
    public static boolean isValidStartTime(LocalTime startTime) {
        return VALID_START_TIMES.contains(startTime);
    }
    
    /**
     * Check xem duration có phải là bội số của 2h không
     */
    public static boolean isValidDuration(LocalTime startTime, LocalTime endTime) {
        long hours = java.time.Duration.between(startTime, endTime).toHours();
        return hours > 0 && hours % SLOT_DURATION_HOURS == 0;
    }
    
    /**
     * Tính số slot cần thiết cho một duration
     */
    public static int calculateRequiredSlots(LocalTime startTime, LocalTime endTime) {
        long hours = java.time.Duration.between(startTime, endTime).toHours();
        if (hours <= 0) {
            return 0;
        }
        return (int) (hours / SLOT_DURATION_HOURS);
    }
    
    /**
     * Lấy thời điểm bắt đầu slot tiếp theo
     */
    public static LocalTime getNextSlotStartTime(LocalTime currentStartTime) {
        int currentIndex = VALID_START_TIMES.indexOf(currentStartTime);
        if (currentIndex < 0 || currentIndex >= VALID_START_TIMES.size() - 1) {
            return null; // Không có slot tiếp theo
        }
        return VALID_START_TIMES.get(currentIndex + 1);
    }
    
    /**
     * Lấy thời điểm kết thúc slot (startTime + 2h)
     */
    public static LocalTime getSlotEndTime(LocalTime startTime) {
        return startTime.plusHours(SLOT_DURATION_HOURS);
    }
}
