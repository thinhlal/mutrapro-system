package com.mutrapro.request_service.repository;

import com.mutrapro.request_service.entity.Equipment;
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
     * Lấy equipment available (total_quantity > 0) và active
     */
    @Query("SELECT e FROM Equipment e WHERE e.isActive = true " +
           "AND e.totalQuantity > 0")
    List<Equipment> findAvailableActiveEquipment();
    
    /**
     * Lấy equipment theo skill_id (thông qua skill_equipment_mapping)
     * Chỉ lấy equipment available (còn trong kho) và active
     */
    @Query("SELECT DISTINCT e FROM Equipment e " +
           "INNER JOIN SkillEquipmentMapping sem ON e.equipmentId = sem.equipment.equipmentId " +
           "WHERE sem.skillId = :skillId " +
           "AND e.isActive = true " +
           "AND e.totalQuantity > 0")
    List<Equipment> findAvailableEquipmentBySkillId(@Param("skillId") String skillId);
    
    /**
     * Lấy equipment theo skill_id (kể cả unavailable)
     */
    @Query("SELECT DISTINCT e FROM Equipment e " +
           "INNER JOIN SkillEquipmentMapping sem ON e.equipmentId = sem.equipment.equipmentId " +
           "WHERE sem.skillId = :skillId " +
           "AND e.isActive = true")
    List<Equipment> findEquipmentBySkillId(@Param("skillId") String skillId);
}

