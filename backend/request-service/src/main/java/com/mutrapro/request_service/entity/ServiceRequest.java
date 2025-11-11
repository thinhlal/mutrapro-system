package com.mutrapro.request_service.entity;

import com.fasterxml.jackson.databind.JsonNode;
import com.mutrapro.request_service.enums.CurrencyType;
import com.mutrapro.request_service.enums.RequestStatus;
import com.mutrapro.request_service.enums.ServiceType;
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
@Table(name = "service_requests", indexes = {
    @Index(name = "idx_service_requests_user_id", columnList = "user_id"),
    @Index(name = "idx_service_requests_manager_user_id", columnList = "manager_user_id"),
    @Index(name = "idx_service_requests_status", columnList = "status"),
    @Index(name = "idx_service_requests_request_type", columnList = "request_type")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ServiceRequest extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "request_id", nullable = false)
    String requestId;

    @Column(name = "user_id", nullable = false)
    String userId;  // Soft reference to identity-service

    @Column(name = "manager_user_id")
    String managerUserId;  // Soft reference to identity-service (optional)

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 30)
    ServiceType requestType;

    @Column(name = "contact_name", length = 100)
    String contactName;

    @Column(name = "contact_phone", length = 20)
    String contactPhone;

    @Column(name = "contact_email", length = 100)
    String contactEmail;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "music_options", columnDefinition = "jsonb")
    JsonNode musicOptions;  // VD: { "genres": ["Pop","Rock"], "purpose": "karaoke_cover" } - NULL cho transcription

    @Column(name = "tempo_percentage", precision = 5, scale = 2)
    BigDecimal tempoPercentage;  // VD: 80.00, 50.00 (tốc độ phát cho transcription)

    @Column(name = "duration_minutes", precision = 10, scale = 2)
    BigDecimal durationMinutes;  // Độ dài audio file (phút) - dùng để tính giá transcription

    @Builder.Default
    @Column(name = "has_vocalist", nullable = false)
    Boolean hasVocalist = false;  // Customer có chọn ca sĩ cho arrangement_with_recording

    @Builder.Default
    @Column(name = "external_guest_count", nullable = false)
    Integer externalGuestCount = 0;  // Số người customer mang theo cho studio booking

    @Column(name = "title", length = 200)
    String title;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    String description;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    RequestStatus status = RequestStatus.pending;

    @Column(name = "total_price", precision = 12, scale = 2)
    BigDecimal totalPrice;  // Snapshot tổng giá tại thời điểm tạo/cập nhật

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", length = 10)
    CurrencyType currency;  // Loại tiền tệ của totalPrice

    @OneToMany(mappedBy = "serviceRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<RequestNotationInstrument> notationInstruments = new ArrayList<>();
}

