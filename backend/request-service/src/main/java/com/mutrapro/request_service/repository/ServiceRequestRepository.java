package com.mutrapro.request_service.repository;

import com.mutrapro.request_service.entity.ServiceRequest;
import com.mutrapro.request_service.enums.RequestStatus;
import com.mutrapro.request_service.enums.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, String> {
    
    List<ServiceRequest> findByUserId(String userId);
    
    List<ServiceRequest> findByUserIdAndStatus(String userId, RequestStatus status);
    
    List<ServiceRequest> findByRequestType(ServiceType requestType);
    
    List<ServiceRequest> findByStatus(RequestStatus status);
    
    Optional<ServiceRequest> findByRequestId(String requestId);
    
    // Filter theo managerUserId
    List<ServiceRequest> findByManagerUserId(String managerUserId);
    
    // Filter theo status và requestType
    List<ServiceRequest> findByStatusAndRequestType(RequestStatus status, ServiceType requestType);
    
    // Filter theo status và managerUserId
    List<ServiceRequest> findByStatusAndManagerUserId(RequestStatus status, String managerUserId);
    
    // Filter theo requestType và managerUserId
    List<ServiceRequest> findByRequestTypeAndManagerUserId(ServiceType requestType, String managerUserId);
    
    // Filter theo cả 3 điều kiện
    List<ServiceRequest> findByStatusAndRequestTypeAndManagerUserId(
            RequestStatus status, ServiceType requestType, String managerUserId);
}

