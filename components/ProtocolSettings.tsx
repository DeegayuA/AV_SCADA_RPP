// components/ProtocolSettings.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProtocolSelection } from '@/hooks/useProtocolSelection';
import { useToast } from '@/hooks/use-toast';
import { Zap, Settings, Wifi, WifiOff, AlertCircle, CheckCircle, Activity } from 'lucide-react';

interface ProtocolSettingsProps {
  className?: string;
}

export function ProtocolSettings({ className }: ProtocolSettingsProps) {
  const { toast } = useToast();
  const {
    selectedProtocol,
    setSelectedProtocol,
    protocolConfig,
    updateProtocolConfig,
    isOpcuaSelected,
    isSnap7Selected
  } = useProtocolSelection();

  const [connectionStatus, setConnectionStatus] = useState<{
    opcua: 'disconnected' | 'connecting' | 'connected' | 'error';
    snap7: 'disconnected' | 'connecting' | 'connected' | 'error';
  }>({
    opcua: 'disconnected',
    snap7: 'disconnected'
  });

  const [isConnecting, setIsConnecting] = useState(false);

  // Connect to OPC UA
  const connectOpcua = async () => {
    setIsConnecting(true);
    setConnectionStatus(prev => ({ ...prev, opcua: 'connecting' }));

    try {
      const response = await fetch('/api/opcua', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          endpoint: protocolConfig.opcua.endpoint
        })
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus(prev => ({ ...prev, opcua: 'connected' }));
        toast({
          title: "OPC UA Connected",
          description: "Successfully connected to OPC UA server",
        });
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, opcua: 'error' }));
      toast({
        title: "OPC UA Connection Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Connect to Snap7
  const connectSnap7 = async () => {
    setIsConnecting(true);
    setConnectionStatus(prev => ({ ...prev, snap7: 'connecting' }));

    try {
      const response = await fetch('/api/snap7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          config: {
            plcIP: protocolConfig.snap7.plcIP,
            plcRack: protocolConfig.snap7.plcRack,
            plcSlot: protocolConfig.snap7.plcSlot
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus(prev => ({ ...prev, snap7: 'connected' }));
        toast({
          title: "Snap7 Connected",
          description: "Successfully connected to Siemens PLC",
        });
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, snap7: 'error' }));
      toast({
        title: "Snap7 Connection Failed",
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
        return <Activity className="h-4 w-4 text-yellow-500 animate-spin" />;
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
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Protocol Settings
          </CardTitle>
          <CardDescription>
            Configure and manage communication protocols for your SCADA system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Protocol Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="protocol-select">Communication Protocol</Label>
              <Select
                value={selectedProtocol}
                onValueChange={(value) => setSelectedProtocol(value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opcua">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      OPC UA
                    </div>
                  </SelectItem>
                  <SelectItem value="snap7">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Snap7 (Siemens S7)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Protocol Configuration Tabs */}
            <Tabs value={selectedProtocol} onValueChange={(value) => setSelectedProtocol(value as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="opcua" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  OPC UA
                  {getStatusBadge(connectionStatus.opcua)}
                </TabsTrigger>
                <TabsTrigger value="snap7" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Snap7
                  {getStatusBadge(connectionStatus.snap7)}
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
                      onChange={(e) => updateProtocolConfig('opcua', { endpoint: e.target.value })}
                      placeholder="opc.tcp://localhost:48010"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="opcua-websocket">WebSocket URL</Label>
                    <Input
                      id="opcua-websocket"
                      value={protocolConfig.opcua.websocketUrl}
                      onChange={(e) => updateProtocolConfig('opcua', { websocketUrl: e.target.value })}
                      placeholder="ws://localhost:2001"
                      className="mt-1"
                    />
                  </div>
                  
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      OPC UA is ideal for standardized industrial communication with built-in security and discovery features.
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
                        onClick={connectOpcua}
                        disabled={isConnecting}
                      >
                        <Wifi className="h-4 w-4 mr-2" />
                        {connectionStatus.opcua === 'connecting' ? 'Connecting...' : 'Connect'}
                      </Button>
                    )}
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
                        onChange={(e) => updateProtocolConfig('snap7', { plcIP: e.target.value })}
                        placeholder="192.168.1.100"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="snap7-websocket">WebSocket URL</Label>
                      <Input
                        id="snap7-websocket"
                        value={protocolConfig.snap7.websocketUrl}
                        onChange={(e) => updateProtocolConfig('snap7', { websocketUrl: e.target.value })}
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
                        onChange={(e) => updateProtocolConfig('snap7', { plcRack: parseInt(e.target.value) })}
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
                        onChange={(e) => updateProtocolConfig('snap7', { plcSlot: parseInt(e.target.value) })}
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
                      Snap7 provides direct communication with Siemens S7 PLCs. Ensure the PLC is configured to allow connections and the IP address is accessible.
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
                        onClick={connectSnap7}
                        disabled={isConnecting}
                      >
                        <Wifi className="h-4 w-4 mr-2" />
                        {connectionStatus.snap7 === 'connecting' ? 'Connecting...' : 'Connect'}
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
