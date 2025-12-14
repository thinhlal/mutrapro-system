# 🚀 QUICK START - CÀI ĐẶT NHANH

## 📋 TỔNG QUAN

Hướng dẫn này dành cho người mới bắt đầu, chưa biết gì về hệ thống. Làm theo từng bước một.

---

## ✅ CHECKLIST TRƯỚC KHI BẮT ĐẦU

### Phần mềm cần cài đặt:
- [ ] Java JDK 21
- [ ] Node.js 18+
- [ ] Docker Desktop
- [ ] PostgreSQL Client (psql)
- [ ] Git
- [ ] Text Editor (VS Code, Notepad++, etc.)

### Tài khoản cần đăng ký:
- [ ] Railway (https://railway.app) - Database
- [ ] Redis Cloud (https://redis.com/cloud) - Cache
- [ ] AWS (https://aws.amazon.com) - S3 Storage
- [ ] Gmail Account - Email
- [ ] Docker Hub (https://hub.docker.com) - Container Registry

---

## 📝 CÁC BƯỚC CÀI ĐẶT

### Bước 1: Cài đặt phần mềm cơ bản

1. **Java JDK 21:**
   - Windows: Download từ https://adoptium.net/
   - macOS: `brew install openjdk@21`
   - Linux: `sudo apt install openjdk-21-jdk`

2. **Node.js:**
   - Download từ https://nodejs.org/ (chọn LTS version)
   - Kiểm tra: `node --version` (phải >= 18)

3. **Docker Desktop:**
   - Download từ https://www.docker.com/products/docker-desktop
   - Khởi động Docker Desktop
   - Kiểm tra: `docker --version`

4. **PostgreSQL Client:**
   - Windows: Download từ https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql`
   - Linux: `sudo apt install postgresql-client`

---

### Bước 2: Clone hoặc lấy code

```bash
# Nếu có repository
git clone <repository-url>
cd mutrapro-system

# Hoặc nếu đã có code sẵn
cd mutrapro-system
```

---

### Bước 3: Setup Railway Databases

1. Đăng ký Railway: https://railway.app
2. Tạo project mới: Click "New Project"
3. Tạo 7 PostgreSQL databases:
   - Click "New" → "Database" → "PostgreSQL" (7 lần)
   - Đặt tên: `identity-db`, `project-db`, `billing-db`, `request-db`, `notification-db`, `specialist-db`, `chat-db`
4. Lấy connection strings:
   - Click vào mỗi database
   - Vào tab "Variables"
   - Copy `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`

**Lưu ý:** Convert `DATABASE_URL` sang JDBC format:
- Railway format: `postgresql://user:pass@host:port/database`
- JDBC format: `jdbc:postgresql://host:port/database`
- Ví dụ: `postgresql://postgres:pass@switchyard.proxy.rlwy.net:23349/railway`
  → JDBC: `jdbc:postgresql://switchyard.proxy.rlwy.net:23349/railway`

---

### Bước 4: Setup Redis Cloud

1. Đăng ký: https://redis.com/cloud
2. Tạo database mới
3. Copy `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

---

### Bước 5: Setup AWS S3

1. Đăng ký AWS: https://aws.amazon.com
2. Tạo S3 bucket:
   - Vào S3 Console
   - Click "Create bucket"
   - Region: `ap-southeast-1`
   - Tên: `mutrapro-dev-files`
3. Tạo IAM user:
   - Vào IAM → Users → Create user
   - Attach policy: `AmazonS3FullAccess`
   - Tạo Access Key
   - Copy `AWS_ACCESS_KEY_ID` và `AWS_SECRET_ACCESS_KEY`

---

### Bước 6: Setup Gmail SMTP

1. Vào Google Account → Security
2. Bật 2-Step Verification
3. Tạo App Password:
   - Security → 2-Step Verification → App Passwords
   - Select app: "Mail"
   - Copy App Password (16 ký tự)

---

### Bước 7: Cấu hình .env

1. Copy file mẫu:
```bash
cp env.prod.example .env
```

2. Mở file `.env` và điền:
   - Database URLs (từ Railway - Bước 3)
   - Redis credentials (từ Redis Cloud - Bước 4)
   - AWS S3 credentials (từ AWS - Bước 5)
   - Gmail credentials (từ Gmail - Bước 6)
   - JWT Secret (có thể dùng giá trị mẫu)

**Xem chi tiết:** [CONFIGURATION.md](../02_configuration/CONFIGURATION.md)

---

### Bước 8: Build Backend

**Windows:**
```powershell
powershell -ExecutionPolicy Bypass -File build-all.ps1
```

**Linux/Mac:**
```bash
./build-all.sh
```

---

### Bước 9: Start Services

1. Start Kafka:
```bash
docker compose up -d kafka
```

2. Start Backend:
```bash
docker compose up -d
```

3. Kiểm tra:
```bash
docker compose ps
```

---

### Bước 10: Chạy Demo Data Scripts

**Xem chi tiết:** [Database Scripts README](../01_database_scripts/README.md)

**Tóm tắt:**
1. Skills: `backend/specialist-service/scripts/setup_skills_postgresql.sql`
2. Equipment: `backend/project-service/scripts/insert-equipment-sample-data.sql`
3. Studio: `backend/project-service/scripts/create_default_studio.sql`
4. Pricing: `backend/request-service/scripts/create-pricing-matrix.sql`
5. Notation: `backend/request-service/scripts/insert-notation-instruments.sql`

**Ví dụ:**
```bash
# Lấy thông tin từ file .env
# SPECIALIST_DATASOURCE_URL=jdbc:postgresql://your-host:your-port/railway
# Parse: host=your-host, port=your-port

# Set password (Windows)
set PGPASSWORD=your_password

# Chạy script (thay your-host và your-port bằng giá trị thực tế)
psql -h your-host -p your-port -U postgres -d railway -f backend/specialist-service/scripts/setup_skills_postgresql.sql
```

---

### Bước 11: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Truy cập: http://localhost:5173

---

### Bước 12: Đăng nhập Test

1. Truy cập http://localhost:5173
2. Đăng nhập với:
   - Email: `admin@admin.com`
   - Password: `12345678`

**Xem tất cả tài khoản:** [DEMO_ACCOUNTS.md](../02_configuration/DEMO_ACCOUNTS.md)

---

## 🔧 TROUBLESHOOTING

### Lỗi: "psql: command not found"
- **Giải pháp:** Cài PostgreSQL client (xem Bước 1)

### Lỗi: "Cannot connect to database"
- **Giải pháp:** 
  - Kiểm tra Railway database đang chạy
  - Kiểm tra connection string trong `.env`
  - Kiểm tra firewall

### Lỗi: "Port already in use"
- **Giểm tra:** `netstat -ano | findstr :8080` (Windows)
- **Giải pháp:** Kill process hoặc đổi port

### Lỗi: "Docker daemon not running"
- **Giải pháp:** Khởi động Docker Desktop

---

## 📚 TÀI LIỆU THAM KHẢO

- [Hướng dẫn chi tiết](./INSTALLATION_GUIDE.md)
- [Cấu hình hệ thống](../02_configuration/CONFIGURATION.md)
- [Tài khoản demo](../02_configuration/DEMO_ACCOUNTS.md)
- [Database Scripts](../01_database_scripts/README.md)

---

**Cập nhật lần cuối:** [Ngày cập nhật]

