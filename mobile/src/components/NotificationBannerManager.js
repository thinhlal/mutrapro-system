import React, { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet } from "react-native";
import NotificationBanner from "./NotificationBanner";

/**
 * NotificationBannerManager Component
 * Manages the display of notification banners
 * Can be controlled via ref
 */
const NotificationBannerManager = forwardRef(({ onNotificationPress }, ref) => {
  const [currentNotification, setCurrentNotification] = useState(null);
  const [visible, setVisible] = useState(false);
  const [queue, setQueue] = useState([]);

  /**
   * Show a notification banner
   */
  const showNotification = useCallback((notification) => {
    if (visible) {
      // If a notification is already showing, add to queue
      setQueue((prev) => [...prev, notification]);
    } else {
      // Show immediately
      setCurrentNotification(notification);
      setVisible(true);
    }
  }, [visible]);

  /**
   * Hide current notification and show next in queue
   */
  const hideNotification = useCallback(() => {
    setVisible(false);
    
    // After animation completes, show next notification in queue
    setTimeout(() => {
      setCurrentNotification(null);
      
      setQueue((prevQueue) => {
        if (prevQueue.length > 0) {
          const [next, ...rest] = prevQueue;
          setCurrentNotification(next);
          setVisible(true);
          return rest;
        }
        return [];
      });
    }, 300); // Match animation duration
  }, []);

  /**
   * Handle notification press
   */
  const handleNotificationPress = useCallback(() => {
    if (currentNotification && onNotificationPress) {
      onNotificationPress(currentNotification);
    }
    hideNotification();
  }, [currentNotification, onNotificationPress, hideNotification]);

  /**
   * Expose methods via ref
   */
  useImperativeHandle(ref, () => ({
    showNotification,
    hideNotification,
    clearQueue: () => {
      setQueue([]);
      hideNotification();
    },
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      <NotificationBanner
        notification={currentNotification}
        visible={visible}
        onPress={handleNotificationPress}
        onDismiss={hideNotification}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});

export default NotificationBannerManager;

