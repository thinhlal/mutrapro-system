# Database Tables per Service - MuTraPro System (Updated v3.0 - Clean Domain)

## 1. auth-service
**Database**: `auth_db` (Credentials & Auth)
- `users_auth` (user_id, email_for_login, password_hash, role, status, email_verified, mfa_enabled)
- `refresh_tokens` (nếu dùng refresh token)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Sở hữu users_auth với role** - Single source of truth cho authentication & authorization

## 2. user-service  
**Database**: `user_db` (Profile information)
- `users` (user_id, email, full_name, phone, address, is_active, created_at, updated_at)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Không có role** - Role được quản lý bởi auth-service

## 3. specialist-service
**Database**: `specialist_db`
- `specialists` (specialist profiles)
- `skills` (specific skills - simplified, no categories)
- `specialist_skills` (specialist-skill relationships)
- `artist_demos` (artist demo files - enhanced with tracking)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 4. catalog-service (NEW - danh mục dùng chung)
**Database**: `catalog_db`
- `notation_instruments` (nhạc cụ ảo cho ký âm)
- `equipment` (equipment details - simplified, no categories)
- `skill_equipment_mapping` (mapping skill với equipment phù hợp)
- `pricing_matrix` (pricing rules)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 5. request-service (NEW - intake & selections của khách)
**Database**: `request_db`
- `service_requests` (customer requests - enhanced)
- `request_booking_artists` (nghệ sĩ customer chọn cho studio booking)
- `request_booking_equipment` (thiết bị customer chọn cho studio booking)
- `request_notation_instruments` (nhạc cụ ảo theo request)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 6. contract-service
**Database**: `contract_db`
- `contracts` (contract management - sở hữu duy nhất)
- `service_sla_defaults` (SLA mặc định theo loại hợp đồng)
- `payment_milestones` (payment milestones - sở hữu duy nhất)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 7. task-service
**Database**: `task_db`
- `task_assignments` (task management - sở hữu duy nhất, simplified)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 8. studio-service
**Database**: `studio_db`
- `studios` (studio information - single studio system)
- `studio_bookings` (booking management - enhanced with cost breakdown)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Không còn booking_artists/booking_required_equipment** - đọc selections từ request-service

## 9. file-service
**Database**: `file_db`
- `files` (file management - unified files table, enhanced)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 10. wallet-service (NEW - tách riêng khỏi user-service)
**Database**: `wallet_db`
- `wallets` (ví điện tử của người dùng)
- `wallet_transactions` (lịch sử giao dịch ví)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 11. payment-service
**Database**: `payment_db`
- `payments` (payment transactions)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Không sở hữu payment_milestones** - thuộc contract-service
- **Khi payment_method=wallet** → gọi wallet-service để debit

## 12. notification-service
**Database**: `notification_db`
- `notifications` (notification system - enhanced với notification types mới)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 13. feedback-audit-service
**Database**: `feedback_db`
- `feedback` (customer feedback)
- `activity_logs` (audit logs)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 14. revision-service
**Database**: `revision_db`
- `revision_requests` (revision requests - sở hữu duy nhất, simplified revision system)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 15. api-gateway
**Database**: Không có bảng riêng (chỉ routing)

---

## Nguyên tắc thiết kế:

### 1. Không Share Bảng
- Mỗi service sở hữu duy nhất các bảng của mình
- Không có bảng nào được share giữa các services
- Mỗi service có database riêng biệt

### 2. Không có Shared Database
- Không có `shared_db` cho enums/lookup
- Mỗi service tự có enum/lookup cục bộ
- Trùng tên enum giữa services cũng không sao

### 3. Tránh Foreign Key Cross-Service
- Không dùng FK SQL giữa các services
- Dùng soft reference (lưu *_id + index)
- Xác thực qua API calls hoặc events

### 4. Auth Service sở hữu Authentication & Authorization
- Auth-service sở hữu `users_auth` với `role`, `refresh_tokens` (và `mfa_secrets` nếu có)
- User-service chỉ giữ profile information (full_name, phone, address, etc.)
- Login/refresh diễn ra hoàn toàn trong auth-service trên dữ liệu local
- Các service khác tự verify JWT bằng public key

### 5. Soft References
- `contract_id` trong task-service → gọi contract-service API
- `user_id` là UUID đồng nhất giữa services; khi cần hồ sơ (profile) → gọi user-service API
- `specialist_id` trong task-service → gọi specialist-service API
- `milestone_id` trong payment-service → gọi contract-service API
- `request_id` trong studio-service → gọi request-service API
- `wallet_id` trong payment-service → gọi wallet-service API

### 6. Data Consistency
- Đảm bảo consistency qua events
- Retry mechanism cho API calls
- Eventual consistency model

### 7. Event-Driven Architecture (Tối giản)
- **Outbox Pattern**: Mỗi service có bảng `outbox_events` - dùng `event_id` làm idempotency key
- **Idempotency**: Mỗi service có bảng `consumed_events` với PK(event_id, consumer_name)
- **Status Check**: `published_at IS NULL` = pending, không cần enum status
- **Consumer Logic**: `INSERT ... ON CONFLICT DO NOTHING` - idempotent-by-schema
- **Event Types**: `contract.signed`, `task.completed`, `payment.completed`, `revision.completed`, etc.
- **Background Jobs**: Publisher job chạy định kỳ, exponential backoff cho retry
- **Dead Letter Queue**: Events thất bại sau MAX_RETRIES được đẩy vào DLQ

---

## Wiring nhanh (calls/events chuẩn):

- **contract-service** lấy dữ liệu từ request-service (GET /requests/{id}) để tạo contract + milestones
- **studio-service** đọc selections qua request-service (GET /requests/{id}/booking-selections) trước khi confirm booking
- **task-service** validate task_type == contract.contract_type qua contract-service API hoặc local rule
- **payment-service** nhận milestone.due (event) → tạo payments(pending) → nếu wallet thì **POST wallet-service /wallets/{id}/debit (idempotency-key=payment_id)**
- **file-service** phát file.delivered → contract-service có thể mark deliverable_sent để kích hoạt milestone

---

## Thay đổi chính từ ERD v3.0:

### Service mới được thêm:
- **catalog-service**: `notation_instruments`, `equipment`, `skill_equipment_mapping`, `pricing_matrix`
- **request-service**: `service_requests`, `request_booking_*`, `request_notation_instruments`
- **wallet-service**: `wallets`, `wallet_transactions`

### Service được tách/tái cấu trúc:
- **auth-service**: Sở hữu users_auth với role, authentication & authorization
- **user-service**: Chỉ giữ profile information, không có role
- **studio-service**: Chỉ giữ studios và studio_bookings
- **contract-service**: Không còn service_requests

### Bảng được di chuyển:
- `service_requests` và các `request_*` → request-service
- `notation_instruments`, `equipment`, `skill_equipment_mapping`, `pricing_matrix` → catalog-service
- `wallets`, `wallet_transactions` → wallet-service
