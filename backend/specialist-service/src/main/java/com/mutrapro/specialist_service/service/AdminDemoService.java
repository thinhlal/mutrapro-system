package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.request.UpdateDemoVisibilityRequest;
import com.mutrapro.specialist_service.dto.response.ArtistDemoResponse;
import com.mutrapro.specialist_service.entity.ArtistDemo;
import com.mutrapro.specialist_service.exception.DemoNotFoundException;
import com.mutrapro.specialist_service.mapper.ArtistDemoMapper;
import com.mutrapro.specialist_service.repository.ArtistDemoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service cho Admin quản lý demo visibility
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDemoService {
    
    private final ArtistDemoRepository artistDemoRepository;
    private final ArtistDemoMapper artistDemoMapper;
    
    /**
     * Lấy tất cả demos (Admin only)
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public List<ArtistDemoResponse> getAllDemos() {
        log.info("Getting all demos");
        List<ArtistDemo> demos = artistDemoRepository.findAll();
        return artistDemoMapper.toArtistDemoResponseList(demos);
    }
    
    /**
     * Lấy demo theo ID (Admin only)
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ArtistDemoResponse getDemoById(String demoId) {
        log.info("Getting demo with ID: {}", demoId);
        ArtistDemo demo = artistDemoRepository.findById(demoId)
            .orElseThrow(() -> DemoNotFoundException.byId(demoId));
        return artistDemoMapper.toArtistDemoResponse(demo);
    }
    
    /**
     * Cập nhật visibility của demo (is_public, is_featured) - Admin only
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ArtistDemoResponse updateDemoVisibility(String demoId, UpdateDemoVisibilityRequest request) {
        log.info("Updating demo visibility for ID: {}", demoId);
        
        ArtistDemo demo = artistDemoRepository.findById(demoId)
            .orElseThrow(() -> DemoNotFoundException.byId(demoId));
        
        artistDemoMapper.updateVisibilityFromRequest(demo, request);
        
        ArtistDemo saved = artistDemoRepository.save(demo);
        log.info("Demo visibility updated successfully for ID: {}", demoId);
        
        return artistDemoMapper.toArtistDemoResponse(saved);
    }
}

