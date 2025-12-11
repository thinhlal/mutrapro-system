package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.RecordingSessionType;
import com.mutrapro.project_service.enums.StudioBookingContext;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "studio_bookings", indexes = {
    @Index(name = "idx_studio_bookings_user_id", columnList = "user_id"),
    @Index(name = "idx_studio_bookings_studio_id", columnList = "studio_id"),
    @Index(name = "idx_studio_bookings_request_id", columnList = "request_id"),
    @Index(name = "idx_studio_bookings_contract_id", columnList = "contract_id"),
    @Index(name = "idx_studio_bookings_milestone_id", columnList = "milestone_id"),
    @Index(name = "idx_studio_bookings_context", columnList = "context"),
    @Index(name = "idx_studio_bookings_session_type", columnList = "session_type"),
    @Index(name = "idx_studio_bookings_booking_date", columnList = "booking_date"),
    @Index(name = "idx_studio_bookings_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StudioBooking extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "booking_id", nullable = false)
    String bookingId;

    // Soft references to other services
    @Column(name = "user_id", nullable = false)
    String userId;  // Soft reference to identity-service

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "studio_id", nullable = false)
    Studio studio;

    @Column(name = "request_id")
    String requestId;  // Soft reference to request-service

    @Column(name = "contract_id")
    String contractId;  // Soft reference to contracts table (same service)

    @Column(name = "milestone_id")
    String milestoneId;  // Reference to contract_milestones (cho CONTRACT_RECORDING context)

    // Booking context - để phân biệt booking thuộc luồng nào
    @Enumerated(EnumType.STRING)
    @Column(name = "context", nullable = false, length = 30)
    StudioBookingContext context;  // CONTRACT_RECORDING / STANDALONE_BOOKING / PRE_CONTRACT_HOLD

    // Recording session type
    @Enumerated(EnumType.STRING)
    @Column(name = "session_type", nullable = false, length = 30)
    RecordingSessionType sessionType;

    // Booking details
    @Column(name = "booking_date", nullable = false)
    LocalDate bookingDate;

    @Column(name = "start_time", nullable = false)
    LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    LocalTime endTime;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    BookingStatus status = BookingStatus.TENTATIVE;

    @Column(name = "hold_expires_at")
    LocalDateTime holdExpiresAt;

    // Billing config & derivation
    @Builder.Default
    @Column(name = "external_guest_count", nullable = false)
    Integer externalGuestCount = 0;

    // Session inputs (for scheduling & trace)
    @Column(name = "duration_hours", nullable = false, precision = 5, scale = 2)
    BigDecimal durationHours;

    // Cost breakdown (for contract display)
    @Builder.Default
    @Column(name = "artist_fee", precision = 12, scale = 2)
    BigDecimal artistFee = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "equipment_rental_fee", precision = 12, scale = 2)
    BigDecimal equipmentRentalFee = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "external_guest_fee", precision = 12, scale = 2)
    BigDecimal externalGuestFee = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_cost", precision = 12, scale = 2)
    BigDecimal totalCost = BigDecimal.ZERO;

    // Session details
    @Column(name = "purpose", columnDefinition = "text")
    String purpose;

    @Column(name = "special_instructions", columnDefinition = "text")
    String specialInstructions;

    @Column(name = "notes", columnDefinition = "text")
    String notes;
}
