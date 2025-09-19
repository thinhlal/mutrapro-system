# Database Tables per Service - MuTraPro System

## 1. auth-service
**Database**: `auth_db` (stateless, chỉ lưu sessions nếu cần)
- `refresh_tokens` (optional - nếu dùng refresh token)
- `user_sessions` (optional - nếu cần track sessions)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Không có bảng users/user_roles** - dùng user-service để tra thông tin

## 2. user-service  
**Database**: `user_db`
- `users` (primary table - sở hữu duy nhất)
- `user_roles` (role management - sở hữu duy nhất)
- `customers` (customer profiles)
- `service_coordinators` (coordinators)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 3. specialist-service
**Database**: `specialist_db`
- `specialists` (specialist profiles)
- `skill_categories` (skill categories)
- `skills` (specific skills)
- `specialist_skills` (specialist-skill relationships)
- `artist_demos` (artist demo files)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 4. quotation-service
**Database**: `quotation_db`
- `service_requests` (customer requests)
- `quotations` (quotation versions)
- `pricing_matrix` (pricing rules)
- `payment_milestones` (payment milestones - sở hữu duy nhất)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 5. project-service
**Database**: `project_db`
- `projects` (project management)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Không có task_assignments** - chỉ tham chiếu task_id
- **Không có revision_requests, deliverable_packages, package_files** - thuộc revision-service

## 6. task-service
**Database**: `task_db`
- `task_assignments` (task management - sở hữu duy nhất)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 7. studio-service
**Database**: `studio_db`
- `studios` (studio information)
- `equipment_categories` (equipment categories)
- `equipment` (equipment details)
- `studio_equipment` (studio equipment inventory)
- `studio_bookings` (booking management)
- `booking_artists` (booking-artist relationships)
- `booking_required_equipment` (booking-equipment relationships)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 8. payment-service
**Database**: `payment_db`
- `payments` (payment transactions)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)
- **Không có payment_milestones** - chỉ nhận milestone_id từ quotation-service

## 9. file-service
**Database**: `file_db`
- `files` (file management)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 10. notification-service
**Database**: `notification_db`
- `notifications` (notification system)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 11. feedback-service
**Database**: `feedback_db`
- `feedback` (customer feedback)
- `activity_logs` (audit logs)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 12. revision-service
**Database**: `revision_db`
- `revision_requests` (revision requests - sở hữu duy nhất)
- `deliverable_packages` (delivery packages - sở hữu duy nhất)
- `package_files` (package-file relationships - sở hữu duy nhất)
- `outbox_events` (event publishing)
- `consumed_events` (event consumption)

## 13. api-gateway
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

### 4. Auth Service Stateless
- Auth-service không lưu bảng users
- Dùng user-service để tra thông tin người dùng
- Chỉ lưu refresh_tokens/sessions nếu cần

### 5. Soft References
- `project_id` trong task-service → gọi project-service API
- `user_id` trong mọi service → gọi user-service API
- `specialist_id` trong task-service → gọi specialist-service API
- `milestone_id` trong payment-service → gọi quotation-service API

### 6. Data Consistency
- Đảm bảo consistency qua events
- Retry mechanism cho API calls
- Eventual consistency model

### 7. Event-Driven Architecture (Tối giản)
- **Outbox Pattern**: Mỗi service có bảng `outbox_events` - dùng `event_id` làm idempotency key
- **Idempotency**: Mỗi service có bảng `consumed_events` với PK(event_id, consumer_name)
- **Status Check**: `published_at IS NULL` = pending, không cần enum status
- **Consumer Logic**: `INSERT ... ON CONFLICT DO NOTHING` - idempotent-by-schema
- **Event Types**: `quotation.approved`, `task.completed`, `payment.completed`, `package.delivered`, etc.
- **Background Jobs**: Publisher job chạy định kỳ, exponential backoff cho retry
- **Dead Letter Queue**: Events thất bại sau MAX_RETRIES được đẩy vào DLQ
