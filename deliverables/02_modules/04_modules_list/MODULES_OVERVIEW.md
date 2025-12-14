# 📦 TỔNG QUAN CÁC MODULE PHẦN MỀM

## 📋 TỔNG QUAN

Hệ thống MuTraPro được xây dựng theo kiến trúc **Microservices** với các module độc lập, mỗi module có database riêng và có thể scale độc lập.

---

## 🏗️ KIẾN TRÚC TỔNG QUAN

```
┌─────────────────┐
│   Frontend Web  │  React + Vite
│   (Port 5173)   │
└────────┬────────┘
         │
┌────────▼────────┐
│   API Gateway   │  Spring Cloud Gateway
│   (Port 8080)   │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
    │         │          │          │          │          │          │          │
┌───▼───┐ ┌──▼───┐ ┌────▼────┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Identity│ │Project│ │ Billing│ │Request│ │Special│ │Notify │ │ Chat  │ │Mobile │
│Service │ │Service│ │Service │ │Service│ │Service│ │Service│ │Service│ │  App  │
│ :8081  │ │ :8082 │ │ :8083  │ │ :8084 │ │ :8086 │ │ :8085 │ │ :8088 │ │Expo   │
└───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───────┘
    │         │          │          │          │          │          │
    └─────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Infrastructure   │
                    │  DB, Redis, Kafka  │
                    └────────────────────┘
```

---

## 🔧 BACKEND SERVICES

### 1. API Gateway
- **Port:** 8080
- **Technology:** Spring Cloud Gateway, Spring Security
- **Chức năng:**
  - Routing requests đến các services
  - Authentication & Authorization (JWT)
  - Rate limiting
  - CORS handling
- **Database:** Không có (stateless)

### 2. Identity Service
- **Port:** 8081
- **Technology:** Spring Boot, Spring Security, JPA
- **Database:** PostgreSQL (identity_db)
- **Chức năng:**
  - User authentication (Local, Google OAuth)
  - User registration & email verification
  - JWT token generation & refresh
  - User profile management
  - Role-based access control (RBAC)
- **Tables:** `users_auth`, `users`, `refresh_tokens`, `email_verifications`

### 3. Project Service
- **Port:** 8082
- **Technology:** Spring Boot, JPA, AWS S3, Kafka
- **Database:** PostgreSQL (project_db)
- **Chức năng:**
  - Contract management (tạo, ký, quản lý)
  - Milestone & installment management
  - Task assignment & tracking
  - Revision requests
  - File upload & delivery
  - Studio booking
  - Equipment management
- **Tables:** `contracts`, `contract_milestones`, `task_assignments`, `revision_requests`, `files`, `studios`, `equipment`

### 4. Billing Service
- **Port:** 8083
- **Technology:** Spring Boot, JPA, Sepay API
- **Database:** PostgreSQL (billing_db)
- **Chức năng:**
  - Wallet management
  - Payment processing (topup, deposit, milestone payment)
  - Transaction history
  - Refund processing
- **Tables:** `wallets`, `wallet_transactions`, `payment_orders`

### 5. Request Service
- **Port:** 8084
- **Technology:** Spring Boot, JPA
- **Database:** PostgreSQL (request_db)
- **Chức năng:**
  - Service request management
  - Catalog management (notation instruments, pricing matrix)
  - Request assignment to specialists
- **Tables:** `service_requests`, `notation_instruments`, `pricing_matrix`

### 6. Notification Service
- **Port:** 8085
- **Technology:** Spring Boot, JPA, Kafka, Gmail SMTP
- **Database:** PostgreSQL (notification_db)
- **Chức năng:**
  - Email notifications
  - In-app notifications
  - Notification templates
- **Tables:** `notifications`

### 7. Specialist Service
- **Port:** 8086
- **Technology:** Spring Boot, JPA
- **Database:** PostgreSQL (specialist_db)
- **Chức năng:**
  - Specialist profile management
  - Skills management
  - Artist demo management
  - Availability management
- **Tables:** `specialists`, `skills`, `specialist_skills`, `artist_demos`

### 8. Chat Service
- **Port:** 8088
- **Technology:** Spring Boot, WebSocket (STOMP), Kafka
- **Database:** PostgreSQL (chat_db)
- **Chức năng:**
  - Real-time chat rooms
  - Message sending & receiving
  - Chat participants management
  - System messages
- **Tables:** `chat_rooms`, `chat_participants`, `chat_messages`

---

## 🎨 FRONTEND APPLICATIONS

### 1. Web Application
- **Technology:** React 19, Vite, Material-UI, Ant Design
- **Port:** 5173 (dev), 80/443 (prod)
- **Chức năng:**
  - User interface cho Customer, Specialist, Manager, Admin
  - Project management dashboard
  - Contract signing (e-signature)
  - File upload & download
  - Real-time chat
  - Payment processing
- **Key Libraries:**
  - React Router DOM
  - Axios
  - Zustand (state management)
  - STOMP.js (WebSocket)
  - Wavesurfer.js (audio player)
  - React-PDF (PDF viewer)

### 2. Mobile Application
- **Technology:** React Native, Expo
- **Platform:** iOS, Android
- **Chức năng:**
  - Mobile interface cho Customer và Specialist
  - Project management
  - Chat
  - File upload/download
  - Push notifications
- **Key Libraries:**
  - React Navigation
  - Expo (AV, File System, Image Picker)
  - Axios
  - Zustand

---

## 🗄️ DATABASE

### PostgreSQL (Railway)
- **7 separate databases** (Database per Service pattern)
- **Auto schema creation** bằng JPA/Hibernate
- **Connection:** JDBC URLs từ Railway

### Redis Cloud
- **Purpose:** Caching, session management
- **Connection:** Redis Cloud hosted

---

## 📨 MESSAGE BROKER

### Kafka/Redpanda
- **Purpose:** Event-driven communication giữa services
- **Topics:** 
  - `file-uploaded`
  - `contract-events`
  - `billing-deposit-paid`
  - `request-events`
  - `chat-events`
  - Và nhiều topics khác

---

## ☁️ EXTERNAL SERVICES

### AWS S3
- **Purpose:** File storage (audio, images, documents)
- **Bucket:** `mutrapro-dev-files`

### Gmail SMTP
- **Purpose:** Email notifications
- **Provider:** Gmail App Password

### Google OAuth
- **Purpose:** Social login
- **Provider:** Google Cloud Console

### Sepay
- **Purpose:** Payment gateway
- **Provider:** Sepay API

### Grafana Cloud
- **Purpose:** Monitoring & logging
- **Services:** Prometheus (metrics), Loki (logs)

---

## 📦 DEPLOYMENT

### Docker
- **Containerization:** Tất cả services được containerized
- **Docker Compose:** Local development
- **Docker Hub:** Production images
- **Docker Compose Production:** Deploy với `docker-compose.prod.hub.yml`

---

## 🔗 INTER-SERVICE COMMUNICATION

1. **Synchronous:** REST API calls (HTTP)
2. **Asynchronous:** Kafka events
3. **Real-time:** WebSocket (Chat Service)

---

## 📊 MONITORING & LOGGING

- **Metrics:** Prometheus + Grafana Cloud
- **Logs:** Loki + Grafana Cloud
- **Health Checks:** Spring Boot Actuator

---

## 🔐 SECURITY

- **Authentication:** JWT tokens
- **Authorization:** Role-based (RBAC)
- **API Gateway:** Centralized authentication
- **HTTPS:** SSL/TLS trong production

---

## 📝 TÀI LIỆU THAM KHẢO

- [Cấu hình hệ thống](../02_configuration/CONFIGURATION.md)
- [Dịch vụ bên thứ 3](../02_configuration/THIRD_PARTY_APIS.md)
- [Hướng dẫn cài đặt](../03_installation_guide/INSTALLATION_GUIDE.md)
- [Database Scripts](../01_database_scripts/)

---

**Cập nhật lần cuối:** [Ngày cập nhật]

