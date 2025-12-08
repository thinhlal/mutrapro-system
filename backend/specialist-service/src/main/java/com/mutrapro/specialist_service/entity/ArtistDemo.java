package com.mutrapro.specialist_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import com.mutrapro.specialist_service.enums.RecordingRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

/**
 * ArtistDemo Entity - Demo giọng/nhạc cụ của nghệ sĩ
 * Bảng: artist_demos
 * 
 * Demo là một track, gắn tag:
 * - recordingRole: VOCALIST hoặc INSTRUMENT_PLAYER (bắt buộc)
 * - skill: 
 *   - Nếu VOCALIST: vocal skill (Soprano, Alto, etc.) - optional
 *   - Nếu INSTRUMENT_PLAYER: instrument skill (Piano Performance, Guitar Performance, etc.) - bắt buộc
 * - genres: ['Pop', 'Ballad', 'Rock'] - để biết demo thuộc genres nào (bắt buộc)
 */
@Entity
@Table(name = "artist_demos", indexes = {
    @Index(name = "idx_artist_demos_specialist_id", columnList = "specialist_id"),
    @Index(name = "idx_artist_demos_is_public", columnList = "is_public"),
    @Index(name = "idx_artist_demos_skill_id", columnList = "skill_id"),
    @Index(name = "idx_artist_demos_genres", columnList = "genres"),
    @Index(name = "idx_artist_demos_recording_role", columnList = "recording_role")
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
    
    /**
     * Recording role của demo này: VOCALIST hoặc INSTRUMENT_PLAYER
     * Bắt buộc - để biết demo này là vocal hay instrument
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "recording_role", nullable = false)
    private RecordingRole recordingRole;
    
    /**
     * Skill mà demo này thể hiện:
     * - Nếu recordingRole = VOCALIST: vocal skill (Soprano, Alto, Tenor, etc.) - optional
     * - Nếu recordingRole = INSTRUMENT_PLAYER: instrument skill (Piano Performance, Guitar Performance, etc.) - bắt buộc
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id")
    private Skill skill;
    
    /**
     * Tags theo genre: ['Pop', 'Ballad', 'Rock', 'R&B']
     * Bắt buộc - ít nhất 1 genre
     */
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "genres", columnDefinition = "TEXT[]")
    @Builder.Default
    private List<String> genres = new ArrayList<>();
    
    /**
     * Public URL của demo file (từ S3 public folder)
     * Customer có thể xem/nghe trực tiếp mà không cần authentication
     */
    @Column(name = "preview_url", length = 500, nullable = false)
    private String previewUrl;
    
    @Column(name = "is_public")
    @Builder.Default
    private Boolean isPublic = false; // Specialist tự chọn public/private
    
    /**
     * Demo chính - được hiển thị ở avatar trong trang list specialists
     * Mỗi specialist chỉ nên có 1 main demo
     */
    @Column(name = "is_main_demo")
    @Builder.Default
    private Boolean isMainDemo = false;
}

