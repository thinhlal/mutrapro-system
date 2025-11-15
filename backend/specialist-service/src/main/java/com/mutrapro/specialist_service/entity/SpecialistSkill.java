package com.mutrapro.specialist_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import com.mutrapro.specialist_service.enums.ProficiencyLevel;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * SpecialistSkill Entity - Kỹ năng của từng specialist với level và kinh nghiệm
 * Bảng: specialist_skills
 */
@Entity
@Table(name = "specialist_skills", indexes = {
    @Index(name = "idx_specialist_skills_specialist_id", columnList = "specialist_id"),
    @Index(name = "idx_specialist_skills_skill_id", columnList = "skill_id"),
    @Index(name = "idx_specialist_skills_proficiency", columnList = "proficiency_level"),
    @Index(name = "uk_specialist_skills_specialist_skill", columnList = "specialist_id,skill_id", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialistSkill extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "specialist_skill_id")
    private String specialistSkillId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "specialist_id", nullable = false)
    private Specialist specialist;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "proficiency_level", nullable = false)
    private ProficiencyLevel proficiencyLevel;
    
    @Column(name = "years_experience")
    @Builder.Default
    private Integer yearsExperience = 0;
    
    @Column(name = "last_used_date")
    private LocalDate lastUsedDate;
    
    @Column(name = "is_certified")
    @Builder.Default
    private Boolean isCertified = false;
    
    @Column(name = "certification_details", columnDefinition = "TEXT")
    private String certificationDetails;
}

