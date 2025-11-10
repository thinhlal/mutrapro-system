import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

/**
 * WebSocket Service cho Real-time Notifications
 */
class NotificationWebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  /**
   * Connect to notification WebSocket server
   */
  connect(token) {
    return new Promise((resolve, reject) => {
      try {
        this.client = new Client({
          webSocketFactory: () => {
            // WebSocket URL cho notifications
            const wsUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.WS_ENDPOINT}`;
            console.log('🔔 Connecting to notification WebSocket:', wsUrl);
            return new SockJS(wsUrl);
          },
          
          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },

          debug: (str) => {
            if (import.meta.env.DEV) {
              console.log('[Notification STOMP]:', str);
            }
          },

          reconnectDelay: this.reconnectDelay,
          heartbeatIncoming: 10000,
          heartbeatOutgoing: 10000,

          onConnect: () => {
            console.log('✅ Notification WebSocket Connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            resolve();
          },

          onStompError: (frame) => {
            console.error('❌ Notification STOMP Error:', frame.headers['message']);
            reject(new Error(frame.headers['message']));
          },

          onWebSocketError: (error) => {
            console.error('❌ Notification WebSocket Error:', error);
            reject(error);
          },

          onDisconnect: () => {
            console.log('⚠️ Notification WebSocket Disconnected');
            this.connected = false;
            this.handleReconnect(token);
          },
        });

        this.client.activate();
      } catch (error) {
        console.error('❌ Failed to create notification WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle reconnection
   */
  handleReconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting notifications... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(token).catch((error) => {
          console.error('❌ Notification reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max notification reconnection attempts reached');
    }
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToNotifications(callback) {
    if (!this.client || !this.connected) {
      console.error('❌ Notification WebSocket not connected');
      return null;
    }

    const destination = '/user/queue/notifications';
    
    try {
      const subscription = this.client.subscribe(destination, (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log('🔔 New notification received:', data);
          callback(data);
        } catch (error) {
          console.error('❌ Failed to parse notification:', error);
        }
      });

      this.subscriptions.set('notifications', subscription);
      console.log('✅ Subscribed to notifications');
      
      return subscription;
    } catch (error) {
      console.error('❌ Failed to subscribe to notifications:', error);
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
      console.log('✅ Unsubscribed from notifications');
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.client) {
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();
      this.client.deactivate();
      this.connected = false;
      console.log('✅ Notification WebSocket Disconnected');
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

