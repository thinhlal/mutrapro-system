# 📊 Phân Tích Logic Booking System - Luồng 3

## 🎯 YÊU CẦU MỚI

Luồng Booking (Recording) phải hỗ trợ **5 combo scenarios**:

1. ✅ Customer **thuê nhạc cụ** để **tự chơi** 🎸
2. ✅ Customer **thuê instrumentalist** để chơi nhạc cụ đó 🧑‍🎤🎹
3. ✅ Customer **tự hát** nhưng có **instrumentalist** chơi nhạc cụ
4. ✅ Customer **tự hát + tự chơi nhạc cụ thuê**
5. ✅ Customer **thuê cả vocal + instrumentalist**, khách chỉ ngồi nghe/đạo diễn 😆

---

## 📋 HIỆN TRẠNG SYSTEM

### A. Database Schema Hiện Tại

#### 1. `studio_bookings` Table
```sql
- artist_fee DECIMAL(12,2) -- Tổng phí nghệ sĩ (SUM từ booking_artists)
- equipment_rental_fee DECIMAL(12,2) -- Tổng phí thuê nhạc cụ
- session_type recording_session_type -- SELF_RECORDING | ARTIST_ASSISTED | HYBRID
```

#### 2. `booking_artists` Table
```sql
- booking_id
- specialist_id -- Chỉ lưu internal artist (vocalist/instrumentalist từ hệ thống)
- role VARCHAR(50) -- "VOCALIST", "GUITARIST", "PIANIST", etc.
- is_primary BOOLEAN
- artist_fee DECIMAL(12,2)
- skill_id
```

**❌ VẤN ĐỀ:**
- Chỉ lưu **internal artist** (specialist_id), không có cách lưu "customer tự hát/chơi"
- Role là string tự do, không có enum rõ ràng
- Không phân biệt được "ai chơi" và "nhạc cụ lấy từ đâu"

#### 3. `request_booking_artists` Table (Request Service)
```sql
- request_id
- specialist_id -- Artist customer muốn thuê
- role recording_role -- vocalist | instrumentalist | both
- skill_id
```

**✅ TỐT:** Đã có `role` enum (vocalist/instrumentalist/both)

#### 4. `request_booking_equipment` Table (Request Service)
```sql
- request_id
- equipment_id
- quantity
```

**❌ VẤN ĐỀ:**
- Chỉ lưu equipment customer muốn thuê, nhưng **KHÔNG lưu**:
  - Ai sẽ chơi nhạc cụ này? (customer hay instrumentalist?)
  - Nhạc cụ lấy từ đâu? (customer mang hay thuê studio?)

#### 5. `RecordingSessionType` Enum
```java
SELF_RECORDING    // Customer tự thu âm
ARTIST_ASSISTED   // Thuê Recording Artist
HYBRID            // Vừa tự thu vừa có artist
```

**⚠️ VẤN ĐỀ:**
- `HYBRID` mơ hồ, không rõ ràng "hybrid" như thế nào
- Không phân biệt được "customer hát vs thuê vocalist"
- Không phân biệt được "customer chơi vs thuê instrumentalist"

---

## ❌ THIẾU SÓT CHÍNH

### 1. **Không có cách lưu "Customer tự hát/chơi"**

Hiện tại `booking_artists` chỉ có `specialist_id` (internal artist). Không có record nào để thể hiện:
- Customer tự hát → Cần có cách lưu `CUSTOMER_SELF` làm performer
- Customer tự chơi nhạc cụ → Cần có cách lưu `CUSTOMER_SELF` làm instrumentalist

### 2. **Không phân biệt nguồn nhạc cụ**

Hiện tại chỉ có `equipment_rental_fee` (tổng phí thuê), nhưng không lưu:
- Nhạc cụ nào từ phía studio? (`STUDIO_SIDE` - cần tính phí thuê)
- Nhạc cụ nào từ phía customer? (`CUSTOMER_SIDE` - customer tự mang hoặc artist tự mang, không tính phí)

### 3. **Không có table `booking_required_equipment`**

Trong ERD có trigger comment đề cập đến `booking_required_equipment`, nhưng **table này chưa tồn tại** trong schema!

Hiện tại:
- Equipment chỉ lưu ở `request_booking_equipment` (request level)
- Không có `booking_required_equipment` (booking level) để track equipment thực tế dùng trong session

### 4. **Logic tính phí không đầy đủ**

Hiện tại:
- `artist_fee` = SUM từ `booking_artists.artist_fee`
- `equipment_rental_fee` = ??? (không rõ tính từ đâu)

**Thiếu:**
- Phí cho từng nhạc cụ riêng biệt
- Phân biệt phí thuê studio vs customer tự mang

---

## ✅ ĐỀ XUẤT GIẢI PHÁP

### 1. Tạo Enum Mới

```java
// PerformerSource - Ai sẽ thực hiện (hát/chơi)
enum PerformerSource {
    CUSTOMER_SELF,      // Customer tự làm
    INTERNAL_ARTIST     // Thuê artist nội bộ
}

// InstrumentSource - Nhạc cụ lấy từ đâu
enum InstrumentSource {
    STUDIO_SIDE,        // Nhạc cụ từ phía studio (studio cung cấp)
    CUSTOMER_SIDE       // Nhạc cụ từ phía customer (customer tự mang hoặc artist tự mang)
}

// SessionRoleType - Vai trò trong session
enum SessionRoleType {
    VOCAL,              // Hát
    INSTRUMENT          // Chơi nhạc cụ
}
```

### 2. Tạo Table `booking_participants` (Thay thế/cải thiện `booking_artists`)

```sql
Table booking_participants {
  participant_id uuid [pk]
  booking_id uuid [ref: > studio_bookings.booking_id, not null]
  
  -- Vai trò
  role_type session_role_type [not null] -- VOCAL | INSTRUMENT
  performer_source performer_source [not null] -- CUSTOMER_SELF | INTERNAL_ARTIST
  
  -- Nếu là INTERNAL_ARTIST
  specialist_id uuid [nullable] -- Soft ref to specialist-service
  
  -- Skill được sử dụng (CHỈ CHO INSTRUMENT)
  skill_id uuid [nullable] -- Soft ref to specialist-service (skills table)
  -- LƯU Ý: 
  -- - VOCAL: KHÔNG CẦN skill_id (vocal chỉ là "hát", không cần phân biệt skill)
  -- - INSTRUMENT: BẮT BUỘC phải có skill_id (Piano Performance, Guitar Performance, etc.) để biết là instrument gì và filter equipment
  
  -- Nếu là INSTRUMENT (VOCAL không có equipment)
  instrument_source instrument_source [nullable] -- STUDIO_SIDE | CUSTOMER_SIDE (chỉ cho INSTRUMENT, VOCAL không có field này)
  equipment_id uuid [nullable] -- Ref to equipment (chỉ cho INSTRUMENT, nếu STUDIO_SIDE - BẮT BUỘC phải match với skill_id qua skill_equipment_mapping)
  -- LƯU Ý: 
  -- - VOCAL: KHÔNG có equipment_id (vocal không cần equipment)
  -- - INSTRUMENT: equipment_id PHẢI có trong skill_equipment_mapping cho skill_id này (nếu STUDIO_SIDE)
  
  -- Phí
  participant_fee decimal(12,2) [default: 0] -- Phí của PERFORMER (artist fee), KHÔNG bao gồm equipment rental
  is_primary boolean [default: false] -- Vocal/instrument chính
  notes text
  
  indexes {
    booking_id
    skill_id -- Index để JOIN với skills table
    (booking_id, role_type, performer_source)
    specialist_id
    equipment_id
  }
}
```

**Ví dụ data cho các combo:**

**LƯU Ý:** Skill catalogue đã có sẵn (VD: "Vocal", "Piano Performance", "Guitar Performance", etc.)
→ Dùng `skill_id` làm chính, không cần `instrument_name` (JOIN từ skills table nếu cần display)

**Combo 1: Customer thuê nhạc cụ tự chơi**
```sql
-- Vocal (nếu có)
{ role_type: VOCAL, performer_source: CUSTOMER_SELF, 
  skill_id: <vocal_skill_id>, -- Auto-assigned "Vocal" (không cần user chọn)
  participant_fee: 0 }

-- Instrument
{ role_type: INSTRUMENT, performer_source: CUSTOMER_SELF, 
  skill_id: <guitar_performance_skill_id>, -- BẮT BUỘC user phải chọn "Guitar Performance"
  instrument_source: STUDIO_SIDE, 
  equipment_id: <guitar_equipment_id>, participant_fee: 0 }
-- LƯU Ý: participant_fee = 0 vì customer tự chơi (không phải artist)
-- Equipment rental fee được tính riêng trong booking_required_equipment
```

**Combo 2: Customer thuê instrumentalist**
```sql
-- Instrument
{ role_type: INSTRUMENT, performer_source: INTERNAL_ARTIST,
  specialist_id: <guitarist_id>, 
  skill_id: <guitar_performance_skill_id>, -- "Guitar Performance"
  instrument_source: STUDIO_SIDE, equipment_id: <guitar_id>,
  participant_fee: 500000 } -- CHỈ artist_fee (guitarist fee)
-- Equipment rental fee tính riêng trong booking_required_equipment
```

**Combo 3: Customer tự hát + instrumentalist chơi**
```sql
-- Vocal (customer) - KHÔNG có skill_id và equipment
{ role_type: VOCAL, performer_source: CUSTOMER_SELF, 
  skill_id: null, -- VOCAL không cần skill_id
  equipment_id: null, -- VOCAL không có equipment
  instrument_source: null, -- VOCAL không có instrument_source
  participant_fee: 0 }

-- Instrument (instrumentalist) - CÓ equipment
{ role_type: INSTRUMENT, performer_source: INTERNAL_ARTIST,
  specialist_id: <pianist_id>, 
  skill_id: <piano_performance_skill_id>, -- User phải chọn "Piano Performance"
  instrument_source: STUDIO_SIDE, 
  equipment_id: <piano_id>, -- PHẢI match với skill_id qua skill_equipment_mapping
  participant_fee: 600000 } -- CHỈ pianist_fee
-- Equipment rental fee tính riêng trong booking_required_equipment
```

**Combo 4: Customer tự hát + tự chơi nhạc cụ thuê**
```sql
-- Vocal (customer)
{ role_type: VOCAL, performer_source: CUSTOMER_SELF, 
  skill_id: <vocal_skill_id>, -- Auto-assigned "Vocal" (không cần user chọn)
  participant_fee: 0 }

-- Instrument (customer)
{ role_type: INSTRUMENT, performer_source: CUSTOMER_SELF,
  skill_id: <guitar_performance_skill_id>, -- User phải chọn "Guitar Performance"
  instrument_source: STUDIO_SIDE, equipment_id: <guitar_id>, 
  participant_fee: 0 }
-- Equipment rental fee tính riêng trong booking_required_equipment
```

**Combo 5: Customer thuê cả vocal + instrumentalist**
```sql
-- Vocal (artist) - KHÔNG có skill_id và equipment
{ role_type: VOCAL, performer_source: INTERNAL_ARTIST,
  specialist_id: <vocalist_id>, 
  skill_id: null, -- VOCAL không cần skill_id (specialist_id đã đủ để biết vocalist)
  equipment_id: null, -- VOCAL không có equipment
  instrument_source: null, -- VOCAL không có instrument_source
  participant_fee: 500000, is_primary: true }

-- Instrument (artist) - CÓ equipment
{ role_type: INSTRUMENT, performer_source: INTERNAL_ARTIST,
  specialist_id: <pianist_id>, 
  skill_id: <piano_performance_skill_id>, -- "Piano Performance"
  instrument_source: STUDIO_SIDE, 
  equipment_id: <piano_id>, -- PHẢI match với skill_id qua skill_equipment_mapping
  participant_fee: 600000 } -- CHỈ pianist_fee
-- Equipment rental fee tính riêng trong booking_required_equipment
```

**⚠️ LƯU Ý QUAN TRỌNG:**
- **VOCAL**: KHÔNG có skill_id, equipment_id, instrument_source (vocal chỉ là "hát", không cần phân biệt skill)
- **INSTRUMENT**: BẮT BUỘC có skill_id (để biết là instrument gì), CÓ equipment_id (nếu STUDIO_SIDE), PHẢI match với skill_id qua skill_equipment_mapping
- `participant_fee` = CHỈ fee của performer (artist fee), KHÔNG bao gồm equipment rental
- Equipment rental được tính RIÊNG trong `booking_required_equipment`
- Tránh double count: không cộng equipment fee vào participant_fee

### 3. Tạo Table `booking_required_equipment` (Bổ sung)

```sql
Table booking_required_equipment {
  booking_equipment_id uuid [pk]
  booking_id uuid [ref: > studio_bookings.booking_id, not null]
  equipment_id uuid [ref: > equipment.equipment_id, not null]
  quantity integer [default: 1]
  rental_fee_per_unit decimal(12,2) [not null] -- Phí thuê mỗi đơn vị
  total_rental_fee decimal(12,2) [not null] -- quantity * rental_fee_per_unit
  
  -- Liên kết với participant nào sử dụng (nullable - có thể nhiều participant dùng chung)
  participant_id uuid [nullable] -- Ref to booking_participants (nếu muốn track cụ thể)
  
  indexes {
    booking_id
    equipment_id
    (booking_id, equipment_id) [unique]
  }
}
```

**Logic:**
- CHỈ lưu equipment có `instrument_source = STUDIO_SIDE` (cần tính phí thuê)
- Equipment có `instrument_source = CUSTOMER_SIDE` KHÔNG tạo record ở đây (không tính phí)
- `equipment_rental_fee` trong `studio_bookings` = SUM(`total_rental_fee`) từ bảng này
- Có thể link với `participant_id` để biết ai sử dụng equipment này

**✅ Rõ ràng phân tách phí:**
- `participant_fee` (trong `booking_participants`) = CHỈ fee của performer/artist
- `equipment_rental_fee` (từ `booking_required_equipment`) = CHỈ phí thuê equipment
- KHÔNG double count: equipment fee KHÔNG được cộng vào participant_fee

### 4. Cập nhật `studio_bookings` Logic

**Tính toán phí (TRÁNH DOUBLE COUNT):**
```java
// artist_fee = SUM participant_fee WHERE performer_source = INTERNAL_ARTIST
// LƯU Ý: participant_fee CHỈ là performer fee, KHÔNG bao gồm equipment rental
artistFee = participants.stream()
    .filter(p -> p.getPerformerSource() == PerformerSource.INTERNAL_ARTIST)
    .map(BookingParticipant::getParticipantFee)
    .reduce(BigDecimal.ZERO, BigDecimal::add);

// equipment_rental_fee = SUM total_rental_fee từ booking_required_equipment
// CHỈ tính equipment có instrument_source = STUDIO_SIDE
equipmentRentalFee = bookingRequiredEquipments.stream()
    .map(BookingRequiredEquipment::getTotalRentalFee)
    .reduce(BigDecimal.ZERO, BigDecimal::add);

// Validation: equipment_id PHẢI match với skill_id qua skill_equipment_mapping
// CHỈ ÁP DỤNG CHO INSTRUMENT (VOCAL không có equipment)
public void validateParticipant(BookingParticipant participant) {
    // ... existing validation ...
    
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
        // INSTRUMENT: Validate equipment match với skill (nếu STUDIO_SIDE)
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

// total_cost = studio_rate + artist_fee + equipment_rental_fee + admin_fee + external_guest_fee
totalCost = studioHourlyRate.multiply(durationHours)
    .add(artistFee)
    .add(equipmentRentalFee)
    .add(adminFee)
    .add(externalGuestFee);
```

**✅ Rõ ràng phân tách:**
- `participant_fee` = chỉ fee của performer (artist)
- `equipment_rental_fee` = chỉ từ booking_required_equipment
- KHÔNG cộng equipment fee vào participant_fee → tránh double count

**Session Type logic:**
```java
// Tự động xác định session_type từ participants
RecordingSessionType determineSessionType(List<BookingParticipant> participants) {
    boolean hasInternalArtist = participants.stream()
        .anyMatch(p -> p.getPerformerSource() == PerformerSource.INTERNAL_ARTIST);
    boolean hasCustomerSelf = participants.stream()
        .anyMatch(p -> p.getPerformerSource() == PerformerSource.CUSTOMER_SELF);
    
    if (hasInternalArtist && hasCustomerSelf) {
        return RecordingSessionType.HYBRID;
    } else if (hasInternalArtist) {
        return RecordingSessionType.ARTIST_ASSISTED;
    } else {
        return RecordingSessionType.SELF_RECORDING;
    }
}
```

---

## 🔄 MIGRATION PATH

### Option 1: Backward Compatible (Khuyến nghị)

1. **Giữ nguyên `booking_artists`** cho data cũ
2. **Tạo mới `booking_participants`** cho logic mới
3. **Tạo migration script** để convert `booking_artists` → `booking_participants`:
   ```sql
   -- Mỗi booking_artist record → 1 booking_participant
   INSERT INTO booking_participants (
     booking_id, role_type, performer_source, specialist_id, 
     participant_fee, skill_id, is_primary
   )
   SELECT 
     booking_id,
     CASE 
       WHEN role ILIKE '%VOCAL%' THEN 'VOCAL'
       ELSE 'INSTRUMENT'
     END as role_type,
     'INTERNAL_ARTIST' as performer_source, -- booking_artists chỉ có internal
     specialist_id,
     artist_fee,
     skill_id,
     is_primary
   FROM booking_artists;
   ```
4. **Dual-write** một thời gian (ghi cả 2 bảng)
5. **Sau đó deprecate** `booking_artists`

### Option 2: Clean Break

1. **Tạo `booking_participants`** mới
2. **Rename `booking_artists` → `booking_artists_legacy`**
3. **Migrate data** → `booking_participants`
4. **Update tất cả code** để dùng `booking_participants`
5. **Drop `booking_artists_legacy`** sau 1 tháng

---

## 📝 UI/UX IMPLEMENTATION

### Step 1: Chọn Slot
- Customer chọn ngày, giờ, duration
- Check studio availability

### Step 2: Vocal Setup
```
Section: "Ai sẽ hát trong buổi thu này?"

○ Không thu vocal
○ Tôi tự hát
  → Backend tự động: skill_id = "Vocal" (general) - KHÔNG cần user chọn skill
○ Tôi muốn thuê ca sĩ nội bộ
  → Gọi API: GET /api/specialists/vocalists?available=true&slot=...
  → Hiển thị list ca sĩ, cho chọn
  → [Optional] Cho chọn skill cụ thể: Vocal, Soprano, Alto, Tenor, Bass Voice
    (nếu không chọn → default = "Vocal")
○ Tôi tự hát & thuê thêm ca sĩ nội bộ (backing/song ca)
  → Tương tự như trên cho phần thuê ca sĩ
```

**Backend response:**
```json
{
  "vocalParticipants": [
    { 
      "performerSource": "CUSTOMER_SELF", 
      "skillId": null, // VOCAL không cần skill_id
      "participantFee": 0 
    },
    { 
      "performerSource": "INTERNAL_ARTIST", 
      "specialistId": "...", 
      "skillId": null, // VOCAL không cần skill_id (specialist_id đã đủ)
      "participantFee": 500000 
    }
  ]
}
```

**✅ Logic:**
- Customer tự hát → KHÔNG cần chọn skill_id (VOCAL không cần skill_id)
- Thuê vocalist → KHÔNG cần chọn skill_id (specialist_id đã đủ để biết vocalist)

### Step 3: Instrument Setup
```
Section: "Nhạc cụ trong buổi thu"

[ ] Không, chỉ dùng beat/backing track
[✓] Có, sử dụng nhạc cụ live

[Nếu chọn có nhạc cụ]
→ Hiển thị list nhạc cụ:
  
  [✓] Guitar
      └─ Ai sẽ chơi?
          ○ Tôi tự chơi
          ○ Thuê instrumentalist nội bộ
             → [Dropdown chọn guitarist available]
      └─ Nhạc cụ lấy từ đâu?
          ○ Tôi tự mang (CUSTOMER_SIDE)
          ○ Thuê nhạc cụ của studio (STUDIO_SIDE)
          ○ Artist tự mang (CUSTOMER_SIDE - nếu chọn thuê artist)
```

**API: Get available equipment for skill**
```
GET /api/equipment?skill_id=<guitar_performance_skill_id>&available=true&booking_date=...

Response:
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
**LƯU Ý:** Equipment list đã được filter từ `skill_equipment_mapping` → chỉ hiển thị guitar equipment

**Backend response khi submit booking:**
```json
{
  "instrumentParticipants": [
    {
      "skillId": "<guitar_performance_skill_id>",
      "skillName": "Guitar Performance", // Denormalized từ skills table
      "performerSource": "INTERNAL_ARTIST",
      "specialistId": "...",
      "instrumentSource": "STUDIO_SIDE",
      "equipmentId": "<fender_stratocaster_id>", // PHẢI match với skill_id qua skill_equipment_mapping
      "participantFee": 500000, // CHỈ artist_fee (guitarist fee)
      "equipmentRentalFee": 200000 // TÍNH RIÊNG (sẽ add vào booking_required_equipment)
    }
  ]
}
```

**✅ Phân tách rõ ràng:**
- `skillId` = chính (reference đến skills table)
- `skillName` = chỉ để display (denormalized, có thể JOIN nếu cần)
- `participantFee` = chỉ fee của performer
- `equipmentRentalFee` = tính riêng, sẽ add vào `booking_required_equipment`
- Frontend hiển thị breakdown: "Artist fee: 500k + Equipment rental: 200k = 700k"

**✅ Ưu điểm dùng skill_id:**
- Normalized: không lưu string tự do → tránh typo, inconsistency
- Có thể query/filter theo skill type, recording category
- Dễ tích hợp với skill_equipment_mapping (tự động suggest equipment phù hợp)

---

## ✅ CHECKLIST IMPLEMENTATION

### Phase 1: Data Model
- [ ] Tạo enum `PerformerSource`, `InstrumentSource`, `SessionRoleType`
- [ ] Tạo table `booking_participants` (dùng `skill_id` làm chính, KHÔNG có `instrument_name`)
- [ ] Tạo table `booking_required_equipment`
- [ ] Migration script cho data cũ
- [ ] Note: Skills catalogue đã có sẵn trong specialist-service, chỉ cần reference

### Phase 2: Backend API
- [ ] API tạo booking với participants mới
- [ ] API tính toán phí tự động từ participants
- [ ] API list available artists theo slot
- [ ] API list available equipment
- [ ] Update `StudioBookingService` logic

### Phase 3: Frontend
- [ ] UI Step 1: Slot selection
- [ ] UI Step 2: Vocal setup (4 options)
- [ ] UI Step 3: Instrument setup (multi-select + performer source + instrument source)
- [ ] UI Summary: Hiển thị breakdown phí chi tiết

### Phase 4: Testing
- [ ] Test 5 combo scenarios
- [ ] Test tính phí đúng
- [ ] Test availability checking
- [ ] Test migration data cũ → mới

---

## 🎯 KẾT LUẬN

### ✅ Logic hiện tại **KHÔNG ĐỦ** để support 5 combo scenarios

**Nguyên nhân:**
1. Không có cách lưu "customer tự hát/chơi"
2. Không phân biệt nguồn nhạc cụ
3. Thiếu table `booking_required_equipment`
4. Logic tính phí không đầy đủ

### ✅ Giải pháp đề xuất:
1. **Tạo `booking_participants`** thay thế/mở rộng `booking_artists`
2. **Tạo `booking_required_equipment`** để track equipment chi tiết
3. **Thêm enums** để phân biệt rõ ràng performer source và instrument source
4. **UI/UX 3 bước** rõ ràng, không "kỳ"

### ⚠️ Cần quyết định:
- Migration strategy: Backward compatible hay Clean break?
- Timeline implementation
- Testing plan cho 5 combo scenarios

