# Quick Start - Grafana Alloy với Grafana Cloud

## Bước 1: Khởi động Alloy

```bash
docker-compose -f docker-compose.prod.hub.yml up -d grafana-alloy
```

## Bước 2: Kiểm tra logs

```bash
docker-compose -f docker-compose.prod.hub.yml logs -f grafana-alloy
```

Nếu thấy:
```
level=info msg="Component started" component=prometheus.scrape.spring_services
level=info msg="Successfully sent metrics" endpoint=hosted-prometheus
```

→ **Thành công!** Metrics đã được gửi lên Grafana Cloud.

## Bước 3: Xem metrics trong Grafana Cloud

1. Đăng nhập: https://your-org.grafana.net
2. Vào **Explore**
3. Chọn datasource **Prometheus**
4. Query: `up{job="api-gateway"}`

## Troubleshooting nhanh

### Lỗi 401/403
→ Sai token. Tạo API Key mới trong Grafana Cloud và cập nhật `config.alloy`

### Không scrape được metrics
→ Kiểm tra service có expose `/actuator/prometheus`:
```bash
curl http://api-gateway:8080/actuator/prometheus
```

## Lưu ý bảo mật

⚠️ File `config.alloy` chứa **API key thật**:
- ✅ **KHÔNG commit** vào Git
- ✅ Thêm vào `.gitignore`
- ✅ Sau khi setup, **rotate token** mới trong Grafana Cloud

Xem chi tiết: [GRAFANA_ALLOY_SETUP.md](./GRAFANA_ALLOY_SETUP.md)

