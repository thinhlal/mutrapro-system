package com.mutrapro.project_service.enums;

/**
 * Context của studio booking - để phân biệt booking thuộc luồng nào
 */
public enum StudioBookingContext {
    /**
     * Booking cho recording milestone trong contract (arrangement_with_recording)
     * - Booking chỉ để schedule, không tính total_cost
     * - Contract price đã được tính từ pricing matrix
     */
    CONTRACT_RECORDING,
    
    /**
     * Booking độc lập (recording only)
     * - Booking có total_cost để tính contract price
     * - Contract base_price = 0, total_price = booking.total_cost
     */
    STANDALONE_BOOKING,
    
    /**
     * Booking giữ chỗ trước khi có contract
     * - Status = TENTATIVE
     * - Có reservation fee
     * - Chờ customer ký hợp đồng mới chuyển sang CONFIRMED
     */
    PRE_CONTRACT_HOLD
}

