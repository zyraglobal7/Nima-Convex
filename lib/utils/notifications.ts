/**
 * Notification Sound Utility
 * 
 * Plays notification sounds for various app events.
 * Includes user preference checks for muting sounds.
 */

// Singleton Audio instance to prevent multiple concurrent sounds
let notificationAudio: HTMLAudioElement | null = null;

/**
 * Check if the user has muted notification sounds
 * (Stored in localStorage)
 */
function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('nima-sound-muted') === 'true';
}

/**
 * Set the mute preference for notification sounds
 */
export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nima-sound-muted', muted ? 'true' : 'false');
}

/**
 * Get the current mute status
 */
export function getNotificationSoundMuted(): boolean {
  return isSoundMuted();
}

/**
 * Play the notification sound
 * 
 * @param options - Configuration options
 * @param options.volume - Volume level (0.0 to 1.0), default 0.5
 * @param options.respectMute - Whether to check mute preference, default true
 */
export function playNotificationSound(options?: {
  volume?: number;
  respectMute?: boolean;
}): void {
  const { volume = 0.5, respectMute = true } = options || {};

  // Skip if we're on the server
  if (typeof window === 'undefined') return;

  // Check if sounds are muted
  if (respectMute && isSoundMuted()) return;

  try {
    // Create a new audio instance or reuse existing one
    if (!notificationAudio) {
      notificationAudio = new Audio('/confident-543.mp3');
    }

    // Reset the audio to the start if it was already playing
    notificationAudio.currentTime = 0;
    notificationAudio.volume = Math.max(0, Math.min(1, volume));

    // Play the sound
    notificationAudio.play().catch((error) => {
      // Ignore autoplay restrictions - sounds may fail if user hasn't interacted
      if (error.name !== 'NotAllowedError') {
        console.warn('Failed to play notification sound:', error);
      }
    });
  } catch (error) {
    // Fail silently - sound is a nice-to-have, not critical
    console.warn('Failed to initialize notification sound:', error);
  }
}

/**
 * Play a success notification sound (for completed actions)
 */
export function playSuccessSound(): void {
  playNotificationSound({ volume: 0.4 });
}

/**
 * Play a soft notification sound (for incoming messages, friend requests)
 */
export function playSoftNotificationSound(): void {
  playNotificationSound({ volume: 0.3 });
}

