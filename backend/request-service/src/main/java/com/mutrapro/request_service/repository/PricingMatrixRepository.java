package com.mutrapro.request_service.repository;

import com.mutrapro.request_service.entity.PricingMatrix;
import com.mutrapro.request_service.enums.CurrencyType;
import com.mutrapro.request_service.enums.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PricingMatrixRepository extends JpaRepository<PricingMatrix, String> {
    
    /**
     * Tìm pricing theo service type (chỉ active)
     * 1 ServiceType chỉ có 1 PricingMatrix
     */
    Optional<PricingMatrix> findByServiceTypeAndIsActiveTrue(ServiceType serviceType);
    
    /**
     * Tìm pricing theo service type (cả active và inactive)
     * 1 ServiceType chỉ có 1 PricingMatrix
     */
    Optional<PricingMatrix> findByServiceType(ServiceType serviceType);
    
    /**
     * Tìm tất cả pricing theo currency (chỉ active)
     */
    List<PricingMatrix> findByCurrencyAndIsActiveTrue(CurrencyType currency);
    
    /**
     * Tìm tất cả pricing active
     */
    List<PricingMatrix> findByIsActiveTrue();
    
    /**
     * Kiểm tra xem đã có pricing cho service type chưa
     * 1 ServiceType chỉ có 1 PricingMatrix
     */
    boolean existsByServiceType(ServiceType serviceType);
    
    /**
     * Tìm tất cả pricing theo currency (cả active và inactive)
     */
    List<PricingMatrix> findByCurrency(CurrencyType currency);
}
