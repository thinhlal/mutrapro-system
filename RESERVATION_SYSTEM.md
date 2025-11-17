# RESERVATION SYSTEM - Giữ Chỗ Studio

## 📋 TỔNG QUAN

Hệ thống Reservation cho phép khách hàng giữ chỗ studio trước khi ký hợp đồng chính thức. Giúp:
- Hạn chế "no-show"
- Giữ lịch được chắc chắn
- Thu phí giữ chỗ nhỏ

---

## 🎯 HAI LUỒNG CHÍNH

### **A. Trước khi có hợp đồng (Giữ chỗ studio)**

#### **Reservation Fee**
- **Mặc định:** 10-20% giá ước tính của ca thu hoặc mức cố định (vd: 200k-500k)
- **Mục đích:** Hạn chế "no-show", giữ lịch
- **Không phải:** Thanh toán dịch vụ đầy đủ

#### **Workflow:**
```
1. Customer yêu cầu book studio
   ↓
2. Hệ thống tạo studio_bookings (status: tentative)
   ↓
3. Manager yêu cầu Reservation Fee
   ↓
4. Customer thanh toán Reservation Fee
   ↓
5. reservation_holders.status = paid
   ↓
6. Studio được giữ chỗ
```

#### **Hoàn/Khấu trừ:**

**Nếu khách tiếp tục và ký hợp đồng:**
- Khấu trừ reservation fee vào milestone đầu tiên (Deposit milestone) của hợp đồng
- `reservation_holders.status` = `applied`
- `reservation_holders.is_applied_to_deposit` = `true`

**Nếu khách hủy:**
- Hoàn theo tầng thời gian:
  - **Hủy ≥72h trước:** Hoàn 100% reservation fee
  - **24-72h:** Hoàn 50%
  - **<24h hoặc no-show:** Không hoàn
- `reservation_holders.status` = `cancelled`
- `reservation_holders.refund_amount` = calculated

---

### **B. Khi đã có hợp đồng**

#### **Tự sinh milestones:**
- Hệ thống tự động tạo milestones dựa trên contract type và depositPercent
- **Milestone 1 (Deposit)**: Thanh toán cọc để bắt đầu
- **Milestone 2, 3...**: Các milestone tiếp theo theo contract type

#### **Điều kiện để bắt đầu:**
Chỉ khi milestone đầu tiên (Deposit) đã `PAID` mới:
- `studio_bookings.status` → `confirmed`
- Contract status → `active`
- Manager được phép assign task (nếu có)

---

## 📊 SCHEMA

### **Table: studio_bookings** (Thêm fields cho reservation)

```dbml
Table studio_bookings {
  // ... existing fields ...
  
  // Reservation fee management (cho giữ chỗ trước hợp đồng)
  reservation_fee_amount decimal(12,2) [default: 0]
  reservation_fee_status reservation_fee_status [default: 'none']
  reservation_wallet_tx_id uuid [ref: > wallet_transactions.wallet_tx_id]
  reservation_refund_wallet_tx_id uuid [ref: > wallet_transactions.wallet_tx_id]
  reservation_applied_to_milestone_id uuid [ref: > contract_milestones.milestone_id]
  refund_policy_json jsonb
}
```

### **Table: contract_milestones** (Thêm field cho credit nếu cần)

```dbml
Table contract_milestones {
  // ... existing fields ...
  
  // Khấu trừ từ reservation fee hoặc credit khác (nếu cần)
  // applied_credit_amount decimal(12,2) [default: 0]
}
```

### **Table: wallet_transactions** (Thêm fields cho traceability)

```dbml
Table wallet_transactions {
  // ... existing fields ...
  
  // Truy vết giao dịch đến thực thể
  contract_id uuid [ref: > contracts.contract_id]
  milestone_id uuid [ref: > contract_milestones.milestone_id]
  booking_id uuid [ref: > studio_bookings.booking_id]
  refund_of_wallet_tx_id uuid [ref: > wallet_transactions.wallet_tx_id]
}
```

### **Enum: reservation_fee_status**

```dbml
Enum reservation_fee_status {
  none            // Không có phí giữ chỗ
  pending         // Chờ thanh toán
  paid            // Đã thanh toán phí giữ chỗ
  applied         // Đã khấu trừ vào Deposit
  refunded        // Đã hoàn tiền
  forfeited       // Mất phí giữ chỗ (hủy <24h hoặc no-show)
}
```

---

## 🔄 WORKFLOW CHI TIẾT

### **Scenario 1: Khách giữ chỗ và ký hợp đồng**

```
1. Customer yêu cầu book studio
   → studio_bookings (status: tentative)
   
2. Manager yêu cầu Reservation Fee
   → reservation_holders (status: pending)
   
3. Customer thanh toán Reservation Fee
   → reservation_holders (status: paid)
   
4. Customer ký hợp đồng và thanh toán Deposit milestone
   → Trigger: Khấu trừ reservation fee vào milestone đầu tiên (Deposit)
   → reservation_holders (status: applied)
   → reservation_holders.is_applied_to_deposit = true
   → reservation_holders.reservation_applied_to_milestone_id = Deposit milestone_id
   → Deposit milestone amount giảm bằng reservation_fee
   
5. Hợp đồng hoạt động bình thường
```

### **Scenario 2: Khách hủy giữ chỗ**

```
1. Customer thanh toán Reservation Fee
   → reservation_holders (status: paid)
   
2. Customer hủy booking
   → reservation_holders (status: cancelled)
   → Trigger: Tính refund theo thời gian
   
3. Tính toán refund:
   - ≥72h trước: refund_amount = 100% reservation_fee
   - 24-72h: refund_amount = 50% reservation_fee
   - <24h: refund_amount = 0
   
4. Hoàn tiền cho customer
   → reservation_holders (status: refunded)
   → refunded_at = timestamp
```

---

## 🤖 TRIGGERS

### **Trigger 1: Khấu trừ Reservation Fee vào Deposit Milestone**

```sql
-- Logic này được xử lý trong backend khi milestone đầu tiên được thanh toán
-- Khi milestone đầu tiên (orderIndex = 1) payment_status = PAID:
--   - Kiểm tra xem có reservation fee chưa apply không
--   - Nếu có: Khấu trừ reservation fee vào milestone amount
--   - Update reservation_holders:
--     * status = 'applied'
--     * is_applied_to_deposit = true
--     * reservation_applied_to_milestone_id = milestone_id
```

**Chức năng:**
- Khi Deposit milestone paid → Tự động khấu trừ reservation fee vào milestone amount
- Update reservation status = `applied`
- Link reservation với milestone

### **Trigger 2: Tính Refund khi hủy**

```sql
CREATE OR REPLACE FUNCTION calculate_reservation_refund() RETURNS trigger AS $$
DECLARE
  v_hours_before_booking int;
  v_refund_percent decimal(5,2);
BEGIN
  -- Chỉ xử lý khi status chuyển sang cancelled
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    -- Tính số giờ trước booking
    SELECT EXTRACT(EPOCH FROM (sb.booking_date + sb.start_time - NOW())) / 3600
    INTO v_hours_before_booking
    FROM studio_bookings sb
    WHERE sb.booking_id = NEW.booking_id;
    
    -- Tính refund theo chính sách
    IF v_hours_before_booking >= 72 THEN
      v_refund_percent := 100.0; -- Hoàn 100%
    ELSIF v_hours_before_booking >= 24 THEN
      v_refund_percent := 50.0;  -- Hoàn 50%
    ELSE
      v_refund_percent := 0.0;   -- Không hoàn
    END IF;
    
    -- Tính refund amount
    NEW.refund_amount := NEW.reservation_fee * (v_refund_percent / 100.0);
    NEW.cancelled_at := NOW();
  END IF;
  
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_reservation_refund
BEFORE UPDATE OF status ON reservation_holders 
FOR EACH ROW
EXECUTE FUNCTION calculate_reservation_refund();
```

**Chức năng:**
- Khi reservation chuyển sang `cancelled` → Tự động tính refund
- Theo thời gian hủy: ≥72h (100%), 24-72h (50%), <24h (0%)
- Set `refund_amount` và `cancelled_at`

---

## 📝 CHÍNH SÁCH REFUND

| Thời gian hủy | % Hoàn tiền | Ví dụ (Reservation Fee = 500k) |
|---------------|-------------|--------------------------------|
| ≥72 giờ trước | 100% | 500,000 VND |
| 24-72 giờ | 50% | 250,000 VND |
| <24 giờ hoặc no-show | 0% | 0 VND |

---

## ✅ CHECKLIST HOÀN THIỆN

- [x] Tạo bảng `reservation_holders`
- [x] Tạo enum `reservation_status`
- [x] Trigger khấu trừ reservation vào Deposit
- [x] Trigger tính refund khi hủy
- [x] Liên kết với `studio_bookings`
- [x] Soft reference với `contract_milestones`

---

## 🎯 TÓM TẮT

### **Trước hợp đồng:**
- Giữ chỗ studio với Reservation Fee
- Phí giữ chỗ: 10-20% hoặc mức cố định
- Tự động tính refund khi hủy theo thời gian

### **Khi ký hợp đồng:**
- Tự động khấu trừ reservation fee vào Deposit
- Deposit amount giảm đi = reservation_fee
- Reservation status = `applied`

### **Chỉ khi Deposit paid:**
- Studio booking → `confirmed`
- Manager được phép assign task
- Milestone → `in_progress`

