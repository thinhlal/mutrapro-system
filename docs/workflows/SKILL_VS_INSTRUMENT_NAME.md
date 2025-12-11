# 📝 Skill ID vs Instrument Name - Design Decision

## ✅ QUYẾT ĐỊNH: Dùng `skill_id` làm chính

### Lý do:

1. **Hệ thống ĐÃ CÓ skill catalogue rõ ràng:**
   - `skills` table trong specialist-service
   - Có sẵn: "Vocal", "Piano Performance", "Guitar Performance", "Guitar Transcription", etc.
   - Skills có `skill_type` (TRANSCRIPTION, ARRANGEMENT, RECORDING_ARTIST)
   - Recording skills có `recording_category` (VOCAL, INSTRUMENT)

2. **Ưu điểm dùng `skill_id`:**
   - ✅ **Normalized**: Không lưu string tự do → tránh typo, inconsistency
   - ✅ **Type-safe**: Đảm bảo skill tồn tại trong catalogue
   - ✅ **Queryable**: Dễ filter theo skill_type, recording_category
   - ✅ **Tích hợp tốt**: Dễ link với `skill_equipment_mapping` để suggest equipment phù hợp
   - ✅ **Consistency**: Cùng một skill được dùng thống nhất trong toàn hệ thống

3. **Không cần `instrument_name`:**
   - ❌ Stringly typed → dễ typo, khó maintain
   - ❌ Không có constraint → có thể nhập bất kỳ string nào
   - ✅ Thay vào đó: JOIN với `skills` table để lấy `skill_name` khi cần display

---

## 📋 Implementation

### Table Design:

```sql
Table booking_participants {
  participant_id uuid [pk]
  booking_id uuid [not null]
  
  -- Vai trò
  role_type session_role_type [not null] -- VOCAL | INSTRUMENT
  performer_source performer_source [not null] -- CUSTOMER_SELF | INTERNAL_ARTIST
  
  -- Skill (BẮT BUỘC)
  skill_id uuid [not null] -- Soft ref to specialist-service (skills table)
  -- KHÔNG có instrument_name field!
  
  -- Nếu là INSTRUMENT
  instrument_source instrument_source [nullable] -- STUDIO_SIDE | CUSTOMER_SIDE
  equipment_id uuid [nullable] -- Ref to equipment (nếu STUDIO_SIDE)
  
  -- Nếu là INTERNAL_ARTIST
  specialist_id uuid [nullable] -- Soft ref to specialist-service
  
  -- Phí
  participant_fee decimal(12,2) [default: 0]
  
  indexes {
    booking_id
    skill_id -- Index để JOIN với skills table
    specialist_id
  }
}
```

### Logic Mapping:

**VOCAL role:**
- `skill_id` → Skills có `recording_category = 'VOCAL'`
- VD: "Vocal", "Soprano", "Alto", "Tenor", "Bass Voice"

**INSTRUMENT role:**
- `skill_id` → Skills có `recording_category = 'INSTRUMENT'`
- VD: "Piano Performance", "Guitar Performance", "Drums Performance", etc.

---

## 🔄 Frontend Implementation

### API Response:

```json
{
  "participants": [
    {
      "participantId": "...",
      "roleType": "INSTRUMENT",
      "performerSource": "INTERNAL_ARTIST",
      "skillId": "<guitar_performance_skill_id>",
      "skillName": "Guitar Performance", // Denormalized từ skills table (display only)
      "specialistId": "...",
      "instrumentSource": "STUDIO_SIDE",
      "equipmentId": "...",
      "participantFee": 500000
    }
  ]
}
```

### UI Flow:

1. **Khi chọn instrument:**
   - Gọi API: `GET /api/skills?skill_type=RECORDING_ARTIST&recording_category=INSTRUMENT`
   - Hiển thị dropdown: "Guitar Performance", "Piano Performance", "Drums Performance", etc.
   - User chọn skill → lưu `skill_id`

2. **Khi display booking:**
   - JOIN `booking_participants` với `skills` table (via skill_id)
   - Hiển thị `skill_name` cho user

---

## ⚠️ Migration từ data cũ (nếu có)

Nếu có data cũ dùng `instrument_name` (string):

```sql
-- Step 1: Tìm skill tương ứng
-- VD: instrument_name = "Guitar" → skill_name = "Guitar Performance"

-- Step 2: Update booking_participants
UPDATE booking_participants bp
SET skill_id = (
  SELECT skill_id 
  FROM skills 
  WHERE skill_name = bp.instrument_name || ' Performance'
  AND skill_type = 'RECORDING_ARTIST'
  AND recording_category = 'INSTRUMENT'
  LIMIT 1
)
WHERE role_type = 'INSTRUMENT' 
AND instrument_name IS NOT NULL
AND skill_id IS NULL;

-- Step 3: Drop instrument_name column sau khi verify
ALTER TABLE booking_participants DROP COLUMN instrument_name;
```

---

## ✅ Kết luận

- **Dùng `skill_id` làm chính** (reference đến skills catalogue)
- **KHÔNG cần `instrument_name`** (JOIN từ skills table nếu cần display)
- **Denormalize `skill_name` trong response** chỉ để display (không lưu trong DB)

