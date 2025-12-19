# LUỒNG 3: ARRANGEMENT + RECORDING - CHI TIẾT TỪNG BƯỚC

## 📋 TỔNG QUAN
**Dịch vụ:** Khách hàng cần:
1. Sắp xếp nhạc (arrangement)
2. Thu âm với ca sĩ/nhạc công (recording)

**Thời gian:** 7-10 ngày (tùy độ phức tạp)

**Actors:** Customer, Manager, Arrangement Specialist, Artist (Vocalist/Instrumentalist)

**Đặc điểm:** 
- Phức tạp nhất
- Cần coordination giữa Specialist và Artist
- Có studio booking
- **Có default milestones** (2 milestones: Arrangement + Recording)

---

## ⚠️ QUAN TRỌNG: INSTALLMENTS vs MILESTONES

- ✅ **Giống WORKFLOW_1 và WORKFLOW_2** về khái niệm Milestones và Installments
- ⚠️ **Khác biệt:**
  - **Có default milestones:** 2 milestones (Arrangement + Recording), Manager có thể chỉnh sửa
  - **MilestoneType:** 'arrangement' hoặc 'recording' (phân biệt milestone)
  - **THỨ TỰ MILESTONES:**
    - Arrangement milestones LUÔN phải trước Recording milestone (orderIndex thấp hơn)
    - Recording milestone phải là milestone cuối cùng
    - File arrangement cuối cùng tự động link với Recording milestone khi customer accept

---

## 🔄 LUỒNG CHI TIẾT

### **BƯỚC 1-2: CUSTOMER TẠO YÊU CẦU & MANAGER NHẬN REQUEST** 🎵👔
- ✅ **Giống WORKFLOW_2** (Arrangement)
- ⚠️ **Khác biệt:**
  - Service type: "Arrangement + Recording"
  - **Select Preferred Vocalists** (Customer) - tối đa 2 vocalists (bổ sung)
    - Customer có thể chọn tối đa 2 vocalists từ danh sách
    - ⚠️ **Lưu ý:** Đây là preference, không bắt buộc - Manager có thể chọn vocalist khác khi tạo booking
    - Vocalist preferences được lưu trong service request
    - **KHÔNG có vocalist fees riêng** - giá đã bao gồm trong base price
  - Request type: 'arrangement_with_recording'
  - Manager xem preferred vocalists từ service request
  - Base price: CAO NHẤT (cao hơn cả arrangement thuần)

---

### **BƯỚC 3: MANAGER TẠO HỢP ĐỒNG** 📄

#### **Use Cases:**
18-19. **Validate Request, View Request Details** (Manager)
    - ✅ **Giống WORKFLOW_2** (validate request info, view request details)
    - ⚠️ **Khác biệt:** 
      - Kiểm tra preferred vocalists (nếu có)
      - KHÔNG có vocalist fees riêng - giá đã bao gồm trong base price
      - Studio booking fees sẽ được tính khi Manager tạo studio booking
      - KHÔNG có equipment rental (arrangement_with_recording không có equipment)

20. **Create Contract** (Manager)
    - ✅ **Giống WORKFLOW_2** về flow tạo contract (form, submit, backend xử lý)
    - ⚠️ **Khác biệt:** 
      - contractType: 'arrangement_with_recording'
      - slaDays: 10 days (default, thay vì 7 days)
      - **CÓ DEFAULT MILESTONES:** Hệ thống tự động tạo 2 default milestones (Arrangement + Recording)
      - Milestones có milestoneType: 'arrangement' hoặc 'recording' (thay vì chỉ 'arrangement')
      - Manager có thể chỉnh sửa/xóa/thêm milestones

21. **Send Contract to Customer** (Manager)
    - ✅ **Giống WORKFLOW_2** (validate, update contract status, set sentToCustomerAt, expiresAt, update request status, send notification)
    - ⚠️ **CHƯA có PDF** (PDF chỉ generate sau khi customer sign)

**Kết quả:** ✅ **Giống WORKFLOW_2** (contract status updated, notification sent, contract PDF chưa có, contract sẽ tự động expire nếu customer không approve/sign)

---

### **BƯỚC 4-5: CUSTOMER XEM VÀ KÝ HỢP ĐỒNG, THANH TOÁN CỌC** ✍️💰
- ✅ **Giống WORKFLOW_2** (Arrangement)
- **Use Cases 22-30:** Xem chi tiết contract, export PDF, approve, request change, cancel, sign contract, thanh toán deposit, top up wallet, view wallet transactions
- **Kết quả:** Contract signed, deposit paid, contract status = 'active_pending_assignment'

---

### **BƯỚC 6-18: TASK ASSIGNMENT, SPECIALIST WORK, REVIEW, DELIVERY CHO ARRANGEMENT MILESTONE** 🎯🎼
- ✅ **Giống WORKFLOW_2** (Arrangement) - tất cả các bước từ task assignment đến customer accept
- ⚠️ **Khác biệt:**
  - **BƯỚC 8:** Recording milestone planned dates được tính từ cursor (chưa có booking khi Start Work)
  - **BƯỚC 18:** Khi customer accept submission của arrangement milestone (lần đầu hoặc sau revision), system tự động link với Recording milestone:
    - Chỉ link nếu arrangement milestone này là arrangement milestone cuối cùng (orderIndex cao nhất)
    - `recordingMilestone.sourceArrangementMilestoneId` = arrangement milestone ID
    - `recordingMilestone.sourceArrangementSubmissionId` = submissionId

---

### **BƯỚC 19: CUSTOMER THANH TOÁN ARRANGEMENT MILESTONE** 💰
- ✅ **Giống WORKFLOW_2** về payment flow
- ⚠️ **Khác biệt:**
  - Sau khi thanh toán arrangement milestone → `actualEndAt` được set
  - **⚠️ QUAN TRỌNG:** Recording milestone chỉ có thể tạo booking SAU KHI arrangement milestone đã thanh toán (`actualEndAt != null`)

---
---

### **BƯỚC 20: MANAGER TẠO STUDIO BOOKING CHO RECORDING MILESTONE** 🎙️

#### **Use Cases:**

81. **View Recording Milestone** (Manager)
    - Manager xem recording milestone (milestoneType = 'recording')
    - Xem trạng thái: tất cả arrangement milestones đã COMPLETED hoặc READY_FOR_PAYMENT
    - Xem preferred vocalists từ service request (tối đa 2)

82. **Create Studio Booking for Recording Milestone** (Manager)
    - Manager click "Book Studio" button
    - **✅ ĐIỀU KIỆN BẮT BUỘC ĐỂ TẠO BOOKING:**
      1. **Milestone type = 'recording'** (phải là recording milestone)
      2. **Contract type = 'arrangement_with_recording'** (phải là contract arrangement với recording)
      3. **Contract status = 'active' hoặc 'active_pending_assignment'**
         - ⚠️ **Lưu ý:** Code cho phép cả 'active_pending_assignment', nhưng thực tế điều kiện 4 (tất cả arrangement milestones đã COMPLETED) sẽ đảm bảo contract phải đã start work (status = 'active')
         - Contract status 'active_pending_assignment' = đã thanh toán deposit, chưa start work → arrangement milestones chưa thể completed
      4. **✅ TẤT CẢ arrangement milestones đã COMPLETED hoặc READY_FOR_PAYMENT** (bắt buộc!)
         - Tìm tất cả arrangement milestones (milestoneType = 'arrangement')
         - Check tất cả đều có work_status = 'COMPLETED' hoặc 'READY_FOR_PAYMENT'
         - Nếu chưa → throw error: "All arrangement milestones must be completed before creating booking for recording"
         - **Lý do:** Cần có file arrangement cuối cùng để thu âm
         - ⚠️ **Lưu ý:** Điều kiện này đảm bảo contract phải đã start work (vì milestones chỉ có thể completed sau khi start work)
      5. **✅ TẤT CẢ arrangement milestones đã có actualEndAt (đã thanh toán)** (bắt buộc!)
         - Check arrangement milestone cuối cùng phải có `actualEndAt != null`
         - Nếu chưa thanh toán (`actualEndAt = null`) → throw error: "All arrangement milestones must be paid (actualEndAt must be set) before creating booking"
         - **Lý do:** Đảm bảo booking date validation chính xác, không bị lệch nếu customer thanh toán muộn
      6. **Studio active** (phải có studio active trong hệ thống)
      7. **Booking date phải trong SLA range:**
         - `recordingStartDate` = actualEndAt của arrangement milestone cuối cùng (đã được validate ở trên)
         - `recordingDueDate` = recordingStartDate + recording milestone SLA days
         - `bookingDate >= recordingStartDate && bookingDate <= recordingDueDate`
      8. **Artists availability** (không conflict với bookings khác)
    - ⚠️ **QUAN TRỌNG:**
      - **✅ PHẢI đợi customer thanh toán arrangement milestones** trước khi tạo booking
      - Arrangement milestones phải COMPLETED hoặc READY_FOR_PAYMENT (customer đã accept work)
      - **VÀ phải có `actualEndAt` (đã thanh toán)** - đây là điều kiện BẮT BUỘC
      - Booking date validation sẽ dùng `actualEndAt` (đã được đảm bảo có)
      - **✅ Lợi ích:** Booking date validation chính xác, không bị lệch vì đã đợi customer thanh toán trước
    - API: POST /studio-bookings/for-recording-milestone
    - Request body: { milestoneId, studioId, bookingDate, startTime, endTime, durationHours, artists, purpose, specialInstructions, notes }
    - ⚠️ **Lưu ý:** KHÔNG có equipment trong arrangement_with_recording booking (chỉ có vocalists)
    - ⚠️ **Lưu ý:** Booking date/time được chọn KHI TẠO BOOKING (không phải trong service request)
    - **Backend xử lý:**
      1. Validate milestone type = 'recording'
      2. Validate contract type = 'arrangement_with_recording'
      3. Validate contract status = 'active' hoặc 'active_pending_assignment'
         - ⚠️ **Lưu ý:** Code cho phép cả 'active_pending_assignment', nhưng thực tế điều kiện 4 (tất cả arrangement milestones đã COMPLETED) sẽ đảm bảo contract phải đã start work (status = 'active')
      4. **Validate tất cả arrangement milestones đã COMPLETED hoặc READY_FOR_PAYMENT:**
         - Tìm tất cả arrangement milestones (milestoneType = 'arrangement')
         - Check tất cả đều có work_status = 'COMPLETED' hoặc 'READY_FOR_PAYMENT'
         - Nếu chưa → throw error: "All arrangement milestones must be completed before creating booking for recording"
      5. **⚠️ QUAN TRỌNG: Validate tất cả arrangement milestones đã có actualEndAt (đã thanh toán):**
         - Check arrangement milestone cuối cùng phải có `actualEndAt != null`
         - Nếu chưa thanh toán (`actualEndAt = null`) → throw error: "All arrangement milestones must be paid (actualEndAt must be set) before creating booking"
         - **Lý do:** Đảm bảo booking date validation chính xác, không bị lệch nếu customer thanh toán muộn
         - **⚠️ THAY ĐỔI:** Trước đây cho phép booking khi chưa thanh toán (dùng finalCompletedAt), nhưng giờ yêu cầu phải thanh toán trước
      6. Validate studio active
      7. **Validate booking date trong SLA range của recording milestone:**
         - **Tính SLA range thực tế (KHÔNG dùng plannedDueDate từ Start Work):**
           - **Start date (recordingStartDate):** Dùng `actualEndAt` của arrangement milestone cuối cùng (đã được validate ở trên)
             - ✅ **Đảm bảo:** `actualEndAt` luôn có (đã thanh toán) nên booking date validation chính xác
             - ✅ **Không còn vấn đề:** Booking date không bị lệch vì đã đợi customer thanh toán trước khi cho phép booking
           - **Due date (recordingDueDate):** `recordingStartDate + recording milestone SLA days`
           - ⚠️ **Lưu ý:** KHÔNG dùng plannedDueDate từ Start Work (tính từ cursor), mà tính lại từ arrangement completion + SLA days
         - **Validation:** Booking date phải trong range: `bookingDate >= recordingStartDate && bookingDate <= recordingDueDate`
         - ⚠️ **Nếu booking date < recordingStartDate hoặc booking date > recordingDueDate → throw error:** "Booking date must be within recording milestone SLA range: {recordingStartDate} to {recordingDueDate} (calculated from arrangement completion date)"
         - ⚠️ **Lưu ý:** 
           - Booking date có thể nằm trong plannedDueDate từ Start Work HOẶC ngoài (nếu SLA thấp hoặc arrangement bị revision nhiều)
           - Nhưng booking date PHẢI <= recordingDueDate (arrangement completion + SLA days)
           - Booking date validation dựa trên actual completion date, không phải planned dates
      7. Validate artists availability (check conflicting bookings)
      8. **✅ Lưu ý về planned dates:**
         - **Khi Contract Start Work (CHỈ 1 LẦN, trước milestone 1):**
           - Gọi `calculatePlannedDatesForAllMilestones(contractId, workStartAt, true)`
           - ✅ **Với luồng 3 (Arrangement with Recording): Recording milestone LUÔN LUÔN chưa có booking khi Start Work**
           - **Lý do:** Manager phải đợi TẤT CẢ arrangement milestones completed trước khi tạo booking
           - → Recording milestone plannedStartAt = cursor (từ milestone arrangement cuối cùng), plannedDueDate = cursor + SLA days
           - ⚠️ **Lưu ý:** Code có logic check booking (nếu có booking khi Start Work → dùng booking date), nhưng trong luồng 3 không bao giờ xảy ra vì booking được tạo SAU khi arrangement milestones completed
         - **Sau khi tạo booking (nếu contract đã Start Work):**
           - **✅ KHÔNG cần update planned dates sau khi tạo booking**
           - Planned dates ban đầu (từ cursor khi Start Work) được giữ nguyên như baseline
           - **Lý do:** 
             - Planned dates là ước tính ban đầu (baseline) từ Start Work
             - Booking date validation dựa trên **actualEndAt (đã thanh toán)** của arrangement milestone cuối + SLA days (không dựa trên planned dates)
             - Booking date đã được validate trong SLA range thực tế
             - **Deadline milestone (hard) tính từ actualEndAt(arrangement) + SLA days**, không tính lại từ booking date
         - **⚠️ Trường hợp milestone arrangement trước đó bị revision nhiều:**
           - **Vấn đề:** Nếu milestone arrangement bị revision nhiều, actual completion date (finalCompletedAt/actualEndAt) sẽ muộn hơn plannedDueDate ban đầu
           - **Planned dates của recording milestone:** Vẫn giữ nguyên (baseline) từ Start Work, KHÔNG được update
           - **Booking date validation:** Dựa trên **actual completion date** của arrangement milestone cuối cùng + SLA days
             - **✅ Dùng `actualEndAt` (đã thanh toán - milestone thực sự hoàn thành)**
             - ⚠️ **QUAN TRỌNG:** Booking chỉ được tạo khi arrangement milestones đã thanh toán (actualEndAt đã có), nên booking date validation luôn chính xác
           - **Kết quả:**
             - Recording milestone plannedDueDate (baseline) có thể sớm hơn so với booking date validation range (tính từ actual completion)
             - ✅ **Điều này OK vì:**
               - Planned dates = baseline (ước tính ban đầu), không cần update
               - Booking date validation = thực tế (actualEndAt(arrangement)), đảm bảo booking date hợp lệ
               - **Deadline milestone (hard) = actualEndAt(arrangement) + SLA days** (booking không làm dời deadline)
             - **Ví dụ:**
               - Arrangement milestone plannedDueDate = Day 10 (từ Start Work)
               - Arrangement milestone bị revision nhiều → finalCompletedAt = Day 15 (muộn hơn 5 ngày)
               - **✅ Customer đã thanh toán (actualEndAt = Day 18) - ĐIỀU KIỆN BẮT BUỘC:**
                 - Booking date validation range = Day 18 (actualEndAt) đến Day 23 (Day 18 + SLA 5)
                 - → Manager có thể book từ Day 18-23 (dựa trên actualEndAt - chính xác)
                 - ✅ **Đảm bảo:** Booking date validation luôn chính xác vì đã đợi customer thanh toán trước
               - Recording milestone plannedDueDate = Day 10 + SLA 5 = Day 15 (baseline, không đổi)
               - ⚠️ **Lưu ý:** Không còn "Trường hợp B: Customer chưa thanh toán" vì booking chỉ được tạo khi đã thanh toán
         - **Khi activate recording milestone:**
           - Gọi `activateAssignmentsForMilestone` → chỉ activate task, KHÔNG recalculate planned dates
           - Planned dates giữ nguyên từ khi Start Work (baseline)
         - ✅ **QUAN TRỌNG:** 
           - **Planned dates = baseline (ước tính ban đầu)** từ Start Work
           - **Booking date validation = actualEndAt(arrangement) + SLA days** (thực tế)
           - **Deadline milestone (hard) = actualEndAt(arrangement) + SLA days** (booking không làm dời deadline)
           - ✅ **Không cần recalculate:** planned dates là baseline, còn hard deadline/boundary tính theo actualEndAt(arrangement)
      9. Tạo StudioBooking:
         - context: CONTRACT_RECORDING
         - status: CONFIRMED (đã chốt lịch)
         - milestoneId: recording milestone ID
         - bookingDate, startTime, endTime, durationHours
         - equipmentRentalFee: 0 (KHÔNG có equipment cho arrangement_with_recording)
         - totalCost: 0 (không tính lại giá, contract price đã được tính từ pricing matrix)
      10. Tạo BookingArtist records (nếu có artists/vocalists)
      11. ⚠️ **KHÔNG tạo BookingEquipment records** (arrangement_with_recording không có equipment)
      12. **Link booking với recording task (nếu đã có task):**
         - Tìm recording task (taskType = 'RECORDING_SUPERVISION')
         - Update task.studioBookingId = bookingId
      13. **Unlock recording milestone nếu cần:**
         - Nếu milestone có task đã accepted → status: 'PLANNED' → 'TASK_ACCEPTED_WAITING_ACTIVATION'
         - Activate assignments cho milestone (nếu có task accepted)
      14. Gửi StudioBookingCreatedEvent → Notification service tạo system notification cho Customer và Artist: "Studio booking created"

**Kết quả:**
- ✅ StudioBooking được tạo (status: CONFIRMED)
- ✅ BookingArtist records được tạo (nếu có artists/vocalists)
- ⚠️ **KHÔNG có BookingEquipment records** (arrangement_with_recording không có equipment)
- ✅ **Nếu đã có recording task:**
  - Task.studioBookingId = bookingId (link với booking)
- ✅ **Nếu recording milestone có task đã accepted:**
  - Milestone work_status: 'PLANNED' → 'TASK_ACCEPTED_WAITING_ACTIVATION'
  - Task assignments được activate: 'accepted_waiting' → 'ready_to_start'
- ✅ **Recording milestone planned dates:**
  - **Khi Contract Start Work (CHỈ 1 LẦN, trước milestone 1):**
    - ✅ **Với luồng 3: Recording milestone LUÔN LUÔN chưa có booking khi Start Work**
    - **Lý do:** Manager phải đợi TẤT CẢ arrangement milestones completed trước khi tạo booking
    - → `plannedStartAt = cursor` (từ milestone arrangement cuối cùng)
    - → `plannedDueDate = cursor + SLA days`
  - **Sau khi tạo booking (nếu contract đã Start Work):**
    - **✅ KHÔNG được update planned dates sau khi tạo booking**
    - Planned dates ban đầu (từ cursor khi Start Work) được giữ nguyên như baseline
    - **Lý do:** Planned dates là baseline (ước tính ban đầu), booking date validation dựa trên actual completion date
  - ✅ **Planned dates = baseline (ước tính ban đầu)**
- ✅ Customer và Artist nhận system notification "Studio booking created" (trong hệ thống)
- ✅ **Recording milestone deadline là HARD deadline theo milestone window (KHÔNG tính lại từ booking date):**
  - `deadline = actualEndAt(arrangement milestone cuối cùng, đã thanh toán) + recording milestone SLA days`
  - Booking chỉ là điều kiện để tổ chức session, **không gia hạn deadline**
- ✅ **Booking date validation:**
  - **Booking date phải trong range:** `[recordingStartDate, recordingDueDate]`
  - **recordingStartDate (tính từ arrangement milestone cuối cùng):**
    - **✅ Dùng `actualEndAt` của arrangement milestone cuối cùng (thời điểm milestone được thanh toán - milestone thực sự hoàn thành)**
      - ⚠️ **QUAN TRỌNG:** Booking chỉ được tạo khi arrangement milestones đã thanh toán (actualEndAt đã có), nên booking date validation luôn chính xác
      - ⚠️ **Lý do:** Đảm bảo booking date validation chính xác, không bị lệch vì đã đợi customer thanh toán trước
    - **Fallback:** `plannedStartAt` của recording milestone (chỉ dùng nếu chưa có actualEndAt - trường hợp này không nên xảy ra vì booking chỉ được tạo khi đã thanh toán)
  - **recordingDueDate:** `recordingStartDate + recording milestone SLA days`
  - **Validation:** `bookingDate >= recordingStartDate && bookingDate <= recordingDueDate`
  - **KHÔNG dựa trên plannedDueDate từ Start Work**, mà tính từ **actual completion date** của arrangement milestone
  - ⚠️ **Nếu booking date < recordingStartDate hoặc booking date > recordingDueDate → throw error:** "Booking date must be within recording milestone SLA range"
  - ✅ **Lưu ý:** 
    - Booking date validation và planned dates là 2 hệ thống độc lập
    - Planned dates = baseline (ước tính ban đầu)
    - Booking date validation = actualEndAt(arrangement) + SLA days (thực tế)
    - **Deadline milestone (hard) = actualEndAt(arrangement) + SLA days** (booking không làm dời deadline)

---

### **BƯỚC 21: MANAGER PHÂN CÔNG TASK CHO RECORDING MILESTONE** 🎯

#### **Use Cases:**

83. **View Recording Milestone** (Manager)
    - Manager xem recording milestone
    - Xem studio booking đã được tạo (nếu có)
    - Xem trạng thái milestone: 'PLANNED', 'WAITING_ASSIGNMENT', 'WAITING_SPECIALIST_ACCEPT', etc.
    - ⚠️ **Lưu ý:** Task có thể được assign TRƯỚC khi tạo booking (không cần đợi arrangement milestones completed)

84. **Select Specialists for Recording** (Manager)
    - ✅ **Giống WORKFLOW_2** về cách select và tính workload
    - ⚠️ **Khác biệt:**
      - Filter theo specialization: 'ARRANGEMENT' (recording supervision thường do arrangement specialist làm)
      - **VẪN filter theo skillNames và mainInstrumentName** (từ service request instruments) - vì thường do arrangement specialist làm nên cần match instruments
      - **Recording milestone deadline là hard deadline theo milestone window** (không phụ thuộc booking date) - xem chi tiết logic deadline ở Edge Case 5
    - **Response:** Danh sách specialists với workload info (tasksInSlaWindow, totalOpenTasks) và matchRatio

85. **Assign Task to Specialist (Recording)** (Manager)
    - ✅ **Giống WORKFLOW_2** về cách assign task
    - ⚠️ **Khác biệt:**
      - **task_type: 'RECORDING_SUPERVISION'** (thay vì 'arrangement')
      - **KHÔNG cần đợi arrangement milestones completed** (khác với booking!)
      - **Có thể assign task TRƯỚC hoặc SAU khi tạo booking** (linh hoạt)
      - **Tự động gợi ý arrangement specialist đã làm arrangement task trước đó:**
        - Tìm arrangement task trong cùng contract
        - Ưu tiên: completed > in_progress > assigned
        - Tự động chọn specialist từ arrangement task (nếu có trong danh sách)
        - Hiển thị message: "Đã tự động chọn arrangement specialist: [name]"
      - **Tự động link studio booking nếu đã có** (tìm booking theo milestoneId hoặc contractId)

86. **Send Task Notification** (Manager)
    - ✅ **Giống WORKFLOW_2** (hệ thống tạo notification, specialist nhận notification)

**Kết quả:** ✅ **Giống WORKFLOW_2** (task assignment created, notification sent, chat room created)
- ⚠️ **Khác biệt:** task_type = 'RECORDING_SUPERVISION', task.studioBookingId được link nếu đã có booking

---

### **BƯỚC 22: SPECIALIST NHẬN VÀ ACCEPT TASK (RECORDING)** 🎼

#### **Use Cases:**
87-90. **View Dashboard, View Tasks, View Task Details, Accept Task** (Arrangement Specialist)
    - ✅ **Giống WORKFLOW_2** về flow view và accept task
    - ⚠️ **Khác biệt:**
      - Task type = 'RECORDING_SUPERVISION' (thay vì 'arrangement')
      - **Xem arrangement files** (final arrangement đã được customer accept) - được tự động link với Recording milestone
      - **Xem studio booking details** (date, time, location, artists/vocalists)
      - **Auto-link studio booking nếu chưa link** khi accept task

**Kết quả:** ✅ **Giống WORKFLOW_2** (task/milestone status updated, specialist_started_at set)
- ⚠️ **Khác biệt:** Task.studioBookingId được link với booking (nếu chưa link)

---

### **BƯỚC 23: ACTIVATE RECORDING MILESTONE** 🚀

#### **Use Cases:**
91. **Activate Recording Milestone** (System/Manager)
    - ⚠️ **Lưu ý:** KHÔNG có "Start Work" riêng cho Recording milestone
    - **Start Work chỉ được gọi 1 lần** cho toàn bộ contract (trước milestone 1)
    - Recording milestone được activate tự động khi:
      - Task đã được accept VÀ có studio booking
      - Hoặc khi tạo booking (nếu task đã accepted)
    - **Điều kiện BẮT BUỘC để activate:**
      1. Contract status = 'active' (đã Start Work)
      2. Recording Milestone có task assignment
      3. Task assignment đã được Specialist accept (status = accepted_waiting)
      4. **Recording Milestone phải có studio booking** (bắt buộc!)
    - **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate, update milestone/task status, send notification)
    - ⚠️ **Khác biệt:** 
      - **Validate: Recording Milestone có studio booking** (nếu không có → throw error)
      - **KHÔNG cần recalculate planned dates** (planned dates là baseline từ Start Work)

**Kết quả:** ✅ **Giống WORKFLOW_2** (milestone/task status updated, notification sent)
- ⚠️ **Khác biệt:** 
  - **Recording milestone deadline là hard deadline theo milestone window** (không phụ thuộc booking date) (xem chi tiết logic deadline ở Edge Case 5)
  - **Planned dates là baseline** (đã được tính khi Start Work, giữ nguyên như ước tính ban đầu)

---

### **BƯỚC 24: SPECIALIST START TASK (RECORDING)** 🚀

#### **Use Cases:**
92. **Start Task Assignment (Recording)** (Arrangement Specialist)
    - ✅ **Giống WORKFLOW_2** về flow start task
    - ⚠️ **Khác biệt:**
      - **Điều kiện BẮT BUỘC:** Task có studio booking (studioBookingId != null)
      - **Booking status = 'CONFIRMED', 'IN_PROGRESS', hoặc 'COMPLETED'**
      - **Thời gian (frontend validation):** Chỉ cho phép start trong vòng 7 ngày TRƯỚC booking date, không quá 1 ngày SAU booking date
      - **KHÔNG check plannedDueDate khi start task** (chỉ check booking date và booking status)
    - API: POST /task-assignments/{assignmentId}/start
    - **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate, update task/milestone status, set specialistRespondedAt)
    - ⚠️ **Khác biệt:** **Validate: Task có studio booking** (nếu không có → throw error)

**Kết quả:** ✅ **Giống WORKFLOW_2** (task/milestone status updated, actualStartAt set, specialistRespondedAt set)
- ⚠️ **Khác biệt:** 
  - **Deadline vẫn tính từ booking date, KHÔNG phải actualStartAt** (khác với arrangement milestone)
  - Start task KHÔNG check plannedDueDate, chỉ check booking date và booking status

---

### **BƯỚC 25: CHUẨN BỊ RECORDING SESSION** 🎙️

#### **Use Cases:**

93. **View Recording Sessions** (Artist)
    - Artist xem danh sách recording sessions được book
    - Xem booking details: date, time, location, studio

94. **View Session Details** (Artist)
    - Xem chi tiết:
      - Ngày giờ recording
      - Arrangement files (final arrangement đã được customer accept)
      - Recording notes (nếu có)
      - Studio location
      - ⚠️ **KHÔNG có equipment list** (arrangement_with_recording không có equipment)

95. **Review Arrangement Files** (Artist)
    - Artist download & review arrangement files trước recording
    - Practice nếu cần
    - Artist có thể coordinate với Specialist qua chat

**Kết quả:** ✅ Recording session scheduled, artist đã review arrangement files, all parties notified

---

### **BƯỚC 26: RECORDING SESSION & UPLOAD FILES** 🎤

#### **Lưu ý:**
- ⚠️ **Recording session là OFFLINE:** Artist và Specialist thực hiện recording tại studio (không có check-in/join session trong hệ thống)
- Sau khi recording xong, Specialist upload files vào hệ thống

#### **Use Cases:**

96. **Upload Audio Files** (Arrangement Specialist)
     - Sau khi recording session hoàn thành (offline tại studio)
     - Specialist upload recorded audio files vào hệ thống
     - API: POST /files/upload
     - Request: multipart/form-data với file, assignmentId, description (optional), contentType
     - **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate task status, upload to S3, create File entity)
     - ⚠️ **Khác biệt:** fileSource = 'studio_recording', contentType = 'audio' (thay vì 'specialist_output' và 'notation')
     - Files được lưu với status 'uploaded', chưa có submissionId
     - Specialist có thể upload nhiều files (raw takes, processed versions) trước khi submit

97. **Submit Files for Review (Recording)** (Arrangement Specialist)
     - Specialist đã upload recorded audio files (file status: 'uploaded')
     - Specialist review/check lại files trước khi submit
     - Specialist chọn files và click "Submit for Review"
     - **Điều kiện:** Task status = 'in_progress', 'revision_requested', hoặc 'in_revision'
     - API: POST /specialist/task-assignments/{assignmentId}/submit-for-review
     - Request body: { fileIds: [array of file IDs] }
     - **Backend xử lý:** ✅ **Giống WORKFLOW_2** (tạo submission, update task status, handle revision request nếu có)
     - ⚠️ CHƯA deliver cho customer! (Manager phải approve và deliver sau)

**Kết quả:** ✅ **Giống WORKFLOW_2** (submission created, files added, task status updated, revision request handled nếu có, progress = 50%, notification sent)

---

### **BƯỚC 27: MANAGER REVIEW RECORDING** ✅

#### **Use Cases:**
98-101. **Monitor, View, Review, Approve/Reject** (Manager)
     - ✅ **Giống WORKFLOW_2** (monitor progress, view submissions, review files, approve/reject)
     - ⚠️ **Khác biệt:** Review recording quality (audio) thay vì arrangement files (notation)

#### **OPTION A: MANAGER APPROVE** ✅
- Manager click "Approve Submission"
- API: POST /submissions/{submissionId}/approve
- **Điều kiện:** Submission status = 'pending_review', Task assignment status = 'ready_for_review'
- **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate, update submission/task status, handle revision request nếu có)

**Kết quả (nếu Approve):** ✅ **Giống WORKFLOW_2** (submission/task status updated, revision request handled nếu có, progress = 75%, notification sent)

#### **OPTION B: MANAGER REJECT** ❌
- Manager click "Reject Submission"
- API: POST /submissions/{submissionId}/reject
- **Điều kiện:** Submission status = 'pending_review', Task assignment status = 'ready_for_review'
- Manager nhập rejection reason (bắt buộc)
- **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate, update submission/files status, handle revision request nếu có, update task status)
- ⚠️ **Khác biệt:** Specialist upload files mới/chỉnh sửa lại files (không cần reschedule recording session)

**Kết quả (nếu Reject):** ✅ **Giống WORKFLOW_2** (submission/files status updated, revision request handled nếu có, task status updated, progress = 40%, notification sent)
- ⚠️ **Khác biệt:** Specialist upload files mới/chỉnh sửa lại files (không cần reschedule recording session)

---

### **BƯỚC 28: MANAGER GIAO FILE CHO CUSTOMER (RECORDING)** 📦 (CHỈ KHI APPROVE)

#### **Use Cases:**
102. **Deliver Files to Customer** (Manager)
     - Manager click "Deliver to Customer"
     - **Điều kiện:** Submission status = 'approved' (phải approve trước!)
     - API: POST /submissions/{submissionId}/deliver
     - **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate, deliver files, update submission/task/milestone status, handle revision request nếu có, track firstSubmissionAt)

**Kết quả:** ✅ **Giống WORKFLOW_2** (files delivered, submission/task/milestone status updated, revision request handled nếu có, firstSubmissionAt tracked, notification sent)

---

### **BƯỚC 29: CUSTOMER NHẬN VÀ ĐÁNH GIÁ (RECORDING)** 👀

#### **Use Cases:**
103-105. **Track Progress, View Files, Download** (Customer)
     - ✅ **Giống WORKFLOW_2** (track progress, view deliverable files, download files)
     - ⚠️ **Khác biệt:** Download recorded audio files (WAV, MP3, FLAC) thay vì arrangement files (MusicXML, PDF)

**2 LỰA CHỌN:**

#### **OPTION A: CUSTOMER HÀI LÒNG** ✅

106. **Accept Submission (Recording)** (Customer) ← **NHẬN SUBMISSION, KHÔNG PHẢI MILESTONE!**
     - Customer click "Accept Submission"
     - API: POST /submissions/{submissionId}/customer-review (action = "accept")
     - **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate, handle revision request nếu có, update submission/task/milestone status, mở installment hoặc unlock milestone tiếp theo, check contract completion)

**Kết quả:** ✅ **Giống WORKFLOW_2** (submission/task/milestone status updated, revision request handled nếu có, installment mở hoặc milestone tiếp theo unlock, contract completion checked, progress = 95%)

#### **OPTION B: CUSTOMER YÊU CẦU RE-RECORDING** 🔄

107. **Request Revision (Recording)** (Customer) ← **CHO FILE SUBMISSIONS, KHÔNG PHẢI CONTRACT!**
     - Customer yêu cầu record lại
     - Customer nhập:
       - title: Tiêu đề yêu cầu sửa (bắt buộc)
       - description: Mô tả chi tiết yêu cầu sửa (bắt buộc)
     - **2 TRƯỜNG HỢP:**

#### **TRƯỜNG HỢP A: CÒN FREE REVISION** ✅
- Hệ thống kiểm tra: freeRevisionsUsed < contract.freeRevisionsIncluded
- API: POST /submissions/{submissionId}/customer-review (action = "request_revision")
- **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate, tạo RevisionRequest với isFreeRevision=true)

#### **TRƯỜNG HỢP B: HẾT FREE REVISION** 💰
- ✅ **Giống WORKFLOW_2** (check free revisions, customer thanh toán revision fee, backend xử lý payment, event consumer tạo RevisionRequest)

**Kết quả (cả 2 trường hợp):** ✅ **Giống WORKFLOW_2** (RevisionRequest created, notification sent)

---

### **BƯỚC 30A: MANAGER XỬ LÝ REVISION REQUEST (RECORDING)** 🔧

#### **Use Cases:**
108. **Review Revision Requests** (Manager)
     - Manager xem danh sách revision requests (status: PENDING_MANAGER_REVIEW)
     - Xem chi tiết yêu cầu sửa của customer (title, description)
     - Xem revision round, isFreeRevision, paidWalletTxId (nếu có)

109. **Approve/Reject Revision Request** (Manager)
     - API: POST /revision-requests/{revisionRequestId}/review
     - **2 LỰA CHỌN:**

#### **OPTION A: MANAGER APPROVE** ✅
- Manager click "Approve Revision Request"
- Manager nhập managerNote (optional)
- **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate, update revision request/task/milestone/submission status)

**Kết quả:** ✅ **Giống WORKFLOW_2** (revision request/task/milestone/submission status updated, notification sent)
- ⚠️ **Khác biệt:** Specialist upload files mới/chỉnh sửa lại files (không cần reschedule recording session)

#### **OPTION B: MANAGER REJECT** ❌
- Manager click "Reject Revision Request"
- Manager nhập managerNote (lý do từ chối - bắt buộc)
- **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate, update revision request status, refund nếu là paid revision)

**Kết quả:** ✅ **Giống WORKFLOW_2** (revision request status updated, refund nếu paid, notification sent)

---

### **BƯỚC 30B: CUSTOMER THANH TOÁN MILESTONE 3 (RECORDING)** 💰

#### **Use Cases (sau khi Accept Recording Submission):**

110. **Pay Milestone 3 Installment** (Customer)
     - Customer chọn Installment của Recording Milestone (nếu milestone có hasPayment=true)
     - **Payment method: Wallet** (customer thanh toán bằng wallet của họ)
     - **Amount: installment.amount** (đã có sẵn trong installment, không cần tính lại!)
     - **Check wallet balance:** Nếu không đủ → cần top up wallet trước
     - API: POST /wallets/{walletId}/pay-milestone
     - Request body: { amount, currency, contractId, milestoneId, installmentId }
     - **Backend xử lý:** ✅ **Giống WORKFLOW_2** (validate wallet balance, trừ tiền, tạo transaction, update installment/milestone status, check contract completion)

**Kết quả:** ✅ **Giống WORKFLOW_2** (wallet balance trừ, transaction created, installment/milestone status updated, contract completion checked)
- ⚠️ **Khác biệt:** Earnings được distributed cho Arrangement Specialist + Artist (khác với arrangement thuần chỉ có Specialist)

---

## ✅ TỔNG KẾT

### **110 use cases** (Customer: ~35, Manager: ~45, Specialist: ~25, Artist: ~3, System: ~2)

### **ĐIỂM KHÁC BIỆT SO VỚI ARRANGEMENT THUẦN:**

1. **Default milestones:** 2 milestones (Arrangement + Recording), milestoneType: 'arrangement' hoặc 'recording'
2. **Recording milestone:** task_type = 'RECORDING_SUPERVISION', phải có studio booking, **deadline là hard deadline** = `actualEndAt(arrangement milestone cuối cùng, đã thanh toán) + SLA days` (booking không gia hạn)
3. **Thứ tự milestones:** Arrangement milestones trước Recording milestone, files tự động link
4. **Studio booking:** Bắt buộc, chỉ tạo sau khi arrangement milestones đã thanh toán
5. **Artist actor:** Thêm actor mới với use cases riêng
6. **Phức tạp hơn:** Cần sync availability, coordination, split earnings

---

## ⚠️ EDGE CASES QUAN TRỌNG:

### **1. Recording Milestone Phải Có Studio Booking:**
- **Scenario:** Recording milestone không có studio booking
- **Solution:** Manager phải tạo studio booking trước khi specialist start work
- **Validation:** Recording task không thể start nếu không có studioBookingId

### **2. Tất Cả Arrangement Milestones Phải Completed:**
- **Scenario:** Manager cố tạo booking cho recording milestone khi arrangement milestones chưa completed
- **Solution:** Backend validate và throw error: "All arrangement milestones must be completed before creating booking for recording"
- **Lý do:** Cần có file arrangement cuối cùng để thu âm

### **3. Arrangement Milestones Phải Trước Recording Milestone:**
- **Scenario:** Manager cố tạo recording milestone trước arrangement milestones
- **Solution:** Backend validate thứ tự milestones: arrangement milestones phải có orderIndex thấp hơn recording milestone
- **Lý do:** Recording cần file arrangement để thu âm, nên phải làm arrangement trước

### **4. File Arrangement Được Tự Động Link Với Recording Milestone:**
- **Scenario:** Arrangement milestone cuối cùng được customer accept
- **Solution:** System tự động link arrangement submission với recording milestone:
  - Recording milestone.sourceArrangementMilestoneId = arrangement milestone ID
  - Recording milestone.sourceArrangementSubmissionId = submissionId
  - Recording specialist có thể download arrangement files từ recording milestone
- **Lý do:** Recording specialist cần arrangement files để làm recording

### **5. Recording Milestone Deadline (Hard Deadline) - Luồng 3:**
- **Recording milestone deadline (hard):** `actualEndAt(arrangement milestone cuối cùng, đã thanh toán) + SLA days`
- **Booking date constraint:** booking date phải nằm trong milestone window và **không được làm dời deadline**
- **Logic ưu tiên (backend / targetDeadline):** arrangement actualEndAt + SLA → (fallback) plannedDueDate → plannedStartAt + SLA
- **Khác với luồng 4 (recording-only):** recording-only dùng booking date + SLA, còn luồng 3 dùng hard deadline theo arrangement paid date + SLA

### **6. Arrangement Milestone Bị Revision Nhiều:**
- **Solution:** Planned dates giữ nguyên (baseline), booking date validation dùng actualEndAt + SLA days
- **Kết quả:** Booking date validation luôn chính xác vì đã đợi customer thanh toán trước khi cho phép booking

### **7. Artist Không Đến / Multiple Takes:**
- **Solution:** Specialist upload files mới/chỉnh sửa lại files
- ⚠️ **Lưu ý:** Reschedule recording session chưa được implement trong hệ thống
