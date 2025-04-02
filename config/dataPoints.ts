import { DivideIcon as LucideIcon, Battery, Zap, Activity, Gauge, AudioWaveform } from 'lucide-react';

export interface DataPoint {
  id: string;
  name: string;
  nodeId: string;
  dataType: 'Boolean' | 'Int16' | 'Float' | 'String';
  uiType: 'display' | 'button' | 'switch' | 'gauge';
  icon: typeof LucideIcon;
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category: 'battery' | 'grid' | 'inverter' | 'control';
}

export const dataPoints: DataPoint[] = [
  {
    id: 'work-mode',
    name: 'Work Mode',
    nodeId: 'ns=4;i=104',
    dataType: 'Boolean',
    uiType: 'switch',
    icon: Activity,
    category: 'control',
    description: 'System work mode control'
  },
  {
    id: 'frequency',
    name: 'Frequency',
    nodeId: 'ns=4;i=346',
    dataType: 'Float',
    uiType: 'display',
    icon: AudioWaveform,
    unit: ' Hz',
    min: 0,
    max: 100,
    category: 'battery',
    description: 'Current Frequency'
  },
  {
    id: 'fsdfdas',
    name: 'Fredsafdsfquency',
    nodeId: 'ns=4;i=346',
    dataType: 'Float',
    uiType: 'display',
    icon: AudioWaveform,
    unit: ' Hdsfdfz',
    min: 0,
    max: 100,
    category: 'battery',
    description: 'Current Frequency'
  },
  {
    id: 'battery-voltage',
    name: 'Battery Voltage',
    nodeId: 'ns=4;i=114',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: Battery,
    unit: 'V',
    min: 0,
    max: 100,
    category: 'battery',
    description: 'Current battery voltage'
  },
  {
    id: 'battery-capacity',
    name: 'Battery Capacity',
    nodeId: 'ns=4;i=115',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: Battery,
    unit: '%',
    min: 0,
    max: 100,
    category: 'battery',
    description: 'Current battery capacity'
  },
  {
    id: 'grid-power-a',
    name: 'Grid Power Phase A',
    nodeId: 'ns=4;i=145',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'W',
    category: 'grid',
    description: 'Grid side Phase A power'
  },
  {
    id: 'grid-power-b',
    name: 'Grid Power Phase B',
    nodeId: 'ns=4;i=146',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'W',
    category: 'grid',
    description: 'Grid side Phase B power'
  },
  {
    id: 'grid-power-c',
    name: 'Grid Power Phase C',
    nodeId: 'ns=4;i=147',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'W',
    category: 'grid',
    description: 'Grid side Phase C power'
  },
  {
    id: 'grid-voltage-a',
    name: 'Grid Voltage Phase A',
    nodeId: 'ns=4;i=121',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    category: 'grid',
    description: 'Grid Phase A voltage'
  },
  {
    id: 'grid-voltage-b',
    name: 'Grid Voltage Phase B',
    nodeId: 'ns=4;i=122',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    category: 'grid',
    description: 'Grid Phase B voltage'
  },
  {
    id: 'grid-voltage-c',
    name: 'Grid Voltage Phase C',
    nodeId: 'ns=4;i=123',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    category: 'grid',
    description: 'Grid Phase C voltage'
  },
  {
    id: 'inverter-frequency',
    name: 'Inverter Frequency',
    nodeId: 'ns=4;i=346',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: Gauge,
    unit: 'Hz',
    min: 45,
    max: 65,
    category: 'inverter',
    description: 'Inverter output frequency'
  }
];
export const nodeIds = dataPoints.map(dataPoint => dataPoint.nodeId);
