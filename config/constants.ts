// config/constants.ts

import logo from "@/AV_logo.png"; // Ensure these paths are correct if this file is in a different dir
import logo2 from "@/av_logo.svg";

export const WS_PORT = 2001;
export const WS_API_PATH = "/api/opcua";

// --- ADDED ---: Define a consistent key for storing the user-provided WebSocket URL.
export const LOCAL_STORAGE_KEY_PREFIX = "ranna_2mw_";
export const WEBSOCKET_CUSTOM_URL_KEY = `${LOCAL_STORAGE_KEY_PREFIX}custom_websocket_url`;


// --- MODIFIED ---: Updated the function to prioritize the user-defined URL from localStorage.
// Define a function to get the WebSocket URL
export const getWebSocketUrl = async (): Promise<string> => {
    // Default fallback for server-side or non-browser environments
    const defaultWsUrl = `ws://localhost:${WS_PORT}`;

    if (typeof window === 'undefined') {
        return defaultWsUrl;
    }

    // PRIORITY 1: Check for a user-defined URL in localStorage
    const customUrl = localStorage.getItem(WEBSOCKET_CUSTOM_URL_KEY);
    if (customUrl && customUrl.trim() !== '') {
        console.log(`Using custom WebSocket URL from localStorage: ${customUrl}`);
        return customUrl;
    }

    // PRIORITY 2: Attempt to get from Capacitor Preferences
    try {
        const capacitorPreferences = await import('@capacitor/preferences');
        if (window.Capacitor && window.Capacitor.isNativePlatform && capacitorPreferences.Preferences) {
            const { value } = await capacitorPreferences.Preferences.get({ key: 'backendUrl' });
            if (value) {
                console.log(`Using backend URL from Preferences for WS: ${value}`);
                const httpUrl = new URL(value);
                const wsProtocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
                return `${wsProtocol}//${httpUrl.host}${WS_API_PATH}`;
            }
        }
    } catch (error) {
        console.warn('Could not check Capacitor Preferences, proceeding with default logic:', error);
    }

    // PRIORITY 3: Fallback to dynamic URL based on window.location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;

    // Vercel default URL
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      return `${protocol}//${process.env.NEXT_PUBLIC_VERCEL_URL}${WS_API_PATH}`;
    }

    if (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local')) {
        // For local development, connect to hostname:port
        return `${protocol}//${hostname}:${WS_PORT}`;
    } else {
        // For other deployed environments, connect to hostname/path
        return `${protocol}//${hostname}${WS_API_PATH}`;
    }
};

// --- MODIFIED ---: Updated the initial URL to also check localStorage synchronously.
// Export a placeholder or a synchronously determined URL for components that can't be async
// This will be the initial value before the async function resolves.
export const WS_URL_INITIAL = (() => {
    if (typeof window !== 'undefined') {
        // PRIORITY 1: Check for a user-defined URL in localStorage
        const customUrl = localStorage.getItem(WEBSOCKET_CUSTOM_URL_KEY);
        if (customUrl && customUrl.trim() !== '') {
            return customUrl;
        }

        // PRIORITY 2: Fallback to dynamic URL logic
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        if (hostname === 'localhost') {
            return `ws://localhost:${WS_PORT}`;
        }
         // Vercel default URL
        if (process.env.NEXT_PUBLIC_VERCEL_URL) {
            return `${protocol}//${process.env.NEXT_PUBLIC_VERCEL_URL}${WS_API_PATH}`;
        }
        return `${protocol}//${hostname}${WS_API_PATH}`;
    }
    // Default for SSR or other environments
    return `ws://localhost:${WS_PORT}`;
})();
export const WS_URL = getWebSocketUrl();
export const OPC_UA_ENDPOINT_OFFLINE = "opc.tcp://0.0.0.0:4841";
export const OPC_UA_ENDPOINT_ONLINE = "opc.tcp://123.231.16.208:4841";
export const VERSION = "- Release v2025.07.15 • 16:30 (GMT+5:30)";
export const PLANT_NAME= "Ranna 2MW Solar Power Plant";
export const PLANT_LOCATION = "Ranna, Sri Lanka";
export const PLANT_TYPE = "Solar Power Plant";
export const PLANT_CAPACITY = "2000 kW"; // 2 MW
export const PLANT_CAPACITY_WATTS = 2000000; // 2 MW in watts

export const APP_NAME = "Mini Grid - AVR&D";
export const APP_BASE_URL = "https://av-mini-grid-offline-dashboard.vercel.app"; 
export const APP_URL = "https://yourwebsite.com";
export const APP_KEYWORDS = "solar, monitoring, control, energy, management";
export const APP_DESCRIPTION = "A web-based plant monitoring system for real-time data visualization and control.";
export const APP_LOGO = logo;
export const APP_LOGO2 = logo2;
export const APP_FAVICON = "/favicon.ico";
export const APP_AUTHOR = "Synergy Power";
export const APP_AUTHOR_URL = "https://yourwebsite.com";
export const APP_COPYRIGHT = "© 2025 Synergy Power. All rights reserved.";
export const APP_COPYRIGHT_URL = "https://yourwebsite.com/copyright";
export const APP_PRIVACY_POLICY = "https://yourwebsite.com/privacy-policy";
export const APP_TERMS_OF_SERVICE = "https://yourwebsite.com/terms-of-service";

// Potentially in a shared types file or at the top of PowerTimelineGraph.tsx
export type PowerUnit = 'W' | 'kW' | 'MW' | 'GW';
export type TimeScale = 'day' | '6h' | '1h' | '30m' | '5m' | '1m';

export const USER = "viewer";

export const AVAILABLE_SLD_LAYOUT_IDS: string[] = [
  'ranna_main_sld',
  'Ranna_PLC',
  'PV_Array01',
  'PV_Array02',
  'PV_Array03',
  'PV_Array04',
  'PV_Array05',
  'PV_Array06',
  'PV_Array07',
  'PV_Array08',
  'PV_Array09',
  'PV_Array10',
  'PV_Array11',
  'PV_Array12',
  'PV_Array13',
  'PV_Array14',
  'PV_Array15',
  'PV_Array16',
  'PV_Array17',
  'PV_Array18',
  'weather',
  'misc1',
  'misc2',
  'misc3',
  'Power_Analyser1',
  'Power_Analyser2',
  'MiCom_Relay',
  'empty_template',
'test_data_nodes_layout',
];

// Keys for API Monitoring feature
export const API_MONITORING_CONFIG_KEY = `${LOCAL_STORAGE_KEY_PREFIX}apiMonitoringConfigs_v1`;
export const API_MONITORING_DOWNTIME_KEY = `${LOCAL_STORAGE_KEY_PREFIX}apiMonitoringDowntimes_v1`;