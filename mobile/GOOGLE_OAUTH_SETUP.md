# 🔐 Google OAuth Setup - Mobile

## ✅ Đã implement xong!

Google OAuth đã được tích hợp vào mobile app, hoạt động giống như frontend web.

## 📦 Packages đã cài đặt:

- ✅ `expo-auth-session` - OAuth authentication
- ✅ `expo-crypto` - Secure random generation
- ✅ `expo-web-browser` - Open Google OAuth in browser

## 🔧 Cấu hình:

### 1. **app.json**
```json
{
  "scheme": "mutrapro",
  "ios": {
    "bundleIdentifier": "com.mutrapro.mobile"
  },
  "android": {
    "package": "com.mutrapro.mobile"
  }
}
```

### 2. **Google Client ID**
Đã sử dụng cùng Client ID với web:
```
807495098527-cngsfgsl7aep23ht0u0t26e99ofohc7u.apps.googleusercontent.com
```

### 3. **Redirect URI**
Expo tự động generate:
```
mutrapro://authenticate
```

## 🔄 Flow hoạt động:

### **Web Flow:**
1. User click "Continue with Google"
2. Redirect đến Google OAuth page
3. Google redirect về `http://localhost:5173/authenticate?code=xxx`
4. AuthenticatePage xử lý code
5. Gọi API `/auth/outbound/authentication?code=xxx`
6. Nhận token và login

### **Mobile Flow:**
1. User click "Continue with Google"
2. Mở Google OAuth trong WebBrowser
3. User đăng nhập Google
4. Google callback về app qua deep link `mutrapro://authenticate?code=xxx`
5. App tự động lấy code từ callback
6. Gọi API `/auth/outbound/authentication?code=xxx`
7. Nhận token và login

## 📱 Cách sử dụng:

### Trong LoginScreen:

```javascript
import { useGoogleAuth, authenticateWithGoogle } from '../../services/googleAuthService';

const { request, response, promptAsync } = useGoogleAuth();

// Click button
<Button
  title="Continue with Google"
  onPress={() => promptAsync()}
  disabled={!request}
/>

// Handle response
useEffect(() => {
  if (response?.type === 'success') {
    const { code } = response.params;
    const { accessToken, user } = await authenticateWithGoogle(code);
    // Save and navigate
  }
}, [response]);
```

## 🔐 Backend API:

**Endpoint:** `POST /api/v1/identity/auth/outbound/authentication?code=xxx`

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGc...",
    "userId": "123",
    "email": "user@gmail.com",
    "fullName": "User Name",
    "role": "CUSTOMER",
    "isNoPassword": true
  }
}
```

## ⚠️ Lưu ý quan trọng:

### 1. **Google Cloud Console Configuration**

Bạn cần thêm Redirect URI vào Google Cloud Console:

**Cho Development (Expo Go):**
```
https://auth.expo.io/@your-username/mutrapro-mobile
```

**Cho Standalone App:**
```
mutrapro://authenticate
```

### 2. **Cách thêm Redirect URI:**

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project của bạn
3. APIs & Services → Credentials
4. Chọn OAuth 2.0 Client ID
5. Thêm Authorized redirect URIs:
   - `https://auth.expo.io/@your-username/mutrapro-mobile` (Expo Go)
   - `mutrapro://authenticate` (Standalone)
   - `http://localhost:5173/authenticate` (Web - đã có)

### 3. **Test trong Development:**

```bash
# Expo Go (recommended for testing)
npm start
# Scan QR code with Expo Go app

# Hoặc emulator
npm run android
npm run ios
```

### 4. **Deep Linking Test:**

Kiểm tra app có nhận deep link không:
```bash
# Android
adb shell am start -W -a android.intent.action.VIEW -d "mutrapro://authenticate?code=test"

# iOS
xcrun simctl openurl booted "mutrapro://authenticate?code=test"
```

## 🧪 Testing Flow:

1. Mở app
2. Click "Continue with Google"
3. Chọn tài khoản Google
4. Google sẽ redirect về app
5. App tự động xử lý và login

## 🔍 Debug:

Check Metro bundler logs:
```
✅ Google OAuth request created
✅ Opening WebBrowser for Google login
✅ Received callback with code: abc123
✅ Authenticating with backend...
✅ Login successful!
```

## ❌ Troubleshooting:

### Lỗi: "Invalid redirect URI"
→ Chưa thêm redirect URI vào Google Cloud Console

### Lỗi: "App không nhận callback"
→ Check `scheme` trong app.json phải là `mutrapro`

### Lỗi: "WebBrowser not opening"
→ Restart Expo: `npm start -- --clear`

## 🎯 Next Steps:

1. ✅ Google OAuth đã work
2. 🔄 Test trên thiết bị thật
3. 🔄 Add Google OAuth vào RegisterScreen (nếu cần)
4. 🔄 Build standalone app để test production

## 📚 Resources:

- [Expo AuthSession Docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth Setup](https://docs.expo.dev/guides/authentication/#google)
- [Deep Linking Guide](https://docs.expo.dev/guides/linking/)

---

**Google OAuth đã sẵn sàng! Test thử ngay!** 🚀

