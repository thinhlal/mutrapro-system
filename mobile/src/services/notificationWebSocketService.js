import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

/**
 * WebSocket Service cho Real-time Notifications (Mobile)
 */
class NotificationWebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.currentToken = null;
    this.shouldReconnect = false;
  }

  /**
   * Connect to notification WebSocket server
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
        console.error('❌ [Mobile] Failed to create notification WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Internal method to actually connect
   */
  doConnect(resolve, reject) {
    try {
      this.client = new Client({
        webSocketFactory: () => {
          const wsUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.WS_ENDPOINT}`;
          console.log('🔔 [Mobile] Connecting to notification WebSocket:', wsUrl);
          return new SockJS(wsUrl);
        },

        connectHeaders: {
          Authorization: `Bearer ${this.currentToken}`,
        },

        debug: (str) => {
          if (__DEV__) {
            console.log('[Notification STOMP]:', str);
          }
        },

        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        onConnect: () => {
          console.log('✅ [Mobile] Notification WebSocket Connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        },

        onStompError: (frame) => {
          console.error('❌ [Mobile] Notification STOMP Error:', frame.headers['message']);
          reject(new Error(frame.headers['message']));
        },

        onWebSocketError: (error) => {
          console.error('❌ [Mobile] Notification WebSocket Error:', error);
          reject(error);
        },

        onDisconnect: () => {
          console.log('⚠️ [Mobile] Notification WebSocket Disconnected');
          this.connected = false;
          if (this.shouldReconnect) {
            this.handleReconnect();
          }
        },
      });

      this.client.activate();
    } catch (error) {
      console.error('❌ [Mobile] Failed to create notification WebSocket:', error);
      reject(error);
    }
  }

  /**
   * Handle reconnection
   */
  handleReconnect() {
    if (!this.currentToken) {
      console.warn('⚠️ [Mobile] No token available for notification reconnect');
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔄 [Mobile] Reconnecting notifications... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect(this.currentToken).catch((error) => {
          console.error('❌ [Mobile] Notification reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ [Mobile] Max notification reconnection attempts reached');
    }
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToNotifications(callback) {
    if (!this.client || !this.connected) {
      console.error('❌ [Mobile] Notification WebSocket not connected');
      return null;
    }

    const destination = '/user/queue/notifications';

    try {
      const subscription = this.client.subscribe(destination, (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log('🔔 [Mobile] New notification received:', data);
          callback(data);
        } catch (error) {
          console.error('❌ [Mobile] Failed to parse notification:', error);
        }
      });

      this.subscriptions.set('notifications', subscription);
      console.log('✅ [Mobile] Subscribed to notifications');

      return subscription;
    } catch (error) {
      console.error('❌ [Mobile] Failed to subscribe to notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from notifications
   */
  unsubscribeFromNotifications() {
    const subscription = this.subscriptions.get('notifications');
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete('notifications');
      console.log('✅ [Mobile] Unsubscribed from notifications');
    }
  }

  /**
   * Disconnect
   */
  disconnect(options = {}) {
    const { preserveToken = false } = options;

    this.shouldReconnect = false;

    if (!preserveToken) {
      this.currentToken = null;
    }

    if (this.client) {
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();
      this.client.deactivate();
      this.client = null;
      this.connected = false;
      console.log('✅ [Mobile] Notification WebSocket Disconnected');
    }
  }

  /**
   * Check connection status
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
const notificationWebSocketService = new NotificationWebSocketService();
export default notificationWebSocketService;

