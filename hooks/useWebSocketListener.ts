// hooks/useWebSocketListener.ts
import { useAppStore } from '@/stores/appStore';
import { getWebSocketUrl, WEBSOCKET_CUSTOM_URL_KEY } from '@/config/constants';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

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

// Global singleton instance of the WebSocket.
// This ensures that even if the hook is called multiple times, we only have one WebSocket object.
let globalWs: WebSocket | null = null;

export const useWebSocket = () => {
    const { setWebSocketStatus, updateOpcUaNodeValues, setSendJsonMessage } = useAppStore.getState();

    const [isConnected, setIsConnected] = useState(false);
    const [lastJsonMessage, setLastJsonMessage] = useState<WebSocketMessageFromServer | null>(null);
    const [wsUrl, setWsUrl] = useState<string>('');
    const reconnectIntervalId = useRef<NodeJS.Timeout | null>(null);
    const maxReconnectAttempts = useRef(10);
    const currentReconnectAttempts = useRef(0);

    useEffect(() => {
        let isMounted = true;
        const fetchWsUrl = async () => {
            try {
                const url = await getWebSocketUrl();
                if (isMounted) {
                    setWsUrl(url);
                }
            } catch (error) {
                console.error("Error fetching WebSocket URL:", error);
                toast.error("Network Error", { description: "Could not determine server address." });
            }
        };
        fetchWsUrl();
        return () => { isMounted = false; };
    }, []);

    const connect = useCallback(() => {
        if (!wsUrl || wsUrl.trim() === '') return;
        if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) {
            if (globalWs.url === wsUrl) return; // Already connecting/connected to the correct URL
        }

        if (globalWs) {
            globalWs.onclose = null; // Prevent stale onclose handler from firing
            globalWs.close(1000, "Initiating new connection");
        }

        console.log(`WebSocket: Attempting connection #${currentReconnectAttempts.current + 1} to ${wsUrl}...`);
        globalWs = new WebSocket(wsUrl);

        globalWs.onopen = () => {
            console.log("WebSocket: Connection established with", wsUrl);
            toast.dismiss("ws-reconnect-loader"); // Dismiss any lingering reconnect toast
            toast.dismiss("ws-max-reconnect");
            toast.success("Real-time Sync Active", { id: "ws-connect", duration: 3000 });
            
            setIsConnected(true);
            setWebSocketStatus(true, wsUrl);
            currentReconnectAttempts.current = 0;
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
        };

        globalWs.onmessage = (event) => {
            let messageDataString: string;
            if (typeof event.data === 'string') {
                messageDataString = event.data;
            } else if (event.data instanceof ArrayBuffer) {
                messageDataString = new TextDecoder("utf-8").decode(event.data);
            } else {
                console.warn("WebSocket: event.data is of an unsupported type:", typeof event.data);
                toast.error("WebSocket Error", { description: "Received unexpected data type."});
                return;
            }
            try {
                const parsedJson = JSON.parse(messageDataString) as unknown;
                if (typeof parsedJson === 'object' && parsedJson !== null) {
                    const message = parsedJson as WebSocketMessageFromServer;
                    setLastJsonMessage(message);

                    const componentSpecificMessageTypes = new Set(['layout-data', 'layout-error', 'layout-saved-confirmation', 'layout-save-error']);
                    if (message.type === 'toast') {
                        const toastPayload = message.payload as ToastMessagePayload;
                        switch (toastPayload.severity) {
                            case 'success': toast.success(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                            case 'error': toast.error(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                            case 'warning': toast.warning(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                            case 'info': toast.info(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                            default: toast(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                        }
                    } else if (!componentSpecificMessageTypes.has(message.type)) {
                        updateOpcUaNodeValues(message as Record<string, any>);
                    }
                } else {
                     console.warn("WebSocket: Received JSON data that is not an object:", parsedJson);
                }
            } catch (e) {
                console.error("WebSocket: Error parsing JSON string.", { raw: messageDataString, error: e });
                toast.error("Data Error", { description: "Received malformed data from the server." });
            }
        };

        globalWs.onerror = (errorEvent) => {
            console.error("WebSocket: Error event occurred:", errorEvent);
        };

        globalWs.onclose = (event) => {
            const reason = event.reason || (event.code === 1000 ? "Normal closure" : `Code ${event.code}`);
            console.log(`WebSocket: Connection closed. Reason: "${reason}", Clean: ${event.wasClean}`);
            setIsConnected(false);
            setWebSocketStatus(false, wsUrl);

            // Do not reconnect on normal closure (1000) or page navigation (1001)
            if (event.code === 1000 || event.code === 1001) {
                if (event.wasClean) toast.info("Real-time Sync Disconnected", { id: "ws-disconnect-clean", duration: 3000 });
                return;
            }

            // Attempt to reconnect on abnormal closures
            if (currentReconnectAttempts.current < maxReconnectAttempts.current) {
                currentReconnectAttempts.current++;
                const delay = Math.min(1000 * Math.pow(1.8, currentReconnectAttempts.current), 30000);
                console.log(`WebSocket: Will attempt reconnect #${currentReconnectAttempts.current} in ${delay / 1000}s.`);
                reconnectIntervalId.current = setTimeout(connect, delay);
                
                // Use a silent loading toast for a better UX than repeated warnings
                const message = currentReconnectAttempts.current === 1 ? "Connection Lost. Retrying..." : "Reconnecting...";
                toast.loading(message, { id: "ws-reconnect-loader", description: `Attempt #${currentReconnectAttempts.current}` });
            } else {
                console.error("WebSocket: Maximum reconnect attempts reached.");
                toast.error("Connection Failed", { id: "ws-max-reconnect", description: "Could not connect to the real-time server. Please check your network or refresh.", duration: Infinity });
            }
        };
    }, [wsUrl, setWebSocketStatus, updateOpcUaNodeValues]);
    
    const sendJsonMessage = useCallback((message: WebSocketMessageToServer) => {
        if (globalWs && globalWs.readyState === WebSocket.OPEN) {
            try { globalWs.send(JSON.stringify(message)); }
            catch (error) { console.error("WebSocket: Error sending message:", error); toast.error("Message Send Error"); }
        } else {
            toast.warning("Cannot Send: Offline", { description: "Not connected to the real-time server."});
            if (!useAppStore.getState().isWebSocketConnected && (!globalWs || globalWs.readyState === WebSocket.CLOSED)) {
               connect();
            }
        }
    }, [connect]);

    useEffect(() => {
        setSendJsonMessage(sendJsonMessage);
    }, [sendJsonMessage, setSendJsonMessage]);

    useEffect(() => {
        if (wsUrl) {
            connect();
        }
        return () => {
            console.log("WebSocket: Cleaning up global connection in main hook unmount.");
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
            if (globalWs) {
                // IMPORTANT: Detach the onclose handler BEFORE closing the connection
                // to prevent the reconnect logic from firing on a deliberate unmount.
                globalWs.onclose = null;
                if (globalWs.readyState === WebSocket.OPEN) {
                    globalWs.close(1000, "Client component unmounting");
                }
            }
        };
    }, [wsUrl, connect]);
    
    const changeWebSocketUrl = useCallback((newUrl: string) => {
        const trimmedUrl = newUrl.trim();
        if (trimmedUrl && trimmedUrl !== wsUrl) {
            console.log(`WebSocket: Setting new target URL: ${trimmedUrl}`);
            toast.info("Updating Connection", { description: `Changing server URL...` });
            localStorage.setItem(WEBSOCKET_CUSTOM_URL_KEY, trimmedUrl);
            setWsUrl(trimmedUrl);
        }
    }, [wsUrl]);

    return { sendJsonMessage, lastJsonMessage, isConnected, changeWebSocketUrl, connect };
};