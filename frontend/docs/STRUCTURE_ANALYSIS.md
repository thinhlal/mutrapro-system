# PHÂN TÍCH CẤU TRÚC THƯ MỤC FRONTEND - MUTRAPRO SYSTEM

## 📁 TỔNG QUAN CẤU TRÚC

Frontend được xây dựng bằng **React + Vite**, sử dụng kiến trúc component-based với tổ chức thư mục rõ ràng theo chức năng.

---

## 🗂️ CẤU TRÚC THƯ MỤC CHI TIẾT

### **1. ROOT DIRECTORY (`/frontend/`)**

#### **File cấu hình chính:**
- `package.json` - Quản lý dependencies và scripts
- `vite.config.js` - Cấu hình Vite build tool (proxy cho klang-api)
- `index.html` - Entry point HTML
- `vercel.json` - Cấu hình deployment Vercel
- `.prettierrc`, `.prettierignore` - Cấu hình code formatting
- `eslint.config.js` - Cấu hình linting rules
- `env.example` - Template cho environment variables

#### **Thư mục build:**
- `dist/` - Output sau khi build production
- `node_modules/` - Dependencies đã cài đặt

---

### **2. SOURCE CODE (`/src/`)**

#### **2.1. Entry Points**
- `main.jsx` - Entry point của ứng dụng, khởi tạo React root
- `App.jsx` - Component gốc, quản lý routing và layout chính
- `index.css` - Global CSS styles

---

#### **2.2. ASSETS (`/src/assets/`)**
Chứa tất cả tài nguyên tĩnh:

- **`animations/`** - Lottie animation files (JSON)
- **`audio/`** - Audio files (demo.mp3)
- **`icons/`** - Icon sets theo từng section:
  - HomePage icons
  - HowItWork icons  
  - Pricing icons
- **`images/`** - Hình ảnh được tổ chức theo chức năng:
  - Background, BannerHomePage, ChooseSingerBanner
  - DiscoverPros, FromSoundToSheet, HomePage
  - LoginPage, Logo, MusicalInstruments
  - MusicTranscription, PricingPage, Singers
  - Thumnail, Transcript
- **`signature/`** - Signature images
- **`videos/`** - Video files (webm format)

---

#### **2.3. COMPONENTS (`/src/components/`)**
Tổ chức components theo chức năng:

##### **`admin/`** - Components dành cho admin (hiện tại trống)

##### **`chat/`** - Hệ thống chat:
- `ChatContent/` - Nội dung chat
- `ChatHeader/` - Header của chat
- `ChatPopup/` - Popup chat
- `ChatRoomCard/` - Card hiển thị phòng chat
- `MessageBubble/` - Bubble hiển thị tin nhắn
- `MessageInput/` - Input để gửi tin nhắn

##### **`common/`** - Components dùng chung:
- `BackToTop/` - Nút scroll to top
- `DateTimeDisplay/` - Hiển thị ngày giờ
- `FileList/` - Danh sách files
- `FlatEditor/` - Editor nhạc (flat notation)
- `Footer/` - Footer của website
- `Header/` - Header navigation
- `MusicNotationEditor/` - Editor ký âm nhạc
- `PageTitle/` - Component hiển thị title
- `RatingStars/` - Component đánh giá sao
- `RequestServiceForm/` - Form yêu cầu dịch vụ
- `ScrollToTop/` - Scroll to top utility
- `Smoosic/` - Integration với Smoosic editor
- `UserMenu/` - Menu người dùng

##### **`contract/`** - Components liên quan hợp đồng:
- `RequestContractList/` - Danh sách yêu cầu hợp đồng

##### **`HandleRoutes/`** - Route protection:
- `ProtectedRoute.jsx` - Component bảo vệ routes cần authentication

##### **`LoadingScreen/`** - Loading states:
- `LoadingScreen.jsx` - Màn hình loading

##### **`modal/`** - Các modal dialogs:
- `BookingDateTimeModal/` - Modal đặt lịch
- `CancelContractModal/` - Modal hủy hợp đồng
- `CreateContractModal/` - Modal tạo hợp đồng
- `EquipmentFormModal/` - Modal form thiết bị
- `InstrumentFormModal/` - Modal form nhạc cụ
- `InstrumentSelectionModal/` - Modal chọn nhạc cụ
- `OTPVerificationModal/` - Modal xác thực OTP
- `ReviewModal/` - Modal đánh giá
- `ReviewRequestModal/` - Modal yêu cầu review
- `RevisionRequestModal/` - Modal yêu cầu chỉnh sửa
- `ServiceRequestDetailModal/` - Modal chi tiết yêu cầu dịch vụ
- `SignaturePadModal/` - Modal ký tên
- `UserDetailModal/` - Modal chi tiết user
- `UserEditModal/` - Modal chỉnh sửa user
- `ViewCancellationReasonModal/` - Modal xem lý do hủy

##### **`NotificationBell/`** - Component thông báo:
- `NotificationBell.jsx` - Icon chuông thông báo

---

#### **2.4. CONFIG (`/src/config/`)**
Cấu hình ứng dụng:

- `apiConfig.jsx` - Cấu hình API endpoints
- `klangConfig.js` - Cấu hình tích hợp Klang API
- `OAuthConfig.jsx` - Cấu hình OAuth authentication

---

#### **2.5. CONSTANTS (`/src/constants/`)**
Dữ liệu constants và mock data:

- `discoverProsData.js` - Dữ liệu discover professionals
- `femaleSingersData.js` - Dữ liệu ca sĩ nữ
- `howItWorksData.js` - Dữ liệu "How it works"
- `index.js` - Export tất cả constants
- `maleSingersData.js` - Dữ liệu ca sĩ nam
- `musicOptionsConstants.js` - Constants cho music options
- `servicesData.js` - Dữ liệu dịch vụ
- `singerDetailData.js` - Dữ liệu chi tiết ca sĩ

---

#### **2.6. CONTEXTS (`/src/contexts/`)**
React Context API:

- `AuthContext.jsx` - Context quản lý authentication state

---

#### **2.7. DATA (`/src/data/`)**
- `commands/` - Data commands (hiện tại trống hoặc ít file)

---

#### **2.8. HOOKS (`/src/hooks/`)**
Custom React hooks:

- `Animations/` - Hooks cho animations (4 files)
- `index.js` - Export tất cả hooks
- `useChat.js` - Hook quản lý chat
- `useClientSide.js` - Hook kiểm tra client-side
- `useDocumentTitle.js` - Hook set document title
- `useNotifications.js` - Hook quản lý notifications
- `useScrollActiveIndex.js` - Hook theo dõi scroll index

---

#### **2.9. INTEGRATIONS (`/src/integrations/`)**
Tích hợp thư viện bên ngoài:

- `smoosic/` - Integration với Smoosic music editor

---

#### **2.10. LAYOUTS (`/src/layouts/`)**
Layout components cho các role khác nhau:

- `AdminChatLayout/` - Layout cho admin chat
- `AdminLayout/` - Layout cho admin dashboard
- `ArrangementLayout/` - Layout cho arrangement
- `ChatLayout/` - Layout cho chat
- `ManagerLayout/` - Layout cho manager
- `ProfileLayout/` - Layout cho profile
- `RecordingArtistLayout/` - Layout cho recording artist
- `SpecialistLayout/` - Layout cho specialist
- `TranscriptionLayout/` - Layout cho transcription

---

#### **2.11. PAGES (`/src/pages/`)**
Các trang chính của ứng dụng, tổ chức theo feature:

##### **`admin/`** (27 pages) - Quản lý admin:
- Chat, ChatRooms
- ContractDetail, ContractsList
- DemoManagement
- EquipmentManagement
- MilestoneDetail, Milestones
- NotationInstruments
- PricingMatrixManagement
- Profile
- ReviewManagement
- RevisionRequests
- ServiceRequestContracts, ServiceRequestManagement
- SkillManagement
- SpecialistManagement
- StudioBooking, StudioBookings
- StudioManagement
- TaskAssignmentWorkspace
- TaskDetail, TaskProgress
- UserManagement
- WalletManagement

##### **`ai-transcription/`** (3 pages) - AI transcription features

##### **`auth/`** (6 pages) - Authentication:
- Login, Register, OTP verification, etc.

##### **`chat/`** (2 pages) - Chat pages

##### **`contracts/`** (2 pages) - Contract management

##### **`dashboard/`** (2 pages) - Dashboard pages

##### **`manager/`** (14 pages) - Manager features

##### **`professionals/`** (8 pages) - Professional pages

##### **`public/`** (28 pages) - Public pages:
- HomePage, About, Services, Pricing, etc.

##### **`recordingArtist/`** (3 pages) - Recording artist features

##### **`services/`** (22 pages) - Service-related pages

##### **`specialist/`** (1 page) - Specialist pages

##### **`transcription/`** (2 pages) - Transcription pages

##### **`user/`** (14 pages) - User profile và user features

##### **`work/`** (3 pages) - Work-related pages

---

#### **2.12. SERVICES (`/src/services/`)**
API service layers - tách biệt logic gọi API:

- `adminWalletService.jsx` - Admin wallet operations
- `authService.jsx` - Authentication services
- `chatService.jsx` - Chat services
- `contractService.jsx` - Contract services
- `equipmentService.jsx` - Equipment services
- `fileService.js` - File operations
- `fileSubmissionService.js` - File submission
- `localStorageService.jsx` - LocalStorage utilities
- `notationInstrumentService.jsx` - Notation instrument services
- `notificationService.js` - Notification services
- `notificationWebSocketService.js` - WebSocket cho notifications
- `paymentService.jsx` - Payment services
- `pricingMatrixService.jsx` - Pricing matrix services
- `reviewService.jsx` - Review services
- `revisionRequestService.js` - Revision request services
- `serviceRequestService.jsx` - Service request services
- `specialistService.jsx` - Specialist services
- `studioBookingService.jsx` - Studio booking services
- `studioService.jsx` - Studio services
- `taskAssignmentService.jsx` - Task assignment services
- `userService.jsx` - User services
- `vietqrService.jsx` - VietQR payment integration
- `walletService.jsx` - Wallet services
- `websocketService.jsx` - WebSocket services

---

#### **2.13. STORES (`/src/stores/`)**
State management với Zustand:

- `useInstrumentStore.jsx` - Store quản lý instruments
- `useKlangTranscriptionStore.js` - Store cho Klang transcription
- `useUserStore.jsx` - Store quản lý user state

---

#### **2.14. STYLES (`/src/styles/`)**
- `global.css` - Global styles

---

#### **2.15. UTILS (`/src/utils/`)**
Utility functions và helpers:

- `arrayUtils.js` - Array utilities
- `axiosInstance.jsx` - Axios instance với interceptors
- `axiosInstancePublic.jsx` - Public Axios instance
- `exporters/` - Export utilities (hiện tại trống)
- `filePreviewHelper.js` - File preview helpers
- `getMediaDuration.js` - Get media duration
- `importers/` - Import utilities (hiện tại trống)
- `index.js` - Export tất cả utils
- `jwtUtils.jsx` - JWT token utilities
- `music/` - Music-related utilities
- `notificationUtils.js` - Notification utilities
- `playback/` - Playback utilities
- `render/` - Render utilities
- `roleRedirect.js` - Role-based redirect logic
- `timeUtils.js` - Time/date utilities

---

### **3. PUBLIC (`/public/`)**
Static assets được serve trực tiếp:

- **`fonts/`** - Font files (BeVietnamPro)
- **`images/`** - Public images (signature.png)
- **`MUTRAPROI.svg`** - Logo
- **`smoosic/`** - Smoosic editor library:
  - `html/` - HTML test files
  - `library/` - Library files
  - `styles/` - CSS và fonts cho Smoosic
  - `*.js` - JavaScript files (smoosic.js, midi-parser.js, jszip.js)
  - `mutrapro-theme.css` - Custom theme
- **`vite.svg`** - Vite logo

---

## 🏗️ KIẾN TRÚC TỔNG THỂ

### **Pattern được sử dụng:**

1. **Feature-based organization** - Tổ chức theo tính năng (pages, components)
2. **Separation of concerns**:
   - `services/` - API calls
   - `stores/` - State management
   - `utils/` - Helper functions
   - `components/` - Reusable UI components
   - `pages/` - Route-level components

3. **Role-based layouts** - Mỗi role có layout riêng
4. **Service layer pattern** - Tách biệt API logic khỏi components

### **Tech Stack chính:**

- **React 19.1.1** - UI framework
- **Vite 7.1.2** - Build tool
- **React Router DOM 7.8.2** - Routing
- **Zustand 5.0.8** - State management
- **Ant Design 5.27.3** - UI component library
- **Material-UI 7.3.2** - Additional UI components
- **Axios 0.27.2** - HTTP client
- **WebSocket** - Real-time communication (STOMP, SockJS)
- **Smoosic/Flat-embed** - Music notation editor
- **Wavesurfer.js** - Audio visualization
- **React PDF** - PDF generation

---

## 📊 THỐNG KÊ

- **Tổng số pages**: ~150+ pages
- **Components**: ~50+ reusable components
- **Services**: 24 service files
- **Layouts**: 9 layouts cho các role khác nhau
- **Hooks**: 6+ custom hooks

---

## 🔄 FLOW ĐIỂN HÌNH

1. **User truy cập** → `main.jsx` → `App.jsx`
2. **Routing** → `pages/` tương ứng
3. **Layout** → Áp dụng layout từ `layouts/` theo role
4. **Components** → Sử dụng components từ `components/`
5. **Data fetching** → Gọi services từ `services/`
6. **State management** → Sử dụng stores từ `stores/` hoặc Context
7. **API calls** → Sử dụng `axiosInstance` từ `utils/`

---

## 📝 GHI CHÚ QUAN TRỌNG

1. **Environment variables**: Cần setup từ `env.example`
2. **Proxy configuration**: Vite proxy cho `/klang-api` → `https://api.klang.io`
3. **Smoosic integration**: Có thư viện Smoosic trong `public/smoosic/`
4. **Multi-role system**: Hỗ trợ nhiều roles (admin, manager, specialist, user, etc.)
5. **Real-time features**: WebSocket cho chat và notifications

