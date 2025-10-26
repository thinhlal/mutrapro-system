# REFACTOR: Tách Milestone và Installment

## 📋 TÓM TẮT THAY ĐỔI

### ❌ XÓA: `payment_milestones`
- Trước đây: Trộn "mốc công việc" và "đợt thanh toán" trong 1 bảng
- Vấn đề: Không rõ ràng, khó quản lý

### ✅ THÊM: `contract_milestones` (Mốc công việc)
```dbml
Table contract_milestones {
  milestone_id uuid [pk]
  contract_id uuid [ref: > contracts.contract_id]
  name varchar(100)
  description text
  owner_id uuid [ref: > users.user_id] // specialist hoặc manager
  budget decimal(12,2)
  due_date timestamp
  status milestone_work_status [default: 'planned'] // planned, accepted
}
```

**Mục đích:**
- Quản lý mốc công việc trong hợp đồng
- Gán owner (người phụ trách)
- Tracking timeline và budget

### ✅ THÊM: `contract_installments` (Đợt thanh toán)
```dbml
Table contract_installments {
  installment_id uuid [pk]
  contract_id uuid [ref: > contracts.contract_id]
  label varchar(50) // Deposit, Phase 1, Final
  due_date timestamp
  amount decimal(12,2)
  currency currency_type [default: 'VND']
  status installment_status [default: 'pending'] // pending, paid, overdue, cancelled
  is_deposit boolean [default: false]
  milestone_id uuid [ref: > contract_milestones.milestone_id] // Optional
  gate_condition gate_condition // before_start, after_accept
}
```

**Mục đích:**
- Quản lý đợt thanh toán độc lập
- Đánh dấu cọc (`is_deposit`)
- Liên kết với mốc công việc (optional)
- Điều kiện thanh toán (`gate_condition`)

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

### 2. `payments`
```dbml
Table payments {
  ...
  installment_id uuid [ref: > contract_installments.installment_id, not null] // CHANGED
  ...
}
```
- **Từ:** `milestone_id` → **Sang:** `installment_id`
- Thanh toán theo đợt thanh toán (installment)

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

### `installment_status`
```dbml
Enum installment_status {
  pending         // Chờ thanh toán
  paid            // Đã thanh toán
  overdue         // Quá hạn
  cancelled       // Hủy
}
```

### `gate_condition`
```dbml
Enum gate_condition {
  before_start    // Trả trước khi bắt đầu mốc (dùng cho Deposit)
  after_accept    // Trả sau khi mốc được duyệt
  after_delivery  // Trả sau khi có file bàn giao (delivered)
}
```

## ❌ ENUMS XÓA

- ❌ `milestone_type` (deposit, final_payment, revision_fee)
- ❌ `trigger_condition` (contract_signed, project_started, deliverable_sent, project_completed)
- ❌ `milestone_status` (pending, due, paid, overdue)

## 🤖 TRIGGERS MỚI

### Trigger 1: Auto Create Installments
```sql
CREATE OR REPLACE FUNCTION auto_create_installments() RETURNS trigger AS $$
DECLARE
  v_deposit_amount decimal(12,2);
  v_final_amount decimal(12,2);
BEGIN
  -- Tính toán số tiền cọc và cuối
  v_deposit_amount := NEW.total_price * (NEW.deposit_percent / 100.0);
  v_final_amount := NEW.total_price - v_deposit_amount;
  
  -- Tạo đợt cọc
  INSERT INTO contract_installments (
    contract_id, label, due_date, amount, currency, 
    is_deposit, status, gate_condition
  ) VALUES (
    NEW.contract_id, 'Deposit', NEW.expected_start_date, v_deposit_amount, NEW.currency,
    true, 'pending', 'before_start'
  );
  
  -- Tạo đợt cuối
  INSERT INTO contract_installments (
    contract_id, label, due_date, amount, currency,
    is_deposit, status, gate_condition
  ) VALUES (
    NEW.contract_id, 'Final', NEW.due_date, v_final_amount, NEW.currency,
    false, 'pending', 'after_accept'
  );
  
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_create_installments
AFTER INSERT ON contracts FOR EACH ROW EXECUTE FUNCTION auto_create_installments();
```

**Chức năng:**
- Tự động tạo **Deposit** và **Final** khi tạo hợp đồng
- Tính số tiền từ `deposit_percent`
- Gate condition: Deposit = `before_start`, Final = `after_accept`

### Trigger 2: Mở Milestone Sau Deposit Paid
```sql
CREATE OR REPLACE FUNCTION open_milestones_after_deposit() RETURNS trigger AS $$
BEGIN
  -- Khi Deposit paid → cho phép milestone chuyển từ planned → in_progress
  IF NEW.is_deposit = true AND NEW.status = 'paid' THEN
    UPDATE contract_milestones
    SET status = 'in_progress'
    WHERE contract_id = NEW.contract_id
      AND status = 'planned';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_open_milestones_after_deposit
AFTER UPDATE OF status ON contract_installments FOR EACH ROW
EXECUTE FUNCTION open_milestones_after_deposit();
```

**Chức năng:**
- Khi Deposit paid → milestone chuyển từ `planned` → `in_progress`
- Cho phép Manager assign task và Specialist bắt đầu làm việc

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

### Trigger 4: Mở Final Khi Milestone Accepted/Delivered
```sql
CREATE OR REPLACE FUNCTION open_final_on_milestone_complete() RETURNS trigger AS $$
DECLARE
  v_gate condition;
BEGIN
  -- Khi milestone accepted → mở Final theo gate condition
  IF NEW.status = 'accepted' THEN
    -- Check gate condition
    SELECT gate_condition INTO v_gate
    FROM contract_installments
    WHERE contract_id = NEW.contract_id
      AND is_deposit = false
      AND status = 'pending';
    
    -- Status đã là pending từ đầu khi tạo hợp đồng
    -- Chỉ cần track để enable UI payment button
  END IF;
  
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_open_final_on_milestone_complete
AFTER UPDATE OF status ON contract_milestones FOR EACH ROW
EXECUTE FUNCTION open_final_on_milestone_complete();
```

**Chức năng:**
- Khi milestone `accepted` → Final installment có thể thanh toán
- Gate condition: `after_accept` hoặc `after_delivery`

## 📊 WORKFLOW MỚI

### 1. Tạo hợp đồng
```
Manager tạo contracts
  ↓
Trigger tự động tạo:
  - contract_installments (Deposit + Final)
  ↓
Customer ký hợp đồng và thanh toán Deposit
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
  milestone.status → accepted
  ↓
Gate condition check:
  - after_accept: Final installment có thể thanh toán
  - after_delivery: Chờ file delivered
  ↓
Customer thanh toán Final installment
```

### 4. Thanh toán Final
```
Customer thanh toán Final installment
  ↓
Payment liên kết với installment_id
  ↓
Hoàn tất hợp đồng
```

### 5. Nếu Manager từ chối
```
Manager reject milestone:
  milestone.status → rejected
  ↓
Specialist làm lại từ bước 2
```

## ✅ LỢI ÍCH

1. **Tách biệt rõ ràng:**
   - Mốc công việc ≠ Đợt thanh toán
   - Quản lý độc lập

2. **Linh hoạt hơn:**
   - Có thể có nhiều mốc công việc
   - Có thể có nhiều đợt thanh toán
   - Liên kết linh hoạt giữa milestone và installment

3. **Tự động hóa:**
   - Tự sinh Deposit và Final khi tạo hợp đồng
   - Gate condition tự động kiểm soát thanh toán

4. **Traceability tốt hơn:**
   - Task → Milestone → Installment → Payment
   - Dễ theo dõi và audit

## 📝 MIGRATION NOTES

### Database Changes:
1. Tạo bảng mới: `contract_milestones`, `contract_installments`
2. Thêm `milestone_id` vào `task_assignments`
3. Đổi `payments.milestone_id` → `payments.installment_id`
4. Xóa bảng `payment_milestones`
5. Thêm trigger `auto_create_installments`
6. Cập nhật trigger `create_wallet_payment_transaction`

### Code Changes:
1. Update repositories để sử dụng `contract_installments`
2. Update payment APIs để nhận `installment_id`
3. Update business logic để tạo milestones và installments
4. Update workflow tracking

## 🎯 SUMMARY

**TRƯỚC:**
- `payment_milestones` - Trộn công việc và thanh toán

**SAU:**
- `contract_milestones` - Mốc công việc
- `contract_installments` - Đợt thanh toán
- Tách biệt rõ ràng, quản lý tốt hơn!
