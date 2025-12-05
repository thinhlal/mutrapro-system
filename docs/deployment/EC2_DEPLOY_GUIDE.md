# Hướng Dẫn Deploy MuTraPro lên EC2

## 0️⃣ Điều kiện cần

Trên EC2 phải có:
- Docker
- Docker Compose
- Port 80 đã mở trong **Security Group**

### Cài đặt Docker và Docker Compose (nếu chưa có)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl

# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào docker group
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose plugin đã được tích hợp sẵn trong Docker Desktop và Docker Engine mới
# Không cần cài riêng nữa, chỉ cần kiểm tra:
docker --version
docker compose version
```

---

## 1️⃣ Đưa project + file compose lên EC2

### Option A: Clone từ GitHub (Khuyến nghị)

```bash
mkdir -p ~/projects
cd ~/projects

# Clone repo
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>
```

### Option B: Copy files thủ công

```bash
mkdir -p ~/mutrapro
cd ~/mutrapro
```

**Từ máy local, copy files:**

```powershell
# Windows PowerShell
scp docker-compose.prod.hub.yml ec2-user@your-ec2-ip:~/mutrapro/
scp .env ec2-user@your-ec2-ip:~/mutrapro/
scp -r docker/nginx ec2-user@your-ec2-ip:~/mutrapro/docker/
```

**Hoặc tạo trực tiếp trên EC2:**

```bash
# Tạo file docker-compose.prod.hub.yml
nano docker-compose.prod.hub.yml
# Paste nội dung từ file docker-compose.prod.hub.yml

# Tạo thư mục nginx
mkdir -p docker/nginx
nano docker/nginx/nginx.conf
# Paste nội dung nginx config
```

---

## 2️⃣ Tạo file `.env`

Trong thư mục chứa `docker-compose.prod.hub.yml`:

```bash
nano .env
```

**Copy nội dung từ file `env.ready.txt` và điền các giá trị còn thiếu:**

```env
# Docker Hub
DOCKER_HUB_USERNAME=your-dockerhub-username

# Redis (external: Redis Cloud)
REDIS_HOST=redis-11105.c292.ap-southeast-1-1.ec2.redns.redis-cloud.com
REDIS_PORT=11105
REDIS_PASSWORD=your_redis_password

# Kafka (dùng redpanda trong compose)
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Identity DB (Railway)
IDENTITY_DATASOURCE_URL=jdbc:postgresql://hopper.proxy.rlwy.net:48406/railway
IDENTITY_DATASOURCE_USERNAME=postgres
IDENTITY_DATASOURCE_PASSWORD=your_password

# Project DB
PROJECT_DATASOURCE_URL=jdbc:postgresql://shinkansen.proxy.rlwy.net:43102/railway
PROJECT_DATASOURCE_USERNAME=postgres
PROJECT_DATASOURCE_PASSWORD=your_password

# Billing DB
BILLING_DATASOURCE_URL=jdbc:postgresql://tramway.proxy.rlwy.net:31325/railway
BILLING_DATASOURCE_USERNAME=postgres
BILLING_DATASOURCE_PASSWORD=your_password

# Request DB
REQUEST_DATASOURCE_URL=jdbc:postgresql://maglev.proxy.rlwy.net:23806/railway
REQUEST_DATASOURCE_USERNAME=postgres
REQUEST_DATASOURCE_PASSWORD=your_password

# Notification DB
NOTIFICATION_DATASOURCE_URL=jdbc:postgresql://shuttle.proxy.rlwy.net:40496/railway
NOTIFICATION_DATASOURCE_USERNAME=postgres
NOTIFICATION_DATASOURCE_PASSWORD=your_password

# Specialist DB
SPECIALIST_DATASOURCE_URL=jdbc:postgresql://switchyard.proxy.rlwy.net:23349/railway
SPECIALIST_DATASOURCE_USERNAME=postgres
SPECIALIST_DATASOURCE_PASSWORD=your_password

# Chat DB
CHAT_DATASOURCE_URL=jdbc:postgresql://metro.proxy.rlwy.net:31175/railway
CHAT_DATASOURCE_USERNAME=postgres
CHAT_DATASOURCE_PASSWORD=your_password

# AWS S3
AWS_S3_BUCKET_NAME=mutrapro-dev-files
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Mail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_NAME=MuTraPro
FRONTEND_URL=http://your-frontend-url

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://your-frontend-url/authenticate

# Application URLs (QUAN TRỌNG - điền sau khi có EC2 IP)
API_BASE_URL=http://your-ec2-ip
CORS_ALLOWED_ORIGINS=http://your-ec2-ip,http://your-frontend-url
```

**Lưu ý:**
- Không cần khai hết tất cả biến default trong compose
- Chỉ cần những biến **không có default** hoặc bạn muốn override
- File `env.ready.txt` đã có sẵn tất cả giá trị từ dev, chỉ cần điền `API_BASE_URL`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`

---

## 3️⃣ Login Docker Hub trên EC2

Nếu image trên Docker Hub là **private** hoặc bạn muốn chủ động login:

```bash
docker login
# Nhập username + password/PAT
```

---

## 4️⃣ Pull và chạy TẤT CẢ services

Trong thư mục có file compose:

```bash
# Pull toàn bộ images từ Docker Hub
docker compose -f docker-compose.prod.hub.yml pull

# Chạy toàn bộ services ở chế độ background
docker compose -f docker-compose.prod.hub.yml up -d
```

Compose sẽ:
- Start `kafka` (redpanda)
- Start lần lượt `identity-service`, `project-service`, `billing-service`, …
- Start `nginx` và expose port 80

---

## 5️⃣ Kiểm tra trên EC2

```bash
# Xem status tất cả containers
docker compose -f docker-compose.prod.hub.yml ps

# Hoặc
docker ps

# Test nhanh health của services
docker logs -f mutrapro-identity-service
docker logs -f mutrapro-api-gateway
docker logs -f mutrapro-nginx
```

Nếu trong container lên ok, tiếp theo test HTTP:

```bash
# Test qua Nginx
curl http://localhost/actuator/health

# Test trực tiếp API Gateway
curl http://localhost:8080/actuator/health

# Test từng service
curl http://localhost:8081/actuator/health  # Identity
curl http://localhost:8082/actuator/health  # Project
```

---

## 6️⃣ Truy cập từ trình duyệt bên ngoài

Trong AWS Console:
- Vào **EC2 → Instances → chọn instance**
- Tab **Security → Security Groups → Inbound rules**
- Đảm bảo có rule:
  - Type: `HTTP`
  - Port: `80`
  - Source: `0.0.0.0/0`

Sau đó từ máy bạn mở:

```
http://<EC2_PUBLIC_IP>
```

Hoặc test bằng curl:

```bash
curl http://<EC2_PUBLIC_IP>/actuator/health
```

---

## 7️⃣ Update version sau này

Khi bạn build & push image mới (ví dụ `project-service:latest`):

Trên EC2:

```bash
# Pull image mới
docker compose -f docker-compose.prod.hub.yml pull project-service

# Restart service với image mới
docker compose -f docker-compose.prod.hub.yml up -d project-service
```

Hoặc update tất cả:

```bash
docker compose -f docker-compose.prod.hub.yml pull
docker compose -f docker-compose.prod.hub.yml up -d
```

---

## 🔧 Các lệnh hữu ích

### Xem logs

```bash
# Tất cả services
docker compose -f docker-compose.prod.hub.yml logs -f

# Một service cụ thể
docker compose -f docker-compose.prod.hub.yml logs -f api-gateway
```

### Restart services

```bash
# Restart tất cả
docker compose -f docker-compose.prod.hub.yml restart

# Restart một service
docker compose -f docker-compose.prod.hub.yml restart api-gateway
```

### Stop services

```bash
# Stop (giữ containers)
docker compose -f docker-compose.prod.hub.yml stop

# Stop và xóa containers
docker compose -f docker-compose.prod.hub.yml down
```

### Kiểm tra resource usage

```bash
# CPU và Memory
docker stats

# Disk usage
docker system df
```

---

## 🐛 Troubleshooting

### Container không start

```bash
# Xem logs để tìm lỗi
docker compose -f docker-compose.prod.hub.yml logs service-name

# Xem status
docker compose -f docker-compose.prod.hub.yml ps

# Inspect container
docker inspect mutrapro-api-gateway
```

### Lỗi kết nối Database

- Kiểm tra `*_DATASOURCE_URL` trong `.env`
- Kiểm tra Security Group của Railway database có cho phép EC2 IP không

### Lỗi kết nối Redis

- Kiểm tra `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` trong `.env`
- Kiểm tra Redis Cloud có cho phép EC2 IP không

### Container bị restart liên tục

```bash
# Xem logs
docker compose -f docker-compose.prod.hub.yml logs service-name

# Xem events
docker events
```

---

## ✅ Checklist

Sau khi deploy, kiểm tra:

- [ ] Tất cả containers đang chạy (`docker compose ps`)
- [ ] Health checks đều pass (`curl http://localhost/actuator/health`)
- [ ] Có thể truy cập từ bên ngoài (`curl http://your-ec2-ip/actuator/health`)
- [ ] Logs không có lỗi (`docker compose logs`)
- [ ] Database connections OK (kiểm tra logs)
- [ ] Redis connections OK (kiểm tra logs)
- [ ] Kafka connections OK (kiểm tra logs)

---

## 📝 Lưu ý

1. **File `.env`**: Đảm bảo đã điền đầy đủ, đặc biệt là `API_BASE_URL`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`
2. **Docker Hub**: Đảm bảo images đã được push lên Docker Hub trước khi deploy
3. **Security Group**: Đảm bảo đã mở ports 80, 443 trong AWS Security Group
4. **Nginx config**: Đảm bảo đã copy file `docker/nginx/nginx.conf` lên EC2

