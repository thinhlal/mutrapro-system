package com.mutrapro.request_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "skill_equipment_mapping", indexes = {
    @Index(name = "idx_mapping_skill_id", columnList = "skill_id"),
    @Index(name = "idx_mapping_equipment_id", columnList = "equipment_id"),
    @Index(name = "idx_mapping_skill_equipment", columnList = "skill_id,equipment_id", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SkillEquipmentMapping extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "mapping_id", nullable = false)
    String mappingId;

    @Column(name = "skill_id", nullable = false, length = 36)
    String skillId; // Soft reference to specialist-service.skills.skill_id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    Equipment equipment;

    // Helper method to get equipment_id without loading Equipment
    public String getEquipmentId() {
        return equipment != null ? equipment.getEquipmentId() : null;
    }
}

