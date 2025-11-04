package com.mutrapro.identity_service.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class GoogleUserInfoResponse {
    private String id;
    private String email;
    private String name;
    @JsonProperty("picture")
    private String avatarUrl;
}


