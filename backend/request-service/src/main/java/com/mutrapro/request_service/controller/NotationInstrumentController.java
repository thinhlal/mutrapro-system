package com.mutrapro.request_service.controller;

import com.mutrapro.request_service.dto.request.CreateNotationInstrumentRequest;
import com.mutrapro.request_service.dto.request.UpdateNotationInstrumentRequest;
import com.mutrapro.request_service.dto.response.ImageUploadResponse;
import com.mutrapro.request_service.dto.response.NotationInstrumentResponse;
import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import com.mutrapro.request_service.service.NotationInstrumentService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/notation-instruments")
@RequiredArgsConstructor
@Tag(name = "Notation Instruments")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotationInstrumentController {

    NotationInstrumentService service;

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

    @PostMapping(consumes = {"multipart/form-data"})
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tạo nhạc cụ ký âm mới (có thể upload ảnh cùng lúc)")
    public ApiResponse<NotationInstrumentResponse> createInstrument(
            @Valid @ModelAttribute CreateNotationInstrumentRequest request) {
        log.info("Creating new notation instrument: instrumentName={}, usage={}", 
                request.getInstrumentName(), request.getUsage());
        NotationInstrumentResponse created = service.createInstrument(request);
        return ApiResponse.<NotationInstrumentResponse>builder()
                .message("Notation instrument created successfully")
                .data(created)
                .statusCode(201)
                .build();
    }

    @PutMapping(value = "/{instrumentId}", consumes = {"multipart/form-data"})
    @Operation(summary = "Cập nhật thông tin nhạc cụ ký âm (có thể update image cùng lúc)")
    public ApiResponse<NotationInstrumentResponse> updateInstrument(
            @Parameter(description = "ID của nhạc cụ ký âm")
            @PathVariable String instrumentId,
            @Valid @ModelAttribute UpdateNotationInstrumentRequest request) {
        log.info("Updating instrument: instrumentId={}", instrumentId);
        NotationInstrumentResponse updated = service.updateInstrument(instrumentId, request);
        return ApiResponse.<NotationInstrumentResponse>builder()
                .message("Instrument updated successfully")
                .data(updated)
                .build();
    }

    @PostMapping(value = "/{instrumentId}/image", consumes = {"multipart/form-data"})
    @Operation(summary = "Upload hình ảnh cho nhạc cụ ký âm")
    public ApiResponse<ImageUploadResponse> uploadImage(
            @Parameter(description = "ID của nhạc cụ ký âm")
            @PathVariable String instrumentId,
            @Parameter(description = "File hình ảnh (JPEG, PNG)")
            @RequestParam("image") MultipartFile imageFile) {
        log.info("Uploading image for instrument: instrumentId={}", instrumentId);
        String imageUrl = service.uploadImage(instrumentId, imageFile);
        return ApiResponse.<ImageUploadResponse>builder()
                .message("Image uploaded successfully")
                .data(ImageUploadResponse.builder()
                        .instrumentId(instrumentId)
                        .imageUrl(imageUrl)
                        .build())
                .build();
    }
}


