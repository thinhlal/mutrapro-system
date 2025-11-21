# MuTraPro Mobile App

Mobile application for MuTraPro music composition platform built with React Native and Expo.

## 🚀 Features

- **Authentication**: Login, Register, Email Verification, Password Reset
- **Profile Management**: View and edit user profile
- **Service Requests**: Create and manage music service requests
- **Contracts**: View and manage contracts
- **Wallet**: Manage payments and transactions
- **Notifications**: Real-time notifications

## 📋 Prerequisites

- Node.js (>= 16.x)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Emulator

## 🛠️ Installation

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Configure API endpoint:
- Copy `.env.example` to `.env`
- Update `API_BASE_URL` with your backend URL:
  - Android Emulator: `http://10.0.2.2:8080`
  - iOS Simulator: `http://localhost:8080`
  - Physical Device: `http://YOUR_IP_ADDRESS:8080`

## 🎯 Running the App

### Development Mode

Start the development server:
```bash
npm start
```

### Run on Android
```bash
npm run android
```

### Run on iOS
```bash
npm run ios
```

### Run on Web
```bash
npm run web
```

## 📱 Features by Role

### CUSTOMER
- ✅ Login & Register
- ✅ Email Verification
- ✅ Profile Management
- ✅ Password Reset
- 🚧 Create Service Requests (Coming soon)
- 🚧 View Contracts (Coming soon)
- 🚧 Wallet Management (Coming soon)

## 🏗️ Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Button.js
│   │   ├── Input.js
│   │   ├── OTPInput.js
│   │   └── ...
│   ├── config/             # Configuration files
│   │   ├── apiConfig.js    # API endpoints
│   │   └── constants.js    # App constants
│   ├── contexts/           # React contexts
│   │   └── AuthContext.js  # Authentication context
│   ├── navigation/         # Navigation setup
│   │   ├── AuthStack.js    # Auth screens navigation
│   │   ├── MainStack.js    # Main screens navigation
│   │   └── RootNavigator.js
│   ├── screens/            # App screens
│   │   ├── Auth/           # Authentication screens
│   │   │   ├── LoginScreen.js
│   │   │   ├── RegisterScreen.js
│   │   │   ├── VerifyEmailScreen.js
│   │   │   ├── ForgotPasswordScreen.js
│   │   │   └── ResetPasswordScreen.js
│   │   └── Main/           # Main app screens
│   │       ├── HomeScreen.js
│   │       ├── ProfileScreen.js
│   │       └── EditProfileScreen.js
│   ├── services/           # API services
│   │   ├── authService.js
│   │   └── userService.js
│   └── utils/              # Utility functions
│       ├── axiosInstance.js
│       ├── axiosInstancePublic.js
│       ├── storage.js
│       └── validators.js
├── assets/                 # Images, fonts, etc.
├── App.js                  # App entry point
├── app.json               # Expo configuration
└── package.json

```

## 🎨 Styling

The app uses a consistent design system defined in `src/config/constants.js`:
- Colors
- Font sizes
- Spacing
- Border radius

## 🔐 Authentication Flow

1. User registers with email and password
2. Email verification code is sent
3. User verifies email with OTP
4. User can login
5. Access token is stored in AsyncStorage
6. Auto-refresh token on expiry

## 📡 API Integration

The app uses the same API endpoints as the web application:
- Identity Service: Authentication & User Management
- Project Service: Contracts & Files
- Request Service: Service Requests
- Billing Service: Wallet & Payments
- Notification Service: Real-time notifications

## 🧪 Testing

```bash
# Run tests (when available)
npm test
```

## 📦 Building

### Build for Android
```bash
expo build:android
```

### Build for iOS
```bash
expo build:ios
```

## 🤝 Contributing

1. Create a new branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

Private - MuTraPro Project

## 👥 Team

Backend & Frontend Web Team + Mobile Team

---

For more information, please contact the development team.

