'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Power, Battery, Zap, AlertTriangle } from 'lucide-react';
import { OPCUAClient } from '@/lib/opcua-client';
import OPCUADataViewer from './data';
import WebSocketClient from './WebSocketClient';

// Initialize the client inside the component to ensure it only runs in the browser
export function DashboardPage() {
  const [client] = useState(() => new OPCUAClient());
  const [connected, setConnected] = useState(false); // PLC connection state
  const [plcData, setPlcData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [webSocketConnected, setWebSocketConnected] = useState(false); // WebSocket connection state
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Set up WebSocket connection
    const socket = new WebSocket('ws://localhost:8081/api/ws');
    socket.onopen = () => {
      console.log("WebSocket Connected");
      setWebSocketConnected(true);
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected");
      setWebSocketConnected(false);
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    setWs(socket);

    // OPC-UA client event handling
    client.on('connected', () => {
      setConnected(true);
      setError(null);
    });

    client.on('disconnected', () => {
      setConnected(false);
      setError('Connection lost. Attempting to reconnect...');
    });

    client.on('data', (data) => {
      setPlcData(data);
    });

    client.on('error', (err) => {
      setError(err.message);
    });

    client.connect();

    return () => {
      client.disconnect();
      socket.close(); // Close WebSocket on cleanup
    };
  }, [client]);

  const checkNetworkStatus = () => {
    if (navigator.onLine) {
      // If online, check if the WebSocket and PLC are both connected
      if (!webSocketConnected || !connected) {
        client.connect();
      }
    } else {
      setConnected(false);
      // setWebSocketConnected(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(checkNetworkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [webSocketConnected, connected]);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">IoT Control Center</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{connected ? 'PLC Connected' : 'PLC Disconnected'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${webSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{webSocketConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}</span>
          </div>
        </div>
      </div>

      <div>
        <h1>AI-Powered Mini Grid Dashboard</h1>
        <WebSocketClient/>
        <OPCUADataViewer />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plcData.WorkMode || 'N/A'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="h-5 w-5" />
              Battery Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Voltage:</span>
                <div className="text-2xl font-bold">{plcData.BatteryVoltage || 'N/A'} V</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Capacity:</span>
                <div className="text-2xl font-bold">{plcData.BatteryCapacity || 'N/A'}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Grid Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Total Power:</span>
                <div className="text-2xl font-bold">{plcData.TotalPower || 'N/A'} kW</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Frequency:</span>
                <div className="text-2xl font-bold">{plcData.GridFrequency || 'N/A'} Hz</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Control Panel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                onClick={() => ws?.send(JSON.stringify({ type: 'write', nodeId: 'ns=4;i=1', value: true }))}
                className="w-full"
                variant="outline"
              >
                Start System
              </Button>
              <Button
                onClick={() => ws?.send(JSON.stringify({ type: 'write', nodeId: 'ns=4;i=1', value: false }))}
                className="w-full"
                variant="outline"
              >
                Stop System
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
