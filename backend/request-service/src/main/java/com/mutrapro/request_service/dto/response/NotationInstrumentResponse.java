package com.mutrapro.request_service.dto.response;

import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotationInstrumentResponse {
    String instrumentId;
    String instrumentName;
    NotationInstrumentUsage usage;
    Long basePrice;
    boolean isActive;
    String image;  // URL hoặc path đến hình ảnh của nhạc cụ
}


