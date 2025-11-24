import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

/**
 * WebSocket Service cho Chat Real-time
 * Sử dụng STOMP protocol
 */
class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.messageCallbacks = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;

    this.currentToken = null;    // token hiện tại
    this.shouldReconnect = false; // có cho phép reconnect không
  }

  /**
   * Connect to WebSocket server with authentication
   * @param {string} token - JWT token for authentication
   */
  connect(token) {
    return new Promise((resolve, reject) => {
      try {
        this.currentToken = token;      // lưu token mới
        this.shouldReconnect = true;    // cho phép reconnect

        // Nếu đang có connection cũ → disconnect sạch rồi connect lại
        if (this.client && this.connected) {
          // Tạm thời tắt reconnect khi disconnect chủ động
          this.shouldReconnect = false;

          // Giữ token (vì đang chuyển user / đổi token, không phải logout)
          this.disconnect({ preserveToken: true });

          // Đợi 1 chút cho WS đóng hẳn rồi connect lại
          setTimeout(() => {
            this.shouldReconnect = true;
            this.doConnect(resolve, reject);
          }, 200);
        } else {
          this.doConnect(resolve, reject);
        }
      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Internal method to actually connect to WebSocket
   */
  doConnect(resolve, reject) {
    try {
      // Create STOMP client with SockJS
      this.client = new Client({
        webSocketFactory: () => {
          // Use SockJS for better browser compatibility
          const wsUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CHAT.WS_ENDPOINT}`;
          return new SockJS(wsUrl);
        },

        connectHeaders: {
          Authorization: `Bearer ${this.currentToken}`, // dùng currentToken
        },

        debug: str => {
          if (import.meta.env.DEV) {
            console.log('[STOMP Debug]:', str);
          }
        },

        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        onConnect: () => {
          console.log('✅ WebSocket Connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        },

        onStompError: frame => {
          console.error('❌ STOMP Error:', frame.headers['message']);
          console.error('Error details:', frame.body);
          reject(new Error(frame.headers['message']));
        },

        onWebSocketError: error => {
          console.error('❌ WebSocket Error:', error);
          reject(error);
        },

        onDisconnect: () => {
          console.log('⚠️ WebSocket Disconnected');
          this.connected = false;
          if (this.shouldReconnect) {
            this.handleReconnect(); // KHÔNG truyền token cố định nữa
          }
        },
      });

      // Activate connection
      this.client.activate();
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      reject(error);
    }
  }

  /**
   * Handle reconnection logic
   */
  handleReconnect() {
    if (!this.currentToken) {
      console.warn('⚠️ No token available for reconnect, skipping.');
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔄 Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect(this.currentToken).catch(error => {
          console.error('❌ Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  /**
   * Subscribe to a chat room
   * @param {string} roomId - Chat room ID
   * @param {function} callback - Callback function for incoming messages
   */
  subscribeToRoom(roomId, callback) {
    if (!this.client || !this.connected) {
      console.error('❌ WebSocket not connected');
      return null;
    }

    const destination = `/topic/chat/${roomId}`;

    // Unsubscribe if already subscribed
    if (this.subscriptions.has(roomId)) {
      this.unsubscribeFromRoom(roomId);
    }

    try {
      const subscription = this.client.subscribe(destination, message => {
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      });

      this.subscriptions.set(roomId, subscription);
      this.messageCallbacks.set(roomId, callback);
      console.log(`✅ Subscribed to room: ${roomId}`);

      return subscription;
    } catch (error) {
      console.error(`❌ Failed to subscribe to room ${roomId}:`, error);
      return null;
    }
  }

  /**
   * Unsubscribe from a chat room
   * @param {string} roomId - Chat room ID
   */
  unsubscribeFromRoom(roomId) {
    const subscription = this.subscriptions.get(roomId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(roomId);
      this.messageCallbacks.delete(roomId);
      console.log(`✅ Unsubscribed from room: ${roomId}`);
    }
  }

  /**
   * Send a message to chat room
   * @param {string} roomId - Chat room ID
   * @param {object} message - Message data
   */
  sendMessage(roomId, message) {
    if (!this.client || !this.connected) {
      console.error('❌ WebSocket not connected');
      throw new Error('WebSocket not connected');
    }

    try {
      this.client.publish({
        destination: `/app/chat/${roomId}/send`,
        body: JSON.stringify(message),
      });
      console.log(`✅ Message sent to room ${roomId}`);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   * @param {{preserveToken?: boolean}} options
   *  - preserveToken = true: dùng cho trường hợp đổi token / đổi user trong connect()
   *  - preserveToken = false (default): dùng cho logout
   */
  disconnect(options = {}) {
    const { preserveToken = false } = options;

    this.shouldReconnect = false;  // tắt auto reconnect

    if (!preserveToken) {
      this.currentToken = null;    // chỉ xoá token khi logout
    }

    if (this.client) {
      // Unsubscribe from all rooms
      this.subscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();
      this.messageCallbacks.clear();

      // Deactivate client
      this.client.deactivate();
      this.client = null;
      this.connected = false;
      console.log('✅ WebSocket Disconnected');
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;
