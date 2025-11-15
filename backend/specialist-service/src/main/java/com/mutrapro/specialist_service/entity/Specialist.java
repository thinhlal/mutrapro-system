package com.mutrapro.specialist_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Specialist Entity - Thông tin chuyên gia
 * Bảng: specialists
 */
@Entity
@Table(name = "specialists", indexes = {
    @Index(name = "idx_specialists_user_id", columnList = "user_id", unique = true),
    @Index(name = "idx_specialists_specialization", columnList = "specialization"),
    @Index(name = "idx_specialists_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Specialist extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "specialist_id")
    private String specialistId;
    
    @Column(name = "user_id", nullable = false, unique = true)
    private String userId; // Soft reference to identity-service
    
    @Enumerated(EnumType.STRING)
    @Column(name = "specialization", nullable = false)
    private SpecialistType specialization;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SpecialistStatus status = SpecialistStatus.ACTIVE;
    
    @Column(name = "experience_years")
    @Builder.Default
    private Integer experienceYears = 0;
    
    @Column(name = "max_concurrent_tasks")
    @Builder.Default
    private Integer maxConcurrentTasks = 5;
    
    @Column(name = "portfolio_url", length = 255)
    private String portfolioUrl;
    
    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio; // Giới thiệu bản thân
    
    @Column(name = "rating", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal rating = BigDecimal.ZERO;
    
    @Column(name = "total_projects")
    @Builder.Default
    private Integer totalProjects = 0;
    
    // ===== RELATIONSHIPS =====
    
    /**
     * Danh sách kỹ năng của specialist
     */
    @OneToMany(mappedBy = "specialist", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SpecialistSkill> specialistSkills = new ArrayList<>();
    
    /**
     * Danh sách demo của specialist
     */
    @OneToMany(mappedBy = "specialist", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ArtistDemo> artistDemos = new ArrayList<>();
}

