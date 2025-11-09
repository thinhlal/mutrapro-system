package com.mutrapro.request_service.controller;

import com.mutrapro.request_service.dto.request.CreatePricingMatrixRequest;
import com.mutrapro.request_service.dto.request.UpdatePricingMatrixRequest;
import com.mutrapro.request_service.dto.response.PriceCalculationResponse;
import com.mutrapro.request_service.dto.response.PricingMatrixResponse;
import com.mutrapro.request_service.enums.CurrencyType;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.service.PricingMatrixService;
import com.mutrapro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/pricing-matrix")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PricingMatrixController {

    PricingMatrixService pricingMatrixService;

    /**
     * Lấy tất cả pricing matrix
     */
    @GetMapping
    public ApiResponse<List<PricingMatrixResponse>> getAllPricing(
            @RequestParam(required = false) ServiceType serviceType,
            @RequestParam(required = false) CurrencyType currency,
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        
        List<PricingMatrixResponse> pricingList = pricingMatrixService.getAllPricing(
                serviceType, currency, includeInactive);
        
        return ApiResponse.<List<PricingMatrixResponse>>builder()
                .data(pricingList)
                .message("Retrieved pricing matrix successfully")
                .build();
    }

    /**
     * Lấy pricing theo service type
     * 1 ServiceType chỉ có 1 PricingMatrix
     */
    @GetMapping("/{serviceType}")
    public ApiResponse<PricingMatrixResponse> getPricing(
            @PathVariable ServiceType serviceType) {
        
        PricingMatrixResponse pricing = pricingMatrixService.getPricing(serviceType);
        
        return ApiResponse.<PricingMatrixResponse>builder()
                .data(pricing)
                .message("Retrieved pricing successfully")
                .build();
    }

    /**
     * Tính giá cho transcription (theo phút)
     */
    @GetMapping("/calculate/transcription")
    public ApiResponse<PriceCalculationResponse> calculateTranscriptionPrice(
            @RequestParam(required = false) BigDecimal durationMinutes) {
        
        PriceCalculationResponse result = pricingMatrixService.calculateTranscriptionPrice(durationMinutes);
        
        return ApiResponse.<PriceCalculationResponse>builder()
                .data(result)
                .message("Calculated transcription price successfully")
                .build();
    }

    /**
     * Tính giá cho arrangement (theo bài)
     */
    @GetMapping("/calculate/arrangement")
    public ApiResponse<PriceCalculationResponse> calculateArrangementPrice(
            @RequestParam(required = false, defaultValue = "1") Integer numberOfSongs) {
        
        PriceCalculationResponse result = pricingMatrixService.calculateArrangementPrice(numberOfSongs);
        
        return ApiResponse.<PriceCalculationResponse>builder()
                .data(result)
                .message("Calculated arrangement price successfully")
                .build();
    }

    /**
     * Tính giá cho arrangement_with_recording (theo bài + giá ca sĩ)
     */
    @GetMapping("/calculate/arrangement-with-recording")
    public ApiResponse<PriceCalculationResponse> calculateArrangementWithRecordingPrice(
            @RequestParam(required = false, defaultValue = "1") Integer numberOfSongs,
            @RequestParam(required = false) BigDecimal artistFee) {
        
        PriceCalculationResponse result = pricingMatrixService.calculateArrangementWithRecordingPrice(
                numberOfSongs, artistFee);
        
        return ApiResponse.<PriceCalculationResponse>builder()
                .data(result)
                .message("Calculated arrangement with recording price successfully")
                .build();
    }

    /**
     * Tạo pricing matrix mới
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PricingMatrixResponse> createPricing(
            @Valid @RequestBody CreatePricingMatrixRequest request) {
        
        PricingMatrixResponse created = pricingMatrixService.createPricing(request);
        
        return ApiResponse.<PricingMatrixResponse>builder()
                .data(created)
                .message("Created pricing matrix successfully")
                .build();
    }

    /**
     * Cập nhật pricing matrix
     */
    @PutMapping("/{pricingId}")
    public ApiResponse<PricingMatrixResponse> updatePricing(
            @PathVariable String pricingId,
            @Valid @RequestBody UpdatePricingMatrixRequest request) {
        
        PricingMatrixResponse updated = pricingMatrixService.updatePricing(pricingId, request);
        
        return ApiResponse.<PricingMatrixResponse>builder()
                .data(updated)
                .message("Updated pricing matrix successfully")
                .build();
    }

    /**
     * Xóa pricing matrix (soft delete)
     */
    @DeleteMapping("/{pricingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ApiResponse<Void> deletePricing(@PathVariable String pricingId) {
        pricingMatrixService.deletePricing(pricingId);
        
        return ApiResponse.<Void>builder()
                .message("Deleted pricing matrix successfully")
                .build();
    }
}

