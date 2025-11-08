package com.mutrapro.request_service.repository;

import com.mutrapro.request_service.entity.NotationInstrument;
import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotationInstrumentRepository extends JpaRepository<NotationInstrument, String> {
    List<NotationInstrument> findByIsActiveTrueAndUsageIn(List<NotationInstrumentUsage> usages);
    List<NotationInstrument> findByIsActiveTrue();
    List<NotationInstrument> findByUsageIn(List<NotationInstrumentUsage> usages);
    
    /**
     * Tìm instrument theo tên (case-insensitive)
     * @param instrumentName tên nhạc cụ (không phân biệt hoa thường)
     * @return Optional<NotationInstrument>
     */
    Optional<NotationInstrument> findByInstrumentNameIgnoreCase(String instrumentName);
}


