package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.CurrencyType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "contracts", indexes = {
    @Index(name = "idx_contracts_request_id", columnList = "request_id"),
    @Index(name = "idx_contracts_user_id", columnList = "user_id"),
    @Index(name = "idx_contracts_manager_user_id", columnList = "manager_user_id"),
    @Index(name = "idx_contracts_contract_number", columnList = "contract_number"),
    @Index(name = "idx_contracts_status", columnList = "status"),
    @Index(name = "idx_contracts_contract_type", columnList = "contract_type"),
    @Index(name = "idx_contracts_expires_at", columnList = "expires_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "contract_id", nullable = false)
    String contractId;

    // Soft references to other services
    @Column(name = "request_id", nullable = false)
    String requestId;  // Soft reference to request-service

    @Column(name = "user_id", nullable = false)
    String userId;  // Soft reference to identity-service (customer)

    @Column(name = "manager_user_id", nullable = false)
    String managerUserId;  // Soft reference to identity-service (manager)

    @Column(name = "contract_number", nullable = false, unique = true, length = 50)
    String contractNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", nullable = false, length = 30)
    ContractType contractType;

    @Column(name = "terms_and_conditions", columnDefinition = "text")
    String termsAndConditions;

    @Column(name = "special_clauses", columnDefinition = "text")
    String specialClauses;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    ContractStatus status = ContractStatus.draft;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    Instant createdAt = Instant.now();

    @Column(name = "sent_to_customer_at")
    Instant sentToCustomerAt;

    @Column(name = "customer_reviewed_at")
    Instant customerReviewedAt;

    @Column(name = "signed_at")
    Instant signedAt;

    @Column(name = "expires_at")
    Instant expiresAt;

    @Column(name = "file_id", length = 36)
    String fileId;  // Reference to files.file_id (Contract PDF file)

    @Column(name = "notes", columnDefinition = "text")
    String notes;

    // Pricing
    @Column(name = "total_price", precision = 12, scale = 2)
    BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", length = 10)
    CurrencyType currency;

    @Column(name = "deposit_percent", precision = 5, scale = 2)
    BigDecimal depositPercent;

    @Column(name = "deposit_amount", precision = 12, scale = 2)
    BigDecimal depositAmount;

    @Column(name = "final_amount", precision = 12, scale = 2)
    BigDecimal finalAmount;

    // Timeline & SLA
    @Column(name = "expected_start_date")
    Instant expectedStartDate;

    @Column(name = "due_date")
    Instant dueDate;

    @Column(name = "sla_days")
    Integer slaDays;

    @Builder.Default
    @Column(name = "auto_due_date", nullable = false)
    Boolean autoDueDate = true;

    // Revision policy
    @Builder.Default
    @Column(name = "free_revisions_included", nullable = false)
    Integer freeRevisionsIncluded = 1;

    @Column(name = "additional_revision_fee_vnd", precision = 12, scale = 2)
    BigDecimal additionalRevisionFeeVnd;

    @Column(name = "revision_deadline_days")
    Integer revisionDeadlineDays;  // Number of days after delivery for free revisions (30/45/60 based on contract type)

    // Snapshot contact info (for legal purposes)
    @Column(name = "name_snapshot", nullable = false, length = 255)
    String nameSnapshot;

    @Column(name = "phone_snapshot", nullable = false, length = 20)
    String phoneSnapshot;

    @Column(name = "email_snapshot", nullable = false, length = 255)
    String emailSnapshot;

    // Customer action reasons
    @Column(name = "cancellation_reason", columnDefinition = "text")
    String cancellationReason;  // Lý do hủy/từ chối từ khách hàng
}

