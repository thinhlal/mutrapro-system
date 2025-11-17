# MILESTONE WORKFLOW - Chi Tiết Từng Bước

## 📋 TÓM TẮT LUỒNG CHUẨN

```
Ký hợp đồng → Trả cọc → Mở milestone → Assign task → Specialist làm → 
Manager duyệt → Gửi khách → Khách phản hồi → Accept mốc → Thu Final → Đóng hợp đồng
```

---

## 🔄 CÁC BƯỚC CHI TIẾT

### **Bước 1: Ký hợp đồng + Tạo Milestones**

**Ai làm:** Hệ thống tự động

**Hành động:**
- Manager tạo `contracts`
- Hệ thống tự động tạo milestones dựa trên contract type:
  - **Milestone 1 (Deposit)**: Thanh toán cọc để bắt đầu
  - **Milestone 2, 3...**: Các milestone tiếp theo theo contract type

**Trạng thái:**
- `contract_milestones.payment_status` = `DUE` hoặc `NOT_DUE`
- `contract_milestones.work_status` = `PLANNED`

**Liên kết:**
- `contract_milestones.contract_id` → `contracts.contract_id`
- Milestone đầu tiên (orderIndex = 1) là deposit milestone

---

### **Bước 2: Khách trả cọc (Deposit)**

**Ai làm:** Customer

**Hành động:**
- Customer thanh toán Deposit
- Tạo `payments` → `wallet_transactions`

**Trạng thái:**
- `contract_milestones[orderIndex=1].payment_status` = `PAID`
- `contract_milestones[orderIndex=1].work_status` = `IN_PROGRESS`

**Trigger tự động:**
- Khi Deposit milestone = `PAID`:
  - Milestone đầu tiên: `work_status` → `IN_PROGRESS`
  - Contract status: `signed` → `active`
  - Set `contract.expectedStartDate` = ngày thanh toán
  - Set `contract.dueDate` = expectedStartDate + slaDays
  - Manager được phép assign task: tạo `task_assignments(status='assigned')`

**Liên kết:**
- `wallet_transactions.milestone_id` → `contract_milestones.milestone_id`
- `wallet_transactions.contract_id` → `contracts.contract_id`

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
- Nếu milestone cuối cùng được deliver:
  - Milestone tiếp theo (nếu có) có thể được thanh toán

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
- Nếu milestone được accept:
  - Milestone tiếp theo (nếu có) có thể được thanh toán

**Liên kết:**
- `revision_requests.contract_id` → `contracts.contract_id`
- `revision_requests.assignment_id` → `task_assignments.assignment_id`

---

### **Bước 7: Thu Final + Đóng hợp đồng**

**Ai làm:** Customer (thanh toán), Manager (đóng hợp đồng)

**Hành động:**
- Customer thanh toán milestone cuối cùng
- `contract_milestones[last].payment_status` = `PAID`
- `contract_milestones[last].work_status` = `COMPLETED`
- Nếu còn file/bàn giao cuối cùng (sheet PDF, stems…) thì gửi nốt
- `task_assignments.completed_date` = timestamp

**Trạng thái:**
- Tất cả milestones: `payment_status` = `PAID`
- Milestone cuối cùng: `work_status` = `COMPLETED`
- Contract có thể được đánh dấu hoàn thành

**Liên kết:**
- `wallet_transactions.milestone_id` → `contract_milestones.milestone_id`

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

## 🤝 BẮT TAY VỚI MILESTONES (Mốc thanh toán)

### **Milestone đầu tiên (Deposit)**
- **Điều kiện:** Phải `PAID` thì milestone mới được `IN_PROGRESS`
- **Kiểm soát:** Task không được assign/start nếu chưa thanh toán milestone đầu tiên
- **Tự động:** Khi thanh toán → contract status = `active`, set expectedStartDate và dueDate

### **Milestones tiếp theo**

#### **Thanh toán theo tiến độ**
- Mỗi milestone có `payment_status`: `NOT_DUE`, `DUE`, `PAID`, `OVERDUE`
- Milestone tiếp theo có thể được thanh toán khi milestone trước đó đã `PAID`
- `work_status` tự động chuyển từ `PLANNED` → `IN_PROGRESS` khi thanh toán

**Cách hoạt động:**
- UI hiển thị milestones và trạng thái thanh toán
- Backend tự động update milestone status khi nhận payment event

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
7. Milestone cuối cùng có thể thanh toán
   ↓
8. Khách trả milestone cuối cùng
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
   Milestone M2 có thể được thanh toán (nếu có)
   Hoặc chờ milestone cuối cùng
   ↓
4. Sau khi M1 accepted
   M2 in_progress, assign T-recording
   ↓
5. Toàn bộ mốc accepted
   ↓
6. Milestone cuối cùng có thể thanh toán
   ↓
7. Thu milestone cuối cùng
   ↓
8. Close
```

---

## 🎯 TL;DR - QUY TẮC NHỚ NHANH

1. **Thanh toán milestone đầu tiên:** milestone `IN_PROGRESS` + contract `active` + assign task
2. **Nộp cho KH:** set milestone `submitted` (khi `delivered_to_customer=true`)
3. **KH OK:** milestone `accepted` → milestone tiếp theo có thể thanh toán
4. **KH không OK:** milestone `rejected` → tạo revision_requests → trở lại `IN_PROGRESS`

---

## 🤖 TRIGGERS TỰ ĐỘNG HÓA (ĐỀ XUẤT)

### **Trigger 1: Mở milestone sau thanh toán milestone đầu tiên**
```sql
-- Khi milestone đầu tiên paid → cho phép milestone in_progress
-- Logic này được xử lý bởi MilestonePaidEventConsumer trong ContractService.handleMilestonePaid()
-- Khi orderIndex = 1 và payment_status = PAID:
--   - milestone.work_status → IN_PROGRESS
--   - contract.status → active
--   - contract.expectedStartDate = paidAt
--   - contract.dueDate = paidAt + slaDays
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

### **Trigger 3: Cập nhật milestone tiếp theo khi milestone trước đó paid**
```sql
-- Khi milestone được thanh toán → milestone tiếp theo có thể thanh toán
-- Logic này được xử lý bởi MilestonePaidEventConsumer
-- Khi milestone payment_status = PAID:
--   - Milestone tiếp theo (nếu có) payment_status có thể chuyển từ NOT_DUE → DUE
--   - Nếu tất cả milestones đã PAID → milestone cuối cùng work_status = COMPLETED
```

---

## ✅ CHECKLIST HOÀN THIỆN

- [x] Định nghĩa workflow chi tiết từng bước
- [x] Xác định vai trò ai làm gì
- [x] Trạng thái đổi thế nào
- [x] Liên kết với Milestones/Task/Files
- [x] Đề xuất triggers tự động hóa
- [x] Ví dụ minh họa cho từng luồng
- [ ] Implement triggers vào ERD (sẽ làm ở bước tiếp theo)

