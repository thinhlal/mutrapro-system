# 📖 HƯỚNG DẪN CÀI ĐẶT HỆ THỐNG MUTRAPRO

## 📋 TỔNG QUAN

Hướng dẫn này sẽ giúp bạn cài đặt và chạy toàn bộ hệ thống MuTraPro từ đầu.

**⚠️ LƯU Ý:** 
- Nếu bạn là người mới bắt đầu, chưa biết gì về hệ thống, hãy đọc [QUICK_START.md](./QUICK_START.md) trước
- File này là hướng dẫn chi tiết, phù hợp cho người đã có kinh nghiệm

---

## 🎯 YÊU CẦU HỆ THỐNG

### Development Environment

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10+, macOS 10.15+, Ubuntu 20.04+ |
| **Java** | JDK 21+ |
| **Node.js** | 18+ |
| **Docker** | 20.10+ |
| **Docker Compose** | 2.0+ |
| **Maven** | 3.8+ (hoặc dùng Maven Wrapper) |
| **Git** | Latest |

### Production Environment

Xem chi tiết tại: [INSTALLATION_GUIDE.md](../../../docs/INSTALLATION_GUIDE.md)

---

## 📦 BƯỚC 1: CLONE REPOSITORY

```bash
# Thay <repository-url> bằng URL thực tế của repository
git clone <repository-url>
cd mutrapro-system
```

**Lưu ý:** Nếu chưa có repository URL, bạn có thể:
- Tạo repository mới trên GitHub/GitLab
- Hoặc sử dụng code đã có sẵn trong thư mục dự án

---

## 🔧 BƯỚC 2: CÀI ĐẶT PREREQUISITES

### 2.1. Cài đặt Java JDK 21

**Windows:**
- Download từ [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) hoặc [OpenJDK](https://adoptium.net/)
- Set `JAVA_HOME` environment variable

**macOS:**
```bash
brew install openjdk@21
```

**Linux:**
```bash
sudo apt update
sudo apt install openjdk-21-jdk
```

### 2.2. Cài đặt Node.js và npm

**Download từ:** https://nodejs.org/

**Kiểm tra:**
```bash
node --version  # >= 18
npm --version
```

### 2.3. Cài đặt Docker và Docker Compose

**Windows/macOS:** Download Docker Desktop từ https://www.docker.com/products/docker-desktop

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

### 2.4. Cài đặt PostgreSQL Client (psql)

**Cần thiết để chạy SQL scripts demo data**

**Windows:**
- Download từ https://www.postgresql.org/download/windows/
- Hoặc cài qua Chocolatey: `choco install postgresql`

**macOS:**
```bash
brew install postgresql
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql-client
```

**Kiểm tra:**
```bash
psql --version
```

---

## 🗄️ BƯỚC 3: SETUP DATABASE

### 3.1. Tạo Railway Databases

1. **Đăng ký tài khoản:**
   - Truy cập https://railway.app
   - Đăng ký bằng GitHub hoặc Email
   - Xác thực email và thêm payment method (Railway có $5 free credit/tháng)

2. **Tạo 7 PostgreSQL instances:**
   - Trong Railway dashboard, click **"New Project"**
   - Với mỗi service, click **"New"** → **"Database"** → **"PostgreSQL"**
   - Đặt tên cho mỗi database (ví dụ: `identity-db`, `project-db`, etc.)
   - Lặp lại 7 lần cho 7 services

3. **Lấy connection strings:**
   - Click vào từng PostgreSQL service
   - Vào tab **"Variables"**
   - Copy các giá trị: `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`

**Chi tiết:** Xem [RAILWAY_DATABASE_SETUP.md](../../../docs/deployment/RAILWAY_DATABASE_SETUP.md)

**Lưu ý:** 
- Railway cung cấp connection string dạng: `postgresql://user:pass@host:port/database`
- Cần convert sang JDBC format: `jdbc:postgresql://host:port/database`
- Ví dụ: `postgresql://postgres:pass@switchyard.proxy.rlwy.net:23349/railway`
  → JDBC: `jdbc:postgresql://switchyard.proxy.rlwy.net:23349/railway`

### 3.2. Tạo dữ liệu demo

Sau khi services khởi động và tạo schema tự động, chạy các scripts demo data.

**Xem chi tiết:** [Database Scripts README](../../01_database_scripts/README.md)

**Tóm tắt:**

1. **Specialist Service Database** (`SPECIALIST_DATASOURCE_URL`):
   - `backend/specialist-service/scripts/setup_skills_postgresql.sql` - Skills data

2. **Project Service Database** (`PROJECT_DATASOURCE_URL`):
   - `backend/project-service/scripts/insert-equipment-sample-data.sql` - Equipment data
   - `backend/project-service/scripts/create_default_studio.sql` - Studio data

3. **Request Service Database** (`REQUEST_DATASOURCE_URL`):
   - `backend/request-service/scripts/create-pricing-matrix.sql` - Pricing matrix
   - `backend/request-service/scripts/insert-notation-instruments.sql` - Notation instruments

**Cách parse JDBC URL để lấy host và port:**
- JDBC URL format: `jdbc:postgresql://host:port/database`
- Ví dụ: `jdbc:postgresql://switchyard.proxy.rlwy.net:23349/railway`
  - Host: `switchyard.proxy.rlwy.net`
  - Port: `23349`
  - Database: `railway`

**Ví dụ chạy script:**
```bash
# Lấy thông tin từ file .env
# SPECIALIST_DATASOURCE_URL=jdbc:postgresql://your-host:your-port/railway
# SPECIALIST_DATASOURCE_USERNAME=postgres
# SPECIALIST_DATASOURCE_PASSWORD=your_password

# Parse JDBC URL: jdbc:postgresql://host:port/database
# Ví dụ: jdbc:postgresql://switchyard.proxy.rlwy.net:23349/railway
# → host=switchyard.proxy.rlwy.net, port=23349

# Chạy script skills (Windows cần set PGPASSWORD)
set PGPASSWORD=your_password  # Windows
export PGPASSWORD=your_password  # Linux/macOS

psql -h your-host -p your-port -U postgres -d railway -f backend/specialist-service/scripts/setup_skills_postgresql.sql
```

**Lưu ý:** Thay `your-host`, `your-port`, `your_password` bằng giá trị thực tế từ file `.env`

**Lưu ý:** 
- Windows: Sử dụng `set PGPASSWORD=...` trước khi chạy psql
- Linux/macOS: Sử dụng `export PGPASSWORD=...` hoặc `PGPASSWORD=... psql ...`

---

## ⚙️ BƯỚC 4: CẤU HÌNH ENVIRONMENT

### 4.1. Copy file mẫu

```bash
cp env.prod.example .env
```

### 4.2. Điền các giá trị

Mở file `.env` và điền các giá trị sau:

#### 4.2.1. Database URLs (Bắt buộc)
- Copy từ Railway dashboard (xem Bước 3.1)
- Format: `jdbc:postgresql://host:port/database`
- Điền cho 7 services: `IDENTITY_DATASOURCE_URL`, `PROJECT_DATASOURCE_URL`, `BILLING_DATASOURCE_URL`, `REQUEST_DATASOURCE_URL`, `NOTIFICATION_DATASOURCE_URL`, `SPECIALIST_DATASOURCE_URL`, `CHAT_DATASOURCE_URL`
- Username và Password từ Railway

#### 4.2.2. Redis (Bắt buộc)
- Đăng ký tại https://redis.com/cloud
- Tạo database mới
- Copy `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

#### 4.2.3. AWS S3 (Bắt buộc)
- Đăng ký AWS account tại https://aws.amazon.com
- Tạo S3 bucket trong region `ap-southeast-1`
- Tạo IAM user với quyền S3
- Copy `AWS_ACCESS_KEY_ID` và `AWS_SECRET_ACCESS_KEY`

#### 4.2.4. JWT Secret (Bắt buộc)
- Có thể dùng giá trị mẫu trong `env.prod.example`
- Hoặc generate mới: `openssl rand -base64 64`

#### 4.2.5. Email (Gmail SMTP) (Bắt buộc)
- Sử dụng Gmail account
- Tạo App Password: Google Account → Security → 2-Step Verification → App Passwords
- Copy `MAIL_USERNAME` và `MAIL_PASSWORD` (App Password)

#### 4.2.6. Google OAuth (Tùy chọn)
- Xem hướng dẫn: [GOOGLE_OAUTH_SETUP.md](../../../mobile/GOOGLE_OAUTH_SETUP.md)
- Copy `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`

#### 4.2.7. Payment Gateway (Sepay) (Tùy chọn)
- Đăng ký tại Sepay (nếu có)
- Copy `SEPAY_API_KEY` và các thông tin khác

**Chi tiết:** Xem [CONFIGURATION.md](../02_configuration/CONFIGURATION.md) và [THIRD_PARTY_APIS.md](../02_configuration/THIRD_PARTY_APIS.md)

---

## 🏗️ BƯỚC 5: BUILD BACKEND SERVICES

### 5.1. Build tất cả services

**Windows PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File build-all.ps1
```

**Linux/Mac:**
```bash
./build-all.sh
```

### 5.2. Hoặc build từng service

```bash
cd backend/api-gateway
./mvnw clean package -DskipTests

cd ../identity-service
./mvnw clean package -DskipTests

# ... tương tự cho các services khác
```

---

## 🐳 BƯỚC 6: CHẠY VỚI DOCKER COMPOSE

### 6.1. Start Kafka (Message Broker)

**Lưu ý:** 
- Database (PostgreSQL) đã được setup trên Railway (xem Bước 3)
- Redis đã được setup trên Redis Cloud
- Chỉ cần start Kafka (Redpanda) cho local development

```bash
docker compose up -d kafka
```

**Nếu dùng managed Kafka (AWS MSK, Confluent Cloud, Upstash):**
- Không cần start Kafka local
- Cấu hình `KAFKA_BOOTSTRAP_SERVERS` trong `.env` trỏ đến managed Kafka

### 6.2. Start backend services

```bash
docker compose up -d
```

**Lưu ý:** Các services sẽ kết nối đến:
- Database: Railway PostgreSQL (đã cấu hình trong `.env`)
- Redis: Redis Cloud (đã cấu hình trong `.env`)
- Kafka: Local Redpanda hoặc managed Kafka

### 6.3. Kiểm tra status

```bash
docker compose ps
```

---

## 🎨 BƯỚC 7: CHẠY FRONTEND

### 7.1. Install dependencies

```bash
cd frontend
npm install
```

### 7.2. Cấu hình API URL (Nếu cần)

Kiểm tra file cấu hình frontend (thường là `src/config/apiConfig.jsx` hoặc `.env`):
- Đảm bảo API URL trỏ đến `http://localhost:8080` (API Gateway)
- Hoặc cấu hình trong file `.env` của frontend

### 7.3. Start development server

```bash
npm run dev
```

Frontend sẽ chạy tại: http://localhost:5173

---

## 📱 BƯỚC 8: CHẠY MOBILE APP

### 8.1. Install dependencies

```bash
cd mobile
npm install
```

### 8.2. Start Expo

```bash
npm start
```

### 8.3. Chạy trên thiết bị

- Scan QR code bằng Expo Go app (iOS/Android)
- Hoặc chạy trên emulator/simulator

---

## ✅ BƯỚC 9: KIỂM TRA

Sau khi cài đặt xong, kiểm tra hệ thống hoạt động đúng:

### 9.1. Health checks nhanh

```bash
# API Gateway
curl http://localhost:8080/actuator/health

# Identity Service
curl http://localhost:8081/actuator/health

# ... tương tự cho các services khác
```

### 9.2. Đăng nhập

1. Truy cập http://localhost:5173
2. Đăng nhập với tài khoản demo (xem [DEMO_ACCOUNTS.md](../02_configuration/DEMO_ACCOUNTS.md))

### 9.3. Kiểm tra chi tiết

**Xem hướng dẫn đầy đủ:** [TESTING_GUIDE.md](./TESTING_GUIDE.md)

Bao gồm:
- ✅ Kiểm tra infrastructure (Database, Redis, Kafka)
- ✅ Kiểm tra backend services
- ✅ Kiểm tra database schema và demo data
- ✅ Kiểm tra tài khoản demo
- ✅ Kiểm tra frontend và mobile app
- ✅ Kiểm tra inter-service communication
- ✅ Checklist tổng hợp

---

## 🚀 DEPLOYMENT (PRODUCTION)

### Docker Hub Deployment

1. Build và push images:
```bash
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1
```

2. Deploy trên server:
```bash
docker compose -f docker-compose.prod.hub.yml pull
docker compose -f docker-compose.prod.hub.yml up -d
```

**Chi tiết:** Xem [EC2_DEPLOY_GUIDE.md](../../../docs/deployment/EC2_DEPLOY_GUIDE.md)

---

## 🔧 TROUBLESHOOTING

### Lỗi: Port already in use
```bash
# Tìm process đang dùng port
netstat -ano | findstr :8080  # Windows
lsof -i :8080  # macOS/Linux

# Kill process
taskkill /PID <pid> /F  # Windows
kill -9 <pid>  # macOS/Linux
```

### Lỗi: Database connection failed
- Kiểm tra connection string trong `.env`
- Kiểm tra Railway database đang chạy
- Kiểm tra firewall/network

### Lỗi: Docker container không start
```bash
# Xem logs
docker compose logs <service-name>

# Restart service
docker compose restart <service-name>
```

---

## 📚 TÀI LIỆU THAM KHẢO

- [Cấu hình hệ thống](../02_configuration/CONFIGURATION.md)
- [Dịch vụ bên thứ 3](../02_configuration/THIRD_PARTY_APIS.md)
- [Tài khoản demo](../02_configuration/DEMO_ACCOUNTS.md)
- [Thư viện và framework](./THIRD_PARTY_LIBRARIES.md)
- [Database Scripts](../01_database_scripts/)

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs: `docker compose logs`
2. Xem tài liệu troubleshooting
3. Tạo issue trong repository

---

**Cập nhật lần cuối:** [Ngày cập nhật]

