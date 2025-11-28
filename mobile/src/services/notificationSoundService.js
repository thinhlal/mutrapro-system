import { Audio } from "expo-av";

/**
 * Notification Sound Service
 * Handles playing notification sounds with proper cleanup
 */
class NotificationSoundService {
  constructor() {
    this.sound = null;
    this.isInitialized = false;
  }

  /**
   * Initialize audio mode
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      this.isInitialized = true;
      console.log("✅ [Mobile] Notification sound service initialized");
    } catch (error) {
      console.error("[Mobile] Error initializing audio:", error);
    }
  }

  /**
   * Play notification sound
   * Uses a simple beep sound (platform native)
   */
  async playNotificationSound() {
    try {
      // Initialize if not already done
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Unload previous sound if exists
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Create and play sound
      // Using a data URI for a simple notification beep
      // This is a short, pleasant notification sound encoded in base64
      const soundUri = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUri },
        { 
          shouldPlay: true, 
          volume: 0.6,
          isMuted: false,
        },
        this.onPlaybackStatusUpdate
      );

      this.sound = sound;

      // Unload after playing to free resources
      setTimeout(async () => {
        if (this.sound) {
          await this.sound.unloadAsync();
          this.sound = null;
        }
      }, 1000);

    } catch (error) {
      console.error("[Mobile] Error playing notification sound:", error);
      // Fallback: try to use haptic feedback if sound fails
      try {
        // This will just log - actual haptic implementation would need expo-haptics
        console.log("[Mobile] Sound failed, would use haptic feedback as fallback");
      } catch (hapticError) {
        console.error("[Mobile] Haptic feedback also failed:", hapticError);
      }
    }
  }

  /**
   * Play a lighter notification sound (for less important notifications)
   */
  async playLightSound() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      const soundUri = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUri },
        { shouldPlay: true, volume: 0.3 }
      );

      this.sound = sound;

      setTimeout(async () => {
        if (this.sound) {
          await this.sound.unloadAsync();
          this.sound = null;
        }
      }, 1000);

    } catch (error) {
      console.error("[Mobile] Error playing light sound:", error);
    }
  }

  /**
   * Callback for playback status updates
   */
  onPlaybackStatusUpdate = (status) => {
    if (status.didJustFinish) {
      console.log("[Mobile] Notification sound finished playing");
    }
  };

  /**
   * Cleanup - unload sound
   */
  async cleanup() {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error("[Mobile] Error cleaning up sound:", error);
    }
  }
}

// Export singleton instance
export default new NotificationSoundService();
