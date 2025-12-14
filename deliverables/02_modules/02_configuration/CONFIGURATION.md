# ⚙️ CẤU HÌNH HỆ THỐNG

## 📋 TỔNG QUAN

File này mô tả cấu hình các thành phần bên trong phần mềm MuTraPro, bao gồm:
- Connection String (Database, Redis, Kafka)
- API Ports
- JWT Token Configuration
- Các cấu hình khác

---

## 🗄️ DATABASE CONFIGURATION

### PostgreSQL Databases (Railway)

Hệ thống sử dụng **Database per Service** pattern với 7 PostgreSQL instances:

| Service | Database URL Format | Username | Password | Mô tả |
|---------|-------------|----------|----------|-------|
| Identity Service | `jdbc:postgresql://your-host:your-port/railway` | `postgres` | `your_password` | Lấy từ Railway dashboard |
| Project Service | `jdbc:postgresql://your-host:your-port/railway` | `postgres` | `your_password` | Lấy từ Railway dashboard |
| Billing Service | `jdbc:postgresql://your-host:your-port/railway` | `postgres` | `your_password` | Lấy từ Railway dashboard |
| Request Service | `jdbc:postgresql://your-host:your-port/railway` | `postgres` | `your_password` | Lấy từ Railway dashboard |
| Notification Service | `jdbc:postgresql://your-host:your-port/railway` | `postgres` | `your_password` | Lấy từ Railway dashboard |
| Specialist Service | `jdbc:postgresql://your-host:your-port/railway` | `postgres` | `your_password` | Lấy từ Railway dashboard |
| Chat Service | `jdbc:postgresql://your-host:your-port/railway` | `postgres` | `your_password` | Lấy từ Railway dashboard |

**Lưu ý:** 
- File `env.prod.example` chỉ chứa template với placeholder
- Bạn cần tạo Railway databases và lấy connection strings thực tế
- Điền các giá trị thực tế vào file `.env` (không commit vào Git)
- Mỗi service có database riêng để đảm bảo tính độc lập

**Cấu hình trong application.yml:**
```yaml
spring:
  datasource:
    url: ${IDENTITY_DATASOURCE_URL}
    username: ${IDENTITY_DATASOURCE_USERNAME}
    password: ${IDENTITY_DATASOURCE_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: update  # Development: tự động tạo schema
      # ddl-auto: validate  # Production: chỉ validate
```

---

## 🔴 REDIS CONFIGURATION

### Redis Cloud

| Tham số | Giá trị |
|---------|---------|
| Host | `your-redis-host.redis-cloud.com` |
| Port | `your_redis_port` |
| Password | `your_redis_password` |

**Lưu ý:** Lấy từ Redis Cloud dashboard sau khi tạo database

**Mục đích:**
- Caching session
- Caching dữ liệu thường dùng
- Rate limiting

**Cấu hình:**
```yaml
spring:
  data:
    redis:
      host: ${REDIS_HOST}
      port: ${REDIS_PORT}
      password: ${REDIS_PASSWORD}
```

---

## 📨 KAFKA CONFIGURATION

### Kafka Bootstrap Servers

| Tham số | Giá trị |
|---------|---------|
| Bootstrap Servers | `kafka:9092` (local) |
| Security Protocol | `PLAINTEXT` (local) |

**Lưu ý:** 
- Development: Sử dụng Redpanda container (tương thích Kafka)
- Production: Có thể sử dụng AWS MSK, Confluent Cloud, hoặc Upstash

**Topics chính:**
- `file-uploaded`
- `contract-events`
- `billing-deposit-paid`
- `billing-milestone-paid`
- `request-events`
- `chat-events`
- `email-verification`
- `password-reset`
- Và nhiều topics khác (xem `env.prod.example`)

**Cấu hình:**
```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:kafka:9092}
    consumer:
      group-id: project-service-file-consumer
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
```

---

## 🔐 JWT TOKEN CONFIGURATION

### JWT Secret

| Tham số | Giá trị |
|---------|---------|
| JWT Secret | `your_jwt_secret_here` (tối thiểu 64 ký tự) |
| Token Valid Duration | `3600` giây (1 giờ) |
| Refreshable Duration | `86400` giây (24 giờ) |

**Lưu ý:**
- JWT Secret phải được giữ bí mật
- Không commit JWT Secret vào Git
- Generate secret: `openssl rand -base64 64`
- Sử dụng biến môi trường để lưu trữ

**Cấu hình:**
```yaml
jwt:
  signerKey: ${JWT_SECRET}
```

---

## 🌐 API PORTS

### Backend Services

| Service | Port | Context Path | Health Check |
|---------|------|--------------|--------------|
| API Gateway | `8080` | `/` | `/actuator/health` |
| Identity Service | `8081` | `/` | `/actuator/health` |
| Project Service | `8082` | `/` | `/actuator/health` |
| Billing Service | `8083` | `/` | `/actuator/health` |
| Request Service | `8084` | `/` | `/actuator/health` |
| Notification Service | `8085` | `/` | `/actuator/health` |
| Specialist Service | `8086` | `/` | `/actuator/health` |
| Chat Service | `8088` | `/` | `/actuator/health` |

### Frontend

| Application | Port | URL |
|-------------|------|-----|
| Web Frontend | `5173` (dev) | `http://localhost:5173` |
| Production | `80/443` | `https://mutrapro.top` |

**Cấu hình trong docker-compose.yml:**
```yaml
services:
  api-gateway:
    ports:
      - "8080:8080"
  identity-service:
    ports:
      - "8081:8081"
  # ... tương tự cho các services khác
```

---

## 📧 EMAIL CONFIGURATION

### SMTP (Gmail)

| Tham số | Giá trị |
|---------|---------|
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | `your_email@gmail.com` |
| Password | `your_gmail_app_password` (App Password, không phải mật khẩu thông thường) |
| From Name | `MuTraPro` |

**Lưu ý:**
- Sử dụng Gmail App Password (không phải mật khẩu thông thường)
- Cần bật "Less secure app access" hoặc sử dụng OAuth2

**Cấu hình:**
```yaml
spring:
  mail:
    host: ${MAIL_HOST}
    port: ${MAIL_PORT}
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
```

---

## ☁️ AWS S3 CONFIGURATION

### S3 Bucket

| Tham số | Giá trị |
|---------|---------|
| Bucket Name | `your-bucket-name` |
| Region | `ap-southeast-1` |
| Access Key ID | `your_aws_access_key_id` |
| Secret Access Key | `your_aws_secret_access_key` |

**Lưu ý:** Lấy từ AWS IAM sau khi tạo IAM user với quyền S3

**Mục đích:**
- Lưu trữ file upload (audio, images, documents)
- Lưu trữ sản phẩm đã hoàn thành

**Cấu hình:**
```yaml
aws:
  s3:
    enabled: true
    bucket-name: ${AWS_S3_BUCKET_NAME}
    region: ${AWS_S3_REGION}
    access-key: ${AWS_ACCESS_KEY_ID}
    secret-key: ${AWS_SECRET_ACCESS_KEY}
```

---

## 🔗 OAUTH CONFIGURATION

### Google OAuth

| Tham số | Giá trị |
|---------|---------|
| Client ID | `your_google_client_id.apps.googleusercontent.com` |
| Client Secret | `your_google_client_secret` |
| Redirect URI | `https://your-domain.com/authenticate` |

**Lưu ý:** Lấy từ Google Cloud Console sau khi tạo OAuth credentials

**Lưu ý:**
- Redirect URI phải khớp với cấu hình trong Google Cloud Console
- Cần cấu hình OAuth consent screen trong Google Cloud Console

**Cấu hình:**
```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            redirect-uri: ${GOOGLE_REDIRECT_URI}
```

---

## 💳 PAYMENT GATEWAY CONFIGURATION

### Sepay

| Tham số | Giá trị |
|---------|---------|
| API Key | `your_sepay_api_key` |
| Account Name | `your_account_name` |
| Account Number | `your_account_number` |
| Bank Code | `your_bank_code` |
| Order Expiry Minutes | `30` |
| Order Prefix | `MTP-TOPUP` |

**Lưu ý:** Lấy từ Sepay dashboard sau khi đăng ký tài khoản

---

## 📊 MONITORING CONFIGURATION

### Grafana Cloud

| Tham số | Giá trị |
|---------|---------|
| Stack ID (Metrics) | `your_stack_id` |
| Prometheus URL | `https://prometheus-prod-XX-prod-ap-southeast-1.grafana.net/api/prom/push` |
| Stack ID (Logs) | `your_logs_id` |
| Loki URL | `https://logs-prod-XXX.grafana.net/loki/api/v1/push` |
| API Token | `your_grafana_api_token` |
| Region | `ap-southeast-1` |

**Lưu ý:** Lấy từ Grafana Cloud dashboard sau khi tạo stack

---

## 🌍 APPLICATION URLs

### Production URLs

| Service | URL |
|---------|-----|
| Frontend | `https://your-domain.com` |
| API Base | `https://api.your-domain.com` |
| CORS Allowed Origins | `https://your-domain.com,https://www.your-domain.com,http://localhost:5173` |

**Lưu ý:** Thay `your-domain.com` bằng domain thực tế hoặc EC2 IP

---

## 📝 CÁCH CẤU HÌNH

### 1. Copy file mẫu

```bash
cp env.prod.example .env
```

### 2. Điền các giá trị

Mở file `.env` và điền các giá trị:
- Database URLs (từ Railway)
- Redis credentials (từ Redis Cloud)
- AWS S3 credentials
- JWT Secret
- Email credentials
- OAuth credentials
- Payment gateway credentials

### 3. Không commit file .env

File `.env` đã được thêm vào `.gitignore` để bảo mật.

---

## ⚠️ LƯU Ý BẢO MẬT

1. **Không commit credentials vào Git**
   - Sử dụng biến môi trường
   - Sử dụng secrets management (AWS Secrets Manager, HashiCorp Vault)

2. **Rotate credentials định kỳ**
   - Đổi mật khẩu database định kỳ
   - Rotate JWT secret
   - Rotate API keys

3. **Sử dụng HTTPS trong production**
   - Cấu hình SSL/TLS certificate
   - Sử dụng Let's Encrypt hoặc AWS Certificate Manager

---

## 📚 TÀI LIỆU THAM KHẢO

- [Hướng dẫn cài đặt](../03_installation_guide/INSTALLATION_GUIDE.md)
- [Railway Database Setup](../../../docs/deployment/RAILWAY_DATABASE_SETUP.md)
- [EC2 Deployment Guide](../../../docs/deployment/EC2_DEPLOY_GUIDE.md)

---

**Cập nhật lần cuối:** [Ngày cập nhật]

