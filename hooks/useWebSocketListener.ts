// hooks/useWebSocketListener.ts
import { useAppStore } from '@/stores/appStore';
// For now, the store directly uses Record<string, string | number | boolean>.
import { WS_URL } from '@/config/constants';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface WebSocketMessageToServer {
  type: string;
  payload?: any;
}

interface WebSocketMessageFromServer {
  type: string;
  payload: any; // Note: 'any' is used here; could be 'unknown' for more strictness.
}

export const useWebSocket = () => {
    const [lastJsonMessage, setLastJsonMessage] = useState<WebSocketMessageFromServer | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const reconnectIntervalId = useRef<NodeJS.Timeout | null>(null);
    const maxReconnectAttempts = useRef(10); // Or Infinity
    const currentReconnectAttempts = useRef(0);

    const connect = useCallback(() => {
        if (!WS_URL) {
            console.error("WebSocket: WS_URL is not defined. Cannot connect.");
            toast.error("Configuration Error", { description: "WebSocket URL is missing."});
            return;
        }

        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
            // console.log("WebSocket: Already connected or connecting.");
            return;
        }

        console.log(`WebSocket: Attempting connection #${currentReconnectAttempts.current + 1} to ${WS_URL}...`);
        ws.current = new WebSocket(WS_URL);

        ws.current.onopen = () => {
            console.log("WebSocket: Connection established with", WS_URL);
            toast.success("Real-time Sync Active", { id: "ws-connect", duration: 3000 });
            setIsConnected(true);
            currentReconnectAttempts.current = 0; // Reset attempts on successful connection
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
        };

        ws.current.onmessage = (event) => {
            console.log("WebSocket: Raw event.data received:", event.data);
            console.log("WebSocket: typeof event.data:", typeof event.data);

            let messageDataString: string;
            if (typeof event.data === 'string') {
                messageDataString = event.data;
            } else if (event.data instanceof ArrayBuffer) {
                console.log("WebSocket: Received ArrayBuffer, decoding to UTF-8 string.");
                messageDataString = new TextDecoder("utf-8").decode(event.data);
            } else if (event.data instanceof Blob) {
                console.error("WebSocket: Received Blob data, which is not directly supported for JSON parsing in this handler. Please ensure server sends string or ArrayBuffer.");
                toast.error("WebSocket Error", { description: "Received unexpected Blob data format." });
                return;
            } else {
                console.warn("WebSocket: event.data is of an unexpected type:", typeof event.data);
                toast.error("WebSocket Error", { description: "Received unexpected data type."});
                return;
            }
            console.log("WebSocket: Message data string for parsing:", messageDataString);

            let parsedJson: unknown; // Use 'unknown' for safer parsing
            try {
                parsedJson = JSON.parse(messageDataString);
            } catch (e) {
                console.error("WebSocket: Error parsing JSON string. Raw string:", messageDataString, "Error:", e);
                // Removed 'as any'. The object structure fits WebSocketMessageFromServer for an error message.
                setLastJsonMessage({ type: 'parse_error', payload: { raw: messageDataString, error: (e instanceof Error ? e.message : String(e)) } });
                return;
            }

            console.log("WebSocket: Parsed data object:", parsedJson);
            console.log("WebSocket: typeof data after parse:", typeof parsedJson); // Log typeof the unknown variable
                
            // Check if parsedJson is an object and not null
            if (typeof parsedJson === 'object' && parsedJson !== null) {
                // Cast to Record<string, any> for easier property access,
                // this assumes a dictionary-like object structure common for JSON.
                const data = parsedJson as Record<string, any>;

                // Distinguish OPC UA data (typically doesn't have 'type' field) from structured messages
                if (typeof data.type === 'undefined') { // More explicit check for absence of 'type'
                    const opcDataPayload: Record<string, string | number | boolean> = {};
                    let hasValidOpcData = false;
                    for (const key in data) {
                        if (Object.prototype.hasOwnProperty.call(data, key)) {
                            const value = data[key];
                            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                                opcDataPayload[key] = value;
                                hasValidOpcData = true;
                            } else {
                                console.warn(`WebSocket: Received non-primitive value for OPC UA Node ID ${key}:`, value);
                            }
                        }
                    }
                    if (hasValidOpcData) {
                        useAppStore.getState().updateOpcUaNodeValues(opcDataPayload);
                    } else {
                        // This case can occur if the object has no own properties that are primitive,
                        // or if the object is empty.
                        console.warn("WebSocket: Received object data without a 'type' field and no valid OPC-UA primitive values found:", data);
                    }
                } else if (typeof data.type === 'string') { // Structured Message
                    console.log("Structured WebSocket message received:", data);
                    // Constructing the message explicitly to ensure it matches WebSocketMessageFromServer
                    // and doesn't carry unintended extra properties from `data`.
                    // `data.payload` is fine because WebSocketMessageFromServer.payload is 'any'.
                    const message: WebSocketMessageFromServer = {
                        type: data.type,
                        payload: data.payload // If data.payload might be missing, add 'payload' in data ? data.payload : undefined (or handle as error)
                    };
                    setLastJsonMessage(message);
                } else {
                    // Parsed JSON is an object, but 'type' field is present and not a string.
                    console.warn("WebSocket: Received object data with invalid 'type' field (not a string):", data);
                }
            } else {
                // Parsed JSON is not an object (e.g., a string "foo", number 123, boolean true, or null, if server sent such JSON)
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
                    }
                } else {
                    console.error("WebSocket: Maximum reconnect attempts reached. Please check server and network.");
                    toast.error("Connection Failed Permanently", { id:"ws-max-reconnect", description: "Max reconnect attempts reached. Manual action may be required." });
                }
            } else if (event.wasClean && event.code === 1000) {
                 toast.info("Real-time Sync Disconnected", { id: "ws-disconnect-clean", duration: 3000 });
            }
        };
    }, [WS_URL]); 

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
                    ws.current.close(1000, "Client component unmounting");
                }
                ws.current = null;
            }
            currentReconnectAttempts.current = 0;
            setIsConnected(false);
        };
    }, [connect]);

    const sendJsonMessage = useCallback((message: WebSocketMessageToServer) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                ws.current.send(JSON.stringify(message));
                console.log("WebSocket: Sent message:", message.type, message.payload);
            } catch (error) {
                console.error("WebSocket: Error serializing or sending message:", error, "Message:", message);
                toast.error("Message Send Error", { description: "Failed to send data to the server." });
            }
        } else {
            console.warn("WebSocket: Attempted to send message while not connected. Message:", message.type);
            toast.warning("Cannot Send: Offline", { description: "Not connected to the real-time server. Message not sent."});
            if (!isConnected && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
               console.log("WebSocket: Triggering connect() from sendJsonMessage due to disconnected state.");
               connect();
            }
        }
    }, [/* isConnected and connect were not in dependencies previously, keep that if it was intentional */ isConnected, connect]); // Added isConnected and connect if re-connect attempt is desired here. If not, dependencies could be empty.

    return { sendJsonMessage, lastJsonMessage, isConnected, connect };
};