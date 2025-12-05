# MutraPro - Runbook nhanh (Local Dev)

## Kafka (Redpanda) local
- Khởi chạy broker (đã cấu hình trong `docker-compose.yml` - tên file giữ nguyên):
```bash
docker compose up -d kafka
```
- Kiểm tra container:
```bash
docker ps | findstr redpanda
```
- Xem logs nhanh:
```bash
docker logs -f redpanda
```
- Dừng Kafka:
```bash
docker compose stop kafka
```
- Xóa Kafka (container):
```bash
docker compose rm -sf kafka
```

Cấu hình ứng dụng để kết nối:
- `spring.kafka.bootstrap-servers=localhost:9092`
- Topic sử dụng: `email-verification` (auto-create đã bật)

## Chạy các service
- Identity Service (dev profile):
```bash
cd backend/identity-service
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```
- Notification Service (dev profile):
```bash
cd backend/notification-service
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

## Test nhanh luồng đăng ký
1) Gọi API:
```http
POST http://localhost:8080/api/v1/identity/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "phone": "0123456789",
  "address": "HN",
  "email": "john@example.com",
  "password": "12345678",
  "role": "CUSTOMER"
}
```
2) Kiểm tra logs `identity-service` thấy outbox lưu và publisher cố gắng gửi Kafka.
3) Kiểm tra logs `notification-service` thấy consumer nhận sự kiện và gửi email.

## Ghi chú sản xuất (prod/cloud)
- Không dùng `localhost:9092`. Đặt `spring.kafka.bootstrap-servers` theo endpoint cloud (MSK/Confluent...).
- Nếu cần xác thực (SASL_SSL), thêm vào `application-prod.yml`:
```yaml
spring:
  kafka:
    properties:
      security.protocol: SASL_SSL
      sasl.mechanism: PLAIN
      sasl.jaas.config: >
        org.apache.kafka.common.security.plain.PlainLoginModule required
        username='${KAFKA_API_KEY}' password='${KAFKA_API_SECRET}';
```

## Lệnh Docker Compose tổng quát
- Khởi chạy toàn bộ stack (nếu cần):
```bash
docker compose up -d
```
- Dừng toàn bộ:
```bash
docker compose down
```
