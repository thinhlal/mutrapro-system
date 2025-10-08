# JWT Security Implementation Guide

## Tổng quan
Đã implement JWT security cho tất cả các service trong hệ thống microservice theo phương án **mỗi service tự validate JWT**.

## Cấu trúc đã implement

### 1. Shared Module (`backend/shared/`)
- **JwtSecurityConfig.java**: Cung cấp JWT decoder, authentication converter và method-level security chung
- **AutoConfiguration.imports**: Tự động load tất cả shared configurations
- **Dependencies**: Đã có `spring-boot-starter-oauth2-resource-server`

### 2. Các Service đã cập nhật (TẤT CẢ)
- **user-service**: ✅ Hoàn thành
- **project-service**: ✅ Hoàn thành  
- **payment-service**: ✅ Hoàn thành
- **task-service**: ✅ Hoàn thành
- **feedback-service**: ✅ Hoàn thành
- **file-service**: ✅ Hoàn thành
- **notification-service**: ✅ Hoàn thành
- **quotation-service**: ✅ Hoàn thành
- **revision-service**: ✅ Hoàn thành
- **specialist-service**: ✅ Hoàn thành
- **studio-service**: ✅ Hoàn thành

### 3. Cấu hình mỗi service (Ultra Minimal)
Mỗi service có:
- **SecurityConfig.java** chỉ với `@Configuration` và `SecurityFilterChain` bean
- **OAuth2 Resource Server** dependency trong pom.xml
- **JWT signerKey** trong application.yml
- **Method-level security** với `@PreAuthorize` (tự động enable từ shared module)

### 4. Lợi ích của Ultra Minimal Security
- **Zero Configuration**: Các service tự động có method-level security
- **Consistent Behavior**: Tất cả service đều có cùng cấu hình security
- **Ultra Minimal Code**: SecurityConfig chỉ cần 1 annotation + SecurityFilterChain
- **Auto-Injection**: JWT beans và method security tự động available
- **Spring Boot Magic**: `@EnableWebSecurity` không cần thiết - Spring Boot tự động enable khi phát hiện SecurityFilterChain

## Cách test JWT validation

### Bước 1: Lấy JWT token từ auth-service
```bash
curl -X POST http://localhost:8081/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mutrapro.com",
    "password": "password123"
  }'
```

### Bước 2: Test các service với JWT token
```bash
# Test user-service
curl -X GET http://localhost:8080/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test project-service  
curl -X GET http://localhost:8080/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test payment-service
curl -X GET http://localhost:8080/payments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test task-service
curl -X GET http://localhost:8080/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Bước 3: Test không có token (should return 401)
```bash
curl -X GET http://localhost:8080/users
# Expected: 401 Unauthorized
```

### Bước 4: Test với token không hợp lệ (should return 401)
```bash
curl -X GET http://localhost:8080/users \
  -H "Authorization: Bearer invalid_token"
# Expected: 401 Unauthorized
```

## Các endpoint được bảo vệ

### user-service
- `GET /users/**` - Cần ROLE_ADMIN hoặc ROLE_USER
- `POST /users` - Cần ROLE_ADMIN
- `PUT /users/**` - Cần ROLE_ADMIN hoặc chính user đó
- `DELETE /users/**` - Cần ROLE_ADMIN

### project-service
- `GET /projects/**` - Cần ROLE_ADMIN hoặc ROLE_USER
- `POST /projects` - Cần ROLE_ADMIN hoặc ROLE_USER
- `PUT /projects/**` - Cần ROLE_ADMIN hoặc ROLE_USER
- `DELETE /projects/**` - Cần ROLE_ADMIN

### payment-service
- Tương tự project-service
- **Public endpoints**: `/sepay/webhooks/**` (cho webhook từ Sepay)

### task-service
- Tương tự project-service

## Endpoints công khai (không cần authentication)
Tất cả service đều có các endpoints công khai:
- `/health`
- `/actuator/health`
- `/v3/api-docs/**`
- `/swagger-ui/**`

## Lưu ý quan trọng

1. **JWT Signer Key**: Tất cả service đều sử dụng **CHÍNH XÁC CÙNG MỘT signer key** với auth-service
   - **Dev**: `QVHfEyXEd7KG4eUfYAWOUvuPjlufU3vImJ0MEialEhHoQPjB6wZTL6Ma9XLnKaYn`
   - **Prod**: `${JWT_SIGNER_KEY}` environment variable
2. **Method Security**: Tự động enable từ shared module, sử dụng `@PreAuthorize` cho fine-grained access control
3. **Shared Configuration**: JWT config và method security được chia sẻ qua shared module
4. **Independent Validation**: Mỗi service tự validate JWT, không phụ thuộc gateway
5. **Ultra Minimal**: SecurityConfig chỉ cần 1 annotation: `@Configuration` (Spring Boot tự động enable web security)
6. **Key Synchronization**: **CRITICAL** - Nếu thay đổi signerKey ở auth-service, phải update tất cả service khác

## ✅ HOÀN THÀNH TẤT CẢ SERVICE

**Tất cả 11 microservices đã được cập nhật với JWT security:**
- auth-service (source of truth)
- user-service, project-service, payment-service, task-service
- feedback-service, file-service, notification-service
- quotation-service, revision-service, specialist-service, studio-service

**Hệ thống đã sẵn sàng để test end-to-end JWT authentication!**

## Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra JWT token có hợp lệ không
- Kiểm tra signer key có giống nhau giữa auth-service và các service khác
- Kiểm tra role trong JWT claims

### Lỗi 403 Forbidden
- Kiểm tra role của user có đủ quyền không
- Kiểm tra method-level security annotations

### Lỗi 500 Internal Server Error
- Kiểm tra dependencies trong pom.xml
- Kiểm tra application.yml configuration
