# LUỒNG 4: RECORDING (CHỈ RECORDING) - CHI TIẾT TỪNG BƯỚC

## 📋 TỔNG QUAN
**Dịch vụ:** Khách hàng CHỈ cần studio booking & recording (KHÔNG cần arrangement)

**Điều kiện:** Customer ĐÃ CÓ SẴN reference files (audio reference track/backing track HOẶC arrangement/notation files)

**Thời gian:** 1-3 ngày (nhanh nhất)

**Actors:** Customer, Manager, Artist (Vocalist/Instrumentalist)

**Đặc điểm:**
- Đơn giản nhất về workflow
- KHÔNG CẦN Specialist
- Chỉ cần Artist và Studio

---

## 🔄 LUỒNG CHI TIẾT

### **BƯỚC 1: CUSTOMER TẠO REQUEST** 🎵

#### **Use Cases:**

1-7. **GIỐNG CÁC LUỒNG KHÁC:**
- Login
- View Dashboard
- Select Service Type → **"Recording Only"**
- Enter Contact Information

**FLOW THỰC TẾ (4 STEPS):**

#### **STEP 1: SLOT SELECTION** 📅
8. **Choose Booking Date/Time** (Customer) ← **BẮT BUỘC**
   - Chọn booking date (calendar)
   - Chọn time range (start time - end time)
   - API: GET /api/studio-bookings/available-slots?date=<date>
   - Check studio availability
   - Tính duration hours (tự động từ time range)

#### **STEP 2: VOCAL SETUP** 🎤
9. **Select Vocal Setup** (Customer)
   - **4 lựa chọn:**
     - ○ Không thu vocal (NONE) - Instrumental/playback only
     - ○ Tôi tự hát (CUSTOMER_SELF)
     - ○ Thuê ca sĩ nội bộ (INTERNAL_ARTIST) → Chọn vocalist từ danh sách
       - API: GET /api/studio-bookings/artists?roleType=VOCAL&bookingDate=...&startTime=...&endTime=...
       - Filter vocalists available cho slot đã chọn
     - ○ Tôi tự hát & thuê thêm ca sĩ nội bộ (BOTH) - Backing/duet
   - ⚠️ **Lưu ý:** VOCAL KHÔNG có equipment (chỉ cần biết ai hát)
   - ⚠️ **Lưu ý:** VOCAL KHÔNG cần skill_id (specialist_id đã đủ)

#### **STEP 3: INSTRUMENT SETUP** 🎸
10. **Select Instrument Setup** (Customer)
    - **Bước 1: Có sử dụng nhạc cụ live?**
      - ○ Không, chỉ dùng beat/backing track (hasLiveInstruments = false)
      - ○ Có, sử dụng nhạc cụ live (hasLiveInstruments = true)
    
    - **Bước 2: Chọn loại nhạc cụ (skill_id)** - BẮT BUỘC (nếu hasLiveInstruments = true)
      - API: GET /api/public/skills (filter: skillType=RECORDING_ARTIST, recordingCategory=INSTRUMENT)
      - Chọn: "Guitar Performance", "Piano Performance", "Drums Performance", etc.
      - Có thể chọn nhiều instruments
    
    - **Bước 3: Configure mỗi instrument** (cho mỗi skill đã chọn):
      - **Ai sẽ chơi?**
        - ○ Tôi tự chơi (CUSTOMER_SELF)
        - ○ Thuê instrumentalist nội bộ (INTERNAL_ARTIST) → Chọn specialist có skill này
          - API: GET /api/studio-bookings/artists?skillId=<skill_id>&roleType=INSTRUMENT&bookingDate=...&startTime=...&endTime=...
          - Filter instrumentalists available cho slot và skill
      
      - **Nhạc cụ lấy từ đâu?** (chỉ cho INSTRUMENT)
        - ○ Tôi tự mang (CUSTOMER_SIDE) → Không cần chọn equipment
        - ○ Thuê nhạc cụ của studio (STUDIO_SIDE) → Chọn equipment từ filtered list
          - API: GET /api/equipment?skillId=<skill_id>&includeInactive=false&includeUnavailable=false
          - Backend filter equipment từ skill_equipment_mapping
          - Chỉ hiển thị equipment phù hợp với skill đã chọn
          - Chọn equipment (brand, model, equipmentName)
          - Chọn quantity (số lượng)
          - Hiển thị rental fee

#### **STEP 4: REVIEW & SUBMIT** 📋
11. **Upload Reference Files** (Customer) ← **BẮT BUỘC!**
    - Upload **reference files** (PHẢI CÓ!)
    - **Audio files:** Reference track, backing track (MP3, WAV, FLAC, etc.)
    - **Arrangement files:** Sheet music/notation (PDF, XML/MusicXML)
    - Validation: Chỉ chấp nhận audio/, application/pdf, application/xml
    - Max file size: 100MB
    - Nếu không có → không thể submit

12. **View Price Estimation** (Customer)
    - Participant fee (vocalists + instrumentalists)
    - Equipment rental fee (chỉ cho STUDIO_SIDE equipment)
    - Studio booking fee
    - Total fee

13. **Enter Service Request Information** (Customer)
    - Title (bắt buộc)
    - Description (bắt buộc, tối thiểu 10 ký tự)
    - Contact name (bắt buộc)
    - Contact phone (bắt buộc)
    - Contact email (bắt buộc, format email)

14. **Submit Service Request** (Customer)
    - API: POST /api/service-requests (tạo service request)
    - API: POST /api/studio-bookings/from-service-request (tạo booking từ request)
    - Transform data: participants, requiredEquipment từ form data

**Kết quả:**
- ✅ Service Request với request_type = **'recording'**
- ✅ has_vocalist/has_instrumentalist = true
- ✅ Studio Booking được tạo với:
  - bookingDate, startTime, endTime, durationHours
  - booking_participants (VOCAL/INSTRUMENT, performer_source, skill_id, equipment_id, etc.)
  - booking_required_equipment (chỉ cho INSTRUMENT với STUDIO_SIDE)
- ✅ Reference files uploaded (audio hoặc arrangement files)
- ⚠️ **Lưu ý:** Equipment chỉ được chọn nếu có trong skill_equipment_mapping cho skill_id đó
- ⚠️ **Lưu ý:** Flow thực tế: Slot Selection → Vocal Setup → Instrument Setup → Review & Submit (upload file ở step cuối)

---

### **BƯỚC 2-5: MANAGER & CONTRACT (ĐƠN GIẢN HƠN)** 📄

#### **Use Cases 14-26: GIỐNG LUỒNG KHÁC**

**NHƯNG ĐƠN GIẢN HƠN:**
- Manager review → CHECK reference files có đầy đủ không (audio hoặc arrangement files)
- Create contract (contract_type = **'recording'**)
- **⚠️ QUAN TRỌNG:** Recording contract CHỈ có **1 milestone duy nhất**
  - **Milestone 1: Recording Session**
    - milestoneType: 'recording'
    - hasPayment: true
    - paymentPercent: 100 - depositPercent (ví dụ: nếu deposit = 50% → milestone = 50%)
    - name: "Recording Session"
    - description: "Complete recording service as specified in booking details"
- **Deposit:** Là installment riêng (không phải milestone), thường là 50%
- ⚠️ **Backend validation:** Recording contract phải có đúng 1 milestone

**Kết quả:**
- ✅ Contract với 1 milestone (Recording Session)
- ✅ Deposit installment (50%)
- ✅ Milestone installment (50% - nếu deposit = 50%)
- ✅ Customer ký contract → **Hệ thống tự động link booking với contract và milestone** (không cần manager làm)
- ✅ Customer thanh toán deposit → **Hệ thống tự động chuyển booking từ TENTATIVE → CONFIRMED** (không cần manager làm)

---

### **BƯỚC 6: MANAGER CHUẨN BỊ RECORDING** 🎯

#### **Use Cases:**

27. **Validate Reference Files** (Manager)
    - Manager check files customer upload
    - Đảm bảo format đúng (audio hoặc PDF/XML)
    - Đảm bảo complete cho recording

28. **Review Booking Details** (Manager)
    - Manager xem booking đã được tạo từ customer request
    - Booking status = TENTATIVE (chờ contract được tạo và deposit được thanh toán)
    - Booking context = PRE_CONTRACT_HOLD
    - Xem participants (vocalists/instrumentalists) đã được customer chọn
    - Xem equipment đã được customer chọn
    - ⚠️ **Lưu ý:** 
      - Booking đã được tạo từ customer request, KHÔNG cần manager confirm
      - Khi customer ký contract → Hệ thống tự động link booking với contract và milestone (ESignService.linkBookingToContract)
      - Khi customer thanh toán deposit → Hệ thống tự động chuyển booking từ TENTATIVE → CONFIRMED (StudioBookingService.updateBookingStatusOnDepositPaid)

**Kết quả:**
- ✅ Booking đã được tạo từ customer request (status = TENTATIVE, context = PRE_CONTRACT_HOLD)
- ✅ Artists đã được chọn trong booking (từ customer request)
- ✅ Equipment đã được chọn trong booking (từ customer request)
- ✅ Khi customer ký contract → Booking tự động được link với contract và milestone
- ✅ Khi customer thanh toán deposit → Booking tự động chuyển sang CONFIRMED

---

### **BƯỚC 7: TASK ASSIGNMENT & ARTIST CHUẨN BỊ** 🎤

#### **Lưu ý quan trọng về Task Assignment:**
- ⚠️ **Recording contract BẮT BUỘC phải có task assignment:**
  - Manager PHẢI tạo task assignment với task_type = 'RECORDING_SUPERVISION' cho recording milestone
  - ⚠️ **Task CHỈ được assign cho Arrangement specialist** (filter theo specialization = 'ARRANGEMENT')
  - ⚠️ **KHÔNG có logic cho manager làm trực tiếp:** Tất cả file upload đều phải qua task assignment (cần assignmentId)
  - Arrangement specialist sẽ làm recording supervision và upload files qua task assignment
- ⚠️ **Khác với WORKFLOW_3 (Arrangement with Recording):**
  - WORKFLOW_3: Task assignment được gợi ý từ arrangement specialist đã làm arrangement task trước đó
  - WORKFLOW_4: Không có arrangement task, nên manager tự chọn arrangement specialist từ danh sách

#### **Use Cases:**

29-30. **Select Specialists & Assign Task (Recording)** (Manager)
    - ✅ **Giống WORKFLOW_3** (Select Specialists for Recording, Assign Task to Specialist - Recording)
    - ⚠️ **Khác biệt:** Không có gợi ý từ arrangement specialist (vì không có arrangement task)

31-34. **Specialist Accept Task & Artist Review Files** (Arrangement Specialist, Artist)
    - ✅ **Giống WORKFLOW_3** (Specialist: View Dashboard, View Tasks, View Task Details, Accept Task; Artist: View Recording Sessions, View Session Details, Review Reference Files)
    - ⚠️ **Khác biệt:** 
      - Specialist không có arrangement files để xem (vì không có arrangement milestone)
      - Artist review reference files (audio hoặc arrangement files) thay vì arrangement files
    - ⚠️ **Lưu ý:** KHÔNG có logic "confirm" cho artist - booking được confirm tự động khi customer thanh toán deposit

**Kết quả:**
- ✅ Task assignment created và accepted (RECORDING_SUPERVISION cho Arrangement specialist)
- ✅ Artist đã xem booking details và review reference files

---

### **BƯỚC 8: RECORDING SESSION & UPLOAD FILES** 🎤

#### **Lưu ý:**
- ⚠️ **Recording session là OFFLINE:** Artist và Arrangement Specialist (engineer) thực hiện recording tại studio (không có check-in/join session trong hệ thống)
- Sau khi recording xong, Specialist upload files vào hệ thống

#### **Use Cases:**

35-36. **Start Task & Upload Audio Files** (Arrangement Specialist - Recording Supervision)
    - ✅ **Giống WORKFLOW_3** (Start Task Assignment, Upload Audio Files cho recording milestone)
    - ⚠️ **Khác biệt:** Specialist đã được assign task RECORDING_SUPERVISION (không có arrangement task trước đó)

37-38. **Submit Files for Review** (Arrangement Specialist)
    - ✅ **Giống WORKFLOW_2** (Submit Files for Review)
    - ⚠️ **Khác biệt:** Submit recorded audio files thay vì arrangement files

**Kết quả:** ✅ **Giống WORKFLOW_3** (Recording completed, Audio files uploaded và submitted, Manager nhận notification)

---


---

### **BƯỚC 9: MANAGER DELIVER FILES** 📦

#### **Use Cases:**

45-47. **Review, Approve, Deliver Files** (Manager)
    - ✅ **Giống WORKFLOW_2** (Review Submitted Files, Approve/Reject Files, Deliver Files to Customer)
    - ⚠️ **Khác biệt:** Deliver recorded audio files (không phải arrangement files)

**Kết quả:** ✅ **Giống WORKFLOW_2** (Files delivered to customer)

---

### **BƯỚC 10: CUSTOMER NHẬN & THANH TOÁN** 💰

#### **Use Cases:**

48-50. **Track Progress, View Files, Download Files** (Customer)
    - ✅ **Giống WORKFLOW_2** (Track Project Progress, View Deliverable Files, Download Final Files)
    - ⚠️ **Khác biệt:** Download recorded audio files (WAV, MP3, FLAC) thay vì arrangement files

**2 LỰA CHỌN:**

#### **OPTION A: CUSTOMER HÀI LÒNG** ✅

51. **Accept Submission (Recording)** (Customer) ← **NHẬN SUBMISSION, KHÔNG PHẢI MILESTONE!**
    - Customer click "Accept Submission"
    - API: POST /submissions/{submissionId}/customer-review (action = "accept")
    - **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate, handle revision request nếu có, update submission/task/milestone status, mở installment, check contract completion)

**Kết quả:** ✅ **Giống WORKFLOW_2** (submission/task/milestone status updated, revision request handled nếu có, installment mở, contract completion checked, progress = 95%)

52. **Pay Recording Milestone** (Customer)
    - Thanh toán final (paymentPercent = 100 - depositPercent, ví dụ: 50% nếu deposit = 50%)

**Kết quả:**
- ✅ Recording milestone paid
- ✅ Contract completed
- ✅ Artist nhận earnings

#### **OPTION B: CUSTOMER YÊU CẦU CHỈNH SỬA AUDIO** 🔄

53. **Request Revision (Recording)** (Customer) ← **CHO FILE SUBMISSIONS, KHÔNG PHẢI CONTRACT!**
    - Customer yêu cầu chỉnh sửa audio files (post-processing, mixing, editing)
    - ⚠️ **Lưu ý:** Revision chỉ là chỉnh sửa audio files, KHÔNG phải record lại từ đầu (không cần reschedule recording session)
    - Customer nhập:
      - title: Tiêu đề yêu cầu sửa (bắt buộc)
      - description: Mô tả chi tiết yêu cầu sửa (bắt buộc) - ví dụ: "Cần chỉnh pitch", "Cần mix lại", "Cần edit timing"
    - **2 TRƯỜNG HỢP:**

#### **TRƯỜNG HỢP A: CÒN FREE REVISION** ✅
- ✅ **Giống WORKFLOW_2** (check free revisions, API request_revision, backend tạo RevisionRequest với isFreeRevision=true)

#### **TRƯỜNG HỢP B: HẾT FREE REVISION** 💰
- ✅ **Giống WORKFLOW_2** (check free revisions, customer thanh toán revision fee, backend xử lý payment, event consumer tạo RevisionRequest)

**Kết quả (cả 2 trường hợp):** ✅ **Giống WORKFLOW_2** (RevisionRequest created, notification sent)

---

### **BƯỚC 11A: MANAGER XỬ LÝ REVISION REQUEST (RECORDING)** 🔧

#### **Use Cases:**

54-55. **Review & Approve/Reject Revision Request** (Manager)
    - ✅ **Giống WORKFLOW_2** (Review Revision Requests, Approve/Reject Revision Request)
    - ⚠️ **Khác biệt:** 
      - Specialist upload files mới/chỉnh sửa lại audio files (post-processing, mixing, editing)
      - **KHÔNG cần reschedule recording session** - chỉ chỉnh sửa file audio đã có, không phải record lại từ đầu

**Kết quả:** ✅ **Giống WORKFLOW_2** (revision request/task/milestone/submission status updated, notification sent)

---

## ✅ TỔNG KẾT USE CASES - RECORDING ONLY

### **HIỆN CÓ: ~56 use cases** (Customer: ~15, Manager: ~20, Artist: ~4, System: ~2)

### **❌ ĐIỂM KHÁC BIỆT SO VỚI CÁC LUỒNG KHÁC:**

1. **ĐƠN GIẢN NHẤT:**
   - CHỈ 1 milestone (Recording Session)
   - CÓ Arrangement Specialist làm recording supervision
   - Timeline NGẮN NHẤT (1-3 ngày)

2. **BẮT BUỘC PHẢI CÓ REFERENCE FILES:**
   - Customer phải upload sẵn (audio reference track/backing track HOẶC arrangement files PDF/XML)
   - Không có → không thể proceed

3. **CÓ ARRANGEMENT SPECIALIST LÀM RECORDING SUPERVISION:**
   - ⚠️ **Recording milestone BẮT BUỘC phải có task assignment** với task_type = 'RECORDING_SUPERVISION'
   - ⚠️ **Task CHỈ được assign cho Arrangement specialist** (filter theo specialization = 'ARRANGEMENT')
   - Arrangement specialist làm recording supervision (engineer, upload files, review, deliver)
   - Artist thực hiện performance (hát/chơi nhạc cụ)
   - Manager assign task và review, nhưng không làm trực tiếp (tất cả file upload phải qua task assignment)

4. **USE CASES ĐẶC THÙ:**
   - Validate Reference Files (Manager)
   - Send Reference Files to Artist (Manager)
   - Review Reference Files (Artist)
   - Upload Audio Files (Arrangement Specialist) - qua task assignment
   - Select Vocal Setup (Customer) - 4 options (VOCAL không có equipment)
   - Select Instrument Setup (Customer) - chọn skill_id trước → filter equipment theo skill_equipment_mapping

5. **KHÔNG CÓ:**
   - Arrangement milestone use cases (chỉ có recording milestone)
   - Draft milestones

---

## 🔄 SO SÁNH TẤT CẢ CÁC LUỒNG

| Đặc điểm | Transcription | Arrangement | Arr + Rec | **Recording Only** |
|----------|--------------|-------------|-----------|-------------------|
| **Số Milestones** | 2 | 3 | 4 | **1** |
| **Actors** | 3 | 3 | 4 | **4 (Customer, Manager, Arrangement Specialist, Artist)** |
| **Số lần Payment** | 2 | 3 | 4 | **2** |
| **Cần Reference Files** | Không | Không | Không | **BẮT BUỘC (audio hoặc arrangement)** |
| **Studio Booking** | Không | Không | Có | **Có** |
| **SLA Days** | 3 | 5-7 | 7-10 | **1-3** |
| **Complexity** | Thấp | Trung bình | Cao | **THẤP NHẤT** |
| **Use Cases** | ~66 | ~75 | ~95 | **~60** |

---

## ⚠️ EDGE CASES QUAN TRỌNG:

### **1. Reference Files Không Đầy Đủ:**
- **Scenario:** Customer upload files thiếu hoặc sai format
- **Solution:** Manager reject request → Customer upload lại
- **Use Case:** Validate Reference Files (Manager)

### **2. Artist Performance Không Đạt:**
- **Scenario:** Artist hát/chơi không đúng yêu cầu
- **Solution:** Manager upload files mới/chỉnh sửa lại files
- ⚠️ **Lưu ý:** Reschedule recording session chưa được implement trong hệ thống

### **3. Technical Issues:**
- **Scenario:** Thiết bị hỏng, audio bị noise
- **Solution:** Manager upload files mới/chỉnh sửa lại files
- ⚠️ **Lưu ý:** Reschedule recording session chưa được implement trong hệ thống

### **4. Customer Không Hài Lòng Với Artist:**
- **Scenario:** Customer muốn đổi artist
- **Solution:** Manager có thể tạo booking mới với artist khác (nếu cần)
- ⚠️ **Lưu ý:** Reschedule recording session chưa được implement trong hệ thống

---

## 📊 TỔNG HỢP TẤT CẢ 4 LUỒNG

| Luồng | Use Cases Cần | Đã Có | Thiếu | % Hoàn Thành |
|-------|--------------|-------|-------|--------------|
| **1. Transcription** | ~66 | ~58 | ~8 | 88% |
| **2. Arrangement** | ~75 | ~60 | ~15 | 80% |
| **3. Arr + Rec** | ~95 | ~70 | ~25 | 74% |
| **4. Recording Only** | ~45 | ~40 | ~5 | 89% |
| **TỔNG** | **~120** | **~102** | **~18** | **85%** |

*(Tính chung các use cases, loại bỏ trùng lặp)*

---

**Kết luận: Cần thêm ~18 use cases quan trọng để cover đầy đủ tất cả 4 luồng!** 🎯
