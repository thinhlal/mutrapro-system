package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractSignedEmailEvent implements Serializable {

    private UUID eventId;

    private String contractId;
    private String contractNumber;
    private String customerName;
    private String customerEmail;
    private String managerName;
    private String managerEmail;
    private LocalDateTime signedAt;
    private LocalDateTime timestamp;
}

