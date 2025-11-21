# 🔧 Environment Variables Setup

## Cách sử dụng Environment Variables

### 1. Tạo file `.env`

Trong thư mục `mobile/`, tạo file `.env`:

```bash
# Cho Android Emulator
API_BASE_URL=http://10.0.2.2:8080

# Hoặc cho iOS Simulator
API_BASE_URL=http://localhost:8080

# Hoặc cho Physical Device (thay YOUR_IP bằng IP máy bạn)
API_BASE_URL=http://192.168.1.100:8080
```

### 2. Tìm IP máy tính của bạn

#### Windows:
```cmd
ipconfig
```
Tìm dòng **IPv4 Address**, ví dụ: `192.168.1.100`

#### Mac/Linux:
```bash
ifconfig
# hoặc
ipconfig getifaddr en0
```

### 3. Cập nhật file `.env`

Sửa `API_BASE_URL` trong file `.env` của bạn:

```env
API_BASE_URL=http://192.168.1.100:8080
```

### 4. Restart Metro Bundler

Sau khi thay đổi `.env`, cần restart:

```bash
# Stop Metro (Ctrl + C)
# Clear cache và restart
npm start -- --clear
```

## 📱 Theo từng môi trường

### Android Emulator
```env
API_BASE_URL=http://10.0.2.2:8080
```
- `10.0.2.2` là địa chỉ đặc biệt trỏ tới `localhost` của máy host

### iOS Simulator
```env
API_BASE_URL=http://localhost:8080
```
- iOS Simulator chia sẻ network với máy host

### Physical Device (Android/iOS)
```env
API_BASE_URL=http://192.168.1.100:8080
```
- Thay `192.168.1.100` bằng IP thực của máy bạn
- **Quan trọng**: Device và máy tính phải cùng mạng WiFi

## 🔍 Kiểm tra cấu hình

Trong app, mở console và xem log:

```javascript
console.log('API Base URL:', API_CONFIG.BASE_URL);
```

Bạn sẽ thấy log khi app khởi động:
```
🔧 [Mobile Config] API Configuration: {
  BASE_URL: 'http://10.0.2.2:8080',
  API_PREFIX: '/api/v1',
  ENV: 'Development'
}
```

## 🚨 Lưu ý quan trọng

1. **File `.env` không được commit lên Git**
   - Đã có trong `.gitignore`
   - Mỗi developer có `.env` riêng

2. **Restart sau khi đổi .env**
   - Metro bundler cache environment variables
   - Luôn restart khi thay đổi

3. **Backend phải chạy**
   - Đảm bảo backend đang chạy trên port 8080
   - Test bằng browser: `http://localhost:8080/api/v1/health`

## 🔧 Troubleshooting

### Lỗi: "Cannot read property 'API_BASE_URL'"
```bash
# Clear cache
npm start -- --clear
# Restart app
```

### Lỗi: "Network request failed"
- Kiểm tra backend có chạy không
- Kiểm tra IP/port có đúng không
- Kiểm tra firewall có chặn không

### Lỗi: "Unexpected token import"
```bash
# Cài lại dependencies
npm install --legacy-peer-deps
# Restart
npm start -- --clear
```

## 📝 Ví dụ file `.env`

```env
# Development - Local
API_BASE_URL=http://localhost:8080

# Development - Android Emulator
# API_BASE_URL=http://10.0.2.2:8080

# Development - Physical Device
# API_BASE_URL=http://192.168.1.100:8080

# Staging
# API_BASE_URL=https://staging-api.mutrapro.com

# Production
# API_BASE_URL=https://api.mutrapro.com
```

---

**Tip**: Copy file `.env.local.example` thành `.env` và chỉnh sửa theo môi trường của bạn! 🎯

