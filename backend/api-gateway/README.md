# API Gateway Service

API Gateway service cho hệ thống MuTraPro, cung cấp single entry point cho tất cả các microservices.

## Tính năng

- **JWT Authentication**: Xác thực và phân quyền dựa trên JWT token
- **Request Routing**: Định tuyến request đến các microservices tương ứng
- **Global Logging**: Log tất cả requests và responses với trace ID
- **Error Handling**: Xử lý lỗi thống nhất cho toàn bộ hệ thống
- **CORS Support**: Hỗ trợ CORS cho frontend applications
- **Health Check**: Endpoints để kiểm tra trạng thái service
- **Rate Limiting**: Giới hạn số lượng requests (cần Redis)

## Cấu trúc

```
src/main/java/com/mutrapro/api_gateway/
├── config/
│   ├── GatewayConfig.java          # Cấu hình routing cho các services
│   ├── SecurityConfig.java         # Cấu hình security và JWT
│   └── GlobalErrorHandler.java     # Xử lý lỗi toàn cục
├── controller/
│   └── HealthController.java       # Health check endpoints
├── filter/
│   ├── JwtAuthenticationFilter.java # JWT authentication filter
│   └── GlobalLoggingFilter.java    # Global logging filter
└── util/
    └── JwtUtils.java               # JWT utility methods
```

## Cấu hình

### Environment Variables

```bash
# JWT Configuration
JWT_SIGNER_KEY=your-secret-key-here

# Service URLs
AUTH_SERVICE_URL=http://localhost:8081
USER_SERVICE_URL=http://localhost:8082
PROJECT_SERVICE_URL=http://localhost:8083
QUOTATION_SERVICE_URL=http://localhost:8084
TASK_SERVICE_URL=http://localhost:8085
REVISION_SERVICE_URL=http://localhost:8086
SPECIALIST_SERVICE_URL=http://localhost:8087
STUDIO_SERVICE_URL=http://localhost:8088
PAYMENT_SERVICE_URL=http://localhost:8089
NOTIFICATION_SERVICE_URL=http://localhost:8090
FEEDBACK_SERVICE_URL=http://localhost:8091
FILE_SERVICE_URL=http://localhost:8092
```

### Application Properties

```yaml
# JWT Configuration
jwt:
  signerKey: ${JWT_SIGNER_KEY:default-secret-key}

# Services Configuration
services:
  auth-service:
    url: ${AUTH_SERVICE_URL:http://localhost:8081}
  # ... other services
```

## API Endpoints

### Public Endpoints (không cần JWT)

- `POST /auth/log-in` - Đăng nhập
- `POST /auth/register` - Đăng ký
- `POST /auth/introspect` - Kiểm tra JWT token
- `GET /users/verify-email` - Xác thực email
- `GET /health` - Health check
- `GET /gateway/health` - Gateway health check

### Protected Endpoints (cần JWT)

- `GET /users` - Lấy danh sách users (cần ROLE_SYSTEM_ADMIN)
- `GET /projects/**` - Tất cả endpoints của project service
- `GET /quotations/**` - Tất cả endpoints của quotation service
- ... các endpoints khác

### Gateway Management Endpoints

- `GET /gateway/health` - Kiểm tra trạng thái gateway
- `GET /gateway/actuator/info` - Thông tin gateway
- `GET /gateway/actuator/status` - Trạng thái chi tiết

## Cách sử dụng

### 1. Chạy API Gateway

```bash
# Development
mvn spring-boot:run -Dspring.profiles.active=dev

# Production
mvn spring-boot:run -Dspring.profiles.active=prod
```

### 2. Gửi request với JWT

```bash
# Đăng nhập để lấy JWT token
curl -X POST http://localhost:8080/auth/log-in \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Sử dụng JWT token cho các request khác
curl -X GET http://localhost:8080/users \
  -H "Authorization: Bearer your-jwt-token-here"
```

### 3. Kiểm tra trạng thái

```bash
# Health check
curl http://localhost:8080/gateway/health

# Gateway info
curl http://localhost:8080/gateway/actuator/info
```

## JWT Token Structure

JWT token được tạo bởi auth-service và chứa các claims sau:

```json
{
  "sub": "user@example.com",
  "email": "user@example.com",
  "userId": 123,
  "scope": "CUSTOMER",
  "tokenType": "Bearer",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Security

- Sử dụng HS512 algorithm cho JWT signing
- JWT token được validate ở mỗi request
- Role-based access control (RBAC)
- CORS được cấu hình cho frontend applications

## Logging

Tất cả requests được log với format:

```
=== REQUEST START ===
Trace ID: uuid-here
Method: GET
URI: /users
Headers: {...}
Remote Address: 127.0.0.1
Timestamp: 2024-01-01T10:00:00
=== REQUEST END ===

=== RESPONSE START ===
Trace ID: uuid-here
Method: GET
URI: /users
Status: 200 OK
Headers: {...}
Duration: 150ms
Success: true
Timestamp: 2024-01-01T10:00:00
=== RESPONSE END ===
```

## Troubleshooting

### Lỗi thường gặp

1. **401 Unauthorized**: JWT token không hợp lệ hoặc đã hết hạn
2. **403 Forbidden**: Không có quyền truy cập endpoint
3. **503 Service Unavailable**: Microservice không khả dụng
4. **504 Gateway Timeout**: Request timeout

### Debug

Để debug, set log level thành DEBUG:

```yaml
logging:
  level:
    com.mutrapro.api_gateway: DEBUG
    org.springframework.cloud.gateway: DEBUG
    org.springframework.security: DEBUG
```

## Dependencies

- Spring Boot 3.5.5
- Spring Cloud Gateway 2024.0.0
- Spring Security OAuth2 Resource Server
- WebFlux (reactive programming)
- Lombok
- Shared module (MuTraPro internal)

## Port

API Gateway chạy trên port **8080** (mặc định).
