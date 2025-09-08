// app/protocol-config/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Activity, 
  Settings, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Power,
  Network
} from 'lucide-react';

interface ConnectionStatus {
  opcua: 'disconnected' | 'connecting' | 'connected' | 'error';
  snap7: 'disconnected' | 'connecting' | 'connected' | 'error';
}

interface ProtocolConfig {
  opcua: {
    endpoint: string;
    websocketUrl: string;
  };
  snap7: {
    plcIP: string;
    plcRack: number;
    plcSlot: number;
    websocketUrl: string;
  };
}

export default function ProtocolConfigPage() {
  const { toast } = useToast();
  const [selectedProtocol, setSelectedProtocol] = useState<'opcua' | 'snap7'>('opcua');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    opcua: 'disconnected',
    snap7: 'disconnected'
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [protocolConfig, setProtocolConfig] = useState<ProtocolConfig>({
    opcua: {
      endpoint: 'opc.tcp://100.91.178.74:4840',
      websocketUrl: 'ws://localhost:2001'
    },
    snap7: {
      plcIP: '192.168.1.100',
      plcRack: 0,
      plcSlot: 2,
      websocketUrl: 'ws://localhost:8080'
    }
  });

  // Load saved configuration
  useEffect(() => {
    const savedProtocol = localStorage.getItem('ranna_2mw_selected_protocol');
    if (savedProtocol === 'snap7' || savedProtocol === 'opcua') {
      setSelectedProtocol(savedProtocol);
    }

    const savedOpcuaConfig = localStorage.getItem('ranna_2mw_opcua_config');
    if (savedOpcuaConfig) {
      try {
        const config = JSON.parse(savedOpcuaConfig);
        setProtocolConfig(prev => ({ ...prev, opcua: { ...prev.opcua, ...config } }));
      } catch (error) {
        console.warn('Failed to parse saved OPC UA config');
      }
    }

    const savedSnap7Config = localStorage.getItem('ranna_2mw_snap7_config');
    if (savedSnap7Config) {
      try {
        const config = JSON.parse(savedSnap7Config);
        setProtocolConfig(prev => ({ ...prev, snap7: { ...prev.snap7, ...config } }));
      } catch (error) {
        console.warn('Failed to parse saved Snap7 config');
      }
    }
  }, []);

  // Save configuration
  const saveConfig = (protocol: 'opcua' | 'snap7', config: any) => {
    localStorage.setItem('ranna_2mw_selected_protocol', protocol);
    localStorage.setItem(`ranna_2mw_${protocol}_config`, JSON.stringify(config));
    setProtocolConfig(prev => ({ ...prev, [protocol]: { ...prev[protocol], ...config } }));
  };

  // Check status
  const checkStatus = async (protocol: 'opcua' | 'snap7') => {
    try {
      const response = await fetch(`/api/${protocol}?action=status`);
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus(prev => ({
          ...prev,
          [protocol]: result.status?.connected ? 'connected' : 'disconnected'
        }));
      }
    } catch (error) {
      console.error(`Error checking ${protocol} status:`, error);
    }
  };

  // Connect to protocol
  const connect = async (protocol: 'opcua' | 'snap7') => {
    setIsConnecting(true);
    setConnectionStatus(prev => ({ ...prev, [protocol]: 'connecting' }));

    try {
      const config = protocol === 'opcua' 
        ? { endpoint: protocolConfig.opcua.endpoint }
        : {
            plcIP: protocolConfig.snap7.plcIP,
            plcRack: protocolConfig.snap7.plcRack,
            plcSlot: protocolConfig.snap7.plcSlot
          };

      const response = await fetch(`/api/${protocol}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          config
        })
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus(prev => ({ ...prev, [protocol]: 'connected' }));
        toast({
          title: `${protocol.toUpperCase()} Connected`,
          description: `Successfully connected to ${protocol.toUpperCase()}`,
        });
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [protocol]: 'error' }));
      toast({
        title: `${protocol.toUpperCase()} Connection Failed`,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from protocol
  const disconnect = async (protocol: 'opcua' | 'snap7') => {
    setIsConnecting(true);
    setConnectionStatus(prev => ({ ...prev, [protocol]: 'connecting' }));

    try {
      const response = await fetch(`/api/${protocol}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus(prev => ({ ...prev, [protocol]: 'disconnected' }));
        toast({
          title: `${protocol.toUpperCase()} Disconnected`,
          description: `Successfully disconnected from ${protocol.toUpperCase()}`,
        });
      } else {
        throw new Error(result.error || 'Disconnection failed');
      }
    } catch (error) {
      toast({
        title: `${protocol.toUpperCase()} Disconnection Failed`,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'default',
      connecting: 'secondary',
      error: 'destructive',
      disconnected: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Protocol Configuration</h1>
          <p className="text-muted-foreground">Configure and manage communication protocols</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              checkStatus('opcua');
              checkStatus('snap7');
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Current Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Connection Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <span className="font-medium">OPC UA</span>
              </div>
              {getStatusBadge(connectionStatus.opcua)}
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <span className="font-medium">Snap7</span>
              </div>
              {getStatusBadge(connectionStatus.snap7)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Protocol Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Protocol Configuration
          </CardTitle>
          <CardDescription>
            Configure connection parameters for each protocol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedProtocol} onValueChange={(value) => setSelectedProtocol(value as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="opcua" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                OPC UA
              </TabsTrigger>
              <TabsTrigger value="snap7" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Snap7
              </TabsTrigger>
            </TabsList>

            {/* OPC UA Configuration */}
            <TabsContent value="opcua" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="opcua-endpoint">OPC UA Endpoint</Label>
                  <Input
                    id="opcua-endpoint"
                    value={protocolConfig.opcua.endpoint}
                    onChange={(e) => {
                      const newConfig = { ...protocolConfig.opcua, endpoint: e.target.value };
                      saveConfig('opcua', newConfig);
                    }}
                    placeholder="opc.tcp://localhost:48010"
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Current: {protocolConfig.opcua.endpoint}
                  </p>
                </div>
                <div>
                  <Label htmlFor="opcua-websocket">WebSocket URL</Label>
                  <Input
                    id="opcua-websocket"
                    value={protocolConfig.opcua.websocketUrl}
                    onChange={(e) => {
                      const newConfig = { ...protocolConfig.opcua, websocketUrl: e.target.value };
                      saveConfig('opcua', newConfig);
                    }}
                    placeholder="ws://localhost:2001"
                    className="mt-1"
                  />
                </div>
                
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    OPC UA provides standardized industrial communication with built-in security.
                    Make sure the OPC UA server is running and accessible.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  {connectionStatus.opcua === 'connected' ? (
                    <Button
                      onClick={() => disconnect('opcua')}
                      variant="outline"
                      disabled={isConnecting}
                    >
                      <WifiOff className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      onClick={() => connect('opcua')}
                      disabled={isConnecting}
                    >
                      <Wifi className="h-4 w-4 mr-2" />
                      {connectionStatus.opcua === 'connecting' ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => checkStatus('opcua')}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Status
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Snap7 Configuration */}
            <TabsContent value="snap7" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="snap7-ip">PLC IP Address</Label>
                    <Input
                      id="snap7-ip"
                      value={protocolConfig.snap7.plcIP}
                      onChange={(e) => {
                        const newConfig = { ...protocolConfig.snap7, plcIP: e.target.value };
                        saveConfig('snap7', newConfig);
                      }}
                      placeholder="192.168.1.100"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="snap7-websocket">WebSocket URL</Label>
                    <Input
                      id="snap7-websocket"
                      value={protocolConfig.snap7.websocketUrl}
                      onChange={(e) => {
                        const newConfig = { ...protocolConfig.snap7, websocketUrl: e.target.value };
                        saveConfig('snap7', newConfig);
                      }}
                      placeholder="ws://localhost:8080"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="snap7-rack">Rack Number</Label>
                    <Input
                      id="snap7-rack"
                      type="number"
                      value={protocolConfig.snap7.plcRack}
                      onChange={(e) => {
                        const newConfig = { ...protocolConfig.snap7, plcRack: parseInt(e.target.value) || 0 };
                        saveConfig('snap7', newConfig);
                      }}
                      placeholder="0"
                      className="mt-1"
                      min="0"
                      max="7"
                    />
                  </div>
                  <div>
                    <Label htmlFor="snap7-slot">Slot Number</Label>
                    <Input
                      id="snap7-slot"
                      type="number"
                      value={protocolConfig.snap7.plcSlot}
                      onChange={(e) => {
                        const newConfig = { ...protocolConfig.snap7, plcSlot: parseInt(e.target.value) || 2 };
                        saveConfig('snap7', newConfig);
                      }}
                      placeholder="2"
                      className="mt-1"
                      min="0"
                      max="31"
                    />
                  </div>
                </div>

                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    Snap7 provides direct communication with Siemens S7 PLCs. 
                    Ensure the PLC is configured to allow connections and is accessible on the network.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  {connectionStatus.snap7 === 'connected' ? (
                    <Button
                      onClick={() => disconnect('snap7')}
                      variant="outline"
                      disabled={isConnecting}
                    >
                      <WifiOff className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      onClick={() => connect('snap7')}
                      disabled={isConnecting}
                    >
                      <Wifi className="h-4 w-4 mr-2" />
                      {connectionStatus.snap7 === 'connecting' ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => checkStatus('snap7')}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Status
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => {
                disconnect('opcua');
                connect('snap7');
              }}
              disabled={isConnecting}
              className="h-16"
            >
              <div className="text-center">
                <Activity className="h-6 w-6 mx-auto mb-1" />
                <div>Switch to Snap7</div>
                <div className="text-xs text-muted-foreground">Disconnect OPC UA, Connect Snap7</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                disconnect('snap7');
                connect('opcua');
              }}
              disabled={isConnecting}
              className="h-16"
            >
              <div className="text-center">
                <Zap className="h-6 w-6 mx-auto mb-1" />
                <div>Switch to OPC UA</div>
                <div className="text-xs text-muted-foreground">Disconnect Snap7, Connect OPC UA</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
