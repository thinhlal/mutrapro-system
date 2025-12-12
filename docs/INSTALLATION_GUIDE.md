# 2. Installation Guides

## 2.1 System Requirements

### 2.1.1 Web Application

**Table 32. Web Application System Requirements**

| **PC** | **Minimum** | **Recommended** |
|--------|-------------|-----------------|
| **Internet Connection** | LAN, internet access capability (5 Mbps) | LAN, Wi-Fi (16 Mbps or higher) |
| **Processor** | Intel Core i3 1.5 GHz or AMD equivalent | Intel Core i5 2.6 GHz or higher |
| **Memory** | 4GB RAM | 8GB RAM or higher |
| **Storage** | 2GB free space | 5GB or more |
| **Web Browser** | Chrome (v90+), Firefox (v88+), Safari (v14+), Edge (v90+) | Chrome/Firefox latest stable version |
| **Screen Resolution** | 1280x720 (HD) | 1920x1080 (Full HD) or higher |
| **Operating System** | Windows 10, macOS 10.15, Ubuntu 20.04 | Windows 11, macOS 13+, Ubuntu 22.04+ |

---

### 2.1.2 Mobile Application

**Table 33. Mobile Application System Requirements**

| **Mobile** | **Minimum** | **Recommended** |
|------------|-------------|-----------------|
| **Internet Connection** | 3G/4G mobile data or Wi-Fi | 4G/5G or Wi-Fi (16 Mbps+) |
| **Android OS** | Android 8.0 (Oreo) or higher | Android 12 or higher |
| **iOS** | iOS 13.0 or higher | iOS 16 or higher |
| **Processor (Android)** | Snapdragon 450 / Exynos 7884 | Snapdragon 765G or higher |
| **Processor (iOS)** | Apple A11 Bionic (iPhone 8) | Apple A14 Bionic or higher (iPhone 12+) |
| **Memory** | 3GB RAM | 6GB RAM or higher |
| **Storage** | 200MB free space | 500MB or more |
| **Screen Size** | 5.0 inches | 6.0 inches or larger |
| **Camera** | 8MP (for profile photos) | 12MP or higher |

---

### 2.1.3 Server Requirements (For Deployment)

**Table 34. Server System Requirements**

| **Server Component** | **Minimum** | **Recommended** |
|---------------------|-------------|-----------------|
| **Operating System** | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS or Amazon Linux 2023 |
| **CPU** | 4 vCPUs | 8 vCPUs or higher |
| **Memory** | 16GB RAM | 32GB RAM or higher |
| **Storage** | 100GB SSD | 250GB SSD or higher |
| **Network** | 100 Mbps | 1 Gbps |
| **Docker** | 20.10+ | Latest stable version |
| **Docker Compose** | 2.0+ | Latest stable version |

---

### 2.1.4 External Services

**Table 35. External Services Requirements**

| **Service** | **Provider** | **Purpose** | **Access Required** |
|-------------|--------------|-------------|---------------------|
| **PostgreSQL Database** | Railway | Main database (7 instances) | DATABASE_URL from Railway |
| **Redis Cache** | Redis Cloud | Caching layer | REDIS_URL from Redis Cloud |
| **Object Storage** | AWS S3 | File uploads | AWS credentials |
| **Payment Gateway** | Sepay | Payment processing | Sepay API keys |
| **Email Service** | Gmail SMTP | Email notifications | Gmail credentials |

---

## 2.2 Installation Instruction

### 2.2.1 Prerequisites

Trước khi cài đặt, đảm bảo các điều kiện sau:

1. **Server (EC2):**
   - Ubuntu 20.04 LTS trở lên
   - Docker 20.10+ đã cài đặt
   - Docker Compose 2.0+ đã cài đặt
   - Port 80, 443 đã mở trong Security Group

2. **External Services:**
   - Railway PostgreSQL databases (7 instances) - xem [RAILWAY_DATABASE_SETUP.md](./deployment/RAILWAY_DATABASE_SETUP.md)
   - Redis Cloud instance
   - AWS S3 bucket
   - Gmail SMTP credentials
   - Google OAuth credentials

3. **Docker Hub Account:**
   - Tài khoản Docker Hub để push/pull images

---

### 2.2.2 Installation Steps

#### **Step 1: Setup Server Environment**

**1.1. Cài đặt Docker và Docker Compose (nếu chưa có):**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

**1.2. Clone project repository:**

```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/<your-org>/mutrapro-system.git
cd mutrapro-system
```

---

#### **Step 2: Configure Database (Railway)**

**2.1. Setup Railway Databases:**

Tham khảo hướng dẫn chi tiết tại: [RAILWAY_DATABASE_SETUP.md](./deployment/RAILWAY_DATABASE_SETUP.md)

**Tóm tắt:**
- Tạo 7 PostgreSQL instances trên Railway (mỗi service 1 database)
- Lấy connection strings từ Railway dashboard
- Lưu lại thông tin: `DATASOURCE_URL`, `USERNAME`, `PASSWORD`

---

#### **Step 3: Configure Environment Variables**

**3.1. Tạo file `.env`:**

```bash
cd ~/projects/mutrapro-system
cp env.prod.example .env
nano .env
```

**3.2. Điền các giá trị cần thiết:**

```env
# Docker Hub
DOCKER_HUB_USERNAME=your-dockerhub-username

# Database URLs (từ Railway)
IDENTITY_DATASOURCE_URL=jdbc:postgresql://xxx.xxx:xxxxx/railway
IDENTITY_DATASOURCE_USERNAME=postgres
IDENTITY_DATASOURCE_PASSWORD=your_password
# ... (tương tự cho 6 services còn lại)

# Redis
REDIS_HOST=redis-xxx.xxx.redis-cloud.com
REDIS_PORT=11105
REDIS_PASSWORD=your_redis_password

# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# JWT
JWT_SECRET=your_super_secret_jwt_key

# AWS S3
AWS_S3_BUCKET_NAME=mutrapro-dev-files
AWS_S3_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Mail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_NAME=MuTraPro
FRONTEND_URL=https://your-frontend-url

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-frontend-url/authenticate

# Application URLs (QUAN TRỌNG - điền sau khi có EC2 IP)
API_BASE_URL=http://your-ec2-ip
CORS_ALLOWED_ORIGINS=http://your-ec2-ip,https://your-frontend-url
```

**Lưu ý:** Xem file `env.prod.example` để biết đầy đủ các biến môi trường.

---

#### **Step 4: Build and Push Docker Images (Local Machine)**

**4.1. Đăng nhập Docker Hub:**

```bash
docker login
```

**4.2. Build và push tất cả services:**

**Windows PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1
```

**Linux/Mac:**
```bash
./scripts/build-and-push.sh
```

**Hoặc build từng service:**
```bash
# Ví dụ: API Gateway
docker build -f backend/api-gateway/Dockerfile -t your-username/api-gateway:latest ./backend
docker push your-username/api-gateway:latest
```

**Lưu ý:** Thay `your-username` bằng Docker Hub username của bạn.

---

#### **Step 5: Deploy on EC2**

**5.1. Đăng nhập Docker Hub trên EC2 (nếu images là private):**

```bash
docker login
```

**5.2. Pull images từ Docker Hub:**

```bash
cd ~/projects/mutrapro-system
docker compose -f docker-compose.prod.hub.yml pull
```

**5.3. Start tất cả services:**

```bash
docker compose -f docker-compose.prod.hub.yml up -d
```

**5.4. Kiểm tra trạng thái:**

```bash
# Xem status containers
docker compose -f docker-compose.prod.hub.yml ps

# Kiểm tra health
curl http://localhost/actuator/health
curl http://localhost:8080/actuator/health  # API Gateway
```

---

#### **Step 6: Configure AWS Security Group**

**6.1. Mở ports trong AWS Console:**

1. Vào **EC2 → Instances → chọn instance**
2. Tab **Security → Security Groups → Inbound rules**
3. Click **Edit inbound rules**
4. Thêm rules:
   - **Type:** `HTTP`, **Port:** `80`, **Source:** `0.0.0.0/0`
   - **Type:** `HTTPS`, **Port:** `443`, **Source:** `0.0.0.0/0` (nếu có SSL)
   - **Type:** `SSH`, **Port:** `22`, **Source:** `Your-IP/32` (bảo mật)

---

#### **Step 7: Verify Installation**

**7.1. Kiểm tra từ server:**

```bash
# Health check
curl http://localhost/actuator/health

# Xem logs
docker compose -f docker-compose.prod.hub.yml logs -f
```

**7.2. Kiểm tra từ bên ngoài:**

```bash
# Từ máy local
curl http://your-ec2-public-ip/actuator/health
```

**7.3. Truy cập qua trình duyệt:**

```
http://your-ec2-public-ip
```

---

### 2.2.3 Alternative: Local Build Deployment

Nếu không dùng Docker Hub, có thể build trực tiếp trên EC2:

```bash
# Build và chạy
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

**Lưu ý:** Cần cài đặt Java JDK 17+ và Maven trên EC2 để build.

---

### 2.2.4 Update Services

Khi có code mới:

**1. Trên Local - Build và Push:**
```bash
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1
```

**2. Trên EC2 - Pull và Restart:**
```bash
docker compose -f docker-compose.prod.hub.yml pull
docker compose -f docker-compose.prod.hub.yml up -d
```

---

### 2.2.5 Useful Commands

**Xem logs:**
```bash
docker compose -f docker-compose.prod.hub.yml logs -f
docker compose -f docker-compose.prod.hub.yml logs -f api-gateway
```

**Restart service:**
```bash
docker compose -f docker-compose.prod.hub.yml restart api-gateway
```

**Stop services:**
```bash
docker compose -f docker-compose.prod.hub.yml stop
docker compose -f docker-compose.prod.hub.yml down
```

**Xem resource usage:**
```bash
docker stats
docker system df
```

---

### 2.2.6 Troubleshooting

**Container không start:**
```bash
docker compose -f docker-compose.prod.hub.yml logs service-name
docker inspect mutrapro-api-gateway
```

**Lỗi kết nối Database:**
- Kiểm tra `*_DATASOURCE_URL` trong `.env`
- Kiểm tra Railway Security Group cho phép EC2 IP

**Lỗi kết nối Redis:**
- Kiểm tra `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` trong `.env`
- Kiểm tra Redis Cloud cho phép EC2 IP

---

### 2.2.7 References

- Chi tiết deploy: [EC2_DEPLOY_GUIDE.md](./deployment/EC2_DEPLOY_GUIDE.md)
- Build và run: [EC2_BUILD_AND_RUN.md](./deployment/EC2_BUILD_AND_RUN.md)
- Database setup: [RAILWAY_DATABASE_SETUP.md](./deployment/RAILWAY_DATABASE_SETUP.md)
