// hooks/useWebSocketListener.ts
import { useAppStore } from '@/stores/appStore';
import { RealTimeData } from '@/types/sld';
import { WS_URL } from '@/config/constants'; // Ensure WS_URL is defined correctly
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner'; // For notifications

// For messages sent TO the server, like commands or layout requests
export interface WebSocketMessageToServer {
  type: string; // e.g., 'get-layout', 'save-sld-widget-layout', 'send-command'
  payload?: any;
}

// For messages received FROM the server
interface WebSocketMessageFromServer {
  type: string; // e.g., 'layout-data', 'layout-error', 'realtime-update', 'layout-saved-confirmation', 'command-ack'
  payload: any; // Flexible payload
}

export const useWebSocket = () => {
    const [lastJsonMessage, setLastJsonMessage] = useState<WebSocketMessageFromServer | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
    const maxReconnectAttempts = 10; // Or Infinity if desired
    const reconnectAttempts = useRef(0);
    // const [isManuallyConnecting, setIsManuallyConnecting] = useState(false); // May not be needed if connect is called mostly internally

    const connect = useCallback(() => {
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
            console.log("WebSocket: Already connected or connecting.");
            return;
        }

        console.log(`WebSocket: Attempting to connect (Attempt ${reconnectAttempts.current + 1} to ${WS_URL})...`);
        ws.current = new WebSocket(WS_URL); // WS_URL must be defined in your constants

        ws.current.onopen = () => {
            console.log("WebSocket: Connection established with", WS_URL);
            toast.success("Real-time Sync Active", {id: "ws-connect", duration: 2000});
            setIsConnected(true);
            reconnectAttempts.current = 0;
            if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data as string);
                
                // Assuming your backend (route.ts) sends specific message types
                // OR direct data batches. Let's handle both possibilities.
                if (typeof data === 'object' && data !== null) {
                    if (data.type && typeof data.type === 'string') {
                        // Structured message (e.g., for layout data, confirmations)
                        setLastJsonMessage(data as WebSocketMessageFromServer);
                        // If the backend wraps real-time updates in a type, handle it here
                        // Example: if (data.type === 'realtime-data-batch') {
                        //   useAppStore.getState().updateRealtimeData(data.payload as RealTimeData);
                        // }
                    } else {
                        // Assume it's a direct RealTimeData batch from the backend
                        // This is what the provided route.ts implies for its periodic data send.
                        useAppStore.getState().updateRealtimeData(data as RealTimeData);
                        // Optionally, setLastJsonMessage for other components listening for generic updates
                        setLastJsonMessage({ type: 'direct-data-update', payload: data });
                    }
                } else {
                   console.warn("WebSocket: Received non-object data:", data);
                }
            } catch (e) {
                console.error("WebSocket: Error parsing message:", e, "Raw data:", event.data);
                setLastJsonMessage({ type: 'parse_error', payload: event.data as string } as any);
            }
        };

        ws.current.onerror = (errorEvent) => {
            console.error("WebSocket: Error event:", errorEvent);
            // isConnected will be set to false in onclose
            // No toast here, as onclose will handle more specific feedback.
        };

        ws.current.onclose = (event) => {
            const reason = event.reason || (event.code === 1000 ? "Normal closure" : "Unknown reason");
            console.log(`WebSocket: Connection closed. Code: ${event.code}, Reason: ${reason}, Clean: ${event.wasClean}`);
            setIsConnected(false);
            
            if (event.code !== 1000 && event.code !== 1001) { // Not a user-initiated or normal closure
                toast.error("Real-time Sync Lost", { id: "ws-disconnect", description: `Code: ${event.code}. Attempting to reconnect...` });
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    const delay = Math.min(1000 * Math.pow(1.8, reconnectAttempts.current), 30000); // Exponential backoff
                    console.log(`WebSocket: Reconnecting in ${delay / 1000}s...`);
                    if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
                    reconnectInterval.current = setTimeout(connect, delay); // Call connect which calls tryConnect
                } else {
                    console.error("WebSocket: Max reconnect attempts reached. Please check server and network.");
                    toast.error("Connection Failed", {id:"ws-max-reconnect", description: "Max reconnect attempts reached. Manual intervention may be required."});
                }
            } else if (event.code === 1000 && event.wasClean) {
                // Optionally provide a less alarming message for clean closures if needed
                toast.info("Real-time Sync Disconnected", {id: "ws-disconnect-clean", duration: 2000});
            }
        };
    }, [WS_URL]); // Added WS_URL, maxReconnectAttempts. `connect` itself becomes a dependency later.

    useEffect(() => {
        if (typeof window !== 'undefined') {
           connect();
        }
        return () => {
            if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
            if (ws.current) {
                console.log("WebSocket: Cleaning up connection on unmount.");
                ws.current.onopen = null;
                ws.current.onmessage = null;
                ws.current.onerror = null;
                ws.current.onclose = null;
                if (ws.current.readyState === WebSocket.OPEN) {
                    ws.current.close(1000, "Client unmounting");
                }
                ws.current = null;
            }
            reconnectAttempts.current = 0;
            setIsConnected(false);
        };
    }, [connect]); // `connect` is now a stable useCallback dependency

    const sendJsonMessage = useCallback((message: WebSocketMessageToServer) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                ws.current.send(JSON.stringify(message));
                // console.log("WebSocket: Sent message:", message);
            } catch (error) {
                console.error("WebSocket: Error sending message:", error, "Message:", message);
                toast.error("Send Error", { description: "Failed to send message to server." });
            }
        } else {
            console.warn("WebSocket: Attempted to send message while not connected:", message);
            toast.warning("Cannot Send", { description: "Not connected to the real-time server."});
            // Optionally, queue message or trigger a reconnect attempt if appropriate
            if (!isConnected && !ws.current?.CONNECTING) connect();
        }
    }, []); // `connect` removed as explicit dependency for send, relies on OPEN state

    return { sendJsonMessage, lastJsonMessage, isConnected, connect }; // connect exposed for manual reconnect UI
};