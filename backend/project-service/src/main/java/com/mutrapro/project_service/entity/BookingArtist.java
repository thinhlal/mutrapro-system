package com.mutrapro.project_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Entity
@Table(name = "booking_artists", indexes = {
    @Index(name = "idx_booking_artists_booking_id", columnList = "booking_id"),
    @Index(name = "idx_booking_artists_specialist_id", columnList = "specialist_id"),
    @Index(name = "idx_booking_artists_booking_specialist", columnList = "booking_id, specialist_id", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingArtist extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "booking_artist_id", nullable = false)
    String bookingArtistId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    StudioBooking booking;

    @Column(name = "specialist_id", nullable = false)
    String specialistId;  // Soft reference to specialist-service

    @Column(name = "role", length = 50)
    String role;  // PRIMARY_VOCALIST, GUITARIST, PRODUCER, ENGINEER, VOCALIST, etc.

    @Builder.Default
    @Column(name = "is_primary", nullable = false)
    Boolean isPrimary = false;  // true nếu là artist chính (vocal chính)

    @Builder.Default
    @Column(name = "artist_fee", precision = 12, scale = 2)
    BigDecimal artistFee = BigDecimal.ZERO;  // Phí cho artist này (optional)

    @Column(name = "skill_id")
    String skillId;  // Soft reference to specialist-service (skill được sử dụng)
}

