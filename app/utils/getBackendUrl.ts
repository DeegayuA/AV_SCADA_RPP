import { Preferences } from '@capacitor/preferences';

// It's good practice to define a default/fallback URL.
// This could be your production URL or a local one for development if not overridden.
const DEFAULT_BACKEND_URL = 'http://localhost:3000'; // Default to Next.js dev server / Electron server

export async function getBackendUrl(): Promise<string> {
  try {
    // Check if running in a Capacitor environment first
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isPluginAvailable('Preferences')) {
      const { value } = await Preferences.get({ key: 'backendUrl' });
      if (value) {
        console.log(`Using backend URL from Preferences: ${value}`);
        return value;
      }
      console.log('No backend URL in Preferences, using default.');
      return DEFAULT_BACKEND_URL;
    } else {
      // Not in Capacitor or Preferences plugin not available, use default.
      // This path will be taken by web-only, Electron, or server-side rendering.
      // console.log('Not a Capacitor native platform or Preferences not available, using default backend URL.');
      return DEFAULT_BACKEND_URL;
    }
  } catch (error) {
    console.error('Error reading backendUrl from Preferences, using default:', error);
    return DEFAULT_BACKEND_URL;
  }
}
