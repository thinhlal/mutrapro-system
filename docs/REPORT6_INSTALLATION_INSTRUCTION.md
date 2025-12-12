## 2.2 Installation Instruction

### 2.2.1 Prerequisites

- **Server (EC2):** Ubuntu 20.04+, Docker 20.10+, Docker Compose 2.0+, Port 80/443 mở
- **External Services:** Railway PostgreSQL (7 instances), Redis Cloud, AWS S3, Gmail SMTP, Google OAuth
- **Docker Hub Account:** Để push/pull images

---

### 2.2.2 Installation Steps

#### **Step 1: Setup Server**

```bash
# Cài Docker
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Clone project
mkdir -p ~/projects && cd ~/projects
git clone https://github.com/thinhlal/mutrapro-system.git
cd mutrapro-system
```

#### **Step 2: Configure Database**

Tạo 7 PostgreSQL instances trên Railway, lấy connection strings và lưu vào `.env`. Xem chi tiết: [RAILWAY_DATABASE_SETUP.md](./deployment/RAILWAY_DATABASE_SETUP.md)

#### **Step 3: Configure Environment Variables**

```bash
cp env.prod.example .env
nano .env
```

Điền các biến: Database URLs (7 services), Redis, Kafka, JWT, AWS S3, Mail, OAuth, API URLs. Xem `env.prod.example` để biết đầy đủ.

#### **Step 4: Build và Push Images (Local)**

```bash
docker login
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1
```

#### **Step 5: Deploy trên EC2**

```bash
docker login
docker compose -f docker-compose.prod.hub.yml pull
docker compose -f docker-compose.prod.hub.yml up -d
docker compose -f docker-compose.prod.hub.yml ps
curl http://localhost/actuator/health
```

#### **Step 6: Configure AWS Security Group**

Mở ports trong AWS Console: HTTP (80), HTTPS (443), SSH (22) - chỉ cho phép IP của bạn.

#### **Step 7: Verify**

```bash
curl http://localhost/actuator/health
curl http://your-ec2-public-ip/actuator/health
```

---

### 2.2.3 Update Services

Khi có code mới:
1. **Local:** `powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1`
2. **EC2:** `docker compose -f docker-compose.prod.hub.yml pull && docker compose -f docker-compose.prod.hub.yml up -d`
