# REFACTOR: Chuyển từ Installment sang Contract Milestones

## ✅ ĐÃ HOÀN THÀNH

### ❌ ĐÃ XÓA: `contract_installments` và `payment_milestones`
- Trước đây: Dùng `contract_installments` để quản lý đợt thanh toán riêng biệt
- Vấn đề: Tách biệt giữa công việc (milestone) và thanh toán (installment) gây phức tạp

### ✅ HIỆN TẠI: Chỉ dùng `contract_milestones` (Mốc công việc + Thanh toán)
```dbml
Table contract_milestones {
  milestone_id uuid [pk]
  contract_id uuid [ref: > contracts.contract_id]
  name varchar(100)
  description text
  order_index int // 1, 2, 3...
  work_status milestone_work_status [default: 'PLANNED'] // PLANNED, IN_PROGRESS, WAITING_CUSTOMER, READY_FOR_PAYMENT, COMPLETED, CANCELLED
  billing_type milestone_billing_type // PERCENTAGE, FIXED, NO_PAYMENT
  billing_value decimal(5,2) // % hoặc số tiền
  amount decimal(12,2) // Số tiền thực tế
  payment_status milestone_payment_status [default: 'NOT_DUE'] // NOT_DUE, DUE, PAID, OVERDUE
  planned_due_date timestamp
  paid_at timestamp
  created_at timestamp
  updated_at timestamp
}
```

**Mục đích:**
- Quản lý mốc công việc VÀ thanh toán trong cùng một entity
- Mỗi milestone có cả thông tin công việc (work_status) và thanh toán (payment_status, amount)
- Tự động tạo dựa trên contract type và depositPercent
- Tracking timeline, công việc và thanh toán

## 🔄 CẬP NHẬT BẢNG KHÁC

### 1. `task_assignments`
```dbml
Table task_assignments {
  ...
  milestone_id uuid [ref: > contract_milestones.milestone_id] // NEW
  ...
}
```
- **Gán task vào mốc công việc** qua `milestone_id`

### 2. `wallet_transactions`
```dbml
Table wallet_transactions {
  ...
  milestone_id uuid [ref: > contract_milestones.milestone_id] // CHANGED
  contract_id uuid [ref: > contracts.contract_id]
  ...
}
```
- **Từ:** `installment_id` → **Sang:** `milestone_id`
- Thanh toán gắn trực tiếp với milestone

## 🔧 ENUMS MỚI

### `milestone_work_status`
```dbml
Enum milestone_work_status {
  planned         // Tạo mốc
  in_progress     // Đang thực hiện (mở khi đã cọc)
  submitted       // Đã nộp mốc cho manager duyệt
  accepted        // Manager duyệt OK
  rejected        // Manager từ chối, yêu cầu làm lại
}
```

### `milestone_payment_status`
```dbml
Enum milestone_payment_status {
  NOT_DUE         // Chưa đến hạn thanh toán
  DUE             // Đến hạn thanh toán
  PAID            // Đã thanh toán
  OVERDUE         // Quá hạn thanh toán
}
```

### `milestone_billing_type`
```dbml
Enum milestone_billing_type {
  PERCENTAGE      // Thanh toán theo % (ví dụ: 40%, 60%)
  FIXED           // Thanh toán số tiền cố định
  NO_PAYMENT      // Không có thanh toán
}
```

## ❌ ENUMS ĐÃ XÓA

- ❌ `installment_status` (pending, paid, overdue, cancelled)
- ❌ `gate_condition` (before_start, after_accept, after_delivery)
- ❌ `milestone_type` (deposit, final_payment, revision_fee)

## 🤖 LOGIC TỰ ĐỘNG (Backend)

### 1. Auto Create Milestones
- **Khi nào:** Sau khi tạo contract thành công
- **Logic:** `ContractService.createMilestonesForContract()`
- **Tạo milestones dựa trên contract type:**
  - `transcription`: 2 milestones (depositPercent, 100% - depositPercent)
  - `arrangement`: 2 milestones (depositPercent, 100% - depositPercent)
  - `arrangement_with_recording`: 2 milestones (depositPercent, 100% - depositPercent)
  - `recording`: 2 milestones (depositPercent, 100% - depositPercent)
  - `bundle`: 3 milestones (depositPercent, chia đều phần còn lại)
- **Tính toán:** `amount = totalPrice * (billingValue / 100)` nếu PERCENTAGE

### 2. Update Milestone Khi Thanh Toán
- **Khi nào:** Khi nhận `MilestonePaidEvent` từ billing-service
- **Logic:** `ContractService.handleMilestonePaid()`
- **Xử lý:**
  - Update milestone: `payment_status = PAID`, `work_status = IN_PROGRESS`
  - Nếu milestone đầu tiên (orderIndex = 1):
    * Set `contract.expectedStartDate = paidAt`
    * Set `contract.dueDate = paidAt + slaDays`
    * Set `contract.status = ACTIVE`
  - Nếu tất cả milestones đã PAID:
    * Update milestone cuối cùng: `work_status = COMPLETED`

### Trigger 3: Auto Submit Milestone Khi Deliver File
```sql
CREATE OR REPLACE FUNCTION auto_submit_milestone_on_delivery() RETURNS trigger AS $$
DECLARE
  v_milestone_id uuid;
BEGIN
  -- Khi delivered_to_customer=true lần đầu → milestone submitted
  IF NEW.delivered_to_customer = true AND OLD.delivered_to_customer = false THEN
    -- Lấy milestone_id từ assignment
    SELECT milestone_id INTO v_milestone_id
    FROM task_assignments
    WHERE assignment_id = NEW.assignment_id;
    
    -- Update milestone status
    IF v_milestone_id IS NOT NULL THEN
      UPDATE contract_milestones
      SET status = 'submitted'
      WHERE milestone_id = v_milestone_id
        AND status = 'in_progress';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_submit_milestone_on_delivery
AFTER UPDATE OF delivered_to_customer ON files FOR EACH ROW
EXECUTE FUNCTION auto_submit_milestone_on_delivery();
```

**Chức năng:**
- Khi file được delivered cho customer → milestone chuyển từ `in_progress` → `submitted`
- Tự động hóa việc tracking milestone status

### 3. Event-Driven Payment Processing
- **Event:** `MilestonePaidEvent` từ billing-service
- **Consumer:** `MilestonePaidEventConsumer` trong project-service
- **Flow:**
  1. Customer thanh toán → `WalletService.debitWallet()` tạo `MilestonePaidEvent`
  2. Event được publish vào Kafka topic `billing-milestone-paid`
  3. `MilestonePaidEventConsumer` nhận event và gọi `handleMilestonePaid()`
  4. Update milestone và contract status

## 📊 WORKFLOW MỚI

### 1. Tạo hợp đồng
```
Manager tạo contracts
  ↓
Backend tự động tạo:
  - contract_milestones (dựa trên contract type và depositPercent)
  ↓
Customer ký hợp đồng và thanh toán milestone đầu tiên (Deposit)
```

### 2. Tạo mốc công việc và gán task
```
Manager tạo contract_milestones (status: planned)
  ↓
Manager gán tasks vào milestone
  ↓
Sau khi Deposit thanh toán:
  milestone.status → in_progress
  ↓
Specialist hoàn thành task
  ↓
Specialist submit milestone:
  milestone.status → submitted
```

### 3. Manager duyệt mốc
```
Manager review milestone
  ↓
Nếu OK:
  milestone.work_status → accepted
  ↓
Milestone tiếp theo có thể được thanh toán
  ↓
Customer thanh toán milestone tiếp theo
```

### 4. Thanh toán Milestones
```
Customer thanh toán milestone
  ↓
WalletTransaction liên kết với milestone_id
  ↓
MilestonePaidEvent → Update milestone và contract
  ↓
Nếu tất cả milestones đã PAID → Hoàn tất hợp đồng
```

### 5. Nếu Manager từ chối
```
Manager reject milestone:
  milestone.status → rejected
  ↓
Specialist làm lại từ bước 2
```

## ✅ LỢI ÍCH

1. **Đơn giản hóa:**
   - Mốc công việc = Đợt thanh toán (trong cùng một entity)
   - Quản lý thống nhất, dễ hiểu

2. **Linh hoạt hơn:**
   - Có thể có nhiều milestones tùy contract type
   - Mỗi milestone có cả thông tin công việc và thanh toán
   - Tự động tính toán amount dựa trên percentage hoặc fixed

3. **Tự động hóa:**
   - Tự sinh milestones khi tạo hợp đồng
   - Tự động update status khi thanh toán
   - Event-driven architecture với Kafka

4. **Traceability tốt hơn:**
   - Task → Milestone → Payment (WalletTransaction)
   - Dễ theo dõi và audit
   - Mỗi milestone có đầy đủ thông tin công việc và thanh toán

## 📝 MIGRATION ĐÃ HOÀN THÀNH

### Database Changes:
1. ✅ Tạo bảng mới: `contract_milestones` (với đầy đủ thông tin công việc và thanh toán)
2. ✅ Thêm `milestone_id` vào `wallet_transactions`
3. ✅ Xóa bảng `contract_installments`
4. ✅ Xóa các enum: `installment_status`, `gate_condition`
5. ✅ Thêm các enum: `milestone_payment_status`, `milestone_billing_type`, `milestone_work_status`

### Code Changes:
1. ✅ Update repositories để chỉ sử dụng `contract_milestones`
2. ✅ Update payment APIs để nhận `milestone_id` và `orderIndex`
3. ✅ Update business logic để tự động tạo milestones
4. ✅ Implement `MilestonePaidEvent` và `MilestonePaidEventConsumer`
5. ✅ Xóa tất cả code liên quan đến `contract_installments`

## 🎯 SUMMARY

**TRƯỚC:**
- `contract_installments` - Đợt thanh toán riêng biệt
- `contract_milestones` - Mốc công việc riêng biệt
- Phức tạp, cần liên kết giữa 2 bảng

**SAU:**
- `contract_milestones` - Mốc công việc + Thanh toán (unified)
- Đơn giản, dễ quản lý, tự động hóa tốt hơn!
