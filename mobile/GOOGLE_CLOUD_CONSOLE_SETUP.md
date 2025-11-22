# 🔧 Google Cloud Console Setup - Fix "Invalid redirect URI"

## 📋 Bước 1: Lấy Redirect URI từ app

### **Cách 1: Check trong Metro terminal**

Khi app khởi động, bạn sẽ thấy log:

```
==================================================
🔗 REDIRECT URI INFO:
==================================================
Redirect URI: https://auth.expo.io/@your-username/mutrapro-mobile
App Scheme: mutrapro
App Name: MuTraPro Mobile
App Slug: mutrapro-mobile
==================================================

📋 Copy redirect URI này và thêm vào Google Cloud Console!
```

→ **Copy đoạn Redirect URI**

### **Cách 2: Tự tạo Redirect URI**

**Nếu dùng Expo Go (Development):**
```
https://auth.expo.io/@YOUR_EXPO_USERNAME/mutrapro-mobile
```

Thay `YOUR_EXPO_USERNAME` bằng username Expo của bạn.

**Tìm username:**
```bash
npx expo whoami
```

**Nếu chưa login Expo:**
```bash
npx expo login
# hoặc
npx expo register
```

## 🌐 Bước 2: Thêm Redirect URI vào Google Cloud Console

### **1. Truy cập Google Cloud Console**

Mở: https://console.cloud.google.com/

### **2. Chọn Project**

- Click dropdown ở top bar
- Chọn project "MuTraPro" (hoặc tên project của bạn)

### **3. Vào OAuth Credentials**

- Sidebar: **APIs & Services** → **Credentials**
- Tìm OAuth 2.0 Client ID với tên "Web client" hoặc client ID: `807495098527-cngsfgsl7aep23ht0u0t26e99ofohc7u`
- Click vào để edit

### **4. Thêm Authorized redirect URIs**

Scroll xuống phần **Authorized redirect URIs**, click **+ ADD URI**

Thêm các URIs sau:

#### **A. Cho Web (đã có):**
```
http://localhost:5173/authenticate
```

#### **B. Cho Mobile - Expo Go (Development):**
```
https://auth.expo.io/@YOUR_EXPO_USERNAME/mutrapro-mobile
```
Thay `YOUR_EXPO_USERNAME` bằng username thực của bạn!

#### **C. Cho Mobile - Standalone App (Production):**
```
mutrapro://authenticate
```

#### **D. Cho iOS (nếu cần):**
```
com.mutrapro.mobile:/authenticate
```

#### **E. Cho Android (nếu cần):**
```
com.mutrapro.mobile:/authenticate
```

### **5. Lưu cấu hình**

- Click **SAVE** ở cuối trang
- Đợi vài giây để Google cập nhật

## ✅ Kết quả cuối cùng

Danh sách Authorized redirect URIs sẽ có:

```
✅ http://localhost:5173/authenticate                    (Web - đã có)
✅ https://auth.expo.io/@your-username/mutrapro-mobile   (Mobile Expo Go)
✅ mutrapro://authenticate                               (Mobile Standalone)
✅ com.mutrapro.mobile:/authenticate                     (iOS/Android - optional)
```

## 🧪 Bước 3: Test lại

1. **Đảm bảo đã Save trong Google Cloud Console**

2. **Restart Metro bundler:**
```bash
# Stop (Ctrl + C)
npm start -- --clear
```

3. **Reload app:**
- Trong app: nhấn R, R
- Hoặc restart: `npm run android`

4. **Click "Continue with Google"**

5. **Chọn tài khoản Google**

6. **✅ Success!** App sẽ tự động login

## 🎯 Ví dụ cụ thể

**Giả sử Expo username của bạn là `anhminh`:**

Redirect URI sẽ là:
```
https://auth.expo.io/@anhminh/mutrapro-mobile
```

Thêm URI này vào Google Cloud Console!

## 🔍 Troubleshooting

### Vẫn gặp lỗi "Invalid redirect URI"?

**Kiểm tra:**
1. ✅ Đã Save trong Google Cloud Console chưa?
2. ✅ Expo username có đúng không?
3. ✅ App slug đúng là `mutrapro-mobile`?
4. ✅ Đã restart Metro bundler chưa?

**Test redirect URI:**
```bash
# Check username
npx expo whoami

# Check trong app.json
cat app.json | grep slug
# Output: "slug": "mutrapro-mobile"
```

### Không có Expo username?

```bash
# Register tài khoản Expo
npx expo register

# Hoặc login
npx expo login
```

### Muốn test mà không cần Expo account?

Sử dụng standalone build hoặc custom dev client (advanced).

## 📸 Screenshot hướng dẫn

**Google Cloud Console - OAuth Credentials:**

```
┌─────────────────────────────────────────────────┐
│ OAuth 2.0 Client IDs                            │
├─────────────────────────────────────────────────┤
│ Name: Web client                                │
│ Client ID: 807495098527-...                     │
│                                                 │
│ Authorized redirect URIs:                       │
│ ┌───────────────────────────────────────────┐  │
│ │ http://localhost:5173/authenticate       │  │
│ │ https://auth.expo.io/@user/mutrapro...   │  │
│ │ mutrapro://authenticate                  │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ [SAVE]                                          │
└─────────────────────────────────────────────────┘
```

## 📋 Quick Checklist

- [ ] Lấy Expo username: `npx expo whoami`
- [ ] Tạo redirect URI: `https://auth.expo.io/@username/mutrapro-mobile`
- [ ] Vào Google Cloud Console
- [ ] Chọn đúng project
- [ ] Mở OAuth Client ID credentials
- [ ] Thêm redirect URI
- [ ] Click Save
- [ ] Đợi 1-2 phút
- [ ] Restart Metro bundler
- [ ] Test lại

---

**Sau khi làm xong các bước trên, Google OAuth sẽ work!** 🎉

