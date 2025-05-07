export const WS_PORT = 8888;
export const WS_URL = (() => {
    if (typeof window !== 'undefined') {
        return `ws://${window.location.hostname}:${WS_PORT}`;
    }
    // Fallback for environments without window (e.g., Node.js)
    return `ws://localhost:${WS_PORT}`;
})();
export const OPC_UA_ENDPOINT_OFFLINE = "opc.tcp://192.168.1.2:4840"; // Local OPC UA endpoint for PLC
// export const OPC_UA_ENDPOINT_OFFLINE = "opc.tcp://opcuaserver.com:4840"; 
export const OPC_UA_ENDPOINT_ONLINE = "opc.tcp://112.134.218.51:4840"; // Remote OPC UA endpoint for PLC
export const VERSION = "1.0.1";
export const PLANT_NAME= "Mini-Grid";
export const PLANT_LOCATION = "Colombo, Sri Lanka"; // Location of the plant
export const PLANT_TYPE = "Mini-Grid"; // Type of the plant
export const PLANT_CAPACITY = "100 kW"; // Capacity of the plant

export const APP_NAME = "Atla Vision Mini-Grid Control Panel & Monitor";
export const APP_URL = "https://yourwebsite.com"; // URL to your app
export const APP_KEYWORDS = "solar, monitoring, control, energy, management"; // Keywords for SEO
export const APP_DESCRIPTION = "A web-based plant monitoring system for real-time data visualization and control.";
export const APP_LOGO = "/logo.png"; // Path to your app logo
export const APP_FAVICON = "/favicon.ico"; // Path to your app favicon
export const APP_AUTHOR = "Atla Vision"; 
export const APP_AUTHOR_URL = "https://yourwebsite.com"; // URL to your website or profile
export const APP_COPYRIGHT = "© 2023 Your Company. All rights reserved.";
export const APP_COPYRIGHT_URL = "https://yourwebsite.com/copyright"; // URL to your copyright information
export const APP_PRIVACY_POLICY = "https://yourwebsite.com/privacy-policy"; // URL to your privacy policy
export const APP_TERMS_OF_SERVICE = "https://yourwebsite.com/terms-of-service"; // URL to your terms of service



export const USER = "viewer";
// export const USER = "admin"; // Uncomment to set admin role
//   role: 'admin' | 'operator' | 'viewer';
