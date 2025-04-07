'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { dataPoints } from '@/config/dataPoints';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
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
import { WS_URL, OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from '@/config/constants'; 



const PlcConnectionStatus = ({ status }: { status: 'online' | 'offline' | 'disconnected' }) => {
  let statusText = '';
  let dotClass = '';
  let clickHandler = () => { }; // Default no-op
  const disconnectedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  switch (status) {
    case 'online':
      statusText = 'PLC: Connected (Online)';
      dotClass = 'bg-blue-700';
      break;
    case 'offline':
      statusText = 'PLC: Connected (Offline)';
      dotClass = 'bg-blue-300';
      break;
    case 'disconnected':
      statusText = 'PLC: Disconnected';
      dotClass = 'bg-gray-500';
      clickHandler = () => {
        if (typeof window !== 'undefined') {
          window.location.reload(); // Only reload on the client-side
        }
      };
      break;
  }

  return (
    <div className="plc-connection-status flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full ${dotClass} cursor-pointer animate-pulse scale-100 transition-transform duration-500`} onClick={clickHandler} />
      <span>{statusText}</span>
    </div>
  );
};

// Define structure for the data received from the WebSocket
interface NodeData {
  [nodeId: string]: string | number | boolean | null | 'Error'; // Allow null for no value, 'Error' for read errors
}

const Dashboard = () => {
  const [nodeValues, setNodeValues] = useState<NodeData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isPlcConnected, setIsPlcConnected] = useState<'online' | 'offline' | 'disconnected'>('disconnected');
  const [currentTime, setCurrentTime] = useState<string>('');
  const ws = useRef<WebSocket | null>(null);
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [delay, setDelay] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const date = new Date();
      setCurrentTime(date.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const date = new Date();
      setCurrentTime(date.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }));
  
      const currentDelay = Date.now() - lastUpdateTime; // Calculate delay on each tick
      setDelay(currentDelay); // Update delay state
  
      if (currentDelay > 10000) { // If delay exceeds 10 seconds
        if (typeof window !== 'undefined') {
          window.location.reload(); // Reload the page
        }
      }
    }, 1000);
  
    return () => clearInterval(interval);
  }, [lastUpdateTime]); 

  const checkPlcConnection = async () => {
    let currentEndpoint = OPC_UA_ENDPOINT_OFFLINE;
    let connectionStatus: 'online' | 'offline' | 'disconnected' = 'offline';
    try {
      const response = await fetch('/api/opcua/status');
      const data = await response.json();

      if (data.connected) {
        connectionStatus = currentEndpoint === OPC_UA_ENDPOINT_ONLINE ? "online" : "offline";
        setIsPlcConnected(connectionStatus);
      } else {
        currentEndpoint = OPC_UA_ENDPOINT_ONLINE;
        const responseOnline = await fetch('/api/opcua/status');
        const dataOnline = await responseOnline.json();
        if (dataOnline.connected) {
          connectionStatus = "online";
          setIsPlcConnected(connectionStatus);
        } else {
          connectionStatus = "offline";
          setIsPlcConnected(connectionStatus);
          toast.toast({
            title: 'Error',
            description: 'PLC is not connected. Please check the network.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      connectionStatus = "offline";
      setIsPlcConnected('disconnected');
      toast.toast({
        title: 'Error',
        description: 'Failed to check PLC connection. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    checkPlcConnection();
    const interval = setInterval(() => {
      checkPlcConnection();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

      // Fetch data immediately upon connection
      if (ws.current) {
        ws.current.send(JSON.stringify({ requestData: true }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        console.log("Received WebSocket Data:", parsedData);
        
        // Use functional state update to ensure immediate and efficient state change
        setNodeValues(prevValues => {
          // Return a new object with updated data points only
          return { ...prevValues, ...parsedData };
        });
        
        // Update last update time immediately
        setLastUpdateTime(Date.now()); 
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

      if (typeof window !== 'undefined') {
        const alreadyRedirected = sessionStorage.getItem('opcuaRedirected');
        if (!alreadyRedirected || alreadyRedirected === 'false') {
          const currentHost = window.location.hostname;
          const currentPort = window.location.port;
          window.location.href = `http://${currentHost}:${currentPort}/api/opcua`;
          sessionStorage.setItem('opcuaRedirected', 'true');
        }
      }

      if (!reconnectInterval.current) {
        reconnectInterval.current = setTimeout(() => {
          connectWebSocket();
        }, 1000); // Faster reconnect
      }
    };
    
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    connectWebSocket();

    return () => {
      if (reconnectInterval.current) {
        clearTimeout(reconnectInterval.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connectWebSocket]);

  const sendDataToWebSocket = (nodeId: string, value: boolean) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({ [nodeId]: value });
      ws.current.send(payload);
      console.log("Sent data to WebSocket:", payload);
    } else {
      console.error("WebSocket is not connected.");
    }
  };

  const renderNodeValue = (nodeId: string, unit: string | undefined) => {
    const value = nodeValues[nodeId];

    const dataPoint = dataPoints.find((point) => point.nodeId === nodeId);
    const factor = dataPoint?.factor || 1;
    const min = dataPoint?.min;
    const max = dataPoint?.max;

    const adjustedValue = value === null || value === 'Error' || typeof value !== 'number' ? 'Error' : parseFloat((value * factor).toFixed(2));

    if (adjustedValue === 'Error') {
      return <span className="text-red-500">Error</span>;
    }

    if (adjustedValue === undefined) {
      return <span className="text-gray-500">Connecting...</span>;
    }

    if ((min !== undefined && adjustedValue < min) || (max !== undefined && adjustedValue > max)) {
      toast.toast({
        title: 'Error',
        description: `Value for ${nodeId} is out of range!`,
        variant: 'destructive',
      });
    }

    return (
      <span>
        {adjustedValue} {unit}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-foreground">
            Solar Mini-Grid Dashboard
          </h1>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer">
                <PlcConnectionStatus status={isPlcConnected} />
              </div>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                if (typeof window !== 'undefined') {
                  const currentHost = window.location.hostname;
                  const currentPort = window.location.port;
                  window.location.href = `http://${currentHost}:${currentPort}/api/opcua`;
                }
              }}>
                <div className={`w-4 h-4 rounded-full animate-pulse scale-100 transition-transform duration-500 ${isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                WebSocket: {isConnected ? 'Connected' : 'Disconnected, Click here to reconnect'}
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
        <div className="text-xl text-foreground mb-4">
          {currentTime} (Delay: {delay} ms)
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