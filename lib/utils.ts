import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useAppStore } from '@/stores/appStore'; // Import the Zustand store

// Basic sound playing function
export const playSound = (url: string, volume: number = 1): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check soundEnabled state from Zustand store FIRST
    // Note: Using getState() here is for simplicity. If this function were part of a React component
    // or hook that re-renders, useAppStore(state => state.soundEnabled) would be preferred for reactivity.
    // For a utility function called from various places, getState() can be acceptable but won't react to state changes
    // that happen *after* the function is called but *before* sound plays, if there's a delay.
    // However, Audio playback is usually immediate.
    const soundEnabled = useAppStore.getState().soundEnabled;
    if (!soundEnabled) {
      return resolve(); // Sound is disabled globally
    }

    // Ensure this runs only in the browser
    if (typeof window === 'undefined' || !window.Audio) {
        // console.warn("Audio playback not supported or not in browser environment.");
        return resolve();
    }
    try {
        const audio = new Audio(url);
          audio.volume = Math.max(0, Math.min(1, volume)); // Clamp volume

          // Play the sound. play() returns a Promise.
          audio.play()
              .then(() => {
                  // Resolve the Promise once playback has begun
                  resolve();
              })
              .catch(err => {
                  // Don't necessarily reject the *outer* promise for play errors,
                  // as we still want the toast to show. Log the error.
                  console.error(`Error playing sound ${url}:`, err);
                  // Resolve anyway, or reject if strict error handling is needed upstream
                  resolve();
                  // reject(err); // Use reject if the caller needs to know playback failed
              });

          // Optional: More robust error handling for loading issues
          audio.onerror = (e) => {
              console.error(`Audio loading/playback error for ${url}:`, e);
              // Potentially reject here if loading fails completely, though play().catch() often covers this.
              // resolve(); // Ensure we resolve even if there's a later error
          };

      } catch (error) {
          console.error(`Failed to create or play audio ${url}:`, error);
          // Resolve even on creation error to not block the toast
          resolve();
          // reject(error); // Use reject if the caller needs to know
      }
  });
};

// Specific sound functions (optional, makes calling easier)
// These now implicitly respect the global soundEnabled state via the modified playSound above.
export const playSuccessSound = () => playSound('/sounds/success.mp3', 0.4);
export const playErrorSound = () => playSound('/sounds/error.mp3', 0.6);
export const playWarningSound = () => playSound('/sounds/warning.mp3', 0.5);
export const playInfoSound = () => playSound('/sounds/info.mp3', 0.3);

/**
 * A more generic notification sound player that can be used by useNotificationSystem.
 * It maps a semantic type to a specific sound function.
 */
export type NotificationSoundType = 'info' | 'success' | 'warning' | 'error';

export const playNotificationSound = (type: NotificationSoundType): Promise<void> => {
  // This function also relies on the global soundEnabled check within playSound via specific functions
  switch (type) {
    case 'info':
      return playInfoSound();
    case 'success':
      return playSuccessSound();
    case 'warning':
      return playWarningSound();
    case 'error':
      return playErrorSound();
    default:
      return Promise.resolve(); // Or play a default sound
  }
};
