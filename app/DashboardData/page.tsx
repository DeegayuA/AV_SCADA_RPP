'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { useWebSocket } from '@/app/layout';

interface NodeData {
  [nodeId: string]: string | number | boolean | null | 'Error';
}

export default function DashboardData() {
  const socket = useWebSocket();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionStatus, setConnectionStatus] = useState('Online');
  const [data, setData] = useState<Record<string, any>>({});
  const [nodeValues, setNodeValues] = useState<NodeData>({});
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [wsConnectionStatus, setWsConnectionStatus] = useState('Offline');
  const [tcpConnectionStatus, setTcpConnectionStatus] = useState('Offline');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('Online');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleControl = useCallback(
    async (nodeId: string, value: boolean | number) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
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
        socket.send(JSON.stringify(command));

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
    [socket, setNodeValues, toast]
  );

  useEffect(() => {
    if (!socket) return;

    socket.onopen = () => {
      console.log("WebSocket Connected");
      setWsConnectionStatus("Online");
    };

    socket.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        setData((prevData) => ({
          ...prevData,
          ...parsedData, // Merge new WebSocket data into existing state
        }));

        // Update node values for rendering
        const nodeData: NodeData = parsedData;
        setNodeValues(prevValues => ({
          ...prevValues,
          ...nodeData,
        }));
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnectionStatus("Offline");
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setWsConnectionStatus("Offline");
    };
  }, [socket]);

  useEffect(() => {
    const checkTcpConnection = async () => {
      try {
        const response = await fetch('/api/opcua/status');
        const result = await response.json();
        setTcpConnectionStatus(result.connected ? 'Online' : 'Offline');
      } catch (error) {
        console.error("Error checking TCP connection:", error);
        setTcpConnectionStatus('Offline');
      }
    };

    const interval = setInterval(checkTcpConnection, 5000);
    checkTcpConnection();

    return () => clearInterval(interval);
  }, []);

  // Helper function to render node values similar to SimpleDash
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
                  wsConnectionStatus === 'Online' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                WebSocket: {wsConnectionStatus}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full animate-pulse scale-100 transition-transform duration-500 ${
                  tcpConnectionStatus === 'Online' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                PLC Connection: {tcpConnectionStatus}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? '🌞' : '🌙'}
            </Button>
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
                          checked={nodeValues[point.nodeId] || false}
                          onCheckedChange={(checked) =>
                            handleControl(point.nodeId, checked)
                          }
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
}