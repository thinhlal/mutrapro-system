import React, { createContext, useContext, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import NotificationBannerManager from "../components/NotificationBannerManager";

/**
 * NotificationContext
 * Provides notification banner functionality across the app
 */
const NotificationContext = createContext(null);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider"
    );
  }
  return context;
};

/**
 * NotificationProvider
 * Wraps the app and provides notification banner functionality
 */
export const NotificationProvider = ({ children }) => {
  const bannerRef = useRef(null);
  const navigation = useNavigation();

  /**
   * Handle notification press - navigate to appropriate screen
   */
  const handleNotificationPress = (notification) => {
    if (!notification.actionUrl) return;

    const url = notification.actionUrl;
    console.log("[Mobile] Navigate from notification:", url);

    try {
      // Chat navigation: /chat/{roomId}
      if (url.startsWith("/chat/")) {
        const roomId = url.split("/chat/")[1];
        if (roomId) {
          navigation.navigate("Chat", {
            screen: "ChatRoom",
            params: { roomId },
          });
        }
      }
      // Request navigation: /requests/{requestId}
      else if (url.startsWith("/requests/") || url.startsWith("/request/")) {
        const requestId = url.split("/").pop();
        if (requestId) {
          navigation.navigate("Home", {
            screen: "RequestDetail",
            params: { requestId },
          });
        }
      }
      // Service navigation: /services/{serviceId}
      else if (url.startsWith("/services/") || url.startsWith("/service/")) {
        const serviceId = url.split("/").pop();
        if (serviceId) {
          navigation.navigate("Home", {
            screen: "ServiceDetail",
            params: { serviceId },
          });
        }
      }
      // Profile navigation: /profile
      else if (url.startsWith("/profile")) {
        navigation.navigate("Profile");
      }
      // Notifications screen
      else if (url.startsWith("/notifications")) {
        navigation.navigate("Notifications");
      }
    } catch (error) {
      console.error("[Mobile] Error navigating from notification:", error);
    }
  };

  const value = {
    bannerRef,
    showNotification: (notification) => {
      if (bannerRef.current) {
        bannerRef.current.showNotification(notification);
      }
    },
    hideNotification: () => {
      if (bannerRef.current) {
        bannerRef.current.hideNotification();
      }
    },
    clearQueue: () => {
      if (bannerRef.current) {
        bannerRef.current.clearQueue();
      }
    },
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationBannerManager
        ref={bannerRef}
        onNotificationPress={handleNotificationPress}
      />
    </NotificationContext.Provider>
  );
};

export default NotificationContext;

