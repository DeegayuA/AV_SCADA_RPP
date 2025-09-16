// config/constants.ts

import logo from "@/AV_logo.png";
import logo2 from "@/av_logo.svg";

// Base configuration
export const WS_PORT = 2001;
export const WS_API_PATH = "/api/opcua";
export const LOCAL_STORAGE_KEY_PREFIX = "ranna_2mw_";
export const WEBSOCKET_CUSTOM_URL_KEY = `${LOCAL_STORAGE_KEY_PREFIX}custom_websocket_url`;

/**
 * Gets the definitive WebSocket URL.
 * THIS IS THE SINGLE SOURCE OF TRUTH for the WebSocket address in the entire application.
 * The logic follows a specific priority:
 * 1. User-defined custom URL in localStorage.
 * 2. Backend URL from Capacitor Preferences (for native mobile apps).
 * 3. Dynamic URL based on the deployment environment (Vercel, local network, etc.).
 *
 * @returns {Promise<string>} A promise that resolves to the WebSocket URL to use.
 */
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

    // PRIORITY 2: Attempt to get from Capacitor Preferences (for native apps)
    try {
        // Dynamic import to avoid errors in non-Capacitor environments
        const capacitorPreferences = await import('@capacitor/preferences');
        if (window.Capacitor && window.Capacitor.isNativePlatform && capacitorPreferences.Preferences) {
            const { value } = await capacitorPreferences.Preferences.get({ key: 'backendUrl' });
            if (value) {
                console.log(`Using backend URL from Capacitor Preferences for WS: ${value}`);
                const httpUrl = new URL(value);
                const wsProtocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
                return `${wsProtocol}//${httpUrl.host}${WS_API_PATH}`;
            }
        }
    } catch (error) {
        // This is an expected warning if Capacitor is not available.
        // console.warn('Could not check Capacitor Preferences, proceeding with default logic:', error);
    }

    // PRIORITY 3: Fallback to dynamic URL based on window.location (for web)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port;

    // Vercel deployment check
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        return `${protocol}//${process.env.NEXT_PUBLIC_VERCEL_URL}${WS_API_PATH}`;
    }

    // Construct the base URL, always using the default WebSocket port.
    const baseUrl = `${protocol}//${hostname.split(':')[0]}:${WS_PORT}`;

    // For local development, we don't need the API path. For other environments, we do.
    if (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local')) {
        return baseUrl;
    } else {
        return `${baseUrl}${WS_API_PATH}`;
    }
};


// --- Other Application Constants ---

export const OPC_UA_ENDPOINT_OFFLINE = "opc.tcp://192.168.1.2:4840";
export const OPC_UA_ENDPOINT_ONLINE = "opc.tcp://100.91.178.74:4840";
export const VERSION = "- Release v2025.09.17 • 08:30 (GMT+5:30)";
export const PLANT_NAME = "Colombo Office Mini Grid";
export const PLANT_LOCATION = "Athurugiriya, Sri Lanka";
export const PLANT_TYPE = "Mini Grid";
export const PLANT_CAPACITY = "25kW";
export const PLANT_CAPACITY_WATTS = 25000;

export const APP_NAME = "Colombo Office Mini Grid";
export const APP_BASE_URL = "https://av-mini-grid-offline-dashboard.vercel.app";
export const APP_URL = "https://yourwebsite.com";
export const APP_KEYWORDS = "solar, monitoring, control, energy, management";
export const APP_DESCRIPTION = "A web-based plant monitoring system for real-time data visualization and control.";
export const APP_LOGO = logo;
export const APP_LOGO2 = logo2;
export const APP_FAVICON = "/favicon.ico";
export const APP_AUTHOR = "Alta Vision";
export const APP_AUTHOR_URL = "https://yourwebsite.com";
export const APP_COPYRIGHT = "© 2025 Alta Vision. All rights reserved.";
export const APP_COPYRIGHT_URL = "https://yourwebsite.com/copyright";
export const APP_PRIVACY_POLICY = "https://yourwebsite.com/privacy-policy";
export const APP_TERMS_OF_SERVICE = "https://yourwebsite.com/terms-of-service";

export type PowerUnit = 'W' | 'kW' | 'MW' | 'GW';
export type TimeScale = 'day' | '6h' | '1h' | '30m' | '5m' | '1m';

export const USER = "viewer";

export const AVAILABLE_SLD_LAYOUT_IDS: string[] = [
    'ranna_main_sld',
    'Mini_Grid_SLD',
    'Ranna_PLC',
    'Mini-Grid',
    'weather',
    'misc1',
    'misc2',
    'misc3',
    'empty_template',
    'test_data_nodes_layout',
];

export const API_MONITORING_CONFIG_KEY = `${LOCAL_STORAGE_KEY_PREFIX}apiMonitoringConfigs_v1`;
export const API_MONITORING_DOWNTIME_KEY = `${LOCAL_STORAGE_KEY_PREFIX}apiMonitoringDowntimes_v1`;
export const WEATHER_CARD_CONFIG_KEY = `weatherCardConfig_v3.5_compact_${PLANT_NAME || 'defaultPlant'}`;

// Key for storing the new, unified power timeline graph configuration
const PAGE_SLUG_FOR_GRAPH = 'control_dashboard'; // Or make this dynamic if needed
const GRAPH_CONFIG_KEY_PREFIX = `powerGraphConfig_${PLANT_NAME.replace(/\s+/g, '_')}_${PAGE_SLUG_FOR_GRAPH}`;
export const GRAPH_SERIES_CONFIG_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_timelineSeries_v1`;