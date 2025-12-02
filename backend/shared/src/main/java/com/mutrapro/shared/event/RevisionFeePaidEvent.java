package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Event khi customer thanh toán revision fee thành công.
 * Project-service lắng nghe để tạo RevisionRequest với paidWalletTxId.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionFeePaidEvent implements Serializable {

    UUID eventId;
    String walletTxId;  // ID của wallet transaction
    String walletId;
    String customerUserId;  // Customer đã thanh toán
    
    String contractId;
    String milestoneId;
    String taskAssignmentId;
    String submissionId;  // Original submission ID
    Integer revisionRound;
    
    BigDecimal amount;
    String currency;  // VND, USD, etc.
    
    String title;  // Title của revision request (từ customer)
    String description;  // Description của revision request (từ customer)
    
    Instant paidAt;
    Instant timestamp;
}

