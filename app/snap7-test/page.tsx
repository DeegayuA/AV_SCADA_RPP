// app/snap7-test/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtocolSettings } from '@/components/ProtocolSettings';
import { useToast } from '@/hooks/use-toast';
import { Activity, Zap, Battery, Thermometer, Power, AlertTriangle } from 'lucide-react';

interface DataPointValue {
  value: any;
  timestamp: string;
  quality: 'good' | 'bad' | 'uncertain';
  error?: string;
}

export default function Snap7TestPage() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [dataPoints, setDataPoints] = useState<Record<string, DataPointValue>>({});
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Connect to WebSocket for real-time data
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const websocket = new WebSocket('ws://localhost:8080');
        
        websocket.onopen = () => {
          console.log('Connected to Snap7 WebSocket');
          setWs(websocket);
        };

        websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'data' && message.protocol === 'snap7') {
              setDataPoints(message.data);
            } else if (message.type === 'status' && message.protocol === 'snap7') {
              setConnectionStatus(message.data.connected ? 'connected' : 'disconnected');
              setIsConnected(message.data.connected);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        websocket.onclose = () => {
          console.log('Disconnected from Snap7 WebSocket');
          setWs(null);
          // Attempt to reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };

        websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        // Retry after 5 seconds
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Test connection to Snap7 API
  const testConnection = async () => {
    try {
      const response = await fetch('/api/snap7?action=status');
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Snap7 API Test",
          description: "API is responding correctly",
        });
        console.log('Snap7 Status:', result);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Snap7 API Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  // Write test value to PLC
  const writeTestValue = async (dataPointId: string, value: any) => {
    try {
      const response = await fetch('/api/snap7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write',
          dataPointId,
          value
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Write Successful",
          description: `Successfully wrote ${value} to ${dataPointId}`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Write Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const getDataIcon = (id: string) => {
    if (id.includes('voltage')) return <Zap className="h-4 w-4" />;
    if (id.includes('current')) return <Activity className="h-4 w-4" />;
    if (id.includes('power')) return <Power className="h-4 w-4" />;
    if (id.includes('battery')) return <Battery className="h-4 w-4" />;
    if (id.includes('temp')) return <Thermometer className="h-4 w-4" />;
    if (id.includes('emergency')) return <AlertTriangle className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const formatValue = (value: any, id: string) => {
    if (typeof value === 'boolean') {
      return value ? 'ON' : 'OFF';
    }
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  };

  const getUnit = (id: string) => {
    if (id.includes('voltage')) return 'V';
    if (id.includes('current')) return 'A';
    if (id.includes('power')) return 'kW';
    if (id.includes('frequency')) return 'Hz';
    if (id.includes('temp')) return '°C';
    if (id.includes('soc')) return '%';
    return '';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Snap7 Protocol Test</h1>
          <p className="text-muted-foreground">Test and monitor Siemens S7 PLC communication</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "outline"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Button onClick={testConnection}>Test API</Button>
        </div>
      </div>

      {/* Protocol Settings */}
      <ProtocolSettings />

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Current status of the Snap7 connection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{connectionStatus}</div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Object.keys(dataPoints).length}</div>
              <div className="text-sm text-muted-foreground">Data Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{ws ? 'Active' : 'Inactive'}</div>
              <div className="text-sm text-muted-foreground">WebSocket</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Object.values(dataPoints).filter(dp => dp.quality === 'good').length}
              </div>
              <div className="text-sm text-muted-foreground">Good Quality</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Points */}
      <Card>
        <CardHeader>
          <CardTitle>Live Data Points</CardTitle>
          <CardDescription>Real-time data from the Siemens PLC</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(dataPoints).length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No data points available. Make sure the PLC is connected and configured correctly.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(dataPoints).map(([id, data]) => (
                <Card key={id} className="relative">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {getDataIcon(id)}
                      {id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {formatValue(data.value, id)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {getUnit(id)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <Badge 
                          variant={data.quality === 'good' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {data.quality}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(data.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {data.error && (
                        <div className="text-xs text-red-500">{data.error}</div>
                      )}
                      
                      {/* Write controls for writable points */}
                      {(id === 'main_breaker') && (
                        <div className="pt-2 border-t">
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => writeTestValue(id, true)}
                            >
                              ON
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => writeTestValue(id, false)}
                            >
                              OFF
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
