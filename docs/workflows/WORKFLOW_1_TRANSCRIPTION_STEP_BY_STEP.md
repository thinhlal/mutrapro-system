# LUỒNG 1: TRANSCRIPTION - CHI TIẾT TỪNG BƯỚC

## 📋 TỔNG QUAN
**Dịch vụ:** Khách hàng cần ký âm (transcribe) file audio thành bản nhạc (notation)

**Thời gian:** 3-5 ngày (tùy độ phức tạp)

**Actors:** Customer, Manager, Transcription Specialist

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

### **VÍ DỤ TRANSCRIPTION (ví dụ thông thường, KHÔNG bắt buộc):**
- **Deposit Installment:** 40% (không gắn milestone)
- **Milestone 1:** "Transcription" (hasPayment=true, paymentPercent=60%)
  - → **Milestone 1 Installment:** 60% (gắn với Milestone 1)
- **Tổng:** 40% + 60% = 100%
- ⚠️ **Lưu ý:** Manager có thể tạo số lượng milestones khác tùy nhu cầu (1, 2, 3... milestones)

---

## 🔄 LUỒNG CHI TIẾT

### **BƯỚC 1: CUSTOMER TẠO YÊU CẦU** 🎵

#### **Use Cases:**
1. **Login to System** (Customer)
2. **View Dashboard** (Customer)
3. **Select Service Type** (Customer)
   - Chọn "Transcription"

4. **Enter Contact Information** (Customer)
   - Nhập: contact_name, contact_phone, contact_email
   - Có thể khác với thông tin account

5. **Upload Reference Files** (Customer)
   - Upload file audio (.mp3, .wav, etc.)
   - file_source = 'customer_upload'
   - content_type = 'audio'

6. **Select Notation Instruments** (Customer)
   - Chọn nhạc cụ cần ký âm (Piano, Guitar, etc.)
   - Có thể chọn nhiều loại

7. **View Price Estimation** (Customer)
   - Hệ thống tính giá dự kiến dựa trên:
     - Service type: transcription
     - Số nhạc cụ
     - Độ dài file audio

8. **Submit Service Request** (Customer)
   - Status: 'pending'
   - Chưa có managerUserId

**Kết quả:**
- ✅ Service Request được tạo với status = 'pending'
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
      - contractType: 'transcription' (map từ requestType)
      - totalPrice: serviceRequest.totalPrice (đã tính sẵn!)
      - currency: serviceRequest.currency
      - depositPercent: 40% (default, Manager có thể chỉnh)
      - slaDays: 7 days (default cho transcription, Manager có thể chỉnh)
      - freeRevisionsIncluded: 1 (default, Manager có thể chỉnh)
    
    - **Manager tự tạo Milestones trong form:**
      - ⚠️ **QUAN TRỌNG: Hệ thống KHÔNG có default milestones cho Transcription**
      - ⚠️ **Số lượng milestones KHÔNG được quy định cứng** - Manager tự quyết định
      - Manager có thể thêm/xóa milestones tùy ý
      - Mỗi milestone có:
        - orderIndex: 1, 2, 3...
        - name: "Transcription", "Final Delivery", etc. (Manager tự đặt tên)
        - description
        - milestoneType: 'transcription' (tự động set dựa trên contractType)
        - hasPayment: true/false (milestone này có thanh toán không?)
        - paymentPercent: % của totalPrice (nếu hasPayment=true)
        - milestoneSlaDays: số ngày SLA cho milestone này
      - **Ví dụ thông thường cho Transcription (KHÔNG bắt buộc):**
        - Milestone 1: name="Transcription", hasPayment=true, paymentPercent=60%
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
    - Manager xem danh sách Transcription Specialists
    - API: GET /manager/specialists
    - **Filter theo:**
      - specialization: 'TRANSCRIPTION'
      - skillNames: [1 instrument name từ request] (ví dụ: ['Piano'])
      - milestoneId: Milestone 1 ID (để tính workload)
      - contractId: Contract ID (cần khi có milestoneId)
      - ⚠️ **Lưu ý:** Transcription chỉ có 1 instrument, KHÔNG có mainInstrumentName
    - **Backend xử lý:**
      1. Filter specialists theo specialization = 'TRANSCRIPTION'
      2. **Filter theo skillNames (BẮT BUỘC):** 
         - Transcription chỉ có 1 instrument trong skillNames
         - Specialist PHẢI có skill match với instrument đó (bắt buộc)
         - Ví dụ: Nếu skillNames = ['Piano'], specialist PHẢI có skill 'Piano'
      3. **Tính workload từ project-service (API: POST /task-assignments/stats):**
         - **SLA Window:**
           - slaWindowStart: milestone start (actualStartAt hoặc plannedStartAt với fallback)
           - slaWindowEnd: milestone deadline (plannedDueDate hoặc tính từ start + SLA days)
         - **tasksInSlaWindow:** Đếm số tasks có:
           - Status là "open" (assigned, accepted_waiting, ready_to_start, in_progress, ready_for_review, revision_requested, in_revision, delivery_pending)
           - Task deadline nằm trong SLA window: `deadline >= slaWindowStart && deadline <= slaWindowEnd`
           - Task deadline được resolve từ milestone deadline (có fallback)
         - **totalOpenTasks:** Đếm tất cả tasks có status "open" (không cần check deadline)
      4. **Sort specialists theo:**
         - tasksInSlaWindow (thấp nhất lên đầu - ít workload hơn)
         - totalOpenTasks (thấp nhất lên đầu)
         - experienceYears (cao nhất lên đầu)
    - **Response:** Danh sách specialists với workload info (tasksInSlaWindow, totalOpenTasks)

32. **View Specialist Availability** (Manager)
    - Manager xem chi tiết workload của từng specialist
    - Xem tasksInSlaWindow (số tasks trong SLA window)
    - Xem totalOpenTasks (tổng số tasks đang mở)
    - Xem experienceYears, rating
    - Manager chọn specialist phù hợp (ít workload nhất, nhiều kinh nghiệm nhất)

33. **Assign Task to Specialist** (Manager)
    - Tạo task_assignments
    - Link với milestone_id (Milestone 1)
    - assignment_status: 'assigned'
    - task_type: 'transcription'
    - ⚠️ **Phải assign TRƯỚC khi Start Work!**
    - ⚠️ **Milestone 1 BẮT BUỘC phải có task assignment!**

34. **Send Task Notification** (Manager)
    - Hệ thống tạo notification cho Specialist (trong hệ thống)
    - Specialist nhận notification về task mới

**Kết quả:**
- ✅ task_assignments được tạo cho Milestone 1
- ✅ Specialist nhận notification
- ✅ Chat room được tạo giữa Manager và Specialist
- ⚠️ **Task assignment chưa được accept** (status = 'assigned')
- ⚠️ **Manager CHƯA thể Start Work** (phải đợi Specialist accept!)

---

### **BƯỚC 7: SPECIALIST NHẬN VÀ ACCEPT TASK** 🎼

#### **Use Cases:**
35. **View Specialist Dashboard** (Transcription Specialist)

36. **View Available Tasks** (Transcription Specialist)
    - Xem tasks được assign
    - Xem task của Milestone 1

37. **View Task Details** (Transcription Specialist)
    - Xem chi tiết task
    - Xem reference files (audio)
    - Xem requirements (instruments cần ký âm)

38. **Accept Transcription Task** (Transcription Specialist)
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
40. **Start Task Assignment** (Transcription Specialist)
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

### **BƯỚC 10: SPECIALIST LÀM VIỆC** 🎼

#### **Use Cases:**
41. **Transcribe Audio to Notation** (Transcription Specialist)
    - Sử dụng notation editor để ký âm
    - Tạo file MusicXML, PDF

42. **Upload Files** (Transcription Specialist)
    - Specialist upload files đã ký âm
    - API: POST /files/upload
    - Request: multipart/form-data với file, assignmentId, description (optional), contentType
    - **Backend xử lý:**
      1. Validate: Task status = 'in_progress', 'revision_requested', hoặc 'in_revision'
      2. Validate: File thuộc assignment
      3. Upload file lên S3 (folder: "task-outputs/{assignmentId}")
      4. Tạo File entity:
         - fileStatus: 'uploaded'
         - submissionId: NULL (chưa submit)
         - fileSource: 'specialist_output' (hoặc 'studio_recording' nếu là recording task)
         - contentType: 'notation' (cho transcription)
         - version: tự động tính (nextVersion)
    - Files được lưu với status 'uploaded', chưa có submissionId
    - Specialist có thể upload nhiều files trước khi submit

43. **Submit Files for Review** (Transcription Specialist)
    - Specialist upload files đã ký âm (file status: 'uploaded')
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

### **BƯỚC 11: MANAGER REVIEW VÀ DUYỆT FILE** ✅

#### **Use Cases:**
44. **Monitor Task Progress** (Manager)
    - Manager xem progress của task
    - **Progress được tính tự động** dựa trên:
      - Task assignment status (assigned, in_progress, completed, etc.)
      - Submission status (pending_review, approved, rejected, customer_accepted, etc.)
      - Số lượng submissions
    - **Progress calculation logic:**
      - Task status = 'in_progress' + chưa có submission → 25%
      - Task status = 'ready_for_review' + submission 'pending_review' → 50%
      - Task status = 'delivery_pending' + submission 'approved' → 75%
      - Task status = 'waiting_customer_review' + submission 'customer_accepted' → 95%
      - Task status = 'completed' → 100%
      - Task status = 'revision_requested' + submission 'rejected' → 40%
    - Manager không cần specialist update progress thủ công!

45. **View Specialist Submissions** (Manager)
    - Xem files đã submit

46. **Review Submitted Files** (Manager)
    - Download và xem files
    - Kiểm tra chất lượng

47. **Approve/Reject Files** (Manager)
    - **Nếu OK:** Approve → tiếp tục deliver
    - **Nếu chưa OK:** Reject → Specialist sửa lại

#### **OPTION A: MANAGER APPROVE** ✅
- Manager click "Approve Submission"
- API: POST /submissions/{submissionId}/approve
- **Điều kiện:** Submission status = 'pending_review', Task assignment status = 'ready_for_review'
- **Backend xử lý:**
  1. Validate: Submission status = 'pending_review'
  2. Validate: Manager owns contract
  3. Update submission status: 'pending_review' → 'approved'
  4. Update task assignment status: 'ready_for_review' → 'delivery_pending'
  5. **Nếu có revision request đang WAITING_MANAGER_REVIEW:**
     - Gọi `updateRevisionRequestOnApproval(revisionRequest, managerUserId)`
     - Update revision request: WAITING_MANAGER_REVIEW → APPROVED_PENDING_DELIVERY
     - (Manager đã approve nhưng chưa deliver)
  6. Gửi SubmissionApprovedEvent → Notification service tạo system notification cho Specialist: "Submission approved"

**Kết quả (nếu Approve):**
- ✅ Submission status: 'pending_review' → 'approved'
- ✅ Task assignment status: 'ready_for_review' → 'delivery_pending'
- ✅ **Nếu có revision request WAITING_MANAGER_REVIEW:**
  - Revision request status: WAITING_MANAGER_REVIEW → APPROVED_PENDING_DELIVERY
- ✅ Files được đánh dấu ready to deliver
- ✅ **Progress tự động tính = 75%** (dựa trên submission status = 'approved')
- ✅ Specialist nhận system notification "Submission approved" (trong hệ thống)
- ✅ Manager có thể deliver cho customer

#### **OPTION B: MANAGER REJECT** ❌
- Manager click "Reject Submission"
- API: POST /submissions/{submissionId}/reject
- **Điều kiện:** Submission status = 'pending_review', Task assignment status = 'ready_for_review'
- Manager nhập rejection reason (bắt buộc)
- **Backend xử lý:**
  1. Validate: Submission status = 'pending_review'
  2. Validate: Manager owns contract
  3. Update submission status: 'pending_review' → 'rejected'
  4. Update submission rejectionReason = reason
  5. Update tất cả files trong submission:
     - Files status: 'pending_review' → 'rejected'
     - Files rejectionReason = reason
  6. **Kiểm tra có revision request WAITING_MANAGER_REVIEW không:**
     - **TRƯỜNG HỢP A: CÓ REVISION REQUEST WAITING_MANAGER_REVIEW** (đây là reject trong revision flow)
       - Gọi `updateRevisionRequestOnRejection(assignmentId, reason)`
       - Update revision request: WAITING_MANAGER_REVIEW → IN_REVISION
       - Update revision request managerNote = reason
       - Update task assignment status: 'ready_for_review' → 'revision_requested' (assignment status được update trong updateRevisionRequestOnRejection)
       - Gửi RevisionRejectedEvent → Notification service tạo system notification cho Specialist: "Revision submission đã bị từ chối"
     - **TRƯỜNG HỢP B: KHÔNG CÓ REVISION REQUEST** (đây là reject lần đầu tiên)
       - Update task assignment status: 'ready_for_review' → 'revision_requested'
  7. Gửi SubmissionRejectedEvent → Notification service tạo system notification cho Specialist: "Submission đã bị từ chối"

**Kết quả (nếu Reject):**
- ✅ Submission status: 'pending_review' → 'rejected'
- ✅ Submission rejectionReason = reason
- ✅ Files status: 'pending_review' → 'rejected'
- ✅ Files rejectionReason = reason
- ✅ **TRƯỜNG HỢP A: CÓ REVISION REQUEST WAITING_MANAGER_REVIEW** (reject trong revision flow):
  - Revision request status: WAITING_MANAGER_REVIEW → IN_REVISION
  - Revision request managerNote = reason
  - Task assignment status: 'ready_for_review' → 'revision_requested'
  - Specialist nhận system notification "Revision submission đã bị từ chối" (trong hệ thống)
  - Specialist phải làm lại từ BƯỚC 10: SPECIALIST LÀM VIỆC
- ✅ **TRƯỜNG HỢP B: KHÔNG CÓ REVISION REQUEST** (reject lần đầu tiên):
  - Task assignment status: 'ready_for_review' → 'revision_requested'
  - Specialist nhận system notification "Submission đã bị từ chối" (trong hệ thống)
  - Specialist phải sửa lại và submit lại
- ✅ **Progress tự động tính = 40%** (dựa trên submission status = 'rejected')
- ✅ Specialist nhận system notification "Submission đã bị từ chối" (trong hệ thống)

---

### **BƯỚC 11B: SPECIALIST SỬA LẠI (NẾU MANAGER REJECT)** 🔄

#### **Use Cases:**
48. **View Rejection Reason** (Transcription Specialist)
    - Specialist xem lý do Manager reject
    - Xem rejection reason từ notification

49. **Fix and Resubmit Files** (Transcription Specialist)
    - Specialist xem rejection reason từ notification
    - Specialist sửa lại files theo feedback
    - Upload files mới (file status: 'uploaded')
    - Submit lại (tạo submission mới)
    - API: POST /specialist/task-assignments/{assignmentId}/submit-for-review
    - **Điều kiện:** Task status = 'revision_requested'
    - **Backend xử lý:**
      1. Validate: Task status = 'revision_requested'
      2. Validate: Files thuộc assignment và có status = 'uploaded'
      3. Tạo submission mới (status: 'draft' → 'pending_review')
      4. Add files vào submission (status: 'uploaded' → 'pending_review')
      5. Task assignment status: 'revision_requested' → 'ready_for_review'
      6. **Progress tự động tính = 50%** (dựa trên submission status = 'pending_review')
      7. Gửi SubmissionSubmittedEvent → Notification service tạo system notification cho Manager: "Specialist submitted files"

**Kết quả:**
- ✅ Submission mới được tạo (status: 'pending_review')
- ✅ Files được add vào submission (status: 'uploaded' → 'pending_review')
- ✅ Task assignment status: 'revision_requested' → 'ready_for_review'
- ✅ **Nếu có revision request đang IN_REVISION:**
  - Revision request status: IN_REVISION → WAITING_MANAGER_REVIEW
  - Revision request revisedSubmissionId = submissionId
- ✅ **Progress tự động tính = 50%** (dựa trên submission status = 'pending_review')
- ✅ Manager nhận system notification "Specialist submitted files" (trong hệ thống)
- ✅ Quay lại BƯỚC 11: MANAGER REVIEW VÀ DUYỆT FILE

---

### **BƯỚC 12: MANAGER GIAO FILE CHO CUSTOMER** 📦 (CHỈ KHI APPROVE)

#### **Use Cases:**
50. **Deliver Files to Customer** (Manager)
    - Manager click "Deliver to Customer"
    - **Điều kiện:** Submission status = 'approved' (phải approve trước!)
    - API: POST /submissions/{submissionId}/deliver
    - **Backend xử lý:**
      1. Validate: Submission status = 'approved'
      2. Validate: Manager owns contract
      3. Validate: Tất cả files trong submission đã approved
      4. **Deliver tất cả files trong submission:**
         - Tất cả files: delivered_to_customer = true
         - delivered_at = now()
         - delivered_by = manager_id
         - fileSource = 'task_deliverable' (nếu chưa set)
      5. Update submission status: 'approved' → 'delivered'
      6. Update task assignment status: 'delivery_pending' → 'waiting_customer_review'
      7. Update milestone work status: 'IN_PROGRESS' → 'WAITING_CUSTOMER' (nếu milestone đang ở IN_PROGRESS)
      8. **Nếu có revision request APPROVED_PENDING_DELIVERY:**
         - Update revision request: APPROVED_PENDING_DELIVERY → WAITING_CUSTOMER_CONFIRM
         - (Đây là delivery cho revision, customer sẽ confirm sau)
      9. **Track firstSubmissionAt cho milestone** (nếu chưa có):
         - milestone.firstSubmissionAt = now() (chỉ set lần đầu tiên, không set lại khi revision)
      10. Gửi SubmissionDeliveredEvent → Notification service tạo system notification cho Customer: "Your files are ready!"

**Kết quả:**
- ✅ Tất cả files trong submission: delivered_to_customer = true, delivered_at = now(), delivered_by = manager_id
- ✅ Submission status: 'approved' → 'delivered'
- ✅ Task assignment status: 'delivery_pending' → 'waiting_customer_review'
- ✅ Milestone work_status: 'IN_PROGRESS' → 'WAITING_CUSTOMER' (nếu milestone đang ở IN_PROGRESS)
- ✅ Milestone firstSubmissionAt = now() (chỉ set lần đầu tiên, không set lại khi revision)
- ✅ **Nếu có revision request APPROVED_PENDING_DELIVERY:**
  - Revision request status: APPROVED_PENDING_DELIVERY → WAITING_CUSTOMER_CONFIRM
- ✅ Customer có thể download files
- ✅ Customer nhận system notification "Your files are ready!" (trong hệ thống)

---

### **BƯỚC 13: CUSTOMER NHẬN VÀ ĐÁNH GIÁ** 👀

#### **Use Cases:**
52. **Track Project Progress** (Customer)
    - Xem tiến độ project

53. **View Deliverable Files** (Customer)
    - Xem list submissions đã được deliver cho milestone
    - Xem files trong submission

54. **Download Final Files** (Customer)
    - Download files (MusicXML, PDF) từ submission

**2 LỰA CHỌN:**

#### **OPTION A: CUSTOMER HÀI LÒNG** ✅

55. **Accept Submission** (Customer) ← **NHẬN SUBMISSION, KHÔNG PHẢI MILESTONE!**
    - Customer click "Accept Submission"
    - API: POST /submissions/{submissionId}/customer-review (action = "accept")
    - **Backend xử lý:**
      1. Validate: Submission status = 'delivered'
      2. Validate: Customer owns contract
      3. **Kiểm tra có revision request WAITING_CUSTOMER_CONFIRM không:**
         - **TRƯỜNG HỢP A: CÓ REVISION REQUEST WAITING_CUSTOMER_CONFIRM** (đây là accept cho revision)
           - Gọi `updateRevisionRequestOnCustomerAccept(assignmentId, userId)`
           - Update revision request: WAITING_CUSTOMER_CONFIRM → COMPLETED
           - Update revised submission status: 'delivered' → 'customer_accepted'
           - Update task assignment status: 'waiting_customer_review' → 'completed'
           - Update milestone: WAITING_CUSTOMER → READY_FOR_PAYMENT (nếu có payment) hoặc COMPLETED (nếu không có payment)
           - Mở installment DUE hoặc unlock milestone tiếp theo (tương tự flow bình thường)
         - **TRƯỜNG HỢP B: KHÔNG CÓ REVISION REQUEST** (đây là accept lần đầu tiên)
           - Update submission status: 'delivered' → 'customer_accepted'
           - Update task assignment status: 'waiting_customer_review' → 'completed'
           - Update milestone:
             - work_status: 'WAITING_CUSTOMER' → 'READY_FOR_PAYMENT' (nếu milestone có hasPayment=true)
             - work_status: 'WAITING_CUSTOMER' → 'COMPLETED' (nếu milestone không có payment)
             - finalCompletedAt = now()
           - **Nếu milestone có hasPayment=true:**
             - Mở installment DUE: gọi `openInstallmentForMilestoneIfReady(milestoneId)`
             - Installment status: 'PENDING' → 'DUE'
             - Customer có thể thanh toán milestone này
           - **Nếu milestone KHÔNG có payment (hasPayment=false):**
             - Unlock milestone tiếp theo: gọi `unlockNextMilestone(contractId, milestone.orderIndex)`
             - Milestone tiếp theo được unlock (status thay đổi tùy theo task assignment)
             - Mở installment cho milestone tiếp theo (nếu có gateCondition = 'AFTER_MILESTONE_DONE')

**Kết quả:**
- ✅ **TRƯỜNG HỢP A: CÓ REVISION REQUEST WAITING_CUSTOMER_CONFIRM** (accept cho revision):
  - Revision request status: WAITING_CUSTOMER_CONFIRM → COMPLETED
  - Revised submission status: 'delivered' → 'customer_accepted'
  - Task assignment status: 'waiting_customer_review' → 'completed'
  - Milestone work_status: WAITING_CUSTOMER → READY_FOR_PAYMENT (nếu có payment) hoặc COMPLETED (nếu không có payment)
  - Mở installment DUE hoặc unlock milestone tiếp theo (tương tự flow bình thường)
- ✅ **TRƯỜNG HỢP B: KHÔNG CÓ REVISION REQUEST** (accept lần đầu tiên):
  - Submission status: 'delivered' → 'customer_accepted'
  - Task assignment status: 'waiting_customer_review' → 'completed'
  - Milestone work_status: 'WAITING_CUSTOMER' → 'READY_FOR_PAYMENT' (nếu có payment) hoặc 'COMPLETED' (nếu không có payment)
  - Milestone finalCompletedAt = now()
  - **Nếu milestone có hasPayment=true:**
    - Installment cho Milestone 1: status: 'PENDING' → 'DUE' (mở khóa thanh toán)
    - Customer có thể thanh toán milestone này
  - **Nếu milestone KHÔNG có payment:**
    - Milestone tiếp theo được unlock (nếu có)
    - Installment của milestone tiếp theo được mở (nếu có gateCondition = 'AFTER_MILESTONE_DONE')
- ✅ **Progress tự động tính = 95%** (dựa trên submission status = 'customer_accepted')

#### **OPTION B: CUSTOMER YÊU CẦU SỬA** 🔄

56. **Request Revision** (Customer) ← **CHO FILE SUBMISSIONS, KHÔNG PHẢI CONTRACT!**
    - Customer yêu cầu sửa files đã được deliver
    - **Khác với Request Change Contract:**
      - Request Revision: cho file submissions (sau khi deliver)
      - Request Change Contract: cho contract (trước khi approve/sign)
    - Customer nhập:
      - title: Tiêu đề yêu cầu sửa (bắt buộc)
      - description: Mô tả chi tiết yêu cầu sửa (bắt buộc)
    - **2 TRƯỜNG HỢP:**

#### **TRƯỜNG HỢP A: CÒN FREE REVISION** ✅
- Hệ thống kiểm tra: freeRevisionsUsed < contract.freeRevisionsIncluded
- API: POST /submissions/{submissionId}/customer-review (action = "request_revision")
- **Backend xử lý:**
  1. Validate: Submission status = 'delivered'
  2. Validate: Customer owns contract
  3. Tính toán: isFreeRevision = true (vì còn free)
  4. Tạo RevisionRequest mới:
     - title: từ form
     - description: từ form
     - status: PENDING_MANAGER_REVIEW
     - revisionRound: tính tự động
     - isFreeRevision: true
     - paidWalletTxId: NULL (chưa thanh toán)
  5. Gửi RevisionRequestedEvent → Notification service tạo system notification cho Manager: "Customer requested revision"

#### **TRƯỜNG HỢP B: HẾT FREE REVISION** 💰
- Hệ thống kiểm tra: freeRevisionsUsed >= contract.freeRevisionsIncluded
- **Customer PHẢI THANH TOÁN TRƯỚC!**
- Customer được redirect đến trang Pay Revision Fee
- Customer nhập title và description
- Customer thanh toán revision fee:
  - API: POST /wallets/{walletId}/pay-revision-fee
  - Amount: contract.additionalRevisionFeeVnd
  - Payment method: Wallet
  - **Backend xử lý:**
    1. Validate wallet balance >= amount
    2. Trừ tiền từ wallet
    3. Tạo wallet_transaction (txType: revision_fee)
    4. Gửi RevisionFeePaidEvent
  - **Event Consumer xử lý:**
    1. Nhận RevisionFeePaidEvent
    2. Tạo RevisionRequest mới với paidWalletTxId
    3. status: PENDING_MANAGER_REVIEW
    4. isFreeRevision: false
    5. Gửi RevisionRequestedEvent → Notification service tạo system notification cho Manager: "Customer requested revision"

**Kết quả (cả 2 trường hợp):**
- ✅ RevisionRequest được tạo (status: PENDING_MANAGER_REVIEW)
- ✅ Submission status: 'delivered' → 'delivered' (giữ nguyên, chưa accept)
- ✅ Manager nhận system notification "Customer requested revision" (trong hệ thống)
- ⚠️ **Manager sẽ review và approve/reject revision request**

---

### **BƯỚC 14A: MANAGER XỬ LÝ REVISION REQUEST** 🔧

#### **Use Cases:**
58. **Review Revision Requests** (Manager)
    - Manager xem danh sách revision requests (status: PENDING_MANAGER_REVIEW)
    - Xem chi tiết yêu cầu sửa của customer (title, description)
    - Xem revision round, isFreeRevision, paidWalletTxId (nếu có)

59. **Approve/Reject Revision Request** (Manager)
    - API: POST /revision-requests/{revisionRequestId}/review
    - **2 LỰA CHỌN:**

#### **OPTION A: MANAGER APPROVE** ✅
- Manager click "Approve Revision Request"
- Manager nhập managerNote (optional)
- **Backend xử lý:**
  1. Validate: Revision request status = PENDING_MANAGER_REVIEW
  2. Validate: Manager owns contract
  3. Update revision request:
     - status: PENDING_MANAGER_REVIEW → IN_REVISION
     - managerNote: từ form
     - managerReviewedAt = now()
     - assignedToSpecialistAt = now()
     - revisionDueAt = now() + contract.revisionDeadlineDays
  4. Update task assignment:
     - status: 'waiting_customer_review' → 'in_revision'
     - completedDate = NULL (clear vì task chưa completed nữa)
  5. Update milestone work status:
     - work_status: 'WAITING_CUSTOMER' → 'IN_PROGRESS' (nếu milestone đang ở WAITING_CUSTOMER)
     - (Milestone quay lại IN_PROGRESS để specialist làm lại)
  6. Update original submission:
     - status: 'delivered' → 'customer_rejected'
  7. Gửi RevisionApprovedEvent → Notification service tạo system notification cho Specialist: "Revision request approved"

**Kết quả:**
- ✅ Revision request status: PENDING_MANAGER_REVIEW → IN_REVISION
- ✅ Task assignment status: 'waiting_customer_review' → 'in_revision'
- ✅ Task assignment completedDate = NULL (clear vì task chưa completed nữa)
- ✅ Milestone work_status: 'WAITING_CUSTOMER' → 'IN_PROGRESS' (nếu milestone đang ở WAITING_CUSTOMER)
- ✅ Original submission status: 'delivered' → 'customer_rejected'
- ✅ Specialist nhận system notification "Revision request approved" (trong hệ thống)
- ✅ Specialist phải làm lại từ BƯỚC 10: SPECIALIST LÀM VIỆC
- ⚠️ **Khi Specialist submit files mới:**
  - Revision request status: IN_REVISION → WAITING_MANAGER_REVIEW
  - Revision request revisedSubmissionId = new submissionId
  - Submission revisionRequestId = revisionRequestId

#### **OPTION B: MANAGER REJECT** ❌
- Manager click "Reject Revision Request"
- Manager nhập managerNote (lý do từ chối - bắt buộc)
- **Backend xử lý:**
  1. Validate: Revision request status = PENDING_MANAGER_REVIEW
  2. Validate: Manager owns contract
  3. Update revision request:
     - status: PENDING_MANAGER_REVIEW → REJECTED
     - managerNote: từ form (lý do từ chối)
     - managerReviewedAt = now()
  4. **Nếu là paid revision (paidWalletTxId != NULL):**
     - Gửi RevisionFeeRefundedEvent
     - Billing service refund tiền cho customer
  5. Gửi RevisionRejectedEvent → Notification service tạo system notification cho Customer: "Revision request rejected"

**Kết quả:**
- ✅ Revision request status: PENDING_MANAGER_REVIEW → REJECTED
- ✅ Nếu là paid revision → Customer được refund tiền
- ✅ Customer nhận system notification "Revision request rejected" (trong hệ thống)
- ✅ Submission vẫn ở status 'delivered' (customer có thể accept hoặc request revision mới)

---

### **BƯỚC 14B: CUSTOMER THANH TOÁN MILESTONE** 💰

#### **Use Cases (sau khi Accept Milestone 1):**

60. **Pay Milestone Installment** (Customer)
    - Customer chọn Installment của Milestone 1 (nếu milestone có hasPayment=true)
    - **Payment method: Wallet** (customer thanh toán bằng wallet của họ)
    - **Amount: installment.amount** (đã có sẵn trong installment, không cần tính lại!)
    - **Check wallet balance:**
      - Nếu wallet.balance >= installment.amount → có thể thanh toán
      - Nếu wallet.balance < installment.amount → cần top up wallet trước
    - API: POST /wallets/{walletId}/pay-milestone
    - Request body: { amount, currency, contractId, milestoneId, installmentId }
    - **Backend xử lý:**
      1. Validate wallet balance >= amount
      2. Trừ tiền từ wallet: wallet.balance -= amount
      3. Tạo wallet_transaction (txType: milestone_payment, với milestoneId)
      4. Update installment status: 'DUE' → 'PAID'
      5. Update milestone work status: 'READY_FOR_PAYMENT' → 'COMPLETED'
      6. **Tự động unlock milestone tiếp theo:**
         - Gọi `unlockNextMilestone(contractId, milestone.orderIndex)`
         - Tìm milestone tiếp theo (orderIndex + 1)
         - **Nếu có milestone tiếp theo:**
           - Nếu milestone chưa có task → status: 'PLANNED' → 'WAITING_ASSIGNMENT'
           - Nếu milestone có task nhưng chưa accepted → status: 'PLANNED' → 'WAITING_SPECIALIST_ACCEPT'
           - Nếu milestone có task đã accepted → status: 'PLANNED' → 'TASK_ACCEPTED_WAITING_ACTIVATION'
           - Activate assignments cho milestone tiếp theo (nếu có task accepted)
         - **Mở installment cho milestone tiếp theo (nếu có):**
           - Tìm installment của milestone tiếp theo với gateCondition = 'AFTER_MILESTONE_DONE'
           - Nếu installment status = 'PENDING' → chuyển thành 'DUE'
           - Customer có thể thanh toán milestone tiếp theo
      7. **Kiểm tra contract completion:**
         - Nếu tất cả milestones đã completed và tất cả installments đã paid:
           - Contract status: 'active' → 'completed'
           - Project completed!

**Kết quả:**
- ✅ Wallet balance được trừ: wallet.balance -= installment.amount
- ✅ Wallet_transaction được tạo (txType: milestone_payment, với milestoneId và installmentId)
- ✅ Installment status: 'DUE' → 'PAID'
- ✅ Milestone work status: 'READY_FOR_PAYMENT' → 'COMPLETED'
- ✅ **Nếu có milestone tiếp theo:**
  - Milestone tiếp theo được unlock (status thay đổi tùy theo task assignment)
  - Installment của milestone tiếp theo được mở (status: 'PENDING' → 'DUE' nếu có gateCondition = 'AFTER_MILESTONE_DONE')
  - Manager có thể assign task cho milestone tiếp theo (nếu chưa có)
  - Customer có thể thanh toán milestone tiếp theo (nếu installment đã DUE)
- ✅ **Nếu là milestone cuối cùng:**
  - Nếu tất cả milestones đã completed và tất cả installments đã paid:
    - Contract status: 'active' → 'completed'
    - Project completed!

---

## ✅ TỔNG KẾT USE CASES - TRANSCRIPTION

### **HIỆN CÓ: 60 use cases** (sau khi thêm Export PDF, Approve, Request Change, Cancel, Top Up Wallet, sửa View Wallet Transactions, thêm Start Task, xóa Update Task Progress, thêm View Rejection Reason, Fix and Resubmit, sửa Accept Submission, xóa Rate Service, xóa Submit Revision Feedback, thêm Pay Revision Fee, thêm Upload Files, xóa View Earnings, View Project Analytics, Request Withdrawal)
- Customer: 20 use cases
- Manager: 25 use cases
- Transcription Specialist: 10 use cases
- System: 4 use cases (auto)

### **✅ TẤT CẢ USE CASES ĐÃ ĐƯỢC COVER:**
Tất cả 60 use cases đã được mô tả đầy đủ trong workflow. Không còn use case nào thiếu.

### **✅ USE CASES ĐÃ SỬA:**
1. "Make Payment (Deposit/Final)" → "Pay Deposit Installment" / "Pay Milestone Installment"
2. "Upload Transcription" → "Submit Files for Review"
3. "Create Contract" → Chi tiết hơn: Manager tự tạo milestones trong ContractBuilder
4. "Assign Task" → Phải assign TRƯỚC khi Start Work

---

**Tổng: 60 use cases để cover đầy đủ luồng Transcription!**
