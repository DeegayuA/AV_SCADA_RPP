// hooks/useWebSocketListener.ts
import { useAppStore } from '@/stores/appStore';
import { WEBSOCKET_CUSTOM_URL_KEY } from '@/config/constants';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface WebSocketMessageToServer {
  type: string;
  payload?: any;
  requestId?: string;
}

interface ToastMessagePayload {
  message: string;
  options?: {
    description?: string;
    duration?: number;
    id?: string | number;
    // Add other sonner options as needed
  };
}
export interface WebSocketMessageFromServer {
  type: 'opc-ua-data' | 'toast' | 'opc-ua-status' | 'layout-data' | 'layout-error' | 'response' | string;
  payload?: any;
  requestId?: string;
  timestamp?: string;
}

const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_DELAY = 30000;

let globalWs: WebSocket | null = null;
const connectionManager = {
  reconnectTimeoutId: null as NodeJS.Timeout | null,
  reconnectAttempts: 0,
  instanceCounter: 0,
  pendingRequests: new Map<string, (data: any) => void>(),
};

const sendJsonMessage = (message: WebSocketMessageToServer) => {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    try {
      globalWs.send(JSON.stringify(message));
    } catch (error) {
      console.error("WebSocket send error:", error);
    }
  } else {
    console.warn("WebSocket not connected. Message not sent:", message);
  }
};

const getDefaultWebSocketUrl = (): string => {
    if (typeof window === 'undefined') {
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
    
    // memoize connect function to avoid re-creation on every render. wsUrl is a dependency
    const connect = useCallback(() => {
        const { setWebSocketStatus, updateOpcUaNodeValues } = useAppStore.getState();
        const url = wsUrl;
        
        if (!url) return;
        if (globalWs && (url === globalWs.url && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING))) {
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
            return;
        }

        globalWs.onopen = () => {
            console.log(`WebSocket: Connected successfully to ${url}.`);
            setWebSocketStatus(true, url);
            connectionManager.reconnectAttempts = 0;
            toast.success("Connected", { id: 'ws-connection', description: "Real-time server connection established." });
        };
        const handleMessage = (jsonString: string) => {
            try {
                const message: any = JSON.parse(jsonString);
                setLastJsonMessage(message);

                if (message.type === 'opc-ua-data' && message.payload) {
                    updateOpcUaNodeValues(message.payload);
                } else if (message.type === 'response' && message.requestId) {
                    const resolve = connectionManager.pendingRequests.get(message.requestId);
                    if (resolve) {
                        resolve(message.payload);
                        connectionManager.pendingRequests.delete(message.requestId);
                    }
                } else if (message.type === 'backend-error' && message.payload) {
                    useAppStore.getState().addErrorLogEntry(message.payload);
                } else if (message.type === 'toast' && message.payload) {
                    const { message: toastMsg, options } = message.payload as ToastMessagePayload;
                    const toastType = options?.id?.toString().includes('error') ? 'error' : 'info';
                    toast[toastType](toastMsg, options);
                } else if (typeof message === 'object' && message !== null && !message.type) {
                    // This is the data payload itself
                    updateOpcUaNodeValues(message);
                }

            } catch (error) {
                console.error("WebSocket: Error parsing incoming JSON message:", error);
            }
        }
        globalWs.onmessage = (event) => {
            if (typeof event.data === 'string') {
                handleMessage(event.data);
            }
        };

        globalWs.onerror = (error) => {
            console.error("WebSocket error observed:", error);
            setWebSocketStatus(false, url);
            // toast.error("Connection Error", { id: 'ws-connection-error', description: "An error occurred with the real-time connection."});
        };

        const tryReconnect = (closeEvent: CloseEvent) => {
            if (connectionManager.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.error("WebSocket: Maximum reconnect attempts reached. Aborting.");
                toast.error("Connection Lost", { id: 'ws-connection-lost', description: `Could not re-establish connection. Please check the server and refresh. Code: ${closeEvent.code}` });
                return;
            }
            connectionManager.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, connectionManager.reconnectAttempts), MAX_RECONNECT_DELAY);

            console.log(`WebSocket: Disconnected. Attempting reconnect ${connectionManager.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`);
            toast.warning("Reconnecting...", { id: 'ws-reconnect', description: `Attempt ${connectionManager.reconnectAttempts} to re-establish connection.` });

            connectionManager.reconnectTimeoutId = setTimeout(connect, delay);
        };

        globalWs.onclose = (event) => {
            console.log(`WebSocket: Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
            setWebSocketStatus(false, url);

            if (event.code === 1000) {
                 // Clean close by client, do not reconnect automatically
            } else {
                 tryReconnect(event);
            }
        };
    }, [wsUrl]); // Dependency on wsUrl ensures 'connect' is updated if the url changes

    function requestWithResponse<T>(message: WebSocketMessageToServer, timeout = 10000): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!globalWs || globalWs.readyState !== WebSocket.OPEN) {
              return reject(new Error("WebSocket not connected."));
            }
            const requestId = uuidv4();
            message.requestId = requestId;

            const timeoutId = setTimeout(() => { 
                connectionManager.pendingRequests.delete(requestId); 
                reject(new Error(`Request timed out after ${timeout}ms`));
            }, timeout);

            connectionManager.pendingRequests.set(requestId, (data: any) => { 
                clearTimeout(timeoutId); 
                resolve(data as T);
            });

            sendJsonMessage(message);
        });
    }

    // --- !! CORRECTED MAIN LIFECYCLE EFFECT !! ---
    useEffect(() => {
        // This initialization runs only for the first instance of the hook.
        if (connectionManager.instanceCounter === 0) {
            console.log("WebSocket: Initializing connection logic...");
            
            const customUrl = localStorage.getItem(WEBSOCKET_CUSTOM_URL_KEY);
            const cleanedCustomUrl = customUrl ? customUrl.replace(/^"|"$/g, '').trim() : null;

            // ** Logic Change **
            // 1. Prioritize a user-set custom URL.
            // 2. If no custom URL exists, calculate the dynamic default.
            // 3. The default is NEVER saved to localStorage.
            if (cleanedCustomUrl) {
                console.log(`WebSocket: Initial URL from localStorage: ${cleanedCustomUrl}`);
                setWsUrl(cleanedCustomUrl);
            } else {
                const defaultUrl = getDefaultWebSocketUrl();
                if (defaultUrl) {
                    console.log(`WebSocket: Initial URL calculated as default: ${defaultUrl}`);
                    setWsUrl(defaultUrl);
                } else {
                     console.error("WebSocket: Could not determine an initial URL to connect.");
                     toast.error("Configuration Error", { description: "Cannot determine the server address." });
                }
            }
        }
        
        // Setup global functions for Zustand store only once
        const state = useAppStore.getState();
        if (!state.sendJsonMessage) state.setSendJsonMessage(sendJsonMessage);
        if (!state.requestWithResponse) state.setRequestWithResponse(requestWithResponse);

        connectionManager.instanceCounter++;
        return () => {
            connectionManager.instanceCounter--;
            if (connectionManager.instanceCounter === 0) {
                console.log("WebSocket: Cleaning up global connection (last hook unmounted).");
                if (connectionManager.reconnectTimeoutId) clearTimeout(connectionManager.reconnectTimeoutId);
                if (globalWs) {
                    globalWs.onclose = null; // Prevent reconnect logic on manual close
                    globalWs.close(1000, "Client unmounting");
                    globalWs = null;
                }
            }
        };
    // The empty dependency array ensures this setup runs ONLY ONCE per application lifecycle.
    }, []);

    // Effect that triggers connection whenever the URL state changes.
    useEffect(() => {
        if(wsUrl) {
            connect();
        }
    }, [wsUrl, connect]);

    const changeWebSocketUrl = useCallback((newUrl: string) => {
        const trimmedUrl = newUrl.trim();
        const defaultUrl = getDefaultWebSocketUrl();

        // If the user is setting the URL to the current default, just clear the custom one
        if (trimmedUrl === defaultUrl) {
            if (wsUrl !== defaultUrl) {
                console.log(`WebSocket: Reverting to default URL: ${defaultUrl}`);
                toast.info("Connection Reverted", { description: "Using the default server address." });
                localStorage.removeItem(WEBSOCKET_CUSTOM_URL_KEY);
                setWsUrl(defaultUrl);
            }
        } else if (trimmedUrl && trimmedUrl !== wsUrl) { // Handle a new, custom URL
            console.log(`WebSocket: Setting new target URL: ${trimmedUrl}`);
            toast.info("Updating Connection...", { description: `Changing server to ${trimmedUrl}` });
            localStorage.setItem(WEBSOCKET_CUSTOM_URL_KEY, trimmedUrl);
            setWsUrl(trimmedUrl);
        }
    }, [wsUrl]);

    const resetWebSocketUrl = useCallback(() => {
        const defaultUrl = getDefaultWebSocketUrl();
        if (wsUrl !== defaultUrl) {
            console.log(`WebSocket: Resetting to default URL: ${defaultUrl}`);
            changeWebSocketUrl(defaultUrl);
        } else {
            toast.info("Already using default URL.");
        }
    }, [wsUrl, changeWebSocketUrl]);

    return {
        sendJsonMessage,
        lastJsonMessage,
        isConnected: useAppStore((state) => state.isWebSocketConnected),
        changeWebSocketUrl,
        resetWebSocketUrl,
        connect,
        activeUrl: wsUrl
    };
};