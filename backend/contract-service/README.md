# Contract Service

## Mô tả
Service quản lý hợp đồng và các mốc thanh toán trong hệ thống MuTraPro:
- Contracts (hợp đồng)
- Service SLA defaults (SLA mặc định theo loại hợp đồng)
- Payment milestones (các mốc thanh toán)

## Database
- Database: `contract_db`
- Port: 8083

## API Endpoints
- GET /api/contracts - Lấy danh sách hợp đồng
- POST /api/contracts - Tạo hợp đồng mới
- GET /api/contracts/{id} - Lấy chi tiết hợp đồng
- PUT /api/contracts/{id} - Cập nhật hợp đồng
- GET /api/contracts/{id}/milestones - Lấy các mốc thanh toán
- POST /api/contracts/{id}/milestones - Tạo mốc thanh toán mới
