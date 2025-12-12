# 🚂 Railway Database Setup Guide
## MuTraPro System - PostgreSQL Database Configuration

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Database Provider:** Railway (https://railway.app)  
**Database Engine:** PostgreSQL 19

---

## 📋 **Table of Contents**

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Railway Account Setup](#3-railway-account-setup)
4. [Database Provisioning](#4-database-provisioning)
5. [Connection Configuration](#5-connection-configuration)
6. [Application Integration](#6-application-integration)
7. [Security Best Practices](#7-security-best-practices)

---

## **1. Overview**

### **1.1 About Railway**

Railway is a modern Platform-as-a-Service (PaaS) that provides:
- Managed PostgreSQL databases
- Automatic backups
- High availability
- Easy scaling
- Simple deployment workflow

### **1.2 MuTraPro Database Architecture**

MuTraPro uses **microservices architecture** with separate databases for each service:

| Service | Database Name | Purpose |
|---------|--------------|---------|
| Identity Service | `identity_db` | User authentication, roles, permissions |
| Project Service | `project_db` | Projects, contracts, milestones |
| Specialist Service | `specialist_db` | Specialist profiles, skills, availability |
| Billing Service | `billing_db` | Payments, invoices, transactions |
| Request Service | `request_db` | Booking requests, schedules |
| Chat Service | `chat_db` | Messages, conversations |
| Notification Service | `notification_db` | Notifications, emails, push messages |

**Note:** Railway can host either:
- **Option A:** Single shared PostgreSQL instance with multiple databases
- **Option B:** Separate PostgreSQL instances per service (recommended for production)

For development/testing, we use **Option B** (separate instances per service for better isolation).

---

## **2. Prerequisites**

Before starting, ensure you have:

### **2.1 Accounts & Access**
- ✅ Railway account (sign up at https://railway.app)
- ✅ GitHub account (for Railway integration)
- ✅ Credit card (Railway requires for verification, offers free tier)

### **2.2 Local Tools**
- ✅ PostgreSQL client (`psql`) installed
- ✅ Terminal/Command Prompt
- ✅ Text editor for configuration files

### **2.3 Project Files**
- ✅ Application source code (backend services)
- ✅ Environment configuration file (`env.prod.example`)

---

## **3. Railway Account Setup**

### **Step 1: Create Railway Account**

1. Navigate to **https://railway.app**
2. Click **"Login"** or **"Get Started"**
3. Sign up using:
   - GitHub account (recommended)
   - Email address

### **Step 2: Verify Account**

1. Check email for verification link
2. Complete profile setup
3. Add payment method (for verification)
   - Railway offers **$5 free credit/month**
   - PostgreSQL costs ~$5-20/month depending on usage

### **Step 3: Create New Project**

1. Click **"New Project"** on Railway dashboard
2. Project name: `mutrapro-system`
3. Click **"Create"**

---

## **4. Database Provisioning**

### **Step 1: Add PostgreSQL Service**

1. Inside your project, click **"New"** → **"Database"**
2. Select **"PostgreSQL"**
3. Railway will provision a new PostgreSQL instance (takes 30-60 seconds)

### **Step 2: Wait for Provisioning**

You'll see:
```
✅ PostgreSQL service created
✅ Credentials generated
✅ Database ready
```

### **Step 3: Access Database Information**

1. Click on the **PostgreSQL service** in your project
2. Go to **"Variables"** tab
3. You'll see these environment variables:

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@containers-us-west-xyz.railway.app:5432/railway
PGHOST=containers-us-west-xyz.railway.app
PGPORT=5432
PGUSER=postgres
PGPASSWORD=xxxxxxxxxxxxxxxxxxxx
PGDATABASE=railway
```

**Important:** Save these credentials securely!

### **Step 4: Create Multiple Database Instances**

For MuTraPro, you need **7 separate PostgreSQL instances** (one per service):

1. **Identity Service Database**
   - Click "New" → "Database" → "PostgreSQL"
   - Name: `identity-db` (or `identity-service-db`)

2. **Project Service Database**
   - Repeat for: `project-db`

3. **Specialist Service Database**
   - Repeat for: `specialist-db`

4. **Billing Service Database**
   - Repeat for: `billing-db`

5. **Request Service Database**
   - Repeat for: `request-db`

6. **Chat Service Database**
   - Repeat for: `chat-db`

7. **Notification Service Database**
   - Repeat for: `notification-db`

**Note:** Each service gets its own isolated PostgreSQL instance for better security and scalability.

---

## **5. Connection Configuration**

### **5.1 Get Connection String**

Railway provides the **DATABASE_URL** in this format:

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

**Example:**
```
postgresql://postgres:mYs3cR3tP@ssw0rd@containers-us-west-123.railway.app:5432/railway
```

### **5.2 Test Connection Locally**

```bash
# Method 1: Using DATABASE_URL
export DATABASE_URL="postgresql://postgres:mYs3cR3tP@ssw0rd@containers-us-west-123.railway.app:5432/railway"
psql $DATABASE_URL

# Method 2: Using individual parameters
psql -h containers-us-west-123.railway.app \
     -p 5432 \
     -U postgres \
     -d railway

# You'll be prompted for password
Password: mYs3cR3tP@ssw0rd
```

If successful, you'll see:
```
psql (15.4)
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256)
Type "help" for help.

railway=>
```

✅ **Connection successful!**

### **5.3 Extract Connection Details for Each Service**

For MuTraPro, you'll have 7 different connection strings. Extract them from Railway dashboard:

**Example from `env.prod.example`:**

```bash
# Identity Service Database
IDENTITY_DATASOURCE_URL=jdbc:postgresql://hopper.proxy.rlwy.net:48406/railway
IDENTITY_DATASOURCE_USERNAME=postgres
IDENTITY_DATASOURCE_PASSWORD=bQcviWDzROOzrDMkWqjudyTPVugqydQd

# Project Service Database
PROJECT_DATASOURCE_URL=jdbc:postgresql://shinkansen.proxy.rlwy.net:43102/railway
PROJECT_DATASOURCE_USERNAME=postgres
PROJECT_DATASOURCE_PASSWORD=WEMkCGvTPJngCDSicuOItQDUsKCQRUDA

# ... (other services)
```

---

## **6. Application Integration**

### **6.1 Automatic Schema Creation**

**Important:** MuTraPro backend services **automatically create database schema** when they start up. You don't need to manually run SQL scripts.

The schema is created using one of these methods:

**JPA/Hibernate Auto DDL** (Development)
```yaml
# application-dev.yml
spring:
  jpa:
    hibernate:
      ddl-auto: update  # Automatically creates/updates tables
```


**How it works:**
1. When you start a Spring Boot service, it connects to Railway database
2. Hibernate automatically detects schema changes
3. Tables are created/updated automatically
4. No manual SQL scripts needed!

### **6.2 Configure Spring Boot Services**

**Using Railway Connection Strings:**

```yaml
# src/main/resources/application.yml
spring:
  datasource:
    url: ${IDENTITY_DATASOURCE_URL}
    username: ${IDENTITY_DATASOURCE_USERNAME}
    password: ${IDENTITY_DATASOURCE_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate  # Don't auto-create schema
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
```

### **6.3 Environment Variables**

Use the provided `env.prod.example` file:

```bash
# Copy example file
cp env.prod.example .env

# Edit .env with your Railway credentials
# All database URLs are already configured for Railway
```

**Example from `env.prod.example`:**

```bash
# Identity Service Database
IDENTITY_DATASOURCE_URL=jdbc:postgresql://hopper.proxy.rlwy.net:48406/railway
IDENTITY_DATASOURCE_USERNAME=postgres
IDENTITY_DATASOURCE_PASSWORD=bQcviWDzROOzrDMkWqjudyTPVugqydQd

# Project Service Database
PROJECT_DATASOURCE_URL=jdbc:postgresql://shinkansen.proxy.rlwy.net:43102/railway
PROJECT_DATASOURCE_USERNAME=postgres
PROJECT_DATASOURCE_PASSWORD=WEMkCGvTPJngCDSicuOItQDUsKCQRUDA

# ... (other services)
```

### **6.4 Docker Compose Configuration**

MuTraPro uses two Docker Compose files for production:

**Option 1: Docker Hub Images** (`docker-compose.prod.hub.yml`)
- Uses pre-built images from Docker Hub
- Faster deployment, no need to build locally

**Option 2: Local Build** (`docker-compose.prod.yml`)
- Builds images from source code
- More control over build process

**Configuration Example:**

```yaml
# docker-compose.prod.hub.yml or docker-compose.prod.yml
version: '3.8'

services:
  identity-service:
    image: mutrapro/identity-service:latest  # For hub version
    # build: .  # For local build version
    environment:
      - IDENTITY_DATASOURCE_URL=${IDENTITY_DATASOURCE_URL}
      - IDENTITY_DATASOURCE_USERNAME=${IDENTITY_DATASOURCE_USERNAME}
      - IDENTITY_DATASOURCE_PASSWORD=${IDENTITY_DATASOURCE_PASSWORD}
    ports:
      - "8080:8080"

  project-service:
    image: mutrapro/project-service:latest
    environment:
      - PROJECT_DATASOURCE_URL=${PROJECT_DATASOURCE_URL}
      - PROJECT_DATASOURCE_USERNAME=${PROJECT_DATASOURCE_USERNAME}
      - PROJECT_DATASOURCE_PASSWORD=${PROJECT_DATASOURCE_PASSWORD}
    ports:
      - "8082:8082"
  
  # ... other services
```

**Run with Docker Hub images:**
```bash
docker-compose -f docker-compose.prod.hub.yml --env-file .env up -d
```

**Run with local build:**
```bash
docker-compose -f docker-compose.prod.yml --env-file .env up -d
```

---

## **7. Security Best Practices**

### **7.1 Credential Management**

✅ **DO:**
- Store credentials in environment variables
- Use `.env` file locally (add to `.gitignore`)
- Use Railway's built-in secrets for production
- Rotate passwords regularly (every 3-6 months)
- Use strong passwords (20+ characters, mixed case, numbers, symbols)

❌ **DON'T:**
- Commit credentials to Git
- Share credentials via email/Slack
- Use default passwords
- Reuse passwords across environments
---

## **Document Change Log**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-12-12 | 1.0 | MuTraPro Team | Initial version |

---

**End of Railway Database Setup Guide**
