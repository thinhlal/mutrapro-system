package com.mutrapro.request_service.entity;

import com.mutrapro.request_service.enums.CurrencyType;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.enums.UnitType;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Entity
@Table(name = "pricing_matrix", indexes = {
    @Index(name = "idx_pricing_matrix_service_type", columnList = "service_type"),
    @Index(name = "idx_pricing_matrix_currency", columnList = "currency"),
    @Index(name = "idx_pricing_matrix_is_active", columnList = "is_active")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PricingMatrix extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "pricing_id", nullable = false)
    String pricingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false, length = 50)
    ServiceType serviceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_type", nullable = false, length = 20)
    UnitType unitType;

    @Column(name = "base_price", nullable = false, precision = 12, scale = 2)
    BigDecimal basePrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false, length = 10)
    @Builder.Default
    CurrencyType currency = CurrencyType.VND;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    boolean isActive = true;
}

