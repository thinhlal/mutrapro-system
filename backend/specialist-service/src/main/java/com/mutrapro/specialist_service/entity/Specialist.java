package com.mutrapro.specialist_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import com.mutrapro.specialist_service.enums.Gender;
import com.mutrapro.specialist_service.enums.RecordingRole;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
    @Index(name = "idx_specialists_status", columnList = "status"),
    @Index(name = "idx_specialists_gender", columnList = "gender"),
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
    
    @Column(name = "full_name_snapshot", length = 255)
    private String fullNameSnapshot;
    
    @Column(name = "email_snapshot", length = 255)
    private String emailSnapshot;
    
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

    // ===== RECORDING ARTIST SPECIFIC FIELDS =====
    
    @Column(name = "avatar_url", length = 500)
    private String avatarUrl; // URL to profile image
    
    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    private Gender gender; // MALE, FEMALE, OTHER
    
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Enumerated(EnumType.STRING)
    @Column(name = "recording_roles", columnDefinition = "TEXT[]")
    @Builder.Default
    private List<RecordingRole> recordingRoles = new ArrayList<>(); // Array of roles: [VOCALIST], [INSTRUMENT_PLAYER], hoặc [VOCALIST, INSTRUMENT_PLAYER] (chỉ dùng khi specialization = RECORDING_ARTIST)
    
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "genres", columnDefinition = "TEXT[]")
    @Builder.Default
    private List<String> genres = new ArrayList<>(); // Array of music genres: ['Pop', 'Rock', 'Jazz', 'Classical', 'R&B', 'Hip-Hop', 'Electronic', etc.]
    
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "credits", columnDefinition = "TEXT[]")
    @Builder.Default
    private List<String> credits = new ArrayList<>(); // Array of credits: ['One Seven Music', 'Future House Cloud']
    
    @Column(name = "reviews")
    @Builder.Default
    private Integer reviews = 0; // Number of reviews (separate from total_projects)

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
    
    // ===== HELPER METHODS =====
    
    /**
     * Kiểm tra xem specialist có phải là RECORDING_ARTIST không
     */
    public boolean isRecordingArtist() {
        return this.specialization == SpecialistType.RECORDING_ARTIST;
    }
    
    /**
     * Kiểm tra xem specialist có phải là vocalist không
     * (RECORDING_ARTIST với recordingRoles chứa VOCALIST)
     */
    public boolean isVocalist() {
        return isRecordingArtist()
            && recordingRoles != null
            && recordingRoles.contains(RecordingRole.VOCALIST);
    }
    
    /**
     * Kiểm tra xem specialist có phải là instrument player không
     * (RECORDING_ARTIST với recordingRoles chứa INSTRUMENT_PLAYER)
     */
    public boolean isInstrumentPlayer() {
        return isRecordingArtist()
            && recordingRoles != null
            && recordingRoles.contains(RecordingRole.INSTRUMENT_PLAYER);
    }
}

