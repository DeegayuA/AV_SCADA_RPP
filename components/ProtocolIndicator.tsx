// components/ProtocolIndicator.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Zap, Activity, WifiOff, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import Link from 'next/link';

interface ProtocolStatus {
  opcua: {
    connected: boolean;
    error?: string;
  };
  snap7: {
    connected: boolean;
    error?: string;
  };
}

export function ProtocolIndicator() {
  const [status, setStatus] = useState<ProtocolStatus>({
    opcua: { connected: false },
    snap7: { connected: false }
  });
  const [selectedProtocol, setSelectedProtocol] = useState<'opcua' | 'snap7'>('opcua');

  // Check protocol status
  const checkStatus = async () => {
    try {
      // Check OPC UA status
      const opcuaResponse = await fetch('/api/opcua?action=status');
      const opcuaResult = await opcuaResponse.json();
      
      // Check Snap7 status
      const snap7Response = await fetch('/api/snap7?action=status');
      const snap7Result = await snap7Response.json();

      setStatus({
        opcua: {
          connected: opcuaResult.success && opcuaResult.status?.connected,
          error: opcuaResult.error
        },
        snap7: {
          connected: snap7Result.success && snap7Result.status?.connected,
          error: snap7Result.error
        }
      });
    } catch (error) {
      console.error('Error checking protocol status:', error);
    }
  };

  // Load selected protocol from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ranna_2mw_selected_protocol');
    if (saved === 'snap7' || saved === 'opcua') {
      setSelectedProtocol(saved);
    }

    // Initial status check
    checkStatus();

    // Check status every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const getProtocolIcon = (protocol: 'opcua' | 'snap7') => {
    return protocol === 'opcua' ? Zap : Activity;
  };

  const getStatusIcon = (connected: boolean) => {
    if (connected) return CheckCircle;
    return WifiOff;
  };

  const getStatusColor = (connected: boolean) => {
    return connected ? 'text-green-500' : 'text-gray-500';
  };

  const activeProtocol = status.opcua.connected ? 'opcua' : status.snap7.connected ? 'snap7' : null;
  const ActiveIcon = activeProtocol ? getProtocolIcon(activeProtocol) : WifiOff;
  const StatusIcon = getStatusIcon(!!activeProtocol);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ActiveIcon className={`h-4 w-4 ${getStatusColor(!!activeProtocol)}`} />
          <StatusIcon className={`h-3 w-3 ${getStatusColor(!!activeProtocol)}`} />
          <span className="hidden sm:inline">
            {activeProtocol ? activeProtocol.toUpperCase() : 'Disconnected'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Protocol Status</h4>
                <Link href="/protocol-config">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    Configure
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-3">
                {/* OPC UA Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">OPC UA</span>
                  </div>
                  <Badge variant={status.opcua.connected ? "default" : "outline"}>
                    <CheckCircle className={`h-3 w-3 mr-1 ${status.opcua.connected ? 'text-green-500' : 'text-gray-500'}`} />
                    {status.opcua.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>

                {/* Snap7 Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Snap7</span>
                  </div>
                  <Badge variant={status.snap7.connected ? "default" : "outline"}>
                    <CheckCircle className={`h-3 w-3 mr-1 ${status.snap7.connected ? 'text-green-500' : 'text-gray-500'}`} />
                    {status.snap7.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>

              {/* Error Messages */}
              {(status.opcua.error || status.snap7.error) && (
                <div className="space-y-2">
                  {status.opcua.error && (
                    <div className="flex items-start gap-2 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>OPC UA: {status.opcua.error}</span>
                    </div>
                  )}
                  {status.snap7.error && (
                    <div className="flex items-start gap-2 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>Snap7: {status.snap7.error}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="flex gap-2">
                  <Link href="/protocol-config" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </Link>
                  <Link href="/snap7-test" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Test
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
