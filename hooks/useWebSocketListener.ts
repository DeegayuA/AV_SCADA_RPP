// hooks/useWebSocketListener.ts
import { useAppStore } from '@/stores/appStore';
import { getWebSocketUrl, WEBSOCKET_CUSTOM_URL_KEY } from '@/config/constants';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// --- Interfaces ---
export interface WebSocketMessageToServer {
  type: string;
  payload?: any;
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
}

// --- Constants ---
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

// --- Singleton WebSocket instance ---
let globalWs: WebSocket | null = null;

const connectionManager = {
  reconnectTimeoutId: null as NodeJS.Timeout | null,
  reconnectAttempts: 0,
  instanceCounter: 0,
};

// A stable, globally-scoped function. The hook will register this with the store.
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

export const useWebSocket = () => {
    // State specific to this hook instance for a component to optionally consume
    const [lastJsonMessage, setLastJsonMessage] = useState<WebSocketMessageFromServer | null>(null);
    // URL state to trigger connection/re-connection logic
    const [wsUrl, setWsUrl] = useState('');

    const connect = useCallback(() => {
        // Access store methods via getState() inside callbacks to avoid re-renders.
        const { setWebSocketStatus, updateOpcUaNodeValues } = useAppStore.getState();
        const url = wsUrl; 

        if (!url) return;

        if (globalWs && (wsUrl === globalWs.url && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING))) {
            return;
        }

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
            return; // Abort connection attempt if URL is invalid
        }
        
        globalWs.onopen = () => {
            console.log("WebSocket: Connection established with", url);
            toast.dismiss("ws-reconnect-loader");
            toast.dismiss("ws-max-reconnect");
            toast.success("Real-time Sync Active", { id: "ws-connect", duration: 3000 });
            setWebSocketStatus(true, url);
            connectionManager.reconnectAttempts = 0;
        };
        
        const handleMessage = (jsonString: string) => {
             try {
                const message = JSON.parse(jsonString) as WebSocketMessageFromServer;
                if (typeof message !== 'object' || message === null || !message.type) {
                     console.warn("WebSocket: Received JSON is not a valid message object:", message);
                    return;
                }
                setLastJsonMessage(message);
                const componentSpecificMessageTypes = new Set(['layout-data', 'layout-error', 'layout-saved-confirmation', 'layout-save-error']);
                
                if (message.type === 'toast') {
                    const { severity = 'default', ...toastOptions } = message.payload as ToastMessagePayload;
                    if (severity === 'default') {
                        toast(toastOptions.message, toastOptions);
                    } else {
                        // @ts-ignore - We know severity is a valid method on toast except 'default'
                        toast[severity](toastOptions.message, toastOptions);
                    }
                } else if (!componentSpecificMessageTypes.has(message.type)) {
                    updateOpcUaNodeValues(message as Record<string, any>);
                }
            } catch (e) {
                console.error("WebSocket: Error parsing JSON.", { raw: jsonString, error: e });
                toast.error("Data Error", { description: "Received malformed data from the server." });
            }
        };

        globalWs.onmessage = (event) => {
            if (typeof event.data === 'string') handleMessage(event.data);
            else if (event.data instanceof Blob) event.data.text().then(handleMessage).catch(console.error);
            else console.warn("WebSocket: Received unsupported data type:", typeof event.data);
        };

        globalWs.onerror = (error) => console.error("WebSocket: Error occurred:", error);

        globalWs.onclose = (event) => {
            console.log(`WebSocket: Connection closed. Code: ${event.code}, Reason: "${event.reason}"`);
            setWebSocketStatus(false, url);
            if (event.code === 1000 || event.code === 1001) {
                if(event.wasClean) toast.info("Real-time Sync Disconnected");
                return;
            }

            if (connectionManager.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                connectionManager.reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(1.8, connectionManager.reconnectAttempts), MAX_RECONNECT_DELAY);
                console.log(`Will attempt reconnect #${connectionManager.reconnectAttempts} in ${delay / 1000}s.`);
                connectionManager.reconnectTimeoutId = setTimeout(connect, delay);
                const msg = connectionManager.reconnectAttempts === 1 ? "Connection Lost. Retrying..." : "Reconnecting...";
                toast.loading(msg, { id: "ws-reconnect-loader", description: `Attempt #${connectionManager.reconnectAttempts}` });
            } else {
                toast.error("Connection Failed", { id: "ws-max-reconnect", description: "Could not connect. Please check your network and refresh.", duration: Infinity });
            }
        };
    }, [wsUrl]);
    
    // Main lifecycle effect for initialization and cleanup.
    useEffect(() => {
        // This effect runs only ONCE on mount.
        useAppStore.getState().setSendJsonMessage(sendJsonMessage);
        
        let isMounted = true;
        const fetchAndConnect = async () => {
            try {
                // Fulfills user request: "go to the /api/opcua to start the websocket initialy"
                const response = await fetch('/api/opcua');
                if (!response.ok) {
                    throw new Error(`API call failed with status ${response.status}`);
                }
                const data = await response.json();
                const url = data.webSocketUrl;

                if (url && isMounted) {
                    setWsUrl(url); // This will trigger the connection via the other useEffect
                } else {
                    throw new Error("WebSocket URL not found in API response");
                }
            } catch (error) {
                console.error("Error fetching initial WebSocket URL:", error);
                toast.error("Network Error", { description: "Could not get server address from API." });
            }
        };
        
        if (connectionManager.instanceCounter === 0) {
            fetchAndConnect();
        }
        
        connectionManager.instanceCounter++;
        return () => {
            isMounted = false;
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
        const trimmedUrl = newUrl.trim();
        if (trimmedUrl && trimmedUrl !== wsUrl) {
            console.log(`WebSocket: Setting new target URL: ${trimmedUrl}`);
            toast.info("Updating Connection...", { description: `Changing server to ${trimmedUrl}` });
            localStorage.setItem(WEBSOCKET_CUSTOM_URL_KEY, trimmedUrl);
            setWsUrl(trimmedUrl);
        }
    }, [wsUrl]);

    // Components get the globally stable send function and reactively subscribe to `isConnected`.
    return { 
        sendJsonMessage, 
        lastJsonMessage, 
        isConnected: useAppStore((state) => state.isWebSocketConnected), 
        changeWebSocketUrl, 
        connect,
        activeUrl: wsUrl
    };
};