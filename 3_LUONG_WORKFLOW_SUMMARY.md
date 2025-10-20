# MuTraPro - Tóm Tắt 3 Luồng Workflow

## 📋 TỔNG QUAN

### **Thông tin cá nhân linh hoạt:**
- **`service_requests`**: Có `contact_name`, `contact_phone`, `contact_email`
- **`contracts`**: Không có contact_* fields (JOIN từ service_requests)
- **Customer đăng nhập**: Nhưng có thể nhập thông tin khác

---

## 🎵 LUỒNG 1: TRANSCRIPTION

### **Bước 1: Customer tạo yêu cầu**
```
service_requests:
- request_type: 'transcription'
- contact_name: "Trần Thị B" (nhập khác với account)
- contact_phone: "0907654321" (nhập khác với account)
- contact_email: "tranthib@gmail.com" (nhập khác với account)
- tempo_percentage: 80.00 (chậm 20%)
- music_options: NULL (không cần cho transcription)
- has_vocalist: false
- external_guest_count: 0
- title: "Transcription bài ABC"
- description: "Cần ký âm bài hát ABC"
- status: 'pending'
```

**Files upload:**
```
files:
- file_source: 'customer_upload'
- content_type: 'audio'
- request_id: [request_id]
- file_path: "/uploads/audio/abc.mp3"
```

**Nhạc cụ ký âm:**
```
request_notation_instruments:
- request_id: [request_id]
- notation_instrument_id: [piano_id] (chọn 1 loại)
```

### **Bước 2: Manager tạo hợp đồng**
```
contracts:
- request_id: [request_id]
- contract_type: 'transcription'
- base_price: 500000 (từ pricing_matrix)
- total_price: 500000
- deposit_percent: 40.0
- deposit_amount: 200000
- final_amount: 300000
- sla_days: 3 (từ service_sla_defaults)
- due_date: expected_start_date + 3 ngày
- free_revisions_included: 1
- additional_revision_fee_vnd: 100000
- status: 'draft'
```

### **Bước 3: Manager phân task**
```
task_assignments:
- contract_id: [contract_id]
- specialist_id: [specialist_id]
- task_type: 'transcription'
- assignment_status: 'assigned'
- created_at: now()
```

### **Bước 4: Specialist thực hiện**
```
task_assignments:
- assignment_status: 'in_progress'
- specialist_started_at: now()
```

**Files upload:**
```
files:
- file_source: 'specialist_upload'
- content_type: 'notation'
- assignment_id: [assignment_id]
- file_path: "/uploads/notation/abc.musicxml"
```

### **Bước 5: Giao file**
```
files:
- delivered_to_customer: true
- delivered_at: now()
- delivered_by: [manager_id]
```

### **Bước 6: Thanh toán**
```
payments:
- contract_id: [contract_id]
- milestone_id: [milestone_id]
- amount: 300000
- status: 'completed'
```

---

## 🎼 LUỒNG 2: ARRANGEMENT (+ RECORDING)

### **Bước 1: Customer tạo yêu cầu**
```
service_requests:
- request_type: 'arrangement_with_recording'
- contact_name: "Trần Thị B"
- contact_phone: "0907654321"
- contact_email: "tranthib@gmail.com"
- music_options: {"genres": ["Pop","Rock"], "purpose": "karaoke_cover"}
- tempo_percentage: NULL (không cần cho arrangement)
- has_vocalist: true (có chọn ca sĩ)
- external_guest_count: 0
- title: "Arrangement bài XYZ"
- description: "Cần arrangement bài XYZ với ca sĩ"
- status: 'pending'
```

**Files upload:**
```
files:
- file_source: 'customer_upload'
- content_type: 'notation'
- request_id: [request_id]
- file_path: "/uploads/notation/xyz.musicxml"
```

**Nhạc cụ arrangement:**
```
request_notation_instruments:
- request_id: [request_id]
- notation_instrument_id: [piano_id]
- notation_instrument_id: [guitar_id] (chọn nhiều loại)
```

**Ca sĩ chọn:**
```
request_booking_artists:
- request_id: [request_id]
- specialist_id: [specialist_id]
- role: 'vocalist'
- skill_id: [bolero_vocal_skill_id]
```

### **Bước 2: Manager tạo hợp đồng**
```
contracts:
- request_id: [request_id]
- contract_type: 'arrangement_with_recording'
- base_price: 2000000 (arrangement + recording)
- total_price: 2000000
- deposit_percent: 40.0
- deposit_amount: 800000
- final_amount: 1200000
- sla_days: 8 (3 ngày arrangement + 3 ngày recording + 2 ngày buffer)
- due_date: expected_start_date + 8 ngày
- free_revisions_included: 1
- additional_revision_fee_vnd: 200000
- status: 'draft'
```

### **Bước 3: Manager phân task**
```
task_assignments:
- contract_id: [contract_id]
- specialist_id: [arrangement_specialist_id]
- task_type: 'arrangement'
- assignment_status: 'assigned'
```

### **Bước 4: Specialist thực hiện arrangement**
```
task_assignments:
- assignment_status: 'in_progress'
- specialist_started_at: now()
```

**Files upload:**
```
files:
- file_source: 'specialist_upload'
- content_type: 'notation'
- assignment_id: [assignment_id]
- file_path: "/uploads/notation/xyz_arranged.musicxml"
```

### **Bước 5: Giao file arrangement**
```
files:
- delivered_to_customer: true
- delivered_at: now()
- delivered_by: [manager_id]
```

### **Bước 6: Manager tạo studio booking**
```
studio_bookings:
- customer_id: [customer_id]
- studio_id: [studio_id]
- request_id: [request_id]
- contract_id: [contract_id]
- session_type: 'artist_assisted'
- booking_date: '2024-01-25'
- start_time: '14:00:00'
- end_time: '16:00:00'
- status: 'confirmed'
- duration_hours: 2.00
- external_guest_count: 0
- artist_fee: 500000 (ca sĩ)
- equipment_rental_fee: 0 (không thuê nhạc cụ)
- admin_fee: 100000
- external_guest_fee: 0
- total_cost: 600000
```

**Ca sĩ booking:**
```
booking_artists:
- booking_id: [booking_id]
- specialist_id: [specialist_id] (từ request_booking_artists)
- role: 'vocalist'
- skill_id: [bolero_vocal_skill_id]
- fee: 500000
```

### **Bước 7: Thực hiện recording**
**Files upload:**
```
files:
- file_source: 'specialist_upload'
- content_type: 'audio'
- assignment_id: [assignment_id]
- file_path: "/uploads/audio/xyz_final.mp3"
```

### **Bước 8: Giao file final**
```
files:
- delivered_to_customer: true
- delivered_at: now()
- delivered_by: [manager_id]
```

### **Bước 9: Thanh toán**
```
payments:
- contract_id: [contract_id]
- milestone_id: [milestone_id]
- amount: 1200000
- status: 'completed'
```

---

## 🎤 LUỒNG 3: RECORDING (STUDIO BOOKING)

### **Bước 1: Customer tạo yêu cầu**
```
service_requests:
- request_type: 'recording'
- contact_name: "Trần Thị B"
- contact_phone: "0907654321"
- contact_email: "tranthib@gmail.com"
- music_options: NULL (không cần cho recording)
- tempo_percentage: NULL (không cần cho recording)
- has_vocalist: false
- external_guest_count: 2 (mang theo 2 người)
- title: "Thu âm bài DEF"
- description: "Cần thu âm bài DEF với ca sĩ bolero"
- status: 'pending'
```

**Files upload:**
```
files:
- file_source: 'customer_upload'
- content_type: 'notation'
- request_id: [request_id]
- file_path: "/uploads/notation/def.musicxml"
```

**Ca sĩ chọn:**
```
request_booking_artists:
- request_id: [request_id]
- specialist_id: [specialist_id]
- role: 'vocalist'
- skill_id: [bolero_vocal_skill_id]
```

**Nhạc cụ thuê:**
```
request_booking_equipment:
- request_id: [request_id]
- equipment_id: [piano_id]
- quantity: 1
```

### **Bước 2: Manager tạo hợp đồng**
```
contracts:
- request_id: [request_id]
- contract_type: 'recording'
- base_price: 0 (tính từ studio booking)
- total_price: 1500000 (studio + artist + equipment + external guests)
- deposit_percent: 40.0
- deposit_amount: 600000
- final_amount: 900000
- sla_days: 2 (từ service_sla_defaults)
- due_date: expected_start_date + 2 ngày
- free_revisions_included: 0 (không có revision cho recording)
- additional_revision_fee_vnd: 0
- status: 'draft'
```

### **Bước 3: Manager tạo studio booking**
```
studio_bookings:
- customer_id: [customer_id]
- studio_id: [studio_id]
- request_id: [request_id]
- contract_id: [contract_id]
- session_type: 'artist_assisted'
- booking_date: '2024-01-20'
- start_time: '10:00:00'
- end_time: '12:00:00'
- status: 'confirmed'
- duration_hours: 2.00
- external_guest_count: 2
- artist_fee: 500000 (ca sĩ)
- equipment_rental_fee: 200000 (piano)
- admin_fee: 100000
- external_guest_fee: 0 (2 người < 3 người miễn phí)
- total_cost: 800000
```

**Ca sĩ booking:**
```
booking_artists:
- booking_id: [booking_id]
- specialist_id: [specialist_id]
- role: 'vocalist'
- skill_id: [bolero_vocal_skill_id]
- fee: 500000
```

**Nhạc cụ booking:**
```
booking_required_equipment:
- booking_id: [booking_id]
- equipment_id: [piano_id]
- quantity: 1
```

### **Bước 4: Thực hiện session**
**Files upload:**
```
files:
- file_source: 'specialist_upload'
- content_type: 'audio'
- contract_id: [contract_id]
- file_path: "/uploads/audio/def_recorded.mp3"
```

### **Bước 5: Giao file**
```
files:
- delivered_to_customer: true
- delivered_at: now()
- delivered_by: [manager_id]
```

### **Bước 6: Thanh toán**
```
payments:
- contract_id: [contract_id]
- milestone_id: [milestone_id]
- amount: 900000
- status: 'completed'
```

---

## 🔄 REVISION WORKFLOW

### **Chỉ áp dụng cho:**
- **Transcription**: Có revision
- **Arrangement**: Có revision
- **Recording**: Không có revision (trigger cấm)

### **Revision process:**
```
revision_requests:
- assignment_id: [assignment_id]
- customer_id: [customer_id]
- description: "Cần sửa lại phần intro"
- status: 'pending'
- payment_required: false (nếu còn free revisions)
- payment_status: 'not_required'
```

**Nếu hết free revisions:**
```
revision_requests:
- payment_required: true
- payment_status: 'pending'
```

---

## 📊 KEY TABLES

### **Core Tables:**
- **`service_requests`**: Yêu cầu dịch vụ (có contact_*)
- **`contracts`**: Hợp đồng (không có contact_*)
- **`task_assignments`**: Phân công task
- **`studio_bookings`**: Booking studio
- **`files`**: Quản lý file

### **Junction Tables:**
- **`request_notation_instruments`**: Nhạc cụ ký âm
- **`request_booking_artists`**: Ca sĩ chọn
- **`request_booking_equipment`**: Nhạc cụ thuê
- **`booking_artists`**: Ca sĩ booking
- **`booking_required_equipment`**: Nhạc cụ booking

### **Pricing Tables:**
- **`pricing_matrix`**: Bảng giá cố định
- **`service_sla_defaults`**: SLA mặc định
- **`studios`**: Thông tin studio + giá

---

## ✅ CHECKLIST

### **Luồng 1 (Transcription):**
- [x] Customer tạo request với contact_*
- [x] Upload audio file
- [x] Chọn nhạc cụ ký âm
- [x] Manager tạo contract
- [x] Manager phân task
- [x] Specialist thực hiện
- [x] Giao file notation
- [x] Thanh toán

### **Luồng 2 (Arrangement + Recording):**
- [x] Customer tạo request với contact_*
- [x] Upload notation file
- [x] Chọn nhạc cụ arrangement
- [x] Chọn ca sĩ
- [x] Manager tạo contract
- [x] Manager phân task arrangement
- [x] Specialist thực hiện arrangement
- [x] Giao file arrangement
- [x] Manager tạo studio booking
- [x] Thực hiện recording
- [x] Giao file final
- [x] Thanh toán

### **Luồng 3 (Recording):**
- [x] Customer tạo request với contact_*
- [x] Upload notation file
- [x] Chọn ca sĩ
- [x] Chọn nhạc cụ thuê
- [x] Manager tạo contract
- [x] Manager tạo studio booking
- [x] Thực hiện session
- [x] Giao file
- [x] Thanh toán

---

## 🎯 NOTES

1. **Thông tin cá nhân**: Chỉ lưu ở `service_requests`, `contracts` JOIN để lấy
2. **Revision**: Chỉ áp dụng cho transcription và arrangement
3. **Studio booking**: Có thể tentative trước khi contract ký
4. **Pricing**: Tự động từ `pricing_matrix` và `service_sla_defaults`
5. **Files**: Unified table cho tất cả file types
6. **External guests**: Chỉ đếm số lượng, không lưu chi tiết
