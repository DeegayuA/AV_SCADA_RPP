'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Power, Battery, Zap, AlertTriangle } from 'lucide-react';
import { OPCUAClient } from '@/lib/opcua-client';

// Initialize the client inside the component to ensure it only runs in the browser
export function DashboardPage() {
  const [client] = useState(() => new OPCUAClient());
  const [connected, setConnected] = useState(false);
  const [plcData, setPlcData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    };
  }, [client]);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">IoT Control Center</h1>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
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
            <div className="text-2xl font-bold">
              {plcData.WorkMode || 'N/A'}
            </div>
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
                onClick={() => client.writeValue('ns=4;i=1', true)}
                className="w-full"
                variant="outline"
              >
                Start System
              </Button>
              <Button 
                onClick={() => client.writeValue('ns=4;i=1', false)}
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