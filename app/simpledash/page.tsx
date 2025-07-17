'use client';

import React, { useEffect, useState, useRef, useCallback } from "react";
import { dataPoints } from '@/config/dataPoints';
import { getWebSocketUrl } from "@/config/constants"; // Correctly import the async function

// Define structure for the data received from the WebSocket
interface NodeData {
  [nodeId: string]: string | number | boolean | null | 'Error';
}

const Dashboard = () => {
  const [nodeValues, setNodeValues] = useState<NodeData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [webSocketUrl, setWebSocketUrl] = useState<string>(''); // State to hold the fetched URL
  const ws = useRef<WebSocket | null>(null);
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);

  // Define the nodes this component cares about displaying
  const displayNodes = dataPoints.map(({ nodeId, name, unit }) => ({
    id: nodeId,
    name,
    unit
  }));

  // Effect to fetch the WebSocket URL once on component mount
  useEffect(() => {
    const fetchUrlAndSetState = async () => {
      try {
        const url = await getWebSocketUrl();
        setWebSocketUrl(url);
      } catch (error) {
        console.error("Could not fetch WebSocket URL:", error);
      }
    };
    fetchUrlAndSetState();
  }, []); // Empty dependency array ensures this runs only once

  // WebSocket connection handling, dependent on the webSocketUrl state
  const connectWebSocket = useCallback(() => {
    // Prevent connection attempt until the URL is fetched
    if (!webSocketUrl) {
      console.log("WebSocket URL not yet available, waiting...");
      return;
    }

    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      console.log("WebSocket already open or connecting.");
      return;
    }

    console.log(`Attempting to connect WebSocket to: ${webSocketUrl}`);
    ws.current = new WebSocket(webSocketUrl);

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

      // Attempt to reconnect only if closure was not intentional (code 1000)
      if (event.code !== 1000) {
        if (!reconnectInterval.current) {
          reconnectInterval.current = setTimeout(() => {
            connectWebSocket();
          }, 5000); // Retry after 5 seconds
        }
      }
    };
  }, [webSocketUrl]); // Re-create this function if webSocketUrl changes

  // Send data to WebSocket
  const sendDataToWebSocket = (nodeId: string, value: string | number) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Send data in the format the server expects: { "nodeId": value }
      const payload = { [nodeId]: value };
      ws.current.send(JSON.stringify(payload));
    } else {
      console.warn("Cannot send data, WebSocket is not connected.");
    }
  };

  // Effect to manage the WebSocket connection lifecycle
  useEffect(() => {
    // Only run this in the browser and after the URL has been fetched
    if (typeof window === 'undefined' || !webSocketUrl) {
      return;
    }

    connectWebSocket();

    // Cleanup function to run when the component unmounts or dependencies change
    return () => {
      if (reconnectInterval.current) {
        clearTimeout(reconnectInterval.current);
      }
      if (ws.current) {
        ws.current.onclose = null; // Prevent onclose from triggering reconnect logic on manual close
        ws.current.close(1000, "Component unmounting"); // Close WebSocket connection
        ws.current = null;
      }
    };
  }, [connectWebSocket, webSocketUrl]); // Rerun if connect function or URL changes

  const renderNodeValue = (nodeId: string, unit: string = '') => {
    const value = nodeValues[nodeId];
    if (value === undefined) return "Waiting...";
    if (value === null) return "N/A";
    if (value === 'Error') return <span className="text-red-500">Error</span>;
    if (typeof value === 'boolean') return value ? "On" : "Off";
    if (typeof value === 'number') return `${value.toFixed(2)}${unit}`;
    return `${value}${unit}`;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">RT Dashboard</h1>
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
            <h3 className="font-semibold mb-2">{node.name}</h3>
            <p className="text-gray-500 text-sm mb-2">{node.id}</p>
            <p className="text-xl font-mono">{renderNodeValue(node.id, node.unit)}</p>
            <button
              onClick={() => sendDataToWebSocket(node.id, Math.random() * 100)}
              className="mt-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              disabled={!isConnected}
            >
              Update Value
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;