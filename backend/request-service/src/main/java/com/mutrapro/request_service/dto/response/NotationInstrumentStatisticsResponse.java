package com.mutrapro.request_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotationInstrumentStatisticsResponse {
    private Long total;
    private String mostUsed; // Instrument name được sử dụng nhiều nhất
}

