# Chat Feature - Frontend Implementation

## 📁 Cấu trúc

```
src/
├── pages/chat/
│   ├── ChatRooms/              # Trang danh sách chat rooms
│   │   ├── ChatRoomsPage.jsx
│   │   └── ChatRoomsPage.module.css
│   └── ChatConversation/       # Trang chat conversation
│       ├── ChatConversationPage.jsx
│       └── ChatConversationPage.module.css
├── components/chat/
│   ├── ChatRoomCard/          # Card hiển thị chat room
│   ├── MessageBubble/         # Bubble hiển thị message
│   ├── MessageInput/          # Input area để gửi message
│   └── ChatHeader/            # Header của chat page
├── services/
│   ├── chatService.jsx        # REST API cho Chat Service
│   └── websocketService.jsx   # WebSocket/STOMP connection
└── hooks/
    └── useChat.js             # Custom hooks cho chat

```

## 🚀 Setup Instructions

### 1. Cài đặt Dependencies

Cần thêm các dependencies sau (nếu chưa có):

```bash
npm install @stomp/stompjs sockjs-client
```

### 2. Cấu hình Environment Variables

Thêm vào file `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8088
```

### 3. Thêm Routes vào App

Mở file `src/App.jsx` hoặc router config và thêm routes:

```jsx
import ChatRoomsPage from './pages/chat/ChatRooms/ChatRoomsPage';
import ChatConversationPage from './pages/chat/ChatConversation/ChatConversationPage';

// Trong Routes:
<Route path="/chat" element={<ChatRoomsPage />} />
<Route path="/chat/:roomId" element={<ChatConversationPage />} />
```

### 4. Kiểm tra API Client Configuration

Đảm bảo `src/config/apiClient.jsx` đã được setup đúng với JWT token:

```jsx
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to all requests
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

## 🔧 Backend Requirements

Đảm bảo backend đã có:

- ✅ Chat Service đang chạy trên port 8088
- ✅ WebSocket endpoint: `/ws`
- ✅ REST API endpoints:
  - `GET /api/chat-rooms` - Lấy danh sách rooms
  - `GET /api/chat-rooms/{roomId}` - Lấy chi tiết room
  - `GET /api/messages/{roomId}` - Lấy messages với pagination
  - `POST /api/messages` - Gửi message
- ✅ STOMP endpoints:
  - Subscribe: `/topic/room/{roomId}` - Nhận messages real-time
  - Send: `/app/chat/{roomId}` - Gửi message qua WebSocket

## 💡 Features

### ChatRoomsPage

- ✅ Hiển thị danh sách tất cả chat rooms
- ✅ Search/filter rooms
- ✅ Badge hiển thị unread messages
- ✅ Click vào room để mở conversation

### ChatConversationPage

- ✅ Real-time messaging với WebSocket/STOMP
- ✅ Load messages history với pagination
- ✅ Auto-scroll to bottom khi có message mới
- ✅ Send text messages
- ✅ Connection status indicator
- ✅ Support nhiều loại message types (TEXT, IMAGE, FILE, AUDIO, VIDEO, SYSTEM)

## 🎨 UI Components

### ChatRoomCard

- Avatar của room
- Room name và type
- Last message preview
- Unread count badge
- Participant count

### MessageBubble

- Hỗ trợ nhiều message types
- Own vs Other message styling
- Timestamp
- Delivery status (cho own messages)
- Avatar cho sender

### MessageInput

- Textarea với auto-resize
- Send button
- File attachment button (TODO)
- Emoji picker button (TODO)
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

### ChatHeader

- Back button
- Room info
- Connection status
- Participant count
- More options button

## 🔒 Authentication

- JWT token được lưu trong `localStorage`
- Token được auto-attach vào:
  - REST API requests (via axios interceptor)
  - WebSocket connection (via query parameter)

## 📝 Usage Example

```jsx
// Navigate to chat rooms list
navigate('/chat');

// Navigate to specific chat conversation
navigate('/chat/{roomId}');
```

## 🐛 Troubleshooting

### WebSocket không kết nối được:

1. Kiểm tra Chat Service đang chạy
2. Kiểm tra CORS configuration trên backend
3. Kiểm tra JWT token còn valid
4. Xem console logs để debug

### Messages không hiển thị:

1. Kiểm tra network tab xem API calls có thành công không
2. Kiểm tra WebSocket connection status
3. Xem console logs

### Styling issues:

1. Đảm bảo CSS modules được enable trong Vite config
2. Kiểm tra class names trong browser DevTools

## 🚧 TODO / Future Enhancements

- [ ] File upload functionality
- [ ] Image/video preview
- [ ] Emoji picker
- [ ] Message search
- [ ] Message reactions
- [ ] Push notifications
- [ ] Voice messages
- [ ] Video calls
- [ ] Message forwarding
- [ ] Room settings/management

## 📚 Resources

- [STOMP Protocol](https://stomp.github.io/)
- [SockJS Client](https://github.com/sockjs/sockjs-client)
- [Ant Design Components](https://ant.design/components/overview/)
- [React Hooks](https://reactjs.org/docs/hooks-intro.html)
