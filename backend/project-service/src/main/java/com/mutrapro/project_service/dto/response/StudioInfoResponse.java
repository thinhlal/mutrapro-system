package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class StudioInfoResponse {
    
    String studioId;
    String studioName;
    String location;
    BigDecimal hourlyRate;
    Integer freeExternalGuestsLimit;
    BigDecimal extraGuestFeePerPerson;
    Boolean isActive;
}

