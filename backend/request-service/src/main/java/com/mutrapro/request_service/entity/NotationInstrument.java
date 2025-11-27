package com.mutrapro.request_service.entity;

import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "notation_instruments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotationInstrument extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "instrument_id", nullable = false)
    String instrumentId;

    @Column(name = "instrument_name", nullable = false, length = 100)
    String instrumentName;

    @Enumerated(EnumType.STRING)
    @Column(name = "usage", nullable = false, length = 20)
    NotationInstrumentUsage usage;

    @Builder.Default
    @Column(name = "base_price", nullable = false)
    Long basePrice = 0L;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    boolean isActive = true;

    @Column(name = "image", length = 500)
    String image;  // Public S3 URL (e.g., "https://bucket.s3.amazonaws.com/instruments/file-uuid.png")

    @OneToMany(mappedBy = "notationInstrument", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<RequestNotationInstrument> requestNotationInstruments = new ArrayList<>();
}


