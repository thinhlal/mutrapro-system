# MILESTONE WORKFLOW - Chi Tiết Từng Bước

## 📋 TÓM TẮT LUỒNG CHUẨN

```
Ký hợp đồng → Trả cọc → Mở milestone → Assign task → Specialist làm → 
Manager duyệt → Gửi khách → Khách phản hồi → Accept mốc → Thu Final → Đóng hợp đồng
```

---

## 🔄 CÁC BƯỚC CHI TIẾT

### **Bước 1: Ký hợp đồng + Tạo Installments**

**Ai làm:** Hệ thống tự động

**Hành động:**
- Manager tạo `contracts`
- Trigger tự động tạo 2 đợt tiền:
  - **Deposit** (gate_condition = `before_start`)
  - **Final** (gate_condition = `after_accept` hoặc `after_delivery`)

**Trạng thái:**
- `contract_installments.status` = `pending`

**Liên kết:**
- `contract_installments.contract_id` → `contracts.contract_id`
- `contract_installments.is_deposit` = `true` cho Deposit

---

### **Bước 2: Khách trả cọc (Deposit)**

**Ai làm:** Customer

**Hành động:**
- Customer thanh toán Deposit
- Tạo `payments` → `wallet_transactions`

**Trạng thái:**
- `contract_installments(Deposit).status` = `paid`

**Trigger tự động:**
- Khi Deposit = `paid`:
  - Cho phép milestone mở: `milestone.status` → `in_progress`
  - Manager được phép assign task: tạo `task_assignments(status='assigned')`

**Liên kết:**
- `payments.installment_id` → `contract_installments(Deposit).installment_id`
- `payments.wallet_tx_id` → `wallet_transactions.wallet_tx_id`

---

### **Bước 3: Manager assign task + kick-off**

**Ai làm:** Manager

**Hành động:**
- Manager tạo `contract_milestones` với `status='planned'`
- Sau khi Deposit paid, milestone chuyển → `in_progress`
- Manager gán task vào milestone: `task_assignments.milestone_id`
- Manager assign specialist: `task_assignments.specialist_id`

**Trạng thái:**
- `task_assignments.status`: `assigned` → `in_progress` (khi specialist nhận làm)

**Liên kết:**
- `task_assignments.milestone_id` → `contract_milestones.milestone_id`
- `task_assignments.contract_id` → `contracts.contract_id`
- `task_assignments.specialist_id` → `specialists.specialist_id`

---

### **Bước 4: Specialist nộp file cho Manager duyệt**

**Ai làm:** Specialist

**Hành động:**
- Specialist upload file vào `files` với `assignment_id`
- File có `file_status='uploaded'`

**Manager bấm review:**
- Nếu cần QA trước: `file_status='pending_review'`
- Duyệt OK: `file_status='approved'`
- `delivered_to_customer=false` (mới nội bộ, chưa gửi khách)

**Trạng thái:**
- `files.file_status`: `uploaded` → `pending_review` → `approved`
- `files.reviewed_by` = Manager user_id
- `files.reviewed_at` = timestamp

**Liên kết:**
- `files.assignment_id` → `task_assignments.assignment_id`
- `files.created_by` → Specialist user_id

---

### **Bước 5: Manager gửi khách hàng (deliver)**

**Ai làm:** Manager

**Hành động:**
- Manager quyết định gửi file cho customer
- Set `files.delivered_to_customer=true`
- `files.delivered_at` = timestamp
- `files.delivered_by` = Manager user_id
- `files.delivery_type` = `final`

**Trạng thái:**
- Milestone: `in_progress` → `submitted` (đã nộp mốc ra ngoài)

**Trigger tự động:**
- Nếu Final gate = `after_delivery`:
  - Trigger mở đợt Final: `contract_installments(Final).status` → `pending`

**Liên kết:**
- `files.delivered_by` → Manager user_id

---

### **Bước 6: Khách phản hồi**

**Ai làm:** Customer

**Trường hợp KHÔNG OK:**
- Customer tạo `revision_requests`
- 1 file ↔ 1 revision request
- Milestone: `submitted` → `in_progress` (quay lại làm tiếp)
- Specialist tiếp tục vòng lặp từ bước 4-5

**Trường hợp OK:**
- Manager "accept mốc"
- Milestone: `submitted` → `accepted`

**Trigger tự động:**
- Nếu Final gate = `after_accept`:
  - Trigger mở đợt Final: `contract_installments(Final).status` → `pending`

**Liên kết:**
- `revision_requests.contract_id` → `contracts.contract_id`
- `revision_requests.assignment_id` → `task_assignments.assignment_id`

---

### **Bước 7: Thu Final + Đóng hợp đồng**

**Ai làm:** Customer (thanh toán), Manager (đóng hợp đồng)

**Hành động:**
- Customer thanh toán Final
- `contract_installments(Final).status` = `paid`
- Nếu còn file/bàn giao cuối cùng (sheet PDF, stems…) thì gửi nốt
- Đánh dấu `contract.status='completed'`
- `task_assignments.completed_date` = timestamp

**Trạng thái:**
- `contract.status`: `signed` → `completed`
- `contract_installments(Final).status` = `paid`

**Liên kết:**
- `payments.installment_id` → `contract_installments(Final).installment_id`

---

## 🔄 TRẠNG THÁI MILESTONE - AI ĐỔI, KHI NÀO

| Trạng thái | Ai đổi | Khi nào | Ghi chú |
|------------|--------|---------|---------|
| `planned` | Hệ thống/Manager | Tạo mốc khi sinh hợp đồng | Trạng thái ban đầu |
| `in_progress` | Hệ thống/Manager | Sau khi Deposit đã paid (trigger chặn nếu chưa cọc) | Cho phép assign task và bắt đầu làm việc |
| `submitted` | Manager/Hệ thống | Đã gửi deliverable cho khách (auto khi `files.delivered_to_customer=true` lần đầu cho mốc) | Đã nộp mốc ra ngoài |
| `accepted` | Manager | Khách OK (chốt mốc) | Manager bấm "Khách duyệt" |
| `rejected` | Manager | Khách không OK (thường kèm tạo revision_requests) | Sau đó đưa mốc quay lại `in_progress` |

---

## 🤝 BẮT TAY VỚI INSTALLMENTS (Đợt tiền)

### **Deposit (before_start)**
- **Điều kiện:** Phải `paid` thì milestone mới được `in_progress`
- **Kiểm soát:** Task không được assign/start nếu chưa cọc

### **Final**

#### **Nếu gate_condition='after_delivery'**
- Mở thu ngay khi đã `delivered_to_customer=true`
- Trigger: `contract_installments(Final).status` → `pending`

#### **Nếu gate_condition='after_accept'**
- Mở thu khi milestone `accepted`
- Trigger: `contract_installments(Final).status` → `pending`

**Cách hoạt động:**
- UI chỉ enable nút thanh toán khi gate đạt
- DB: trigger update trạng thái sang `pending` lúc gate đạt

---

## 🤝 BẮT TAY VỚI TASK & FILES

### **Task chạy bên trong milestone**
- `task_assignments.status`: `assigned` → `in_progress` → `completed`
- Gán vào milestone qua `task_assignments.milestone_id`

### **Milestone lấy tín hiệu từ files**
- Có file `delivered_to_customer=true` đầu tiên ⇒ milestone `submitted`
- Nếu manager reject ⇒ milestone `rejected` rồi quay lại `in_progress` khi tạo revision
- Khi chấp nhận ⇒ `accepted` (và có thể mở Final tùy gate)

---

## 📝 HAI VÍ DỤ NGẮN

### **Luồng 1 – Transcription (1 mốc, 1 task)**

```
1. Deposit paid
   ↓
2. Milestone M1: planned → in_progress
   Task T1 assigned
   ↓
3. Specialist nộp & manager gửi khách
   ↓
4. Milestone: submitted
   ↓
5. Khách OK
   ↓
6. Milestone: accepted
   ↓
7. Final mở thu (after_accept)
   ↓
8. Khách trả Final
   ↓
9. Close
```

### **Luồng 2 – Arrangement (nhiều mốc, nhiều task)**

```
1. Deposit paid
   ↓
2. M1 (in_progress), assign T-arrange
   M2 (Recording) vẫn planned
   ↓
3. M1 delivered & accepted
   Mở installment Phase1 (nếu có)
   Hoặc chờ Final sau cùng
   ↓
4. Sau khi M1 accepted
   M2 in_progress, assign T-recording
   ↓
5. Toàn bộ mốc accepted
   ↓
6. Mở Final
   ↓
7. Thu Final
   ↓
8. Close
```

---

## 🎯 TL;DR - QUY TẮC NHỚ NHANH

1. **Cọc xong mới:** milestone `in_progress` + assign task
2. **Nộp cho KH:** set milestone `submitted` (khi `delivered_to_customer=true`)
3. **KH OK:** milestone `accepted` → mở Final theo gate
4. **KH không OK:** milestone `rejected` → tạo revision_requests → trở lại `in_progress`

---

## 🤖 TRIGGERS TỰ ĐỘNG HÓA (ĐỀ XUẤT)

### **Trigger 1: Mở milestone sau cọc**
```sql
-- Khi Deposit paid → cho phép milestone in_progress
CREATE TRIGGER trg_open_milestone_after_deposit
AFTER UPDATE OF status ON contract_installments
FOR EACH ROW
WHEN (NEW.is_deposit = true AND NEW.status = 'paid')
EXECUTE FUNCTION open_milestones();
```

### **Trigger 2: Auto set milestone submitted khi deliver**
```sql
-- Khi delivered_to_customer=true lần đầu → milestone submitted
CREATE TRIGGER trg_auto_submit_milestone_on_delivery
AFTER UPDATE OF delivered_to_customer ON files
FOR EACH ROW
WHEN (NEW.delivered_to_customer = true AND OLD.delivered_to_customer = false)
EXECUTE FUNCTION auto_submit_milestone();
```

### **Trigger 3: Mở Final khi milestone accepted/delivered**
```sql
-- Khi milestone accepted hoặc delivered → mở Final theo gate
CREATE TRIGGER trg_open_final_on_milestone_complete
AFTER UPDATE OF status ON contract_milestones
FOR EACH ROW
WHEN (EXISTS (
  SELECT 1 FROM contract_installments ci
  WHERE ci.contract_id = NEW.contract_id
    AND ci.gate_condition IN ('after_accept', 'after_delivery')
    AND ci.status = 'pending'
))
EXECUTE FUNCTION open_final_installment();
```

---

## ✅ CHECKLIST HOÀN THIỆN

- [x] Định nghĩa workflow chi tiết từng bước
- [x] Xác định vai trò ai làm gì
- [x] Trạng thái đổi thế nào
- [x] Liên kết với Installment/Task/Files
- [x] Đề xuất triggers tự động hóa
- [x] Ví dụ minh họa cho từng luồng
- [ ] Implement triggers vào ERD (sẽ làm ở bước tiếp theo)

