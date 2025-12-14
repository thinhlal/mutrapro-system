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

### 2.2.1 Setting up Database

Install PostgreSQL database by following the guidelines link: [Hướng dẫn tải, cài đặt PostgreSQL cực đơn giản, chi tiết](https://www.postgresql.org/download/)

**Hoặc sử dụng Railway (Recommended):**

1. Truy cập https://railway.app và đăng ký tài khoản
2. Tạo 7 PostgreSQL instances (mỗi service 1 database): `identity-db`, `project-db`, `billing-db`, `request-db`, `notification-db`, `specialist-db`, `chat-db`
3. Lấy connection strings từ Railway dashboard và convert sang JDBC format: `jdbc:postgresql://host:port/database`

**Chi tiết:** Xem [RAILWAY_DATABASE_SETUP.md](./deployment/RAILWAY_DATABASE_SETUP.md)

---

### 2.2.2. Setting up Backend API

Install Java JDK 21 by following the guidelines link: [Hướng dẫn tải và cài đặt Java JDK](https://www.oracle.com/java/technologies/downloads/)

**Hoặc sử dụng Maven Wrapper (đã có sẵn trong project):**

1. **Go to mutrapro-system folder:**
   ```
   cd mutrapro-system
   ```

2. **Config your database connection:**

   Mở file `application-dev.yml` của từng service và cấu hình database connection:
   
   Ví dụ: `backend/identity-service/src/main/resources/application-dev.yml`
   ```yaml
   spring:
     datasource:
       url: jdbc:postgresql://your-host:your-port/railway
       username: postgres
       password: your_password
   ```
   
   Lặp lại cho tất cả 7 services: `identity-service`, `project-service`, `billing-service`, `request-service`, `notification-service`, `specialist-service`, `chat-service`

3. **Run Project:**

   **Cách 1: Sử dụng Docker Compose (Recommended):**
   ```bash
   docker compose up -d kafka
   docker compose up -d
   ```

   **Cách 2: Chạy từng service bằng Maven:**
   ```bash
   cd backend/api-gateway
   ./mvnw spring-boot:run
   # ... mở terminal mới cho mỗi service
   ```

4. **Test the project in the browser by going to the URL:**
   - API Gateway Swagger: `http://localhost:8080/swagger-ui.html`
   - Identity Service: `http://localhost:8081/swagger-ui.html`
   - Project Service: `http://localhost:8082/swagger-ui.html`
   - ... (tương tự cho các services khác)

---

### 2.2.3. Setting up Web Application

Download the latest version of NodeJS: [Download link](https://nodejs.org/)

1. **Go to frontend folder:**
   ```
   cd mutrapro-system/frontend
   ```

2. **Run `npm install` in the folder's terminal:**
   ```bash
   npm install
   ```

3. **Run `npm run dev`:**
   ```bash
   npm run dev
   ```

4. **Click on the provided link (the link can be different):**
   ```
   VITE v5.4.10 ready in 4586 ms
   ➜  Local:   http://localhost:5173/
   ```

   Truy cập ứng dụng web tại: `http://localhost:5173/`

---

### 2.2.4 Setting up Mobile Application

1. **Install Expo CLI:**
   ```bash
   npm install -g expo-cli
   ```

2. **Go to mobile folder và chạy:**
   ```bash
   cd mutrapro-system/mobile
   npm install
   npm start
   ```

3. **Scan QR code:**
   - Cài đặt **Expo Go** app trên điện thoại (iOS/Android)
   - Mở app và scan QR code hiển thị trong terminal
   - Hoặc chạy trên emulator/simulator

**Chi tiết:** Xem [SETUP.md](../../mobile/SETUP.md) và [GOOGLE_OAUTH_SETUP.md](../../mobile/GOOGLE_OAUTH_SETUP.md)
