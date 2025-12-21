package com.mutrapro.specialist_service.enums;

/**
 * Trạng thái của work slot
 */
public enum SlotStatus {
    /**
     * Unavailable - Slot không available (default)
     * Artist chưa mở slot này
     */
    UNAVAILABLE,
    
    /**
     * Available - Slot available, có thể book
     * Artist đã mở slot này
     */
    AVAILABLE,
    
    /**
     * Hold - Slot đang được giữ (chờ confirm)
     * Slot đang được reserve cho một booking đang chờ confirm
     * KHÔNG thể book mới khi slot ở trạng thái HOLD
     */
    HOLD,
    
    /**
     * Booked - Slot đã được book
     * Không thể book nữa
     */
    BOOKED
}

