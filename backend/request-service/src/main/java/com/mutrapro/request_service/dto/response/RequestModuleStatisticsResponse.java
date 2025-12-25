package com.mutrapro.request_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response chứa tất cả request statistics (requests và notation instruments)
 * Gộp lại để giảm số lượng API calls từ frontend
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestModuleStatisticsResponse {
    private RequestStatisticsResponse requests;
    private NotationInstrumentStatisticsResponse notationInstruments;
}

