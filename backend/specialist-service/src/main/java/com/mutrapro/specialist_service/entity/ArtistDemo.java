package com.mutrapro.specialist_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ArtistDemo Entity - Demo giọng/nhạc cụ của nghệ sĩ
 * Bảng: artist_demos
 */
@Entity
@Table(name = "artist_demos", indexes = {
    @Index(name = "idx_artist_demos_specialist_id", columnList = "specialist_id"),
    @Index(name = "idx_artist_demos_is_public", columnList = "is_public"),
    @Index(name = "idx_artist_demos_skill_id", columnList = "skill_id"),
    @Index(name = "idx_artist_demos_is_featured", columnList = "is_featured")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArtistDemo extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "demo_id")
    private String demoId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "specialist_id", nullable = false)
    private Specialist specialist;
    
    @Column(length = 150)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id")
    private Skill skill;
    
    @Column(name = "file_id", nullable = false)
    private String fileId; // Soft reference to file-service
    
    @Column(name = "preview_url", length = 500)
    private String previewUrl;
    
    @Column(name = "is_public")
    @Builder.Default
    private Boolean isPublic = false; // Default false, chỉ admin mới được bật
    
    @Column(name = "demo_order")
    @Builder.Default
    private Integer demoOrder = 1;
    
    @Column(name = "is_featured")
    @Builder.Default
    private Boolean isFeatured = false; // Admin có thể set featured
    
    @Column(name = "view_count")
    @Builder.Default
    private Integer viewCount = 0;
    
    @Column(name = "customer_rating", precision = 3, scale = 2)
    private BigDecimal customerRating;
    
    @Column(name = "last_played_at")
    private LocalDateTime lastPlayedAt;
}

