// hooks/useWebSocketListener.ts
import { useAppStore } from '@/stores/appStore';
// RealTimeData type might be removed or updated in types/sld.ts later if not used elsewhere.
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
  payload: any;
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

            let data;
            try {
                data = JSON.parse(messageDataString);
            } catch (e) {
                console.error("WebSocket: Error parsing JSON string. Raw string:", messageDataString, "Error:", e);
                setLastJsonMessage({ type: 'parse_error', payload: { raw: messageDataString, error: (e as Error).message } } as any);
                return; 
            }

            console.log("WebSocket: Parsed data object:", data);
            console.log("WebSocket: typeof data after parse:", typeof data);
                
            if (typeof data === 'object' && data !== null) {
                // Distinguish OPC UA data (typically doesn't have 'type' field) from structured messages
                if (!data.type) { // OPC UA Data: Expecting a flat Record<string, value>
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
                        // console.log("Processed OPC UA payload for store:", opcDataPayload); // Less verbose log
                        useAppStore.getState().updateOpcUaNodeValues(opcDataPayload);
                    } else {
                        // This case could happen if the parsed JSON is an object but not the expected OPC-UA flat structure,
                        // and also doesn't have a 'type' field.
                        console.warn("WebSocket: Received object data without a 'type' field and not matching expected OPC-UA structure:", data);
                    }
                } else if (data.type && typeof data.type === 'string') { // Structured Message (e.g., for SLD layouts)
                    console.log("Structured WebSocket message received:", data);
                    setLastJsonMessage(data as WebSocketMessageFromServer);
                    // Example: if (data.type === 'opcua-structured-batch' && data.payload) {
                    //    useAppStore.getState().updateOpcUaNodeValues(data.payload as Record<string, string | number | boolean>);
                    // }
                } else {
                    // Parsed JSON is an object, but 'type' field is missing or not a string.
                    console.warn("WebSocket: Received object data with invalid or missing 'type' field:", data);
                }
            } else {
                // Parsed JSON is not an object (e.g., a string, number, boolean directly, or null)
                console.warn("WebSocket: Received JSON data that is not an object:", data);
            }
        };

        ws.current.onerror = (errorEvent) => {
            console.error("WebSocket: Error event occurred:", errorEvent);
            // onclose will handle state changes and reconnection attempts.
            // A toast here might be redundant if onclose provides one.
        };

        ws.current.onclose = (event) => {
            const reason = event.reason || (event.code === 1000 ? "Normal closure" : `Code ${event.code}`);
            console.log(`WebSocket: Connection closed. Reason: "${reason}", Clean: ${event.wasClean}`);
            setIsConnected(false);
            
            // Attempt to reconnect if not a normal closure (1000) or explicit client unmount (1001 often implies this context)
            if (event.code !== 1000 && event.code !== 1001) { 
                if (currentReconnectAttempts.current < maxReconnectAttempts.current) {
                    currentReconnectAttempts.current++;
                    // Exponential backoff, but cap at 30 seconds
                    const delay = Math.min(1000 * Math.pow(1.8, currentReconnectAttempts.current), 30000); 
                    console.log(`WebSocket: Will attempt reconnect #${currentReconnectAttempts.current} in ${delay / 1000}s.`);
                    if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current); // Clear any existing timer
                    reconnectIntervalId.current = setTimeout(connect, delay);
                    if(currentReconnectAttempts.current === 1) { // Show toast on first disconnect leading to retry
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
    }, [WS_URL]); // WS_URL is a dependency

    useEffect(() => {
        if (typeof window !== 'undefined') { // Ensure WebSocket is only used client-side
           connect(); // Initial connection attempt
        }
        return () => { // Cleanup on unmount
            if (reconnectIntervalId.current) clearTimeout(reconnectIntervalId.current);
            if (ws.current) {
                console.log("WebSocket: Cleaning up connection on component unmount.");
                ws.current.onopen = null;
                ws.current.onmessage = null;
                ws.current.onerror = null;
                ws.current.onclose = null; // Important to remove listeners to prevent them firing on old instance
                if (ws.current.readyState === WebSocket.OPEN) {
                    ws.current.close(1000, "Client component unmounting");
                }
                ws.current = null; // Release the WebSocket object
            }
            currentReconnectAttempts.current = 0; // Reset for next mount if any
            setIsConnected(false); // Ensure state reflects disconnect
        };
    }, [connect]); // `connect` is stable due to useCallback

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
            // Optionally queue message or trigger a reconnect attempt. connect() call here can be aggressive.
            // The general reconnect logic in onclose should handle reconnections.
            // If critical, and not connecting, explicitly call connect():
            // if (!isConnected && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
            //    console.log("WebSocket: Triggering connect() from sendJsonMessage due to disconnected state.");
            //    connect();
            // }
        }
    }, [/* connect removed as it's mostly for initial and retry logic. Relies on OPEN state for send */]);

    return { sendJsonMessage, lastJsonMessage, isConnected, connect }; // Expose connect for manual retry UIs
};
