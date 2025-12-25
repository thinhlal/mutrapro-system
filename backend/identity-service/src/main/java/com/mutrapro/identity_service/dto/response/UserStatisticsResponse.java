package com.mutrapro.identity_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatisticsResponse {
    private long totalUsers;
    private long activeUsers;
    private long inactiveUsers;
    private long verifiedUsers;
    private long unverifiedUsers;
    private long systemAdmins;
    private long managers;
    private long transcriptions;
    private long arrangements;
    private long recordingArtists;
    private long customers;
}

