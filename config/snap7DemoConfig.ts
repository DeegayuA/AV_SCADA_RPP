// config/snap7DemoConfig.ts
// Demo configuration for Snap7 without requiring real PLC connection

export interface DemoDataPoint {
  id: string;
  initialValue: any;
  valueGenerator: () => any;
  dataType: string;
}

export const demoDataPoints: DemoDataPoint[] = [
  {
    id: "plc_status",
    initialValue: true,
    valueGenerator: () => true,
    dataType: "BOOL"
  },
  {
    id: "emergency_stop", 
    initialValue: false,
    valueGenerator: () => Math.random() > 0.99, // Occasional emergency stop simulation
    dataType: "BOOL"
  },
  {
    id: "main_breaker",
    initialValue: true,
    valueGenerator: () => true, // Can be controlled via write operations
    dataType: "BOOL"
  },
  {
    id: "grid_voltage_l1",
    initialValue: 230.0,
    valueGenerator: () => 230 + (Math.random() - 0.5) * 20, // 220-240V range
    dataType: "REAL"
  },
  {
    id: "grid_voltage_l2",
    initialValue: 231.0,
    valueGenerator: () => 231 + (Math.random() - 0.5) * 20,
    dataType: "REAL"
  },
  {
    id: "grid_voltage_l3",
    initialValue: 229.0,
    valueGenerator: () => 229 + (Math.random() - 0.5) * 20,
    dataType: "REAL"
  },
  {
    id: "grid_current_l1",
    initialValue: 15.5,
    valueGenerator: () => 15.5 + (Math.random() - 0.5) * 10,
    dataType: "REAL"
  },
  {
    id: "grid_current_l2",
    initialValue: 16.2,
    valueGenerator: () => 16.2 + (Math.random() - 0.5) * 10,
    dataType: "REAL"
  },
  {
    id: "grid_current_l3",
    initialValue: 15.8,
    valueGenerator: () => 15.8 + (Math.random() - 0.5) * 10,
    dataType: "REAL"
  },
  {
    id: "active_power_total",
    initialValue: 11.2,
    valueGenerator: () => 8 + Math.random() * 8, // 8-16 kW
    dataType: "REAL"
  },
  {
    id: "frequency",
    initialValue: 50.0,
    valueGenerator: () => 49.8 + Math.random() * 0.4, // 49.8-50.2 Hz
    dataType: "REAL"
  },
  {
    id: "solar_voltage",
    initialValue: 450.0,
    valueGenerator: () => {
      const hour = new Date().getHours();
      const isDaytime = hour >= 6 && hour <= 18;
      return isDaytime ? 400 + Math.random() * 100 : 50 + Math.random() * 100;
    },
    dataType: "REAL"
  },
  {
    id: "solar_current",
    initialValue: 25.0,
    valueGenerator: () => {
      const hour = new Date().getHours();
      const isDaytime = hour >= 6 && hour <= 18;
      return isDaytime ? 20 + Math.random() * 15 : 0 + Math.random() * 2;
    },
    dataType: "REAL"
  },
  {
    id: "solar_power",
    initialValue: 11.25,
    valueGenerator: () => {
      const hour = new Date().getHours();
      const isDaytime = hour >= 6 && hour <= 18;
      if (isDaytime) {
        // Simulate solar curve - peak at noon
        const noonFactor = 1 - Math.abs(12 - hour) / 6;
        return 5 + noonFactor * 10 + Math.random() * 2;
      }
      return Math.random() * 0.5; // Very low at night
    },
    dataType: "REAL"
  },
  {
    id: "battery_voltage",
    initialValue: 48.5,
    valueGenerator: () => 46 + Math.random() * 6, // 46-52V range
    dataType: "REAL"
  },
  {
    id: "battery_current",
    initialValue: -5.5,
    valueGenerator: () => {
      const hour = new Date().getHours();
      const isDaytime = hour >= 6 && hour <= 18;
      // Charging during day, discharging at night
      return isDaytime ? -(2 + Math.random() * 8) : 3 + Math.random() * 7;
    },
    dataType: "REAL"
  },
  {
    id: "battery_soc",
    initialValue: 85.5,
    valueGenerator: () => {
      // Slowly varying SOC
      const time = Date.now() / 1000;
      return 70 + 20 * Math.sin(time / 3600) + Math.random() * 5;
    },
    dataType: "REAL"
  },
  {
    id: "inverter_temp",
    initialValue: 45.5,
    valueGenerator: () => 35 + Math.random() * 20, // 35-55°C
    dataType: "REAL"
  },
  {
    id: "ambient_temp",
    initialValue: 28.5,
    valueGenerator: () => {
      const hour = new Date().getHours();
      // Temperature curve throughout the day
      const tempCurve = 20 + 10 * Math.sin((hour - 6) * Math.PI / 12);
      return tempCurve + (Math.random() - 0.5) * 4;
    },
    dataType: "REAL"
  }
];

// Demo mode state management
export class Snap7DemoMode {
  private demoData: Record<string, any> = {};
  private intervalId: NodeJS.Timeout | null = null;
  private writeableValues: Record<string, any> = {};

  constructor() {
    // Initialize with starting values
    demoDataPoints.forEach(point => {
      this.demoData[point.id] = point.initialValue;
    });
  }

  start(): void {
    if (this.intervalId) return; // Already running

    console.log('🎭 Starting Snap7 Demo Mode');
    
    this.intervalId = setInterval(() => {
      demoDataPoints.forEach(point => {
        // Check if value was manually written
        if (this.writeableValues[point.id] !== undefined) {
          this.demoData[point.id] = this.writeableValues[point.id];
          // Reset writable value after one cycle
          delete this.writeableValues[point.id];
        } else {
          // Generate new value
          this.demoData[point.id] = point.valueGenerator();
        }
      });
    }, 2000); // Update every 2 seconds
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Snap7 Demo Mode stopped');
    }
  }

  getData(): Record<string, any> {
    return { ...this.demoData };
  }

  writeValue(pointId: string, value: any): boolean {
    const point = demoDataPoints.find(p => p.id === pointId);
    if (!point) return false;

    this.writeableValues[pointId] = value;
    console.log(`✏️  Demo mode: Wrote ${value} to ${pointId}`);
    return true;
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

// Global demo mode instance
export const snap7DemoMode = new Snap7DemoMode();
