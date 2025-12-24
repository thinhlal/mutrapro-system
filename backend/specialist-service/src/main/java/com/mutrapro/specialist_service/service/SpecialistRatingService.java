package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.client.ProjectServiceFeignClient;
import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.exception.SpecialistNotFoundException;
import com.mutrapro.specialist_service.repository.SpecialistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Service để update specialist rating từ reviews
 * Rating được tính từ project-service (reviews table)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SpecialistRatingService {

    private final SpecialistRepository specialistRepository;
    private final ProjectServiceFeignClient projectServiceFeignClient;

    /**
     * Update specialist rating bằng cách gọi project-service để lấy average rating
     * và update vào specialist.rating
     */
    @Transactional
    public void updateSpecialistRatingFromReview(String specialistId) {
        log.info("Updating specialist rating: specialistId={}", specialistId);

        // Get specialist
        Specialist specialist = specialistRepository.findById(specialistId)
                .orElseThrow(() -> SpecialistNotFoundException.byId(specialistId));

        try {
            // Call project-service to get average rating
            Double averageRating = projectServiceFeignClient.getAverageRatingBySpecialistId(specialistId);
            
            if (averageRating != null) {
                // Convert to BigDecimal with 2 decimal places
                BigDecimal rating = BigDecimal.valueOf(averageRating)
                        .setScale(2, RoundingMode.HALF_UP);
                
                specialist.setRating(rating);
                specialist.setReviews(specialist.getReviews() != null ? specialist.getReviews() + 1 : 1);
                specialistRepository.save(specialist);
                
                log.info("Updated specialist rating: specialistId={}, newRating={}, totalReviews={}", 
                        specialistId, rating, specialist.getReviews());
            } else {
                log.warn("No average rating returned from project-service for specialistId={}", specialistId);
            }
        } catch (Exception e) {
            log.error("Failed to update specialist rating from project-service: specialistId={}, error={}", 
                    specialistId, e.getMessage(), e);
            // Không throw exception để không fail event processing
            // Rating sẽ được update ở lần retry tiếp theo
        }
    }
}

