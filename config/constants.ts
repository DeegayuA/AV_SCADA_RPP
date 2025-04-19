export const WS_PORT = 8080;
export const WS_URL = (() => {
    if (typeof window !== 'undefined') {
        return `ws://${window.location.hostname}:${WS_PORT}`;
    }
    // Fallback for environments without window (e.g., Node.js)
    return `ws://localhost:${WS_PORT}`;
})();
export const OPC_UA_ENDPOINT_OFFLINE = "opc.tcp://192.168.1.2:4840"; // Local OPC UA endpoint for PLC
export const OPC_UA_ENDPOINT_ONLINE = "opc.tcp://112.134.218.51:4840"; // Remote OPC UA endpoint for PLC
export const VERSION = "0.9";
