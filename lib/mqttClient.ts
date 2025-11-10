// lib/mqttClient.ts
import mqtt from 'mqtt';
import { promises as fs } from 'fs';
import path from 'path';

const mqttConfigPath = path.join(process.cwd(), 'config', 'mqtt.json');
const mqttDataPointsPath = path.join(process.cwd(), 'config', 'mqttDataPoints.json');

let client: mqtt.MqttClient | null = null;
let broadcast: (data: string) => void = () => {};

async function readMqttDataPoints() {
  try {
    const data = await fs.readFile(mqttDataPointsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading MQTT data points:', error);
    return null;
  }
}

async function readMqttConfig() {
  try {
    const data = await fs.readFile(mqttConfigPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading MQTT config:', error);
    return null;
  }
}

export function initializeMqttClient(broadcaster: (data: string) => void) {
  broadcast = broadcaster;
  connectMqtt();
}

async function connectMqtt() {
  const config = await readMqttConfig();
  if (!config || !config.enabled) {
    console.log('MQTT is disabled in the configuration.');
    return;
  }

  const options = {
    port: config.port,
    username: config.username,
    password: config.password,
  };

  client = mqtt.connect(config.brokerUrl, options);

  client.on('connect', async () => {
    console.log('Connected to MQTT broker');
    const dataPoints = await readMqttDataPoints();
    if (dataPoints) {
      dataPoints.forEach((point: { topic: string }) => {
        if (point.topic) {
          client?.subscribe(point.topic);
        }
      });
    }
  });

  client.on('message', async (topic, message) => {
    const dataPoints = await readMqttDataPoints();
    if (dataPoints) {
      const point = dataPoints.find((p: { topic: string }) => p.topic === topic);
      if (point) {
        let value: any = message.toString();
        if (point.dataType === 'Float' || point.dataType === 'Double') {
          value = parseFloat(value);
          if (point.factor) {
            value *= point.factor;
          }
          if (point.precision) {
            value = parseFloat(value.toFixed(point.precision));
          }
        }
        const data = {
          [point.id]: value,
        };
        broadcast(JSON.stringify({ type: 'opc-ua-data', payload: data }));
      }
    }
  });

  client.on('error', (error) => {
    console.error('MQTT client error:', error);
  });
}
