package com.mutrapro.request_service.repository;

import com.mutrapro.request_service.entity.SkillEquipmentMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SkillEquipmentMappingRepository extends JpaRepository<SkillEquipmentMapping, String> {
    
    /**
     * Tìm mapping theo skill_id và equipment_id
     */
    Optional<SkillEquipmentMapping> findBySkillIdAndEquipment_EquipmentId(String skillId, String equipmentId);
    
    /**
     * Lấy tất cả mappings theo skill_id
     */
    List<SkillEquipmentMapping> findBySkillId(String skillId);
    
    /**
     * Lấy tất cả mappings theo equipment_id
     */
    List<SkillEquipmentMapping> findByEquipment_EquipmentId(String equipmentId);
    
    /**
     * Kiểm tra xem skill_id có mapping với equipment_id không
     */
    boolean existsBySkillIdAndEquipment_EquipmentId(String skillId, String equipmentId);
    
    /**
     * Xóa mapping theo skill_id và equipment_id
     */
    void deleteBySkillIdAndEquipment_EquipmentId(String skillId, String equipmentId);
    
    /**
     * Xóa tất cả mappings của một equipment
     */
    void deleteByEquipment_EquipmentId(String equipmentId);
    
    /**
     * Lấy skill_ids được map với equipment_id
     */
    @Query("SELECT sem.skillId FROM SkillEquipmentMapping sem WHERE sem.equipment.equipmentId = :equipmentId")
    List<String> findSkillIdsByEquipmentId(@Param("equipmentId") String equipmentId);
}

