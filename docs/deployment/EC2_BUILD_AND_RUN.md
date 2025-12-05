# 🚀 MuTraPro - Build và Deploy lên EC2

Tài liệu tổng hợp các lệnh build images và deploy lên EC2.

---

## 📦 PHẦN 1: BUILD VÀ PUSH IMAGES (Trên máy Local)

### Bước 1: Chuẩn bị

#### 1.1. Đăng nhập Docker Hub

```bash
docker login
```

#### 1.2. Cấu hình Docker Hub Username

**Windows PowerShell:**
```powershell
$env:DOCKER_HUB_USERNAME="your-dockerhub-username"
```

**Linux/Mac:**
```bash
export DOCKER_HUB_USERNAME="your-dockerhub-username"
```

**Hoặc thêm vào file `.env` trong thư mục root:**
```env
DOCKER_HUB_USERNAME=your-dockerhub-username
```

### Bước 2: Build và Push TẤT CẢ Services (Khuyến nghị)

**Windows PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/build-and-push.sh
./scripts/build-and-push.sh
```

**Hoặc dùng Makefile (nếu có):**
```bash
make docker-build
```

Script sẽ tự động build và push 8 services:
- ✅ api-gateway
- ✅ identity-service
- ✅ project-service
- ✅ billing-service
- ✅ request-service
- ✅ notification-service
- ✅ specialist-service
- ✅ chat-service

### Bước 3: Build và Push TỪNG Service (Tùy chọn)

**Windows PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1 -Service api-gateway
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1 -Service identity-service
# ... các service khác
```

**Linux/Mac - Build từng service thủ công:**
```bash
# API Gateway
docker build -f backend/api-gateway/Dockerfile -t thinhlal273/api-gateway:latest ./backend
docker push thinhlal273/api-gateway:latest

# Identity Service
docker build -f backend/identity-service/Dockerfile -t thinhlal273/identity-service:latest ./backend
docker push thinhlal273/identity-service:latest

# Project Service
docker build -f backend/project-service/Dockerfile -t thinhlal273/project-service:latest ./backend
docker push thinhlal273/project-service:latest

# Billing Service
docker build -f backend/billing-service/Dockerfile -t thinhlal273/billing-service:latest ./backend
docker push thinhlal273/billing-service:latest

# Request Service
docker build -f backend/request-service/Dockerfile -t thinhlal273/request-service:latest ./backend
docker push thinhlal273/request-service:latest

# Notification Service
docker build -f backend/notification-service/Dockerfile -t thinhlal273/notification-service:latest ./backend
docker push thinhlal273/notification-service:latest

# Specialist Service
docker build -f backend/specialist-service/Dockerfile -t thinhlal273/specialist-service:latest ./backend
docker push thinhlal273/specialist-service:latest

# Chat Service
docker build -f backend/chat-service/Dockerfile -t thinhlal273/chat-service:latest ./backend
docker push thinhlal273/chat-service:latest
```

---
## Fix

## Giải pháp nhanh (All-in-one)

```bash
# Stop và xóa tất cả containers
sudo docker compose -f docker-compose.prod.hub.yml down

# Pull lại images
sudo docker compose -f docker-compose.prod.hub.yml pull

# Start lại
sudo docker compose -f docker-compose.prod.hub.yml up -d


## 🌐 PHẦN 2: DEPLOY VÀ CHẠY TRÊN EC2

### Bước 1: SSH vào EC2 và chuẩn bị môi trường

```bash
# SSH vào EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Di chuyển đến thư mục project
cd ~/mutrapro

# Hoặc clone từ GitHub (nếu chưa có)
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>
```

### Bước 2: Kiểm tra Docker và Docker Compose

```bash
# Kiểm tra Docker đã cài chưa
docker --version
docker compose version

# Nếu chưa có, cài đặt:
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose plugin đã được tích hợp sẵn trong Docker Desktop và Docker Engine mới
# Không cần cài riêng nữa, chỉ cần kiểm tra:
docker compose version
```

### Bước 3: Cấu hình file .env

Đảm bảo file `.env` đã được tạo và điền đầy đủ thông tin:

```bash
nano .env
```

**Nội dung tối thiểu cần có:**
```env
# Docker Hub
DOCKER_HUB_USERNAME=your-dockerhub-username

# Redis
REDIS_HOST=redis-xxx.xxx.redis-cloud.com
REDIS_PORT=11105
REDIS_PASSWORD=your_redis_password

# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Databases (Railway hoặc external)
# Mỗi service có database riêng
IDENTITY_DATASOURCE_URL=jdbc:postgresql://xxx.xxx:xxxxx/railway
IDENTITY_DATASOURCE_USERNAME=postgres
IDENTITY_DATASOURCE_PASSWORD=your_password

PROJECT_DATASOURCE_URL=jdbc:postgresql://xxx.xxx:xxxxx/railway
PROJECT_DATASOURCE_USERNAME=postgres
PROJECT_DATASOURCE_PASSWORD=your_password

BILLING_DATASOURCE_URL=jdbc:postgresql://xxx.xxx:xxxxx/railway
BILLING_DATASOURCE_USERNAME=postgres
BILLING_DATASOURCE_PASSWORD=your_password

REQUEST_DATASOURCE_URL=jdbc:postgresql://xxx.xxx:xxxxx/railway
REQUEST_DATASOURCE_USERNAME=postgres
REQUEST_DATASOURCE_PASSWORD=your_password

NOTIFICATION_DATASOURCE_URL=jdbc:postgresql://xxx.xxx:xxxxx/railway
NOTIFICATION_DATASOURCE_USERNAME=postgres
NOTIFICATION_DATASOURCE_PASSWORD=your_password

SPECIALIST_DATASOURCE_URL=jdbc:postgresql://xxx.xxx:xxxxx/railway
SPECIALIST_DATASOURCE_USERNAME=postgres
SPECIALIST_DATASOURCE_PASSWORD=your_password

CHAT_DATASOURCE_URL=jdbc:postgresql://xxx.xxx:xxxxx/railway
CHAT_DATASOURCE_USERNAME=postgres
CHAT_DATASOURCE_PASSWORD=your_password

# AWS S3 Configuration (Cần cho project-service, request-service, chat-service)
AWS_S3_ENABLED=true
AWS_S3_BUCKET_NAME=mutrapro-dev-files
AWS_S3_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Mail Configuration (Cho notification-service)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_NAME=MuTraPro
FRONTEND_URL=https://your-frontend-url

# OAuth Configuration (Cho identity-service)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-frontend-url/authenticate

# Application URLs (QUAN TRỌNG)
API_BASE_URL=http://your-ec2-ip
CORS_ALLOWED_ORIGINS=http://your-ec2-ip,https://your-frontend-url
```

### Bước 4: Đăng nhập Docker Hub trên EC2 (nếu images là private)

```bash
docker login
# Nhập username và password/PAT
```

### Bước 5: Pull Images và Chạy Services

#### 5.1. Pull tất cả images từ Docker Hub

```bash
sudo docker compose -f docker-compose.prod.hub.yml pull
```

**Hoặc pull từng service:**
```bash
# Thay ${DOCKER_HUB_USERNAME} bằng username Docker Hub của bạn
# Hoặc dùng biến môi trường: export DOCKER_HUB_USERNAME=your-username
sudo docker pull ${DOCKER_HUB_USERNAME:-thinhlal273}/api-gateway:latest
sudo docker pull ${DOCKER_HUB_USERNAME:-thinhlal273}/identity-service:latest
sudo docker pull ${DOCKER_HUB_USERNAME:-thinhlal273}/project-service:latest
sudo docker pull ${DOCKER_HUB_USERNAME:-thinhlal273}/billing-service:latest
sudo docker pull ${DOCKER_HUB_USERNAME:-thinhlal273}/request-service:latest
sudo docker pull ${DOCKER_HUB_USERNAME:-thinhlal273}/notification-service:latest
sudo docker pull ${DOCKER_HUB_USERNAME:-thinhlal273}/specialist-service:latest
sudo docker pull ${DOCKER_HUB_USERNAME:-thinhlal273}/chat-service:latest
```

#### 5.2. Chạy tất cả services

```bash
# Chạy ở chế độ background
sudo docker compose -f docker-compose.prod.hub.yml up -d
```

**Hoặc stop và start lại (nếu đã chạy rồi):**
```bash
sudo docker compose -f docker-compose.prod.hub.yml down
sudo docker compose -f docker-compose.prod.hub.yml up -d
```

#### 5.3. Kiểm tra trạng thái

```bash
# Xem status tất cả containers
sudo docker compose -f docker-compose.prod.hub.yml ps

# Hoặc
sudo docker ps
```

### Bước 6: Kiểm tra Health và Logs

#### 6.1. Kiểm tra Health Endpoints

```bash
# Kiểm tra qua Nginx (port 80)
curl http://localhost/actuator/health

# Kiểm tra trực tiếp API Gateway
curl http://localhost:8080/actuator/health

# Kiểm tra từng service
curl http://localhost:8081/actuator/health  # Identity
curl http://localhost:8082/actuator/health  # Project
curl http://localhost:8083/actuator/health  # Billing
curl http://localhost:8084/actuator/health  # Request
curl http://localhost:8085/actuator/health  # Notification
curl http://localhost:8086/actuator/health  # Specialist
curl http://localhost:8088/actuator/health  # Chat
```

#### 6.2. Xem Logs

**Xem logs tất cả services:**
```bash
sudo docker compose -f docker-compose.prod.hub.yml logs -f
```

**Xem logs từng service:**
```bash
# API Gateway
sudo docker logs mutrapro-api-gateway -f

# Identity Service
sudo docker logs mutrapro-identity-service -f

# Project Service
sudo docker logs mutrapro-project-service -f

# Billing Service
sudo docker logs mutrapro-billing-service -f

# Request Service
sudo docker logs mutrapro-request-service -f

# Notification Service
sudo docker logs mutrapro-notification-service -f

# Specialist Service
sudo docker logs mutrapro-specialist-service -f

# Chat Service
sudo docker logs mutrapro-chat-service -f

# Nginx
sudo docker logs mutrapro-nginx -f

# Kafka
sudo docker logs mutrapro-kafka -f
```

### Bước 7: Cấu hình AWS Security Group

Đảm bảo đã mở các ports cần thiết trong AWS Security Group:

- **Port 80** (HTTP): `0.0.0.0/0` - Cho phép truy cập từ bên ngoài
- **Port 443** (HTTPS): `0.0.0.0/0` - Nếu có SSL
- **Port 22** (SSH): `Your-IP/32` - Chỉ cho phép IP của bạn (bảo mật)

**Cách mở port trong AWS Console:**
1. Vào **EC2 → Instances → chọn instance**
2. Tab **Security → Security Groups → Inbound rules**
3. Click **Edit inbound rules**
4. Thêm rule:
   - Type: `HTTP`
   - Port: `80`
   - Source: `0.0.0.0/0`

### Bước 8: Kiểm tra từ bên ngoài

```bash
# Test từ máy local
curl http://your-ec2-public-ip/actuator/health

# Hoặc mở trình duyệt
http://your-ec2-public-ip
```

---

## 🔄 QUY TRÌNH UPDATE SAU NÀY

Khi có code mới và muốn update trên EC2:

### 1. Trên máy Local - Build và Push

```bash
# Build và push lại tất cả
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1

# Hoặc chỉ build một service cụ thể
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1 -Service api-gateway
```

### 2. Trên EC2 - Pull và Restart

```bash
# Pull images mới
sudo docker compose -f docker-compose.prod.hub.yml pull

# Restart với images mới
sudo docker compose -f docker-compose.prod.hub.yml up -d

# Hoặc restart một service cụ thể
sudo docker compose -f docker-compose.prod.hub.yml pull api-gateway
sudo docker compose -f docker-compose.prod.hub.yml up -d api-gateway
```

---

## 🛠️ QUẢN LÝ SERVICES TRÊN EC2

### 1. Khởi động Services

```bash
# Khởi động tất cả services
sudo docker compose -f docker-compose.prod.hub.yml up -d

# Khởi động một service cụ thể
sudo docker compose -f docker-compose.prod.hub.yml up -d api-gateway
sudo docker compose -f docker-compose.prod.hub.yml up -d identity-service
sudo docker compose -f docker-compose.prod.hub.yml up -d project-service
sudo docker compose -f docker-compose.prod.hub.yml up -d billing-service
sudo docker compose -f docker-compose.prod.hub.yml up -d request-service
sudo docker compose -f docker-compose.prod.hub.yml up -d notification-service
sudo docker compose -f docker-compose.prod.hub.yml up -d specialist-service
sudo docker compose -f docker-compose.prod.hub.yml up -d chat-service
```

### 2. Dừng Services

```bash
# Dừng tất cả services (giữ containers và data)
sudo docker compose -f docker-compose.prod.hub.yml stop

# Dừng một service cụ thể
sudo docker compose -f docker-compose.prod.hub.yml stop api-gateway

# Dừng và xóa containers (⚠️ Mất data nếu không có volumes)
sudo docker compose -f docker-compose.prod.hub.yml down

# Dừng và xóa containers + volumes (⚠️ Mất tất cả data)
sudo docker compose -f docker-compose.prod.hub.yml down -v
```

### 3. Restart Services

```bash
# Restart tất cả services
sudo docker compose -f docker-compose.prod.hub.yml restart

# Restart một service cụ thể
sudo docker compose -f docker-compose.prod.hub.yml restart api-gateway
sudo docker compose -f docker-compose.prod.hub.yml restart identity-service
sudo docker compose -f docker-compose.prod.hub.yml restart project-service
sudo docker compose -f docker-compose.prod.hub.yml restart billing-service
sudo docker compose -f docker-compose.prod.hub.yml restart request-service
sudo docker compose -f docker-compose.prod.hub.yml restart notification-service
sudo docker compose -f docker-compose.prod.hub.yml restart specialist-service
sudo docker compose -f docker-compose.prod.hub.yml restart chat-service

# Restart với pull images mới (khi có code update)
sudo docker compose -f docker-compose.prod.hub.yml pull api-gateway
sudo docker compose -f docker-compose.prod.hub.yml up -d api-gateway
```

### 4. Xem Trạng thái Services

```bash
# Xem trạng thái tất cả containers
sudo docker compose -f docker-compose.prod.hub.yml ps

# Xem trạng thái chi tiết (bao gồm cả stopped containers)
sudo docker compose -f docker-compose.prod.hub.yml ps -a

# Xem trạng thái một service cụ thể
sudo docker ps | grep mutrapro-api-gateway
sudo docker ps | grep mutrapro-identity-service
```

### 5. Xem Logs

```bash
# Xem logs tất cả services (real-time)
sudo docker compose -f docker-compose.prod.hub.yml logs -f

# Xem logs một service cụ thể (real-time)
sudo docker compose -f docker-compose.prod.hub.yml logs -f api-gateway
sudo docker compose -f docker-compose.prod.hub.yml logs -f identity-service
sudo docker compose -f docker-compose.prod.hub.yml logs -f project-service
sudo docker compose -f docker-compose.prod.hub.yml logs -f billing-service
sudo docker compose -f docker-compose.prod.hub.yml logs -f request-service
sudo docker compose -f docker-compose.prod.hub.yml logs -f notification-service
sudo docker compose -f docker-compose.prod.hub.yml logs -f specialist-service
sudo docker compose -f docker-compose.prod.hub.yml logs -f chat-service

# Xem logs bằng container name (real-time)
sudo docker logs mutrapro-api-gateway -f
sudo docker logs mutrapro-identity-service -f
sudo docker logs mutrapro-project-service -f
sudo docker logs mutrapro-billing-service -f
sudo docker logs mutrapro-request-service -f
sudo docker logs mutrapro-notification-service -f
sudo docker logs mutrapro-specialist-service -f
sudo docker logs mutrapro-chat-service -f

# Xem logs 100 dòng cuối cùng
sudo docker logs mutrapro-api-gateway --tail 100

# Xem logs từ một thời điểm cụ thể
sudo docker logs mutrapro-api-gateway --since 10m  # 10 phút trước
sudo docker logs mutrapro-api-gateway --since 2024-01-01T00:00:00

# Xem logs và lọc theo từ khóa
sudo docker logs mutrapro-api-gateway 2>&1 | grep -i error
sudo docker logs mutrapro-identity-service 2>&1 | grep -i "authentication"
```

### 6. Kiểm tra Health và Performance

```bash
# Kiểm tra health endpoints
curl http://localhost/actuator/health
curl http://localhost:8080/actuator/health  # API Gateway
curl http://localhost:8081/actuator/health  # Identity
curl http://localhost:8082/actuator/health  # Project
curl http://localhost:8083/actuator/health  # Billing
curl http://localhost:8084/actuator/health  # Request
curl http://localhost:8085/actuator/health  # Notification
curl http://localhost:8086/actuator/health  # Specialist
curl http://localhost:8088/actuator/health  # Chat

# Xem CPU và Memory usage (real-time)
sudo docker stats

# Xem CPU và Memory usage một lần (không real-time)
sudo docker stats --no-stream

# Xem resource usage một container cụ thể
sudo docker stats mutrapro-api-gateway --no-stream

# Xem disk usage
sudo docker system df

# Xem disk usage chi tiết
sudo docker system df -v
```

### 7. Update và Rebuild Services

```bash
# Update một service (pull image mới và restart)
sudo docker compose -f docker-compose.prod.hub.yml pull api-gateway
sudo docker compose -f docker-compose.prod.hub.yml up -d api-gateway

# Update tất cả services
sudo docker compose -f docker-compose.prod.hub.yml pull
sudo docker compose -f docker-compose.prod.hub.yml up -d

# Rebuild và restart một service (nếu dùng docker-compose.prod.yml - build local)
sudo docker compose -f docker-compose.prod.yml build api-gateway
sudo docker compose -f docker-compose.prod.yml up -d api-gateway
```

### 8. Xóa và Dọn dẹp

```bash
# Xóa containers đã stop
sudo docker container prune

# Xóa images không dùng
sudo docker image prune

# Xóa tất cả images không dùng (bao gồm cả đang được tag)
sudo docker image prune -a

# Xóa volumes không dùng
sudo docker volume prune

# Xóa networks không dùng
sudo docker network prune

# Dọn dẹp tất cả (containers, networks, images không dùng, build cache)
sudo docker system prune

# Dọn dẹp tất cả kể cả volumes (⚠️ Cẩn thận!)
sudo docker system prune -a --volumes
```

### 9. Vào trong Container (Debugging)

```bash
# Vào shell của container
sudo docker exec -it mutrapro-api-gateway /bin/sh
sudo docker exec -it mutrapro-identity-service /bin/sh
sudo docker exec -it mutrapro-project-service /bin/sh

# Chạy một lệnh trong container
sudo docker exec mutrapro-api-gateway ls -la /app
sudo docker exec mutrapro-nginx nginx -t  # Test nginx config
```

### 10. Kiểm tra Network và Volumes

```bash
# List networks
sudo docker network ls

# Inspect network
sudo docker network inspect mutrapro-network

# List volumes
sudo docker volume ls

# Inspect volume
sudo docker volume inspect <volume-name>
```

### 11. Troubleshooting

```bash
# Xem events của Docker
sudo docker events

# Inspect container (xem cấu hình chi tiết)
sudo docker inspect mutrapro-api-gateway

# Xem cấu hình nginx
sudo docker exec mutrapro-nginx nginx -t

# Reload nginx (không cần restart container)
sudo docker exec mutrapro-nginx nginx -s reload

# Restart nginx container
sudo docker compose -f docker-compose.prod.hub.yml restart nginx

# Kiểm tra logs lỗi
sudo docker compose -f docker-compose.prod.hub.yml logs | grep -i error
sudo docker compose -f docker-compose.prod.hub.yml logs | grep -i exception
sudo docker compose -f docker-compose.prod.hub.yml logs | grep -i failed

# Kiểm tra một service có đang chạy không
sudo docker ps | grep mutrapro-api-gateway

# Xem exit code của container đã dừng
sudo docker inspect mutrapro-api-gateway | grep -i exitcode
```

### 12. Backup và Restore

```bash
# Export logs của một service ra file
sudo docker logs mutrapro-api-gateway > api-gateway-logs.txt 2>&1

# Copy file từ container ra host
sudo docker cp mutrapro-api-gateway:/app/logs/app.log ./backup/

# Copy file từ host vào container
sudo docker cp ./config/file.conf mutrapro-api-gateway:/app/config/
```

---

## ⚡ QUICK DEPLOY (Tất cả trong 1 lần)

### Trên EC2 - Quick Deploy:

```bash
cd ~/mutrapro
sudo docker compose -f docker-compose.prod.hub.yml pull
sudo docker compose -f docker-compose.prod.hub.yml up -d
sudo docker compose -f docker-compose.prod.hub.yml ps
curl http://localhost/actuator/health
```

---

## ✅ CHECKLIST SAU KHI DEPLOY

- [ ] Tất cả containers đang chạy (`sudo docker compose -f docker-compose.prod.hub.yml ps`)
- [ ] Health check pass (`curl http://localhost/actuator/health`)
- [ ] Không có lỗi trong logs (`sudo docker compose -f docker-compose.prod.hub.yml logs | grep -i error`)
- [ ] Resource usage OK (`sudo docker stats --no-stream`)
- [ ] Có thể truy cập từ bên ngoài (`curl http://your-ec2-ip/actuator/health`)
- [ ] Database connections OK (kiểm tra logs)
- [ ] Redis connections OK (kiểm tra logs)
- [ ] Kafka connections OK (kiểm tra logs)

---

## 📝 LƯU Ý QUAN TRỌNG

1. **Docker Hub Username**: Thay `your-dockerhub-username` hoặc `thinhlal273` bằng username Docker Hub thật của bạn. Có thể set biến môi trường `DOCKER_HUB_USERNAME` trong file `.env`

2. **File docker-compose**: Đảm bảo đã có file `docker-compose.prod.hub.yml` trên EC2

3. **File .env**: Đảm bảo đã copy và điền đầy đủ các biến môi trường, đặc biệt:
   - **AWS S3**: Cần cho `project-service`, `request-service`, `chat-service`
   - **OAuth**: Cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` cho `identity-service`
   - **Databases**: Mỗi service cần database riêng
   - **Redis**: Cần cho `identity-service`
   - **Kafka**: Cần cho tất cả services

4. **Nginx config**: Đảm bảo đã copy file `docker/nginx/nginx.conf` lên EC2

5. **Security Group**: Đảm bảo đã mở ports 80, 443 trong AWS Security Group

6. **Database**: Đảm bảo databases (Railway hoặc external) đã cho phép kết nối từ EC2 IP

7. **OAuth Redirect URI**: Đảm bảo `GOOGLE_REDIRECT_URI` trong `.env` khớp với redirect URI đã đăng ký trong Google OAuth Console (ví dụ: `https://your-frontend-url/authenticate`)

---

## 🔗 TÀI LIỆU LIÊN QUAN

- [EC2_DEPLOY_COMMANDS.md](./EC2_DEPLOY_COMMANDS.md) - Danh sách lệnh chi tiết
- [EC2_DEPLOY_GUIDE.md](./EC2_DEPLOY_GUIDE.md) - Hướng dẫn deploy chi tiết
- [DOCKER_K8S_README.md](../../DOCKER_K8S_README.md) - Hướng dẫn Docker & Kubernetes

