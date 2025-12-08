package com.mutrapro.request_service.service;

import com.mutrapro.request_service.dto.request.CreatePricingMatrixRequest;
import com.mutrapro.request_service.dto.request.UpdatePricingMatrixRequest;
import com.mutrapro.request_service.dto.response.PriceCalculationResponse;
import com.mutrapro.request_service.dto.response.PricingMatrixResponse;
import com.mutrapro.request_service.entity.PricingMatrix;
import com.mutrapro.request_service.enums.CurrencyType;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.exception.PricingMatrixDuplicateException;
import com.mutrapro.request_service.exception.PricingMatrixNotFoundException;
import com.mutrapro.request_service.repository.PricingMatrixRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PricingMatrixService {

    PricingMatrixRepository pricingMatrixRepository;

    /**
     * Lấy tất cả pricing matrix
     */
    public List<PricingMatrixResponse> getAllPricing(ServiceType serviceType, CurrencyType currency, boolean includeInactive) {
        List<PricingMatrix> pricingList;
        
        // Trường hợp 1: Có cả serviceType và currency
        if (serviceType != null && currency != null) {
            // Tìm pricing theo serviceType (1 ServiceType chỉ có 1 PricingMatrix)
            Optional<PricingMatrix> pricingOpt = includeInactive
                ? pricingMatrixRepository.findByServiceType(serviceType)
                : pricingMatrixRepository.findByServiceTypeAndIsActiveTrue(serviceType);
            
            // Filter theo currency
            pricingList = pricingOpt
                .filter(p -> p.getCurrency() == currency)
                .map(List::of)
                .orElse(List.of());
        }
        // Trường hợp 2: Chỉ có serviceType
        else if (serviceType != null) {
            if (includeInactive) {
                // Tìm pricing (cả active và inactive), convert Optional sang List
                pricingList = pricingMatrixRepository.findByServiceType(serviceType)
                    .map(List::of)
                    .orElse(List.of());
            } else {
                // Tìm pricing (chỉ active), convert Optional sang List
                pricingList = pricingMatrixRepository.findByServiceTypeAndIsActiveTrue(serviceType)
                    .map(List::of)
                    .orElse(List.of());
            }
        }
        // Trường hợp 3: Chỉ có currency
        else if (currency != null) {
            pricingList = includeInactive
                ? pricingMatrixRepository.findByCurrency(currency)
                : pricingMatrixRepository.findByCurrencyAndIsActiveTrue(currency);
        }
        // Trường hợp 4: Không có filter nào
        else {
            pricingList = includeInactive
                ? pricingMatrixRepository.findAll()
                : pricingMatrixRepository.findByIsActiveTrue();
        }
        
        return pricingList.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy pricing theo service type
     * 1 ServiceType chỉ có 1 PricingMatrix
     */
    public PricingMatrixResponse getPricing(ServiceType serviceType) {
        PricingMatrix pricing = pricingMatrixRepository
                .findByServiceTypeAndIsActiveTrue(serviceType)
                .orElseThrow(() -> PricingMatrixNotFoundException.byServiceType(serviceType));
        
        return mapToResponse(pricing);
    }

    /**
     * Tính giá cho transcription (theo phút)
     */
    public PriceCalculationResponse calculateTranscriptionPrice(BigDecimal durationMinutes) {
        PricingMatrix pricing = pricingMatrixRepository
                .findByServiceTypeAndIsActiveTrue(ServiceType.transcription)
                .orElseThrow(() -> PricingMatrixNotFoundException.byServiceType(ServiceType.transcription));
        
        BigDecimal quantity = durationMinutes != null && durationMinutes.compareTo(BigDecimal.ZERO) > 0 
            ? durationMinutes 
            : BigDecimal.ONE; // Minimum 1 minute
        
        BigDecimal totalPrice = pricing.getBasePrice().multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        
        List<PriceCalculationResponse.PriceBreakdownItem> breakdown = new ArrayList<>();
        breakdown.add(PriceCalculationResponse.PriceBreakdownItem.builder()
                .label("Transcription")
                .description(String.format("%s VND/phút × %.2f phút", pricing.getBasePrice(), quantity))
                .amount(totalPrice)
                .build());
        
        return PriceCalculationResponse.builder()
                .basePrice(pricing.getBasePrice())
                .quantity(quantity)
                .unitPrice(pricing.getBasePrice())
                .additionalFee(BigDecimal.ZERO)
                .totalPrice(totalPrice)
                .currency(pricing.getCurrency())
                .breakdown(breakdown)
                .build();
    }

    /**
     * Tính giá cho arrangement (theo bài)
     */
    public PriceCalculationResponse calculateArrangementPrice(Integer numberOfSongs) {
        PricingMatrix pricing = pricingMatrixRepository
                .findByServiceTypeAndIsActiveTrue(ServiceType.arrangement)
                .orElseThrow(() -> PricingMatrixNotFoundException.byServiceType(ServiceType.arrangement));
        
        BigDecimal quantity = numberOfSongs != null && numberOfSongs > 0 
            ? BigDecimal.valueOf(numberOfSongs) 
            : BigDecimal.ONE; // Minimum 1 song
        
        BigDecimal totalPrice = pricing.getBasePrice().multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        
        List<PriceCalculationResponse.PriceBreakdownItem> breakdown = new ArrayList<>();
        breakdown.add(PriceCalculationResponse.PriceBreakdownItem.builder()
                .label("Arrangement")
                .description(String.format("%s VND/bài × %d bài", pricing.getBasePrice(), quantity.intValue()))
                .amount(totalPrice)
                .build());
        
        return PriceCalculationResponse.builder()
                .basePrice(pricing.getBasePrice())
                .quantity(quantity)
                .unitPrice(pricing.getBasePrice())
                .additionalFee(BigDecimal.ZERO)
                .totalPrice(totalPrice)
                .currency(pricing.getCurrency())
                .breakdown(breakdown)
                .build();
    }

    /**
     * Tính giá cho arrangement_with_recording (theo bài)
     * Không tính phí ca sĩ vì đây là hệ thống
     */
    public PriceCalculationResponse calculateArrangementWithRecordingPrice(
            Integer numberOfSongs) {
        
        // Lấy giá arrangement theo bài
        PricingMatrix arrangementPricing = pricingMatrixRepository
                .findByServiceTypeAndIsActiveTrue(ServiceType.arrangement_with_recording)
                .orElseThrow(() -> PricingMatrixNotFoundException.byServiceType(
                        ServiceType.arrangement_with_recording));
        
        BigDecimal quantity = numberOfSongs != null && numberOfSongs > 0 
            ? BigDecimal.valueOf(numberOfSongs) 
            : BigDecimal.ONE;
        
        BigDecimal totalPrice = arrangementPricing.getBasePrice().multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        
        List<PriceCalculationResponse.PriceBreakdownItem> breakdown = new ArrayList<>();
        breakdown.add(PriceCalculationResponse.PriceBreakdownItem.builder()
                .label("Arrangement + Recording")
                .description(String.format("%s VND/bài × %d bài", arrangementPricing.getBasePrice(), quantity.intValue()))
                .amount(totalPrice)
                .build());
        
        return PriceCalculationResponse.builder()
                .basePrice(arrangementPricing.getBasePrice())
                .quantity(quantity)
                .unitPrice(arrangementPricing.getBasePrice())
                .additionalFee(BigDecimal.ZERO)
                .totalPrice(totalPrice)
                .currency(arrangementPricing.getCurrency())
                .breakdown(breakdown)
                .build();
    }

    /**
     * Tạo pricing matrix mới
     * 1 ServiceType chỉ có 1 PricingMatrix
     */
    @Transactional
    public PricingMatrixResponse createPricing(CreatePricingMatrixRequest request) {
        // Kiểm tra duplicate: 1 ServiceType chỉ có 1 PricingMatrix
        if (pricingMatrixRepository.existsByServiceType(request.getServiceType())) {
            throw PricingMatrixDuplicateException.create(request.getServiceType());
        }
        
        PricingMatrix pricing = PricingMatrix.builder()
                .serviceType(request.getServiceType())
                .unitType(request.getUnitType())
                .basePrice(request.getBasePrice())
                .currency(request.getCurrency() != null ? request.getCurrency() : CurrencyType.VND)
                .description(request.getDescription())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        
        PricingMatrix saved = pricingMatrixRepository.save(pricing);
        log.info("Created pricing matrix: pricingId={}, serviceType={}, unitType={}, basePrice={}", 
                saved.getPricingId(), saved.getServiceType(), saved.getUnitType(), saved.getBasePrice());
        
        return mapToResponse(saved);
    }

    /**
     * Cập nhật pricing matrix
     */
    @Transactional
    public PricingMatrixResponse updatePricing(String pricingId, UpdatePricingMatrixRequest request) {
        PricingMatrix pricing = pricingMatrixRepository.findById(pricingId)
                .orElseThrow(() -> PricingMatrixNotFoundException.byId(pricingId));
        
        if (request.getUnitType() != null) {
            pricing.setUnitType(request.getUnitType());
        }
        if (request.getBasePrice() != null) {
            pricing.setBasePrice(request.getBasePrice());
        }
        if (request.getCurrency() != null) {
            pricing.setCurrency(request.getCurrency());
        }
        if (request.getDescription() != null) {
            pricing.setDescription(request.getDescription());
        }
        if (request.getIsActive() != null) {
            pricing.setActive(request.getIsActive());
        }
        
        PricingMatrix saved = pricingMatrixRepository.save(pricing);
        log.info("Updated pricing matrix: pricingId={}", saved.getPricingId());
        
        return mapToResponse(saved);
    }

    /**
     * Xóa pricing matrix (soft delete)
     */
    @Transactional
    public void deletePricing(String pricingId) {
        PricingMatrix pricing = pricingMatrixRepository.findById(pricingId)
                .orElseThrow(() -> PricingMatrixNotFoundException.byId(pricingId));
        
        pricing.setActive(false);
        pricingMatrixRepository.save(pricing);
        log.info("Deleted pricing matrix (soft): pricingId={}", pricingId);
    }

    private PricingMatrixResponse mapToResponse(PricingMatrix pricing) {
        return PricingMatrixResponse.builder()
                .pricingId(pricing.getPricingId())
                .serviceType(pricing.getServiceType())
                .unitType(pricing.getUnitType())
                .basePrice(pricing.getBasePrice())
                .currency(pricing.getCurrency())
                .description(pricing.getDescription())
                .isActive(pricing.isActive())
                .createdAt(pricing.getCreatedAt())
                .updatedAt(pricing.getUpdatedAt())
                .build();
    }
}

