package com.mutrapro.request_service.repository;

import com.mutrapro.request_service.entity.NotationInstrument;
import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotationInstrumentRepository extends JpaRepository<NotationInstrument, String> {
    List<NotationInstrument> findByIsActiveTrueAndUsageIn(List<NotationInstrumentUsage> usages);
    List<NotationInstrument> findByIsActiveTrue();
}


