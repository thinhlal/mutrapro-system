# Hướng dẫn thay đổi Grafana Cloud Account

Khi Grafana Cloud account hết hạn hoặc cần đổi sang account mới, làm theo các bước sau:

## 🆕 Tạo mới Grafana Cloud Account (Lần đầu setup)

Nếu bạn đang tạo Grafana Cloud account mới từ đầu, làm theo các bước sau:

### Bước 1: Đăng ký/Đăng nhập Grafana Cloud

1. Truy cập: https://grafana.com/cloud
2. Đăng ký account mới hoặc đăng nhập nếu đã có

### Bước 2: Tạo Stack mới

1. Vào **My Account** → **Stacks** → **Create Stack**
2. Đặt tên stack (ví dụ: `mutrapro-production`)
3. Chọn region: **ap-southeast-1** (Singapore - gần Việt Nam nhất)
4. Click **Create Stack**

### Bước 3: Setup Prometheus Integration

Sau khi tạo stack, bạn sẽ thấy màn hình **"Prometheus onboarding"**:

#### Section 1: "How do you want to get started?"
- ✅ Chọn: **"Connect and enhance an existing Prometheus instance"** (card bên phải)
  - Vì chúng ta đã có Prometheus metrics từ các services, chỉ cần kết nối để gửi lên Grafana Cloud

#### Section 2: "What do you want to do with your Prometheus Data?"
- ✅ Chọn: **"Send metrics to Grafana Cloud"** (card đầu tiên)
  - Mô tả: "Collect, store, and visualize metrics from an existing Prometheus instance"
  - Đây là option phù hợp vì chúng ta muốn gửi metrics từ các services lên Grafana Cloud

#### Section 3: "How do you want to connect your Prometheus data to Grafana Cloud?"
- ✅ Chọn: **"Alloy"** (card bên phải)
  - Mô tả: "`remote_write` metrics to Grafana Cloud using a vendor-neutral Agent"
  - **Lý do**: Chúng ta đang sử dụng Grafana Alloy trong `docker-compose.prod.hub.yml` để scrape metrics từ các services và gửi lên Grafana Cloud
  - Alloy là agent chính thức của Grafana, hỗ trợ tốt cho việc scrape và forward metrics/logs
  - ⚠️ **Lưu ý**: Cả 2 options đều hoạt động (vì Alloy cũng dùng Prometheus Remote Write), nhưng chọn "Alloy" sẽ có hướng dẫn setup phù hợp hơn

Sau khi chọn "Alloy", bạn sẽ được chuyển đến trang **"Hosted Prometheus metrics"** configuration (tab "Configuration details"). Làm theo các bước sau:

#### Trang "Hosted Prometheus metrics" Configuration:

**Section 1: "Choose a method for forwarding metrics"**
- ✅ Chọn: **"Via Grafana Alloy"** (card bên trái, có icon gear với flame)
  - Mô tả: "Use a component-based telemetry collector to send your metrics, and get advantage of Grafana Cloud alerting. You don't have to store your data locally."
  - **KHÔNG chọn** "From my local Prometheus server" vì chúng ta không có Prometheus server riêng, mà dùng Alloy để scrape trực tiếp từ các services
- Chọn **"Standard"** (không phải "Kubernetes") vì chúng ta đang chạy trên Docker Compose

**Section 2: "Install Grafana Alloy"**
- ⏭️ **Có thể bỏ qua** section này vì chúng ta đã có Grafana Alloy chạy trong Docker Compose
- Nếu muốn, có thể click "Run Grafana Alloy" để xem hướng dẫn, nhưng không cần làm theo vì đã setup sẵn

**Section 3: "Set the configuration"** ⭐ **QUAN TRỌNG**
- Đây là nơi tạo **API Token** để Alloy có thể gửi metrics lên Grafana Cloud
- Click **"Create a new token"** (button màu xanh)
- Điền thông tin:
  - **Token name**: `mutrapro-monitoring` (hoặc tên khác)
  - **Expiration date**: Chọn "No expiry" hoặc set ngày hết hạn
  - **Scopes**: Sẽ tự động set là `alloy-data-write` (đủ để gửi metrics)
- Click **"Create token"** và **copy token ngay** (format: `glc_...`)
  - ⚠️ **Lưu ý**: Token chỉ hiển thị 1 lần, nếu mất phải tạo lại
- Sau khi tạo token, Grafana sẽ hiển thị **configuration code** với các thông tin:
  - `url` → Đây là **Prometheus Remote Write URL** (copy giá trị này)
  - `username` → Đây là **Stack ID** (copy giá trị này)
  - `password` → Đây là **API Token** vừa tạo (đã copy ở trên)

**Section 4: "Once you've changed your configuration file..."**
- ⚠️ **Bỏ qua** command `sudo systemctl restart alloy.service` vì chúng ta dùng Docker Compose
- Thay vào đó, sau khi cập nhật `.env`, restart bằng:
  ```bash
  sudo docker compose -f docker-compose.prod.hub.yml restart grafana-alloy
  ```

**Section 5: "View your Starter Dashboard"**
- ⏭️ **Optional**: Có thể click "Go to Starter Dashboard" để xem dashboard mẫu sau khi setup xong

### Bước 4: Lấy thông tin cần thiết

Sau khi hoàn thành Section 3, bạn đã có:
- ✅ **API Token** (đã copy ở Section 3)
- ✅ **Prometheus Remote Write URL** (từ configuration code trong Section 3)
- ✅ **Stack ID** (từ configuration code trong Section 3, field `username`)

Bây giờ cần lấy thêm thông tin cho **Loki (Logs)**:

#### Cách 1: Lấy từ Stack Details (Nhanh nhất)

1. Vào **My Account** → **Stacks** → Chọn stack → **Details** → **Logs** section
2. Copy các thông tin:
   - **Instance ID** (số, ví dụ: `123456`) → Đây là `GRAFANA_LOGS_ID`
   - **Push Endpoint** URL → Đây là `GRAFANA_LOKI_URL`
     - Format: `https://logs-prod-XXX.grafana.net/loki/api/v1/push`

#### Cách 2: Qua Logs Onboarding (Nếu muốn xem hướng dẫn)

1. Vào **My Account** → **Stacks** → Chọn stack → Click tab **"Logs"** hoặc tìm **"Logs onboarding"**
2. Trang "Logs onboarding" sẽ hiển thị:
   
   **"Select your infrastructure"**:
   - ✅ Chọn **"Linux"** (card có icon penguin, không phải "Kubernetes" vì chúng ta dùng Docker Compose)
   - Hoặc chọn **"Other"** nếu không thấy "Linux"
   
   **"Grafana Alloy Setup for Linux"** section:
   
   **Step 1: Select platform**
   - ⏭️ **Có thể bỏ qua** vì chúng ta đã có Alloy chạy trong Docker Compose
   - Dropdown "Select platform" và "Select architecture" không cần thiết
   
   **Step 2: Use an API token**
   - **Option A: Dùng token đã có** (Khuyến nghị)
     - Chọn tab **"Use an existing token"**
     - Paste token đã tạo từ Prometheus setup (token có format bắt đầu bằng `glc_` và được cung cấp khi tạo token)
     - Click **Next** hoặc **Continue**
   - **Option B: Tạo token mới** (Nếu muốn token riêng cho Logs)
     - Chọn tab **"Create a new token"** (đã được chọn mặc định)
     - Đặt tên: `mutrapro-logs-token` (hoặc tên khác)
     - Click **"Create token"** và **copy token ngay**
     - ⚠️ **Lưu ý**: Token chỉ hiển thị 1 lần
   
3. Sau khi chọn/tạo token, Grafana sẽ hiển thị **configuration code** (thường là Alloy config) với các thông tin:
   - Tìm trong config có dòng `url = "https://logs-prod-XXX.grafana.net/loki/api/v1/push"` → Copy URL này (là `GRAFANA_LOKI_URL`)
   - Tìm trong config có dòng `username = "123456"` hoặc trong basic_auth → Copy giá trị này (là `GRAFANA_LOGS_ID`)
   - Hoặc xem ở phần **"Configuration details"** → **"Loki"** section để lấy:
     - **Instance ID** → `GRAFANA_LOGS_ID`
     - **Push Endpoint** → `GRAFANA_LOKI_URL`

#### Về API Token (`GRAFANA_API_TOKEN`):

API Token có thể lấy/tạo từ **3 nơi** trong Grafana Cloud:

**Cách 1: Tạo từ Prometheus Onboarding** (Khuyến nghị - Dễ nhất)
1. Vào **My Account** → **Stacks** → Chọn stack → **Prometheus onboarding**
2. Đi đến **Section 3: "Set the configuration"**
3. Click **"Create a new token"**
4. Điền:
   - **Token name**: `mutrapro-monitoring` (hoặc tên khác)
   - **Expiration date**: "No expiry" hoặc set ngày hết hạn
5. Click **"Create token"** → **Copy token ngay** (format: `glc_...`)
   - ⚠️ **Token chỉ hiển thị 1 lần**, nếu mất phải tạo lại
6. Token này thường có scope `alloy-data-write` → **Đủ để gửi cả metrics và logs**
7. Dùng token này cho `GRAFANA_API_TOKEN` trong file `.env`

**Cách 2: Tạo từ Logs Onboarding**
1. Vào **My Account** → **Stacks** → Chọn stack → **Logs onboarding**
2. Chọn **"Linux"** → Đi đến **Step 2: Use an API token**
3. Chọn tab **"Create a new token"**
4. Điền tên token → Click **"Create token"** → **Copy token ngay**
   - ⚠️ **Token chỉ hiển thị 1 lần**
5. Dùng token này cho `GRAFANA_API_TOKEN` trong file `.env`

**Cách 3: Tạo trực tiếp từ API Keys** (Nếu muốn control permissions rõ ràng)
1. Vào **My Account** → **API Keys** → **Create API Key**
2. Điền thông tin:
   - **Name**: `mutrapro-monitoring-full` (hoặc tên khác)
   - **Role**: Chọn **"Admin"** hoặc **"Editor"** (nếu cần)
   - **Expiration**: "No expiry" hoặc set ngày hết hạn
3. **Permissions** (quan trọng):
   - ✅ **MetricsPublisher** (để gửi metrics)
   - ✅ **LogsPublisher** (để gửi logs)
4. Click **"Create"** → **Copy token ngay** (format: `glc_...`)
   - ⚠️ **Token chỉ hiển thị 1 lần**, nếu mất phải tạo lại
5. Dùng token này cho `GRAFANA_API_TOKEN` trong file `.env`

**Lưu ý:**
- **Chỉ cần 1 token** cho cả Metrics và Logs (dùng chung trong `.env`)
- Token từ **Cách 1** (Prometheus onboarding) thường đủ dùng cho cả 2
- Nếu token không hoạt động, thử **Cách 3** để tạo token với permissions rõ ràng
- Sau khi tạo token, **không thể xem lại** → Phải copy ngay khi tạo
- Nếu mất token, phải **xóa token cũ** và **tạo token mới**

### Bước 5: Cập nhật file `.env` trên EC2

SSH vào EC2 và thêm/cập nhật các biến sau vào file `.env`:

```bash
# Trên EC2
cd /path/to/mutrapro-system
nano .env
```

Thêm các dòng sau:

```env
# Metrics (Prometheus)
GRAFANA_STACK_ID=<stack_id_vừa_lấy>
GRAFANA_PROMETHEUS_URL=<prometheus_remote_write_url_vừa_lấy>

# Logs (Loki)
GRAFANA_LOGS_ID=<logs_instance_id_vừa_lấy>
GRAFANA_LOKI_URL=<loki_push_url_vừa_lấy>

# API Token (dùng chung cho cả Metrics và Logs)
GRAFANA_API_TOKEN=<api_token_vừa_tạo>

# Region
GRAFANA_REGION=ap-southeast-1
```

**Ví dụ với thông tin từ script onboarding:**
```env
# Metrics (Prometheus)
GRAFANA_STACK_ID=2883825
GRAFANA_PROMETHEUS_URL=https://prometheus-prod-37-prod-ap-southeast-1.grafana.net/api/prom/push

# Logs (Loki)
GRAFANA_LOGS_ID=1437589
GRAFANA_LOKI_URL=https://logs-prod-020.grafana.net/loki/api/v1/push

# API Token (dùng chung cho cả Metrics và Logs)
# Lấy token từ Grafana Cloud (format: glc_...)
GRAFANA_API_TOKEN=YOUR_GRAFANA_API_TOKEN_HERE

# Region
GRAFANA_REGION=ap-southeast-1
```

**⚠️ Lưu ý quan trọng:**
- Script onboarding mà Grafana cung cấp là để **cài Alloy trực tiếp trên Linux server** (dùng `systemctl`)
- **KHÔNG cần chạy script đó** vì chúng ta đã có Alloy chạy trong Docker Compose
- Chỉ cần **copy các thông tin** từ script (URLs, IDs, Token) và cập nhật vào file `.env` như trên
- File `config.alloy` trong codebase đã được cấu hình sẵn để đọc từ env variables, không cần thay đổi

### Bước 6: Đảm bảo file `config.alloy` đã có sẵn

File `config.alloy` trong codebase đã được cấu hình sẵn để dùng env variables, không cần sửa gì.

Nếu trên server chưa có file này, copy từ codebase:
```bash
# Trên EC2
cp /path/to/mutrapro-system/docker/alloy/config.alloy /path/to/mutrapro-system/docker/alloy/config.alloy
```

### Bước 7: Start/Restart Grafana Alloy container

**⚠️ QUAN TRỌNG:** Sau khi sửa file `.env`, phải **recreate container** (không chỉ restart) để Docker Compose load lại env variables mới.

**Cách 1: Recreate container (Khuyến nghị)**
```bash
# Trên EC2
cd /path/to/mutrapro-system
sudo docker compose -f docker-compose.prod.hub.yml up -d --force-recreate grafana-alloy
```

**Cách 2: Down rồi Up lại**
```bash
# Trên EC2
cd /path/to/mutrapro-system
sudo docker compose -f docker-compose.prod.hub.yml stop grafana-alloy
sudo docker compose -f docker-compose.prod.hub.yml rm -f grafana-alloy
sudo docker compose -f docker-compose.prod.hub.yml up -d grafana-alloy
```

**Cách 3: Nếu container chưa chạy**
```bash
# Trên EC2
cd /path/to/mutrapro-system
sudo docker compose -f docker-compose.prod.hub.yml up -d grafana-alloy
```

**❌ KHÔNG dùng `restart`** vì nó không load lại env variables từ file `.env`:
```bash
# KHÔNG dùng lệnh này sau khi sửa .env
sudo docker compose -f docker-compose.prod.hub.yml restart grafana-alloy
```

### Bước 8: Kiểm tra logs

```bash
# Kiểm tra logs xem có lỗi không
sudo docker compose -f docker-compose.prod.hub.yml logs -f grafana-alloy
```

Nếu thấy logs như:
```
level=info msg="Component started" component=prometheus.scrape.api_gateway
level=info msg="Successfully sent metrics" endpoint=hosted-prometheus
level=info msg="Component started" component=loki.source.docker.mutrapro
```

→ Đã kết nối thành công!

### Bước 9: Kiểm tra trong Grafana Cloud

1. Đăng nhập vào Grafana Cloud
2. Vào **Explore** (icon compass ở sidebar trái)
3. Chọn data source: **Prometheus** (hoặc **Loki** cho logs)
4. Query thử:
   - Prometheus: `up` → Nếu thấy các services (api-gateway, identity-service, etc.) → Thành công!
   - Loki: `{service_name="mutrapro-api-gateway"}` → Nếu thấy logs → Thành công!

---

## 📋 Các thông tin cần lấy từ Grafana Cloud account mới (Khi đổi account)

1. **Đăng nhập vào Grafana Cloud mới**: https://grafana.com/cloud
2. **Tạo Stack mới** (nếu chưa có):
   - Vào **My Account** → **Stacks** → **Create Stack**
   - Chọn region (ví dụ: `ap-southeast-1`)
3. **Lấy thông tin từ Stack mới**:
   - **Stack ID** (cho Metrics): Lấy từ **My Account** → **Stacks** → Chọn stack → **Details** → **Stack ID**
   - **Logs ID** (cho Loki): Lấy từ **My Account** → **Stacks** → Chọn stack → **Details** → **Logs** → **Instance ID**
   - **Prometheus URL**: Lấy từ **My Account** → **Stacks** → Chọn stack → **Details** → **Prometheus** → **Remote Write Endpoint**
     - Format: `https://prometheus-prod-XX-prod-ap-southeast-1.grafana.net/api/prom/push`
   - **Loki URL**: Lấy từ **My Account** → **Stacks** → Chọn stack → **Details** → **Logs** → **Push Endpoint**
     - Format: `https://logs-prod-XXX.grafana.net/loki/api/v1/push`
4. **Tạo API Token mới**:
   - Vào **My Account** → **API Keys** → **Create API Key**
   - Chọn permissions: **MetricsPublisher** và **LogsPublisher**
   - Copy token (format: `glc_...`)

## 🔧 Các bước thay đổi

### Bước 1: Cập nhật file `.env` trên EC2

SSH vào EC2 và sửa file `.env`:

```bash
# Trên EC2
cd /path/to/mutrapro-system
nano .env
```

Cập nhật các biến sau với thông tin từ account mới:

```env
# Metrics (Prometheus)
GRAFANA_STACK_ID=<stack_id_mới>
GRAFANA_PROMETHEUS_URL=https://prometheus-prod-XX-prod-ap-southeast-1.grafana.net/api/prom/push

# Logs (Loki)
GRAFANA_LOGS_ID=<logs_id_mới>
GRAFANA_LOKI_URL=https://logs-prod-XXX.grafana.net/loki/api/v1/push

# API Token (dùng chung)
GRAFANA_API_TOKEN=<api_token_mới>

# Region
GRAFANA_REGION=ap-southeast-1
```

### Bước 2: Kiểm tra file `config.alloy` (nếu có URL hardcode)

File `config.alloy` đã được cấu hình để dùng env variables, không cần sửa gì:
- `GRAFANA_STACK_ID` → dùng cho username
- `GRAFANA_API_TOKEN` → dùng cho password  
- `GRAFANA_PROMETHEUS_URL` → dùng cho Prometheus URL
- `GRAFANA_LOKI_URL` → dùng cho Loki URL
- `GRAFANA_LOGS_ID` → dùng cho Loki username

**Lưu ý:** Nếu file `config.alloy` trên server có URL hardcode, chỉ cần cập nhật env variables trong `.env` là đủ, không cần sửa file config.alloy.

### Bước 3: Restart Grafana Alloy container

```bash
# Trên EC2
cd /path/to/mutrapro-system
sudo docker compose -f docker-compose.prod.hub.yml restart grafana-alloy
```

Hoặc nếu muốn restart hoàn toàn:

```bash
sudo docker compose -f docker-compose.prod.hub.yml stop grafana-alloy
sudo docker compose -f docker-compose.prod.hub.yml up -d grafana-alloy
```

### Bước 4: Kiểm tra logs

```bash
# Kiểm tra logs xem có lỗi không
sudo docker compose -f docker-compose.prod.hub.yml logs -f grafana-alloy
```

Nếu thấy logs như:
```
level=info msg="Component started" component=prometheus.scrape.api_gateway
level=info msg="Successfully sent metrics" endpoint=hosted-prometheus
```

→ Đã kết nối thành công với Grafana Cloud account mới!

### Bước 5: Kiểm tra trong Grafana Cloud

1. Đăng nhập vào Grafana Cloud account mới
2. Vào **Explore**
3. Query: `up` để xem các services đang gửi metrics
4. Nếu thấy metrics → Thành công!

## ⚠️ Lưu ý

1. **Dữ liệu cũ sẽ không tự động chuyển sang account mới**
   - Metrics và logs cũ sẽ vẫn ở account cũ
   - Chỉ có dữ liệu mới (sau khi đổi) sẽ gửi lên account mới

2. **Nếu muốn giữ lại dữ liệu cũ**:
   - Có thể export dữ liệu từ account cũ (nếu còn truy cập được)
   - Hoặc chạy song song 2 accounts trong thời gian chuyển đổi

3. **Bảo mật**:
   - Sau khi đổi account, **xóa API token cũ** trong account cũ (nếu còn truy cập được)
   - Không commit file `.env` lên Git

## 🔍 Troubleshooting

### Lỗi: "authentication failed"
- Kiểm tra lại `GRAFANA_API_TOKEN` có đúng không
- Kiểm tra token có đủ permissions (MetricsPublisher, LogsPublisher)

### Lỗi: "connection refused" hoặc "timeout"
- Kiểm tra lại `GRAFANA_PROMETHEUS_URL` và `GRAFANA_LOKI_URL` có đúng không
- Kiểm tra region có đúng không (`ap-southeast-1`)

### Không thấy metrics trong Grafana Cloud (Hiển thị "No data" trong Explore)

**Bước 1: Kiểm tra container grafana-alloy có đang chạy không**
```bash
# Trên EC2
sudo docker compose -f docker-compose.prod.hub.yml ps grafana-alloy
```
- Nếu không chạy → Start lại: `sudo docker compose -f docker-compose.prod.hub.yml up -d grafana-alloy`

**Bước 2: Kiểm tra logs của grafana-alloy**
```bash
# Trên EC2
sudo docker compose -f docker-compose.prod.hub.yml logs -f grafana-alloy
```

**Các lỗi thường gặp:**

- **"authentication failed"** hoặc **"401 Unauthorized"**:
  - Kiểm tra lại `GRAFANA_API_TOKEN` trong file `.env` có đúng không
  - Kiểm tra token có đủ permissions (MetricsPublisher, LogsPublisher)
  - Thử tạo token mới từ **My Account** → **API Keys**

- **"connection refused"** hoặc **"timeout"**:
  - Kiểm tra lại `GRAFANA_PROMETHEUS_URL` và `GRAFANA_LOKI_URL` trong file `.env` có đúng không
  - Kiểm tra region có đúng không (`ap-southeast-1`)
  - Kiểm tra network connectivity từ EC2 đến Grafana Cloud:
    ```bash
    curl -I https://prometheus-prod-37-prod-ap-southeast-1.grafana.net/api/prom/push
    ```

- **"no such host"** hoặc **"DNS resolution failed"**:
  - Kiểm tra DNS resolution trên EC2
  - Kiểm tra firewall/security group có chặn outbound traffic không

**Bước 3: Kiểm tra các services có đang expose metrics không**
```bash
# Trên EC2, test từng service
curl http://localhost:8080/actuator/prometheus  # API Gateway
curl http://localhost:8081/actuator/prometheus  # Identity Service
curl http://localhost:8082/actuator/prometheus  # Project Service
# ... các services khác
```
- Nếu không có response → Services chưa expose metrics endpoint
- Nếu có response → Services đang hoạt động bình thường

**Bước 4: Kiểm tra file config.alloy có đúng không**
```bash
# Trên EC2
cat docker/alloy/config.alloy
```
- Kiểm tra xem file có đọc env variables đúng không
- Kiểm tra xem các service targets có đúng không

**Bước 5: Kiểm tra env variables có được load đúng không**
```bash
# Trên EC2, kiểm tra container environment
sudo docker compose -f docker-compose.prod.hub.yml exec grafana-alloy env | grep GRAFANA
```
- Nếu không thấy các biến GRAFANA_* → File `.env` chưa được load hoặc container chưa restart

**Bước 6: Restart lại container sau khi sửa .env**
```bash
# Trên EC2
sudo docker compose -f docker-compose.prod.hub.yml restart grafana-alloy
# Đợi vài giây rồi kiểm tra logs
sudo docker compose -f docker-compose.prod.hub.yml logs -f grafana-alloy
```

**Bước 7: Kiểm tra trong Grafana Cloud sau 1-2 phút**
- Metrics có thể mất vài phút để xuất hiện
- Thử query khác: `{job="api-gateway"}` hoặc `{job="project-service"}`
- Kiểm tra time range: Chọn "Last 5 minutes" hoặc "Last 15 minutes"

**Nếu vẫn không thấy metrics:**
1. Kiểm tra lại tất cả các bước trên
2. Xem logs chi tiết: `sudo docker compose -f docker-compose.prod.hub.yml logs --tail=100 grafana-alloy`
3. Kiểm tra xem có lỗi nào trong logs không
4. Thử tạo token mới và cập nhật lại `.env`

