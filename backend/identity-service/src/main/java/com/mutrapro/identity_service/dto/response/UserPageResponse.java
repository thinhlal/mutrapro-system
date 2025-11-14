package com.mutrapro.identity_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPageResponse {

    private List<FullUserResponse> users;
    private int currentPage;
    private int totalPages;
    private long totalElements;
    private int pageSize;
}

