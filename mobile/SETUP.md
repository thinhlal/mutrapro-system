# MuTraPro Mobile - Setup Guide

## Bước 1: Cài đặt Dependencies

```bash
cd mobile
npm install --legacy-peer-deps
```

**Lưu ý**: Sử dụng `--legacy-peer-deps` để tránh conflict giữa các dependencies.

## Bước 2: Cấu hình API Endpoint

Cập nhật file `src/config/apiConfig.js` và thay đổi `BASE_URL` theo môi trường của bạn:

### Cho Android Emulator:
```javascript
BASE_URL: 'http://10.0.2.2:8080'
```

### Cho iOS Simulator:
```javascript
BASE_URL: 'http://localhost:8080'
```

### Cho Physical Device:
```javascript
BASE_URL: 'http://YOUR_IP_ADDRESS:8080'
```

**Lưu ý**: Thay `YOUR_IP_ADDRESS` bằng địa chỉ IP của máy tính đang chạy backend.

Để tìm IP của bạn:
- **Windows**: Mở CMD và gõ `ipconfig`, tìm IPv4 Address
- **Mac/Linux**: Mở Terminal và gõ `ifconfig`, tìm inet address

## Bước 3: Khởi động Backend

Đảm bảo backend của bạn đang chạy trên port 8080 (hoặc port bạn đã cấu hình).

## Bước 4: Chạy App

### Khởi động Expo Development Server:
```bash
npm start
```

### Chạy trên Android:
```bash
npm run android
```

### Chạy trên iOS:
```bash
npm run ios
```

### Chạy trên Web:
```bash
npm run web
```

## Bước 5: Test Authentication Flow

1. **Register**: Tạo tài khoản mới với role CUSTOMER
2. **Verify Email**: Nhập OTP code từ email
3. **Login**: Đăng nhập với tài khoản đã tạo
4. **Profile**: Xem và chỉnh sửa thông tin cá nhân

## Troubleshooting

### Lỗi: Cannot connect to backend
- Kiểm tra backend đã chạy chưa
- Kiểm tra BASE_URL đã đúng chưa
- Kiểm tra firewall có chặn kết nối không

### Lỗi: Module not found
```bash
npm install
cd ios && pod install && cd .. # Chỉ cho iOS
```

### Lỗi: Port already in use
```bash
# Kill process đang dùng port
npx kill-port 19000 19001 19002
```

### Clear cache
```bash
expo start -c
# hoặc
npm start -- --clear
```

## Development Tips

1. **Hot Reload**: Nhấn `r` trong terminal để reload app
2. **Debug Menu**: 
   - iOS: Cmd + D
   - Android: Cmd + M (Mac) hoặc Ctrl + M (Windows)
3. **Console logs**: Xem trong terminal hoặc React Native Debugger

## API Endpoints Được Sử Dụng

### Authentication
- POST `/api/v1/identity/auth/log-in` - Login
- POST `/api/v1/identity/auth/register` - Register
- POST `/api/v1/identity/auth/logout` - Logout
- POST `/api/v1/identity/auth/refresh` - Refresh token

### User Management
- GET `/api/v1/identity/users/{id}/full` - Get user profile
- PUT `/api/v1/identity/users/{id}/full` - Update user profile
- POST `/api/v1/identity/users/verify-email` - Verify email
- POST `/api/v1/identity/users/resend-verification` - Resend verification code
- GET `/api/v1/identity/users/verification-status` - Check verification status

### Password Reset
- POST `/api/v1/identity/auth/forgot-password` - Request password reset
- POST `/api/v1/identity/auth/reset-password` - Reset password

## Next Steps

Sau khi setup thành công, bạn có thể:
1. Thêm các màn hình mới (Service Requests, Contracts, Wallet...)
2. Tích hợp thêm các API endpoints
3. Customize UI/UX theo design
4. Thêm push notifications
5. Implement offline mode

---

Chúc bạn code vui vẻ! 🚀

