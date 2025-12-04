# Lệnh Deploy MuTraPro - Copy & Paste

## 🐳 BƯỚC 1: Build và Push Images lên Docker Hub (Trên máy local)

### 1.1. Đăng nhập Docker Hub

```bash
docker login
```

### 1.2. Set Docker Hub Username (Nếu chưa có trong .env)

**Windows PowerShell:**
```powershell
$env:DOCKER_HUB_USERNAME="your-dockerhub-username"
```

**Linux/Mac:**
```bash
export DOCKER_HUB_USERNAME="your-dockerhub-username"
```

**Hoặc thêm vào file .env:**
```bash
DOCKER_HUB_USERNAME=your-dockerhub-username
```

### 1.3. Build và Push TẤT CẢ Services (Khuyến nghị - Tự động)

**Windows PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/build-and-push.sh
./scripts/build-and-push.sh
```

**Script sẽ tự động build và push tất cả 9 services:**
- api-gateway
- identity-service
- project-service
- billing-service
- request-service
- notification-service
- specialist-service
- studio-service
- chat-service

### 1.4. Build và Push TỪNG Service (Nếu muốn build riêng)

**API Gateway:**
```bash
docker build -f backend/api-gateway/Dockerfile -t your-dockerhub-username/api-gateway:latest ./backend
docker push your-dockerhub-username/api-gateway:latest
```

**Identity Service:**
```bash
docker build -f backend/identity-service/Dockerfile -t your-dockerhub-username/identity-service:latest ./backend
docker push your-dockerhub-username/identity-service:latest
```

**Project Service:**
```bash
docker build -f backend/project-service/Dockerfile -t your-dockerhub-username/project-service:latest ./backend
docker push your-dockerhub-username/project-service:latest
```

**Billing Service:**
```bash
docker build -f backend/billing-service/Dockerfile -t your-dockerhub-username/billing-service:latest ./backend
docker push your-dockerhub-username/billing-service:latest
```

**Request Service:**
```bash
docker build -f backend/request-service/Dockerfile -t your-dockerhub-username/request-service:latest ./backend
docker push your-dockerhub-username/request-service:latest
```

**Notification Service:**
```bash
docker build -f backend/notification-service/Dockerfile -t your-dockerhub-username/notification-service:latest ./backend
docker push your-dockerhub-username/notification-service:latest
```

**Specialist Service:**
```bash
docker build -f backend/specialist-service/Dockerfile -t your-dockerhub-username/specialist-service:latest ./backend
docker push your-dockerhub-username/specialist-service:latest
```

**Studio Service:**
```bash
docker build -f backend/studio-service/Dockerfile -t your-dockerhub-username/studio-service:latest ./backend
docker push your-dockerhub-username/studio-service:latest
```

**Chat Service:**
```bash
docker build -f backend/chat-service/Dockerfile -t your-dockerhub-username/chat-service:latest ./backend
docker push your-dockerhub-username/chat-service:latest
```

---

## 🚀 BƯỚC 2: Deploy trên EC2 (Chạy trên Termius)

### 2.1. SSH vào EC2 và vào thư mục

```bash
cd ~/mutrapro
```

### 2.2. Pull images mới từ Docker Hub

```bash
sudo docker compose -f docker-compose.prod.yml pull
```

**Hoặc pull từng service:**
```bash
sudo docker pull your-dockerhub-username/api-gateway:latest
sudo docker pull your-dockerhub-username/identity-service:latest
sudo docker pull your-dockerhub-username/project-service:latest
sudo docker pull your-dockerhub-username/billing-service:latest
sudo docker pull your-dockerhub-username/request-service:latest
sudo docker pull your-dockerhub-username/notification-service:latest
sudo docker pull your-dockerhub-username/specialist-service:latest
sudo docker pull your-dockerhub-username/studio-service:latest
sudo docker pull your-dockerhub-username/chat-service:latest
```

### 2.3. Restart containers với images mới

```bash
sudo docker compose -f docker-compose.prod.yml up -d
```

**Hoặc stop và start lại:**
```bash
sudo docker compose -f docker-compose.prod.yml down
sudo docker compose -f docker-compose.prod.yml up -d
```

### 2.4. Kiểm tra status

```bash
sudo docker compose -f docker-compose.prod.yml ps
```

---

## 📊 BƯỚC 3: Theo dõi Logs

### 3.1. Xem logs tất cả services

```bash
sudo docker compose -f docker-compose.prod.yml logs -f
```

### 3.2. Xem logs từng service

**API Gateway:**
```bash
sudo docker logs mutrapro-api-gateway -f
```

**Identity Service:**
```bash
sudo docker logs mutrapro-identity-service -f
```

**Project Service:**
```bash
sudo docker logs mutrapro-project-service -f
```

**Billing Service:**
```bash
sudo docker logs mutrapro-billing-service -f
```

**Request Service:**
```bash
sudo docker logs mutrapro-request-service -f
```

**Notification Service:**
```bash
sudo docker logs mutrapro-notification-service -f
```

**Specialist Service:**
```bash
sudo docker logs mutrapro-specialist-service -f
```

**Studio Service:**
```bash
sudo docker logs mutrapro-studio-service -f
```

**Chat Service:**
```bash
sudo docker logs mutrapro-chat-service -f
```

**Nginx:**
```bash
sudo docker logs mutrapro-nginx -f
```

**Kafka:**
```bash
sudo docker logs mutrapro-kafka -f
```

---

## 🔍 BƯỚC 4: Kiểm tra Health

```bash
# Kiểm tra API Gateway qua Nginx
curl http://localhost:80/actuator/health

# Kiểm tra trực tiếp API Gateway
curl http://localhost:8080/actuator/health

# Kiểm tra từng service
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
curl http://localhost:8083/actuator/health
curl http://localhost:8084/actuator/health
curl http://localhost:8085/actuator/health
curl http://localhost:8086/actuator/health
curl http://localhost:8087/actuator/health
curl http://localhost:8088/actuator/health
```

---

## 🔧 BƯỚC 5: Cấu hình Nginx (Nếu cần)

### 5.1. Backup cấu hình hiện tại

```bash
sudo cp docker/nginx/nginx.conf docker/nginx/nginx.conf.backup
```

### 5.2. Chỉnh sửa cấu hình Nginx

```bash
nano docker/nginx/nginx.conf
```

### 5.3. Kiểm tra cấu hình Nginx

```bash
# Test cấu hình trong container
sudo docker exec mutrapro-nginx nginx -t

# Nếu có lỗi, xem chi tiết
sudo docker exec mutrapro-nginx nginx -T
```

### 5.4. Reload Nginx

```bash
# Reload container (nếu dùng volume mount)
sudo docker compose -f docker-compose.prod.yml restart nginx

# Hoặc recreate container
sudo docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
```

### 5.5. Kiểm tra log Nginx

```bash
sudo docker logs mutrapro-nginx -f
```

---

## 🔄 BƯỚC 6: Restart Services

### 6.1. Restart tất cả

```bash
sudo docker compose -f docker-compose.prod.yml restart
```

### 6.2. Restart một service cụ thể

```bash
sudo docker compose -f docker-compose.prod.yml restart api-gateway
sudo docker compose -f docker-compose.prod.yml restart identity-service
```

---

## 🛑 BƯỚC 7: Stop Services

```bash
# Stop (giữ containers)
sudo docker compose -f docker-compose.prod.yml stop

# Stop và xóa containers
sudo docker compose -f docker-compose.prod.yml down
```

---

## 📈 BƯỚC 8: Kiểm tra Resource Usage

```bash
# CPU và Memory usage
sudo docker stats

# Disk usage
sudo docker system df

# Xem chi tiết một container
sudo docker stats mutrapro-api-gateway
```

---

## 🔍 BƯỚC 9: Troubleshooting

### 9.1. Xem events

```bash
sudo docker events
```

### 9.2. Inspect container

```bash
sudo docker inspect mutrapro-api-gateway
```

### 9.3. Xem network

```bash
sudo docker network ls
sudo docker network inspect mutrapro-network
```

### 9.4. Xem volumes

```bash
sudo docker volume ls
sudo docker volume inspect volume-name
```

### 9.5. Xóa và làm lại (Cẩn thận!)

```bash
# Stop và xóa tất cả
sudo docker compose -f docker-compose.prod.yml down

# Xóa images (cẩn thận!)
sudo docker rmi $(sudo docker images -q)

# Xóa volumes (cẩn thận!)
sudo docker volume prune
```

---

## ✅ Checklist Sau Khi Deploy

```bash
# 1. Tất cả containers đang chạy
sudo docker compose -f docker-compose.prod.yml ps

# 2. Health check pass
curl http://localhost:80/actuator/health

# 3. Không có lỗi trong logs
sudo docker compose -f docker-compose.prod.yml logs | grep -i error

# 4. Resource usage OK
sudo docker stats --no-stream
```

---

## 📝 Lưu Ý

1. **Thay `your-dockerhub-username`** bằng Docker Hub username của bạn
2. **File docker-compose**: Đảm bảo đã copy `docker-compose.prod.yml` hoặc `docker-compose.prod.hub.yml` lên EC2
3. **File .env**: Đảm bảo đã copy và điền đầy đủ
4. **Nginx config**: Đảm bảo đã copy `docker/nginx/nginx.conf` lên EC2
5. **Security Group**: Đảm bảo đã mở ports 80, 443 trong AWS Security Group

---

## 🚀 Quick Deploy (Tất cả trong 1 lần)

```bash
# Trên EC2
cd ~/mutrapro
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml ps
curl http://localhost:80/actuator/health
```

