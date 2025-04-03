'use client';
import React, { useEffect, useState, useRef, useCallback } from "react";
import { dataPoints } from '@/config/dataPoints';
import { WS_URL } from "@/config/constants";

// Define structure for the data received from the WebSocket
interface NodeData {
  [nodeId: string]: string | number | boolean | null | 'Error'; // Allow null for no value, 'Error' for read errors
}

const Dashboard = () => {
  const [nodeValues, setNodeValues] = useState<NodeData>({});
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);

  // Define the nodes this component cares about displaying
  const displayNodes = dataPoints.map(({ nodeId, name, unit }) => ({
    id: nodeId,
    name,
    unit
  }));

  // WebSocket connection handling
  const connectWebSocket = useCallback(() => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      console.log("WebSocket already open or connecting.");
      return;
    }

    console.log(`Attempting to connect WebSocket to: ${WS_URL}`);
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      if (reconnectInterval.current) {
        clearTimeout(reconnectInterval.current);
        reconnectInterval.current = null;
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        console.log("Received WebSocket Data:", parsedData); 

        // Update nodeValues state correctly
        setNodeValues((prevValues) => ({
          ...prevValues,
          ...parsedData,
        }));

        // Update the main data state
        setData((prevData) => ({
          ...prevData,
          ...parsedData,
        }));
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.current.onclose = (event) => {
      console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
      setIsConnected(false);
      ws.current = null; // Clear WebSocket reference

      // Ensure reconnection
      if (!reconnectInterval.current) {
        reconnectInterval.current = setTimeout(() => {
          connectWebSocket();
        }, 5000); // Retry after 5 seconds
      }
    };
  }, []);

  // Send data to WebSocket
  const sendDataToWebSocket = (nodeId: string, value: string | number) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const data = { nodeId, value };
      ws.current.send(JSON.stringify(data)); // Send data to server
    }
  };

  // Ensure WebSocket connects only once and reconnects if needed
  useEffect(() => {
    if (typeof window === 'undefined') return; // Ensure this runs only in the browser

    connectWebSocket(); // Attempt connection

    // Cleanup WebSocket on unmount
    return () => {
      if (reconnectInterval.current) {
        clearTimeout(reconnectInterval.current); // Cleanup reconnect timeout
      }
      if (ws.current) {
        ws.current.close(); // Close WebSocket connection
      }
    };
  }, [connectWebSocket]);

  const renderNodeValue = (nodeId: string, unit: string = '') => {
    const value = nodeValues[nodeId];
    if (value === undefined) return "Waiting...";
    if (value === null) return "N/A";
    if (value === 'Error') return <span className="text-red-500">Error</span>;
    if (typeof value === 'boolean') return value ? "On" : "Off";
    if (typeof value === 'number') return `${value}${unit}`;
    return `${value}${unit}`;
  };

  return (
    <div className="p-4">
      <h1>Solar Mini-Grid Dashboard</h1>
      <p className="mb-4">
        WebSocket Status: {isConnected ? (
          <span className="font-bold text-green-600">Connected</span>
        ) : (
          <span className="font-bold text-red-600">Disconnected</span>
        )}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayNodes.map(node => (
          <div key={node.id} className="border p-4 rounded shadow">
            <h3 className="font-semibold mb-2">{node.name} ({node.id})</h3>
            <p className="text-xl">{renderNodeValue(node.id, node.unit)}</p>
            <button onClick={() => sendDataToWebSocket(node.id, Math.random() * 100)} className="mt-2 bg-blue-500 text-white p-2 rounded">
              Update Value
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
