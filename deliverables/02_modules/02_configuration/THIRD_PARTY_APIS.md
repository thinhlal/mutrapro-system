# 🔌 CẤU HÌNH DỊCH VỤ BÊN THỨ 3 (3RD PARTY APIs)

## 📋 TỔNG QUAN

File này mô tả các dịch vụ bên thứ 3 được sử dụng trong hệ thống MuTraPro và cách cấu hình chúng.

---

## 🗄️ DATABASE SERVICES

### Railway PostgreSQL

**Mô tả:** Platform-as-a-Service cung cấp PostgreSQL databases

**URL:** https://railway.app

**Cấu hình:**
- 7 PostgreSQL instances (mỗi service 1 database)
- Tự động backup
- High availability

**Connection String Format:**
```
jdbc:postgresql://[host]:[port]/railway
```

**Tài liệu:** [RAILWAY_DATABASE_SETUP.md](../../../docs/deployment/RAILWAY_DATABASE_SETUP.md)

---

## 🔴 CACHING SERVICE

### Redis Cloud

**Mô tả:** Managed Redis service cho caching và session management

**URL:** https://redis.com/cloud

**Cấu hình:**
- Host: `your-redis-host.redis-cloud.com` (lấy từ Redis Cloud dashboard)
- Port: `your_redis_port` (lấy từ Redis Cloud dashboard)
- Password: `your_redis_password` (lấy từ Redis Cloud dashboard)

**Mục đích:**
- Session caching
- Rate limiting
- Temporary data storage

---

## 📨 MESSAGE BROKER

### Kafka (Redpanda)

**Mô tả:** Message broker cho event-driven architecture

**Development:** Redpanda container (Kafka-compatible)

**Production Options:**
- AWS MSK (Amazon Managed Streaming for Apache Kafka)
- Confluent Cloud
- Upstash Kafka

**Cấu hình:**
- Bootstrap Servers: `kafka:9092` (local)
- Topics: Xem danh sách trong `env.prod.example`

---

## ☁️ OBJECT STORAGE

### AWS S3

**Mô tả:** Object storage cho file uploads (audio, images, documents)

**URL:** https://aws.amazon.com/s3/

**Cấu hình:**
- Bucket: `your-bucket-name` (tạo trong AWS S3 Console)
- Region: `ap-southeast-1`
- Access Key ID: `your_aws_access_key_id` (lấy từ AWS IAM)
- Secret Access Key: `your_aws_secret_access_key` (lấy từ AWS IAM)

**Mục đích:**
- Lưu trữ file audio upload
- Lưu trữ hình ảnh
- Lưu trữ documents (contracts, invoices)
- Lưu trữ sản phẩm đã hoàn thành

**Cấu trúc thư mục:**
```
mutrapro-dev-files/
├── audio/
│   ├── uploads/
│   └── projects/
├── images/
│   ├── profiles/
│   └── projects/
└── documents/
    ├── contracts/
    └── invoices/
```

---

## 📧 EMAIL SERVICE

### Gmail SMTP

**Mô tả:** Email service cho notifications

**URL:** https://mail.google.com

**Cấu hình:**
- Host: `smtp.gmail.com`
- Port: `587`
- Username: `your_email@gmail.com` (Gmail account của bạn)
- Password: `your_gmail_app_password` (App Password, không phải mật khẩu thông thường)

**Lưu ý:**
- Cần tạo App Password trong Google Account
- Không sử dụng mật khẩu thông thường

**Hướng dẫn tạo App Password:**
1. Vào Google Account → Security
2. Bật 2-Step Verification
3. Tạo App Password cho "Mail"
4. Sử dụng App Password trong cấu hình

---

## 🔐 OAUTH PROVIDER

### Google OAuth 2.0

**Mô tả:** OAuth provider cho đăng nhập bằng Google

**URL:** https://console.cloud.google.com

**Cấu hình:**
- Client ID: `your_google_client_id.apps.googleusercontent.com` (lấy từ Google Cloud Console)
- Client Secret: `your_google_client_secret` (lấy từ Google Cloud Console)
- Redirect URI: `https://your-domain.com/authenticate` (phải khớp với cấu hình trong Google Cloud Console)

**Tài liệu:** 
- [GOOGLE_OAUTH_SETUP.md](../../../mobile/GOOGLE_OAUTH_SETUP.md)
- [GOOGLE_CLOUD_CONSOLE_SETUP.md](../../../mobile/GOOGLE_CLOUD_CONSOLE_SETUP.md)

**OAuth Scopes:**
- `openid`
- `profile`
- `email`

---

## 💳 PAYMENT GATEWAY

### Sepay

**Mô tả:** Payment gateway cho thanh toán trực tuyến

**URL:** https://sepay.vn (hoặc URL thực tế)

**Cấu hình:**
- API Key: `your_sepay_api_key` (lấy từ Sepay dashboard)
- Account Name: `your_account_name`
- Account Number: `your_account_number`
- Bank Code: `your_bank_code`
- Order Expiry Minutes: `30`
- Order Prefix: `MTP-TOPUP`

**Tính năng:**
- Thanh toán nạp tiền
- Thanh toán deposit
- Thanh toán milestone
- Hoàn tiền (refund)

---

## 📊 MONITORING & LOGGING

### Grafana Cloud

**Mô tả:** Monitoring và logging platform

**URL:** https://grafana.com/cloud

**Cấu hình:**

#### Metrics (Prometheus)
- Stack ID: `your_stack_id` (lấy từ Grafana Cloud dashboard)
- Prometheus URL: `https://prometheus-prod-XX-prod-ap-southeast-1.grafana.net/api/prom/push` (lấy từ Grafana Cloud)
- API Token: `your_grafana_api_token` (tạo trong Grafana Cloud)

#### Logs (Loki)
- Stack ID: `your_logs_id` (lấy từ Grafana Cloud dashboard)
- Loki URL: `https://logs-prod-XXX.grafana.net/loki/api/v1/push` (lấy từ Grafana Cloud)
- API Token: `your_grafana_api_token` (dùng chung với Metrics)

**Region:** `ap-southeast-1`

**Mục đích:**
- Metrics collection (CPU, Memory, Request rate, etc.)
- Log aggregation
- Alerting
- Dashboards

---

## 🚀 DEPLOYMENT PLATFORM

### Docker Hub

**Mô tả:** Container registry

**URL:** https://hub.docker.com

**Cấu hình:**
- Username: `your-dockerhub-username` (username Docker Hub của bạn)
- Images được push lên Docker Hub để deploy

**Images:**
- `thinhlal273/api-gateway:latest`
- `thinhlal273/identity-service:latest`
- `thinhlal273/project-service:latest`
- `thinhlal273/billing-service:latest`
- `thinhlal273/request-service:latest`
- `thinhlal273/notification-service:latest`
- `thinhlal273/specialist-service:latest`
- `thinhlal273/chat-service:latest`

---

## 📱 MOBILE APP SERVICES

### Expo

**Mô tả:** Platform cho React Native development

**URL:** https://expo.dev

**Cấu hình:**
- Expo SDK version: Xem `mobile/app.json`
- OAuth: Google OAuth (xem [GOOGLE_OAUTH_SETUP.md](../../../mobile/GOOGLE_OAUTH_SETUP.md))

---

## 🔧 CÁCH CẤU HÌNH

### 1. Tạo tài khoản cho các dịch vụ

- Railway: https://railway.app
- Redis Cloud: https://redis.com/cloud
- AWS: https://aws.amazon.com
- Google Cloud: https://console.cloud.google.com
- Grafana Cloud: https://grafana.com/cloud
- Docker Hub: https://hub.docker.com

### 2. Lấy credentials

- Database URLs từ Railway dashboard
- Redis credentials từ Redis Cloud dashboard
- AWS credentials từ IAM
- Google OAuth từ Google Cloud Console
- Grafana API token từ Grafana Cloud

### 3. Cấu hình trong file .env

Copy `env.prod.example` thành `.env` và điền các giá trị.

---

## ⚠️ LƯU Ý

1. **Bảo mật credentials:**
   - Không commit credentials vào Git
   - Sử dụng environment variables
   - Rotate credentials định kỳ

2. **Cost management:**
   - Monitor usage của các dịch vụ
   - Sử dụng free tier khi có thể
   - Set up billing alerts

3. **Backup:**
   - Railway tự động backup databases
   - Backup S3 bucket định kỳ
   - Backup configuration files

---

## 📚 TÀI LIỆU THAM KHẢO

- [Hướng dẫn cài đặt](../03_installation_guide/INSTALLATION_GUIDE.md)
- [Cấu hình hệ thống](./CONFIGURATION.md)
- [Railway Database Setup](../../../docs/deployment/RAILWAY_DATABASE_SETUP.md)

---

**Cập nhật lần cuối:** [Ngày cập nhật]

