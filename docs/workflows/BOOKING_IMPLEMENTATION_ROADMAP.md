# 🛣️ BOOKING LOGIC - ROADMAP IMPLEMENTATION

## 📋 THỨ TỰ IMPLEMENT - THEO DEPENDENCY

### ✅ PHASE 1: FOUNDATION (Làm trước)

#### 1.1. Check & Setup Equipment (nếu chưa có)

**Check xem đã có chưa:**
- [ ] `equipment` table trong database (request-service hoặc project-service?)
- [ ] `Equipment` entity trong code
- [ ] `EquipmentRepository`
- [ ] API CRUD cho equipment (nếu cần admin manage)

**Nếu chưa có → Implement:**
- [ ] Tạo `Equipment` entity (nếu trong project-service)
- [ ] Tạo `EquipmentRepository`
- [ ] Migration script cho `equipment` table
- [ ] Seed data: Một số equipment mẫu (Guitar, Piano, Drums, etc.)

---

#### 1.2. Check & Setup Skill Equipment Mapping (nếu chưa có)

**Check xem đã có chưa:**
- [ ] `skill_equipment_mapping` table trong database
- [ ] `SkillEquipmentMapping` entity
- [ ] `SkillEquipmentMappingRepository`
- [ ] API để query equipment theo skill_id

**Nếu chưa có → Implement:**
- [ ] Tạo `SkillEquipmentMapping` entity
- [ ] Tạo `SkillEquipmentMappingRepository`
- [ ] Migration script cho `skill_equipment_mapping` table
- [ ] Seed data: Mapping mẫu (VD: Guitar Performance → Fender Stratocaster, Gibson Les Paul)

**API cần có:**
```
GET /api/equipment?skill_id=<skill_id>&available=true
→ Filter equipment từ skill_equipment_mapping
→ Check availability (total_quantity - maintenance_quantity > 0)
```

---

#### 1.3. Tạo Enums mới

```java
// PerformerSource
enum PerformerSource {
    CUSTOMER_SELF,
    INTERNAL_ARTIST
}

// InstrumentSource
enum InstrumentSource {
    STUDIO_SIDE,
    CUSTOMER_SIDE
}

// SessionRoleType
enum SessionRoleType {
    VOCAL,
    INSTRUMENT
}
```

- [ ] Tạo enum `PerformerSource`
- [ ] Tạo enum `InstrumentSource`
- [ ] Tạo enum `SessionRoleType` (nếu chưa có)

---

### ✅ PHASE 2: DATA MODEL (Sau Phase 1)

#### 2.1. Tạo Table `booking_participants`

- [ ] Migration script tạo table `booking_participants`
- [ ] Tạo `BookingParticipant` entity
- [ ] Tạo `BookingParticipantRepository`
- [ ] Indexes cần thiết

**Dependencies:**
- ✅ Enums đã có (Phase 1.3)
- ✅ Skills catalogue đã có (specialist-service)

---

#### 2.2. Tạo Table `booking_required_equipment`

- [ ] Migration script tạo table `booking_required_equipment`
- [ ] Tạo `BookingRequiredEquipment` entity
- [ ] Tạo `BookingRequiredEquipmentRepository`
- [ ] Indexes cần thiết

**Dependencies:**
- ✅ Equipment table đã có (Phase 1.1)
- ✅ `booking_participants` đã có (Phase 2.1)

---

### ✅ PHASE 3: BUSINESS LOGIC (Sau Phase 2)

#### 3.1. Update `StudioBookingService`

**Methods cần implement/update:**

1. **Create booking với participants:**
   - [ ] Validate participants (VOCAL không có skill_id, INSTRUMENT bắt buộc skill_id)
   - [ ] Validate equipment match skill_id (nếu STUDIO_SIDE)
   - [ ] Calculate `artist_fee` từ participants
   - [ ] Calculate `equipment_rental_fee` từ booking_required_equipment
   - [ ] Save `booking_participants`
   - [ ] Save `booking_required_equipment` (nếu có)

2. **Get available equipment:**
   - [ ] `getAvailableEquipmentBySkill(skillId, bookingDate, startTime, endTime)`
   - [ ] Filter từ `skill_equipment_mapping`
   - [ ] Check availability (quantity, maintenance)
   - [ ] Check conflicts với bookings khác (nếu cần)

3. **Get available artists:**
   - [ ] `getAvailableVocalists(bookingDate, startTime, endTime)`
   - [ ] `getAvailableInstrumentalists(skillId, bookingDate, startTime, endTime)`
   - [ ] Check availability từ specialist-service
   - [ ] Filter theo skill (cho instrumentalists)

**Dependencies:**
- ✅ `booking_participants` table (Phase 2.1)
- ✅ `booking_required_equipment` table (Phase 2.2)
- ✅ Equipment & skill_equipment_mapping (Phase 1.1, 1.2)

---

#### 3.2. Validation Logic

- [ ] `validateParticipant()` method
  - [ ] VOCAL: Không có skill_id, equipment_id, instrument_source
  - [ ] INSTRUMENT: Bắt buộc skill_id
  - [ ] INSTRUMENT + STUDIO_SIDE: equipment_id phải match skill_id
- [ ] Unit tests cho validation

---

#### 3.3. Pricing Logic

- [ ] Calculate `artist_fee` = SUM(participant_fee) WHERE performer_source = INTERNAL_ARTIST
- [ ] Calculate `equipment_rental_fee` = SUM(total_rental_fee) từ booking_required_equipment
- [ ] Calculate `total_cost` = studio_rate + artist_fee + equipment_rental_fee + admin_fee + external_guest_fee
- [ ] Ensure không double count

---

### ✅ PHASE 4: API LAYER (Sau Phase 3)

#### 4.1. Update `StudioBookingController`

**APIs cần implement/update:**

1. **Create booking:**
   - [ ] `POST /api/studio-bookings` - Update để nhận participants
   - [ ] Request DTO: `CreateStudioBookingRequest` (thêm field `participants`)

2. **Get available equipment:**
   - [ ] `GET /api/studio-bookings/equipment?skill_id=<skill_id>&booking_date=<date>&start_time=<time>&end_time=<time>`
   - [ ] Response: List equipment available, filtered by skill

3. **Get available artists:**
   - [ ] `GET /api/studio-bookings/artists/vocalists?booking_date=<date>&start_time=<time>&end_time=<time>`
   - [ ] `GET /api/studio-bookings/artists/instrumentalists?skill_id=<skill_id>&booking_date=<date>&start_time=<time>&end_time=<time>`

---

#### 4.2. DTOs

**Request DTOs:**
- [ ] `BookingParticipantRequest` (VOCAL/INSTRUMENT, performer_source, skill_id, equipment_id, etc.)
- [ ] Update `CreateStudioBookingRequest` (thêm `List<BookingParticipantRequest> participants`)

**Response DTOs:**
- [ ] `BookingParticipantResponse`
- [ ] `AvailableEquipmentResponse`
- [ ] `AvailableArtistResponse`
- [ ] Update `StudioBookingResponse` (thêm `List<BookingParticipantResponse> participants`)

---

### ✅ PHASE 5: FRONTEND (Sau Phase 4)

#### 5.1. UI Components

- [ ] **Step 1: Slot Selection**
  - [ ] Date picker
  - [ ] Time picker (start/end)
  - [ ] Duration selector
  - [ ] Check studio availability

- [ ] **Step 2: Vocal Setup**
  - [ ] Radio: Không thu vocal / Tôi tự hát / Thuê ca sĩ / Tự hát + thuê ca sĩ
  - [ ] [Nếu thuê] Dropdown chọn vocalist (gọi API available vocalists)
  - [ ] **KHÔNG** có skill selector (VOCAL không cần skill_id)

- [ ] **Step 3: Instrument Setup**
  - [ ] Checkbox: Có sử dụng nhạc cụ live?
  - [ ] [Nếu có] Multi-select instruments:
    - [ ] Dropdown chọn skill (Guitar Performance, Piano Performance, etc.) - **BẮT BUỘC**
    - [ ] Radio: Ai sẽ chơi? (Tôi tự chơi / Thuê instrumentalist)
    - [ ] [Nếu thuê] Dropdown chọn instrumentalist (filter theo skill)
    - [ ] Radio: Nhạc cụ lấy từ đâu? (Tôi tự mang / Thuê studio / Artist tự mang)
    - [ ] [Nếu thuê studio] Dropdown chọn equipment (filter theo skill_id)

- [ ] **Step 4: Summary**
  - [ ] Hiển thị breakdown: studio_rate, artist_fee, equipment_rental_fee, total_cost
  - [ ] Review participants (VOCAL/INSTRUMENT)

---

#### 5.2. API Integration

- [ ] Service: `studioBookingService.jsx`
  - [ ] `createBooking(request)` - với participants
  - [ ] `getAvailableEquipment(skillId, bookingDate, timeSlot)`
  - [ ] `getAvailableVocalists(bookingDate, timeSlot)`
  - [ ] `getAvailableInstrumentalists(skillId, bookingDate, timeSlot)`

---

### ✅ PHASE 6: TESTING

#### 6.1. Unit Tests

- [ ] Test validation logic (VOCAL không có skill_id, INSTRUMENT bắt buộc skill_id)
- [ ] Test equipment filtering theo skill_id
- [ ] Test pricing calculation (không double count)

#### 6.2. Integration Tests

- [ ] Test 5 combo scenarios end-to-end
- [ ] Test API endpoints
- [ ] Test equipment availability checking

#### 6.3. Manual Testing

- [ ] Test UI flow: 3 bước (Slot → Vocal → Instrument)
- [ ] Test validation errors
- [ ] Test equipment filtering

---

## 🎯 PRIORITY ORDER (Recommend)

### **HIGH PRIORITY (Làm trước):**

1. **Phase 1.1 & 1.2**: Equipment & Skill Equipment Mapping
   - **Quan trọng nhất** vì booking_participants phụ thuộc vào equipment filtering
   - Cần có API `GET /api/equipment?skill_id=...` để frontend filter equipment

2. **Phase 1.3**: Enums
   - Cần ngay để tạo entities

3. **Phase 2**: Data Model (booking_participants, booking_required_equipment)
   - Foundation cho business logic

### **MEDIUM PRIORITY:**

4. **Phase 3**: Business Logic
5. **Phase 4**: API Layer

### **LOW PRIORITY:**

6. **Phase 5**: Frontend
7. **Phase 6**: Testing

---

## 🔍 CHECKLIST: Equipment đã có chưa?

**Cần check:**
- [ ] Equipment table trong database nào? (request-service hay project-service?)
- [ ] Equipment entity đã có chưa?
- [ ] Equipment APIs đã có chưa?
- [ ] skill_equipment_mapping table đã có chưa?
- [ ] API filter equipment theo skill_id đã có chưa?

**Nếu chưa có → BẮT ĐẦU TỪ PHASE 1.1 & 1.2**

**Nếu đã có → BẮT ĐẦU TỪ PHASE 1.3 & PHASE 2**

---

## 📚 Files Reference

- Logic chi tiết: `BOOKING_LOGIC_FINAL.md`
- Equipment mapping: `EQUIPMENT_SKILL_MAPPING.md`
- Vocal vs Instrument: `VOCAL_INSTRUMENT_SKILL_LOGIC.md`

