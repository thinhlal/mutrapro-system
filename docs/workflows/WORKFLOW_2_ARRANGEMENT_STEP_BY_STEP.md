# LUỒNG 2: ARRANGEMENT (CHỈ ARRANGEMENT) - CHI TIẾT TỪNG BƯỚC

## 📋 TỔNG QUAN
**Dịch vụ:** Khách hàng cần sắp xếp/biên soạn nhạc (arrangement) từ bản nhạc gốc

**Thời gian:** 5-7 ngày (tùy độ phức tạp)

**Actors:** Customer, Manager, Arrangement Specialist

**Đặc điểm:** CHỈ arrangement, KHÔNG có recording (không cần Artist)

---

## ⚠️ QUAN TRỌNG: INSTALLMENTS vs MILESTONES

### **MILESTONES (Mốc công việc):**
- Là các mốc công việc trong project
- Manager tự tạo trong ContractBuilder
- Có work_status: PLANNED → WAITING_ASSIGNMENT → WAITING_SPECIALIST_ACCEPT → TASK_ACCEPTED_WAITING_ACTIVATION → READY_TO_START → IN_PROGRESS → WAITING_CUSTOMER → READY_FOR_PAYMENT → COMPLETED
- Có thể có payment (hasPayment=true) hoặc không (hasPayment=false)
- Gắn với task_assignments

### **INSTALLMENTS (Đợt thanh toán):**
- Là các đợt thanh toán
- Tự động tạo khi tạo contract:
  - **1 Deposit Installment:** Không gắn với milestone nào (milestoneId=NULL)
  - **N Installments:** Gắn với milestones có hasPayment=true
- Có status: PENDING → DUE → PAID
- Gate conditions:
  - Deposit: BEFORE_START (phải trả trước khi start work)
  - Milestone installments: AFTER_MILESTONE_DONE (trả sau khi milestone completed)

### **VÍ DỤ ARRANGEMENT (ví dụ thông thường, KHÔNG bắt buộc):**
- **Deposit Installment:** 40% (không gắn milestone)
- **Milestone 1:** "Draft Arrangement" (hasPayment=true, paymentPercent=30%)
  - → **Milestone 1 Installment:** 30% (gắn với Milestone 1)
- **Milestone 2:** "Final Arrangement" (hasPayment=true, paymentPercent=30%)
  - → **Milestone 2 Installment:** 30% (gắn với Milestone 2)
- **Tổng:** 40% + 30% + 30% = 100%
- ⚠️ **Lưu ý:** Manager có thể tạo số lượng milestones khác tùy nhu cầu (1, 2, 3... milestones)

---

## 🔄 LUỒNG CHI TIẾT

### **BƯỚC 1: CUSTOMER TẠO YÊU CẦU** 🎵

#### **Use Cases:**
1. **Login to System** (Customer)
2. **View Dashboard** (Customer)
3. **Select Service Type** (Customer)
   - Chọn "Arrangement"

4. **Enter Contact Information** (Customer)
   - Nhập: contact_name, contact_phone, contact_email
   - Có thể khác với thông tin account

5. **Upload Reference Files** (Customer)
   - Upload file notation (.musicxml, .pdf) hoặc audio (.mp3, .wav, etc.)
   - file_source = 'customer_upload'
   - content_type = 'notation' hoặc 'audio'

6. **Select Notation Instruments** (Customer)
   - Chọn nhạc cụ cần arrangement (Piano, Guitar, Violin, etc.)
   - Có thể chọn nhiều loại
   - **Chọn Main Instrument** (bắt buộc): Chọn 1 nhạc cụ làm nhạc cụ chính từ danh sách đã chọn
   - Xem genres, purpose (karaoke, cover, etc.)

7. **View Price Estimation** (Customer)
   - Hệ thống tính giá dự kiến dựa trên:
     - Service type: arrangement
     - **Mặc định: 1 bài** (mỗi request là 1 bài)
     - Base price: CAO HƠN transcription

8. **Submit Service Request** (Customer)
   - Status: 'pending'
   - Chưa có managerUserId

**Kết quả:**
- ✅ Service Request được tạo với status = 'pending', requestType = 'arrangement'
- ✅ Files được upload lên S3
- ✅ Request_notation_instruments được tạo

---

### **BƯỚC 2: MANAGER XEM VÀ NHẬN REQUEST** 👔

#### **Use Cases:**
9. **View Manager Dashboard** (Manager)

10. **View Service Requests** (Manager)
    - Xem tất cả requests đang pending

11. **Search Requests** (Manager)
    - Tìm kiếm theo keyword, customer, date

12. **Filter Requests by Status** (Manager)
    - Filter: pending, assigned, in_progress, etc.

13. **View Request Details** (Manager)
    - Xem chi tiết request của customer
    - Xem files đã upload
    - Xem thông tin liên hệ

14. **Assign Request to Self** (Manager)
    - Manager click "Assign to Me"
    - API: PUT /requests/{requestId}/assign
    - Set managerUserId = current manager
    - Publish RequestAssignedEvent → Chat service tạo REQUEST_CHAT room

**Kết quả:**
- ✅ Request được assign cho Manager
- ✅ managerUserId được set
- ✅ **REQUEST_CHAT room được tạo** giữa Customer và Manager (roomType = REQUEST_CHAT)

---

### **BƯỚC 3: MANAGER TẠO HỢP ĐỒNG** 📄

#### **Use Cases:**
15. **Validate Request Information** (Manager)
    - Kiểm tra thông tin đầy đủ
    - Kiểm tra file hợp lệ

16. **View Request Details** (Manager) ← **Đã có ở Bước 2, nhưng xem lại để lấy thông tin**
    - Xem totalPrice đã được tính sẵn ở Service Request
    - Xem các thông tin khác cần thiết

17. **Create Contract** (Manager)
    - Manager click "Create Contract" button
    - **Chuyển đến trang ContractBuilder** (không phải modal!)
    - **Form tự động điền từ Service Request:**
      - contractType: 'arrangement' (map từ requestType)
      - totalPrice: serviceRequest.totalPrice (đã tính sẵn!)
      - currency: serviceRequest.currency
      - depositPercent: 40% (default, Manager có thể chỉnh)
      - slaDays: 7 days (default cho arrangement, Manager có thể chỉnh)
      - freeRevisionsIncluded: 1 (default, Manager có thể chỉnh)
    
    - **Manager tự tạo Milestones trong form:**
      - ⚠️ **QUAN TRỌNG: Hệ thống KHÔNG có default milestones cho Arrangement**
      - ⚠️ **Số lượng milestones KHÔNG được quy định cứng** - Manager tự quyết định
      - Manager có thể thêm/xóa milestones tùy ý
      - Mỗi milestone có:
        - orderIndex: 1, 2, 3...
        - name: "Draft Arrangement", "Final Arrangement", etc. (Manager tự đặt tên)
        - description
        - milestoneType: 'arrangement' (tự động set dựa trên contractType)
        - hasPayment: true/false (milestone này có thanh toán không?)
        - paymentPercent: % của totalPrice (nếu hasPayment=true)
        - milestoneSlaDays: số ngày SLA cho milestone này
      - **Ví dụ thông thường cho Arrangement (KHÔNG bắt buộc):**
        - Milestone 1: name="Draft Arrangement", hasPayment=true, paymentPercent=30%
        - Milestone 2: name="Final Arrangement", hasPayment=true, paymentPercent=30%
        - (Manager có thể tạo nhiều milestones hơn hoặc ít hơn tùy nhu cầu)
        - (Deposit là installment riêng, không phải milestone!)
    
    - **Manager điều chỉnh nếu cần:**
      - Chỉnh depositPercent
      - Chỉnh slaDays (tổng SLA của contract)
      - Thêm/sửa/xóa milestones
      - Chỉnh paymentPercent cho từng milestone
      - Thêm terms & conditions
    
    - **Manager submit form**
    - API: POST /contracts/from-request/{requestId}
    - **Backend xử lý:**
      1. Lấy Service Request từ request-service
      2. Validate: Request có manager chưa?
      3. Validate: Manager có phải là current user?
      4. Validate: Đã có contract cho request này chưa?
      5. Validate: depositPercent + sum(paymentPercent của milestones có hasPayment=true) = 100%
      6. Validate: sum(milestoneSlaDays) = contract slaDays
      7. Generate contract number
      8. Tạo Contract entity:
         - totalPrice: từ form
         - depositPercent: từ form
         - slaDays: từ form
         - **expectedStartDate: NULL** (chưa set, sẽ set khi Manager start work)
         - status: 'draft'
      9. Lưu Contract vào database
      10. **Tạo Milestones từ form:**
          - Tạo từng milestone theo orderIndex
          - work_status: 'PLANNED'
          - hasPayment: từ form
          - milestoneSlaDays: từ form
      11. **Tạo Installments:**
          - **Installment 1 (DEPOSIT):**
            - type: DEPOSIT
            - milestoneId: NULL (deposit không gắn với milestone!)
            - amount: totalPrice × depositPercent
            - status: PENDING (sẽ chuyển DUE khi contract signed - tự động trong ESignService)
            - gateCondition: BEFORE_START
          - **Installments cho milestones có hasPayment=true:**
            - type: INTERMEDIATE hoặc FINAL (nếu là milestone cuối)
            - milestoneId: gắn với milestone tương ứng
            - amount: totalPrice × paymentPercent
            - status: PENDING
            - gateCondition: AFTER_MILESTONE_DONE

18. **Send Contract to Customer** (Manager)
    - Manager click "Send to Customer"
    - API: POST /contracts/{contractId}/send
    - **Điều kiện:** Contract status = 'draft'
    - **Backend xử lý:**
      1. Validate: Contract status = 'draft'
      2. Validate: Manager owns contract
      3. Contract status: 'draft' → 'sent'
      4. Set sentToCustomerAt = now()
      5. Set expiresAt = now() + 7 days (mặc định, hoặc theo expiresInDays nếu có)
      6. Request status: 'pending' → 'contract_sent'
      7. Gửi ContractSentEvent → Notification service tạo system notification cho Customer
    - ⚠️ **CHƯA có PDF** (PDF chỉ generate sau khi customer sign)

**Kết quả:**
- ✅ Contract status: 'draft' → 'sent'
- ✅ sentToCustomerAt = now()
- ✅ expiresAt = now() + 7 days (mặc định, hoặc theo expiresInDays nếu có)
- ✅ Request status: 'pending' → 'contract_sent'
- ✅ System notification được tạo cho Customer (trong hệ thống)
- ⚠️ **Contract PDF CHƯA có** (chưa generate)
- ⚠️ **Lưu ý:** Contract sẽ tự động expire nếu customer không approve/sign trước expiresAt (scheduled job check mỗi giờ)

---

### **BƯỚC 4: CUSTOMER XEM VÀ KÝ HỢP ĐỒNG** ✍️

#### **Use Cases:**
20. **View Contract Details** (Customer)
    - Xem chi tiết contract
    - Xem contract information, milestones, installments
    - API: GET /contracts/{contractId}
    - Customer có thể xem tất cả milestones và installments của contract

21. **Export Contract PDF** (Customer)
    - Customer có thể export PDF để xem/download
    - PDF được generate ở frontend (React) sử dụng ContractPdfDocument component
    - Nếu contract đã signed: PDF có chứa customer signature
    - Nếu contract chưa signed: PDF không có signature
    - Customer có thể download PDF bất cứ lúc nào (kể cả khi chưa sign)

22. **Approve Contract** (Customer)
    - Customer xem contract và click "Approve"
    - API: POST /contracts/{contractId}/approve
    - **Điều kiện:** Contract status = 'sent'
    - Contract status: 'sent' → 'approved'
    - customerReviewedAt = now()
    - Request status: 'contract_sent' → 'contract_approved'
    - System notification được tạo cho Manager

23. **Request Change Contract** (Customer) ← **THAY VÌ REJECT**
    - Customer có thể yêu cầu chỉnh sửa contract
    - API: POST /contracts/{contractId}/request-change
    - **Điều kiện:** Contract status = 'sent' (chưa approve)
    - Customer nhập lý do (reason) - bắt buộc
    - **Backend xử lý:**
      1. Validate: Contract status = 'sent'
      2. Validate: Customer owns contract
      3. Validate: reason không được rỗng
      4. Contract status: 'sent' → 'need_revision'
      5. Contract cancellationReason = reason (lưu lý do yêu cầu chỉnh sửa)
      6. Contract customerReviewedAt = now()
      7. Request status: 'contract_sent' → 'pending' (để Manager tạo contract mới)
      8. Gửi ContractNotificationEvent (CONTRACT_NEED_REVISION) → Notification service tạo system notification cho Manager: "Customer yêu cầu chỉnh sửa Contract"
    - Manager sẽ tạo contract mới dựa trên yêu cầu chỉnh sửa (quay lại BƯỚC 3: MANAGER TẠO HỢP ĐỒNG)

24. **Cancel Contract** (Customer)
    - Customer có thể hủy contract
    - API: POST /contracts/{contractId}/cancel
    - **Điều kiện:** Contract status = 'sent' (chưa approve, không cho phép hủy khi đã approved/signed/active)
    - Customer nhập lý do (reason) - bắt buộc
    - **Backend xử lý:**
      1. Validate: Contract status = 'sent'
      2. Validate: Customer owns contract
      3. Validate: reason không được rỗng
      4. Contract status: 'sent' → 'canceled_by_customer'
      5. Contract cancellationReason = reason
      6. Contract customerReviewedAt = now()
      7. Request status: 'contract_sent' → 'cancelled'
      8. Gửi ContractNotificationEvent → Notification service tạo system notification cho Manager: "Customer đã hủy contract"

25. **Sign Contract** (Customer) ← **CHỈ SAU KHI APPROVE**
    - **Điều kiện:** Contract status = 'approved' (phải approve trước!)
    - **Kiểm tra contract chưa hết hạn:** expiresAt > now() (nếu hết hạn → throw ContractExpiredException)
    - Digital signature (OTP flow)
    - Đồng ý terms & conditions
    - API: POST /contracts/{contractId}/sign (với OTP verification)
    - **Backend xử lý:**
      1. Validate: Contract status = 'approved'
      2. Validate: Contract chưa hết hạn (expiresAt > now())
      3. Verify OTP
      4. Contract status: 'approved' → 'signed'
      5. Contract signedAt = now()
      6. **Tự động mở Deposit Installment DUE:**
         - Tìm Deposit installment (type = DEPOSIT, status = PENDING)
         - Installment status: 'PENDING' → 'DUE'
         - Customer có thể thanh toán deposit ngay
      7. Request status: 'contract_approved' → 'contract_signed'
      8. Gửi ContractSignedEvent → Chat service tạo CONTRACT_CHAT room và đóng REQUEST_CHAT room
    - **Frontend tự động generate PDF** (sau khi sign thành công)
    - **Frontend tự động upload PDF lên backend** (lưu vào S3)
    - PDF chứa: contract details, terms & conditions, customer signature

**Kết quả (nếu Sign):**
- ✅ Contract status = 'signed'
- ✅ Contract signedAt = now()
- ✅ Customer signature được lưu
- ✅ **Deposit Installment status: 'PENDING' → 'DUE'** (tự động mở khóa thanh toán)
- ✅ **CONTRACT_CHAT room được tạo** (thay thế REQUEST_CHAT room)
- ✅ REQUEST_CHAT room bị đóng (không còn active)
- ✅ **Contract PDF được generate và upload** (tự động bởi frontend)
- ✅ PDF được lưu vào S3 và link với contract (fileId)
- ✅ System notification được tạo cho Customer và Manager (trong hệ thống)

**⚠️ LƯU Ý: Contract Expiration (Automatic Process)**
- Scheduled job chạy mỗi giờ để check expired contracts
- Nếu contract status = 'sent' hoặc 'approved' và expiresAt <= now():
  - Contract status tự động chuyển: 'sent'/'approved' → 'expired'
  - Request status tự động chuyển: 'contract_sent'/'contract_approved' → 'cancelled'
  - Customer không thể sign contract đã expired

---

### **BƯỚC 5: CUSTOMER THANH TOÁN CỌC** 💰

#### **Use Cases:**
26. **Pay Deposit Installment** (Customer)
    - Customer chọn Deposit installment (KHÔNG phải milestone!)
    - **Payment method: Wallet** (customer thanh toán bằng wallet của họ)
    - **Amount: installment.amount** (đã có sẵn trong installment, không cần tính lại!)
    - **Check wallet balance:**
      - Nếu wallet.balance >= installment.amount → có thể thanh toán
      - Nếu wallet.balance < installment.amount → cần top up wallet trước
    - API: POST /wallets/{walletId}/pay-deposit
    - Request body: { amount, currency, contractId, installmentId }
    - **Backend xử lý:**
      1. Validate wallet balance >= amount
      2. Trừ tiền từ wallet: wallet.balance -= amount
      3. Tạo wallet_transaction (txType: contract_deposit_payment)
      4. Update installment status: 'DUE' → 'PAID'
      5. Update contract.depositPaidAt = now()
      6. Update contract status: 'signed' → 'active_pending_assignment' (chờ manager assign/start)

27. **Top Up Wallet** (Customer) ← **NẾU KHÔNG ĐỦ SỐ DƯ**
    - Customer cần nạp tiền vào wallet trước khi thanh toán
    - Top up qua Sepay (payment gateway)
    - API: POST /wallets/{walletId}/topup
    - Sau khi top up thành công:
    - wallet.balance được cập nhật
    - wallet_transaction được tạo (txType: topup)
    - Customer quay lại thanh toán installment

28. **View Wallet Transactions** (Customer)
    - Customer xem lịch sử giao dịch wallet
    - API: GET /wallets/me/transactions
    - Xem tất cả transactions: topup, contract_deposit_payment, milestone_payment, refund, etc.
    - Filter theo txType, fromDate, toDate
    - Mỗi transaction có: txType, amount, balanceBefore, balanceAfter, createdAt, metadata

**Kết quả:**
- ✅ Wallet balance được trừ: wallet.balance -= installment.amount
- ✅ Wallet_transaction được tạo (txType: contract_deposit_payment, installmentId, KHÔNG có milestoneId cho deposit)
- ✅ Deposit Installment status: 'DUE' → 'PAID'
- ✅ Contract.depositPaidAt = ngày thanh toán
- ✅ **Contract status: 'signed' → 'active_pending_assignment'** ← **CHỜ MANAGER ASSIGN/START!**
- ✅ Request status: 'contract_signed' → 'awaiting_assignment'
- ⚠️ **expectedStartDate VẪN NULL** (chưa set!)
- ⚠️ **Milestones VẪN PLANNED** (chưa unlock!)

---

### **BƯỚC 6: MANAGER PHÂN CÔNG SPECIALIST** 🎯

#### **Use Cases:**
30. **View Milestones** (Manager)
    - Xem danh sách milestones của contract
    - Milestones đang ở status: 'PLANNED'
    - Contract status: 'active_pending_assignment'

31. **Select Specialists** (Manager)
    - Manager xem danh sách Arrangement Specialists
    - API: GET /manager/specialists
    - **Filter theo:**
      - specialization: 'ARRANGEMENT'
      - skillNames: [tất cả instrument names từ request] (ví dụ: ['Piano', 'Guitar', 'Violin'])
      - mainInstrumentName: Main instrument name từ request (ví dụ: 'Piano')
      - milestoneId: Milestone 1 ID (để tính workload)
      - contractId: Contract ID (cần khi có milestoneId)
    - **Backend xử lý:**
      1. Filter specialists theo specialization = 'ARRANGEMENT'
      2. **Filter theo mainInstrumentName (BẮT BUỘC):** 
         - Specialist PHẢI có skill match với main instrument (bắt buộc)
         - Ví dụ: Nếu mainInstrumentName = 'Piano', specialist PHẢI có skill 'Piano'
      3. **Tính matchRatio từ skillNames (không tính main instrument):**
         - Lọc ra các instruments không phải main: nonMainInstruments = skillNames - mainInstrumentName
         - matchRatio = số instruments specialist match / tổng số nonMainInstruments
         - Ví dụ: skillNames = ['Piano', 'Guitar', 'Violin'], mainInstrumentName = 'Piano'
           - nonMainInstruments = ['Guitar', 'Violin']
           - Nếu specialist có ['Piano', 'Guitar'] → matchRatio = 1/2 = 0.5
           - Nếu specialist có ['Piano', 'Guitar', 'Violin'] → matchRatio = 2/2 = 1.0
      4. **Tính workload từ project-service (API: POST /task-assignments/stats):**
         - **SLA Window:**
           - slaWindowStart: milestone start (actualStartAt hoặc plannedStartAt với fallback)
           - slaWindowEnd: milestone deadline (plannedDueDate hoặc tính từ start + SLA days)
         - **tasksInSlaWindow:** Đếm số tasks có:
           - Status là "open" (assigned, accepted_waiting, ready_to_start, in_progress, ready_for_review, revision_requested, in_revision, delivery_pending)
           - Task deadline nằm trong SLA window: `deadline >= slaWindowStart && deadline <= slaWindowEnd`
           - Task deadline được resolve từ milestone deadline (có fallback)
         - **totalOpenTasks:** Đếm tất cả tasks có status "open" (không cần check deadline)
      5. **Sort specialists theo:**
         - matchRatio (cao nhất lên đầu - match nhiều instruments hơn)
         - tasksInSlaWindow (thấp nhất lên đầu - ít workload hơn)
         - totalOpenTasks (thấp nhất lên đầu)
         - experienceYears (cao nhất lên đầu)
    - **Response:** Danh sách specialists với workload info (tasksInSlaWindow, totalOpenTasks) và matchRatio

32. **View Specialist Availability** (Manager)
    - Manager xem chi tiết workload của từng specialist
    - Xem tasksInSlaWindow (số tasks trong SLA window)
    - Xem totalOpenTasks (tổng số tasks đang mở)
    - Xem experienceYears, rating
    - Manager chọn specialist phù hợp (ít workload nhất, nhiều kinh nghiệm nhất)

33. **Assign Task to Specialist** (Manager)
    - Tạo task_assignments
    - Link với milestone_id (Milestone 1 - Draft Arrangement)
    - assignment_status: 'assigned'
    - task_type: 'arrangement'
    - ⚠️ **Phải assign TRƯỚC khi Start Work!**
    - ⚠️ **Milestone 1 BẮT BUỘC phải có task assignment!**

34. **Send Task Notification** (Manager)
    - Hệ thống tạo notification cho Specialist (trong hệ thống)
    - Specialist nhận notification về task mới

**Kết quả:**
- ✅ task_assignments được tạo cho Milestone 1 (Draft Arrangement)
- ✅ Specialist nhận notification
- ✅ Chat room được tạo giữa Manager và Specialist
- ⚠️ **Task assignment chưa được accept** (status = 'assigned')
- ⚠️ **Manager CHƯA thể Start Work** (phải đợi Specialist accept!)

---

### **BƯỚC 7: SPECIALIST NHẬN VÀ ACCEPT TASK** 🎼

#### **Use Cases:**
35. **View Specialist Dashboard** (Arrangement Specialist)

36. **View Available Tasks** (Arrangement Specialist)
    - Xem tasks được assign
    - Xem task của Milestone 1 (Draft Arrangement)

37. **View Task Details** (Arrangement Specialist)
    - Xem chi tiết task
    - Xem reference files (notation/audio)
    - Xem requirements (instruments cần arrangement, genres, purpose)

38. **Accept Arrangement Task** (Arrangement Specialist)
    - Click "Accept Task"
    - API: POST /task-assignments/{assignmentId}/accept
    - **Backend xử lý:**
      1. Validate: Task status = 'assigned'
      2. Validate: Task belongs to current specialist
      3. Update task: 'assigned' → 'accepted_waiting'
      4. Update milestone: 'PLANNED' → 'TASK_ACCEPTED_WAITING_ACTIVATION' (nếu milestone đang ở PLANNED)
      5. Set specialist_started_at = now()
    - ⚠️ **QUAN TRỌNG: Task phải được accept TRƯỚC khi Manager Start Work!**
    - ⚠️ **Nếu task chưa accept, Manager không thể Start Work!**

**Kết quả:**
- ✅ Task assignment status: 'assigned' → 'accepted_waiting'
- ✅ Milestone 1 work_status: 'PLANNED' → 'TASK_ACCEPTED_WAITING_ACTIVATION'
- ✅ specialist_started_at = now()
- ✅ **Manager BÂY GIỜ MỚI CÓ THỂ Start Work!**

---

### **BƯỚC 8: MANAGER START WORK** 🚀

#### **Use Cases:**
39. **Start Contract Work** (Manager)
    - Manager click "Start Work" button
    - **Điều kiện BẮT BUỘC:**
      1. Contract status = 'active_pending_assignment' (đã thanh toán deposit)
      2. Deposit đã paid (depositPaidAt != NULL)
      3. **Milestone 1 phải có task assignment** (không được thiếu!)
      4. **Task assignment của Milestone 1 phải đã được Specialist accept** (status = accepted_waiting, ready_to_start, in_progress, hoặc completed)
    - API: POST /contracts/{contractId}/start-work
    - **Backend xử lý:**
      1. Validate: Contract status = 'active_pending_assignment'
      2. Validate: Deposit đã paid (depositPaidAt != NULL)
      3. Validate: Milestone 1 tồn tại (orderIndex = 1)
      4. **Validate: Milestone 1 có task assignment** (nếu không có → throw error)
      5. **Validate: Task assignment của Milestone 1 đã được accept** (nếu chưa accept → throw error)
      6. Set workStartAt = now() (hoặc depositPaidAt nếu lớn hơn)
      7. **Set expectedStartDate = workStartAt** ← **LÚC NÀY MỚI SET!**
      8. Calculate planned dates cho tất cả milestones
      9. Unlock Milestone 1: work_status = 'PLANNED' → 'TASK_ACCEPTED_WAITING_ACTIVATION' (nếu có task accepted)
      10. **Activate task assignments cho Milestone 1:**
          - Gọi `activateAssignmentsForMilestone(contractId, firstMilestoneId)`
          - Update milestone: 'TASK_ACCEPTED_WAITING_ACTIVATION' → 'READY_TO_START'
          - Update tasks: 'accepted_waiting' → 'ready_to_start'
          - Gửi notification cho Specialist: "Task ready to start"
      11. **Contract status: 'active_pending_assignment' → 'active'** ← **LÚC NÀY MỚI ACTIVE!**

**Kết quả:**
- ✅ expectedStartDate được set = workStartAt
- ✅ Contract.dueDate = expectedStartDate + slaDays
- ✅ **Contract status: 'active_pending_assignment' → 'active'** (bắt đầu thực thi)
- ✅ Milestone 1 work_status: 'TASK_ACCEPTED_WAITING_ACTIVATION' → 'READY_TO_START'
- ✅ Task assignments cho Milestone 1: 'accepted_waiting' → 'ready_to_start'
- ✅ Planned dates cho tất cả milestones được tính
- ✅ Specialist nhận notification "Task ready to start"

---

### **BƯỚC 9: SPECIALIST START TASK** 🚀

#### **Use Cases:**
40. **Start Task Assignment** (Arrangement Specialist)
    - Specialist nhận notification "Task ready to start"
    - Specialist click "Start Task" button
    - **Điều kiện:** Task status = 'ready_to_start'
    - API: POST /task-assignments/{assignmentId}/start
    - **Backend xử lý:**
      1. Validate: Task status = 'ready_to_start'
      2. Validate: Task belongs to current specialist
      3. Update task: 'ready_to_start' → 'in_progress'
      4. Update milestone: 'READY_TO_START' → 'IN_PROGRESS' (nếu milestone đang ở READY_TO_START)
      5. Set specialistRespondedAt = now()

**Kết quả:**
- ✅ Task assignment status: 'ready_to_start' → 'in_progress'
- ✅ Milestone 1 work_status: 'READY_TO_START' → 'IN_PROGRESS'
- ✅ specialistRespondedAt = now()
- ✅ **BÂY GIỜ Specialist mới có thể bắt đầu làm việc!**

---

### **BƯỚC 10: SPECIALIST LÀM VIỆC (DRAFT ARRANGEMENT - MILESTONE 1)** 🎼

#### **Use Cases:**
41. **Arrange Music (Draft)** (Arrangement Specialist)
    - Sử dụng notation editor để sắp xếp nhạc
    - Tạo draft arrangement files (MusicXML, PDF)
    - Làm việc trên Milestone 1 (Draft Arrangement)

42. **Upload Files** (Arrangement Specialist)
    - Specialist upload files đã arrangement (draft)
    - API: POST /files/upload
    - Request: multipart/form-data với file, assignmentId, description (optional), contentType
    - **Backend xử lý:**
      1. Validate: Task status = 'in_progress', 'revision_requested', hoặc 'in_revision'
      2. Validate: File thuộc assignment
      3. Upload file lên S3 (folder: "task-outputs/{assignmentId}")
      4. Tạo File entity:
         - fileStatus: 'uploaded'
         - submissionId: NULL (chưa submit)
         - fileSource: 'specialist_output'
         - contentType: 'notation' (cho arrangement)
         - version: tự động tính (nextVersion)
    - Files được lưu với status 'uploaded', chưa có submissionId
    - Specialist có thể upload nhiều files trước khi submit

43. **Submit Files for Review (Draft)** (Arrangement Specialist)
    - Specialist upload files đã arrangement (file status: 'uploaded')
    - Specialist chọn files và click "Submit for Review"
    - **Điều kiện:** Task status = 'in_progress', 'revision_requested', hoặc 'in_revision'
    - API: POST /specialist/task-assignments/{assignmentId}/submit-for-review
    - Request body: { fileIds: [array of file IDs] }
    - **Backend xử lý:**
      1. Validate: Task status = 'in_progress', 'revision_requested', hoặc 'in_revision'
      2. Validate: Files thuộc assignment và có status = 'uploaded'
      3. **Tự động tạo submission:**
         - Tạo FileSubmission mới (status: 'draft')
         - Tính nextVersion (tự động tăng)
         - submissionName: "Submission v{version}"
      4. **Add files vào submission:**
         - Tất cả files: submissionId = new submissionId
         - Files status: 'uploaded' → 'pending_review'
      5. **Tự động submit submission:**
         - Submission status: 'draft' → 'pending_review'
         - submittedAt = now()
      6. Update task assignment status: 'in_progress' → 'ready_for_review' (hoặc 'revision_requested' → 'ready_for_review', 'in_revision' → 'ready_for_review')
      7. **Nếu có revision request đang IN_REVISION:**
         - Gọi `autoUpdateRevisionRequestOnFileSubmit(assignmentId, submissionId, userId)`
         - Update revision request: IN_REVISION → WAITING_MANAGER_REVIEW
         - Link revised submission với revision request (revisedSubmissionId = submissionId)
      8. Gửi SubmissionSubmittedEvent → Notification service tạo system notification cho Manager: "Specialist submitted files"
    - ⚠️ CHƯA deliver cho customer! (Manager phải approve và deliver sau)

**Kết quả:**
- ✅ Submission được tạo tự động (status: 'pending_review')
- ✅ Files được add vào submission (status: 'uploaded' → 'pending_review')
- ✅ Task assignment status: 'in_progress' → 'ready_for_review' (hoặc 'revision_requested'/'in_revision' → 'ready_for_review')
- ✅ **Nếu có revision request đang IN_REVISION:**
  - Revision request status: IN_REVISION → WAITING_MANAGER_REVIEW
  - Revision request revisedSubmissionId = submissionId (link với submission mới)
  - Submission revisionRequestId = revisionRequestId (link ngược lại)
- ✅ **Progress tự động tính = 50%** (dựa trên submission status = 'pending_review')
- ✅ Manager nhận system notification "Specialist submitted files" (trong hệ thống)

---

### **BƯỚC 7.2: CUSTOMER REVIEW DRAFT** 👀

#### **Use Cases:**
45-47. **Customer View & Download Draft** (GIỐNG BƯỚC 10)

**2 LỰA CHỌN:**

#### **OPTION A: CUSTOMER OK VỚI DRAFT** ✅

48. **Accept Milestone (Draft)** (Customer)
    - Milestone 2 work_status: 'completed'
    - Milestone 2 payment_status: 'not_due' → 'due'

49. **Pay Milestone 2 (30%)** (Customer)
    - Customer trả tiền cho draft arrangement

**Kết quả:**
- ✅ Milestone 2 paid
- ✅ Specialist tiếp tục làm final version
- ✅ Milestone 3 work_status: 'not_started' → 'in_progress'

#### **OPTION B: CUSTOMER YÊU CẦU SỬA DRAFT** 🔄

50-51. **Request Revision on Draft** (Customer)

52-53. **Manager Review & Approve Revision**

- Specialist sửa lại draft
- Lặp lại từ Use Case 38

---

### **BƯỚC 7.3: SPECIALIST LÀM FINAL ARRANGEMENT** 🎼

#### **Use Cases (sau khi Milestone 2 paid):**

54. **Continue Arrangement Task** (Arrangement Specialist)
    - Làm final version
    - Polish & fine-tune

55. **Upload Arrangement Files** (Arrangement Specialist)
    - Upload final arrangement
    - Multiple formats: MusicXML, PDF, MIDI
    - Link với Milestone 3

56. **Update Task Progress** (Arrangement Specialist)
    - 100% completed

**Kết quả:**
- ✅ Final files uploaded
- ✅ Manager nhận notification

---

### **BƯỚC 8-9: MANAGER REVIEW & DELIVER FINAL** ✅📦

#### **Use Cases:**
57-62. **GIỐNG BƯỚC 8-9 TRANSCRIPTION**
- Manager review final files
- Approve
- Deliver to Customer
- Send notification

**Kết quả:**
- ✅ Final files delivered
- ✅ Milestone 3 work_status: 'in_progress' → 'review_by_customer'

---

### **BƯỚC 10: CUSTOMER NHẬN FINAL & THANH TOÁN** 💰✅

#### **Use Cases:**
63-65. **Customer View & Download Final Files**

**2 LỰA CHỌN:**

#### **OPTION A: CUSTOMER HÀI LÒNG** ✅

66. **Accept Milestone (Final)** (Customer)
    - Milestone 3 work_status: 'completed'
    - Milestone 3 payment_status: 'not_due' → 'due'

67. **Pay Milestone 3 (30%)** (Customer)
    - Thanh toán final

68. **Rate Service** (Customer)

**Kết quả:**
- ✅ Milestone 3 paid
- ✅ Contract status: 'active' → 'completed'
- ✅ Project completed!

#### **OPTION B: YÊU CẦU SỬA FINAL** 🔄

69-70. **Request Revision on Final**

71-72. **Manager Review & Approve Revision**

- Specialist sửa lại final
- Lặp lại từ Use Case 55

---

### **BƯỚC 11: HẬU KỲ** 📊

73-75. **GIỐNG TRANSCRIPTION**
- View Earnings (Specialist)
- View Analytics (Manager)
- Request Withdrawal (Specialist)

---

## ✅ TỔNG KẾT USE CASES - ARRANGEMENT

### **HIỆN CÓ: ~60 use cases**

### **❌ ĐIỂM KHÁC BIỆT SO VỚI TRANSCRIPTION:**

1. **3 Milestones thay vì 2:**
   - Milestone 1: Deposit (40%)
   - Milestone 2: Draft Arrangement (30%)
   - Milestone 3: Final Arrangement (30%)

2. **2 LẦN REVIEW:**
   - Review draft → Customer feedback → Sửa draft
   - Review final → Customer feedback → Sửa final

3. **3 LẦN PAYMENT:**
   - Pay deposit
   - Pay after draft approval
   - Pay after final approval

4. **USE CASES BỔ SUNG RIÊNG:**
   - Submit Draft for Review
   - Accept Draft Milestone
   - Pay Milestone 2
   - Continue Arrangement Task (sau khi draft paid)

---

## 🔄 SO SÁNH VỚI TRANSCRIPTION

| Đặc điểm | Transcription | Arrangement |
|----------|--------------|-------------|
| **Số Milestones** | 2 (Deposit + Final) | 3 (Deposit + Draft + Final) |
| **Số lần Review** | 1 | 2 |
| **Số lần Payment** | 2 | 3 |
| **Specialist Type** | Transcription Specialist | Arrangement Specialist |
| **SLA Days** | 3 ngày | 5-7 ngày |
| **Base Price** | Thấp hơn | Cao hơn |
| **Complexity** | Thấp | Trung bình |

---

**Tổng cần: ~75 use cases để cover đầy đủ luồng Arrangement!**
