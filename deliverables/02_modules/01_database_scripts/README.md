# 🗄️ DATABASE SCRIPTS

## 📋 TỔNG QUAN

Thư mục này chứa các scripts SQL để tạo dữ liệu demo cho hệ thống MuTraPro.

**⚠️ LƯU Ý:** 
- Database schema được tạo **tự động** bởi JPA/Hibernate khi services khởi động
- Các scripts này chỉ dùng để tạo **dữ liệu demo** (demo data)
- Chạy scripts **SAU KHI** services đã khởi động và tạo schema

---

## 📝 DANH SÁCH SCRIPTS VÀ DATABASE

### 1. Specialist Service Database

**Database:** `specialist_db` (Railway)  
**Connection:** `SPECIALIST_DATASOURCE_URL` trong file `.env`

| Script | File Path | Mô tả |
|--------|-----------|-------|
| Skills Data | `backend/specialist-service/scripts/setup_skills_postgresql.sql` | Tạo dữ liệu skills (Transcription, Arrangement, Recording Artist) |

**Cách chạy:**
```bash
psql -h [specialist-db-host] -p [port] -U postgres -d railway -f backend/specialist-service/scripts/setup_skills_postgresql.sql
```

**Ví dụ:**
```bash
# Lấy thông tin từ file .env
# SPECIALIST_DATASOURCE_URL=jdbc:postgresql://switchyard.proxy.rlwy.net:23349/railway

# Parse: host=switchyard.proxy.rlwy.net, port=23349
psql -h switchyard.proxy.rlwy.net -p 23349 -U postgres -d railway -f backend/specialist-service/scripts/setup_skills_postgresql.sql
```

---

### 2. Project Service Database

**Database:** `project_db` (Railway)  
**Connection:** `PROJECT_DATASOURCE_URL` trong file `.env`

| Script | File Path | Mô tả |
|--------|-----------|-------|
| Equipment Data | `backend/project-service/scripts/insert-equipment-sample-data.sql` | Tạo dữ liệu equipment (Piano, Guitar, Drums, etc.) |
| Studio Data | `backend/project-service/scripts/create_default_studio.sql` | Tạo studio mặc định |

**Cách chạy:**
```bash
# Equipment
psql -h [project-db-host] -p [port] -U postgres -d railway -f backend/project-service/scripts/insert-equipment-sample-data.sql

# Studio
psql -h [project-db-host] -p [port] -U postgres -d railway -f backend/project-service/scripts/create_default_studio.sql
```

**Ví dụ:**
```bash
# Lấy thông tin từ file .env
# PROJECT_DATASOURCE_URL=jdbc:postgresql://shinkansen.proxy.rlwy.net:43102/railway

# Parse: host=shinkansen.proxy.rlwy.net, port=43102
psql -h shinkansen.proxy.rlwy.net -p 43102 -U postgres -d railway -f backend/project-service/scripts/insert-equipment-sample-data.sql
psql -h shinkansen.proxy.rlwy.net -p 43102 -U postgres -d railway -f backend/project-service/scripts/create_default_studio.sql
```

---

### 3. Request Service Database

**Database:** `request_db` (Railway)  
**Connection:** `REQUEST_DATASOURCE_URL` trong file `.env`

| Script | File Path | Mô tả |
|--------|-----------|-------|
| Pricing Matrix | `backend/request-service/scripts/create-pricing-matrix.sql` | Tạo bảng giá dịch vụ (Transcription, Arrangement, Recording) |
| Notation Instruments | `backend/request-service/scripts/insert-notation-instruments.sql` | Tạo dữ liệu notation instruments |

**Cách chạy:**
```bash
# Pricing Matrix
psql -h [request-db-host] -p [port] -U postgres -d railway -f backend/request-service/scripts/create-pricing-matrix.sql

# Notation Instruments
psql -h [request-db-host] -p [port] -U postgres -d railway -f backend/request-service/scripts/insert-notation-instruments.sql
```

**Ví dụ:**
```bash
# Lấy thông tin từ file .env
# REQUEST_DATASOURCE_URL=jdbc:postgresql://maglev.proxy.rlwy.net:23806/railway

# Parse: host=maglev.proxy.rlwy.net, port=23806
psql -h maglev.proxy.rlwy.net -p 23806 -U postgres -d railway -f backend/request-service/scripts/create-pricing-matrix.sql
psql -h maglev.proxy.rlwy.net -p 23806 -U postgres -d railway -f backend/request-service/scripts/insert-notation-instruments.sql
```

---

## 🔄 THỨ TỰ CHẠY SCRIPTS

**Quan trọng:** Chạy theo thứ tự sau:

1. **Skills** (specialist-service) - Cần có trước
2. **Equipment** (project-service) - Có thể map với skills
3. **Pricing Matrix** (request-service)
4. **Studio** (project-service)
5. **Notation Instruments** (request-service)

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Specialist KHÔNG có script

**Specialist KHÔNG được tạo bằng script SQL.** Specialist phải được tạo qua hệ thống:

1. User đăng ký như Customer trước
2. Admin tạo Specialist từ email của user đó qua:
   - Web UI: Menu **Quản lý** → **Quản lý Specialist**
   - API: `POST /admin/specialists`

**Xem hướng dẫn:** [DEMO_ACCOUNTS.md](../02_configuration/DEMO_ACCOUNTS.md#4-specialist-chuyên-gia)

---

## 📚 LẤY THÔNG TIN DATABASE

Thông tin kết nối database được lưu trong file `.env`:

```bash
# Specialist Service Database
SPECIALIST_DATASOURCE_URL=jdbc:postgresql://your-host:your-port/railway
SPECIALIST_DATASOURCE_USERNAME=postgres
SPECIALIST_DATASOURCE_PASSWORD=your_password

# Project Service Database
PROJECT_DATASOURCE_URL=jdbc:postgresql://your-host:your-port/railway
PROJECT_DATASOURCE_USERNAME=postgres
PROJECT_DATASOURCE_PASSWORD=your_password

# Request Service Database
REQUEST_DATASOURCE_URL=jdbc:postgresql://your-host:your-port/railway
REQUEST_DATASOURCE_USERNAME=postgres
REQUEST_DATASOURCE_PASSWORD=your_password
```

**Lưu ý:** Thay `your-host`, `your-port`, `your_password` bằng giá trị thực tế từ Railway dashboard

**Cách parse từ JDBC URL:**
- Format: `jdbc:postgresql://host:port/database`
- Host: Phần trước dấu `:`
- Port: Phần sau dấu `:` và trước dấu `/`
- Database: Phần sau dấu `/` (thường là `railway`)

---

## 📚 TÀI LIỆU THAM KHẢO

- [Cấu hình hệ thống](../02_configuration/CONFIGURATION.md)
- [Tài khoản demo](../02_configuration/DEMO_ACCOUNTS.md)
- [Hướng dẫn cài đặt](../03_installation_guide/INSTALLATION_GUIDE.md)

---

**Cập nhật lần cuối:** [Ngày cập nhật]

