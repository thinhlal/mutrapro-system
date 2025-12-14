# 🔐 DANH SÁCH TÀI KHOẢN DEMO

## 📋 TỔNG QUAN

File này chứa danh sách tất cả các tài khoản demo để đăng nhập vào hệ thống MuTraPro.

**⚠️ LƯU Ý:** 
- Các tài khoản này chỉ dùng cho mục đích demo và testing
- Không sử dụng các tài khoản này trong môi trường production
- Mật khẩu mặc định: `12345678`

---

## 👥 DANH SÁCH TÀI KHOẢN

### 1. SYSTEM ADMINISTRATOR (Quản trị viên hệ thống)

| Username | Email | Password | Role | Mô tả |
|----------|-------|----------|------|-------|
| System Admin | `admin@admin.com` | `12345678` | `SYSTEM_ADMIN` | Quản trị viên hệ thống, có quyền cao nhất |

**Quyền hạn:**
- Quản lý toàn bộ hệ thống
- Quản lý người dùng và phân quyền
- Xem tất cả các báo cáo và thống kê
- Cấu hình hệ thống

---

### 2. MANAGER (Quản lý)

| Username | Email | Password | Role | Mô tả |
|----------|-------|----------|------|-------|
| Manager | `manager@manager.com` | `12345678` | `MANAGER` | Quản lý dự án và chuyên gia |

**Quyền hạn:**
- Quản lý dự án
- Phê duyệt hợp đồng
- Quản lý chuyên gia
- Xem báo cáo

---

### 3. CUSTOMER (Khách hàng)

#### 3.1. Customer - Transcription
| Username | Email | Password | Role | Mô tả |
|----------|-------|----------|------|-------|
| Transcription Customer | `transcription@transcription.com` | `12345678` | `CUSTOMER` | Khách hàng sử dụng dịch vụ ký âm |

**Quyền hạn:**
- Tạo yêu cầu ký âm
- Quản lý dự án của mình
- Xem hợp đồng và thanh toán
- Chat với chuyên gia

#### 3.2. Customer - Arrangement
| Username | Email | Password | Role | Mô tả |
|----------|-------|----------|------|-------|
| Arrangement Customer | `arrangement@arrangement.com` | `12345678` | `CUSTOMER` | Khách hàng sử dụng dịch vụ phối khí |

**Quyền hạn:**
- Tạo yêu cầu phối khí
- Quản lý dự án của mình
- Xem hợp đồng và thanh toán
- Chat với chuyên gia

#### 3.3. Customer - Recording
| Username | Email | Password | Role | Mô tả |
|----------|-------|----------|------|-------|
| Recording Customer | `recording@recording.com` | `12345678` | `CUSTOMER` | Khách hàng sử dụng dịch vụ thu âm |

**Quyền hạn:**
- Tạo yêu cầu thu âm
- Quản lý dự án của mình
- Xem hợp đồng và thanh toán
- Chat với chuyên gia

---

### 4. SPECIALIST (Chuyên gia)

**⚠️ QUAN TRỌNG:** Specialist **KHÔNG** được tạo tự động khi hệ thống khởi động. Specialist phải được tạo **thủ công** bởi Admin qua hệ thống.

**Cách tạo Specialist:**

#### Cách 1: Qua Web UI (Khuyến nghị)
1. Đăng nhập với tài khoản Admin: `admin@admin.com` / `12345678`
2. Vào menu **Quản lý** → **Quản lý Specialist**
3. Click nút **"Tạo Specialist"**
4. Điền thông tin:
   - **Email:** Email của user đã đăng ký (ví dụ: `transcription@transcription.com`)
   - **Specialization:** Chọn loại chuyên gia (TRANSCRIPTION, ARRANGEMENT, RECORDING_ARTIST)
   - **Max Concurrent Tasks:** Số lượng task tối đa (mặc định: 5)
   - **Recording Roles:** (Chỉ khi chọn RECORDING_ARTIST) Chọn VOCALIST và/hoặc INSTRUMENT_PLAYER
5. Click **"Tạo"**

#### Cách 2: Qua API
```bash
POST /admin/specialists
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "email": "transcription@transcription.com",
  "specialization": "TRANSCRIPTION",
  "maxConcurrentTasks": 5
}
```

**Lưu ý:**
- User phải **đã tồn tại** trong hệ thống (đã đăng ký như Customer)
- Hệ thống sẽ tự động update role của user thành `SPECIALIST`
- User có thể đăng nhập ngay sau khi được tạo specialist

**Quyền hạn:**
- Xem và nhận các yêu cầu phù hợp với kỹ năng
- Quản lý dự án được giao
- Nộp sản phẩm và xử lý revision
- Chat với khách hàng
- Quản lý lịch làm việc

---

## 🔑 CÁC ROLE TRONG HỆ THỐNG

| Role | Mã | Mô tả |
|------|-----|-------|
| SYSTEM_ADMIN | `SYSTEM_ADMIN` | Quản trị viên hệ thống |
| MANAGER | `MANAGER` | Quản lý dự án |
| CUSTOMER | `CUSTOMER` | Khách hàng |
| SPECIALIST | `SPECIALIST` | Chuyên gia |

---

## 📝 HƯỚNG DẪN SỬ DỤNG

### Đăng nhập vào hệ thống

1. Truy cập URL: `https://mutrapro.top` (hoặc URL demo)
2. Click vào nút "Đăng nhập"
3. Nhập email và mật khẩu từ bảng trên
4. Click "Đăng nhập"

### Đăng nhập bằng Google OAuth

1. Click vào nút "Đăng nhập bằng Google"
2. Chọn tài khoản Google đã được đăng ký trong hệ thống
3. Hệ thống sẽ tự động đăng nhập

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Mật khẩu mặc định:** Tất cả tài khoản demo có mật khẩu mặc định là `12345678`
2. **Tài khoản tự động tạo:** Các tài khoản này được tự động tạo khi hệ thống khởi động lần đầu (xem `ApplicationInitConfig.java`)
3. **Môi trường demo:** Các tài khoản này chỉ hoạt động trong môi trường demo/testing
4. **Bảo mật:** Không sử dụng các tài khoản này trong môi trường production

---

## 🔄 TẠO TÀI KHOẢN MỚI

### Tạo tài khoản Customer mới:
1. Truy cập trang đăng ký
2. Điền thông tin: Email, Mật khẩu, Họ tên, Số điện thoại
3. Xác thực email (nếu bật)
4. Đăng nhập và sử dụng

### Tạo tài khoản Specialist mới:

**Bước 1:** User đăng ký như Customer
1. Truy cập trang đăng ký
2. Điền thông tin: Email, Mật khẩu, Họ tên, Số điện thoại
3. Xác thực email (nếu bật)
4. Đăng nhập và sử dụng như Customer

**Bước 2:** Admin tạo Specialist từ user đã có
1. Admin đăng nhập với tài khoản `admin@admin.com`
2. Vào **Quản lý** → **Quản lý Specialist**
3. Click **"Tạo Specialist"**
4. Nhập email của user vừa đăng ký
5. Chọn specialization và các thông tin khác
6. Click **"Tạo"**

**Bước 3:** User hoàn thiện hồ sơ Specialist
1. User đăng nhập lại (role đã được update thành SPECIALIST)
2. Vào trang **Hồ sơ Specialist**
3. Cập nhật: Kỹ năng, Portfolio, Experience, v.v.

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề với tài khoản demo, vui lòng liên hệ:
- Email: support@mutrapro.top
- Hoặc tạo issue trong repository

---

**Cập nhật lần cuối:** [Ngày cập nhật]

