package com.mutrapro.identity_service.dto.request;

import com.mutrapro.shared.enums.Role;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RegisterRequest {
    String email;
    String password;
    Role role; // nếu null sẽ mặc định CUSTOMER
}

