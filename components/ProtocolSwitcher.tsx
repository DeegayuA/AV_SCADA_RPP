// components/ProtocolSwitcher.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Database
} from 'lucide-react';

interface ProtocolStatus {
  opcua: {
    connected: boolean;
    status: string;
    endpoint?: string;
    lastUpdate?: string;
  };
  snap7: {
    connected: boolean;
    status: string;
    demoMode?: boolean;
    plcIP?: string;
    lastUpdate?: string;
  };
}

interface ProtocolSwitcherProps {
  className?: string;
  showFullInterface?: boolean;
}

export function ProtocolSwitcher({ className, showFullInterface = true }: ProtocolSwitcherProps) {
  const { toast } = useToast();
  const [protocolStatus, setProtocolStatus] = useState<ProtocolStatus>({
    opcua: { connected: false, status: 'disconnected' },
    snap7: { connected: false, status: 'disconnected' }
  });
  const [activeProtocol, setActiveProtocol] = useState<'opcua' | 'snap7' | 'none'>('none');
  const [isLoading, setIsLoading] = useState(false);

  // Check status of both protocols
  const checkProtocolStatus = async () => {
    try {
      // Check OPC UA status
      const opcuaResponse = await fetch('/api/opcua?action=status');
      const opcuaResult = await opcuaResponse.json();
      
      // Check Snap7 status
      const snap7Response = await fetch('/api/snap7?action=status');
      const snap7Result = await snap7Response.json();

      setProtocolStatus({
        opcua: {
          connected: opcuaResult.status?.includes('Connected') || false,
          status: opcuaResult.status || 'disconnected',
          endpoint: opcuaResult.endpoint,
          lastUpdate: new Date().toISOString()
        },
        snap7: {
          connected: snap7Result.status?.connected || false,
          status: snap7Result.status?.connected ? 'connected' : 'disconnected',
          demoMode: snap7Result.status?.demoMode || false,
          plcIP: snap7Result.config?.plcIP,
          lastUpdate: new Date().toISOString()
        }
      });

      // Determine active protocol
      if (opcuaResult.status?.includes('Connected')) {
        setActiveProtocol('opcua');
      } else if (snap7Result.status?.connected) {
        setActiveProtocol('snap7');
      } else {
        setActiveProtocol('none');
      }

    } catch (error) {
      console.error('Error checking protocol status:', error);
    }
  };

  // Auto-refresh status every 5 seconds
  useEffect(() => {
    checkProtocolStatus();
    const interval = setInterval(checkProtocolStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Connect to OPC UA
  const connectOpcua = async () => {
    setIsLoading(true);
    try {
      // First disconnect Snap7 if connected
      if (protocolStatus.snap7.connected) {
        await fetch('/api/snap7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect' })
        });
      }

      // Connect to OPC UA with the offline endpoint
      const response = await fetch('/api/opcua', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'connect',
          endpoint: 'opc.tcp://192.168.1.2:4840'
        })
      });

      const result = await response.json();
      
      if (result.success || response.ok) {
        toast({
          title: "OPC UA Connected",
          description: "Successfully switched to OPC UA protocol",
        });
        setActiveProtocol('opcua');
      } else {
        throw new Error(result.error || 'Failed to connect to OPC UA');
      }
    } catch (error) {
      toast({
        title: "OPC UA Connection Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Refresh status after connection attempt
      setTimeout(checkProtocolStatus, 1000);
    }
  };

  // Connect to Snap7
  const connectSnap7 = async () => {
    setIsLoading(true);
    try {
      // First disconnect OPC UA if connected
      if (protocolStatus.opcua.connected) {
        await fetch('/api/opcua', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect' })
        });
      }

      // Connect to Snap7 (try real connection first, then demo)
      let response = await fetch('/api/snap7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'connect',
          config: {
            plcIP: '192.168.1.100',
            plcRack: 0,
            plcSlot: 2
          }
        })
      });

      let result = await response.json();
      
      if (!result.success) {
        // If real connection fails, try demo mode
        console.log('Real PLC connection failed, trying demo mode...');
        response = await fetch('/api/snap7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'connect-demo' })
        });
        result = await response.json();
      }
      
      if (result.success) {
        toast({
          title: "Snap7 Connected",
          description: result.status?.demoMode 
            ? "Successfully switched to Snap7 demo mode with simulated data"
            : "Successfully switched to Snap7 protocol",
        });
        setActiveProtocol('snap7');
      } else {
        throw new Error(result.error || 'Failed to connect to Snap7');
      }
    } catch (error) {
      toast({
        title: "Snap7 Connection Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Refresh status after connection attempt
      setTimeout(checkProtocolStatus, 1000);
    }
  };

  // Disconnect all protocols
  const disconnectAll = async () => {
    setIsLoading(true);
    try {
      const promises = [];
      
      if (protocolStatus.opcua.connected) {
        promises.push(
          fetch('/api/opcua', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'disconnect' })
          })
        );
      }
      
      if (protocolStatus.snap7.connected) {
        promises.push(
          fetch('/api/snap7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'disconnect' })
          })
        );
      }

      await Promise.all(promises);
      
      toast({
        title: "Protocols Disconnected",
        description: "All communication protocols have been disconnected",
      });
      
      setActiveProtocol('none');
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTimeout(checkProtocolStatus, 1000);
    }
  };

  const getStatusIcon = (connected: boolean, loading: boolean = false) => {
    if (loading) return <Clock className="h-4 w-4 animate-spin" />;
    return connected ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;
  };

  const getStatusColor = (connected: boolean) => {
    return connected ? 'text-green-600' : 'text-red-600';
  };

  // Compact view for embedding in headers
  if (!showFullInterface) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant={activeProtocol !== 'none' ? 'default' : 'outline'}>
          {activeProtocol === 'opcua' && <Zap className="h-3 w-3 mr-1" />}
          {activeProtocol === 'snap7' && <Activity className="h-3 w-3 mr-1" />}
          {activeProtocol === 'none' && <WifiOff className="h-3 w-3 mr-1" />}
          {activeProtocol === 'opcua' ? 'OPC UA' : 
           activeProtocol === 'snap7' ? (protocolStatus.snap7.demoMode ? 'Snap7 Demo' : 'Snap7') : 
           'Disconnected'}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={checkProtocolStatus}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Protocol Control Center
        </CardTitle>
        <CardDescription>
          Switch between OPC UA and Snap7 communication protocols
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="font-medium">OPC UA</span>
              <div className={`flex items-center gap-1 ${getStatusColor(protocolStatus.opcua.connected)}`}>
                {getStatusIcon(protocolStatus.opcua.connected, isLoading)}
                <span className="text-sm">{protocolStatus.opcua.status}</span>
              </div>
            </div>
            {protocolStatus.opcua.endpoint && (
              <p className="text-xs text-muted-foreground">
                Endpoint: {protocolStatus.opcua.endpoint}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="font-medium">Snap7</span>
              <div className={`flex items-center gap-1 ${getStatusColor(protocolStatus.snap7.connected)}`}>
                {getStatusIcon(protocolStatus.snap7.connected, isLoading)}
                <span className="text-sm">{protocolStatus.snap7.status}</span>
              </div>
              {protocolStatus.snap7.demoMode && (
                <Badge variant="secondary" className="text-xs">Demo</Badge>
              )}
            </div>
            {protocolStatus.snap7.plcIP && (
              <p className="text-xs text-muted-foreground">
                PLC: {protocolStatus.snap7.plcIP}
              </p>
            )}
          </div>
        </div>

        {/* Active Protocol Alert */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Active Protocol:</strong> {
              activeProtocol === 'opcua' ? 'OPC UA - Industrial standard protocol' :
              activeProtocol === 'snap7' ? `Snap7 - ${protocolStatus.snap7.demoMode ? 'Demo mode with simulated data' : 'Direct Siemens PLC communication'}` :
              'No active protocol - Please connect to start data monitoring'
            }
          </AlertDescription>
        </Alert>

        {/* Protocol Switch Buttons */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Quick Protocol Switch</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button
              onClick={connectOpcua}
              disabled={isLoading || protocolStatus.opcua.connected}
              variant={activeProtocol === 'opcua' ? 'default' : 'outline'}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              {protocolStatus.opcua.connected ? 'OPC UA Active' : 'Switch to OPC UA'}
            </Button>
            
            <Button
              onClick={connectSnap7}
              disabled={isLoading || protocolStatus.snap7.connected}
              variant={activeProtocol === 'snap7' ? 'default' : 'outline'}
              className="w-full"
            >
              <Activity className="h-4 w-4 mr-2" />
              {protocolStatus.snap7.connected ? 'Snap7 Active' : 'Switch to Snap7'}
            </Button>
            
            <Button
              onClick={disconnectAll}
              disabled={isLoading || activeProtocol === 'none'}
              variant="destructive"
              className="w-full"
            >
              <WifiOff className="h-4 w-4 mr-2" />
              Disconnect All
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={checkProtocolStatus}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          
          <div className="text-xs text-muted-foreground">
            Last update: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
