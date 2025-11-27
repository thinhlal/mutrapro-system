package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, String> {
    
    Optional<Contract> findByContractNumber(String contractNumber);
    
    List<Contract> findByRequestId(String requestId);
    
    List<Contract> findByUserId(String userId);
    
    List<Contract> findByManagerUserId(String managerUserId);
    
    List<Contract> findByStatus(ContractStatus status);
    
    @Query("SELECT c FROM Contract c WHERE c.requestId = :requestId AND c.status = :status")
    List<Contract> findByRequestIdAndStatus(@Param("requestId") String requestId, @Param("status") ContractStatus status);
    
    boolean existsByRequestId(String requestId);
    
    /**
     * Tìm contracts theo danh sách requestIds
     * @param requestIds Danh sách request IDs
     * @return Danh sách contracts
     */
    List<Contract> findByRequestIdIn(List<String> requestIds);
    
    /**
     * Lấy contract active hoặc latest cho nhiều requestIds trong 1 query
     * Với mỗi requestId: ưu tiên contract active, nếu không có thì lấy latest
     * @param requestIds Danh sách request IDs
     * @return Danh sách contracts (mỗi requestId có tối đa 1 contract)
     */
    @Query("SELECT c FROM Contract c " +
           "WHERE c.requestId IN :requestIds " +
           "AND (" +
           "  c.status IN (com.mutrapro.project_service.enums.ContractStatus.draft, " +
           "com.mutrapro.project_service.enums.ContractStatus.sent, " +
           "com.mutrapro.project_service.enums.ContractStatus.approved, " +
           "com.mutrapro.project_service.enums.ContractStatus.signed, " +
           "com.mutrapro.project_service.enums.ContractStatus.active, " +
           "com.mutrapro.project_service.enums.ContractStatus.active_pending_assignment) " +
           "  OR (c.createdAt = (" +
           "    SELECT MAX(c2.createdAt) FROM Contract c2 " +
           "    WHERE c2.requestId = c.requestId " +
           "    AND c2.requestId IN :requestIds" +
           "  ) " +
           "  AND NOT EXISTS (" +
           "    SELECT 1 FROM Contract c3 " +
           "    WHERE c3.requestId = c.requestId " +
           "    AND c3.status IN (com.mutrapro.project_service.enums.ContractStatus.draft, " +
           "com.mutrapro.project_service.enums.ContractStatus.sent, " +
           "com.mutrapro.project_service.enums.ContractStatus.approved, " +
           "com.mutrapro.project_service.enums.ContractStatus.signed, " +
           "com.mutrapro.project_service.enums.ContractStatus.active, " +
           "com.mutrapro.project_service.enums.ContractStatus.active_pending_assignment)" +
           "  ))" +
           ") " +
           "ORDER BY c.requestId, " +
           "CASE WHEN c.status IN (com.mutrapro.project_service.enums.ContractStatus.draft, " +
           "com.mutrapro.project_service.enums.ContractStatus.sent, " +
           "com.mutrapro.project_service.enums.ContractStatus.approved, " +
           "com.mutrapro.project_service.enums.ContractStatus.signed, " +
           "com.mutrapro.project_service.enums.ContractStatus.active, " +
           "com.mutrapro.project_service.enums.ContractStatus.active_pending_assignment) THEN 0 ELSE 1 END, " +
           "c.createdAt DESC")
    List<Contract> findActiveOrLatestContractsByRequestIds(@Param("requestIds") List<String> requestIds);
    
    /**
     * Tìm contracts đã hết hạn (expiresAt <= now) nhưng chưa có status là expired
     * và chưa được signed
     */
    @Query("SELECT c FROM Contract c WHERE c.expiresAt IS NOT NULL " +
           "AND c.expiresAt <= :now " +
           "AND c.status != com.mutrapro.project_service.enums.ContractStatus.expired " +
           "AND c.status != com.mutrapro.project_service.enums.ContractStatus.signed " +
           "AND c.status != com.mutrapro.project_service.enums.ContractStatus.active " +
           "AND c.status != com.mutrapro.project_service.enums.ContractStatus.active_pending_assignment " +
           "AND c.signedAt IS NULL")
    List<Contract> findExpiredContracts(@Param("now") Instant now);
    
    /**
     * Lấy requestId từ contractId (projection query - chỉ lấy requestId, không fetch toàn bộ contract)
     */
    @Query("SELECT c.requestId FROM Contract c WHERE c.contractId = :contractId")
    Optional<String> findRequestIdByContractId(@Param("contractId") String contractId);
}

