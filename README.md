# MuTraPro - Hệ thống Ký âm và Sản xuất Âm nhạc theo Yêu cầu

## Giới thiệu
MuTraPro là một hệ thống toàn diện cho việc ký âm và sản xuất âm nhạc theo yêu cầu của khách hàng. Hệ thống hỗ trợ quy trình hoàn chỉnh từ việc tiếp nhận yêu cầu, báo giá, thực hiện dự án đến thanh toán và quản lý studio.

## Tính năng chính
- ✅ Quản lý người dùng đa vai trò
- ✅ Hệ thống báo giá tự động
- ✅ Thanh toán theo milestone
- ✅ Quản lý booking studio
- ✅ Theo dõi tiến độ dự án hoàn chỉnh
- ✅ Hệ thống thông báo
- ✅ Quản lý file âm thanh

## Kiến trúc hệ thống

### Backend (Microservices)
```
backend/
├── api-gateway/          # API Gateway
├── auth-service/         # Xác thực và phân quyền
├── user-service/         # Quản lý người dùng
├── project-service/      # Quản lý dự án
├── payment-service/      # Xử lý thanh toán
├── notification-service/ # Hệ thống thông báo
├── file-service/         # Quản lý file
├── studio-service/       # Quản lý studio
└── shared/              # Shared resources
```

### Frontend (Web Application)
```
frontend/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── utils/          # Utilities
│   └── hooks/          # Custom hooks
├── public/             # Static assets
├── build/              # Build output
└── tests/              # Test files
```

### Mobile Application
```
mobile/
├── android/            # Android app
├── ios/               # iOS app
├── src/               # Shared source code
└── assets/            # Mobile assets
```

### Database
```
database/
├── migrations/        # Database migrations
├── seeds/            # Seed data
├── scripts/          # Utility scripts
└── backups/          # Backup files
```

## Công nghệ sử dụng
- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: React.js, TypeScript
- **Mobile**: React Native
- **Database**: PostgreSQL
- **Authentication**: JWT
- **File Storage**: Cloud Storage
- **Payment**: VNPay, MoMo

## Cài đặt và Chạy

### Yêu cầu hệ thống
- Node.js 18+
- PostgreSQL 14+
- npm hoặc yarn

### Cài đặt
```bash
# Clone repository
git clone <repository-url>
cd mutrapro-system

# Cài đặt dependencies
npm install

# Thiết lập database
npm run db:migrate
npm run db:seed

# Chạy development
npm run dev
```

### Chạy Backend (Java Spring) với profile dev/prod

Các service backend Spring Boot hỗ trợ 2 profile:

- dev: dùng Postgres local cố định (localhost:5432, username/password: postgres)
- prod: dùng biến môi trường `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` khi deploy

Mỗi service có 2 file cấu hình nằm tại `backend/<service>/src/main/resources/`:

- `application-dev.yml`: cấu hình phát triển
- `application-prod.yml`: cấu hình sản xuất

Chạy một service với profile dev (ví dụ `auth-service`):

```bash
cd backend/auth-service
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Chạy với profile prod (biến môi trường đã được set):

```bash
export DB_HOST=<your-db-host>
export DB_PORT=5432
export DB_NAME=<your-db-name>
export DB_USER=<your-db-user>
export DB_PASSWORD=<your-db-password>
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

Hoặc chạy jar đã build:

```bash
./mvnw -DskipTests package
java -Dspring.profiles.active=dev -jar target/*.jar
```

## Đóng góp
1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## Giấy phép
Dự án này thuộc bản quyền của [Tên tác giả/Tổ chức]

## Liên hệ
- Email: [email@example.com]
- Phone: [số điện thoại]
- Website: [website]
