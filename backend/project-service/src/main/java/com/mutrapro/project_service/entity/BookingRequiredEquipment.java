package com.mutrapro.project_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

/**
 * BookingRequiredEquipment Entity - Equipment cần thiết cho booking
 * Bảng: booking_required_equipment
 * 
 * LƯU Ý: CHỈ lưu equipment có instrument_source = STUDIO_SIDE (cần tính phí thuê)
 * Equipment nằm ở project-service (cùng database), dùng reference (equipment_id là String UUID)
 */
@Entity
@Table(name = "booking_required_equipment", indexes = {
    @Index(name = "idx_required_equipment_booking_id", columnList = "booking_id"),
    @Index(name = "idx_required_equipment_equipment_id", columnList = "equipment_id"),
    @Index(name = "idx_required_equipment_participant_id", columnList = "participant_id"),
    @Index(name = "uk_required_equipment_booking_equipment", columnList = "booking_id,equipment_id", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingRequiredEquipment extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "booking_equipment_id", nullable = false)
    String bookingEquipmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    StudioBooking booking;

    // Helper method to get booking_id without loading StudioBooking
    public String getBookingId() {
        return booking != null ? booking.getBookingId() : null;
    }

    @Column(name = "equipment_id", nullable = false, length = 36)
    String equipmentId; // Reference to project-service.equipment.equipment_id

    @Column(name = "quantity", nullable = false)
    @Builder.Default
    Integer quantity = 1;

    @Column(name = "rental_fee_per_unit", nullable = false, precision = 12, scale = 2)
    BigDecimal rentalFeePerUnit; // Phí thuê mỗi đơn vị

    @Column(name = "total_rental_fee", nullable = false, precision = 12, scale = 2)
    BigDecimal totalRentalFee; // Tổng phí thuê = quantity * rental_fee_per_unit

    @Column(name = "participant_id", length = 36)
    String participantId; // Optional: Ref to booking_participants (nếu equipment gắn với participant cụ thể)
}

