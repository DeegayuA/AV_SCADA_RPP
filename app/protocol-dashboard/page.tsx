// app/protocol-dashboard/page.tsx
"use client";

import React from 'react';
import { ProtocolSwitcher } from '@/components/ProtocolSwitcher';
import { ProtocolSettings } from '@/components/ProtocolSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Info, 
  ExternalLink, 
  Settings, 
  Zap, 
  Activity,
  Network,
  Database,
  Monitor
} from 'lucide-react';
import Link from 'next/link';

export default function ProtocolDashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Protocol Dashboard</h1>
          <p className="text-muted-foreground">
            Manage communication protocols and monitor connections
          </p>
        </div>
        <Link href="/control">
          <Button variant="outline">
            <Monitor className="h-4 w-4 mr-2" />
            Go to Control Panel
          </Button>
        </Link>
      </div>

      {/* Protocol Switcher */}
      <ProtocolSwitcher />

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              OPC UA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Industrial standard protocol with built-in security
              </p>
              <div className="flex gap-1">
                <Link href="/protocol-config">
                  <Button size="sm" variant="outline" className="text-xs">
                    Configure
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="sm" variant="outline" className="text-xs">
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Snap7
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Direct Siemens S7 PLC communication
              </p>
              <div className="flex gap-1">
                <Link href="/protocol-config">
                  <Button size="sm" variant="outline" className="text-xs">
                    Configure
                  </Button>
                </Link>
                <Link href="/snap7-test">
                  <Button size="sm" variant="outline" className="text-xs">
                    Test Page
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Monitor network connectivity and health
              </p>
              <Link href="/system/api-monitoring">
                <Button size="sm" variant="outline" className="text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Monitor
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Configure and manage data point mappings
              </p>
              <Link href="/protocol-config">
                <Button size="sm" variant="outline" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Manage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              OPC UA Protocol
            </CardTitle>
            <CardDescription>
              Open Platform Communications Unified Architecture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Built-in security and encryption</li>
                <li>• Platform independent</li>
                <li>• Service-oriented architecture</li>
                <li>• Automatic device discovery</li>
                <li>• Historical data access</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Current Configuration:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Offline Endpoint:</span>
                  <Badge variant="outline" className="ml-1 text-xs">
                    192.168.1.2:4840
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Online Endpoint:</span>
                  <Badge variant="outline" className="ml-1 text-xs">
                    100.91.178.74:4840
                  </Badge>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                OPC UA will automatically try the offline endpoint first, then fall back to the online endpoint if connection fails.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Snap7 Protocol
            </CardTitle>
            <CardDescription>
              Direct Siemens S7 PLC Communication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Direct PLC communication</li>
                <li>• Fast data exchange</li>
                <li>• Multiple data types support</li>
                <li>• Read/write data blocks</li>
                <li>• Demo mode for testing</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Supported Data Types:</h4>
              <div className="flex flex-wrap gap-1">
                {['BOOL', 'BYTE', 'WORD', 'DWORD', 'INT', 'DINT', 'REAL', 'STRING'].map(type => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                If no real PLC is available, Snap7 will automatically start in demo mode with simulated data.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Protocol Configuration */}
      <ProtocolSettings />
    </div>
  );
}
