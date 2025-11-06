package com.mutrapro.request_service.service;

import com.mutrapro.request_service.entity.NotationInstrument;
import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import com.mutrapro.request_service.repository.NotationInstrumentRepository;
import com.mutrapro.request_service.dto.response.NotationInstrumentResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Transactional(readOnly = true)
public class NotationInstrumentService {

    NotationInstrumentRepository notationInstrumentRepository;

    public List<NotationInstrumentResponse> getActiveInstruments(NotationInstrumentUsage usage) {
        List<NotationInstrument> instruments;
        
        if (usage == null) {
            log.debug("Fetching all active notation instruments");
            instruments = notationInstrumentRepository.findByIsActiveTrue();
        } else {
            List<NotationInstrumentUsage> usagesToQuery;
            switch (usage) {
                case transcription:
                    // transcription + both (vì both cũng hỗ trợ transcription)
                    usagesToQuery = List.of(NotationInstrumentUsage.transcription, NotationInstrumentUsage.both);
                    break;
                case arrangement:
                    // arrangement + both (vì both cũng hỗ trợ arrangement)
                    usagesToQuery = List.of(NotationInstrumentUsage.arrangement, NotationInstrumentUsage.both);
                    break;
                case both:
                    // both lấy tất cả (transcription, arrangement, both)
                    usagesToQuery = List.of(
                            NotationInstrumentUsage.transcription,
                            NotationInstrumentUsage.arrangement,
                            NotationInstrumentUsage.both
                    );
                    break;
                default:
                    usagesToQuery = List.of(usage);
            }
            log.debug("Fetching active notation instruments for usage: {} (querying: {})", usage, usagesToQuery);
            instruments = notationInstrumentRepository.findByIsActiveTrueAndUsageIn(usagesToQuery);
        }
        
        return instruments.stream()
                .map(e -> NotationInstrumentResponse.builder()
                        .instrumentId(e.getInstrumentId())
                        .instrumentName(e.getInstrumentName())
                        .usage(e.getUsage())
                        .isActive(e.isActive())
                        .build())
                .collect(Collectors.toList());
    }
}


