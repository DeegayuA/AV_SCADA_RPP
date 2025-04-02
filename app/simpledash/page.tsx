'use client';
import React, { useEffect, useState, useRef, useCallback } from "react";
import { dataPoints } from '@/config/dataPoints';

// Define the structure for the data received from the WebSocket
interface NodeData {
  [nodeId: string]: string | number | boolean | null | 'Error'; // Allow null for no value, 'Error' for read errors
}

const WS_URL = `ws://${window.location.hostname}:8082`;
const Dashboard = () => {
  const [nodeValues, setNodeValues] = useState<NodeData>({});
  const [data, setData] = useState<{ [key: string]: any }>({}); // New state for WebSocket data
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);

  // Define the nodes this component cares about displaying
  const displayNodes = dataPoints.map(({ nodeId, name, unit }) => ({
    id: nodeId,
    name,
    unit
  }));

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
            const newData = JSON.parse(event.data);
            setData((prevData) => ({ ...prevData, ...newData }));
            setNodeValues(prevValues => ({ ...prevValues, ...newData }));
        } catch (error) {
            console.error("Failed to parse WebSocket message:", error, "Data:", event.data);
        }
    };

    ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    ws.current.onclose = (event) => {
        console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
        setIsConnected(false);
        ws.current = null; // Clear the WebSocket reference

        // Ensure we only set one reconnect attempt
        if (!reconnectInterval.current) {
            reconnectInterval.current = setTimeout(() => {
                connectWebSocket();
            }, 5000); // Retry connection after 5 seconds
        }
    };
}, []);

  useEffect(() => {
    // Ensure this runs only in the browser
    if (typeof window === 'undefined') return;

    connectWebSocket(); // Initial connection attempt

    // Cleanup function
    return () => {
      console.log("Closing WebSocket connection on component unmount.");
      if (reconnectInterval.current) {
        clearTimeout(reconnectInterval.current); // Use clearTimeout for setTimeout
      }
      ws.current?.close();
    };
}, [connectWebSocket]); // Re-run effect if connectWebSocket identity changes (it shouldn't with useCallback)

  const handleControl = useCallback(
    async (nodeId: string, value: boolean | number) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        toast({
          title: 'WebSocket Not Connected',
          description: 'Unable to send control command, WebSocket is not connected.',
          variant: 'destructive',
        });
        return;
      }

      // Create a command object that will be sent via WebSocket
      const command = {
        type: 'write', // specify the type of command
        nodeId,
        value,
      };

      console.log("Sending WebSocket command:", command);
      
      try {
        // Send the control command over WebSocket
        ws.current.send(JSON.stringify(command));

        // Show user feedback that the action is queued or successful
        toast({
          title: 'Control Action Sent',
          description: `The action for ${nodeId} is being processed.`,
        });

        // Optionally, update local UI state immediately for responsive feedback
        setNodeValues((prevValues) => ({
          ...prevValues,
          [nodeId]: value,
        }));
        
      } catch (error) {
        console.error("Error during control action:", error);
        toast({
          title: 'Error',
          description: 'Failed to send control action over WebSocket.',
          variant: 'destructive',
        });
      }
    },
    []
  );

  // Helper function to display node values
  const renderNodeValue = (nodeId: string, unit: string = '') => {
    const value = nodeValues[nodeId];
    if (value === undefined) return "Loading..."; // Initial state before first message
    if (value === null) return "N/A"; // Value explicitly null from server
    if (value === 'Error') return <span className="text-red-500">Error</span>;
    if (typeof value === 'boolean') return value ? "On" : "Off";
    if (typeof value === 'number') return `${value.toFixed(2)}${unit}`;
    return `${value}${unit}`; // Fallback for strings or other types
  };

  return (
    <div className="p-4">
      <h1>Solar Mini-Grid Dashboard (Simple)</h1>
      <p className="mb-4">
        WebSocket Status: {isConnected ?
          <span className="font-bold text-green-600">Connected</span> :
          <span className="font-bold text-red-600">Disconnected</span>
        }
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayNodes.map(node => (
          <div key={node.id} className="border p-4 rounded shadow">
            <h3 className="font-semibold mb-2">{node.name} ({node.id})</h3>
            {node.id === "ns=4;i=104" ? ( // Special handling for the switch
              <div className="flex items-center space-x-2">
                 <span>{renderNodeValue(node.id)}</span>
                 <button
                   onClick={() => handleControl(node.id, !nodeValues[node.id])}
                   disabled={!isConnected || nodeValues[node.id] === undefined || nodeValues[node.id] === 'Error' || nodeValues[node.id] === null}
                   className={`px-3 py-1 rounded text-white ${!isConnected || nodeValues[node.id] === undefined || nodeValues[node.id] === 'Error' || nodeValues[node.id] === null ? 'bg-gray-400 cursor-not-allowed' : (nodeValues[node.id] ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600')}`}
                 >
                   Toggle {nodeValues[node.id] ? "Off" : "On"}
                 </button>
              </div>
            ) : (
              <p className="text-xl">{renderNodeValue(node.id, node.unit)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
