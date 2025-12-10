package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class AvailableTimeSlotResponse {
    LocalTime startTime;
    LocalTime endTime;
    Boolean available;  // true nếu slot còn trống
    String status;  // "available", "booked", "tentative"
}

