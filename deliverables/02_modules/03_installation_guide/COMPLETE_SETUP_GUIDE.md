# 📖 HƯỚNG DẪN CÀI ĐẶT TOÀN BỘ HỆ THỐNG MUTRAPRO

## 📋 TỔNG QUAN

Hướng dẫn này hướng dẫn cài đặt toàn bộ hệ thống MuTraPro với cấu hình:
- **Database:** Railway PostgreSQL (7 instances)
- **Cache:** Redis Cloud
- **Message Broker:** Kafka/Redpanda (Docker)
- **Backend:** Docker containers
- **Frontend:** npm run dev hoặc Docker

**Đảm bảo:** Sau khi làm theo hướng dẫn này, bạn có thể cài đặt và chạy toàn bộ hệ thống với các phần mềm đã nộp.

---

## 🎯 YÊU CẦU HỆ THỐNG

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10+, macOS 10.15+, Ubuntu 20.04+ |
| **Java** | JDK 21+ (để build Docker images) |
| **Node.js** | 18+ (cho Frontend) |
| **Docker** | 20.10+ |
| **Docker Compose** | 2.0+ |
| **Git** | Latest |
| **RAM** | Tối thiểu 8GB (khuyến nghị 16GB) |

---

## 📦 BƯỚC 1: CLONE REPOSITORY

```bash
git clone <repository-url>
cd mutrapro-system
```

---

## 🔧 BƯỚC 2: CÀI ĐẶT PREREQUISITES

### 2.1. Cài đặt Docker và Docker Compose

**Windows/macOS:**
- Download Docker Desktop: https://www.docker.com/products/docker-desktop
- Cài đặt và khởi động Docker Desktop

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

**Kiểm tra:**
```bash
docker --version
docker compose version
```

### 2.2. Cài đặt Java JDK 21

**Windows:** Download từ https://adoptium.net/

**macOS:**
```bash
brew install openjdk@21
```

**Linux:**
```bash
sudo apt update
sudo apt install openjdk-21-jdk
```

**Kiểm tra:**
```bash
java -version  # phải >= 21
```

### 2.3. Cài đặt Node.js

**Download từ:** https://nodejs.org/ (chọn LTS version)

**Kiểm tra:**
```bash
node --version  # >= 18
npm --version
```

---

## 🗄️ BƯỚC 3: SETUP RAILWAY DATABASES

### 3.1. Đăng ký Railway

1. Truy cập https://railway.app
2. Đăng ký bằng GitHub hoặc Email
3. Xác thực email và thêm payment method (Railway có $5 free credit/tháng)

### 3.2. Tạo 7 PostgreSQL Databases

1. Trong Railway dashboard, click **"New Project"**
2. Tạo 7 PostgreSQL instances:
   - Click **"New"** → **"Database"** → **"PostgreSQL"** (7 lần)
   - Đặt tên: `identity-db`, `project-db`, `billing-db`, `request-db`, `notification-db`, `specialist-db`, `chat-db`

### 3.3. Lấy Connection Strings

Với mỗi database:
1. Click vào PostgreSQL service
2. Vào tab **"Variables"**
3. Copy các giá trị: `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`

**Lưu ý:** Convert `DATABASE_URL` sang JDBC format:
- Railway format: `postgresql://user:pass@host:port/database`
- JDBC format: `jdbc:postgresql://host:port/database`
- Ví dụ: `postgresql://postgres:pass@switchyard.proxy.rlwy.net:23349/railway`
  → JDBC: `jdbc:postgresql://switchyard.proxy.rlwy.net:23349/railway`

**Chi tiết:** Xem [RAILWAY_DATABASE_SETUP.md](../../../docs/deployment/RAILWAY_DATABASE_SETUP.md)

---

## 🔴 BƯỚC 4: SETUP REDIS CLOUD

### 4.1. Đăng ký Redis Cloud

1. Truy cập https://redis.com/cloud
2. Đăng ký tài khoản (có free tier)
3. Tạo database mới

### 4.2. Lấy Connection Info

1. Vào database dashboard
2. Copy các giá trị:
   - `REDIS_HOST` (ví dụ: `redis-11105.c292.ap-southeast-1-1.ec2.redns.redis-cloud.com`)
   - `REDIS_PORT` (ví dụ: `11105`)
   - `REDIS_PASSWORD`

---

## ⚙️ BƯỚC 5: CẤU HÌNH ENVIRONMENT VARIABLES

### 5.1. Copy file mẫu

```bash
cp env.example .env
```

### 5.2. Cấu hình Database URLs (Railway)

Mở file `.env` và điền các giá trị từ Railway (Bước 3):

```bash
# Identity Service Database
IDENTITY_DATASOURCE_URL=jdbc:postgresql://your-railway-host:5432/railway
IDENTITY_DATASOURCE_USERNAME=postgres
IDENTITY_DATASOURCE_PASSWORD=your_railway_password

# Project Service Database
PROJECT_DATASOURCE_URL=jdbc:postgresql://your-railway-host:5432/railway
PROJECT_DATASOURCE_USERNAME=postgres
PROJECT_DATASOURCE_PASSWORD=your_railway_password

# Billing Service Database
BILLING_DATASOURCE_URL=jdbc:postgresql://your-railway-host:5432/railway
BILLING_DATASOURCE_USERNAME=postgres
BILLING_DATASOURCE_PASSWORD=your_railway_password

# Request Service Database
REQUEST_DATASOURCE_URL=jdbc:postgresql://your-railway-host:5432/railway
REQUEST_DATASOURCE_USERNAME=postgres
REQUEST_DATASOURCE_PASSWORD=your_railway_password

# Notification Service Database
NOTIFICATION_DATASOURCE_URL=jdbc:postgresql://your-railway-host:5432/railway
NOTIFICATION_DATASOURCE_USERNAME=postgres
NOTIFICATION_DATASOURCE_PASSWORD=your_railway_password

# Specialist Service Database
SPECIALIST_DATASOURCE_URL=jdbc:postgresql://your-railway-host:5432/railway
SPECIALIST_DATASOURCE_USERNAME=postgres
SPECIALIST_DATASOURCE_PASSWORD=your_railway_password

# Chat Service Database
CHAT_DATASOURCE_URL=jdbc:postgresql://your-railway-host:5432/railway
CHAT_DATASOURCE_USERNAME=postgres
CHAT_DATASOURCE_PASSWORD=your_railway_password
```

**Lưu ý:** Mỗi service có database riêng trên Railway, URL có thể khác nhau.

### 5.3. Cấu hình Redis Cloud

```bash
REDIS_HOST=your-redis-host.redis.cloud
REDIS_PORT=11105
REDIS_PASSWORD=your_redis_password
```

### 5.4. Cấu hình Kafka (Docker)

```bash
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
```

**Lưu ý:** Kafka sẽ chạy trong Docker container, dùng `localhost:9092` từ host machine.

### 5.5. Cấu hình JWT Secret

```bash
JWT_SECRET=QVHfEyXEd7KG4eUfYAWOUvuPjlufU3vImJ0MEialEhHoQPjB6wZTL6Ma9XLnKaYn
```

**Hoặc generate mới:**
```bash
# Linux/macOS
openssl rand -base64 64

# Windows PowerShell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 5.6. Cấu hình AWS S3

1. Đăng ký AWS: https://aws.amazon.com
2. Tạo S3 bucket trong region `ap-southeast-1`
3. Tạo IAM user với quyền S3
4. Tạo Access Key

```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET=mutrapro-dev-files
AWS_REGION=ap-southeast-1
```

### 5.7. Cấu hình Email (Gmail SMTP)

1. Vào Google Account → Security
2. Bật 2-Step Verification
3. Tạo App Password: Security → 2-Step Verification → App Passwords
4. Select app: "Mail"
5. Copy App Password (16 ký tự)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM=your_email@gmail.com
```

### 5.8. Cấu hình Google OAuth (Tùy chọn)

1. Vào Google Cloud Console: https://console.cloud.google.com
2. Tạo OAuth 2.0 Client ID
3. Copy Client ID và Client Secret

```bash
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 5.9. Cấu hình Payment Gateway (Tùy chọn)

```bash
SEPAY_API_KEY=your_sepay_api_key
SEPAY_ACCOUNT_NUMBER=your_account_number
SEPAY_BANK_CODE=your_bank_code
```

### 5.10. Cấu hình Docker Hub Username

```bash
DOCKER_HUB_USERNAME=your-dockerhub-username
```

**Lưu ý:** 
- Thay `your-dockerhub-username` bằng Docker Hub username của bạn
- Nếu không có, có thể dùng giá trị mặc định: `mutrapro`

**Xem chi tiết:** [CONFIGURATION.md](../02_configuration/CONFIGURATION.md)

---

## 🏗️ BƯỚC 6: CẤU HÌNH DOCKER HUB

### 6.1. Cấu hình Docker Hub username trong `.env`

Mở file `.env` và thêm:

```bash
DOCKER_HUB_USERNAME=your-dockerhub-username
```

**Lưu ý:** 
- Thay `your-dockerhub-username` bằng Docker Hub username của bạn
- Nếu không có, có thể dùng giá trị mặc định: `mutrapro`

### 6.2. Đăng nhập Docker Hub (nếu cần)

```bash
docker login
```

**Lưu ý:** 
- Chỉ cần đăng nhập nếu images là private
- Nếu images là public, có thể bỏ qua bước này

---

## 🏗️ BƯỚC 7: PULL DOCKER IMAGES TỪ DOCKER HUB

### 7.1. Pull tất cả images

```bash
docker compose -f docker-compose.prod.hub.yml pull
```

**Lưu ý:** 
- Lần đầu pull có thể mất 5-10 phút tùy tốc độ mạng
- Images sẽ được cache, lần sau nhanh hơn
- Nếu images chưa có trên Docker Hub, bạn cần build và push trước (xem scripts/build-and-push.sh)

### 7.2. Kiểm tra images đã pull

```bash
docker images | grep mutrapro
```

**Kết quả mong đợi:** Phải thấy các images:
- `mutrapro/api-gateway:latest`
- `mutrapro/identity-service:latest`
- `mutrapro/project-service:latest`
- `mutrapro/billing-service:latest`
- `mutrapro/request-service:latest`
- `mutrapro/notification-service:latest`
- `mutrapro/specialist-service:latest`
- `mutrapro/chat-service:latest`

---

## 🐳 BƯỚC 8: START KAFKA (DOCKER)

### 8.1. Start Kafka container

```bash
docker compose -f docker-compose.prod.hub.yml up -d kafka
```

**Lưu ý:** Kafka sử dụng Redpanda (Kafka-compatible) chạy trong Docker container.

### 8.2. Kiểm tra Kafka đang chạy

```bash
docker compose -f docker-compose.prod.hub.yml ps kafka
```

---

## 🚀 BƯỚC 9: START BACKEND SERVICES (DOCKER)

### 9.1. Start tất cả backend services

**Nếu dùng `docker-compose.yml` (khuyến nghị):**
```bash
docker compose up -d
```

**Nếu dùng `docker-compose.prod.hub.yml`:**
```bash
docker compose -f docker-compose.prod.hub.yml up -d
```

**Lưu ý:** 
- Services sẽ kết nối đến Railway PostgreSQL (đã cấu hình trong `.env`)
- Services sẽ kết nối đến Redis Cloud (đã cấu hình trong `.env`)
- Services sẽ kết nối đến Kafka container (localhost:9092)

**Lưu ý:** 
- Services sẽ kết nối đến Railway PostgreSQL (đã cấu hình trong `.env`)
- Services sẽ kết nối đến Redis Cloud (đã cấu hình trong `.env`)
- Services sẽ kết nối đến Kafka container (localhost:9092)

### 9.2. Kiểm tra services đang chạy

**Nếu dùng `docker-compose.yml`:**
```bash
docker compose ps
```

**Nếu dùng `docker-compose.prod.hub.yml`:**
```bash
docker compose -f docker-compose.prod.hub.yml ps
```

**Kết quả mong đợi:**
```
NAME                              STATUS
mutrapro-system-kafka-1          Up
mutrapro-system-api-gateway-1    Up
mutrapro-system-identity-service-1    Up
mutrapro-system-project-service-1     Up
mutrapro-system-billing-service-1     Up
mutrapro-system-request-service-1     Up
mutrapro-system-notification-service-1 Up
mutrapro-system-specialist-service-1  Up
mutrapro-system-chat-service-1        Up
```

### 9.3. Kiểm tra logs

```bash
# Xem logs của tất cả services
docker compose -f docker-compose.prod.hub.yml logs -f

# Xem logs của một service cụ thể
docker compose -f docker-compose.prod.hub.yml logs -f identity-service
```

### 9.4. Kiểm tra health endpoints

```bash
# API Gateway
curl http://localhost:8080/actuator/health

# Identity Service
curl http://localhost:8081/actuator/health

# Project Service
curl http://localhost:8082/actuator/health

# Billing Service
curl http://localhost:8083/actuator/health

# Request Service
curl http://localhost:8084/actuator/health

# Notification Service
curl http://localhost:8085/actuator/health

# Specialist Service
curl http://localhost:8086/actuator/health

# Chat Service
curl http://localhost:8088/actuator/health
```

**Kết quả mong đợi:** `{"status":"UP"}`

---

## 📊 BƯỚC 10: CHẠY DEMO DATA SCRIPTS

Sau khi services đã khởi động và tạo schema tự động, chạy các scripts demo data để có dữ liệu demo cho ứng dụng.

**⚠️ LƯU Ý:** 
- Database schema được tạo **tự động** bởi JPA/Hibernate khi services khởi động
- Các scripts này chỉ dùng để tạo **dữ liệu demo** (demo data)
- Chạy scripts **SAU KHI** services đã khởi động và tạo schema

### 10.1. Kết nối Database trong pgAdmin

1. **Mở pgAdmin** (hoặc công cụ quản lý PostgreSQL khác)
2. **Kết nối đến Railway Database:**
   - Lấy thông tin từ file `.env`:
     - `SPECIALIST_DATASOURCE_URL=jdbc:postgresql://host:port/railway`
     - `PROJECT_DATASOURCE_URL=jdbc:postgresql://host:port/railway`
     - `REQUEST_DATASOURCE_URL=jdbc:postgresql://host:port/railway`
   - Parse JDBC URL để lấy Host, Port, Database, Username, Password
   - Tạo connection trong pgAdmin với thông tin trên

### 10.2. Chạy Scripts Demo Data

**Thứ tự chạy scripts (quan trọng):**

1. **Skills Data** (Specialist Service) - Cần có trước
2. **Equipment Data** (Project Service)
3. **Pricing Matrix** (Request Service)
4. **Studio Data** (Project Service)
5. **Notation Instruments** (Request Service)

#### 10.2.1. Skills Data (Specialist Service Database)

**File Script:** `backend/specialist-service/scripts/setup_skills_postgresql.sql`

**Cách chạy:**
1. Mở file `backend/specialist-service/scripts/setup_skills_postgresql.sql`
2. Copy toàn bộ nội dung SQL
3. Trong pgAdmin, kết nối đến **Specialist Service Database** (từ `SPECIALIST_DATASOURCE_URL`)
4. Mở Query Tool (Tools → Query Tool)
5. Paste nội dung SQL đã copy
6. Click **Execute** (F5) để chạy

#### 10.2.2. Equipment Data (Project Service Database)

**File Script:** `backend/project-service/scripts/insert-equipment-sample-data.sql`

**Cách chạy:**
1. Mở file `backend/project-service/scripts/insert-equipment-sample-data.sql`
2. Copy toàn bộ nội dung SQL
3. Trong pgAdmin, kết nối đến **Project Service Database** (từ `PROJECT_DATASOURCE_URL`)
4. Mở Query Tool
5. Paste nội dung SQL đã copy
6. Click **Execute** (F5) để chạy

#### 10.2.3. Studio Data (Project Service Database)

**File Script:** `backend/project-service/scripts/create_default_studio.sql`

**Cách chạy:**
1. Mở file `backend/project-service/scripts/create_default_studio.sql`
2. Copy toàn bộ nội dung SQL
3. Trong pgAdmin, kết nối đến **Project Service Database** (từ `PROJECT_DATASOURCE_URL`)
4. Mở Query Tool
5. Paste nội dung SQL đã copy
6. Click **Execute** (F5) để chạy

#### 10.2.4. Pricing Matrix (Request Service Database)

**File Script:** `backend/request-service/scripts/create-pricing-matrix.sql`

**Cách chạy:**
1. Mở file `backend/request-service/scripts/create-pricing-matrix.sql`
2. Copy toàn bộ nội dung SQL
3. Trong pgAdmin, kết nối đến **Request Service Database** (từ `REQUEST_DATASOURCE_URL`)
4. Mở Query Tool
5. Paste nội dung SQL đã copy
6. Click **Execute** (F5) để chạy

#### 10.2.5. Notation Instruments (Request Service Database)

**File Script:** `backend/request-service/scripts/insert-notation-instruments.sql`

**Cách chạy:**
1. Mở file `backend/request-service/scripts/insert-notation-instruments.sql`
2. Copy toàn bộ nội dung SQL
3. Trong pgAdmin, kết nối đến **Request Service Database** (từ `REQUEST_DATASOURCE_URL`)
4. Mở Query Tool
5. Paste nội dung SQL đã copy
6. Click **Execute** (F5) để chạy

### 10.3. Kiểm tra Demo Data đã được tạo

Trong pgAdmin, chạy các query sau để kiểm tra:

**Kiểm tra Skills:**
```sql
SELECT * FROM skills;
```

**Kiểm tra Equipment:**
```sql
SELECT * FROM equipment;
```

**Kiểm tra Pricing Matrix:**
```sql
SELECT * FROM pricing_matrix;
```

**Kiểm tra Studio:**
```sql
SELECT * FROM studio;
```

**Kiểm tra Notation Instruments:**
```sql
SELECT * FROM notation_instruments;
```

### 10.4. Lưu ý về Specialist

**Specialist KHÔNG được tạo bằng script SQL.**

Specialist phải được tạo qua hệ thống:
1. User đăng ký như Customer trước
2. Admin tạo Specialist từ email của user đó qua:
   - Web UI: Menu **Quản lý** → **Quản lý Specialist**
   - API: `POST /admin/specialists`

**Xem hướng dẫn:** [DEMO_ACCOUNTS.md](../02_configuration/DEMO_ACCOUNTS.md#4-specialist-chuyên-gia)

**Xem chi tiết:** [Database Scripts README](../01_database_scripts/README.md)

---

## 🎨 BƯỚC 11: START FRONTEND

### 11.1. Cài đặt dependencies

```bash
cd frontend
npm install
```

### 11.2. Cấu hình Frontend .env

```bash
# Copy file mẫu
cp env.example .env
```

**Mở `frontend/.env` và cấu hình:**
```bash
# Backend API Gateway
VITE_API_BACK_END_ENDPOINT=http://localhost:8080
VITE_API_PREFIX=/api/v1
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080

# Frontend URL
VITE_FRONTEND_URL=http://localhost:5173

# Google OAuth (nếu có)
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Contract info
VITE_PARTY_A_NAME=MuTraPro Studio Co., Ltd
VITE_PARTY_A_ADDRESS=123 Music Street, Ho Chi Minh City, Vietnam

# Third-party services (nếu có)
VITE_KLANG_API_KEY=your_klang_api_key
VITE_FLAT_APP_ID=your_flat_app_id
```

### 11.3. Start development server

```bash
npm run dev
```

**Kết quả:**
```
VITE v5.4.10 ready in 4586 ms
➜  Local:   http://localhost:5173/
```

### 11.4. Truy cập Frontend

Mở browser: **http://localhost:5173**

---

## ✅ BƯỚC 12: KIỂM TRA HỆ THỐNG

### 12.1. Đăng nhập test

1. Truy cập http://localhost:5173
2. Đăng nhập với một trong các tài khoản sau:

**Xem đầy đủ danh sách:** [DEMO_ACCOUNTS.md](../02_configuration/DEMO_ACCOUNTS.md)

#### Tài khoản Demo:

| Role | Email | Password |
|------|-------|----------|
| **SYSTEM_ADMIN** | `admin@admin.com` | `12345678` |
| **MANAGER** | `manager@manager.com` | `12345678` |
| **CUSTOMER** (Transcription) | `transcription@transcription.com` | `12345678` |
| **CUSTOMER** (Arrangement) | `arrangement@arrangement.com` | `12345678` |
| **CUSTOMER** (Recording) | `recording@recording.com` | `12345678` |

#### ⚠️ Tạo Specialist (Chuyên gia)

**QUAN TRỌNG:** Specialist **KHÔNG** được tạo tự động khi hệ thống khởi động. Specialist phải được tạo **thủ công** bởi Admin.

**Cách tạo Specialist:**

1. **Đăng nhập với tài khoản Admin:**
   - Email: `admin@admin.com`
   - Password: `12345678`

2. **Vào menu Quản lý Specialist:**
   - Click menu **Quản lý** → **Quản lý Specialist**

3. **Tạo Specialist mới:**
   - Click nút **"Tạo Specialist"** hoặc **"Add Specialist"**
   - Điền thông tin:
     - **Email:** Email của user đã đăng ký (ví dụ: `transcription@transcription.com`)
     - **Specialization:** Chọn loại chuyên gia:
       - `TRANSCRIPTION` - Chuyên gia ký âm
       - `ARRANGEMENT` - Chuyên gia phối khí
       - `RECORDING_ARTIST` - Nghệ sĩ thu âm
     - **Max Concurrent Tasks:** Số lượng task tối đa (mặc định: 5)
     - **Recording Roles:** (Chỉ khi chọn RECORDING_ARTIST)
       - `VOCALIST` - Ca sĩ
       - `INSTRUMENT_PLAYER` - Nhạc công
   - Click **"Tạo"** hoặc **"Save"**

4. **Kiểm tra Specialist đã được tạo:**
   - Specialist sẽ xuất hiện trong danh sách
   - User có thể đăng nhập và nhận task assignment

**Lưu ý:** 
- User phải đăng ký như Customer trước (hoặc đã có tài khoản trong hệ thống)
- Admin chỉ có thể tạo Specialist từ email của user đã tồn tại
- Một user có thể có nhiều Specializations (ví dụ: vừa là TRANSCRIPTION vừa là ARRANGEMENT)

**Xem hướng dẫn chi tiết:** [DEMO_ACCOUNTS.md](../02_configuration/DEMO_ACCOUNTS.md#4-specialist-chuyên-gia)

### 12.2. Kiểm tra các tính năng

- ✅ Đăng nhập/Đăng ký
- ✅ Tạo service request (Transcription, Arrangement, Recording)
- ✅ Xem contracts
- ✅ Upload files
- ✅ Chat (nếu có)
- ✅ Payment (nếu có)

---

## 🔧 TROUBLESHOOTING

### Lỗi: "Cannot connect to database"

**Giải pháp:**
1. Kiểm tra Railway database đang chạy
2. Kiểm tra connection string trong `.env`
3. Kiểm tra firewall/network

### Lỗi: "Cannot connect to Redis"

**Giải pháp:**
1. Kiểm tra Redis Cloud database đang active
2. Kiểm tra `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` trong `.env`
3. Kiểm tra network connectivity

### Lỗi: "Port already in use"

**Giải pháp:**
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :8080
kill -9 <PID>
```

### Lỗi: "Docker daemon not running"

**Giải pháp:** Khởi động Docker Desktop

### Lỗi: "Schema không được tạo tự động"

**Giải pháp:**
1. Kiểm tra logs: `docker compose -f docker-compose.prod.hub.yml logs identity-service`
2. Kiểm tra database connection trong `.env`
3. Restart service: `docker compose -f docker-compose.prod.hub.yml restart identity-service`

### Lỗi: "Image not found" hoặc "pull access denied"

**Giải pháp:**
1. Kiểm tra `DOCKER_HUB_USERNAME` trong `.env` đã đúng chưa
2. Đăng nhập Docker Hub: `docker login`
3. Pull lại images: `docker compose -f docker-compose.prod.hub.yml pull`
4. Nếu images chưa có trên Docker Hub, bạn cần build và push trước

---

## 🛑 DỪNG HỆ THỐNG

### Dừng tất cả services

```bash
docker compose -f docker-compose.prod.hub.yml down
```

### Dừng một service cụ thể

```bash
docker compose -f docker-compose.prod.hub.yml stop identity-service
```

---

## 🔄 RESTART HỆ THỐNG

### Restart tất cả services

```bash
docker compose -f docker-compose.prod.hub.yml restart
```

### Restart một service cụ thể

```bash
docker compose -f docker-compose.prod.hub.yml restart identity-service
```

---

## 📊 XEM LOGS

### Xem logs tất cả services

```bash
docker compose -f docker-compose.prod.hub.yml logs -f
```

### Xem logs một service

```bash
docker compose -f docker-compose.prod.hub.yml logs -f identity-service
```

---

## 📚 TÀI LIỆU THAM KHẢO

### Module phần mềm
- [MODULES_OVERVIEW.md](../04_modules_list/MODULES_OVERVIEW.md) - Tổng quan các module được tạo ra trong dự án

### Cấu hình
- [CONFIGURATION.md](../02_configuration/CONFIGURATION.md) - Cấu hình Connection String, API Port, Token
- [THIRD_PARTY_APIS.md](../02_configuration/THIRD_PARTY_APIS.md) - Cấu hình dịch vụ bên thứ 3 (3rd party API)

### Tài khoản demo
- [DEMO_ACCOUNTS.md](../02_configuration/DEMO_ACCOUNTS.md) - Danh sách tất cả Roles, Username/Password

### Thư viện, framework
- [THIRD_PARTY_LIBRARIES.md](./THIRD_PARTY_LIBRARIES.md) - Danh sách thư viện, framework, công cụ bên thứ 3

### Database
- [Database Scripts README](../01_database_scripts/README.md) - Scripts tạo database và demo data

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **File .env:**
   - File `env.example` chỉ chứa template với placeholder
   - Bạn cần tạo file `.env` riêng và điền giá trị thực tế
   - **KHÔNG commit file .env vào Git**

2. **Credentials:**
   - Tất cả passwords, API keys, secrets phải được điền vào file `.env`
   - Không sử dụng giá trị trong file `.example` cho production

3. **Database:**
   - Schema được tạo tự động bởi JPA/Hibernate khi service khởi động
   - Chỉ cần chạy scripts demo data sau khi schema đã được tạo

4. **Tài khoản demo:**
   - Mật khẩu mặc định: `12345678`
   - Tất cả tài khoản được tạo tự động khi hệ thống khởi động lần đầu
   - Specialist phải được tạo thủ công bởi Admin

---

## 🎯 CHECKLIST HOÀN THÀNH

- [ ] Cài đặt Docker và Docker Compose
- [ ] Cài đặt Java JDK 21
- [ ] Cài đặt Node.js 18+
- [ ] Setup Railway (7 PostgreSQL databases)
- [ ] Setup Redis Cloud
- [ ] Cấu hình `.env` với tất cả credentials
- [ ] Cấu hình Docker Hub username trong `.env`: `DOCKER_HUB_USERNAME=your-username`
- [ ] Đăng nhập Docker Hub: `docker login` (nếu cần)
- [ ] Pull Docker images: `docker compose -f docker-compose.prod.hub.yml pull`
- [ ] Start Kafka: `docker compose -f docker-compose.prod.hub.yml up -d kafka`
- [ ] Start Backend: `docker compose -f docker-compose.prod.hub.yml up -d`
- [ ] **Chạy demo data scripts:**
  - [ ] Skills Data (Specialist Service)
  - [ ] Equipment Data (Project Service)
  - [ ] Studio Data (Project Service)
  - [ ] Pricing Matrix (Request Service)
  - [ ] Notation Instruments (Request Service)
- [ ] Start Frontend: `cd frontend && npm run dev`
- [ ] Truy cập http://localhost:5173
- [ ] Đăng nhập với tài khoản demo
- [ ] Kiểm tra các tính năng hoạt động

---

## 📝 TÓM TẮT CÁC BƯỚC

1. ✅ **Cài đặt:** Docker, Java, Node.js
2. ✅ **Setup Railway:** Tạo 7 PostgreSQL databases, lấy connection strings
3. ✅ **Setup Redis Cloud:** Tạo database, lấy connection info
4. ✅ **Cấu hình:** Điền tất cả credentials vào `.env` (bao gồm `DOCKER_HUB_USERNAME`)
5. ✅ **Pull Docker images:** `docker compose -f docker-compose.prod.hub.yml pull`
6. ✅ **Start Kafka:** `docker compose -f docker-compose.prod.hub.yml up -d kafka`
7. ✅ **Start Backend:** `docker compose -f docker-compose.prod.hub.yml up -d`
8. ✅ **Demo Data:** Chạy SQL scripts (Skills, Equipment, Studio, Pricing Matrix, Notation Instruments)
9. ✅ **Start Frontend:** `cd frontend && npm run dev`
10. ✅ **Test:** Đăng nhập và kiểm tra hệ thống

---

**Cập nhật lần cuối:** [Ngày cập nhật]

**Đảm bảo:** Sau khi làm theo hướng dẫn này, bạn có thể cài đặt và chạy toàn bộ hệ thống với các phần mềm đã nộp.

