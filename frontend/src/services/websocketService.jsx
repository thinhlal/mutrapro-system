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
  }

  /**
   * Connect to WebSocket server with authentication
   * @param {string} token - JWT token for authentication
   */
  connect(token) {
    return new Promise((resolve, reject) => {
      try {
        // Create STOMP client with SockJS
        this.client = new Client({
          webSocketFactory: () => {
            // Use SockJS for better browser compatibility
            const wsUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CHAT.WS_ENDPOINT}`;
            return new SockJS(wsUrl);
          },
          
          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },

          debug: (str) => {
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

          onStompError: (frame) => {
            console.error('❌ STOMP Error:', frame.headers['message']);
            console.error('Error details:', frame.body);
            reject(new Error(frame.headers['message']));
          },

          onWebSocketError: (error) => {
            console.error('❌ WebSocket Error:', error);
            reject(error);
          },

          onDisconnect: () => {
            console.log('⚠️ WebSocket Disconnected');
            this.connected = false;
            this.handleReconnect(token);
          },
        });

        // Activate connection
        this.client.activate();
      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle reconnection logic
   */
  handleReconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(token).catch((error) => {
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
      const subscription = this.client.subscribe(destination, (message) => {
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
   */
  disconnect() {
    if (this.client) {
      // Unsubscribe from all rooms
      this.subscriptions.forEach((subscription, roomId) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();
      this.messageCallbacks.clear();

      // Deactivate client
      this.client.deactivate();
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

