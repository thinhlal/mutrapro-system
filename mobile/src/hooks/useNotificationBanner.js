import { useRef } from "react";

/**
 * Custom hook to access NotificationBannerManager
 * Provides methods to show/hide notification banners
 */
export const useNotificationBanner = () => {
  const bannerRef = useRef(null);

  const showNotification = (notification) => {
    if (bannerRef.current) {
      bannerRef.current.showNotification(notification);
    }
  };

  const hideNotification = () => {
    if (bannerRef.current) {
      bannerRef.current.hideNotification();
    }
  };

  const clearQueue = () => {
    if (bannerRef.current) {
      bannerRef.current.clearQueue();
    }
  };

  return {
    bannerRef,
    showNotification,
    hideNotification,
    clearQueue,
  };
};

export default useNotificationBanner;

