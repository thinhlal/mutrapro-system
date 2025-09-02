# ERD HOÀN CHỈNH cho Hệ thống MuTraPro

## Tổng quan
Đây là Entity Relationship Diagram (ERD) hoàn chỉnh cho hệ thống **MuTraPro** (Custom Music Transcription and Production System) - Hệ thống ký âm và sản xuất âm nhạc theo yêu cầu.

**Version 2.0 - Enhanced Payment System**

## Cách sử dụng
1. Truy cập [dbdiagram.io](https://dbdiagram.io)
2. Copy nội dung file `MuTraPro_ERD.dbml` 
3. Paste vào editor của dbdiagram.io
4. Hệ thống sẽ tự động render ERD diagram

## Tính năng chính

### 🎯 **Core Features**
- ✅ Multi-role user management (7 roles)
- ✅ Automated quotation system với pricing matrix
- ✅ Milestone-based payments (deposit + final)
- ✅ Complete workflow tracking
- ✅ Studio booking management
- ✅ Revision management với cost tracking

### 💰 **Enhanced Payment System**
- ✅ Pricing matrix theo complexity level
- ✅ Automated quotation generation
- ✅ Tiền cọc 40% + thanh toán cuối 60%
- ✅ Multi-currency support (VND/USD)
- ✅ Payment milestone tracking

## Các thực thể chính (19 bảng)

### 1. **Quản lý người dùng** (5 bảng)
- **users**: Bảng chính chứa thông tin tất cả người dùng
- **customers**: Thông tin chi tiết khách hàng
- **specialists**: Thông tin chuyên gia (Transcription, Arrangement, Recording)
- **service_coordinators**: Điều phối viên dịch vụ
- **studio_administrators**: Quản trị viên studio

### 2. **Hệ thống báo giá & thanh toán** (4 bảng)
- **pricing_matrix**: Bảng giá chuẩn theo service type & complexity
- **quotations**: Báo giá chi tiết với breakdown pricing
- **payment_milestones**: Các mốc thanh toán (deposit, final)
- **payments**: Thanh toán chi tiết theo milestone

### 3. **Quản lý dịch vụ** (5 bảng)
- **service_requests**: Yêu cầu dịch vụ từ khách hàng
- **projects**: Dự án được tạo từ yêu cầu
- **task_assignments**: Phân công công việc cho chuyên gia
- **files**: Quản lý tất cả files (customer uploads, deliverables, recordings) - FULLY UNIFIED
- **revision_requests**: Yêu cầu chỉnh sửa và chi phí phát sinh

### 4. **Quản lý studio** (2 bảng)
- **studios**: Thông tin studio ghi âm
- **studio_bookings**: Đặt lịch studio với 2 mô hình (self-recording vs artist-assisted)

### 5. **Hệ thống hỗ trợ** (3 bảng)
- **feedback**: Phản hồi từ khách hàng
- **notifications**: Thông báo tự động
- **activity_logs**: Ghi log hoạt động đầy đủ

## Các mối quan hệ chính

### 1. Quan hệ 1-1
- `users` ↔ `customers`
- `users` ↔ `specialists`
- `users` ↔ `service_coordinators`
- `users` ↔ `studio_administrators`

### 2. Quan hệ 1-N
- `customers` → `service_requests`
- `service_requests` → `attachments`
- `service_requests` → `projects`
- `projects` → `task_assignments`
- `task_assignments` → `deliverables`
- `customers` → `studio_bookings`
- `service_requests` → `payments`
- `service_requests` → `feedback`

### 3. Quan hệ N-N (thông qua bảng trung gian)
- `customers` ↔ `studios` (qua `studio_bookings`)
- `specialists` ↔ `projects` (qua `task_assignments`)

## Các enum quan trọng

### user_role
- `customer`: Khách hàng
- `transcription_specialist`: Chuyên gia ký âm
- `arrangement_specialist`: Chuyên gia phối khí
- `recording_artist`: Nghệ sĩ ghi âm
- `service_coordinator`: Điều phối viên dịch vụ
- `studio_administrator`: Quản trị viên studio
- `system_admin`: Quản trị hệ thống

### service_type
- `transcription`: Ký âm
- `arrangement`: Phối khí
- `recording`: Ghi âm
- `mixing`: Mix nhạc
- `mastering`: Master nhạc
- `full_production`: Sản xuất hoàn chỉnh

### request_status
- `pending`: Chờ xử lý
- `in_review`: Đang xem xét
- `assigned`: Đã phân công
- `in_progress`: Đang thực hiện
- `completed`: Hoàn thành
- `cancelled`: Đã hủy
- `on_hold`: Tạm dừng

## Tính năng nổi bật

### 1. Quản lý đa vai trò
- Hệ thống hỗ trợ nhiều loại người dùng với các quyền khác nhau
- Mỗi người dùng có thể có nhiều vai trò

### 2. Workflow linh hoạt
- Quy trình từ yêu cầu → dự án → phân công → hoàn thành
- Hỗ trợ nhiều loại dịch vụ khác nhau

### 3. Quản lý studio
- Đặt lịch studio với quản lý tài nguyên
- Theo dõi trạng thái booking

### 4. Hệ thống thanh toán
- Hỗ trợ nhiều phương thức thanh toán
- Theo dõi trạng thái thanh toán

### 5. Thông báo và log
- Hệ thống thông báo tự động
- Ghi log đầy đủ hoạt động

## Lưu ý kỹ thuật

### Database
- Sử dụng PostgreSQL
- Primary keys sử dụng UUID
- Timestamps với timezone
- Indexes được tối ưu cho các truy vấn thường xuyên

### Bảo mật
- Mật khẩu được hash
- Log IP address và user agent
- Phân quyền theo role

### Hiệu suất
- Indexes trên các trường thường query
- Foreign key constraints
- Cascade delete được thiết kế cẩn thận

## 🔥 Cải tiến mới nhất (Version 2.1)

### ✅ **1. Multi-Role Support**
- Thêm bảng `user_roles` để support đa vai trò
- Một user có thể có nhiều role (VD: vừa là customer vừa là specialist)
- Quản lý phân quyền linh hoạt hơn

### ✅ **2. Query Performance Optimization** 
- Thêm `customer_id` trực tiếp vào `projects` → Query customer projects nhanh hơn
- Không cần JOIN ngược qua `service_requests`
- Tối ưu indexes cho performance tốt hơn

### ✅ **3. Project-based Revision Tracking**
- Thêm `project_id` vào `revision_requests` 
- Dễ dàng lọc và track revision theo từng dự án
- Quản lý revision hiệu quả hơn

### ✅ **4. Professional Deliverable Management**
- Thêm `deliverable_packages` - Gói giao nộp chính thức
- Thêm `package_files` - Quản lý files trong mỗi package  
- Support multiple delivery types: draft, milestone, final, revision
- Workflow approval chính thức từ customer
- Track lịch sử giao nộp chi tiết

## 📊 Thống kê ERD (Updated)

- **Tổng số bảng**: 23 tables (tăng từ 20)
- **Enums**: 17+ enum types (tăng từ 15)
- **Relationships**: 30+ foreign key relationships
- **Indexes**: 60+ indexes để tối ưu performance

## Mở rộng trong tương lai

1. **Tích hợp AI**: Thêm bảng để lưu kết quả AI transcription
2. **Collaboration**: Thêm bảng để quản lý team collaboration
3. **Version Control**: Quản lý version của deliverables
4. **Analytics**: Thêm bảng để phân tích dữ liệu
5. **Multi-language**: Hỗ trợ đa ngôn ngữ

## Liên hệ
Nếu có thắc mắc về ERD này, vui lòng liên hệ với team phát triển.
