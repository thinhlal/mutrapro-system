package com.mutrapro.request_service.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Entity
@Table(name = "request_notation_instruments", indexes = {
    @Index(name = "idx_request_notation_instruments_request_id", columnList = "request_id"),
    @Index(name = "idx_request_notation_instruments_instrument_id", columnList = "instrument_id"),
    @Index(name = "idx_request_notation_instruments_unique", columnList = "request_id,instrument_id", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RequestNotationInstrument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "request_instrument_id", nullable = false)
    UUID requestInstrumentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    ServiceRequest serviceRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instrument_id", nullable = false)
    NotationInstrument notationInstrument;

    @Builder.Default
    @Column(name = "is_main", nullable = false)
    Boolean isMain = false;  // true nếu đây là main instrument (cho arrangement)
}

