# Capstone Project Report

# Report 6 – Software User Guides

**Project:** MuTraPro - Custom Music Transcription and Production System

**Version:** 3.0

**Team:** [Tên nhóm]

**Date:** [Ngày hoàn thành]

---

## Table of Contents

I. Record of Changes	3

II. Release Package & User Guides	4

1. Deliverable Package	4

2. Installation Guides	4

2.1 System Requirements	4

2.2 Installation Instruction	4

3. User Manual	4

3.1 Overview	4

3.2 Workflow 1: Transcription Service	5

3.3 Workflow 2: Arrangement with Recording Service	12

3.4 Workflow 3: Recording Service (Studio Booking)	19

---

## I. Record of Changes

| Date | A/M/D* | In charge | Change Description |
|------|--------|-----------|-------------------|
| [DD/MM/YYYY] | A | [Người phụ trách] | Initial version of Report 6 - Software User Guides |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

*A - Added  M - Modified  D - Deleted

---

## II. Release Package & User Guides

### 1. Deliverable Package

| No. | Deliverable Item | Description | Version |
|-----|-----------------|-------------|---------|
| 1 | Project Schedule/Tracking | Project timeline and task tracking documents | v3.0 |
| 2 | Project Backlog | Product backlog with user stories and features | v3.0 |
| 3 | Source Codes | Backend services (Java Spring Boot), Frontend (React), Mobile (React Native) | v3.0 |
| 4 | Database Script(s) | SQL scripts for all microservices databases | v3.0 |
| 5 | Final Report Document | Complete project documentation | v3.0 |
| 6 | Test Cases Document | Unit tests, integration tests, E2E tests | v3.0 |
| 7 | Defects List | Bug tracking and resolution list | v3.0 |
| 8 | Issues List | Known issues and limitations | v3.0 |
| 9 | Slide | Presentation slides for project demo | v3.0 |
| 10 | API Documentation | Swagger/OpenAPI documentation for all services | v3.0 |
| 11 | Docker Images | Docker images for all microservices | v3.0 |
| 12 | Deployment Guides | EC2 deployment guides and scripts | v3.0 |

---

### 2. Installation Guides

#### 2.1 System Requirements

##### **Backend Services Requirements:**

- **Operating System:** Linux (Ubuntu 20.04+), Windows 10+, macOS 10.15+
- **Java:** JDK 17 or higher
- **Build Tool:** Maven 3.8+
- **Container:** Docker 20.10+ and Docker Compose 2.0+
- **Database:** PostgreSQL 15+ (hoặc sử dụng Railway Cloud Database)
- **Message Broker:** Kafka/Redpanda (có thể chạy qua Docker)
- **Cache:** Redis 7+ (hoặc Redis Cloud)

##### **Frontend Requirements:**

- **Node.js:** v18.0+ or higher
- **Package Manager:** npm 9.0+ or yarn 1.22+
- **Browser:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

##### **Mobile App Requirements:**

- **Node.js:** v18.0+ or higher
- **React Native:** 0.72+
- **Android:** Android SDK 33+
- **iOS:** Xcode 14+ (chỉ cho macOS)

##### **Deployment Requirements (Production):**

- **Cloud Provider:** AWS EC2 instance (t2.medium hoặc cao hơn)
- **RAM:** Minimum 4GB, Recommended 8GB+
- **Storage:** Minimum 20GB SSD
- **Network:** Internet connection với bandwidth ổn định
- **Ports:** 80 (HTTP), 443 (HTTPS), 22 (SSH)

---

#### 2.2 Installation Instruction

##### **2.2.1 Local Development Setup**

###### **Bước 1: Clone Repository**

```bash
git clone https://github.com/<your-org>/mutrapro-system.git
cd mutrapro-system
```

###### **Bước 2: Cấu hình Backend**

**Cài đặt dependencies và build:**

```bash
# Build tất cả backend services
cd backend
mvn clean install -DskipTests

# Hoặc build từng service
cd backend/identity-service
mvn clean install
```

**Cấu hình environment variables:**

Tạo file `.env` trong thư mục root:

```env
# Database configurations
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/mutrapro
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
```

###### **Bước 3: Chạy Infrastructure Services (Docker Compose)**

```bash
# Khởi động PostgreSQL, Redis, Kafka
docker-compose up -d postgres redis kafka

# Kiểm tra services đang chạy
docker-compose ps
```

###### **Bước 4: Chạy Backend Services**

**Chạy từng service riêng lẻ:**

```bash
# Identity Service
cd backend/identity-service
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# API Gateway
cd backend/api-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Project Service
cd backend/project-service
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# ... các service khác tương tự
```

**Hoặc chạy tất cả bằng Docker Compose:**

```bash
# Build và chạy tất cả services
docker-compose up --build
```

###### **Bước 5: Cấu hình và Chạy Frontend**

```bash
cd frontend

# Cài đặt dependencies
npm install

# Tạo file .env
cp .env.example .env

# Chỉnh sửa .env với API URL
REACT_APP_API_URL=http://localhost:8080

# Chạy development server
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

###### **Bước 6: Chạy Mobile App (Optional)**

```bash
cd mobile

# Cài đặt dependencies
npm install

# Chạy trên Android
npx expo start --android

# Chạy trên iOS (chỉ macOS)
npx expo start --ios
```

##### **2.2.2 Production Deployment on EC2**

Xem chi tiết trong file: `docs/deployment/EC2_BUILD_AND_RUN.md`

**Tóm tắt các bước:**

1. **Build và Push Docker Images (Local):**
```bash
# Đăng nhập Docker Hub
docker login

# Build và push tất cả images
powershell -ExecutionPolicy Bypass -File scripts/build-and-push.ps1
```

2. **Deploy trên EC2:**
```bash
# SSH vào EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Pull images và chạy services
cd ~/mutrapro
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d
```

3. **Cấu hình AWS Security Group:**
   - Mở port 80 (HTTP)
   - Mở port 443 (HTTPS)
   - Mở port 22 (SSH) - chỉ cho phép IP của bạn

---

### 3. User Manual

#### 3.1 Overview

##### **Giới thiệu về MuTraPro:**

MuTraPro là hệ thống quản lý dịch vụ ký âm nhạc và sản xuất âm nhạc tùy chỉnh. Hệ thống cho phép khách hàng đặt yêu cầu dịch vụ, quản lý hợp đồng, theo dõi tiến độ công việc và thanh toán trực tuyến.

##### **Các tính năng chính:**

1. **Quản lý Service Requests:** Khách hàng có thể tạo yêu cầu dịch vụ (transcription, arrangement, recording)
2. **Contract Management:** Quản lý hợp đồng và milestones
3. **Task Assignment:** Phân công công việc cho specialists
4. **File Management:** Upload, download và quản lý files
5. **Payment Integration:** Thanh toán trực tuyến qua ví điện tử
6. **Real-time Chat:** Chat giữa customer, manager và specialist
7. **Studio Booking:** Đặt chỗ studio cho dịch vụ recording
8. **Notifications:** Thông báo real-time về tiến độ công việc

##### **Các vai trò người dùng:**

- **Customer:** Khách hàng sử dụng dịch vụ
- **Manager:** Quản lý dự án và workflow
- **Transcription Specialist:** Chuyên gia ký âm nhạc
- **Arrangement Specialist:** Chuyên gia sắp xếp nhạc
- **Recording Artist:** Nghệ sĩ thu âm
- **System Admin:** Quản trị hệ thống

##### **Sơ đồ tổng quan hệ thống:**

```
┌─────────────────────────────────────────────────────────┐
│                    MuTraPro System                       │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │   Customer   │    │   Manager    │                   │
│  │              │    │              │                   │
│  │ • Tạo yêu cầu│    │ • Tạo hợp đồng│                  │
│  │ • Upload file│    │ • Phân task  │                  │
│  │ • Thanh toán │    │ • Duyệt file │                  │
│  └──────────────┘    └──────────────┘                   │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │Transcription │    │ Arrangement  │                   │
│  │  Specialist  │    │  Specialist  │                   │
│  │              │    │              │                   │
│  │ • Nhận task  │    │ • Sắp xếp nhạc│                  │
│  │ • Ký âm      │    │ • Upload file│                  │
│  │ • Upload file│    │              │                  │
│  └──────────────┘    └──────────────┘                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

#### 3.2 Workflow 1: Transcription Service

##### **3.2.1 Mục đích:**

Workflow này mô tả quy trình từ khi khách hàng tạo yêu cầu dịch vụ ký âm nhạc (transcription) cho đến khi hoàn thành và thanh toán.

##### **3.2.2 Sơ đồ Workflow:**

```
Customer tạo Service Request
    ↓
Upload file audio
    ↓
Chọn nhạc cụ ký âm
    ↓
Manager xem và assign request
    ↓
Manager tạo Contract
    ↓
Customer ký hợp đồng và thanh toán cọc
    ↓
Manager phân task cho Transcription Specialist
    ↓
Specialist nhận task và thực hiện ký âm
    ↓
Specialist upload file notation
    ↓
Manager duyệt và gửi file cho Customer
    ↓
Customer xem file và phản hồi
    ↓
[Nếu cần revision → Quay lại bước Specialist]
    ↓
Customer chấp nhận và thanh toán phần còn lại
    ↓
Hoàn thành
```

##### **3.2.3 Hướng dẫn chi tiết từng bước:**

###### **Bước 1: Customer đăng nhập vào hệ thống**

1. Mở trình duyệt và truy cập: `http://your-domain.com`
2. Click vào nút **"Đăng nhập"** ở góc phải trên
3. Nhập email và mật khẩu
4. Click **"Đăng nhập"**

![Login Page](screenshots/login-page.png)

**Lưu ý:** Nếu chưa có tài khoản, click **"Đăng ký"** để tạo tài khoản mới.

###### **Bước 2: Customer tạo Service Request**

1. Sau khi đăng nhập, click vào menu **"Dịch vụ"** hoặc **"Tạo yêu cầu"**
2. Chọn loại dịch vụ: **"Ký âm nhạc (Transcription)"**
3. Điền thông tin yêu cầu:
   - **Tiêu đề:** Nhập tiêu đề cho yêu cầu (ví dụ: "Ký âm bài ABC")
   - **Mô tả:** Mô tả chi tiết yêu cầu
   - **Tên liên hệ:** Tên người liên hệ
   - **Số điện thoại:** Số điện thoại liên hệ
   - **Email:** Email liên hệ
4. Chọn **nhạc cụ** cần ký âm (ví dụ: Piano, Guitar)
5. Điều chỉnh **tempo** nếu cần (ví dụ: chậm 20%)

![Create Request](screenshots/create-request.png)

###### **Bước 3: Customer upload file audio**

1. Trong form tạo request, scroll xuống phần **"Upload Files"**
2. Click **"Chọn file"** hoặc kéo thả file vào
3. Chọn file audio (định dạng: MP3, WAV, M4A)
4. File sẽ được upload lên server
5. Xem preview file đã upload thành công

![Upload File](screenshots/upload-file.png)

**Lưu ý:**
- Kích thước file tối đa: 100MB
- Định dạng hỗ trợ: MP3, WAV, M4A, FLAC
- Có thể upload nhiều file

###### **Bước 4: Customer gửi yêu cầu**

1. Kiểm tra lại thông tin đã nhập
2. Click nút **"Gửi yêu cầu"**
3. Hệ thống hiển thị thông báo **"Yêu cầu đã được gửi thành công"**
4. Yêu cầu sẽ có trạng thái **"Pending"** (đang chờ xử lý)

###### **Bước 5: Manager xem và assign request**

1. Manager đăng nhập với tài khoản Manager
2. Vào menu **"Quản lý yêu cầu"** hoặc **"Service Requests"**
3. Xem danh sách các yêu cầu đang chờ (status = Pending)
4. Click vào yêu cầu cần xử lý để xem chi tiết
5. Review thông tin và file đã upload
6. Click nút **"Assign to Me"** để nhận xử lý yêu cầu này

![Manager Assign Request](screenshots/manager-assign.png)

###### **Bước 6: Manager tạo Contract**

1. Sau khi assign request, click nút **"Tạo hợp đồng"**
2. Hệ thống tự động điền một số thông tin:
   - Contract Type: Transcription
   - Total Price: Từ pricing matrix
   - SLA Days: 7 ngày (mặc định)
   - Deposit Percent: 40%
3. Manager có thể điều chỉnh:
   - Total Price
   - SLA Days
   - Terms and Conditions
   - Expected Start Date
4. Click **"Tạo hợp đồng"**
5. Hợp đồng được tạo với status = **"Draft"**

![Create Contract](screenshots/create-contract.png)

###### **Bước 7: Manager gửi hợp đồng cho Customer**

1. Manager xem lại hợp đồng vừa tạo
2. Click nút **"Gửi cho khách hàng"**
3. Hệ thống gửi email thông báo cho Customer
4. Contract status chuyển sang **"Sent"**

###### **Bước 8: Customer xem và ký hợp đồng**

1. Customer nhận email thông báo có hợp đồng mới
2. Vào menu **"Hợp đồng của tôi"** hoặc click link trong email
3. Xem chi tiết hợp đồng:
   - Thông tin dịch vụ
   - Giá cả (Deposit: 40%, Final: 60%)
   - SLA (thời gian hoàn thành)
   - Terms and Conditions
4. Nếu đồng ý, click **"Ký hợp đồng"**
5. Xác nhận lại thông tin
6. Contract status chuyển sang **"Signed"**

![Customer Sign Contract](screenshots/sign-contract.png)

###### **Bước 9: Customer thanh toán cọc (Deposit)**

1. Sau khi ký hợp đồng, hệ thống hiển thị nút **"Thanh toán cọc"**
2. Click vào nút thanh toán
3. Chọn phương thức thanh toán:
   - Ví điện tử
   - Chuyển khoản ngân hàng
4. Nhập số tiền cọc (40% của total price)
5. Xác nhận thanh toán
6. Hệ thống tạo payment record và cập nhật contract status = **"Active"**

![Pay Deposit](screenshots/pay-deposit.png)

**Lưu ý:** Sau khi thanh toán cọc, contract mới được kích hoạt và manager mới có thể phân task.

###### **Bước 10: Manager phân task cho Specialist**

1. Sau khi Customer thanh toán cọc, Manager vào trang **"Quản lý hợp đồng"**
2. Chọn contract đã active
3. Vào tab **"Tasks"** hoặc **"Phân công"**
4. Click **"Tạo Task"** hoặc **"Assign Specialist"**
5. Chọn Transcription Specialist từ danh sách
6. Điền thông tin task:
   - Task Type: Transcription
   - Description: Mô tả công việc
   - Deadline: Thời hạn hoàn thành
7. Click **"Phân công"**
8. Task status = **"Assigned"**
9. Specialist nhận notification về task mới

![Assign Task](screenshots/assign-task.png)

###### **Bước 11: Specialist nhận và thực hiện task**

1. Specialist đăng nhập với tài khoản Specialist
2. Vào menu **"Tasks của tôi"** hoặc **"My Tasks"**
3. Xem danh sách tasks được phân công
4. Click vào task để xem chi tiết:
   - Thông tin contract
   - File audio đã upload
   - Deadline
5. Click **"Nhận task"** hoặc **"Start"**
6. Task status chuyển sang **"In Progress"**
7. Specialist download file audio và thực hiện ký âm

![Specialist Task Detail](screenshots/specialist-task.png)

###### **Bước 12: Specialist upload file notation**

1. Sau khi hoàn thành ký âm, Specialist vào trang task detail
2. Scroll xuống phần **"Upload Files"**
3. Click **"Chọn file"** và chọn file notation (MusicXML, PDF)
4. File được upload lên server
5. Điền mô tả file (optional)
6. Click **"Upload"**
7. File status = **"Uploaded"**
8. Task status vẫn là **"In Progress"** (chờ Manager duyệt)

![Specialist Upload](screenshots/specialist-upload.png)

###### **Bước 13: Manager duyệt file**

1. Manager nhận notification có file mới từ Specialist
2. Vào trang **"Quản lý tasks"** hoặc contract detail
3. Xem file notation đã upload
4. Download và review file
5. Nếu OK:
   - Click **"Duyệt"** hoặc **"Approve"**
   - File status = **"Approved"**
6. Nếu cần sửa:
   - Click **"Yêu cầu sửa lại"**
   - Nhập comment về phần cần sửa
   - File status = **"Rejected"**
   - Specialist sẽ nhận notification

![Manager Review](screenshots/manager-review.png)

###### **Bước 14: Manager gửi file cho Customer**

1. Sau khi duyệt file, Manager click **"Gửi cho khách hàng"**
2. Xác nhận gửi file
3. File status = **"Delivered"**
4. Customer nhận notification và email
5. Milestone status chuyển sang **"Submitted"**

###### **Bước 15: Customer xem file và phản hồi**

1. Customer nhận notification có file mới
2. Vào trang **"Hợp đồng của tôi"** → chọn contract
3. Vào tab **"Files"** hoặc **"Deliveries"**
4. Download file notation
5. Xem và kiểm tra file
6. Có 2 lựa chọn:

   **A. Chấp nhận:**
   - Click **"Chấp nhận"** hoặc **"Accept"**
   - Nhập comment (optional)
   - Milestone status = **"Accepted"**

   **B. Yêu cầu sửa lại (Revision):**
   - Click **"Yêu cầu sửa lại"**
   - Nhập mô tả phần cần sửa
   - Gửi yêu cầu
   - Nếu còn free revisions: Miễn phí
   - Nếu hết free revisions: Cần thanh toán phí revision
   - Quay lại bước 11 (Specialist sửa lại)

![Customer Review File](screenshots/customer-review.png)

**Lưu ý về Revisions:**
- Mỗi contract có 1 free revision mặc định
- Sau free revision, mỗi revision sẽ tính phí (theo contract)
- Customer có thể thanh toán phí revision trước khi yêu cầu

###### **Bước 16: Customer thanh toán phần còn lại**

1. Sau khi chấp nhận file, Customer vào trang contract
2. Xem milestone cuối cùng đã được accept
3. Click **"Thanh toán phần còn lại"** (60% của total price)
4. Chọn phương thức thanh toán
5. Xác nhận thanh toán
6. Payment status = **"Completed"**
7. Milestone status = **"Completed"**
8. Contract status = **"Completed"**

![Pay Final](screenshots/pay-final.png)

###### **Bước 17: Hoàn thành**

1. Hệ thống hiển thị thông báo **"Hợp đồng đã hoàn thành"**
2. Customer có thể:
   - Download lại tất cả files
   - Xem lại lịch sử contract
   - Đánh giá dịch vụ (nếu có tính năng)
3. Manager và Specialist cũng nhận notification về việc hoàn thành

---

#### 3.3 Workflow 2: Arrangement with Recording Service

##### **3.3.1 Mục đích:**

Workflow này mô tả quy trình từ khi khách hàng tạo yêu cầu dịch vụ sắp xếp nhạc kèm thu âm (Arrangement with Recording) cho đến khi hoàn thành.

##### **3.3.2 Sơ đồ Workflow:**

```
Customer tạo Service Request (Arrangement + Recording)
    ↓
Upload file notation gốc
    ↓
Chọn nhạc cụ arrangement
    ↓
Chọn ca sĩ (vocalist)
    ↓
Manager assign và tạo Contract
    ↓
Customer ký hợp đồng và thanh toán cọc
    ↓
Manager phân task Arrangement cho Specialist
    ↓
Specialist thực hiện arrangement
    ↓
Specialist upload file arrangement
    ↓
Manager duyệt và gửi file cho Customer
    ↓
Customer chấp nhận file arrangement
    ↓
Manager tạo Studio Booking
    ↓
Customer xác nhận booking và thanh toán
    ↓
Thực hiện recording session tại studio
    ↓
Upload file audio sau recording
    ↓
Manager gửi file final cho Customer
    ↓
Customer chấp nhận và thanh toán phần còn lại
    ↓
Hoàn thành
```

##### **3.3.3 Hướng dẫn chi tiết từng bước:**

###### **Bước 1-4: Tương tự Workflow 1**

Customer đăng nhập, tạo request, upload file, và gửi yêu cầu.

**Khác biệt:**
- Loại dịch vụ: Chọn **"Arrangement với Recording"**
- Upload file: Upload file notation gốc (MusicXML, PDF)
- Chọn nhạc cụ: Chọn nhiều nhạc cụ cần arrangement (Piano, Guitar, Drums...)
- Music Options: Chọn genres (Pop, Rock, Jazz...), purpose (karaoke_cover, performance...)

###### **Bước 5: Chọn ca sĩ (Vocalist)**

1. Trong form tạo request, scroll xuống phần **"Chọn nghệ sĩ"**
2. Click **"Chọn ca sĩ"**
3. Xem danh sách ca sĩ có sẵn với:
   - Tên, ảnh đại diện
   - Kỹ năng (Vocal styles)
   - Demo audio
   - Giá thuê
4. Click vào ca sĩ để xem chi tiết
5. Chọn ca sĩ phù hợp
6. Ca sĩ được thêm vào request

![Select Vocalist](screenshots/select-vocalist.png)

###### **Bước 6-9: Tương tự Workflow 1**

Manager assign request, tạo contract, gửi cho customer, và customer ký hợp đồng.

**Khác biệt trong Contract:**
- Contract Type: **"Arrangement with Recording"**
- SLA Days: 21 ngày (mặc định cho arrangement + recording)
- Total Price: Bao gồm phí arrangement + phí recording (studio, ca sĩ...)

###### **Bước 10: Manager phân task Arrangement**

1. Sau khi Customer thanh toán cọc, Manager vào contract detail
2. Vào tab **"Milestones"** - sẽ có 2 milestones:
   - Milestone 1: Arrangement (40% deposit đã thanh toán)
   - Milestone 2: Recording (60% final - chưa thanh toán)
3. Click vào Milestone 1 (Arrangement)
4. Click **"Tạo Task"**
5. Chọn **Arrangement Specialist**
6. Task Type: **"Arrangement"**
7. Mô tả: Hướng dẫn về arrangement
8. Click **"Phân công"**

###### **Bước 11-14: Tương tự Workflow 1**

Specialist nhận task, thực hiện arrangement, upload file, Manager duyệt và gửi file cho Customer.

**Khác biệt:**
- Specialist upload file notation đã được arrangement
- File có thể là MusicXML hoặc PDF
- Customer review file arrangement và có thể yêu cầu revision

###### **Bước 15: Customer chấp nhận file Arrangement**

1. Customer xem file arrangement đã được gửi
2. Review file và test (nếu có)
3. Click **"Chấp nhận"**
4. Milestone 1 (Arrangement) status = **"Accepted"**
5. Milestone 2 (Recording) có thể được thanh toán (nếu cần) hoặc chờ đến bước recording

###### **Bước 16: Manager tạo Studio Booking**

1. Sau khi Customer chấp nhận arrangement, Manager vào contract detail
2. Vào tab **"Studio Booking"** hoặc **"Bookings"**
3. Click **"Tạo Studio Booking"**
4. Điền thông tin:
   - **Studio:** Chọn studio có sẵn
   - **Booking Date:** Chọn ngày thu âm
   - **Start Time:** Giờ bắt đầu
   - **Duration:** Thời gian thu âm (giờ)
   - **Session Type:** Artist Assisted (có ca sĩ)
   - **Ca sĩ:** Đã chọn trong request
5. Hệ thống tự tính:
   - Artist fee (phí ca sĩ)
   - Studio fee (phí thuê studio)
   - Equipment fee (nếu có thuê thêm thiết bị)
   - Admin fee
   - Total cost
6. Click **"Tạo Booking"**
7. Booking status = **"Tentative"** (chờ xác nhận)

![Create Studio Booking](screenshots/create-booking.png)

###### **Bước 17: Customer xác nhận Booking và thanh toán**

1. Customer nhận notification về studio booking
2. Vào contract detail → tab **"Studio Booking"**
3. Xem thông tin booking:
   - Ngày giờ
   - Địa chỉ studio
   - Ca sĩ đã chọn
   - Tổng chi phí
4. Xác nhận booking
5. Thanh toán phí recording (nếu cần thanh toán trước)
6. Booking status = **"Confirmed"**

**Lưu ý:** Booking phải được confirmed trước ngày thu âm ít nhất 1 ngày.

###### **Bước 18: Thực hiện Recording Session**

1. Vào ngày thu âm, Customer và ca sĩ đến studio
2. Arrangement Specialist hoặc Manager điều khiển thiết bị
3. Thực hiện thu âm theo file arrangement đã được chấp nhận
4. Recording được lưu với chất lượng cao

###### **Bước 19: Upload file audio sau Recording**

1. Sau khi thu âm xong, Arrangement Specialist hoặc Manager đăng nhập
2. Vào contract detail → tab **"Tasks"**
3. Tìm task recording (nếu đã tạo) hoặc tạo task mới
4. Upload file audio đã thu âm:
   - Định dạng: MP3, WAV, hoặc Stems
   - Chọn file từ máy tính
5. File status = **"Uploaded"**
6. File source = **"Studio Recording"**

![Upload Recording](screenshots/upload-recording.png)

###### **Bước 20-21: Tương tự Workflow 1**

Manager gửi file final cho Customer, Customer chấp nhận và thanh toán phần còn lại.

**Lưu ý:**
- File final là file audio đã được thu âm tại studio
- Customer có thể download file audio với chất lượng cao
- Recording không có revision (không thể sửa lại)

###### **Bước 22: Hoàn thành**

1. Sau khi Customer thanh toán phần còn lại
2. Milestone 2 (Recording) status = **"Completed"**
3. Contract status = **"Completed"**
4. Customer có thể download cả file arrangement và file audio recording

---

#### 3.4 Workflow 3: Recording Service (Studio Booking)

##### **3.4.1 Mục đích:**

Workflow này mô tả quy trình từ khi khách hàng tạo yêu cầu dịch vụ thu âm tại studio cho đến khi hoàn thành.

##### **3.4.2 Sơ đồ Workflow:**

```
Customer tạo Service Request (Recording only)
    ↓
Upload file tham khảo (nếu có)
    ↓
Chọn ca sĩ (nếu cần)
    ↓
Chọn người chơi nhạc cụ (nếu cần)
    ↓
Chọn thiết bị cần thuê (nếu cần)
    ↓
Chọn ngày giờ booking
    ↓
Hệ thống tự tạo Studio Booking (Tentative)
    ↓
Manager xem và tạo Contract
    ↓
Customer ký hợp đồng và thanh toán cọc
    ↓
Studio Booking chuyển sang Confirmed
    ↓
Thực hiện recording session
    ↓
Upload file audio
    ↓
Manager gửi file cho Customer
    ↓
Customer chấp nhận và thanh toán phần còn lại
    ↓
Hoàn thành
```

##### **3.4.3 Hướng dẫn chi tiết từng bước:**

###### **Bước 1: Customer tạo Service Request**

1. Customer đăng nhập
2. Vào menu **"Dịch vụ"** → **"Tạo yêu cầu"**
3. Chọn loại dịch vụ: **"Thu âm tại Studio (Recording)"**
4. Điền thông tin:
   - Tiêu đề, mô tả
   - Thông tin liên hệ
   - Số người đi kèm (external guests)

![Create Recording Request](screenshots/create-recording-request.png)

###### **Bước 2: Upload file tham khảo (Optional)**

1. Nếu có file tham khảo (notation, audio, lyrics), upload vào phần **"Files"**
2. Chọn loại file: Notation, Audio, Lyrics, hoặc Other
3. File sẽ được dùng làm reference cho recording session

###### **Bước 3: Chọn ca sĩ (Optional)**

1. Scroll xuống phần **"Chọn nghệ sĩ"**
2. Click **"Chọn ca sĩ"**
3. Xem danh sách và chọn ca sĩ
4. Ca sĩ sẽ tham gia recording session

**Lưu ý:** Nếu không chọn ca sĩ, có thể tự thu âm hoặc chỉ thu nhạc cụ.

###### **Bước 4: Chọn người chơi nhạc cụ (Optional)**

1. Trong phần **"Chọn nghệ sĩ"**, click **"Chọn người chơi nhạc cụ"**
2. Xem danh sách instrumentalists với kỹ năng (Piano, Guitar, Drums...)
3. Chọn người chơi nhạc cụ cần thiết
4. Có thể chọn nhiều người

###### **Bước 5: Chọn thiết bị cần thuê (Optional)**

1. Scroll xuống phần **"Thiết bị"**
2. Xem danh sách thiết bị có sẵn:
   - Microphone
   - Audio Interface
   - Headphones
   - Instruments
3. Chọn thiết bị cần thuê và số lượng
4. Hệ thống tự tính phí thuê

![Select Equipment](screenshots/select-equipment.png)

###### **Bước 6: Chọn ngày giờ Booking**

1. Scroll xuống phần **"Đặt lịch"**
2. Chọn **"Ngày thu âm"** từ calendar
3. Chọn **"Giờ bắt đầu"** và **"Thời gian"** (số giờ)
4. Hệ thống hiển thị:
   - Studios có sẵn vào thời gian đó
   - Tổng chi phí (studio fee + artist fee + equipment fee)
5. Chọn studio phù hợp

![Select Booking Time](screenshots/select-booking-time.png)

###### **Bước 7: Gửi yêu cầu**

1. Review lại toàn bộ thông tin
2. Xem tổng chi phí dự kiến
3. Click **"Gửi yêu cầu"**
4. Hệ thống tự động tạo **Studio Booking** với status = **"Tentative"**
5. Booking sẽ được giữ (hold) cho đến khi customer ký hợp đồng

**Lưu ý:** Booking tentative sẽ hết hạn sau 1 ngày nếu chưa được confirmed.

###### **Bước 8-9: Manager tạo Contract và Customer ký hợp đồng**

Tương tự các workflow trước.

**Khác biệt:**
- Contract Type: **"Recording"**
- Total Price: Từ studio booking (studio fee + artist fee + equipment fee + admin fee)
- SLA Days: Không có (vì đã có booking_date cụ thể)
- Due Date: = Booking Date

###### **Bước 10: Customer thanh toán cọc**

1. Sau khi ký hợp đồng, Customer thanh toán cọc (40%)
2. Sau khi thanh toán:
   - Contract status = **"Active"**
   - Studio Booking status = **"Confirmed"** (tự động)
   - Booking được chốt và không thể hủy (trừ trường hợp đặc biệt)

![Booking Confirmed](screenshots/booking-confirmed.png)

###### **Bước 11: Thực hiện Recording Session**

1. Vào ngày thu âm, Customer và team (ca sĩ, instrumentalists) đến studio
2. Manager hoặc Arrangement Specialist điều khiển thiết bị
3. Thực hiện thu âm theo yêu cầu
4. Recording được lưu với chất lượng cao (WAV, 48kHz...)

###### **Bước 12: Upload file audio**

1. Sau khi thu âm xong, người điều khiển (Manager hoặc Specialist) đăng nhập
2. Vào contract detail → tab **"Files"** hoặc **"Tasks"**
3. Upload file audio:
   - Chọn file từ máy tính
   - Định dạng: MP3, WAV, hoặc Stems
   - File source: Studio Recording
4. File status = **"Uploaded"**

###### **Bước 13-14: Manager gửi file và Customer thanh toán**

Tương tự các workflow trước.

**Lưu ý:**
- Recording không có revision (không thể sửa lại)
- Customer chấp nhận file và thanh toán phần còn lại (60%)
- Sau khi thanh toán, contract = **"Completed"**

###### **Bước 15: Hoàn thành**

1. Customer nhận file audio final
2. Có thể download file với chất lượng cao
3. Contract và booking đã hoàn thành

---

## Appendix A: Troubleshooting

### **Vấn đề thường gặp:**

#### **1. Không thể đăng nhập**

- **Nguyên nhân:** Sai email/mật khẩu hoặc tài khoản chưa được verify
- **Giải pháp:** 
  - Kiểm tra lại email và mật khẩu
  - Kiểm tra email để verify tài khoản
  - Click "Quên mật khẩu" để reset

#### **2. Không upload được file**

- **Nguyên nhân:** File quá lớn hoặc sai định dạng
- **Giải pháp:**
  - Kiểm tra kích thước file (tối đa 100MB)
  - Kiểm tra định dạng file (MP3, WAV, MusicXML, PDF...)
  - Thử upload lại

#### **3. Không nhận được notification**

- **Nguyên nhân:** Chưa bật notification hoặc email bị spam
- **Giải pháp:**
  - Kiểm tra cài đặt notification trong profile
  - Kiểm tra thư mục Spam trong email
  - Liên hệ support nếu vẫn không nhận được

#### **4. Thanh toán thất bại**

- **Nguyên nhân:** Vấn đề với phương thức thanh toán hoặc số dư không đủ
- **Giải pháp:**
  - Kiểm tra số dư ví điện tử
  - Thử phương thức thanh toán khác
  - Liên hệ support

---

## Appendix B: Glossary

- **Service Request:** Yêu cầu dịch vụ từ khách hàng
- **Contract:** Hợp đồng giữa khách hàng và công ty
- **Milestone:** Mốc thanh toán trong hợp đồng
- **Task Assignment:** Phân công công việc cho specialist
- **Revision:** Yêu cầu sửa lại file đã giao
- **Studio Booking:** Đặt chỗ studio cho dịch vụ recording
- **Transcription:** Ký âm nhạc
- **Arrangement:** Sắp xếp nhạc
- **Recording:** Thu âm

---

## Appendix C: Contact Support

Nếu có vấn đề hoặc cần hỗ trợ, vui lòng liên hệ:

- **Email:** support@mutrapro.com
- **Hotline:** [Số điện thoại]
- **Website:** http://mutrapro.com/support

---

**End of Document**

