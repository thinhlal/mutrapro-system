package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class ContractRevisionStatsResponse {
    String contractId;
    Integer freeRevisionsIncluded;  // Số lượt revision free được bao gồm trong contract
    Integer freeRevisionsUsed;     // Số lượt revision free đã sử dụng (không tính REJECTED/CANCELED)
    Integer paidRevisionsUsed;     // Số lượt revision paid đã sử dụng (không tính REJECTED/CANCELED)
    Integer totalRevisionsUsed;    // Tổng số revision đã sử dụng (free + paid, không tính REJECTED/CANCELED)
    Integer freeRevisionsRemaining; // Số lượt revision free còn lại
}

