# CÂY THƯ MỤC FRONTEND - MUTRAPRO SYSTEM

```
frontend/
│
├── 📄 package.json              # Dependencies & scripts
├── 📄 vite.config.js            # Vite configuration
├── 📄 index.html                # HTML entry point
├── 📄 vercel.json               # Deployment config
├── 📄 .prettierrc               # Prettier config
├── 📄 eslint.config.js          # ESLint config
├── 📄 env.example               # Environment template
├── 📄 README.md                 # Documentation
│
├── 📁 public/                   # Static assets
│   ├── fonts/                   # Font files
│   ├── images/                  # Public images
│   ├── MUTRAPROI.svg            # Logo
│   └── smoosic/                 # Smoosic editor library
│       ├── html/                # Test HTML files
│       ├── library/             # Library data
│       ├── styles/              # CSS & fonts
│       └── *.js                 # JS files
│
├── 📁 dist/                     # Build output
│
└── 📁 src/                      # Source code
    │
    ├── 📄 main.jsx              # React entry point
    ├── 📄 App.jsx               # Root component
    ├── 📄 App.css               # App styles
    ├── 📄 index.css             # Global styles
    │
    ├── 📁 assets/               # Static resources
    │   ├── animations/          # Lottie animations
    │   ├── audio/               # Audio files
    │   ├── icons/               # Icon sets
    │   │   ├── HomePage/
    │   │   ├── HowItWork/
    │   │   └── Pricing/
    │   ├── images/              # Images by feature
    │   │   ├── Background/
    │   │   ├── BannerHomePage/
    │   │   ├── ChooseSingerBanner/
    │   │   ├── DiscoverPros/
    │   │   ├── FromSoundToSheet/
    │   │   ├── HomePage/
    │   │   ├── LoginPage/
    │   │   ├── Logo/
    │   │   ├── MusicalInstruments/
    │   │   ├── MusicTranscription/
    │   │   ├── PricingPage/
    │   │   ├── Singers/
    │   │   ├── Thumnail/
    │   │   └── Transcript/
    │   ├── signature/           # Signature images
    │   └── videos/              # Video files
    │
    ├── 📁 components/           # Reusable components
    │   ├── admin/               # Admin components
    │   ├── chat/                # Chat system
    │   │   ├── ChatContent/
    │   │   ├── ChatHeader/
    │   │   ├── ChatPopup/
    │   │   ├── ChatRoomCard/
    │   │   ├── MessageBubble/
    │   │   └── MessageInput/
    │   ├── common/              # Common components
    │   │   ├── BackToTop/
    │   │   ├── DateTimeDisplay/
    │   │   ├── FileList/
    │   │   ├── FlatEditor/
    │   │   ├── Footer/
    │   │   ├── Header/
    │   │   ├── MusicNotationEditor/
    │   │   ├── PageTitle/
    │   │   ├── RatingStars/
    │   │   ├── RequestServiceForm/
    │   │   ├── ScrollToTop/
    │   │   ├── Smoosic/
    │   │   └── UserMenu/
    │   ├── contract/            # Contract components
    │   │   └── RequestContractList/
    │   ├── HandleRoutes/        # Route protection
    │   │   └── ProtectedRoute.jsx
    │   ├── LoadingScreen/       # Loading states
    │   ├── modal/               # Modal dialogs
    │   │   ├── BookingDateTimeModal/
    │   │   ├── CancelContractModal/
    │   │   ├── CreateContractModal/
    │   │   ├── EquipmentFormModal/
    │   │   ├── InstrumentFormModal/
    │   │   ├── InstrumentSelectionModal/
    │   │   ├── OTPVerificationModal/
    │   │   ├── ReviewModal/
    │   │   ├── ReviewRequestModal/
    │   │   ├── RevisionRequestModal/
    │   │   ├── ServiceRequestDetailModal/
    │   │   ├── SignaturePadModal/
    │   │   ├── UserDetailModal/
    │   │   ├── UserEditModal/
    │   │   └── ViewCancellationReasonModal/
    │   └── NotificationBell/    # Notifications
    │
    ├── 📁 config/               # Configuration
    │   ├── apiConfig.jsx        # API endpoints
    │   ├── klangConfig.js       # Klang API config
    │   └── OAuthConfig.jsx      # OAuth config
    │
    ├── 📁 constants/            # Constants & mock data
    │   ├── discoverProsData.js
    │   ├── femaleSingersData.js
    │   ├── howItWorksData.js
    │   ├── index.js
    │   ├── maleSingersData.js
    │   ├── musicOptionsConstants.js
    │   ├── servicesData.js
    │   └── singerDetailData.js
    │
    ├── 📁 contexts/             # React Context
    │   └── AuthContext.jsx      # Auth context
    │
    ├── 📁 data/                 # Data files
    │   └── commands/
    │
    ├── 📁 hooks/                # Custom hooks
    │   ├── Animations/          # Animation hooks
    │   ├── index.js
    │   ├── useChat.js
    │   ├── useClientSide.js
    │   ├── useDocumentTitle.js
    │   ├── useNotifications.js
    │   └── useScrollActiveIndex.js
    │
    ├── 📁 integrations/         # External integrations
    │   └── smoosic/             # Smoosic integration
    │
    ├── 📁 layouts/              # Layout components
    │   ├── AdminChatLayout/
    │   ├── AdminLayout/
    │   ├── ArrangementLayout/
    │   ├── ChatLayout/
    │   ├── ManagerLayout/
    │   ├── ProfileLayout/
    │   ├── RecordingArtistLayout/
    │   ├── SpecialistLayout/
    │   └── TranscriptionLayout/
    │
    ├── 📁 pages/                # Page components
    │   ├── admin/               # Admin pages (27 pages)
    │   │   ├── Chat/
    │   │   ├── ChatRooms/
    │   │   ├── ContractDetail/
    │   │   ├── ContractsList/
    │   │   ├── DemoManagement/
    │   │   ├── EquipmentManagement/
    │   │   ├── MilestoneDetail/
    │   │   ├── Milestones/
    │   │   ├── NotationInstruments/
    │   │   ├── PricingMatrixManagement/
    │   │   ├── Profile/
    │   │   ├── ReviewManagement/
    │   │   ├── RevisionRequests/
    │   │   ├── ServiceRequestContracts/
    │   │   ├── ServiceRequestManagement/
    │   │   ├── SkillManagement/
    │   │   ├── SpecialistManagement/
    │   │   ├── StudioBooking/
    │   │   ├── StudioBookings/
    │   │   ├── StudioManagement/
    │   │   ├── TaskAssignmentWorkspace/
    │   │   ├── TaskDetail/
    │   │   ├── TaskProgress/
    │   │   ├── UserManagement/
    │   │   └── WalletManagement/
    │   ├── ai-transcription/    # AI transcription (3 pages)
    │   ├── auth/                # Authentication (6 pages)
    │   ├── chat/                # Chat pages (2 pages)
    │   ├── contracts/           # Contracts (2 pages)
    │   ├── dashboard/           # Dashboard (2 pages)
    │   ├── manager/             # Manager (14 pages)
    │   ├── professionals/       # Professionals (8 pages)
    │   ├── public/              # Public pages (28 pages)
    │   ├── recordingArtist/    # Recording artist (3 pages)
    │   ├── services/            # Services (22 pages)
    │   ├── specialist/          # Specialist (1 page)
    │   ├── transcription/      # Transcription (2 pages)
    │   ├── user/                # User pages (14 pages)
    │   └── work/                # Work pages (3 pages)
    │
    ├── 📁 services/             # API service layer
    │   ├── adminWalletService.jsx
    │   ├── authService.jsx
    │   ├── chatService.jsx
    │   ├── contractService.jsx
    │   ├── equipmentService.jsx
    │   ├── fileService.js
    │   ├── fileSubmissionService.js
    │   ├── localStorageService.jsx
    │   ├── notationInstrumentService.jsx
    │   ├── notificationService.js
    │   ├── notificationWebSocketService.js
    │   ├── paymentService.jsx
    │   ├── pricingMatrixService.jsx
    │   ├── reviewService.jsx
    │   ├── revisionRequestService.js
    │   ├── serviceRequestService.jsx
    │   ├── specialistService.jsx
    │   ├── studioBookingService.jsx
    │   ├── studioService.jsx
    │   ├── taskAssignmentService.jsx
    │   ├── userService.jsx
    │   ├── vietqrService.jsx
    │   ├── walletService.jsx
    │   └── websocketService.jsx
    │
    ├── 📁 stores/               # State management (Zustand)
    │   ├── useInstrumentStore.jsx
    │   ├── useKlangTranscriptionStore.js
    │   └── useUserStore.jsx
    │
    ├── 📁 styles/               # Global styles
    │   └── global.css
    │
    └── 📁 utils/                # Utility functions
        ├── arrayUtils.js
        ├── axiosInstance.jsx
        ├── axiosInstancePublic.jsx
        ├── exporters/           # Export utilities
        ├── filePreviewHelper.js
        ├── getMediaDuration.js
        ├── importers/           # Import utilities
        ├── index.js
        ├── jwtUtils.jsx
        ├── music/               # Music utilities
        ├── notificationUtils.js
        ├── playback/            # Playback utilities
        ├── render/              # Render utilities
        ├── roleRedirect.js
        └── timeUtils.js
```

## 📌 CHÚ THÍCH

- **📄** = File
- **📁** = Thư mục
- Số trong ngoặc (X pages) = Số lượng pages/components ước tính

## 🎯 ĐIỂM QUAN TRỌNG

1. **Separation of Concerns**: 
   - `pages/` = Route-level components
   - `components/` = Reusable UI components
   - `services/` = API logic
   - `stores/` = State management
   - `utils/` = Helper functions

2. **Role-based Organization**:
   - Mỗi role có `layout/` và `pages/` riêng
   - Admin, Manager, Specialist, User, Recording Artist

3. **Feature-based Structure**:
   - Components và pages được nhóm theo tính năng
   - Dễ maintain và scale

