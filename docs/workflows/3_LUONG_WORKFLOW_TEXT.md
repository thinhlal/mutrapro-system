# 3 LUỒNG WORKFLOW - MuTraPro System

## LUỒNG 1: TRANSCRIPTION (Ký âm nhạc)

### Bước 1: Customer tạo yêu cầu
- Customer đăng nhập hệ thống
- Tạo service_requests với request_type = 'transcription'
- Upload file audio cần ký âm
- Chọn nhạc cụ cần ký âm (request_notation_instruments)
- Nhập thông tin liên hệ: name, phone, email
- Gửi yêu cầu

### Bước 2: Manager tạo hợp đồng
- Manager nhận yêu cầu từ customer
- Tạo contracts với contract_type = 'transcription'
- Thiết lập SLA (sla_days), due_date
- Thiết lập revision policy: free_revisions_included, additional_revision_fee_vnd
- Tính tổng giá: total_price
- Gửi hợp đồng cho customer

### Bước 3: Customer ký hợp đồng và thanh toán cọc
- Customer xem và chấp nhận hợp đồng
- Thanh toán cọc (deposit_paid, deposit_paid_at)
- Hợp đồng chuyển sang trạng thái 'active'

### Bước 4: Manager phân công specialist
- Manager chọn arrangement specialist phù hợp
- Tạo task_assignments với task_type = 'transcription'
- Specialist nhận task và bắt đầu làm việc

### Bước 5: Specialist thực hiện ký âm
- Specialist download file audio từ customer
- Sử dụng phần mềm ký âm (MuseScore, Finale, Sibelius)
- Upload file notation (.mscz, .xml, .pdf) vào files
- File có file_status = 'uploaded'

### Bước 6: Manager duyệt file
- Manager review file notation
- Nếu OK: file_status = 'approved'
- Nếu cần sửa: file_status = 'rejected', nhập rejection_reason
- Specialist sửa lại và upload file mới

### Bước 7: Manager giao file cho customer
- Manager set delivered_to_customer = true
- delivered_at = thời gian giao
- delivered_by = manager_id
- delivery_type = 'final'

### Bước 8: Customer yêu cầu revision (nếu cần)
- Customer tạo revision_requests
- Manager duyệt revision request:
  - Nếu OK: status = 'approved'
  - Nếu từ chối: status = 'rejected', nhập rejection_reason
- Nếu approved: Specialist làm lại từ bước 5
- Tính phí revision nếu vượt quá free_revisions_included

### Bước 9: Thanh toán cuối
- Thanh toán phần còn lại theo payment_milestones
- Hoàn tất hợp đồng

---

## LUỒNG 2: ARRANGEMENT (+ RECORDING)

### Bước 1: Customer tạo yêu cầu
- Customer đăng nhập hệ thống
- Tạo service_requests với request_type = 'arrangement' hoặc 'arrangement_with_recording'
- Upload file audio gốc (nếu có)
- Nhập music_options: genres, purpose
- Chọn có ca sĩ hay không (request_booking_artists)
- Nhập thông tin liên hệ: name, phone, email
- Gửi yêu cầu

### Bước 2: Manager tạo hợp đồng
- Manager nhận yêu cầu từ customer
- Tạo contracts với contract_type = 'arrangement' hoặc 'arrangement_with_recording'
- Thiết lập SLA (sla_days), due_date
- Thiết lập revision policy: free_revisions_included, additional_revision_fee_vnd
- Tính tổng giá: total_price (bao gồm cả phí ca sĩ nếu có)
- Gửi hợp đồng cho customer

### Bước 3: Customer ký hợp đồng và thanh toán cọc
- Customer xem và chấp nhận hợp đồng
- Thanh toán cọc (deposit_paid, deposit_paid_at)
- Hợp đồng chuyển sang trạng thái 'active'

### Bước 4: Manager phân công specialist
- Manager chọn arrangement specialist phù hợp
- Tạo task_assignments với task_type = 'arrangement'
- Specialist nhận task và bắt đầu làm việc

### Bước 5: Specialist thực hiện arrangement
- Specialist download file audio từ customer
- Sử dụng phần mềm arrangement (Cubase, Logic Pro, Pro Tools)
- Upload file arrangement (.wav, .mp3, .stems) vào files
- File có file_status = 'uploaded'

### Bước 6: Manager duyệt file
- Manager review file arrangement
- Nếu OK: file_status = 'approved'
- Nếu cần sửa: file_status = 'rejected', nhập rejection_reason
- Specialist sửa lại và upload file mới

### Bước 7: Manager giao file cho customer
- Manager set delivered_to_customer = true
- delivered_at = thời gian giao
- delivered_by = manager_id
- delivery_type = 'final'

### Bước 8: Customer yêu cầu revision (nếu cần)
- Customer tạo revision_requests
- Manager duyệt revision request:
  - Nếu OK: status = 'approved'
  - Nếu từ chối: status = 'rejected', nhập rejection_reason
- Nếu approved: Specialist làm lại từ bước 5
- Tính phí revision nếu vượt quá free_revisions_included

### Bước 9: Recording (nếu có ca sĩ)
- Manager book ca sĩ theo lịch đã chọn từ request_booking_artists
- Tạo studio_bookings với status = 'tentative'
- Ca sĩ thực hiện recording
- Upload file recording vào files
- Manager giao file recording cho customer

### Bước 10: Thanh toán cuối
- Thanh toán phần còn lại theo payment_milestones
- Hoàn tất hợp đồng

---

## LUỒNG 3: STUDIO BOOKING/RECORDING

### Bước 1: Customer tạo yêu cầu
- Customer đăng nhập hệ thống
- Tạo service_requests với request_type = 'recording'
- Upload file audio tham khảo (nếu có)
- Chọn ca sĩ nội bộ (request_booking_artists)
- Chọn nhạc cụ thuê (request_booking_equipment)
- Nhập số người đi kèm (external_guest_count)
- Nhập thông tin liên hệ: name, phone, email
- Gửi yêu cầu

### Bước 1.5: Hệ thống tự tạo studio booking
- Hệ thống tự động tạo studio_bookings với status = 'tentative'
- hold_expires_at = thời gian giữ chỗ
- Tính phí external guest nếu vượt quá free_external_guests_limit

### Bước 2: Manager tạo hợp đồng
- Manager nhận yêu cầu từ customer
- Tạo contracts với contract_type = 'recording'
- SLA = NULL (vì đã có booking_date cụ thể)
- due_date = booking_date
- Tính tổng giá: total_price (bao gồm studio_rate, artist_fee, equipment_rental_fee, external_guest_fee)
- Gửi hợp đồng cho customer

### Bước 3: Customer ký hợp đồng và thanh toán cọc
- Customer xem và chấp nhận hợp đồng
- Thanh toán cọc (deposit_paid, deposit_paid_at)
- Hợp đồng chuyển sang trạng thái 'active'

### Bước 4: Manager chốt studio booking
- Manager chuyển studio_bookings từ 'tentative' sang 'confirmed'
- Xác nhận booking_date, start_time, end_time

### Bước 5: Manager chọn arrangement specialist hoặc tự thu âm
- Nếu có arrangement specialist available: tạo task_assignments với task_type = 'recording'
- Nếu không có specialist: Manager tự thu âm

### Bước 6: Thực hiện session recording
- Customer và ca sĩ đến studio
- Thực hiện recording theo booking
- Upload file recording (.wav, .mp3, .stems) vào files
- File có file_source_type = 'studio_recording'

### Bước 7: Manager upload file
- Manager review và upload file recording
- File có file_status = 'uploaded'

### Bước 8: Manager giao file cho customer
- Manager set delivered_to_customer = true
- delivered_at = thời gian giao
- delivered_by = manager_id
- delivery_type = 'final'

### Bước 9: Thanh toán cuối
- Thanh toán phần còn lại theo payment_milestones
- Hoàn tất hợp đồng

---

## CÁC ĐIỂM QUAN TRỌNG

### Revision Policy:
- **Luồng 1 & 2**: Có revision, Manager duyệt revision request
- **Luồng 3**: Không có revision (trigger cấm)

### File Status:
- uploaded → pending_review → approved/rejected → delivered
- rejected: có rejection_reason và reviewed_by

### Payment:
- Cọc trước khi bắt đầu
- Thanh toán cuối khi hoàn thành
- Hỗ trợ wallet payment

### Manager Approval:
- Duyệt file từ specialist
- Duyệt revision request từ customer
- Luôn là người giao file cuối cùng cho customer

### Studio Booking:
- Tự động tạo tentative khi customer request
- Chốt confirmed khi ký hợp đồng
- Không có SLA vì đã có booking_date cụ thể
