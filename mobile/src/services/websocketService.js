import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

/**
 * WebSocket Service cho Chat Real-time (Mobile)
 * Sử dụng STOMP protocol với SockJS
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

    this.currentToken = null;
    this.shouldReconnect = false;
  }

  /**
   * Connect to WebSocket server with authentication
   * @param {string} token - JWT token for authentication
   */
  connect(token) {
    return new Promise((resolve, reject) => {
      try {
        this.currentToken = token;
        this.shouldReconnect = true;

        // Nếu đang có connection cũ → disconnect và connect lại
        if (this.client && this.connected) {
          this.shouldReconnect = false;
          this.disconnect({ preserveToken: true });

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
          // Use SockJS for better compatibility
          const wsUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CHAT.WS_ENDPOINT}`;
          console.log('🔌 [Mobile] Connecting to chat WebSocket:', wsUrl);
          return new SockJS(wsUrl);
        },

        connectHeaders: {
          Authorization: `Bearer ${this.currentToken}`,
        },

        debug: (str) => {
          if (__DEV__) {
            console.log('[STOMP Debug]:', str);
          }
        },

        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        onConnect: () => {
          console.log('✅ [Mobile] WebSocket Connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        },

        onStompError: (frame) => {
          console.error('❌ [Mobile] STOMP Error:', frame.headers['message']);
          console.error('Error details:', frame.body);
          reject(new Error(frame.headers['message']));
        },

        onWebSocketError: (error) => {
          console.error('❌ [Mobile] WebSocket Error:', error);
          reject(error);
        },

        onDisconnect: () => {
          console.log('⚠️ [Mobile] WebSocket Disconnected');
          this.connected = false;
          if (this.shouldReconnect) {
            this.handleReconnect();
          }
        },
      });

      // Activate connection
      this.client.activate();
    } catch (error) {
      console.error('❌ [Mobile] Failed to create WebSocket connection:', error);
      reject(error);
    }
  }

  /**
   * Handle reconnection logic
   */
  handleReconnect() {
    if (!this.currentToken) {
      console.warn('⚠️ [Mobile] No token available for reconnect, skipping.');
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔄 [Mobile] Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect(this.currentToken).catch((error) => {
          console.error('❌ [Mobile] Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ [Mobile] Max reconnection attempts reached');
    }
  }

  /**
   * Subscribe to a chat room
   * @param {string} roomId - Chat room ID
   * @param {function} callback - Callback function for incoming messages
   */
  subscribeToRoom(roomId, callback) {
    if (!this.client || !this.connected) {
      console.error('❌ [Mobile] WebSocket not connected');
      return null;
    }

    const destination = `/topic/chat/${roomId}`;

    // Unsubscribe if already subscribed
    if (this.subscriptions.has(roomId)) {
      this.unsubscribeFromRoom(roomId);
    }

    try {
      const subscription = this.client.subscribe(destination, (message) => {
        console.log(`📥 [Mobile WS] Received message on ${destination}`);
        console.log(`📥 [Mobile WS] Raw message:`, message.body);
        
        try {
          const data = JSON.parse(message.body);
          console.log(`📥 [Mobile WS] Parsed message data:`, data);
          console.log(`📥 [Mobile WS] Calling callback for roomId: ${roomId}`);
          
          callback(data);
          
          console.log(`✅ [Mobile WS] Callback executed successfully`);
        } catch (error) {
          console.error('❌ [Mobile] Failed to parse message:', error);
        }
      });

      this.subscriptions.set(roomId, subscription);
      this.messageCallbacks.set(roomId, callback);
      console.log(`✅ [Mobile] Subscribed to room: ${roomId}`);

      return subscription;
    } catch (error) {
      console.error(`❌ [Mobile] Failed to subscribe to room ${roomId}:`, error);
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
      console.log(`✅ [Mobile] Unsubscribed from room: ${roomId}`);
    }
  }

  /**
   * Send a message to chat room
   * @param {string} roomId - Chat room ID
   * @param {object} message - Message data
   */
  sendMessage(roomId, message) {
    if (!this.client || !this.connected) {
      console.error('❌ [Mobile] WebSocket not connected');
      throw new Error('WebSocket not connected');
    }

    try {
      this.client.publish({
        destination: `/app/chat/${roomId}/send`,
        body: JSON.stringify(message),
      });
      console.log(`✅ [Mobile] Message sent to room ${roomId}`);
    } catch (error) {
      console.error('❌ [Mobile] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   * @param {{preserveToken?: boolean}} options
   */
  disconnect(options = {}) {
    const { preserveToken = false } = options;

    this.shouldReconnect = false;

    if (!preserveToken) {
      this.currentToken = null;
    }

    if (this.client) {
      // Unsubscribe from all rooms
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();
      this.messageCallbacks.clear();

      // Deactivate client
      this.client.deactivate();
      this.client = null;
      this.connected = false;
      console.log('✅ [Mobile] WebSocket Disconnected');
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

