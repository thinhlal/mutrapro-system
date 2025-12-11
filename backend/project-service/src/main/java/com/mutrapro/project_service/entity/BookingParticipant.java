package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.InstrumentSource;
import com.mutrapro.project_service.enums.PerformerSource;
import com.mutrapro.project_service.enums.SessionRoleType;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

/**
 * BookingParticipant Entity - Người tham gia trong booking session (vocalist hoặc instrumentalist)
 * Bảng: booking_participants
 * 
 * Hỗ trợ 5 combo scenarios:
 * 1. Customer thuê nhạc cụ tự chơi
 * 2. Customer thuê instrumentalist
 * 3. Customer tự hát + instrumentalist chơi
 * 4. Customer tự hát + tự chơi nhạc cụ thuê
 * 5. Customer thuê cả vocal + instrumentalist
 */
@Entity
@Table(name = "booking_participants", indexes = {
    @Index(name = "idx_participants_booking_id", columnList = "booking_id"),
    @Index(name = "idx_participants_skill_id", columnList = "skill_id"),
    @Index(name = "idx_participants_specialist_id", columnList = "specialist_id"),
    @Index(name = "idx_participants_equipment_id", columnList = "equipment_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingParticipant extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "participant_id", nullable = false)
    String participantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    StudioBooking booking;

    // Helper method to get booking_id without loading StudioBooking
    public String getBookingId() {
        return booking != null ? booking.getBookingId() : null;
    }

    // Vai trò
    @Enumerated(EnumType.STRING)
    @Column(name = "role_type", nullable = false, length = 20)
    SessionRoleType roleType; // VOCAL | INSTRUMENT

    @Enumerated(EnumType.STRING)
    @Column(name = "performer_source", nullable = false, length = 20)
    PerformerSource performerSource; // CUSTOMER_SELF | INTERNAL_ARTIST

    // Nếu là INTERNAL_ARTIST
    @Column(name = "specialist_id", length = 36)
    String specialistId; // Soft reference to specialist-service.specialists.specialist_id

    // Skill (CHỈ CHO INSTRUMENT)
    @Column(name = "skill_id", length = 36)
    String skillId; // Soft reference to specialist-service.skills.skill_id
    // LƯU Ý: 
    // - VOCAL: skill_id = null (vocal không cần skill_id)
    // - INSTRUMENT: skill_id BẮT BUỘC (để biết là instrument gì và filter equipment)

    // Nếu là INSTRUMENT
    @Enumerated(EnumType.STRING)
    @Column(name = "instrument_source", length = 20)
    InstrumentSource instrumentSource; // STUDIO_SIDE | CUSTOMER_SIDE (chỉ cho INSTRUMENT)

    @Column(name = "equipment_id", length = 36)
    String equipmentId; // Soft reference to request-service.equipment.equipment_id
    // LƯU Ý: equipment_id PHẢI match với skill_id qua skill_equipment_mapping (nếu STUDIO_SIDE)

    // Phí
    @Column(name = "participant_fee", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    BigDecimal participantFee = BigDecimal.ZERO; 
    // CHỈ fee của performer (artist fee), KHÔNG bao gồm equipment rental

    // Metadata
    @Column(name = "is_primary", nullable = false)
    @Builder.Default
    Boolean isPrimary = false;

    @Column(name = "notes", columnDefinition = "TEXT")
    String notes;
}

