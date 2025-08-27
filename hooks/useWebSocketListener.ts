// hooks/useWebSocketListener.ts
import { useAppStore } from '@/stores/appStore';
import { WEBSOCKET_CUSTOM_URL_KEY } from '@/config/constants'; // Removed getWebSocketUrl
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// --- Interfaces (No changes) ---
export interface WebSocketMessageToServer {
  type: string;
  payload?: any;
  requestId?: string;
}

interface ToastMessagePayload {
  severity: 'success' | 'error' | 'warning' | 'info' | 'default';
  message: string;
  description?: string;
  duration?: number;
  id?: string;
}

interface WebSocketMessageFromServer {
  type: string;
  payload: any;
  requestId?: string;
}

// --- Constants (No changes) ---
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

// --- Singleton WebSocket instance (No changes) ---
let globalWs: WebSocket | null = null;
const connectionManager = {
  reconnectTimeoutId: null as NodeJS.Timeout | null,
  reconnectAttempts: 0,
  instanceCounter: 0,
  pendingRequests: new Map<string, (data: any) => void>(),
};

// A stable, globally-scoped function. The hook will register this with the store. (No changes)
const sendJsonMessage = (message: WebSocketMessageToServer) => {
    if (globalWs?.readyState === WebSocket.OPEN) {
        try {
            globalWs.send(JSON.stringify(message));
        } catch (error) {
            console.error("WebSocket: Error sending message:", error);
            toast.error("Message Send Error");
        }
    } else {
        toast.warning("Cannot Send: Offline", { description: "Not connected to the real-time server."});
    }
};

/**
 * NEW: Generates the default WebSocket URL based on the browser's current location.
 * Converts http://domain:3000 to ws://domain:2001
 * Converts https://domain:443 to wss://domain:2001
 * @returns {string} The constructed WebSocket URL.
 */
const getDefaultWebSocketUrl = (): string => {
    if (typeof window === 'undefined') {
        // Return an empty string in non-browser environments (like SSR)
        return '';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const defaultPort = 2001;
    
    return `${protocol}//${hostname}:${defaultPort}`;
}


export const useWebSocket = () => {
    const [lastJsonMessage, setLastJsonMessage] = useState<WebSocketMessageFromServer | null>(null);
    const [wsUrl, setWsUrl] = useState('');

    const connect = useCallback(() => {
        // (No changes in this function)
        const { setWebSocketStatus, updateOpcUaNodeValues } = useAppStore.getState();
        const url = wsUrl;

        if (!url) return;
        if (globalWs && (wsUrl === globalWs.url && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING))) return;
        
        if (globalWs) {
            globalWs.onclose = null;
            globalWs.close(1000, "Initiating new connection");
        }
        if (connectionManager.reconnectTimeoutId) {
            clearTimeout(connectionManager.reconnectTimeoutId);
            connectionManager.reconnectTimeoutId = null;
        }

        console.log(`WebSocket: Attempting to connect to ${url}...`);
        try {
            globalWs = new WebSocket(url);
        } catch (e: any) {
            console.error(`WebSocket: Failed to construct WebSocket for URL "${url}"`, e);
            toast.error("Connection Failed", { description: `The provided URL is invalid.`, id: 'ws-invalid-url' });
            return;
        }

        globalWs.onopen = () => {
            console.log("WebSocket: Connection established with", url);
            toast.dismiss("ws-reconnect-loader"); toast.dismiss("ws-max-reconnect");
            toast.success("Real-time Sync Active", { id: "ws-connect", duration: 3000 });
            setWebSocketStatus(true, url);
            connectionManager.reconnectAttempts = 0;
        };

        const handleMessage = (jsonString: string) => { /* ... (no changes in message handler logic) ... */ try { const message = JSON.parse(jsonString); if (message.requestId && connectionManager.pendingRequests.has(message.requestId)) { const resolve = connectionManager.pendingRequests.get(message.requestId); resolve?.(message.payload); connectionManager.pendingRequests.delete(message.requestId); return; } if (typeof message !== 'object' || message === null) { return; } if ('type' in message && typeof message.type === 'string') { const structuredMessage = message; setLastJsonMessage(structuredMessage); const componentSpecificMessageTypes = new Set(['layout-data', 'layout-error', 'layout-saved-confirmation', 'layout-save-error']); if (structuredMessage.type === 'toast') { const { severity = 'default', ...toastOptions } = structuredMessage.payload; if (severity === 'default') { toast(toastOptions.message, toastOptions); } else { toast[severity](toastOptions.message, toastOptions); } } else if (structuredMessage.type === 'opcua-data') { if (structuredMessage.payload && typeof structuredMessage.payload === 'object') { updateOpcUaNodeValues(structuredMessage.payload); } } else if (!componentSpecificMessageTypes.has(structuredMessage.type)) { updateOpcUaNodeValues(structuredMessage); } } else { setLastJsonMessage({ type: 'opcua-data', payload: message }); updateOpcUaNodeValues(message); } } catch (e) { console.error("WebSocket: Error parsing JSON.", { raw: jsonString, error: e }); } };

        globalWs.onmessage = (event) => { /* ... (no changes in onmessage) ... */ };
        globalWs.onerror = (error) => { /* ... (no changes in onerror) ... */ };
        
        globalWs.onclose = (event) => {
            console.log(`WebSocket: Connection closed. Code: ${event.code}, Reason: "${event.reason}"`);
            setWebSocketStatus(false, url);
            if (event.code === 1000 || event.code === 1001) { if(event.wasClean) toast.info("Real-time Sync Disconnected"); return; }
            if (connectionManager.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                connectionManager.reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(1.8, connectionManager.reconnectAttempts), MAX_RECONNECT_DELAY);
                console.log(`Will attempt reconnect #${connectionManager.reconnectAttempts} in ${delay / 1000}s.`);
                connectionManager.reconnectTimeoutId = setTimeout(connect, delay);
                toast.loading( connectionManager.reconnectAttempts === 1 ? "Connection Lost. Retrying..." : "Reconnecting...", { id: "ws-reconnect-loader", description: `Attempt #${connectionManager.reconnectAttempts}` });
            } else {
                toast.error("Connection Failed", { id: "ws-max-reconnect", description: "Could not connect. Please check your network and refresh.", duration: Infinity });
            }
        };
    }, [wsUrl]);

    function requestWithResponse<T>(message: WebSocketMessageToServer, timeout = 10000): Promise<T> {
        // (No changes in this function)
        return new Promise((resolve, reject) => {
            const requestId = uuidv4();
            message.requestId = requestId;

            const timeoutId = setTimeout(() => { connectionManager.pendingRequests.delete(requestId); reject(new Error(`Request timed out`)); }, timeout);
            connectionManager.pendingRequests.set(requestId, (data: any) => { clearTimeout(timeoutId); resolve(data as T); });

            sendJsonMessage(message);
        });
    }

    // --- REFACTORED Main lifecycle effect for initialization and cleanup ---
    useEffect(() => {
        // Set up global store functions once
        const state = useAppStore.getState();
        if (!state.sendJsonMessage) state.setSendJsonMessage(sendJsonMessage);
        if (!state.requestWithResponse) state.setRequestWithResponse(requestWithResponse);
        
        // This initialization runs only for the first instance of the hook.
        if (connectionManager.instanceCounter === 0) {
            console.log("WebSocket: Initializing connection logic...");
            
            // Priority: User's custom URL > Generated default URL
            const customUrl = localStorage.getItem(WEBSOCKET_CUSTOM_URL_KEY);
            const defaultUrl = getDefaultWebSocketUrl();
            const initialUrl = customUrl || defaultUrl;
            
            if (initialUrl) {
                console.log(`WebSocket: Initial URL resolved to: ${initialUrl} (${customUrl ? "from localStorage" : "as default"})`);
                setWsUrl(initialUrl); // This will trigger the connection via the other useEffect
            } else {
                 console.error("WebSocket: Could not determine an initial URL to connect.");
                 toast.error("Configuration Error", { description: "Cannot determine the server address." });
            }
        }

        connectionManager.instanceCounter++;
        return () => {
            connectionManager.instanceCounter--;
            if (connectionManager.instanceCounter === 0) {
                console.log("WebSocket: Cleaning up global connection (last hook unmounted).");
                if (connectionManager.reconnectTimeoutId) clearTimeout(connectionManager.reconnectTimeoutId);
                if (globalWs) {
                    globalWs.onclose = null;
                    globalWs.close(1000, "Client unmounting");
                    globalWs = null;
                }
            }
        };
    // The empty dependency array ensures this setup runs ONLY ONCE.
    }, []);

    // Effect that triggers connection whenever the URL changes.
    useEffect(() => {
        if(wsUrl) {
            connect();
        }
    }, [wsUrl, connect]);

    const changeWebSocketUrl = useCallback((newUrl: string) => {
        // (No changes in this function)
        const trimmedUrl = newUrl.trim();
        if (trimmedUrl && trimmedUrl !== wsUrl) {
            console.log(`WebSocket: Setting new target URL: ${trimmedUrl}`);
            toast.info("Updating Connection...", { description: `Changing server to ${trimmedUrl}` });
            localStorage.setItem(WEBSOCKET_CUSTOM_URL_KEY, trimmedUrl);
            setWsUrl(trimmedUrl);
        }
    }, [wsUrl]);

    return {
        // (No changes in return value)
        sendJsonMessage,
        lastJsonMessage,
        isConnected: useAppStore((state) => state.isWebSocketConnected),
        changeWebSocketUrl,
        connect,
        activeUrl: wsUrl
    };
};