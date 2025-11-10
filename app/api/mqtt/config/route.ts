// app/api/mqtt/config/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const mqttConfigPath = path.join(process.cwd(), 'config', 'mqtt.json');

async function readMqttConfig() {
  try {
    const data = await fs.readFile(mqttConfigPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading MQTT config:', error);
    return null;
  }
}

async function writeMqttConfig(config: any) {
  try {
    await fs.writeFile(mqttConfigPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing MQTT config:', error);
    return false;
  }
}

export async function GET() {
  const config = await readMqttConfig();
  if (config) {
    return NextResponse.json(config);
  }
  return new NextResponse('MQTT config not found', { status: 404 });
}

export async function POST(request: Request) {
  const newConfig = await request.json();
  const success = await writeMqttConfig(newConfig);
  if (success) {
    return NextResponse.json({ message: 'MQTT config saved successfully' });
  }
  return new NextResponse('Failed to save MQTT config', { status: 500 });
}
