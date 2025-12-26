package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EquipmentRepository extends JpaRepository<Equipment, String> {
    
    /**
     * Tìm equipment theo brand và model (unique constraint)
     */
    Optional<Equipment> findByBrandAndModel(String brand, String model);
    
    /**
     * Lấy tất cả active equipment
     */
    List<Equipment> findByIsActiveTrue();
    
    /**
     * Lấy equipment theo list IDs
     */
    List<Equipment> findByEquipmentIdIn(List<String> equipmentIds);
    
    /**
     * Tìm equipment theo tên (case-insensitive)
     */
    Optional<Equipment> findByEquipmentNameIgnoreCase(String equipmentName);
    
    /**
     * Lấy equipment available (available_quantity > 0) và active
     */
    @Query("SELECT e FROM Equipment e WHERE e.isActive = true " +
           "AND e.availableQuantity > 0")
    List<Equipment> findAvailableActiveEquipment();
    
    /**
     * Lấy tất cả equipment active (kể cả đã hết)
     */
    @Query("SELECT e FROM Equipment e WHERE e.isActive = true")
    List<Equipment> findAllActiveEquipment();
    
    /**
     * Lấy equipment active và còn hàng (availableQuantity > 0)
     */
    @Query("SELECT e FROM Equipment e WHERE e.isActive = true " +
           "AND e.availableQuantity > 0")
    List<Equipment> findActiveEquipmentWithStock();
    
    /**
     * Lấy tất cả equipment (kể cả inactive) nhưng chỉ lấy equipment còn hàng (availableQuantity > 0)
     */
    @Query("SELECT e FROM Equipment e WHERE e.availableQuantity > 0")
    List<Equipment> findAllEquipmentWithStock();
    
    /**
     * Lấy equipment theo skill_id (thông qua skill_equipment_mapping)
     * Chỉ lấy equipment available (còn trong kho) và active
     */
    @Query("SELECT DISTINCT e FROM Equipment e " +
           "INNER JOIN SkillEquipmentMapping sem ON e.equipmentId = sem.equipment.equipmentId " +
           "WHERE sem.skillId = :skillId " +
           "AND e.isActive = true " +
           "AND e.availableQuantity > 0")
    List<Equipment> findAvailableEquipmentBySkillId(@Param("skillId") String skillId);
    
    /**
     * Lấy equipment theo skill_id (kể cả unavailable) - chỉ active
     */
    @Query("SELECT DISTINCT e FROM Equipment e " +
           "INNER JOIN SkillEquipmentMapping sem ON e.equipmentId = sem.equipment.equipmentId " +
           "WHERE sem.skillId = :skillId " +
           "AND e.isActive = true")
    List<Equipment> findEquipmentBySkillId(@Param("skillId") String skillId);
    
    /**
     * Lấy equipment theo skill_id và filter theo availableQuantity
     * @param skillId Skill ID
     * @param includeOutOfStock Nếu true, lấy cả equipment đã hết (availableQuantity = 0)
     */
    @Query("SELECT DISTINCT e FROM Equipment e " +
           "INNER JOIN SkillEquipmentMapping sem ON e.equipmentId = sem.equipment.equipmentId " +
           "WHERE sem.skillId = :skillId " +
           "AND e.isActive = true " +
           "AND (:includeOutOfStock = true OR e.availableQuantity > 0)")
    List<Equipment> findEquipmentBySkillIdWithStockFilter(
        @Param("skillId") String skillId,
        @Param("includeOutOfStock") boolean includeOutOfStock);
    
    /**
     * Đếm số equipment available (availableQuantity > 0 && isActive = true)
     */
    @Query("SELECT COUNT(e) FROM Equipment e WHERE e.isActive = true AND e.availableQuantity > 0")
    long countByIsActiveTrueAndAvailableQuantityGreaterThanZero();
    
    /**
     * Đếm số equipment maintenance (availableQuantity = 0 hoặc isActive = false)
     */
    @Query("SELECT COUNT(e) FROM Equipment e WHERE e.availableQuantity = 0 OR e.isActive = false")
    long countMaintenanceEquipment();
}

