# Studio Service Migration - Tích hợp vào Project Service

## 📋 Tổng quan

Studio-service đã được tích hợp vào project-service để giảm số lượng microservices trong hệ thống.

## ✅ Đã hoàn thành

### 1. Entity & Repository
- ✅ Tạo entity `Studio` và `StudioBooking` trong project-service
- ✅ Tạo repository `StudioRepository` và `StudioBookingRepository`
- ✅ Tạo các enum: `RecordingSessionType`, `BookingStatus`, `ReservationFeeStatus`

### 2. API Gateway
- ✅ Đã bỏ routing `/api/v1/studios/**` 
- ✅ Studio bookings giờ đi qua `/api/v1/projects/bookings/**` (path ngắn gọn)
- ✅ Đã cập nhật `application-dev.yml` và `application-prod.yml`

### 3. Kubernetes
- ✅ Đã bỏ path `/api/studios` khỏi ingress
- ✅ Studio bookings giờ đi qua `/api/projects/**`

## 🔄 Cần làm tiếp

### 1. Database Migration
- [ ] Tạo migration script để tạo tables `studios` và `studio_bookings` trong `project_db`
- [ ] Migrate dữ liệu từ `studio_db` sang `project_db` (nếu có dữ liệu hiện tại)

### 2. Service & Controller (Nếu cần implement ngay)
- [ ] Tạo `StudioBookingService` trong project-service
- [ ] Tạo `StudioBookingController` trong project-service với các endpoints:
  - POST `/api/v1/projects/bookings`
  - GET `/api/v1/projects/bookings/{id}`
  - PUT `/api/v1/projects/bookings/{id}`
  - POST `/api/v1/projects/bookings/{id}/confirm`
  - GET `/api/v1/projects/bookings` (list bookings with filters)

### 3. Xóa Studio Service
- ✅ Xóa file `k8s/deployments/studio-service-deployment.yaml`
- ✅ Xóa file `k8s/services/studio-service.yaml`
- ✅ Xóa studio-service khỏi `docker-compose.yml` và `docker-compose.prod.yml`
- ✅ Cập nhật các scripts build/deploy
- ✅ Cập nhật tài liệu deployment
- [ ] Xóa folder `backend/studio-service/` (có thể xóa sau khi test project-service)

### 4. Cập nhật Frontend (nếu có)
- [ ] Cập nhật API endpoints trong frontend từ `/api/v1/studios/**` sang `/api/v1/projects/bookings/**`

### 5. Tài liệu
- [ ] Cập nhật ERD: studio_bookings table giờ nằm trong project_db
- [ ] Cập nhật workflow documents nếu cần

## 📝 Lưu ý

1. **Database Schema**: Tables `studios` và `studio_bookings` sẽ nằm trong `project_db` thay vì `studio_db`
2. **API Path**: Tất cả studio booking APIs giờ đi qua `/api/v1/projects/bookings/**` (path ngắn gọn, dễ hiểu)
3. **Soft References**: `studio_bookings.contract_id` giờ là hard reference đến `contracts` table (cùng service)
4. **Đơn giản hóa**: Bỏ hoàn toàn path `/api/v1/studios/**` để đơn giản và nhất quán
5. **Endpoint Examples**:
   - `POST /api/v1/projects/bookings` - Tạo booking mới
   - `GET /api/v1/projects/bookings/{id}` - Lấy booking theo ID
   - `GET /api/v1/projects/bookings?contractId={id}` - Lấy bookings theo contract
   - `PUT /api/v1/projects/bookings/{id}` - Cập nhật booking
   - `POST /api/v1/projects/bookings/{id}/confirm` - Xác nhận booking

## 🔗 Files đã thay đổi

- `backend/project-service/src/main/java/com/mutrapro/project_service/entity/Studio.java`
- `backend/project-service/src/main/java/com/mutrapro/project_service/entity/StudioBooking.java`
- `backend/project-service/src/main/java/com/mutrapro/project_service/repository/StudioRepository.java`
- `backend/project-service/src/main/java/com/mutrapro/project_service/repository/StudioBookingRepository.java`
- `backend/project-service/src/main/java/com/mutrapro/project_service/enums/RecordingSessionType.java`
- `backend/project-service/src/main/java/com/mutrapro/project_service/enums/BookingStatus.java`
- `backend/project-service/src/main/java/com/mutrapro/project_service/enums/ReservationFeeStatus.java`
- `backend/api-gateway/src/main/resources/application-dev.yml`
- `backend/api-gateway/src/main/resources/application-prod.yml`
- `k8s/ingress/mutrapro-ingress.yaml`

