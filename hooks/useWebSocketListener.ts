// hooks/useWebSocketListener.ts
import { useAppStore } from '@/stores/appStore';
import { getWebSocketUrl, WEBSOCKET_CUSTOM_URL_KEY } from '@/config/constants'; // Removed WS_URL_INITIAL
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

interface ServerToastMessage extends WebSocketMessageFromServer {
  type: 'toast';
  payload: ToastMessagePayload;
}

export const useWebSocket = () => {
    const [lastJsonMessage, setLastJsonMessage] = useState<WebSocketMessageFromServer | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    // --- FIX: Initialize with an empty string to prevent premature connection ---
    const [wsUrl, setWsUrl] = useState<string>('');
    const ws = useRef<WebSocket | null>(null);
    const reconnectIntervalId = useRef<NodeJS.Timeout | null>(null);
    const maxReconnectAttempts = useRef(10);
    const currentReconnectAttempts = useRef(0);

    // Effect to fetch the WebSocket URL on initial mount.
    // It will set the URL and trigger the connection effect only once the URL is resolved.
    useEffect(() => {
        let isMounted = true;
        const fetchWsUrl = async () => {
            try {
                const url = await getWebSocketUrl();
                if (isMounted) {
                    setWsUrl(url); // This will trigger the connection effect below
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
        // This guard is now crucial. It prevents connection until wsUrl is set.
        if (!wsUrl || wsUrl.trim() === '') {
            console.log("WebSocket: URL not yet determined. Waiting...");
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
            setIsConnected(true);
            currentReconnectAttempts.current = 0;
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
        };

        ws.current.onmessage = (event) => {
            let messageDataString: string;
            if (typeof event.data === 'string') {
                messageDataString = event.data;
            } else if (event.data instanceof ArrayBuffer) {
                messageDataString = new TextDecoder("utf-8").decode(event.data);
            } else if (event.data instanceof Blob) {
                console.error("WebSocket: Received Blob data, which is not directly supported.");
                toast.error("WebSocket Error", { description: "Received unexpected Blob data format." });
                return;
            } else {
                console.warn("WebSocket: event.data is of an unexpected type:", typeof event.data);
                toast.error("WebSocket Error", { description: "Received unexpected data type."});
                return;
            }

            let parsedJson: unknown;
            try {
                parsedJson = JSON.parse(messageDataString);
            } catch (e) {
                console.error("WebSocket: Error parsing JSON string.", { raw: messageDataString, error: e });
                setLastJsonMessage({ type: 'parse_error', payload: { raw: messageDataString, error: (e instanceof Error ? e.message : String(e)) } });
                toast.error("Data Error", { description: "Received malformed data from the server." });
                return;
            }

            if (typeof parsedJson === 'object' && parsedJson !== null) {
                const data = parsedJson as Record<string, any>;

                if (data.type === 'toast' && data.payload && typeof data.payload.message === 'string' && typeof data.payload.severity === 'string') {
                    const toastPayload = data.payload as ToastMessagePayload;
                    console.log("WebSocket: Received server-sent toast:", toastPayload);
                    switch (toastPayload.severity) {
                        case 'success': toast.success(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                        case 'error': toast.error(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                        case 'warning': toast.warning(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                        case 'info': toast.info(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                        default: toast(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id }); break;
                    }
                    return;
                }

                if (typeof data.type === 'undefined') {
                    const opcDataPayload: Record<string, string | number | boolean> = {};
                    let hasValidOpcData = false;
                    for (const key in data) {
                        if (Object.prototype.hasOwnProperty.call(data, key)) {
                            const value = data[key];
                            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                                opcDataPayload[key] = value;
                                hasValidOpcData = true;
                            }
                        }
                    }
                    if (hasValidOpcData) {
                        useAppStore.getState().updateOpcUaNodeValues(opcDataPayload);
                    }
                } else if (typeof data.type === 'string') {
                    const message: WebSocketMessageFromServer = { type: data.type, payload: data.payload };
                    setLastJsonMessage(message);
                } else {
                    console.warn("WebSocket: Received object with invalid 'type' field (not a string):", data);
                }
            } else {
                console.warn("WebSocket: Received JSON data that is not an object:", parsedJson);
            }
        };

        ws.current.onerror = (errorEvent) => {
            console.error("WebSocket: Error event occurred:", errorEvent);
        };

        ws.current.onclose = (event) => {
            const reason = event.reason || (event.code === 1000 ? "Normal closure" : `Code ${event.code}`);
            console.log(`WebSocket: Connection closed. Reason: "${reason}", Clean: ${event.wasClean}`);
            setIsConnected(false);

            if (event.code !== 1000 && event.code !== 1001) {
                if (currentReconnectAttempts.current < maxReconnectAttempts.current) {
                    currentReconnectAttempts.current++;
                    const delay = Math.min(1000 * Math.pow(1.8, currentReconnectAttempts.current), 30000);
                    console.log(`WebSocket: Will attempt reconnect #${currentReconnectAttempts.current} in ${delay / 1000}s.`);
                    if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
                    reconnectIntervalId.current = setTimeout(connect, delay);
                    if(currentReconnectAttempts.current === 1) {
                         toast.warning("Real-time Sync Lost", { id: "ws-disconnect-retry", description: `Attempting to reconnect... (Attempt ${currentReconnectAttempts.current})`});
                    } else {
                        toast.dismiss("ws-disconnect-retry");
                        toast.warning("Reconnecting...", { id: "ws-disconnect-retry", description: `Attempt #${currentReconnectAttempts.current}. Please wait.`});
                    }
                } else {
                    console.error("WebSocket: Maximum reconnect attempts reached.");
                    toast.error("Connection Failed", { id:"ws-max-reconnect", description: "Could not connect to the real-time server. Check your connection or the URL." });
                }
            } else if (event.wasClean && event.code === 1000) {
                 toast.info("Real-time Sync Disconnected", { id: "ws-disconnect-clean", duration: 3000 });
            } else if (event.code === 1001) {
                console.log("WebSocket: Connection closed because the endpoint is going away (page navigation).");
            }
        };
    }, [wsUrl]);

    // This effect manages the connection lifecycle based on the wsUrl.
    useEffect(() => {
        // It will only run the connect logic after the fetchWsUrl effect has set a valid URL.
        if (typeof window !== 'undefined' && wsUrl) {
            currentReconnectAttempts.current = 0;
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
            connect();
        }

        return () => {
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
            if (ws.current) {
                console.log("WebSocket: Cleaning up connection on component unmount or URL change.");
                ws.current.onopen = null;
                ws.current.onmessage = null;
                ws.current.onerror = null;
                ws.current.onclose = null;
                if (ws.current.readyState === WebSocket.OPEN) {
                    ws.current.close(1000, "Client component unmounting");
                }
                ws.current = null;
            }
            setIsConnected(false);
        };
    }, [connect]); // `connect` is the key dependency, as it holds `wsUrl`.

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
            if (!isConnected && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
               connect();
            }
        }
    }, [isConnected, connect]);

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
        connect,
        changeWebSocketUrl,
        activeUrl: wsUrl,
    };
};