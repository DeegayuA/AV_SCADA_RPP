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

// A more specific base type for messages from server
interface WebSocketMessageFromServer {
  type: string;
  payload: any;
}

export const useWebSocket = () => {
    // Get state setters from the central Zustand store
    const { setWebSocketStatus, updateOpcUaNodeValues, setSendJsonMessage } = useAppStore.getState();

    // Add local state for components needing direct access
    const [isConnected, setIsConnected] = useState(false);
    const [lastJsonMessage, setLastJsonMessage] = useState<WebSocketMessageFromServer | null>(null);

    const [wsUrl, setWsUrl] = useState<string>('');
    const ws = useRef<WebSocket | null>(null);
    const reconnectIntervalId = useRef<NodeJS.Timeout | null>(null);
    const maxReconnectAttempts = useRef(10);
    const currentReconnectAttempts = useRef(0);

    // Effect to fetch the WebSocket URL on initial mount.
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
        if (!wsUrl || wsUrl.trim() === '') {
            return;
        }

        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
            if (ws.current.url === wsUrl) return;
        }

        if (ws.current) {
            ws.current.onclose = null;
            ws.current.close(1000, "Initiating new connection");
        }

        console.log(`WebSocket: Attempting connection #${currentReconnectAttempts.current + 1} to ${wsUrl}...`);
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log("WebSocket: Connection established with", wsUrl);
            toast.success("Real-time Sync Active", { id: "ws-connect", duration: 3000 });
            setIsConnected(true); // Update local state
            setWebSocketStatus(true, wsUrl); // Update global Zustand state
            currentReconnectAttempts.current = 0;
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
        };

        ws.current.onmessage = (event) => {
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
                    
                    // Always update lastJsonMessage for consumers like SLDWidget
                    setLastJsonMessage(message);

                    // Handle different message types
                    const componentSpecificMessageTypes = new Set([
                        'layout-data',
                        'layout-error',
                        'layout-saved-confirmation',
                        'layout-save-error',
                    ]);

                    if (message.type === 'toast') {
                        const toastPayload = message.payload as ToastMessagePayload;
                        switch (toastPayload.severity) {
                            case 'success': toast.success(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                            case 'error': toast.error(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                            case 'warning': toast.warning(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                            case 'info': toast.info(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                            default: toast(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                        }
                    } else if (componentSpecificMessageTypes.has(message.type)) {
                        // This message is handled by a component (like SLDWidget) watching lastJsonMessage. Do nothing further.
                    } else {
                        // Assume any other structured message is an OPC UA update
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

        ws.current.onerror = (errorEvent) => {
            console.error("WebSocket: Error event occurred:", errorEvent);
        };

        ws.current.onclose = (event) => {
            const reason = event.reason || (event.code === 1000 ? "Normal closure" : `Code ${event.code}`);
            console.log(`WebSocket: Connection closed. Reason: "${reason}", Clean: ${event.wasClean}`);
            setIsConnected(false); // Update local state
            setWebSocketStatus(false, wsUrl); // Update global Zustand state

            if (event.code !== 1000 && event.code !== 1001) {
                if (currentReconnectAttempts.current < maxReconnectAttempts.current) {
                    currentReconnectAttempts.current++;
                    const delay = Math.min(1000 * Math.pow(1.8, currentReconnectAttempts.current), 30000);
                    console.log(`WebSocket: Will attempt reconnect #${currentReconnectAttempts.current} in ${delay / 1000}s.`);
                    if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
                    reconnectIntervalId.current = setTimeout(connect, delay);
                    
                    const toastId = "ws-disconnect-retry";
                    const description = `Attempting to reconnect... (Attempt ${currentReconnectAttempts.current})`;
                    const message = currentReconnectAttempts.current === 1 ? "Real-time Sync Lost" : "Reconnecting...";
                    toast.warning(message, { id: toastId, description });
                } else {
                    console.error("WebSocket: Maximum reconnect attempts reached.");
                    toast.error("Connection Failed", { id:"ws-max-reconnect", description: "Could not connect to the real-time server. Check connection/URL." });
                }
            } else if (event.wasClean && event.code === 1000) {
                 toast.info("Real-time Sync Disconnected", { id: "ws-disconnect-clean", duration: 3000 });
            }
        };
    }, [wsUrl, setWebSocketStatus, updateOpcUaNodeValues]);
    
    const sendJsonMessage = useCallback((message: WebSocketMessageToServer) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                ws.current.send(JSON.stringify(message));
            } catch (error) {
                console.error("WebSocket: Error serializing or sending message:", error);
                toast.error("Message Send Error", { description: "Failed to send data to the server." });
            }
        } else {
            toast.warning("Cannot Send: Offline", { description: "Not connected to the real-time server. Message not sent."});
            if (!useAppStore.getState().isWebSocketConnected && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
               connect();
            }
        }
    }, [connect]);

    useEffect(() => {
        // Set the globally available sender function
        setSendJsonMessage(sendJsonMessage);
    }, [sendJsonMessage, setSendJsonMessage]);

    useEffect(() => {
        if (typeof window !== 'undefined' && wsUrl) {
            connect();
        }
        return () => {
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
            if (ws.current) {
                console.log("WebSocket: Cleaning up global connection on hook unmount.");
                ws.current.onclose = null; // Prevent onclose from triggering reconnect
                if (ws.current.readyState === WebSocket.OPEN) {
                    ws.current.close(1001, "Client component unmounting");
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

    return {
        sendJsonMessage,
        lastJsonMessage,
        isConnected,
        changeWebSocketUrl,
        connect,
    };
};