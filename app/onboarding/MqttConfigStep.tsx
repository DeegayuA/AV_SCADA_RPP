// app/onboarding/MqttConfigStep.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MqttConfigStep({ onNext }: { onNext: () => void }) {
  const [config, setConfig] = useState({
    enabled: false,
    brokerUrl: '',
    port: 1883,
    username: '',
    password: '',
  });

  useEffect(() => {
    fetch('/api/mqtt/config')
      .then((res) => res.json())
      .then(setConfig);
  }, []);

  const handleSave = () => {
    fetch('/api/mqtt/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).then(() => {
      onNext();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>MQTT Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="brokerUrl">Broker URL</Label>
            <Input
              id="brokerUrl"
              value={config.brokerUrl}
              onChange={(e) => setConfig({ ...config, brokerUrl: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={handleSave} className="mt-4">
          Save and Continue
        </Button>
      </CardContent>
    </Card>
  );
}
