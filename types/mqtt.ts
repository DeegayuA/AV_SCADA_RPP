// types/mqtt.ts
import { DataPoint } from '@/config/dataPoints';

export interface MqttDataPoint extends Omit<DataPoint, 'nodeId'> {
  topic: string;
  // Additional MQTT-specific properties can be added here
}
