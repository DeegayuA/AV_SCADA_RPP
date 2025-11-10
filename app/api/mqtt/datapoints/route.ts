// app/api/mqtt/datapoints/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const mqttDataPointsPath = path.join(process.cwd(), 'config', 'mqttDataPoints.json');

async function readMqttDataPoints() {
  try {
    const data = await fs.readFile(mqttDataPointsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading MQTT data points:', error);
    return [];
  }
}

async function writeMqttDataPoints(dataPoints: any) {
  try {
    await fs.writeFile(mqttDataPointsPath, JSON.stringify(dataPoints, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing MQTT data points:', error);
    return false;
  }
}

export async function GET() {
  const dataPoints = await readMqttDataPoints();
  return NextResponse.json(dataPoints);
}

export async function POST(request: Request) {
  const newDataPoints = await request.json();
  const success = await writeMqttDataPoints(newDataPoints);
  if (success) {
    return NextResponse.json({ message: 'MQTT data points saved successfully' });
  }
  return new NextResponse('Failed to save MQTT data points', { status: 500 });
}
