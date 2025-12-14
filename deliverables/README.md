# 📦 TÀI LIỆU VÀ SẢN PHẨM ĐỒ ÁN TỐT NGHIỆP
## Hệ thống MuTraPro - Music Transcription and Production System

---

## 📋 MỤC LỤC

1. [Tài liệu](#1-tài-liệu)
2. [Module phần mềm và tài nguyên](#2-module-phần-mềm-và-tài-nguyên)
3. [Source code](#3-source-code)
4. [File dữ liệu, hình ảnh và video](#4-file-dữ-liệu-hình-ảnh-và-video)

---

## 1. TÀI LIỆU

Thư mục: `01_documents/`

### 1.1. Bản chính thức nộp cho Nhà trường
- **Vị trí:** `01_documents/01_official_document/`
- **Nội dung:**
  - Báo cáo đồ án tốt nghiệp (file PDF)
  - Các phụ lục kèm theo

### 1.2. Slides trình chiếu
- **Vị trí:** `01_documents/02_presentation_slides/`
- **Nội dung:**
  - Slides chính thức cho buổi bảo vệ (file PowerPoint/PDF)
  - Slides bổ sung (nếu có)

### 1.3. Video ghi hình
- **Vị trí:** `01_documents/03_installation_video/`
- **Nội dung:**
  - Video quá trình cài đặt sản phẩm
  - Video chạy thử và demo các tính năng

### 1.4. Tài liệu tham khảo
- **Vị trí:** `01_documents/04_references/`
- **Nội dung:**
  - Các tài liệu tham khảo phục vụ cho việc thực hiện dự án

---

## 2. MODULE PHẦN MỀM VÀ TÀI NGUYÊN

Thư mục: `02_modules/`

### 2.1. Database Scripts
- **Vị trí:** `02_modules/01_database_scripts/`
- **Nội dung:**
  - Scripts tạo các table trong database (tham khảo - schema tự động tạo)
  - Scripts tạo dữ liệu demo cho ứng dụng
  - Hướng dẫn chạy scripts

### 2.2. Cấu hình hệ thống
- **Vị trí:** `02_modules/02_configuration/`
- **Nội dung:**
  - **CONFIGURATION.md** - Cấu hình Connection String, API Port, Token
  - **THIRD_PARTY_APIS.md** - Cấu hình sử dụng dịch vụ bên thứ 3 (3rd party API)
  - **DEMO_ACCOUNTS.md** - Danh sách tất cả các Roles, Username/Password của các loại tài khoản đăng nhập vào hệ thống demo

### 2.3. Hướng dẫn cài đặt
- **Vị trí:** `02_modules/03_installation_guide/`
- **Nội dung:**
  - **QUICK_START.md** - Hướng dẫn nhanh cho người mới bắt đầu
  - **INSTALLATION_GUIDE.md** - Hướng dẫn cài đặt toàn bộ hệ thống
  - **THIRD_PARTY_LIBRARIES.md** - Danh sách thư viện, framework, hoặc công cụ của bên thứ 3 được sử dụng trong đề tài

### 2.4. Danh sách modules
- **Vị trí:** `02_modules/04_modules_list/`
- **Nội dung:**
  - **MODULES_OVERVIEW.md** - Tổng quan các module phần mềm được tạo ra trong dự án

---

## 3. SOURCE CODE

Thư mục: `03_source_code/` (hoặc thư mục gốc của dự án)

### 3.1. Cấu trúc
- **Backend Services:** `backend/` (8 microservices)
- **Frontend Web:** `frontend/` (React + Vite)
- **Mobile App:** `mobile/` (React Native + Expo)
- **Docker & Deployment:** `docker/`, `scripts/`

### 3.2. Lưu ý
- Source code đầy đủ nằm ở thư mục gốc của dự án
- Repository: https://github.com/thinhlal/mutrapro-system.git

---

## 4. FILE DỮ LIỆU, HÌNH ẢNH VÀ VIDEO

Thư mục: `04_data/`

### 4.1. Dữ liệu demo
- **Vị trí:** `04_data/01_demo_data/`
- **Nội dung:**
  - Dữ liệu mẫu để demo các tính năng
  - File test cases

### 4.2. Hình ảnh và video demo
- **Vị trí:** `04_data/02_demo_media/`
- **Nội dung:**
  - Screenshots các tính năng
  - Video demo sản phẩm
  - Hình ảnh minh họa

### 4.3. Dữ liệu training (nếu có)
- **Vị trí:** `04_data/03_training_data/`
- **Nội dung:**
  - Dữ liệu/hình ảnh/video phục vụ training mô hình AI (nếu có)

---

## 📝 CHECKLIST NỘP ĐỒ ÁN

Xem file `CHECKLIST.md` để kiểm tra đầy đủ các tài liệu và sản phẩm cần nộp.

---

## 🔗 LIÊN KẾT NHANH

- [Hướng dẫn cài đặt nhanh](02_modules/03_installation_guide/QUICK_START.md)
- [Hướng dẫn cài đặt chi tiết](../../docs/INSTALLATION_GUIDE.md)
- [Cấu hình hệ thống](02_modules/02_configuration/CONFIGURATION.md)
- [Database Scripts](02_modules/01_database_scripts/README.md)
- [Danh sách tài khoản demo](02_modules/02_configuration/DEMO_ACCOUNTS.md)

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **File .env:** 
   - File `env.prod.example` chỉ chứa template với placeholder
   - Bạn cần tạo file `.env` riêng và điền giá trị thực tế
   - **KHÔNG commit file .env vào Git**

2. **Credentials:**
   - Tất cả passwords, API keys, secrets phải được điền vào file `.env`
   - Không sử dụng giá trị trong file `.example` cho production

3. **Database:**
   - Schema được tạo tự động bởi JPA/Hibernate
   - Chỉ cần chạy scripts demo data sau khi schema đã được tạo

---

**Lưu ý:** Tất cả các file trong thư mục này cần được kiểm tra kỹ trước khi nộp đồ án.

