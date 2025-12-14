# Database Tables per Service - MuTraPro System (Updated v4.1 - 7 Services Architecture)

## 1. identity-service (gộp auth + profile) — Người 1
**Database**: `identity_db`
- `users_auth` (user_id, email, password_hash, role, status, email_verified, auth_provider, auth_provider_id, has_local_password, password_reset_token_hash, password_reset_token_expires_at)
- `users` (user_id, full_name, phone, address, avatar_url, is_active, created_at, updated_at)
- `email_verifications` (email verification OTP)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: đăng nhập, phân quyền, hồ sơ người dùng, email verification
- **API chính**: POST /auth/login, POST /auth/refresh, GET /users/{id}, POST /auth/verify-email
- **Events phát**: user.created, user.updated, login.failed, email.verified

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
- **Intake**: `service_requests`, `request_notation_instruments`
- **Catalog**: `notation_instruments`, `pricing_matrix`
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: tiếp nhận yêu cầu + lựa chọn; quản lý danh mục dùng chung
- **API**: POST /requests, GET /requests/{id}, GET /catalog/notation-instruments
- **Events**: request.created, request.updated, selection.changed

## 4. project-service (gộp contract + task + revision + file + studio) — Người 2 (phần còn lại)
**Database**: `project_db`
- `contracts` (contract management)
- `contract_milestones` (work milestones)
- `contract_installments` (payment installments)
- `contract_sign_sessions` (e-signature sessions)
- `task_assignments` (task management)
- `revision_requests` (revision requests)
- `file_submissions` (file submissions)
- `files` (file management & delivery)
- `studios` (studio information)
- `studio_bookings` (booking management)
- `booking_artists` (booking artists)
- `booking_participants` (booking participants)
- `booking_required_equipment` (booking equipment)
- `equipment` (equipment catalog)
- `skill_equipment_mapping` (skill-equipment mapping)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: hợp đồng, milestones, installments, task & revisions, file management, studio bookings
- **API**: POST /contracts, POST /contracts/{id}/sign, POST /tasks, PATCH /tasks/{id}, POST /revisions, PATCH /revisions/{id}, POST /files/upload, POST /files/{id}/deliver, POST /bookings, POST /bookings/{id}/confirm
- **Events**: contract.signed, milestone.due, task.assigned|completed, revision.approved|completed, file.uploaded, file.delivered, file.approved, booking.confirmed, session.completed

## 5. billing-service (gộp payment + wallet) — Người 3
**Database**: `billing_db`
- `wallets` (ví điện tử của người dùng)
- `wallet_transactions` (lịch sử giao dịch ví)
- `payment_orders` (payment orders for topup)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Nhiệm vụ**: ví, giao dịch ví, thanh toán topup
- **API**: POST /wallets/{id}/topup, POST /wallets/{id}/debit, POST /payment-orders
- **Events**: wallet.debited|refunded, payment.completed|failed

## 6. notification-service — Người 4
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
- Identity-service sở hữu `users_auth` với `role`, `email`, `password_hash`, `users` profile
- Login/refresh diễn ra hoàn toàn trong identity-service trên dữ liệu local
- Các service khác tự verify JWT bằng public key
- Email chỉ có trong `users_auth`, không duplicate trong `users`

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
- **Responsibility**: billing-service
- **Focus**: Financial transactions, wallet management
- **Skills**: Spring Boot, Payment integration, Financial logic

### Người 4 - Backend Developer
- **Responsibility**: notification-service + chat-service
- **Focus**: Notifications, communication layer, chat system
- **Skills**: Spring Boot, Message queues, Notification systems, Real-time communication

---

## Thay đổi chính từ ERD v3.0:

### Service được gộp/tái cấu trúc:
- **identity-service**: Gộp auth-service + user-service + notifications
- **request-service**: Gộp request-service + catalog-service
- **project-service**: Gộp contract-service + task-service + revision-service + **file-service**
- **billing-service**: Gộp payment-service + wallet-service

### Service giữ nguyên:
- **specialist-service**: Chuyên gia, kỹ năng, demo
- **notification-service**: Communication layer (optional)
- **chat-service**: Chat rooms, messages, participants

### Service được loại bỏ:
- **file-service**: Đã gộp vào project-service
- **studio-service**: Đã gộp vào project-service

### Bảng được di chuyển:
- `users_auth`, `users` → identity-service (xóa duplicate email, xóa activity_logs và notifications)
- `service_requests`, `request_notation_instruments`, `notation_instruments`, `pricing_matrix` → request-service
- `contracts`, `contract_milestones`, `contract_installments`, `contract_sign_sessions`, `task_assignments`, `revision_requests`, `file_submissions`, `files`, `studios`, `studio_bookings`, `booking_artists`, `booking_participants`, `booking_required_equipment`, `equipment`, `skill_equipment_mapping` → project-service
- `wallets`, `wallet_transactions`, `payment_orders` → billing-service
- `notifications` → notification-service (riêng biệt)

---

## Lý do gộp File Service vào Project Service:

### **1. Business Workflow Integration**
- Files được deliver trong context của project
- File approval/rejection affects project status  
- Revision files are part of project lifecycle
- Customer xem files trong project dashboard

### **2. Event-Driven Architecture**
- `file.delivered` → trigger milestone completion
- `file.rejected` → trigger revision request
- `file.approved` → mark task as completed
- File events naturally integrate với project events

### **3. Infrastructure Independence**
- AWS S3 storage không ảnh hưởng đến service boundaries
- File metadata cần sync với project status
- File delivery affects contract milestones

### **4. API Consolidation**
- POST /projects/{projectId}/files/upload
- POST /projects/{projectId}/files/{fileId}/deliver  
- POST /projects/{projectId}/files/{fileId}/approve
- GET /projects/{projectId}/files (list all project files)

### **5. Database Optimization**
- Files table trong project_db với foreign keys đến contracts, task_assignments
- Đơn giản hóa queries cho project + files
- Consistent transaction boundaries
