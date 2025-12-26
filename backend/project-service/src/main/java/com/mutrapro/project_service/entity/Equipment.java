package com.mutrapro.project_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "equipment", indexes = {
    @Index(name = "idx_equipment_name", columnList = "equipment_name"),
    @Index(name = "idx_equipment_brand", columnList = "brand"),
    @Index(name = "idx_equipment_model", columnList = "model"),
    @Index(name = "idx_equipment_active", columnList = "is_active"),
    @Index(name = "idx_equipment_brand_model", columnList = "brand,model", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Equipment extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "equipment_id", nullable = false)
    String equipmentId;

    @Column(name = "equipment_name", nullable = false, length = 100)
    String equipmentName;

    @Column(name = "brand", length = 50)
    String brand;

    @Column(name = "model", length = 100)
    String model;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "specifications", columnDefinition = "jsonb")
    Object specifications; // JSON object for technical specs

    @Column(name = "rental_fee", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    BigDecimal rentalFee = BigDecimal.ZERO;

    @Column(name = "total_quantity", nullable = false)
    @Builder.Default
    Integer totalQuantity = 1;

    @Column(name = "available_quantity", nullable = false)
    @Builder.Default
    Integer availableQuantity = 1; // Số lượng equipment còn available (totalQuantity - bookedQuantity)

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    Boolean isActive = true;

    @Column(name = "image", length = 500)
    String image; // Public S3 URL (e.g., "https://bucket.s3.amazonaws.com/equipment/file-uuid.png")

    @OneToMany(mappedBy = "equipment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<SkillEquipmentMapping> skillEquipmentMappings = new ArrayList<>();
}

