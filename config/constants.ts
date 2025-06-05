// config/constants.ts

import logo from "@/AV_logo.png"; // Ensure these paths are correct if this file is in a different dir
import logo2 from "@/av_logo.svg";

export const WS_PORT = 2001;
export const WS_API_PATH = "/api/opcua"; // This is your existing API route
export const WS_URL = (() => {
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;

        if (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) { // Better check for local/dev
            // For local development, connect to hostname:port
            return `${protocol}//${hostname}:${WS_PORT}`;
        } else {
            // For deployed environments (like Vercel), connect to hostname/path (standard port 443 for wss)
            return `${protocol}//${hostname}${WS_API_PATH}`;
        }
    }
    // Fallback for server-side or non-browser environments (local default)
    return `ws://localhost:${WS_PORT}`;
})();
export const OPC_UA_ENDPOINT_OFFLINE = "opc.tcp://192.168.1.2:4840";
export const OPC_UA_ENDPOINT_ONLINE = "opc.tcp://100.91.166.112:4840";
export const VERSION = "- Release v2025.06.05 • 15:00 (GMT+5:30)";
export const PLANT_NAME= "Mini-Grid";
export const PLANT_LOCATION = "Colombo, Sri Lanka";
export const PLANT_TYPE = "Mini-Grid";
export const PLANT_CAPACITY = "25 kW";

export const APP_NAME = "Mini-Grid Control Panel";
export const APP_BASE_URL = "https://av-mini-grid-offline-dashboard.vercel.app"; 
export const APP_URL = "https://yourwebsite.com";
export const APP_KEYWORDS = "solar, monitoring, control, energy, management";
export const APP_DESCRIPTION = "A web-based plant monitoring system for real-time data visualization and control.";
export const APP_LOGO = logo;
export const APP_LOGO2 = logo2;
export const APP_FAVICON = "/favicon.ico";
export const APP_AUTHOR = "Atla Vision";
export const APP_AUTHOR_URL = "https://yourwebsite.com";
export const APP_COPYRIGHT = "© 2025 Your Company. All rights reserved.";
export const APP_COPYRIGHT_URL = "https://yourwebsite.com/copyright";
export const APP_PRIVACY_POLICY = "https://yourwebsite.com/privacy-policy";
export const APP_TERMS_OF_SERVICE = "https://yourwebsite.com/terms-of-service";

// Ensure this is defined and exported
export const AVAILABLE_SLD_LAYOUT_IDS: string[] = ['ranna_sld','main_plant', 'secondary_plant', 'empty_template', 'new_project_canvas', 'test_data_nodes_layout'];
// Potentially in a shared types file or at the top of PowerTimelineGraph.tsx
export type PowerUnit = 'W' | 'kW' | 'MW' | 'GW';
export type TimeScale = 'day' | '6h' | '1h' | '30m' | '5m' | '1m';


export const USER = "viewer";
// export const USER = "admin";