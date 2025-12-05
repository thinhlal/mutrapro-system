package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestonePaidEvent implements Serializable {

    private UUID eventId;

    private String contractId;
    private String milestoneId;
    private Integer orderIndex;  // Thứ tự milestone (1, 2, 3...)
    private LocalDateTime paidAt;
    private BigDecimal amount;
    private String currency;  // VND, USD, etc.
    private LocalDateTime timestamp;
}

