package com.mutrapro.request_service.repository;

import com.mutrapro.request_service.entity.RequestNotationInstrument;
import com.mutrapro.request_service.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface RequestNotationInstrumentRepository extends JpaRepository<RequestNotationInstrument, UUID> {
    
    /**
     * Find all RequestNotationInstrument by ServiceRequest's requestId
     * Uses relationship navigation: serviceRequest.requestId
     */
    List<RequestNotationInstrument> findByServiceRequest_RequestId(String requestId);
    
    /**
     * Find all RequestNotationInstrument by ServiceRequest entity
     */
    List<RequestNotationInstrument> findByServiceRequest(ServiceRequest serviceRequest);
    
    /**
     * Delete all RequestNotationInstrument by ServiceRequest's requestId
     */
    void deleteByServiceRequest_RequestId(String requestId);
    
    /**
     * Delete all RequestNotationInstrument by ServiceRequest entity
     */
    void deleteByServiceRequest(ServiceRequest serviceRequest);
    
    /**
     * Đếm số lần sử dụng của mỗi instrument (để tìm most used)
     * Returns list of Object arrays where [0] = instrumentId, [1] = count
     */
    @Query("SELECT rni.notationInstrument.instrumentId, COUNT(rni) " +
           "FROM RequestNotationInstrument rni " +
           "GROUP BY rni.notationInstrument.instrumentId " +
           "ORDER BY COUNT(rni) DESC")
    List<Object[]> countUsageByInstrument();
}

