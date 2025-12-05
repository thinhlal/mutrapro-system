package com.mutrapro.project_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Entity
@Table(name = "studios", indexes = {
    @Index(name = "idx_studios_is_active", columnList = "is_active")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Studio extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "studio_id", nullable = false)
    String studioId;

    @Builder.Default
    @Column(name = "studio_name", nullable = false, length = 100)
    String studioName = "MuTraPro Studio";

    @Column(name = "location", nullable = false, length = 255)
    String location;

    @Builder.Default
    @Column(name = "hourly_rate", precision = 10, scale = 2)
    BigDecimal hourlyRate = new BigDecimal("200000");

    @Builder.Default
    @Column(name = "free_external_guests_limit", nullable = false)
    Integer freeExternalGuestsLimit = 3;

    @Builder.Default
    @Column(name = "extra_guest_fee_per_person", precision = 12, scale = 2)
    BigDecimal extraGuestFeePerPerson = new BigDecimal("50000");

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    Boolean isActive = true;
}
