package com.mutrapro.specialist_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Skill Entity - Kỹ năng cụ thể (Piano, Guitar, Drums, Vocal, etc.)
 * Bảng: skills
 */
@Entity
@Table(name = "skills", indexes = {
    @Index(name = "idx_skills_name", columnList = "skill_name", unique = true),
    @Index(name = "idx_skills_active", columnList = "is_active")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Skill extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "skill_id")
    private String skillId;
    
    @Column(name = "skill_name", nullable = false, unique = true, length = 100)
    private String skillName;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
    
    // ===== RELATIONSHIPS =====
    
    /**
     * Danh sách specialist có kỹ năng này
     */
    @OneToMany(mappedBy = "skill", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SpecialistSkill> specialistSkills = new ArrayList<>();
    
    /**
     * Danh sách demo sử dụng kỹ năng này
     */
    @OneToMany(mappedBy = "skill", fetch = FetchType.LAZY)
    @Builder.Default
    private List<ArtistDemo> artistDemos = new ArrayList<>();
}

