# 📋 BUSINESS RULES - MuTraPro System

## 📖 TỔNG QUAN

Tài liệu này mô tả tất cả các Business Rules (Quy tắc nghiệp vụ) của hệ thống MuTraPro. Các rules này được áp dụng trong toàn bộ hệ thống để đảm bảo tính nhất quán, bảo mật và chất lượng dịch vụ.

---

## 🔐 AUTHENTICATION & USER MANAGEMENT

### BR-01
**Email must be unique in the system.**
- Mỗi email chỉ có thể được sử dụng cho một tài khoản duy nhất
- Áp dụng cho cả đăng ký thông thường và Google SSO

### BR-02
**Password must be at least 8 characters; confirmation must match.**
- Mật khẩu tối thiểu 8 ký tự, tối đa 128 ký tự
- Mật khẩu xác nhận phải khớp với mật khẩu chính

### BR-03
**New accounts must verify their email before login.**
- Tài khoản mới phải xác thực email trước khi có thể đăng nhập
- Email verification link được gửi sau khi đăng ký

### BR-04
**Users must accept Terms & Privacy Policy before activation.**
- Người dùng phải chấp nhận Điều khoản và Chính sách Bảo mật trước khi tài khoản được kích hoạt

### BR-05
**Limit resend verification to 3 times per hour.**
- Giới hạn gửi lại email xác thực tối đa 3 lần mỗi giờ để tránh spam

### BR-06
**Apply rate limiting to prevent signup/login spam or abuse.**
- Áp dụng rate limiting cho các API đăng ký và đăng nhập để ngăn chặn spam và lạm dụng

### BR-07
**Google SSO treats email as verified; if the email already exists, sign in instead of creating a new account.**
- Email từ Google SSO được coi là đã xác thực
- Nếu email đã tồn tại, hệ thống sẽ đăng nhập thay vì tạo tài khoản mới

### BR-08
**The platform may suspend or ban accounts for policy or security violations.**
- Hệ thống có quyền tạm ngưng hoặc cấm tài khoản vi phạm chính sách hoặc bảo mật

### BR-25
**Phone number must be exactly 10 digits (if provided).**
- Số điện thoại (nếu có) phải đúng 10 chữ số
- Format: `^\\d{10}$`

### BR-26
**Full name must not exceed 100 characters.**
- Tên đầy đủ tối đa 100 ký tự

### BR-27
**Email must not exceed 100 characters.**
- Email tối đa 100 ký tự

---

## 📝 SERVICE REQUEST RULES

### BR-09
**A service request must include at least one source (file or URL), one target instrument, and one output format.**
- Mỗi service request phải có ít nhất:
  - 1 nguồn (file hoặc URL)
  - 1 nhạc cụ đích
  - 1 định dạng đầu ra

### BR-10
**Allowed file types: .mp3, .wav, .m4a, .flac, .mp4, .mov; up to 5 files; max 500MB per file; URLs must be public.**
- File types cho phép: .mp3, .wav, .m4a, .flac, .mp4, .mov
- Tối đa 5 files mỗi request
- Mỗi file tối đa 500MB
- URLs phải là public URLs

### BR-11
**Notes or requirements must be ≤ 2000 characters and trimmed of leading/trailing spaces.**
- Ghi chú hoặc yêu cầu tối đa 2000 ký tự
- Tự động loại bỏ khoảng trắng đầu và cuối

### BR-28
**Transcription service must have exactly one instrument.**
- Dịch vụ transcription phải có đúng 1 nhạc cụ

### BR-29
**Arrangement service must have at least one instrument and a main instrument.**
- Dịch vụ arrangement phải có ít nhất 1 nhạc cụ và 1 nhạc cụ chính

### BR-30
**File upload size limit: 100MB for audio files, 50MB for sheet music files.**
- Giới hạn kích thước file:
  - Audio files: 100MB
  - Sheet music files: 50MB
  - Image files: Theo cấu hình service

### BR-31
**Service request title and description are required fields.**
- Tiêu đề và mô tả là các trường bắt buộc khi tạo service request

### BR-32
**Contact information (name, email, phone) is required for service requests.**
- Thông tin liên hệ (tên, email, số điện thoại) là bắt buộc

---

## 💰 PAYMENT & BILLING RULES

### BR-12
**Deposits are held in wallet escrow until approval or dispute resolution.**
- Tiền cọc được giữ trong ví escrow cho đến khi được phê duyệt hoặc giải quyết tranh chấp

### BR-13
**A valid contract is required before any work can start.**
- Phải có hợp đồng hợp lệ trước khi bắt đầu công việc

### BR-14
**Contracts must specify currency, base price, deposit percentage, SLA, revision policy, and scope of work.**
- Hợp đồng phải chỉ định: currency, base price, deposit percentage, SLA, revision policy, và scope of work

### BR-15
**Deposit percentage must be between 0–100%; SLA days ≥ 0; Contract ID auto-generates as CTR-YYYYMMDD-XXXX.**
- Deposit percentage: 0-100%
- SLA days: ≥ 0
- Contract ID tự động tạo: CTR-YYYYMMDD-XXXX

### BR-23
**Pricing and currency must be clearly displayed, with taxes and fees itemized.**
- Giá và currency phải được hiển thị rõ ràng, với thuế và phí được liệt kê chi tiết

### BR-33
**Total payment percentage (deposit + milestones) must equal exactly 100%.**
- Tổng phần trăm thanh toán (deposit + milestones) phải bằng chính xác 100%
- Cho phép sai số nhỏ do floating point (0.01%)

### BR-34
**Total milestone SLA days must equal contract SLA days.**
- Tổng SLA days của các milestones phải bằng SLA days của contract

### BR-35
**Wallet balance must be sufficient before payment (deposit or milestone).**
- Số dư ví phải đủ trước khi thanh toán (deposit hoặc milestone)
- Nếu không đủ, yêu cầu top up wallet

### BR-36
**Wallet currency must match transaction currency.**
- Currency của ví phải khớp với currency của giao dịch
- Không cho phép thanh toán cross-currency

### BR-37
**Wallet must be active (not locked or closed) to perform transactions.**
- Ví phải ở trạng thái active (không bị khóa hoặc đóng) để thực hiện giao dịch

### BR-38
**Transaction amount must be greater than 0.**
- Số tiền giao dịch phải lớn hơn 0

### BR-39
**Top-up amount must be greater than 0.**
- Số tiền nạp phải lớn hơn 0

---

## 📋 CONTRACT & MILESTONE RULES

### BR-40
**Contract must have at least one milestone.**
- Hợp đồng phải có ít nhất 1 milestone

### BR-41
**Each milestone must have milestoneSlaDays greater than 0.**
- Mỗi milestone phải có milestoneSlaDays > 0

### BR-42
**Milestone payment percentage must be greater than 0 if hasPayment is enabled.**
- Nếu milestone có hasPayment = true, paymentPercent phải > 0

### BR-43
**Arrangement with Recording contract must have at least one Arrangement milestone and one Recording milestone.**
- Hợp đồng Arrangement with Recording phải có:
  - Ít nhất 1 Arrangement milestone
  - Ít nhất 1 Recording milestone

### BR-44
**Recording milestones must come after all Arrangement milestones in order.**
- Các Recording milestones phải đứng sau tất cả Arrangement milestones theo thứ tự

### BR-45
**Contract expires automatically if status is 'sent' or 'approved' and expiresAt <= now().**
- Hợp đồng tự động hết hạn nếu:
  - Status = 'sent' hoặc 'approved'
  - expiresAt <= thời gian hiện tại
- Scheduled job chạy mỗi giờ để kiểm tra

### BR-46
**Expired contracts cannot be signed.**
- Hợp đồng đã hết hạn không thể được ký

### BR-47
**Contract status must be 'signed' before deposit payment.**
- Trạng thái hợp đồng phải là 'signed' trước khi thanh toán cọc

### BR-48
**Contract status must be 'active_pending_assignment' or 'active' before work can start.**
- Trạng thái hợp đồng phải là 'active_pending_assignment' hoặc 'active' trước khi bắt đầu công việc

---

## 🎯 TASK ASSIGNMENT & MILESTONE RULES

### BR-49
**Specialist cannot be assigned if total open tasks >= maxConcurrentTasks.**
- Specialist không thể được assign nếu tổng số task đang mở >= maxConcurrentTasks
- maxConcurrentTasks mặc định: 5

### BR-50
**Specialist must have matching skills for the task.**
- Specialist phải có kỹ năng phù hợp với task
- Transcription: Specialist phải có skill match với instrument
- Arrangement: Specialist phải có skill match với main instrument

### BR-51
**Milestone must be in valid status (WAITING_ASSIGNMENT, PLANNED, READY_TO_START, or IN_PROGRESS) to create task.**
- Milestone phải ở trạng thái hợp lệ để tạo task:
  - WAITING_ASSIGNMENT
  - PLANNED
  - READY_TO_START
  - IN_PROGRESS

### BR-52
**Milestone cannot have multiple active tasks simultaneously.**
- Milestone không thể có nhiều task active cùng lúc
- Chỉ 1 task có thể ở trạng thái "open" (không phải cancelled)

### BR-53
**Recording milestone requires studio booking before activation.**
- Recording milestone yêu cầu studio booking trước khi activate
- Task recording_supervision phải có studioBookingId trước khi start work

### BR-54
**Milestone status must be TASK_ACCEPTED_WAITING_ACTIVATION before activation.**
- Trạng thái milestone phải là TASK_ACCEPTED_WAITING_ACTIVATION trước khi activate

### BR-55
**Task must be in 'ready_to_start' status before specialist can start work.**
- Task phải ở trạng thái 'ready_to_start' trước khi specialist có thể bắt đầu làm việc

### BR-56
**Task can only be started by the assigned specialist.**
- Task chỉ có thể được bắt đầu bởi specialist được assign
- Verify specialistId matches current user

### BR-57
**Recording supervision task must have studio booking linked before start.**
- Task recording_supervision phải có studio booking được liên kết trước khi start

---

## 🎤 BOOKING & SCHEDULING RULES

### BR-16
**Scheduling must avoid conflicts across studios, artists, and arrangers.**
- Lịch đặt phải tránh xung đột giữa:
  - Studios
  - Artists
  - Arrangers

### BR-58
**Studio booking start time must be before end time.**
- Thời gian bắt đầu phải trước thời gian kết thúc
- Không cho phép start time = end time

### BR-59
**Studio booking must not overlap with existing active bookings.**
- Booking studio không được trùng lặp với các booking active hiện có
- Status active: TENTATIVE, PENDING, CONFIRMED, IN_PROGRESS

### BR-60
**Artist booking must not overlap with existing active bookings for the same artist.**
- Booking artist không được trùng lặp với các booking active của cùng artist
- Check conflict cho tất cả artists trong request

### BR-61
**Studio must be active to be booked.**
- Studio phải ở trạng thái active để có thể được đặt

### BR-62
**Booking date cannot be in the past.**
- Ngày đặt không thể là quá khứ (trừ khi là tentative booking)

---

## 🎵 PARTICIPANT & EQUIPMENT RULES

### BR-63
**VOCAL participants cannot have skill_id, equipment_id, or instrument_source.**
- Participant với roleType = VOCAL không được có:
  - skill_id
  - equipment_id
  - instrument_source

### BR-64
**INSTRUMENT participants with STUDIO_SIDE source must have equipment_id.**
- Participant với roleType = INSTRUMENT và instrumentSource = STUDIO_SIDE phải có equipment_id

### BR-65
**Equipment must be compatible with participant's skill (skill_equipment_mapping).**
- Equipment phải tương thích với skill của participant
- Check skill_equipment_mapping table

### BR-66
**INSTRUMENT participants with CUSTOMER_SIDE source must not have equipment_id.**
- Participant với roleType = INSTRUMENT và instrumentSource = CUSTOMER_SIDE không được có equipment_id

### BR-67
**Equipment must be active and available for booking.**
- Equipment phải ở trạng thái active và available để đặt

---

## 📁 FILE & DELIVERY RULES

### BR-17
**Deliverables are provided via secure links and watermarked until final payment.**
- Deliverables được cung cấp qua secure links
- Files được watermark cho đến khi thanh toán cuối cùng

### BR-18
**Revisions follow the contract policy; extra revisions may incur additional charges.**
- Revisions tuân theo chính sách hợp đồng
- Revisions thêm có thể phát sinh phí

### BR-68
**File type must match allowed types for the content type (audio, sheet music, image).**
- Loại file phải khớp với loại nội dung cho phép:
  - Audio: mp3, wav, m4a, flac, mp4, mov
  - Sheet music: pdf, musicxml, midi
  - Image: jpeg, jpg, png

### BR-69
**File must have valid MIME type.**
- File phải có MIME type hợp lệ

### BR-70
**Files are stored in S3 with organized folder structure.**
- Files được lưu trữ trong S3 với cấu trúc thư mục có tổ chức
- Folder prefix: audio, sheet-music, images, etc.

---

## 👥 SPECIALIST RULES

### BR-71
**Specialist must be created by Admin (not self-registered).**
- Specialist phải được tạo bởi Admin
- Không cho phép tự đăng ký làm specialist

### BR-72
**RECORDING_ARTIST specialist must have at least one recording role (VOCALIST and/or INSTRUMENT_PLAYER).**
- Specialist với specialization = RECORDING_ARTIST phải có ít nhất 1 recording role:
  - VOCALIST
  - INSTRUMENT_PLAYER
  - Hoặc cả hai

### BR-73
**Specialist maxConcurrentTasks must be positive.**
- maxConcurrentTasks phải là số dương (> 0)

### BR-74
**Specialist must have active status to receive task assignments.**
- Specialist phải ở trạng thái ACTIVE để nhận task assignments

### BR-75
**User must exist before creating specialist.**
- User phải tồn tại trong hệ thống trước khi tạo specialist
- Email của user được sử dụng để tạo specialist

---

## 💬 MESSAGING & COMMUNICATION RULES

### BR-20
**Messaging limits apply; harassment, spam, or abuse is prohibited.**
- Áp dụng giới hạn messaging
- Cấm quấy rối, spam, hoặc lạm dụng

### BR-76
**Chat messages must be associated with a valid conversation/room.**
- Tin nhắn chat phải được liên kết với conversation/room hợp lệ

### BR-77
**File attachments in chat must comply with file size and type restrictions.**
- File đính kèm trong chat phải tuân thủ giới hạn kích thước và loại file

---

## ⚖️ DISPUTE & RESOLUTION RULES

### BR-21
**Disputes are handled by staff and may result in escrow release to one or both parties.**
- Tranh chấp được xử lý bởi staff
- Có thể dẫn đến giải phóng escrow cho một hoặc cả hai bên

### BR-78
**Dispute must be associated with a valid contract or transaction.**
- Tranh chấp phải được liên kết với hợp đồng hoặc giao dịch hợp lệ

---

## 🔄 CANCELLATION & REFUND RULES

### BR-22
**Cancellations and refunds follow contract terms; deposits may be non-refundable after work starts.**
- Hủy và hoàn tiền tuân theo điều khoản hợp đồng
- Cọc có thể không được hoàn lại sau khi công việc bắt đầu

### BR-79
**Task cancellation must follow valid status transitions.**
- Hủy task phải tuân theo các chuyển đổi trạng thái hợp lệ

### BR-80
**Contract cancellation updates request status to 'cancelled'.**
- Hủy hợp đồng cập nhật trạng thái request thành 'cancelled'

---

## 📊 AUDIT & LOGGING RULES

### BR-24
**All key user actions (create/edit/approve/export) must be logged in the audit trail.**
- Tất cả các hành động quan trọng của người dùng phải được ghi log trong audit trail:
  - Create
  - Edit
  - Approve
  - Export

### BR-81
**Audit logs must include timestamp, user ID, action type, and entity details.**
- Audit logs phải bao gồm:
  - Timestamp
  - User ID
  - Action type
  - Entity details

---

## 🔐 OWNERSHIP & IP RIGHTS

### BR-19
**Ownership and IP rights transfer only after full payment is received.**
- Quyền sở hữu và IP chỉ được chuyển giao sau khi thanh toán đầy đủ

### BR-82
**Watermarked files are provided until final payment is completed.**
- Files có watermark được cung cấp cho đến khi thanh toán cuối cùng hoàn tất

---

## 📈 WORKLOAD & PERFORMANCE RULES

### BR-83
**Specialist workload is calculated based on tasks in SLA window and total open tasks.**
- Workload của specialist được tính dựa trên:
  - Tasks trong SLA window (deadline trong khoảng SLA)
  - Tổng số tasks đang mở

### BR-84
**Specialists are sorted by workload (lowest first) when assigning tasks.**
- Specialists được sắp xếp theo workload (thấp nhất trước) khi assign tasks

### BR-85
**Specialist experience years are considered in task assignment prioritization.**
- Số năm kinh nghiệm của specialist được xem xét trong ưu tiên assign task

---

## 🔄 STATUS TRANSITION RULES

### BR-86
**Contract status transitions must follow valid workflow.**
- Chuyển đổi trạng thái hợp đồng phải tuân theo workflow hợp lệ:
  - draft → sent → approved/signed → active → completed
  - Các trạng thái khác: rejected, need_revision, canceled, expired

### BR-87
**Milestone work status transitions must follow valid workflow.**
- Chuyển đổi trạng thái milestone phải tuân theo workflow hợp lệ:
  - PLANNED → WAITING_ASSIGNMENT → WAITING_SPECIALIST_ACCEPT → TASK_ACCEPTED_WAITING_ACTIVATION → READY_TO_START → IN_PROGRESS → WAITING_CUSTOMER → READY_FOR_PAYMENT → COMPLETED

### BR-88
**Task assignment status transitions must follow valid workflow.**
- Chuyển đổi trạng thái task assignment phải tuân theo workflow hợp lệ:
  - assigned → accepted_waiting → ready_to_start → in_progress → ready_for_review → completed

### BR-89
**Submission status transitions must follow valid workflow.**
- Chuyển đổi trạng thái submission phải tuân theo workflow hợp lệ:
  - draft → pending_review → approved/rejected → delivered → customer_accepted/customer_rejected

---

## 📝 VALIDATION RULES

### BR-90
**All required fields must be provided in API requests.**
- Tất cả các trường bắt buộc phải được cung cấp trong API requests

### BR-91
**Date and time values must be in valid format and timezone.**
- Giá trị ngày và giờ phải ở định dạng và timezone hợp lệ

### BR-92
**Numeric values must be within valid ranges.**
- Giá trị số phải nằm trong phạm vi hợp lệ:
  - Percentages: 0-100
  - Amounts: > 0
  - Days: ≥ 0

---

## 🔗 INTEGRATION RULES

### BR-93
**External payment gateway (SePay) integration must handle failures gracefully.**
- Tích hợp payment gateway (SePay) phải xử lý lỗi một cách graceful
- Retry logic cho failed transactions

### BR-94
**Event-driven architecture: All domain events must be published via outbox pattern.**
- Kiến trúc event-driven: Tất cả domain events phải được publish qua outbox pattern
- Đảm bảo eventual consistency

### BR-95
**Service-to-service communication must include authentication tokens.**
- Giao tiếp giữa các service phải bao gồm authentication tokens
- Verify JWT token trong inter-service calls

---

## 📊 SUMMARY

**Tổng số Business Rules: 95**

### Phân loại:
- **Authentication & User Management:** BR-01 đến BR-27 (27 rules)
- **Service Request Rules:** BR-09 đến BR-32 (24 rules)
- **Payment & Billing Rules:** BR-12 đến BR-39 (28 rules)
- **Contract & Milestone Rules:** BR-40 đến BR-48 (9 rules)
- **Task Assignment & Milestone Rules:** BR-49 đến BR-57 (9 rules)
- **Booking & Scheduling Rules:** BR-16, BR-58 đến BR-62 (6 rules)
- **Participant & Equipment Rules:** BR-63 đến BR-67 (5 rules)
- **File & Delivery Rules:** BR-17, BR-18, BR-68 đến BR-70 (5 rules)
- **Specialist Rules:** BR-71 đến BR-75 (5 rules)
- **Messaging & Communication Rules:** BR-20, BR-76, BR-77 (3 rules)
- **Dispute & Resolution Rules:** BR-21, BR-78 (2 rules)
- **Cancellation & Refund Rules:** BR-22, BR-79, BR-80 (3 rules)
- **Audit & Logging Rules:** BR-24, BR-81 (2 rules)
- **Ownership & IP Rights:** BR-19, BR-82 (2 rules)
- **Workload & Performance Rules:** BR-83 đến BR-85 (3 rules)
- **Status Transition Rules:** BR-86 đến BR-89 (4 rules)
- **Validation Rules:** BR-90 đến BR-92 (3 rules)
- **Integration Rules:** BR-93 đến BR-95 (3 rules)

---

**Cập nhật lần cuối:** [Ngày cập nhật]

