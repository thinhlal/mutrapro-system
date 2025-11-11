package com.mutrapro.request_service.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
@FieldDefaults(level = PRIVATE)
public class ManagerInfoResponse {
    String userId;
    String fullName;
    String email;
    String role;
    String phone;
    String address;
    String avatarUrl;
    Boolean active;
    Boolean emailVerified;
    Boolean isNoPassword;
}
