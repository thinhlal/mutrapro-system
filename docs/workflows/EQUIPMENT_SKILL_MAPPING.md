# 🎸 Equipment - Skill Mapping Logic

## ✅ QUAN TRỌNG: Equipment PHẢI theo skill_id - CHỈ CHO INSTRUMENT

### Logic:

**⚠️ LƯU Ý: VOCAL KHÔNG có equipment! Chỉ INSTRUMENT mới có equipment.**

**Equipment chỉ được chọn nếu có trong `skill_equipment_mapping` cho skill_id đó**
- **VOCAL**: skill_id (Vocal, Soprano, etc.) → KHÔNG có equipment
- **INSTRUMENT**: skill_id (Guitar Performance, Piano Performance, etc.) → CÓ equipment (nếu STUDIO_SIDE)

```
skill_id (VD: "Guitar Performance") 
  → skill_equipment_mapping 
    → equipment_id (VD: "Fender Stratocaster", "Gibson Les Paul")
```

---

## 📋 Flow - CHỈ CHO INSTRUMENT

### ⚠️ VOCAL KHÔNG CÓ EQUIPMENT
- VOCAL chỉ có skill_id (Vocal, Soprano, Alto, Tenor, etc.)
- KHÔNG có equipment_id, instrument_source

### 1. User chọn skill_id TRƯỚC (chỉ cho INSTRUMENT)
```
Step: Chọn loại nhạc cụ
→ API: GET /api/skills?skill_type=RECORDING_ARTIST&recording_category=INSTRUMENT
→ User chọn: "Guitar Performance" (skill_id = <guitar_performance_id>)
```

### 2. Backend filter equipment theo skill_id
```
Step: Sau khi chọn skill → Hiển thị equipment options
→ API: GET /api/equipment?skill_id=<guitar_performance_id>&available=true
→ Backend query:
  SELECT e.* 
  FROM equipment e
  JOIN skill_equipment_mapping sem ON e.equipment_id = sem.equipment_id
  WHERE sem.skill_id = <guitar_performance_id>
    AND e.is_active = true
    AND (e.total_quantity - e.maintenance_quantity) > 0
```

**Response:**
```json
{
  "equipment": [
    {
      "equipmentId": "<fender_stratocaster_id>",
      "equipmentName": "Fender Stratocaster",
      "brand": "Fender",
      "model": "Stratocaster",
      "rentalFee": 200000,
      "availableQuantity": 2
    },
    {
      "equipmentId": "<gibson_les_paul_id>",
      "equipmentName": "Gibson Les Paul",
      "brand": "Gibson",
      "model": "Les Paul",
      "rentalFee": 300000,
      "availableQuantity": 1
    }
  ]
}
```

### 3. User chọn equipment (chỉ từ filtered list)

**Nếu `instrument_source = STUDIO_SIDE`:**
- ✅ User BẮT BUỘC phải chọn equipment_id
- ✅ Equipment_id PHẢI có trong skill_equipment_mapping cho skill_id đó
- ✅ Validation: Backend check match trước khi save

**Nếu `instrument_source = CUSTOMER_SIDE`:**
- ✅ Không cần equipment_id (customer tự mang)
- ✅ Không cần validation

---

## 🔒 Validation Logic

```java
public void validateParticipant(BookingParticipant participant) {
    // ... existing validation ...
    
    if (participant.getRoleType() == SessionRoleType.VOCAL) {
        // VOCAL: KHÔNG có equipment_id, instrument_source
        if (participant.getEquipmentId() != null) {
            throw new ValidationException("VOCAL participants cannot have equipment_id");
        }
        if (participant.getInstrumentSource() != null) {
            throw new ValidationException("VOCAL participants cannot have instrument_source");
        }
        // Validate skill is VOCAL type
        Skill skill = skillService.findById(participant.getSkillId());
        if (skill.getRecordingCategory() != RecordingCategory.VOCAL) {
            throw new ValidationException("Skill must be a VOCAL skill");
        }
    }
    
    if (participant.getRoleType() == SessionRoleType.INSTRUMENT) {
        // Validate skill is INSTRUMENT type
        Skill skill = skillService.findById(participant.getSkillId());
        if (skill.getRecordingCategory() != RecordingCategory.INSTRUMENT) {
            throw new ValidationException("Skill must be an INSTRUMENT skill");
        }
        
        // Validate equipment matches skill (if STUDIO_SIDE)
        if (participant.getInstrumentSource() == InstrumentSource.STUDIO_SIDE) {
            if (participant.getEquipmentId() == null) {
                throw new ValidationException("Equipment ID is required when instrument_source = STUDIO_SIDE");
            }
            
            // Check skill_equipment_mapping
            boolean exists = skillEquipmentMappingRepository.existsBySkillIdAndEquipmentId(
                participant.getSkillId(), 
                participant.getEquipmentId()
            );
            if (!exists) {
                throw new ValidationException(
                    String.format("Equipment %s is not compatible with skill %s", 
                        participant.getEquipmentId(), 
                        participant.getSkillId())
                );
            }
        }
        
        // If CUSTOMER_SIDE, equipment_id should be null (customer tự mang)
        if (participant.getInstrumentSource() == InstrumentSource.CUSTOMER_SIDE) {
            participant.setEquipmentId(null);
        }
    }
}
```

---

## 🎯 Database Constraints

**Option 1: Application-level validation (Khuyến nghị)**
- Validation trong service layer
- Linh hoạt hơn, dễ handle edge cases

**Option 2: Database constraint**
```sql
-- Check constraint (optional - có thể phức tạp)
ALTER TABLE booking_participants
ADD CONSTRAINT chk_equipment_skill_match 
CHECK (
  (role_type = 'INSTRUMENT' AND instrument_source = 'STUDIO_SIDE' AND equipment_id IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM skill_equipment_mapping sem
    WHERE sem.skill_id = booking_participants.skill_id
      AND sem.equipment_id = booking_participants.equipment_id
  )
  OR
  (instrument_source = 'CUSTOMER_SIDE' OR role_type != 'INSTRUMENT')
);
```

---

## 📊 Examples

### Example 0: Vocal (KHÔNG có equipment)
```
role_type = VOCAL
skill_id = "Vocal" hoặc "Soprano", "Tenor", etc.
equipment_id = null ✅ (VOCAL không có equipment)
instrument_source = null ✅ (VOCAL không có instrument_source)
```

### Example 1: Guitar Performance + Studio Equipment
```
skill_id = "Guitar Performance"
instrument_source = STUDIO_SIDE
equipment_id = "Fender Stratocaster" ✅ (có trong skill_equipment_mapping)
```

### Example 2: Piano Performance + Customer Equipment
```
skill_id = "Piano Performance"
instrument_source = CUSTOMER_SIDE
equipment_id = null ✅ (không cần, customer tự mang)
```

### Example 3: Guitar Performance + Piano Equipment (ERROR)
```
skill_id = "Guitar Performance"
instrument_source = STUDIO_SIDE
equipment_id = "Yamaha C3 Piano" ❌ (KHÔNG có trong skill_equipment_mapping cho Guitar)
→ Validation error: "Equipment is not compatible with skill"
```

---

## ✅ Benefits

1. **Type-safe**: Đảm bảo equipment phù hợp với skill
2. **Data integrity**: Không thể chọn equipment sai (VD: Piano equipment cho Guitar skill)
3. **Better UX**: Frontend chỉ hiển thị equipment phù hợp
4. **Maintainable**: Admin quản lý mapping qua skill_equipment_mapping table

---

## 🔄 UI Flow Summary

```
1. User chọn skill: "Guitar Performance"
   ↓
2. Frontend gọi API: GET /api/equipment?skill_id=<guitar_id>
   ↓
3. Backend filter: Chỉ trả về guitar equipment
   ↓
4. User chọn: "Fender Stratocaster"
   ↓
5. Submit booking
   ↓
6. Backend validate: equipment_id match với skill_id?
   ↓
7. Save booking_participant
```

