'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { dataPoints } from '@/config/dataPoints';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { WS_URL } from '@/config/constants';

// Define structure for the data received from the WebSocket
interface NodeData {
  [nodeId: string]: string | number | boolean | null | 'Error'; // Allow null for no value, 'Error' for read errors
}

const Dashboard = () => {
  const [nodeValues, setNodeValues] = useState<NodeData>({});
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);

  const { theme, setTheme } = useTheme(); // Added useTheme to switch theme

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
      ws.current = null;

      // Redirect to OPC UA API on first disconnection only
      if (typeof window !== 'undefined') {
        const alreadyRedirected = sessionStorage.getItem('opcuaRedirected');
        if (!alreadyRedirected) {
          const currentHost = window.location.hostname;
          const currentPort = window.location.port;
          window.location.href = `http://${currentHost}:${currentPort}/api/opcua`;
          sessionStorage.setItem('opcuaRedirected', 'true');
        }
      }

      if (!reconnectInterval.current) {
        reconnectInterval.current = setTimeout(() => {
          connectWebSocket();
        }, 5000); // Retry after 5 seconds
      }
    };
  }, []);


  // Function to send data to WebSocket
  const sendDataToWebSocket = (nodeId: string, value: boolean) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({ [nodeId]: value });
      ws.current.send(payload);
      console.log("Sent data to WebSocket:", payload);
    } else {
      console.error("WebSocket is not connected.");
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

  // Helper function to render node value based on its type
  const renderNodeValue = (nodeId: string, unit: string | undefined) => {
    const value = nodeValues[nodeId];
    if (value === null || value === 'Error') {
      return <span className="text-red-500">Error</span>;
    }
    if (value === undefined) {
      return <span className="text-gray-500">Connecting...</span>;
    }
    return (
      <span>
        {value} {unit}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">
            Solar Mini-Grid Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full animate-pulse scale-100 transition-transform duration-500 ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                WebSocket: {isConnected ? 'Online' : 'Offline'}
              </div>
              <Button
                variant="outline"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? '🌞' : '🌙'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dataPoints.map((point) => (
            <motion.div
              key={point.nodeId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <point.icon className="w-6 h-6 text-primary" />
                        <h3 className="text-lg font-semibold">{point.name}</h3>
                      </div>
                      {point.uiType === 'switch' ? (
                        <Switch
                          checked={typeof nodeValues[point.nodeId] === 'boolean' ? (nodeValues[point.nodeId] as boolean) : undefined}
                          onCheckedChange={(checked) => sendDataToWebSocket(point.nodeId, checked)}
                        />
                      ) : (
                        <div className="text-xl font-bold">
                          {renderNodeValue(point.nodeId, point.unit)}
                        </div>
                      )}
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{point.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;