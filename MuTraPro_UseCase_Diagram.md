# MuTraPro - Use Case Diagram & Use Cases

## 📋 TỔNG QUAN

### **Project:** MuTraPro - Custom Music Transcription and Production System
### **Version:** 3.0 - Enhanced Workflow Support
### **Main Actors:** Customer, Manager, Transcription Specialist, Arrangement Specialist, Recording Artist, System Admin

---

## 🎭 ACTORS

### **Primary Actors:**
- **Customer:** Khách hàng sử dụng dịch vụ
- **Manager:** Quản lý dự án và workflow
- **Transcription Specialist:** Chuyên gia ký âm
- **Arrangement Specialist:** Chuyên gia sắp xếp nhạc
- **Recording Artist:** Nghệ sĩ thu âm

### **Secondary Actors:**
- **System Admin:** Quản trị hệ thống
- **Payment Gateway:** Cổng thanh toán
- **Email Service:** Dịch vụ email
- **File Storage:** Lưu trữ file

---

## 🎵 USE CASE DIAGRAM

```
                    MuTraPro System
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │  ┌─────────────────┐    ┌─────────────────┐              │
    │  │   Customer      │    │    Manager      │              │
    │  │                 │    │                 │              │
    │  │ • Tạo yêu cầu   │    │ • Tạo hợp đồng  │              │
    │  │ • Upload file   │    │ • Phân task     │              │
    │  │ • Chọn nghệ sĩ  │    │ • Duyệt file    │              │
    │  │ • Chọn thiết bị │    │ • Giao file     │              │
    │  │ • Thanh toán    │    │ • Duyệt revision│              │
    │  │ • Yêu cầu sửa   │    │ • Chọn specialist│             │
    │  │ • Đánh giá      │    │                 │              │
    │  └─────────────────┘    └─────────────────┘              │
    │                                                         │
    │  ┌─────────────────┐    ┌─────────────────┐              │
    │  │Transcription     │    │Arrangement      │              │
    │  │Specialist        │    │Specialist       │              │
    │  │                  │    │                 │              │
    │  │ • Nhận task      │    │ • Nhận task     │              │
    │  │ • Ký âm          │    │ • Sắp xếp nhạc  │              │
    │  │ • Upload file    │    │ • Upload file   │              │
    │  │ • Sửa revision   │    │ • Sửa revision  │              │
    │  └─────────────────┘    └─────────────────┘              │
    │                                                         │
    │  ┌─────────────────┐    ┌─────────────────┐              │
    │  │Recording Artist  │    │System Admin     │              │
    │  │                  │    │                 │              │
    │  │ • Hát/Chơi nhạc  │    │ • Quản lý user  │              │
    │  │ • Thu âm         │    │ • Cấu hình hệ   │              │
    │  │ • Upload file    │    │   thống         │              │
    │  └─────────────────┘    └─────────────────┘              │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
```

---

## 📝 DETAILED USE CASES

### **1. CUSTOMER USE CASES**

#### **UC001: Tạo yêu cầu dịch vụ**
- **Actor:** Customer
- **Description:** Customer tạo service request cho transcription, arrangement, hoặc recording
- **Preconditions:** Customer đã đăng nhập
- **Main Flow:**
  1. Customer chọn loại dịch vụ (transcription/arrangement/recording)
  2. Customer nhập thông tin cá nhân
  3. Customer upload file tham khảo (nếu có)
  4. Customer chọn nhạc cụ/ nghệ sĩ/ thiết bị (tùy loại dịch vụ)
  5. Customer chọn ngày giờ booking (cho recording)
  6. Customer gửi yêu cầu
- **Postconditions:** Service request được tạo với status 'pending'

#### **UC002: Upload file tham khảo**
- **Actor:** Customer
- **Description:** Customer upload file audio, notation, lyrics để tham khảo
- **Preconditions:** Customer đã tạo service request
- **Main Flow:**
  1. Customer chọn file cần upload
  2. Customer chọn loại file (audio/notation/lyrics/other)
  3. Customer upload file
  4. Hệ thống lưu file và cập nhật service request
- **Postconditions:** File được lưu với file_source = 'customer_upload'

#### **UC003: Chọn nghệ sĩ cho studio booking**
- **Actor:** Customer
- **Description:** Customer chọn ca sĩ và người chơi nhạc cụ cho studio booking
- **Preconditions:** Customer đã tạo service request loại recording
- **Main Flow:**
  1. Customer xem danh sách nghệ sĩ có sẵn
  2. Customer chọn ca sĩ (nếu cần)
  3. Customer chọn người chơi nhạc cụ (nếu cần)
  4. Customer xác nhận lựa chọn
- **Postconditions:** Request booking artists được tạo

#### **UC004: Chọn thiết bị cho studio booking**
- **Actor:** Customer
- **Description:** Customer chọn thiết bị cần thuê cho studio booking
- **Preconditions:** Customer đã tạo service request loại recording
- **Main Flow:**
  1. Customer xem danh sách thiết bị có sẵn
  2. Customer chọn thiết bị cần thuê
  3. Customer nhập số lượng
  4. Customer xác nhận lựa chọn
- **Postconditions:** Request booking equipment được tạo

#### **UC005: Xem và ký hợp đồng**
- **Actor:** Customer
- **Description:** Customer xem hợp đồng và ký để xác nhận
- **Preconditions:** Manager đã tạo hợp đồng
- **Main Flow:**
  1. Customer nhận thông báo hợp đồng
  2. Customer xem chi tiết hợp đồng
  3. Customer đồng ý hoặc từ chối
  4. Nếu đồng ý, Customer ký hợp đồng
- **Postconditions:** Contract status chuyển thành 'signed'

#### **UC006: Thanh toán**
- **Actor:** Customer
- **Description:** Customer thanh toán cọc và phần còn lại
- **Preconditions:** Customer đã ký hợp đồng
- **Main Flow:**
  1. Customer chọn phương thức thanh toán
  2. Customer nhập thông tin thanh toán
  3. Customer xác nhận thanh toán
  4. Hệ thống xử lý thanh toán
- **Postconditions:** Payment được tạo với status 'completed'

#### **UC007: Yêu cầu chỉnh sửa**
- **Actor:** Customer
- **Description:** Customer yêu cầu chỉnh sửa file đã nhận
- **Preconditions:** Customer đã nhận file từ specialist
- **Main Flow:**
  1. Customer xem file đã nhận
  2. Customer yêu cầu chỉnh sửa
  3. Customer mô tả chi tiết yêu cầu
  4. Customer gửi yêu cầu revision
- **Postconditions:** Revision request được tạo với status 'pending'

#### **UC008: Đánh giá dịch vụ**
- **Actor:** Customer
- **Description:** Customer đánh giá chất lượng dịch vụ
- **Preconditions:** Dịch vụ đã hoàn thành
- **Main Flow:**
  1. Customer nhận yêu cầu đánh giá
  2. Customer chọn điểm đánh giá (1-5)
  3. Customer viết nhận xét (nếu có)
  4. Customer gửi đánh giá
- **Postconditions:** Feedback được tạo

---

### **2. MANAGER USE CASES**

#### **UC009: Tạo hợp đồng**
- **Actor:** Manager
- **Description:** Manager tạo hợp đồng từ service request
- **Preconditions:** Service request có status 'pending'
- **Main Flow:**
  1. Manager xem service request
  2. Manager tính giá từ pricing matrix
  3. Manager tạo hợp đồng với thông tin chi tiết
  4. Manager gửi hợp đồng cho customer
- **Postconditions:** Contract được tạo với status 'draft'

#### **UC010: Phân công task**
- **Actor:** Manager
- **Description:** Manager phân công task cho specialist
- **Preconditions:** Contract đã được ký
- **Main Flow:**
  1. Manager xem danh sách specialist có sẵn
  2. Manager chọn specialist phù hợp
  3. Manager tạo task assignment
  4. Manager gửi thông báo cho specialist
- **Postconditions:** Task assignment được tạo với status 'assigned'

#### **UC011: Duyệt file**
- **Actor:** Manager
- **Description:** Manager duyệt file từ specialist trước khi giao cho customer
- **Preconditions:** Specialist đã upload file
- **Main Flow:**
  1. Manager nhận thông báo file mới
  2. Manager xem và kiểm tra file
  3. Manager chấp nhận hoặc từ chối
  4. Nếu từ chối, Manager ghi lý do
- **Postconditions:** File status chuyển thành 'approved' hoặc 'rejected'

#### **UC012: Giao file cho customer**
- **Actor:** Manager
- **Description:** Manager giao file đã duyệt cho customer
- **Preconditions:** File đã được duyệt
- **Main Flow:**
  1. Manager chọn file cần giao
  2. Manager giao file cho customer
  3. Manager cập nhật trạng thái giao hàng
  4. Manager gửi thông báo cho customer
- **Postconditions:** File status chuyển thành 'delivered'

#### **UC013: Duyệt yêu cầu chỉnh sửa**
- **Actor:** Manager
- **Description:** Manager duyệt yêu cầu chỉnh sửa từ customer
- **Preconditions:** Customer đã gửi revision request
- **Main Flow:**
  1. Manager nhận thông báo revision request
  2. Manager xem chi tiết yêu cầu
  3. Manager chấp nhận hoặc từ chối
  4. Nếu từ chối, Manager ghi lý do
- **Postconditions:** Revision request status chuyển thành 'approved' hoặc 'rejected'

#### **UC014: Chọn arrangement specialist cho recording**
- **Actor:** Manager
- **Description:** Manager chọn arrangement specialist trống lịch để thu âm
- **Preconditions:** Contract recording đã được ký
- **Main Flow:**
  1. Manager xem danh sách arrangement specialist
  2. Manager kiểm tra lịch trống của specialist
  3. Manager chọn specialist phù hợp
  4. Manager tạo task assignment cho recording
- **Postconditions:** Task assignment được tạo với specialist_id

#### **UC015: Tự thu âm**
- **Actor:** Manager
- **Description:** Manager tự thu âm nếu không có arrangement specialist trống lịch
- **Preconditions:** Không có arrangement specialist trống lịch
- **Main Flow:**
  1. Manager quyết định tự thu âm
  2. Manager tạo task assignment với specialist_id = manager_id
  3. Manager thực hiện thu âm
  4. Manager upload file audio
- **Postconditions:** Task assignment được tạo với manager_id

---

### **3. TRANSCRIPTION SPECIALIST USE CASES**

#### **UC016: Nhận task ký âm**
- **Actor:** Transcription Specialist
- **Description:** Specialist nhận task ký âm từ manager
- **Preconditions:** Manager đã phân công task
- **Main Flow:**
  1. Specialist nhận thông báo task mới
  2. Specialist xem chi tiết task
  3. Specialist xác nhận có thể thực hiện
  4. Specialist bắt đầu task
- **Postconditions:** Task status chuyển thành 'in_progress'

#### **UC017: Ký âm từ audio**
- **Actor:** Transcription Specialist
- **Description:** Specialist ký âm file audio thành notation
- **Preconditions:** Specialist đã nhận task
- **Main Flow:**
  1. Specialist nghe file audio
  2. Specialist ký âm thành notation
  3. Specialist kiểm tra và chỉnh sửa
  4. Specialist hoàn thành ký âm
- **Postconditions:** Notation file được tạo

#### **UC018: Upload file ký âm**
- **Actor:** Transcription Specialist
- **Description:** Specialist upload file notation đã hoàn thành
- **Preconditions:** Specialist đã hoàn thành ký âm
- **Main Flow:**
  1. Specialist chọn file notation
  2. Specialist upload file
  3. Specialist cập nhật trạng thái task
  4. Specialist gửi thông báo cho manager
- **Postconditions:** File được lưu với file_source = 'task_deliverable'

#### **UC019: Sửa file theo yêu cầu**
- **Actor:** Transcription Specialist
- **Description:** Specialist sửa file theo yêu cầu revision
- **Preconditions:** Manager đã duyệt revision request
- **Main Flow:**
  1. Specialist nhận thông báo revision
  2. Specialist xem chi tiết yêu cầu
  3. Specialist sửa file theo yêu cầu
  4. Specialist upload file đã sửa
- **Postconditions:** File mới được tạo với nội dung đã sửa

---

### **4. ARRANGEMENT SPECIALIST USE CASES**

#### **UC020: Nhận task sắp xếp**
- **Actor:** Arrangement Specialist
- **Description:** Specialist nhận task sắp xếp nhạc từ manager
- **Preconditions:** Manager đã phân công task
- **Main Flow:**
  1. Specialist nhận thông báo task mới
  2. Specialist xem chi tiết task
  3. Specialist xác nhận có thể thực hiện
  4. Specialist bắt đầu task
- **Postconditions:** Task status chuyển thành 'in_progress'

#### **UC021: Sắp xếp nhạc**
- **Actor:** Arrangement Specialist
- **Description:** Specialist sắp xếp lại nhạc theo yêu cầu
- **Preconditions:** Specialist đã nhận task
- **Main Flow:**
  1. Specialist xem file notation gốc
  2. Specialist sắp xếp lại nhạc
  3. Specialist kiểm tra và chỉnh sửa
  4. Specialist hoàn thành arrangement
- **Postconditions:** Arrangement file được tạo

#### **UC022: Upload file arrangement**
- **Actor:** Arrangement Specialist
- **Description:** Specialist upload file arrangement đã hoàn thành
- **Preconditions:** Specialist đã hoàn thành arrangement
- **Main Flow:**
  1. Specialist chọn file arrangement
  2. Specialist upload file
  3. Specialist cập nhật trạng thái task
  4. Specialist gửi thông báo cho manager
- **Postconditions:** File được lưu với file_source = 'task_deliverable'

#### **UC023: Thu âm và upload file**
- **Actor:** Arrangement Specialist
- **Description:** Specialist thu âm và upload file audio (cho recording task)
- **Preconditions:** Specialist được chọn cho recording task
- **Main Flow:**
  1. Specialist đến studio
  2. Specialist điều khiển thiết bị thu âm
  3. Specialist thu âm session
  4. Specialist upload file audio
- **Postconditions:** File được lưu với file_source = 'studio_recording'

---

### **5. RECORDING ARTIST USE CASES**

#### **UC024: Tham gia session thu âm**
- **Actor:** Recording Artist
- **Description:** Artist tham gia session thu âm theo booking
- **Preconditions:** Artist được chọn cho studio booking
- **Main Flow:**
  1. Artist nhận thông báo booking
  2. Artist đến studio đúng giờ
  3. Artist thực hiện hát/chơi nhạc cụ
  4. Artist hoàn thành session
- **Postconditions:** Session được ghi lại

#### **UC025: Upload file demo**
- **Actor:** Recording Artist
- **Description:** Artist upload file demo để khách hàng nghe thử
- **Preconditions:** Artist đã tạo account
- **Main Flow:**
  1. Artist chọn file demo
  2. Artist upload file
  3. Artist cập nhật thông tin demo
  4. Artist đặt demo là public
- **Postconditions:** Demo file được lưu với file_source = 'portfolio_demo'

---

### **6. SYSTEM ADMIN USE CASES**

#### **UC026: Quản lý người dùng**
- **Actor:** System Admin
- **Description:** Admin quản lý tài khoản người dùng
- **Preconditions:** Admin đã đăng nhập
- **Main Flow:**
  1. Admin xem danh sách người dùng
  2. Admin tạo/sửa/xóa tài khoản
  3. Admin phân quyền người dùng
  4. Admin cập nhật thông tin
- **Postconditions:** Thông tin người dùng được cập nhật

#### **UC027: Cấu hình hệ thống**
- **Actor:** System Admin
- **Description:** Admin cấu hình các thông số hệ thống
- **Preconditions:** Admin đã đăng nhập
- **Main Flow:**
  1. Admin xem cấu hình hiện tại
  2. Admin chỉnh sửa cấu hình
  3. Admin lưu thay đổi
  4. Admin kiểm tra hoạt động
- **Postconditions:** Cấu hình hệ thống được cập nhật

---

## 🔄 USE CASE RELATIONSHIPS

### **Include Relationships:**
- UC001 includes UC002 (Tạo yêu cầu bao gồm upload file)
- UC001 includes UC003 (Tạo yêu cầu bao gồm chọn nghệ sĩ)
- UC001 includes UC004 (Tạo yêu cầu bao gồm chọn thiết bị)
- UC005 includes UC006 (Ký hợp đồng bao gồm thanh toán)

### **Extend Relationships:**
- UC007 extends UC012 (Yêu cầu chỉnh sửa mở rộng giao file)
- UC008 extends UC012 (Đánh giá mở rộng giao file)

### **Generalization Relationships:**
- UC016, UC020, UC023 generalize to "Nhận task"
- UC017, UC021, UC024 generalize to "Thực hiện công việc"
- UC018, UC022, UC025 generalize to "Upload file"

---

## 📊 USE CASE STATISTICS

### **Total Use Cases:** 27
### **By Actor:**
- **Customer:** 8 use cases
- **Manager:** 7 use cases
- **Transcription Specialist:** 4 use cases
- **Arrangement Specialist:** 4 use cases
- **Recording Artist:** 2 use cases
- **System Admin:** 2 use cases

### **By Workflow:**
- **Transcription:** 8 use cases
- **Arrangement:** 8 use cases
- **Recording:** 7 use cases
- **System Management:** 4 use cases

---

## ✅ KẾT LUẬN

**Use case diagram và danh sách use cases đã bao phủ toàn bộ hệ thống MuTraPro:**
- **3 workflows chính** với các use cases tương ứng
- **6 actors chính** với vai trò rõ ràng
- **27 use cases chi tiết** với preconditions, main flow, postconditions
- **Relationships** giữa các use cases được định nghĩa rõ ràng

**Hệ thống đã được thiết kế đầy đủ và logic!** 🚀
