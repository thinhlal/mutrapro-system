# 📦 MODULE PHẦN MỀM VÀ TÀI NGUYÊN

## 📋 TỔNG QUAN

Thư mục này chứa:
- **Database Scripts:** Scripts tạo database và dữ liệu demo
- **Cấu hình hệ thống:** Connection strings, ports, tokens, dịch vụ bên thứ 3
- **Hướng dẫn cài đặt:** Hướng dẫn cài đặt toàn bộ hệ thống
- **Danh sách thư viện:** Các thư viện, framework, công cụ bên thứ 3

---

## 📁 CẤU TRÚC THƯ MỤC

```
02_modules/
├── 01_database_scripts/          # Database scripts
│   ├── 01_create_tables/         # Scripts tạo tables (tham khảo)
│   └── 02_demo_data/            # Scripts tạo dữ liệu demo
├── 02_configuration/             # Cấu hình hệ thống
│   ├── CONFIGURATION.md          # Cấu hình Connection String, Port, Token
│   ├── THIRD_PARTY_APIS.md       # Cấu hình dịch vụ bên thứ 3
│   └── DEMO_ACCOUNTS.md         # Danh sách tài khoản demo
├── 03_installation_guide/        # Hướng dẫn cài đặt
│   ├── INSTALLATION_GUIDE.md    # Hướng dẫn cài đặt chi tiết
│   └── THIRD_PARTY_LIBRARIES.md # Danh sách thư viện, framework
└── 04_modules_list/              # Danh sách các modules
    └── MODULES_OVERVIEW.md       # Tổng quan các modules
└── 05_business_rules/            # Business Rules
    └── BUSINESS_RULES.md         # Tất cả các quy tắc nghiệp vụ
```

---

## 🎯 CÁC MODULE CHÍNH

### Backend Services (8 services)

1. **API Gateway** - Cổng vào hệ thống, routing, authentication
2. **Identity Service** - Xác thực, phân quyền, quản lý người dùng
3. **Project Service** - Quản lý dự án, hợp đồng, milestones, tasks
4. **Billing Service** - Thanh toán, ví điện tử, giao dịch
5. **Request Service** - Tiếp nhận yêu cầu, catalog
6. **Notification Service** - Thông báo, email
7. **Specialist Service** - Quản lý chuyên gia, kỹ năng
8. **Chat Service** - Chat real-time

### Frontend Applications

1. **Web Application** - React + Vite
2. **Mobile Application** - React Native + Expo

### Infrastructure

1. **Docker** - Containerization
2. **Database** - PostgreSQL (Railway)
3. **Cache** - Redis Cloud
4. **Message Broker** - Kafka/Redpanda

---

## 📝 TÀI LIỆU QUAN TRỌNG

### 1. Cấu hình hệ thống
- [CONFIGURATION.md](02_configuration/CONFIGURATION.md) - Connection strings, ports, tokens
- [THIRD_PARTY_APIS.md](02_configuration/THIRD_PARTY_APIS.md) - Dịch vụ bên thứ 3
- [DEMO_ACCOUNTS.md](02_configuration/DEMO_ACCOUNTS.md) - Tài khoản demo

### 2. Hướng dẫn cài đặt
- **[COMPLETE_SETUP_GUIDE.md](03_installation_guide/COMPLETE_SETUP_GUIDE.md)** ⭐ - Hướng dẫn tổng hợp từng bước (Railway + Redis Cloud + Kafka Docker) - **KHUYẾN NGHỊ**
- [INSTALLATION_GUIDE.md](03_installation_guide/INSTALLATION_GUIDE.md) - Hướng dẫn chi tiết
- [DOCKER_MODE_GUIDE.md](03_installation_guide/DOCKER_MODE_GUIDE.md) - Chạy bằng Docker
- [DEVELOPMENT_MODE_GUIDE.md](03_installation_guide/DEVELOPMENT_MODE_GUIDE.md) - Chạy development mode
- [QUICK_START.md](03_installation_guide/QUICK_START.md) - Hướng dẫn nhanh
- [THIRD_PARTY_LIBRARIES.md](03_installation_guide/THIRD_PARTY_LIBRARIES.md) - Thư viện, framework

### 3. Database
- [Database Scripts](01_database_scripts/) - Scripts tạo database và demo data

### 4. Modules
- [MODULES_OVERVIEW.md](04_modules_list/MODULES_OVERVIEW.md) - Tổng quan các modules

### 5. Business Rules
- **[BUSINESS_RULES.md](05_business_rules/BUSINESS_RULES.md)** ⭐ - Tất cả các quy tắc nghiệp vụ (95 rules)

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Database Schema:** Được tạo tự động bởi JPA/Hibernate khi khởi động service
2. **Demo Data:** Cần chạy scripts trong `01_database_scripts/02_demo_data/`
3. **Cấu hình:** Tất cả cấu hình trong `02_configuration/`
4. **Tài khoản demo:** Xem `02_configuration/DEMO_ACCOUNTS.md`

---

## 🚀 BẮT ĐẦU NHANH

### Cho người mới bắt đầu:
1. **Đọc [COMPLETE_SETUP_GUIDE.md](03_installation_guide/COMPLETE_SETUP_GUIDE.md)** - Hướng dẫn tổng hợp từng bước (Railway + Redis Cloud + Kafka Docker)
2. Hoặc [QUICK_START.md](03_installation_guide/QUICK_START.md) - Hướng dẫn nhanh
3. Làm theo checklist và các bước cài đặt

### Cho người đã có kinh nghiệm:
1. **Đọc [COMPLETE_SETUP_GUIDE.md](03_installation_guide/COMPLETE_SETUP_GUIDE.md)** - Hướng dẫn tổng hợp (Railway + Redis Cloud + Kafka Docker)
2. Hoặc [INSTALLATION_GUIDE.md](03_installation_guide/INSTALLATION_GUIDE.md) - Hướng dẫn chi tiết
3. Cấu hình file `.env` theo [CONFIGURATION.md](02_configuration/CONFIGURATION.md)
4. Chạy scripts demo data trong `01_database_scripts/`
5. Đăng nhập với tài khoản trong [DEMO_ACCOUNTS.md](02_configuration/DEMO_ACCOUNTS.md)

---

**Cập nhật lần cuối:** [Ngày cập nhật]

