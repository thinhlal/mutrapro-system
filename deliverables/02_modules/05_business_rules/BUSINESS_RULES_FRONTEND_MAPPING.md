# 📋 BUSINESS RULES - FRONTEND MAPPING

Tài liệu này map các Business Rules với các trang/component tương ứng trong Frontend.

---

## 🔐 AUTHENTICATION & USER MANAGEMENT

### BR-01 đến BR-27: Authentication & User Management Rules

**Trang liên quan:**
- `/login` - `pages/auth/Login/LoginPage.jsx` (BR-01, BR-02, BR-06, BR-07)
- `/register` - `pages/auth/Register/RegisterPage.jsx` (BR-01, BR-02, BR-03, BR-04, BR-05, BR-25, BR-26, BR-27)
- `/verify-email` - `pages/auth/VerifyEmail/VerifyEmailPage.jsx` (BR-03, BR-05)
- `/reset-password` - `pages/auth/ResetPassword/ResetPasswordPage.jsx` (BR-02)
- `/profile` - `pages/user/Profile/ProfilePage.jsx` (BR-25, BR-26, BR-27)
- `/admin/users` - `pages/admin/UserManagement/UserManagement.jsx` (BR-08)

---

## 📝 SERVICE REQUEST RULES

### BR-09 đến BR-32: Service Request Rules

**Trang liên quan:**
- `/detail-service` - `pages/services/ServiceRequest/ServiceRequestPage.jsx` (BR-09, BR-10, BR-11, BR-28, BR-29, BR-30, BR-31, BR-32)
- `/recording-flow` - `pages/services/ServiceRequest/RecordingFlow/RecordingFlowController.jsx` (BR-09, BR-10, BR-11, BR-30, BR-31, BR-32)
- `/recording-flow/vocalist-selection` - `pages/services/ServiceRequest/RecordingFlow/pages/VocalistSelectionPage.jsx` (BR-32)
- `/recording-flow/instrumentalist-selection` - `pages/services/ServiceRequest/RecordingFlow/pages/InstrumentalistSelectionPage.jsx` (BR-32)
- `/recording-flow/equipment-selection` - `pages/services/ServiceRequest/RecordingFlow/pages/EquipmentSelectionPage.jsx` (BR-30)
- `/my-requests` - `pages/user/MyRequests/MyRequestsPage.jsx` (BR-09, BR-10, BR-11)
- `/my-requests/:requestId` - `pages/user/RequestDetail/RequestDetailPage.jsx` (BR-09, BR-10, BR-11, BR-31, BR-32)
- `/admin/service-requests` - `pages/admin/ServiceRequestManagement/ServiceRequestManagement.jsx` (BR-09, BR-10, BR-11)

---

## 💰 PAYMENT & BILLING RULES

### BR-12 đến BR-39: Payment & Billing Rules

**Trang liên quan:**
- `/wallet` - `pages/user/Wallet/WalletPage.jsx` (BR-35, BR-36, BR-37, BR-38, BR-39)
- `/topup-payment` - `pages/user/TopupPayment/TopupPaymentPage.jsx` (BR-39)
- `/pay-deposit` - `pages/user/PayDeposit/PayDepositPage.jsx` (BR-12, BR-35, BR-36, BR-37, BR-38)
- `/pay-milestone` - `pages/user/PayMilestone/PayMilestonePage.jsx` (BR-35, BR-36, BR-37, BR-38)
- `/pay-revision-fee` - `pages/user/PayRevisionFee/PayRevisionFeePage.jsx` (BR-35, BR-36, BR-37, BR-38)
- `/payment-success` - `pages/user/PaymentSuccess/PaymentSuccessPage.jsx` (BR-12, BR-35, BR-36)
- `/contracts/:contractId` - `pages/user/ContractDetail/ContractDetailPage.jsx` (BR-12, BR-13, BR-14, BR-15, BR-23, BR-33, BR-34)
- `/admin/wallets` - `pages/admin/WalletManagement/WalletManagement.jsx` (BR-35, BR-36, BR-37)

---

## 📋 CONTRACT & MILESTONE RULES

### BR-40 đến BR-48: Contract & Milestone Rules

**Trang liên quan:**
- `/contracts/:contractId` - `pages/user/ContractDetail/ContractDetailPage.jsx` (BR-40, BR-41, BR-42, BR-43, BR-44, BR-45, BR-46, BR-47, BR-48)
- `/contracts/:contractId` - `pages/manager/ContractDetail/ManagerContractDetailPage.jsx` (BR-40, BR-41, BR-42, BR-43, BR-44, BR-45, BR-46, BR-48)
- `/contracts/builder` - `pages/contracts/Builder/ContractBuilder.jsx` (BR-40, BR-41, BR-42, BR-43, BR-44, BR-45)
- `/contract-signed-success` - `pages/user/ContractSignedSuccess/ContractSignedSuccessPage.jsx` (BR-46, BR-47)
- `/milestones/:milestoneId` - `pages/manager/MilestoneDetail/MilestoneDetailPage.jsx` (BR-40, BR-41, BR-42, BR-43, BR-44, BR-45, BR-48)

---

## 🎯 TASK ASSIGNMENT & MILESTONE RULES

### BR-49 đến BR-57: Task Assignment & Milestone Rules

**Trang liên quan:**
- `/manager/tasks` - `pages/manager/TaskAssignmentWorkspace/TaskAssignmentWorkspace.jsx` (BR-49, BR-50, BR-51, BR-52)
- `/manager/tasks/:taskId` - `pages/manager/TaskDetail/TaskDetailPage.jsx` (BR-49, BR-50, BR-51, BR-52, BR-55, BR-56, BR-57)
- `/transcription/tasks` - `pages/transcription/MyTasksPage/MyTasksPage.jsx` (BR-55, BR-56)
- `/transcription/tasks/:taskId` - `pages/specialist/TaskDetailPage/SpecialistTaskDetailPage.jsx` (BR-55, BR-56, BR-57)
- `/manager/milestones` - `pages/manager/Milestones/MilestonesPage.jsx` (BR-51, BR-52, BR-53, BR-54)
- `/manager/milestones/:milestoneId` - `pages/manager/MilestoneDetail/MilestoneDetailPage.jsx` (BR-51, BR-52, BR-53, BR-54)

---

## 🎤 BOOKING & SCHEDULING RULES

### BR-16, BR-58 đến BR-62, BR-96 đến BR-118: Booking & Scheduling Rules

**Trang liên quan:**
- `/manager/studio-booking` - `pages/manager/StudioBooking/StudioBookingPage.jsx` (BR-58, BR-59, BR-60, BR-61, BR-62, BR-96, BR-97, BR-98, BR-99, BR-100, BR-101, BR-108, BR-110)
- `/manager/studio-bookings` - `pages/manager/StudioBookings/StudioBookingsManagement.jsx` (BR-58, BR-59, BR-60, BR-61, BR-62, BR-102, BR-103, BR-104, BR-107, BR-114, BR-117, BR-118)
- `/manager/studio-bookings/:bookingId` - `pages/manager/StudioBookings/StudioBookingDetailPage.jsx` (BR-58, BR-59, BR-60, BR-61, BR-62, BR-102, BR-103, BR-104, BR-107, BR-114, BR-117, BR-118)
- `/recording-artist/my-slots` - `pages/recordingArtist/MySlots/MySlotsPage.jsx` (BR-115, BR-116)
- `/recording-artist/my-bookings` - `pages/recordingArtist/MyStudioBookings/MyStudioBookings.jsx` (BR-102, BR-115, BR-116, BR-117)
- `/recording-artist/bookings/:bookingId` - `pages/recordingArtist/StudioBookingDetail/StudioBookingDetailPage.jsx` (BR-102, BR-115, BR-116, BR-117)
- `/recording-flow` - `pages/services/ServiceRequest/RecordingFlow/RecordingFlowController.jsx` (BR-58, BR-59, BR-60, BR-61, BR-62, BR-96, BR-97, BR-101, BR-109, BR-110, BR-115)
- `/recording-flow/*` - Các steps trong RecordingFlow (BR-58, BR-59, BR-60, BR-61, BR-62, BR-96, BR-97, BR-101, BR-109, BR-110)

---

## 🎵 PARTICIPANT & EQUIPMENT RULES

### BR-63 đến BR-67: Participant & Equipment Rules

**Trang liên quan:**
- `/recording-flow/vocalist-selection` - `pages/services/ServiceRequest/RecordingFlow/pages/VocalistSelectionPage.jsx` (BR-63)
- `/recording-flow/instrumentalist-selection` - `pages/services/ServiceRequest/RecordingFlow/pages/InstrumentalistSelectionPage.jsx` (BR-64, BR-65, BR-66)
- `/recording-flow/equipment-selection` - `pages/services/ServiceRequest/RecordingFlow/pages/EquipmentSelectionPage.jsx` (BR-65, BR-67)
- `/manager/studio-booking` - `pages/manager/StudioBooking/StudioBookingPage.jsx` (BR-63, BR-64, BR-65, BR-66, BR-67)
- `/admin/equipment` - `pages/admin/EquipmentManagement/EquipmentManagement.jsx` (BR-67)

---

## 📁 FILE & DELIVERY RULES

### BR-17, BR-18, BR-68 đến BR-70: File & Delivery Rules

**Trang liên quan:**
- `/milestone-deliveries` - `pages/user/MilestoneDeliveries/MilestoneDeliveriesPage.jsx` (BR-17, BR-18, BR-68, BR-69, BR-70)
- `/my-requests/:requestId` - `pages/user/RequestDetail/RequestDetailPage.jsx` (BR-68, BR-69, BR-70)
- `/manager/tasks/:taskId` - `pages/manager/TaskDetail/TaskDetailPage.jsx` (BR-17, BR-18, BR-68, BR-69, BR-70)
- `/transcription/tasks/:taskId` - `pages/specialist/TaskDetailPage/SpecialistTaskDetailPage.jsx` (BR-17, BR-18, BR-68, BR-69, BR-70)
- `/detail-service` - `pages/services/ServiceRequest/ServiceRequestPage.jsx` (BR-68, BR-69, BR-70)

---

## 👥 SPECIALIST RULES

### BR-71 đến BR-75: Specialist Rules

**Trang liên quan:**
- `/admin/specialists` - `pages/admin/SpecialistManagement/SpecialistManagement.jsx` (BR-71, BR-72, BR-73, BR-74, BR-75)
- `/manager/tasks` - `pages/manager/TaskAssignmentWorkspace/TaskAssignmentWorkspace.jsx` (BR-49, BR-50, BR-74)
- `/pros/singers/:gender` - `pages/professionals/Singers/List/SingersPage.jsx` (BR-72, BR-74)
- `/pros/singer/:id` - `pages/professionals/Singers/Detail/SingerDetailPage.jsx` (BR-72, BR-74)
- `/transcription/profile` - `pages/transcription/Profile/SpecialistProfile.jsx` (BR-73, BR-74)

---

## 💬 MESSAGING & COMMUNICATION RULES

### BR-20, BR-76, BR-77: Messaging & Communication Rules

**Trang liên quan:**
- `/chat` - `pages/chat/ChatRooms/ChatRoomsPage.jsx` (BR-20, BR-76, BR-77)
- `/chat/:roomId` - `pages/chat/ChatConversation/ChatConversationPage.jsx` (BR-20, BR-76, BR-77)
- `/manager/chat` - `pages/manager/Chat/ManagerChatPage.jsx` (BR-20, BR-76, BR-77)

---

## ⚖️ DISPUTE & RESOLUTION RULES

### BR-21, BR-78: Dispute & Resolution Rules

**Trang liên quan:**
- `/contracts/:contractId` - `pages/user/ContractDetail/ContractDetailPage.jsx` (BR-21, BR-78)
- `/contracts/:contractId` - `pages/manager/ContractDetail/ManagerContractDetailPage.jsx` (BR-21, BR-78)

---

## 🔄 CANCELLATION & REFUND RULES

### BR-22, BR-79, BR-80: Cancellation & Refund Rules

**Trang liên quan:**
- `/contracts/:contractId` - `pages/user/ContractDetail/ContractDetailPage.jsx` (BR-22, BR-79, BR-80)
- `/contracts/:contractId` - `pages/manager/ContractDetail/ManagerContractDetailPage.jsx` (BR-22, BR-79, BR-80)
- `/manager/tasks/:taskId` - `pages/manager/TaskDetail/TaskDetailPage.jsx` (BR-79)
- `/transcription/tasks/:taskId` - `pages/specialist/TaskDetailPage/SpecialistTaskDetailPage.jsx` (BR-79)

---

## 📊 AUDIT & LOGGING RULES

### BR-24, BR-81: Audit & Logging Rules

**Trang liên quan:**
- Tất cả các trang có thao tác create/edit/approve/export (BR-24, BR-81)
- `/admin/*` - Các trang admin (BR-24, BR-81)
- `/manager/*` - Các trang manager (BR-24, BR-81)

---

## 🔐 OWNERSHIP & IP RIGHTS

### BR-19, BR-82: Ownership & IP Rights

**Trang liên quan:**
- `/milestone-deliveries` - `pages/user/MilestoneDeliveries/MilestoneDeliveriesPage.jsx` (BR-19, BR-82)
- `/contracts/:contractId` - `pages/user/ContractDetail/ContractDetailPage.jsx` (BR-19, BR-82)
- `/pay-milestone` - `pages/user/PayMilestone/PayMilestonePage.jsx` (BR-19, BR-82)

---

## 📈 WORKLOAD & PERFORMANCE RULES

### BR-83 đến BR-85: Workload & Performance Rules

**Trang liên quan:**
- `/manager/tasks` - `pages/manager/TaskAssignmentWorkspace/TaskAssignmentWorkspace.jsx` (BR-83, BR-84, BR-85)
- `/manager/milestones` - `pages/manager/Milestones/MilestonesPage.jsx` (BR-83, BR-84, BR-85)

---

## 🔄 STATUS TRANSITION RULES

### BR-86 đến BR-89: Status Transition Rules

**Trang liên quan:**
- `/contracts/:contractId` - `pages/user/ContractDetail/ContractDetailPage.jsx` (BR-86)
- `/contracts/:contractId` - `pages/manager/ContractDetail/ManagerContractDetailPage.jsx` (BR-86)
- `/manager/milestones/:milestoneId` - `pages/manager/MilestoneDetail/MilestoneDetailPage.jsx` (BR-87)
- `/manager/tasks/:taskId` - `pages/manager/TaskDetail/TaskDetailPage.jsx` (BR-88)
- `/manager/tasks/:taskId` - `pages/manager/TaskDetail/TaskDetailPage.jsx` (BR-89)

---

## 📝 VALIDATION RULES

### BR-90 đến BR-92: Validation Rules

**Trang liên quan:**
- **Tất cả các trang có form input** (BR-90, BR-91, BR-92)
- Các trang đăng ký, đăng nhập, tạo request, booking, payment, etc.

---

## 🔗 INTEGRATION RULES

### BR-93 đến BR-95: Integration Rules

**Trang liên quan:**
- **Tất cả các trang có payment** (BR-93)
- **Tất cả các trang có real-time updates** (BR-94)
- **Tất cả các trang có API calls** (BR-95)

---

## 📊 SUMMARY MAPPING BY PAGE

### Trang quan trọng nhất:

1. **Service Request Pages** (`/detail-service`, `/recording-flow/*`)
   - BR-09 đến BR-32, BR-58 đến BR-62, BR-96 đến BR-118, BR-63 đến BR-67

2. **Contract Pages** (`/contracts/:contractId`)
   - BR-12 đến BR-48, BR-86, BR-19, BR-22, BR-79, BR-80, BR-21, BR-78

3. **Booking Pages** (`/manager/studio-booking`, `/recording-artist/*`)
   - BR-16, BR-58 đến BR-62, BR-96 đến BR-118

4. **Task Assignment Pages** (`/manager/tasks`, `/transcription/tasks`)
   - BR-49 đến BR-57, BR-79, BR-88, BR-89

5. **Payment Pages** (`/wallet`, `/pay-*`)
   - BR-12 đến BR-39

---

**Cập nhật lần cuối:** [Ngày cập nhật]

