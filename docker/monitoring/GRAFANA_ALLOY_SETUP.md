# Grafana Alloy - Metrics Collection với Grafana Cloud

## Tổng quan

Grafana Alloy là một agent nhẹ, hiện đại để thu thập metrics và logs, gửi trực tiếp lên Grafana Cloud. 

**Ưu điểm so với Prometheus:**
- ✅ Nhẹ hơn, hiệu quả hơn
- ✅ Cấu hình đơn giản hơn (file `.alloy`)
- ✅ Tích hợp sẵn với Grafana Cloud
- ✅ Không cần tự host Prometheus

## Luồng hoạt động

```
Spring Boot Services (expose /actuator/prometheus)
    ↓
Grafana Alloy (scrape metrics)
    ↓
Grafana Cloud Hosted Prometheus (remote_write)
    ↓
Grafana Cloud UI (visualization)
```

## Cấu hình

### 1. File config.alloy

File `docker/monitoring/config.alloy` đã được cấu hình sẵn với:
- Remote write đến Grafana Cloud Hosted Prometheus
- Scrape metrics từ tất cả Spring Boot services

### 2. Khởi động Alloy

```bash
docker-compose -f docker-compose.prod.hub.yml up -d grafana-alloy
```

### 3. Kiểm tra logs

```bash
docker-compose -f docker-compose.prod.hub.yml logs -f grafana-alloy
```

Nếu thấy logs như:
```
level=info msg="Component started" component=prometheus.scrape.spring_services
level=info msg="Successfully sent metrics" endpoint=hosted-prometheus
```

→ Metrics đã được gửi thành công lên Grafana Cloud!

## Services được monitor

Alloy sẽ scrape metrics từ:

- ✅ `api-gateway:8080/actuator/prometheus`
- ✅ `identity-service:8081/actuator/prometheus`
- ✅ `project-service:8082/actuator/prometheus`
- ✅ `billing-service:8083/actuator/prometheus`
- ✅ `request-service:8084/actuator/prometheus`
- ✅ `notification-service:8085/actuator/prometheus`
- ✅ `specialist-service:8086/actuator/prometheus`
- ✅ `chat-service:8088/actuator/prometheus`

## Xem metrics trong Grafana Cloud

1. Đăng nhập vào Grafana Cloud: https://your-org.grafana.net
2. Vào **Explore**
3. Chọn datasource **Prometheus** (đã được tự động cấu hình)
4. Query metrics:

```promql
# Kiểm tra services đang up
up{job="api-gateway"}

# CPU usage
process_cpu_usage{job="api-gateway"}

# Memory usage
jvm_memory_used_bytes{job="api-gateway"}

# HTTP requests
http_server_requests_seconds_count{job="api-gateway"}

# JVM threads
jvm_threads_live_threads{job="api-gateway"}

# Request rate
rate(http_server_requests_seconds_count{job="api-gateway"}[5m])
```

## Yêu cầu: Spring Boot Services phải expose metrics

Đảm bảo tất cả Spring Boot services có cấu hình sau trong `application-prod.yml`:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
  endpoint:
    prometheus:
      enabled: true
```

## Troubleshooting

### Lỗi 401/403 khi gửi metrics

**Nguyên nhân**: Sai username hoặc token

**Giải pháp**:
1. Vào Grafana Cloud Portal
2. **My Account** → **Security** → **API Keys**
3. Tạo API Key mới
4. Cập nhật trong `config.alloy`:

```alloy
basic_auth {
  username = "YOUR_USER_ID"
  password = "YOUR_NEW_API_KEY"
}
```

5. Restart Alloy:

```bash
docker-compose -f docker-compose.prod.hub.yml restart grafana-alloy
```

### Alloy không scrape được metrics

1. Kiểm tra service có expose `/actuator/prometheus`:

```bash
curl http://api-gateway:8080/actuator/prometheus
```

2. Kiểm tra logs của Alloy:

```bash
docker logs mutrapro-grafana-alloy | grep -i error
```

3. Kiểm tra network:

```bash
docker exec mutrapro-grafana-alloy ping -c 1 api-gateway
```

### Metrics không xuất hiện trong Grafana Cloud

1. Kiểm tra Alloy đang chạy:

```bash
docker ps | grep alloy
```

2. Kiểm tra logs xem có gửi metrics thành công:

```bash
docker logs mutrapro-grafana-alloy | grep -i "sent metrics"
```

3. Kiểm tra trong Grafana Cloud:
   - Vào **Explore**
   - Query: `up`
   - Nếu không thấy metrics, kiểm tra lại credentials

## Bảo mật Token

⚠️ **QUAN TRỌNG**:
- Token trong `config.alloy` là **secret thật**
- **KHÔNG commit** file này lên GitHub
- Sau khi setup xong, **rotate token mới** trong Grafana Cloud
- Dùng environment variables hoặc secrets management (nếu có)

### Option: Dùng Environment Variables (An toàn hơn)

Có thể tạo file `config.alloy.template` và dùng envsubst, nhưng đơn giản nhất là:

1. Tạo file `.env.alloy` (không commit vào Git):

```bash
GRAFANA_CLOUD_USER_ID=2845931
GRAFANA_CLOUD_API_KEY=glc_xxxxxxxxxxxxx
```

2. Mount vào container và dùng trong config (cần cập nhật entrypoint)

Hoặc đơn giản: chỉ cần **không commit** file `config.alloy` vào Git là đủ.

## So sánh: Prometheus vs Grafana Alloy

| Tính năng | Prometheus | Grafana Alloy |
|-----------|------------|---------------|
| **Resource usage** | Cao hơn | Thấp hơn |
| **Setup** | Phức tạp hơn | Đơn giản hơn |
| **Config file** | YAML | Alloy config (dễ đọc hơn) |
| **Grafana Cloud** | Cần cấu hình remote_write | Tích hợp sẵn |
| **Maintenance** | Tự quản lý | Managed |

## Next Steps

Nếu muốn thêm **Logs collection** với Loki Cloud:
- Có thể dùng Alloy để scrape Docker logs
- Hoặc dùng Promtail riêng
- Xem hướng dẫn: `LOKI_CLOUD_SETUP.md` (nếu cần)

## Tài liệu tham khảo

- [Grafana Alloy Documentation](https://grafana.com/docs/alloy/latest/)
- [Grafana Cloud Prometheus](https://grafana.com/docs/grafana-cloud/monitor-applications/application-observability/collect-metrics/collect-prometheus-metrics/)
- [Alloy Config Syntax](https://grafana.com/docs/alloy/latest/concepts/config-language/)

