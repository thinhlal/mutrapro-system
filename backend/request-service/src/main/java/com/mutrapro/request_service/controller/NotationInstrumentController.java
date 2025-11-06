package com.mutrapro.request_service.controller;

import com.mutrapro.request_service.dto.response.NotationInstrumentResponse;
import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import com.mutrapro.request_service.service.NotationInstrumentService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/notation-instruments")
@RequiredArgsConstructor
@Tag(name = "Notation Instruments")
public class NotationInstrumentController {

    private final NotationInstrumentService service;

    @GetMapping
    @Operation(summary = "Danh sách nhạc cụ ký âm (có thể filter theo usage: transcription, arrangement, both)")
    public ApiResponse<List<NotationInstrumentResponse>> listInstruments(
            @Parameter(description = "Filter theo usage: transcription (lấy transcription + both), arrangement (lấy arrangement + both), both (lấy tất cả). Nếu không truyền thì trả về tất cả active")
            @RequestParam(required = false) NotationInstrumentUsage usage) {
        log.info("Listing active notation instruments with usage filter: {}", usage);
        List<NotationInstrumentResponse> items = service.getActiveInstruments(usage);
        return ApiResponse.<List<NotationInstrumentResponse>>builder()
                .message("Notation instruments retrieved successfully")
                .data(items)
                .build();
    }
}


