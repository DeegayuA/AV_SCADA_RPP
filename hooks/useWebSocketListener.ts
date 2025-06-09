// hooks/useWebSocketListener.ts
import { useAppStore } from '@/stores/appStore';
import { WS_URL } from '@/config/constants';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner'; // Keep this for triggering toasts

export interface WebSocketMessageToServer {
  type: string;
  payload?: any;
}

// Define a more specific structure for expected toast messages from the server
interface ToastMessagePayload {
  severity: 'success' | 'error' | 'warning' | 'info' | 'default'; // Added 'default'
  message: string;
  description?: string; // Optional description for sonner
  duration?: number;    // Optional duration
  id?: string;          // Optional id for the toast
}

interface WebSocketMessageFromServer {
  type: string;
  payload: any; 
}

// Specific type for server-sent toast messages
interface ServerToastMessage extends WebSocketMessageFromServer {
  type: 'toast';
  payload: ToastMessagePayload;
}


export const useWebSocket = () => {
    // lastJsonMessage can now hold any structured message from the server,
    // including your custom 'toast' messages.
    const [lastJsonMessage, setLastJsonMessage] = useState<WebSocketMessageFromServer | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const reconnectIntervalId = useRef<NodeJS.Timeout | null>(null);
    const maxReconnectAttempts = useRef(10);
    const currentReconnectAttempts = useRef(0);

    const connect = useCallback(() => {
        if (!WS_URL) {
            console.error("WebSocket: WS_URL is not defined. Cannot connect.");
            toast.error("Configuration Error", { description: "WebSocket URL is missing."});
            return;
        }

        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log(`WebSocket: Attempting connection #${currentReconnectAttempts.current + 1} to ${WS_URL}...`);
        ws.current = new WebSocket(WS_URL);

        ws.current.onopen = () => {
            console.log("WebSocket: Connection established with", WS_URL);
            toast.success("Real-time Sync Active", { id: "ws-connect", duration: 3000 });
            setIsConnected(true);
            currentReconnectAttempts.current = 0; 
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
        };

        ws.current.onmessage = (event) => {
            // console.log("WebSocket: Raw event.data received:", event.data);
            // console.log("WebSocket: typeof event.data:", typeof event.data);

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
            // console.log("WebSocket: Message data string for parsing:", messageDataString);

            let parsedJson: unknown;
            try {
                parsedJson = JSON.parse(messageDataString);
            } catch (e) {
                console.error("WebSocket: Error parsing JSON string.", { raw: messageDataString, error: e });
                setLastJsonMessage({ type: 'parse_error', payload: { raw: messageDataString, error: (e instanceof Error ? e.message : String(e)) } });
                // Show a generic parse error toast to the user
                toast.error("Data Error", { description: "Received malformed data from the server." });
                return;
            }

            // console.log("WebSocket: Parsed data object:", parsedJson);
                
            if (typeof parsedJson === 'object' && parsedJson !== null) {
                const data = parsedJson as Record<string, any>;

                // ---- HANDLE SERVER-SENT TOASTS ----
                if (data.type === 'toast' && data.payload && typeof data.payload.message === 'string' && typeof data.payload.severity === 'string') {
                    const toastPayload = data.payload as ToastMessagePayload;
                    console.log("WebSocket: Received server-sent toast:", toastPayload);
                    switch (toastPayload.severity) {
                        case 'success':
                            toast.success(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id });
                            break;
                        case 'error':
                            toast.error(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id });
                            break;
                        case 'warning':
                            toast.warning(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id });
                            break;
                        case 'info':
                            toast.info(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id });
                            break;
                        default: // Includes 'default' or any other severity
                            toast(toastPayload.message, { description: toastPayload.description, duration: toastPayload.duration, id: toastPayload.id });
                            break;
                    }
                    // Optionally, you might still want to set it as lastJsonMessage if other parts of your app react to it
                    // setLastJsonMessage(data as ServerToastMessage); 
                    return; // Toast handled, no further processing of this message needed here.
                }
                // ---- END TOAST HANDLER ----


                if (typeof data.type === 'undefined') { 
                    const opcDataPayload: Record<string, string | number | boolean> = {};
                    let hasValidOpcData = false;
                    for (const key in data) {
                        if (Object.prototype.hasOwnProperty.call(data, key)) {
                            const value = data[key];
                            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                                opcDataPayload[key] = value;
                                hasValidOpcData = true;
                            } else {
                                // console.warn(`WebSocket: Received non-primitive value for OPC UA Node ID ${key}:`, value);
                            }
                        }
                    }
                    if (hasValidOpcData) {
                        useAppStore.getState().updateOpcUaNodeValues(opcDataPayload);
                    } else {
                        // console.warn("WebSocket: Received object data without 'type' field and no valid OPC-UA primitive values:", data);
                    }
                } else if (typeof data.type === 'string') { 
                    // console.log("Structured WebSocket message received:", data);
                    const message: WebSocketMessageFromServer = {
                        type: data.type,
                        payload: data.payload
                    };
                    setLastJsonMessage(message);
                } else {
                    console.warn("WebSocket: Received object data with invalid 'type' field (not a string):", data);
                }
            } else {
                console.warn("WebSocket: Received JSON data that is not an object:", parsedJson);
            }
        };

        ws.current.onerror = (errorEvent) => {
            console.error("WebSocket: Error event occurred:", errorEvent);
            // A general error toast can be shown here, but it might be redundant
            // if onclose also fires and handles reconnection toasts.
            // toast.error("WebSocket Error", { description: "A connection error occurred." });
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
                    // Update toast or show a new one for retrying
                    if(currentReconnectAttempts.current === 1) {
                         toast.warning("Real-time Sync Lost", { id: "ws-disconnect-retry", description: `Attempting to reconnect... (Attempt ${currentReconnectAttempts.current})`});
                    } else {
                        toast.dismiss("ws-disconnect-retry"); // Dismiss old one if any
                        toast.warning("Reconnecting...", { id: "ws-disconnect-retry", description: `Attempt #${currentReconnectAttempts.current}. Please wait.`});
                    }
                } else {
                    console.error("WebSocket: Maximum reconnect attempts reached.");
                    toast.error("Connection Failed", { id:"ws-max-reconnect", description: "Could not connect to the real-time server. Please check your connection or try again later." });
                }
            } else if (event.wasClean && event.code === 1000) { // Explicitly closed by server or client code
                 toast.info("Real-time Sync Disconnected", { id: "ws-disconnect-clean", duration: 3000 });
            } else if (event.code === 1001) { // Going Away (e.g. server shutting down or browser navigating away)
                // Usually, no toast is needed here as the user is likely leaving the page.
                console.log("WebSocket: Connection closed because the endpoint is going away.");
            }
        };
    }, [WS_URL]); // Removed maxReconnectAttempts from dependencies as it's a ref

    useEffect(() => {
        if (typeof window !== 'undefined') { 
           connect();
        }
        return () => {
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
            if (ws.current) {
                console.log("WebSocket: Cleaning up connection on component unmount.");
                ws.current.onopen = null;
                ws.current.onmessage = null;
                ws.current.onerror = null;
                ws.current.onclose = null; 
                if (ws.current.readyState === WebSocket.OPEN) {
                    // Send a close code 1000 for normal closure.
                    // Browsers often send 1001 automatically on page unload.
                    ws.current.close(1000, "Client component unmounting");
                }
                ws.current = null; // Clear the ref
            }
            currentReconnectAttempts.current = 0; // Reset on unmount
            setIsConnected(false); // Ensure state is reset
        };
    }, [connect]); // `connect` is the main dependency here

    const sendJsonMessage = useCallback((message: WebSocketMessageToServer) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                ws.current.send(JSON.stringify(message));
                // console.log("WebSocket: Sent message:", message.type, message.payload);
            } catch (error) {
                console.error("WebSocket: Error serializing or sending message:", error, "Message:", message);
                toast.error("Message Send Error", { description: "Failed to send data to the server." });
            }
        } else {
            console.warn("WebSocket: Attempted to send message while not connected. Message:", message.type);
            toast.warning("Cannot Send: Offline", { description: "Not connected to the real-time server. Message not sent."});
            if (!isConnected && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
               // console.log("WebSocket: Triggering connect() from sendJsonMessage due to disconnected state.");
               connect(); // Attempt to reconnect if sending while disconnected
            }
        }
    }, [isConnected, connect]); // connect is stable, isConnected makes this reactive if needed

    return { sendJsonMessage, lastJsonMessage, isConnected, connect };
};