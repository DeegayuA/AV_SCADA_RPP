// config/snap7Config.ts
export interface Snap7Config {
  plcIP: string;
  plcRack: number;
  plcSlot: number;
  connectionType: 'PG' | 'OP' | 'S7_BASIC';
  timeout: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
}

export interface S7DataPoint {
  id: string;
  label: string;
  name: string;
  dbNumber: number;
  startByte: number;
  bitOffset?: number; // For boolean values
  dataType: 'BOOL' | 'BYTE' | 'WORD' | 'DWORD' | 'INT' | 'DINT' | 'REAL' | 'STRING';
  length?: number; // For STRING data type
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category?: string;
  factor?: number;
  precision?: number;
  isWritable?: boolean;
  uiType?: 'display' | 'button' | 'switch' | 'gauge' | 'input';
  icon?: string;
}

// Default Snap7 configuration
export const defaultSnap7Config: Snap7Config = {
  plcIP: "192.168.1.100", // Default PLC IP
  plcRack: 0,
  plcSlot: 2,
  connectionType: 'PG',
  timeout: 5000,
  reconnectDelay: 5000,
  maxReconnectAttempts: 10
};

// Sample S7 data points configuration
export const snap7DataPoints: S7DataPoint[] = [
  // Digital Inputs/Outputs
  {
    id: "plc_status",
    label: "PLC Status",
    name: "PLC Connection Status",
    dbNumber: 1,
    startByte: 0,
    bitOffset: 0,
    dataType: "BOOL",
    description: "PLC online status",
    category: "system",
    uiType: "display",
    icon: "Activity"
  },
  {
    id: "emergency_stop",
    label: "Emergency Stop",
    name: "Emergency Stop Status",
    dbNumber: 1,
    startByte: 0,
    bitOffset: 1,
    dataType: "BOOL",
    description: "Emergency stop button status",
    category: "safety",
    uiType: "display",
    icon: "AlertTriangle"
  },
  {
    id: "main_breaker",
    label: "Main Breaker",
    name: "Main Circuit Breaker",
    dbNumber: 1,
    startByte: 0,
    bitOffset: 2,
    dataType: "BOOL",
    description: "Main circuit breaker status",
    category: "electrical",
    uiType: "switch",
    isWritable: true,
    icon: "Power"
  },
  
  // Analog Values
  {
    id: "grid_voltage_l1",
    label: "Grid Voltage L1",
    name: "Grid Voltage Phase 1",
    dbNumber: 2,
    startByte: 0,
    dataType: "REAL",
    unit: "V",
    min: 0,
    max: 500,
    precision: 1,
    description: "Grid voltage for phase 1",
    category: "electrical",
    uiType: "gauge",
    icon: "Zap"
  },
  {
    id: "grid_voltage_l2",
    label: "Grid Voltage L2",
    name: "Grid Voltage Phase 2",
    dbNumber: 2,
    startByte: 4,
    dataType: "REAL",
    unit: "V",
    min: 0,
    max: 500,
    precision: 1,
    description: "Grid voltage for phase 2",
    category: "electrical",
    uiType: "gauge",
    icon: "Zap"
  },
  {
    id: "grid_voltage_l3",
    label: "Grid Voltage L3",
    name: "Grid Voltage Phase 3",
    dbNumber: 2,
    startByte: 8,
    dataType: "REAL",
    unit: "V",
    min: 0,
    max: 500,
    precision: 1,
    description: "Grid voltage for phase 3",
    category: "electrical",
    uiType: "gauge",
    icon: "Zap"
  },
  {
    id: "grid_current_l1",
    label: "Grid Current L1",
    name: "Grid Current Phase 1",
    dbNumber: 2,
    startByte: 12,
    dataType: "REAL",
    unit: "A",
    min: 0,
    max: 100,
    precision: 2,
    description: "Grid current for phase 1",
    category: "electrical",
    uiType: "gauge",
    icon: "Activity"
  },
  {
    id: "grid_current_l2",
    label: "Grid Current L2",
    name: "Grid Current Phase 2",
    dbNumber: 2,
    startByte: 16,
    dataType: "REAL",
    unit: "A",
    min: 0,
    max: 100,
    precision: 2,
    description: "Grid current for phase 2",
    category: "electrical",
    uiType: "gauge",
    icon: "Activity"
  },
  {
    id: "grid_current_l3",
    label: "Grid Current L3",
    name: "Grid Current Phase 3",
    dbNumber: 2,
    startByte: 20,
    dataType: "REAL",
    unit: "A",
    min: 0,
    max: 100,
    precision: 2,
    description: "Grid current for phase 3",
    category: "electrical",
    uiType: "gauge",
    icon: "Activity"
  },
  {
    id: "active_power_total",
    label: "Total Active Power",
    name: "Total Active Power",
    dbNumber: 2,
    startByte: 24,
    dataType: "REAL",
    unit: "kW",
    min: 0,
    max: 2000,
    precision: 1,
    description: "Total active power consumption",
    category: "power",
    uiType: "gauge",
    icon: "Power"
  },
  {
    id: "frequency",
    label: "Grid Frequency",
    name: "Grid Frequency",
    dbNumber: 2,
    startByte: 28,
    dataType: "REAL",
    unit: "Hz",
    min: 49,
    max: 51,
    precision: 2,
    description: "Grid frequency",
    category: "electrical",
    uiType: "gauge",
    icon: "Waves"
  },
  
  // Solar Panel Data
  {
    id: "solar_voltage",
    label: "Solar Voltage",
    name: "Solar Panel Voltage",
    dbNumber: 3,
    startByte: 0,
    dataType: "REAL",
    unit: "V",
    min: 0,
    max: 1000,
    precision: 1,
    description: "Solar panel DC voltage",
    category: "solar",
    uiType: "gauge",
    icon: "Lightbulb"
  },
  {
    id: "solar_current",
    label: "Solar Current",
    name: "Solar Panel Current",
    dbNumber: 3,
    startByte: 4,
    dataType: "REAL",
    unit: "A",
    min: 0,
    max: 50,
    precision: 2,
    description: "Solar panel DC current",
    category: "solar",
    uiType: "gauge",
    icon: "Activity"
  },
  {
    id: "solar_power",
    label: "Solar Power",
    name: "Solar Panel Power",
    dbNumber: 3,
    startByte: 8,
    dataType: "REAL",
    unit: "kW",
    min: 0,
    max: 2000,
    precision: 1,
    description: "Solar panel power output",
    category: "solar",
    uiType: "gauge",
    icon: "Power"
  },
  
  // Battery Data
  {
    id: "battery_voltage",
    label: "Battery Voltage",
    name: "Battery Bank Voltage",
    dbNumber: 4,
    startByte: 0,
    dataType: "REAL",
    unit: "V",
    min: 0,
    max: 100,
    precision: 1,
    description: "Battery bank voltage",
    category: "battery",
    uiType: "gauge",
    icon: "Battery"
  },
  {
    id: "battery_current",
    label: "Battery Current",
    name: "Battery Bank Current",
    dbNumber: 4,
    startByte: 4,
    dataType: "REAL",
    unit: "A",
    min: -100,
    max: 100,
    precision: 2,
    description: "Battery bank current (+ charging, - discharging)",
    category: "battery",
    uiType: "gauge",
    icon: "Activity"
  },
  {
    id: "battery_soc",
    label: "Battery SOC",
    name: "Battery State of Charge",
    dbNumber: 4,
    startByte: 8,
    dataType: "REAL",
    unit: "%",
    min: 0,
    max: 100,
    precision: 1,
    description: "Battery state of charge",
    category: "battery",
    uiType: "gauge",
    icon: "Percent"
  },
  
  // Temperature Sensors
  {
    id: "inverter_temp",
    label: "Inverter Temperature",
    name: "Inverter Temperature",
    dbNumber: 5,
    startByte: 0,
    dataType: "REAL",
    unit: "°C",
    min: 0,
    max: 100,
    precision: 1,
    description: "Inverter operating temperature",
    category: "temperature",
    uiType: "gauge",
    icon: "Thermometer"
  },
  {
    id: "ambient_temp",
    label: "Ambient Temperature",
    name: "Ambient Temperature",
    dbNumber: 5,
    startByte: 4,
    dataType: "REAL",
    unit: "°C",
    min: -20,
    max: 60,
    precision: 1,
    description: "Ambient temperature",
    category: "temperature",
    uiType: "gauge",
    icon: "Thermometer"
  }
];
