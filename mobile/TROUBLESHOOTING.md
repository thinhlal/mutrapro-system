# 🔧 Troubleshooting Guide

## Các lỗi thường gặp và cách fix

### 1. ❌ "Cannot find module 'babel-preset-expo'"

**Lỗi:**
```
ERROR  index.js: Cannot find module 'babel-preset-expo'
```

**Nguyên nhân:** Thiếu babel preset cho Expo

**Cách fix:**
```bash
npm install babel-preset-expo --save-dev --legacy-peer-deps
npm start -- --clear
```

✅ **Đã fix!** Package đã được thêm vào devDependencies.

---

### 2. ❌ "Network request failed"

**Lỗi:**
```
Network request failed
TypeError: Network request failed
```

**Nguyên nhân:**
- Backend chưa chạy
- IP/URL trong `.env` không đúng
- Firewall chặn kết nối

**Cách fix:**

1. **Kiểm tra backend:**
```bash
# Test trong browser
http://localhost:8080/api/v1/identity/auth/health
# hoặc
http://192.168.2.4:8080/api/v1/identity/auth/health
```

2. **Kiểm tra .env:**
```env
# Android Emulator
API_BASE_URL=http://10.0.2.2:8080

# Physical Device (cùng mạng WiFi)
API_BASE_URL=http://192.168.2.4:8080
```

3. **Restart app:**
```bash
npm start -- --clear
```

---

### 3. ❌ "Unable to resolve module"

**Lỗi:**
```
error: Error: Unable to resolve module @react-navigation/native
```

**Cách fix:**
```bash
# Xóa node_modules và reinstall
rm -rf node_modules
npm install --legacy-peer-deps

# Clear cache
npm start -- --clear
```

---

### 4. ❌ "ERESOLVE unable to resolve dependency tree"

**Lỗi:**
```
npm error ERESOLVE unable to resolve dependency tree
```

**Cách fix:**
```bash
npm install --legacy-peer-deps
```

---

### 5. ❌ "Port already in use"

**Lỗi:**
```
Error: listen EADDRINUSE: address already in use :::19000
```

**Cách fix:**
```bash
# Kill process đang dùng port
npx kill-port 19000 19001 19002

# Hoặc trên Windows:
netstat -ano | findstr :19000
taskkill /PID <PID_NUMBER> /F
```

---

### 6. ❌ "Metro bundler not starting"

**Cách fix:**
```bash
# Clear watchman (Mac/Linux)
watchman watch-del-all

# Clear Metro cache
npm start -- --clear

# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules
npm install --legacy-peer-deps
```

---

### 7. ❌ "@env module not found"

**Lỗi:**
```
Cannot find module '@env'
```

**Cách fix:**
```bash
# Restart Metro bundler
npm start -- --clear

# Nếu vẫn lỗi, reinstall
npm install react-native-dotenv --save-dev --legacy-peer-deps
npm start -- --clear
```

---

### 8. ❌ "Android build failed"

**Cách fix:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

---

### 9. ❌ "iOS build failed"

**Cách fix:**
```bash
cd ios
pod install
cd ..
npm run ios
```

---

### 10. ❌ "Invariant Violation: "main" has not been registered"

**Cách fix:**
```bash
# Clear cache và restart
npm start -- --clear

# Nếu vẫn lỗi
rm -rf node_modules
npm install --legacy-peer-deps
npm start -- --clear
```

---

## 🔄 Reset toàn bộ (Last resort)

Nếu tất cả cách trên không work:

```bash
# 1. Xóa tất cả
rm -rf node_modules
rm package-lock.json

# 2. Reinstall
npm install --legacy-peer-deps

# 3. Clear cache
npm start -- --reset-cache

# 4. Restart device/emulator
```

---

## ✅ Checklist trước khi chạy app

- [ ] Node.js đã cài đặt (>= 16.x)
- [ ] npm install đã chạy thành công
- [ ] File `.env` đã được cấu hình
- [ ] Backend đang chạy ở port 8080
- [ ] Android SDK / Xcode đã cài đặt (cho native)
- [ ] Device/Emulator đã khởi động

---

## 📞 Cần thêm trợ giúp?

1. Check logs trong Metro bundler
2. Check logs trong Xcode/Android Studio
3. Check console trong React Native Debugger

---

**Tip:** Luôn sử dụng `--clear` flag khi có vấn đề về cache! 🚀

