# Database Tables per Service - MuTraPro System (Updated v4.0 - 8 Services Architecture)

## 1. identity-service (gộp auth + profile) — Người 1
**Database**: `identity_db`
- `users_auth` (user_id, email_for_login, password_hash, role, status, email_verified, mfa_enabled)
- `users` (user_id, email, full_name, phone, address, is_active, created_at, updated_at)
- `activity_logs` (audit logs)
- `notifications` (thông báo cơ bản - optional)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: đăng nhập, phân quyền, hồ sơ người dùng, thông báo cơ bản
- **API chính**: POST /auth/login, POST /auth/refresh, GET /users/{id}
- **Events phát**: user.created, user.updated, login.failed

## 2. specialist-service — Người 1 (phần còn lại)
**Database**: `specialist_db`
- `specialists` (specialist profiles)
- `skills` (specific skills)
- `specialist_skills` (specialist-skill relationships)
- `artist_demos` (artist demo files)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: chuyên gia, kỹ năng, demo
- **API**: GET /specialists/{id}, GET /specialists?skill=...
- **Events**: specialist.created|updated, demo.published

## 3. request-service (gộp intake + catalog) — Người 2
**Database**: `request_db`
- **Intake**: `service_requests`, `request_booking_artists`, `request_booking_equipment`, `request_notation_instruments`
- **Catalog**: `notation_instruments`, `equipment`, `skill_equipment_mapping`, `pricing_matrix`
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: tiếp nhận yêu cầu + lựa chọn; quản lý danh mục dùng chung
- **API**: POST /requests, GET /requests/{id}, GET /requests/{id}/booking-selections, GET /catalog/equipment, GET /catalog/notation-instruments
- **Events**: request.created, request.updated, selection.changed

## 4. project-service (đổi tên từ contract-task) — Người 2 (phần còn lại)
**Database**: `project_db`
- `contracts` (contract management)
- `service_sla_defaults` (SLA mặc định theo loại hợp đồng)
- `payment_milestones` (payment milestones)
- `task_assignments` (task management)
- `revision_requests` (revision requests)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: hợp đồng, SLA, milestones, task & revisions
- **API**: POST /contracts, POST /contracts/{id}/sign, POST /tasks, PATCH /tasks/{id}, POST /revisions, PATCH /revisions/{id}
- **Events**: contract.signed, milestone.due, task.assigned|completed, revision.approved|completed

## 5. studio-service — Người 3
**Database**: `studio_db`
- `studios` (studio information)
- `studio_bookings` (booking management)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: quản lý studio & booking
- **API**: POST /bookings, POST /bookings/{id}/confirm (đọc selections từ request-service)
- **Events**: booking.confirmed, session.completed

## 6. billing-service (gộp payment + wallet) — Người 3 (phần còn lại)
**Database**: `billing_db`
- `wallets` (ví điện tử của người dùng)
- `wallet_transactions` (lịch sử giao dịch ví)
- `payments` (payment transactions)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: ví, giao dịch ví, thanh toán milestone
- **API**: POST /wallets/{id}/topup, POST /wallets/{id}/debit, POST /payments
- **Events**: wallet.debited|refunded, payment.completed|failed

## 7. file-service — Người 4
**Database**: `file_db`
- `files` (file management)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: quản lý file & phân phối
- **API**: POST /files/upload, POST /files/{id}/deliver
- **Events**: file.uploaded, file.delivered

## 8. notification-service — Người 4 (tuỳ chọn, có thể gộp)
**Database**: `notification_db`
- `notifications` (notification system)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: fan-out sự kiện thành thông báo đa kênh
- **API**: POST /notify, GET /notifications?userId=...
- **Events**: notification.sent

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

### 4. Identity Service sở hữu Authentication & Authorization
- Identity-service sở hữu `users_auth` với `role`, `refresh_tokens`, `users` profile
- Login/refresh diễn ra hoàn toàn trong identity-service trên dữ liệu local
- Các service khác tự verify JWT bằng public key

### 5. Soft References
- `user_id` là UUID đồng nhất giữa services; khi cần hồ sơ → gọi identity-service API
- `specialist_id` → gọi specialist-service API
- `request_id` → gọi request-service API
- `contract_id` → gọi project-service API
- `milestone_id` → gọi project-service API
- `wallet_id` → gọi billing-service API

### 6. Data Consistency
- Đảm bảo consistency qua events
- Retry mechanism cho API calls
- Eventual consistency model

### 7. Event-Driven Architecture (Tối giản)
- **Outbox Pattern**: Mỗi service có bảng `outbox_events` - dùng `event_id` làm idempotency key
- **Idempotency**: Mỗi service có bảng `consumed_events` với PK(event_id, consumer_name)
- **Status Check**: `published_at IS NULL` = pending, không cần enum status
- **Consumer Logic**: `INSERT ... ON CONFLICT DO NOTHING` - idempotent-by-schema
- **Event Types**: `user.created`, `request.created`, `contract.signed`, `task.completed`, `payment.completed`, etc.
- **Background Jobs**: Publisher job chạy định kỳ, exponential backoff cho retry
- **Dead Letter Queue**: Events thất bại sau MAX_RETRIES được đẩy vào DLQ

---

## Wiring nhanh (calls/events chuẩn):

- **project-service** lấy dữ liệu từ request-service (GET /requests/{id}) để tạo contract + milestones
- **studio-service** đọc selections qua request-service (GET /requests/{id}/booking-selections) trước khi confirm booking
- **project-service** validate task_type == contract.contract_type qua local rule
- **billing-service** nhận milestone.due (event) → tạo payments(pending) → nếu wallet thì **POST /wallets/{id}/debit (idempotency-key=payment_id)**
- **file-service** phát file.delivered → project-service có thể mark deliverable_sent để kích hoạt milestone

---

## Phân công công việc cho team 4 người:

### Người 1 - Team Lead (Full-stack)
- **Responsibility**: identity-service + specialist-service
- **Focus**: Authentication, user management, talent management
- **Skills**: Spring Security, JWT, User management, Talent management

### Người 2 - Backend Developer
- **Responsibility**: request-service + project-service
- **Focus**: Core business logic, request processing, project lifecycle
- **Skills**: Spring Boot, Business logic, Event handling, Workflow management

### Người 3 - Full-stack Developer
- **Responsibility**: studio-service + billing-service
- **Focus**: Studio operations, financial transactions
- **Skills**: Spring Boot, Studio management, Payment integration, Financial logic

### Người 4 - Backend Developer
- **Responsibility**: file-service + notification-service
- **Focus**: File management, notifications
- **Skills**: Spring Boot, File handling, Message queues, Notification systems

---

## Thay đổi chính từ ERD v3.0:

### Service được gộp/tái cấu trúc:
- **identity-service**: Gộp auth-service + user-service + notifications
- **request-service**: Gộp request-service + catalog-service
- **project-service**: Gộp contract-service + task-service + revision-service
- **billing-service**: Gộp payment-service + wallet-service

### Service giữ nguyên:
- **specialist-service**: Chuyên gia, kỹ năng, demo
- **studio-service**: Studio operations
- **file-service**: File management
- **notification-service**: Communication layer (optional)

### Bảng được di chuyển:
- `users_auth`, `users`, `notifications` → identity-service
- `service_requests`, `request_*`, `notation_instruments`, `equipment`, `skill_equipment_mapping`, `pricing_matrix` → request-service
- `contracts`, `service_sla_defaults`, `payment_milestones`, `task_assignments`, `revision_requests` → project-service
- `wallets`, `wallet_transactions`, `payments` → billing-service
