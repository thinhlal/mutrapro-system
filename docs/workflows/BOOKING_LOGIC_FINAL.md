# 🎯 BOOKING LOGIC - CHỐT LẠI LOGIC CUỐI CÙNG

## 📋 TỔNG QUAN

Luồng Booking (Recording) phải hỗ trợ **5 combo scenarios**:
1. Customer thuê nhạc cụ để tự chơi
2. Customer thuê instrumentalist để chơi nhạc cụ
3. Customer tự hát + instrumentalist chơi nhạc cụ
4. Customer tự hát + tự chơi nhạc cụ thuê
5. Customer thuê cả vocal + instrumentalist, khách chỉ ngồi nghe

---

## 🗄️ DATA MODEL

### Table: `booking_participants`

```sql
Table booking_participants {
  participant_id uuid [pk]
  booking_id uuid [not null]
  
  -- Vai trò
  role_type session_role_type [not null] -- VOCAL | INSTRUMENT
  performer_source performer_source [not null] -- CUSTOMER_SELF | INTERNAL_ARTIST
  
  -- Nếu là INTERNAL_ARTIST
  specialist_id uuid [nullable] -- Soft ref to specialist-service
  
  -- Skill (CHỈ CHO INSTRUMENT)
  skill_id uuid [nullable] -- Soft ref to specialist-service (skills table)
  -- LƯU Ý: 
  -- - VOCAL: skill_id = null (vocal không cần skill_id)
  -- - INSTRUMENT: skill_id BẮT BUỘC (để biết là instrument gì và filter equipment)
  
  -- Nếu là INSTRUMENT
  instrument_source instrument_source [nullable] -- STUDIO_SIDE | CUSTOMER_SIDE (chỉ cho INSTRUMENT)
  equipment_id uuid [nullable] -- Ref to equipment (chỉ cho INSTRUMENT, nếu STUDIO_SIDE)
  -- LƯU Ý: equipment_id PHẢI match với skill_id qua skill_equipment_mapping (nếu STUDIO_SIDE)
  
  -- Phí
  participant_fee decimal(12,2) [default: 0] -- CHỈ fee của performer (artist fee), KHÔNG bao gồm equipment rental
  
  -- Metadata
  is_primary boolean [default: false]
  notes text
  
  indexes {
    booking_id
    skill_id
    specialist_id
    equipment_id
  }
}
```

### Table: `booking_required_equipment`

```sql
Table booking_required_equipment {
  booking_equipment_id uuid [pk]
  booking_id uuid [not null]
  equipment_id uuid [not null]
  quantity integer [default: 1]
  rental_fee_per_unit decimal(12,2) [not null]
  total_rental_fee decimal(12,2) [not null]
  
  participant_id uuid [nullable] -- Ref to booking_participants (optional)
  
  indexes {
    booking_id
    equipment_id
    (booking_id, equipment_id) [unique]
  }
}
```

**LƯU Ý:** CHỈ lưu equipment có `instrument_source = STUDIO_SIDE` (cần tính phí thuê)

---

## 🔑 KEY LOGIC

### 1. VOCAL vs INSTRUMENT

| Role | skill_id | equipment_id | instrument_source | Lý do |
|------|----------|--------------|-------------------|-------|
| **VOCAL** | ❌ **null** | ❌ null | ❌ null | Chỉ cần biết là "hát", không cần skill cụ thể |
| **INSTRUMENT** | ✅ **Required** | ✅ Optional (nếu STUDIO_SIDE) | ✅ Optional (nếu INSTRUMENT) | Cần biết instrument gì để filter equipment |

### 2. Equipment - Skill Mapping

**CHỈ ÁP DỤNG CHO INSTRUMENT:**

- Equipment PHẢI match với skill_id qua `skill_equipment_mapping`
- Flow:
  1. User chọn skill_id TRƯỚC (VD: "Guitar Performance")
  2. Backend filter equipment theo skill_id
  3. User chọn equipment từ filtered list (nếu STUDIO_SIDE)
  4. Validation: equipment_id PHẢI có trong skill_equipment_mapping cho skill_id đó

### 3. Tính phí (TRÁNH DOUBLE COUNT)

```java
// artist_fee = SUM participant_fee WHERE performer_source = INTERNAL_ARTIST
artistFee = participants.stream()
    .filter(p -> p.getPerformerSource() == PerformerSource.INTERNAL_ARTIST)
    .map(BookingParticipant::getParticipantFee)
    .reduce(BigDecimal.ZERO, BigDecimal::add);

// equipment_rental_fee = SUM total_rental_fee từ booking_required_equipment
equipmentRentalFee = bookingRequiredEquipments.stream()
    .map(BookingRequiredEquipment::getTotalRentalFee)
    .reduce(BigDecimal.ZERO, BigDecimal::add);

// total_cost = studio_rate + artist_fee + equipment_rental_fee + admin_fee + external_guest_fee
```

**✅ Rõ ràng phân tách:**
- `participant_fee` = CHỈ fee của performer (artist)
- `equipment_rental_fee` = CHỈ từ booking_required_equipment
- KHÔNG cộng equipment fee vào participant_fee → tránh double count

---

## 🔒 VALIDATION

```java
public void validateParticipant(BookingParticipant participant) {
    if (participant.getRoleType() == SessionRoleType.VOCAL) {
        // VOCAL: KHÔNG có skill_id, equipment_id, instrument_source
        if (participant.getSkillId() != null) {
            throw new ValidationException("VOCAL participants cannot have skill_id");
        }
        if (participant.getEquipmentId() != null) {
            throw new ValidationException("VOCAL participants cannot have equipment_id");
        }
        if (participant.getInstrumentSource() != null) {
            throw new ValidationException("VOCAL participants cannot have instrument_source");
        }
    }
    
    if (participant.getRoleType() == SessionRoleType.INSTRUMENT) {
        // INSTRUMENT: BẮT BUỘC phải có skill_id
        if (participant.getSkillId() == null) {
            throw new ValidationException("INSTRUMENT participants must have skill_id");
        }
        
        // Validate skill is INSTRUMENT type
        Skill skill = skillService.findById(participant.getSkillId());
        if (skill.getRecordingCategory() != RecordingCategory.INSTRUMENT) {
            throw new ValidationException("Skill must be an INSTRUMENT skill");
        }
        
        // Validate equipment matches skill (nếu STUDIO_SIDE)
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
        
        // If CUSTOMER_SIDE, equipment_id should be null
        if (participant.getInstrumentSource() == InstrumentSource.CUSTOMER_SIDE) {
            participant.setEquipmentId(null);
        }
    }
}
```

---

## 📊 VÍ DỤ DATA CHO 5 COMBO

### Combo 1: Customer thuê nhạc cụ tự chơi
```sql
-- Vocal (nếu có)
{ role_type: VOCAL, performer_source: CUSTOMER_SELF, 
  skill_id: null, equipment_id: null, instrument_source: null, participant_fee: 0 }

-- Instrument
{ role_type: INSTRUMENT, performer_source: CUSTOMER_SELF, 
  skill_id: <guitar_performance_skill_id>, 
  instrument_source: STUDIO_SIDE, 
  equipment_id: <guitar_equipment_id>, participant_fee: 0 }
```

### Combo 2: Customer thuê instrumentalist
```sql
-- Instrument
{ role_type: INSTRUMENT, performer_source: INTERNAL_ARTIST,
  specialist_id: <guitarist_id>, 
  skill_id: <guitar_performance_skill_id>,
  instrument_source: STUDIO_SIDE, equipment_id: <guitar_id>,
  participant_fee: 500000 } -- CHỈ artist_fee
```

### Combo 3: Customer tự hát + instrumentalist chơi
```sql
-- Vocal
{ role_type: VOCAL, performer_source: CUSTOMER_SELF, 
  skill_id: null, equipment_id: null, instrument_source: null, participant_fee: 0 }

-- Instrument
{ role_type: INSTRUMENT, performer_source: INTERNAL_ARTIST,
  specialist_id: <pianist_id>, 
  skill_id: <piano_performance_skill_id>,
  instrument_source: STUDIO_SIDE, equipment_id: <piano_id>,
  participant_fee: 600000 }
```

### Combo 4: Customer tự hát + tự chơi nhạc cụ thuê
```sql
-- Vocal
{ role_type: VOCAL, performer_source: CUSTOMER_SELF, 
  skill_id: null, equipment_id: null, instrument_source: null, participant_fee: 0 }

-- Instrument
{ role_type: INSTRUMENT, performer_source: CUSTOMER_SELF,
  skill_id: <guitar_performance_skill_id>,
  instrument_source: STUDIO_SIDE, equipment_id: <guitar_id>, 
  participant_fee: 0 }
```

### Combo 5: Customer thuê cả vocal + instrumentalist
```sql
-- Vocal
{ role_type: VOCAL, performer_source: INTERNAL_ARTIST,
  specialist_id: <vocalist_id>, 
  skill_id: null, equipment_id: null, instrument_source: null,
  participant_fee: 500000, is_primary: true }

-- Instrument
{ role_type: INSTRUMENT, performer_source: INTERNAL_ARTIST,
  specialist_id: <pianist_id>, 
  skill_id: <piano_performance_skill_id>,
  instrument_source: STUDIO_SIDE, equipment_id: <piano_id>,
  participant_fee: 600000 }
```

---

## 📝 UI/UX FLOW

### Step 1: Chọn Slot
- Customer chọn ngày, giờ, duration
- Check studio availability

### Step 2: Vocal Setup
```
Section: "Ai sẽ hát trong buổi thu này?"

○ Không thu vocal
○ Tôi tự hát
  → KHÔNG cần chọn skill_id (backend tự xử lý)
○ Tôi muốn thuê ca sĩ nội bộ
  → Chọn vocalist từ list available
  → KHÔNG cần chọn skill_id (specialist_id đã đủ)
○ Tôi tự hát & thuê thêm ca sĩ nội bộ
  → Tương tự như trên
```

### Step 3: Instrument Setup
```
Section: "Nhạc cụ trong buổi thu"

[ ] Không, chỉ dùng beat/backing track
[✓] Có, sử dụng nhạc cụ live

[Nếu chọn có nhạc cụ]
→ Bước 1: Chọn loại nhạc cụ (skill_id) - BẮT BUỘC
  → API: GET /api/skills?skill_type=RECORDING_ARTIST&recording_category=INSTRUMENT
  → Chọn: "Guitar Performance", "Piano Performance", etc.

→ Bước 2: Sau khi chọn skill
  └─ Ai sẽ chơi?
      ○ Tôi tự chơi
      ○ Thuê instrumentalist nội bộ
         → Chọn specialist có skill này
  
  └─ Nhạc cụ lấy từ đâu?
      ○ Tôi tự mang (CUSTOMER_SIDE) → Không cần chọn equipment
      ○ Thuê nhạc cụ của studio (STUDIO_SIDE)
         → API: GET /api/equipment?skill_id=<skill_id>
         → Filter equipment từ skill_equipment_mapping
         → Chọn equipment (chỉ hiển thị equipment phù hợp với skill)
      ○ Artist tự mang (CUSTOMER_SIDE) → Không cần chọn equipment
```

---

## ✅ CHECKLIST

### Phase 1: Data Model
- [x] Table `booking_participants` (skill_id nullable, chỉ cho INSTRUMENT)
- [x] Table `booking_required_equipment`
- [x] Validation logic cho VOCAL (không có skill_id, equipment_id)
- [x] Validation logic cho INSTRUMENT (bắt buộc skill_id, equipment match skill)

### Phase 2: Backend API
- [ ] API tạo booking với participants
- [ ] API tính toán phí tự động
- [ ] API list available artists theo slot
- [ ] API list available equipment theo skill_id
- [ ] Validation equipment match skill_id

### Phase 3: Frontend
- [ ] UI Step 1: Slot selection
- [ ] UI Step 2: Vocal setup (không cần chọn skill)
- [ ] UI Step 3: Instrument setup (chọn skill trước → filter equipment)
- [ ] UI Summary: Breakdown phí chi tiết

### Phase 4: Testing
- [ ] Test 5 combo scenarios
- [ ] Test validation (VOCAL không có skill_id, INSTRUMENT bắt buộc skill_id)
- [ ] Test equipment filtering theo skill_id
- [ ] Test tính phí đúng (không double count)

---

## 🎯 TÓM TẮT

1. **VOCAL**: KHÔNG cần skill_id, equipment_id, instrument_source
2. **INSTRUMENT**: Bắt buộc skill_id, có equipment_id (nếu STUDIO_SIDE), equipment PHẢI match skill_id
3. **Phí**: participant_fee và equipment_rental_fee tách biệt, không double count
4. **Equipment**: Filter theo skill_id qua skill_equipment_mapping
5. **5 combo**: Đều được hỗ trợ với logic trên

---

## 📚 Files Reference

- Chi tiết phân tích: `BOOKING_LOGIC_ANALYSIS.md`
- Skill vs Instrument Name: `SKILL_VS_INSTRUMENT_NAME.md`
- Vocal vs Instrument Logic: `VOCAL_INSTRUMENT_SKILL_LOGIC.md`
- Equipment Skill Mapping: `EQUIPMENT_SKILL_MAPPING.md`

