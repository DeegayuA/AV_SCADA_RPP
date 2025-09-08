// app/api/snap7/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';
import { defaultSnap7Config, snap7DataPoints, Snap7Config, S7DataPoint } from '@/config/snap7Config';
import { snap7DemoMode } from '@/config/snap7DemoConfig';

// Note: You'll need to install node-snap7 package
// npm install node-snap7
// For TypeScript support, you might need to create type definitions
let snap7: any;
try {
  snap7 = require('node-snap7');
} catch (error) {
  console.warn('node-snap7 not available. Please install: npm install node-snap7');
}

const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8080;
const POLLING_INTERVAL = 2000; // 2 seconds
const RECONNECT_DELAY = 5000;
const MAX_CONNECTION_ATTEMPTS = Infinity;

let s7Client: any = null;
let isConnecting = false;
let isDisconnecting = false;
let connectionAttempts = 0;
let dataInterval: NodeJS.Timeout | null = null;
let wsServer: WebSocketServer | null = null;
let isDemoMode = false;

const connectedClients = new Set<WebSocket>();
const dataCache: Record<string, any> = {};

interface S7ConnectionStatus {
  connected: boolean;
  error?: string;
  connectionAttempts: number;
  lastConnectionTime?: number;
  demoMode?: boolean;
  plcInfo?: {
    cpuType: string;
    serialNumber: string;
    version: string;
  };
}

let connectionStatus: S7ConnectionStatus = {
  connected: false,
  connectionAttempts: 0,
  demoMode: false
};

// Initialize WebSocket Server
function initializeWebSocketServer() {
  if (wsServer) return;

  try {
    wsServer = new WebSocketServer({ port: WS_PORT });
    console.log(`Snap7 WebSocket server started on port ${WS_PORT}`);

    wsServer.on('connection', (ws: WebSocket) => {
      console.log('Client connected to Snap7 WebSocket');
      connectedClients.add(ws);

      // Send current data cache to new client
      if (Object.keys(dataCache).length > 0) {
        ws.send(JSON.stringify({
          type: 'data',
          data: dataCache,
          timestamp: new Date().toISOString(),
          protocol: 'snap7'
        }));
      }

      // Send connection status
      ws.send(JSON.stringify({
        type: 'status',
        status: connectionStatus,
        protocol: 'snap7'
      }));

      ws.on('close', () => {
        console.log('Client disconnected from Snap7 WebSocket');
        connectedClients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        connectedClients.delete(ws);
      });
    });

    wsServer.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
  }
}

// Broadcast data to all connected WebSocket clients
function broadcastData(data: any, type: string = 'data') {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
    protocol: 'snap7'
  });

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error sending data to client:', error);
        connectedClients.delete(client);
      }
    }
  });
}

// Convert S7 data type to buffer operations
function readDataFromPLC(dataPoint: S7DataPoint): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!s7Client || !snap7) {
      reject(new Error('S7 client not available'));
      return;
    }

    try {
      const dbNumber = dataPoint.dbNumber;
      const startByte = dataPoint.startByte;
      let length: number;

      // Determine read length based on data type
      switch (dataPoint.dataType) {
        case 'BOOL':
        case 'BYTE':
          length = 1;
          break;
        case 'WORD':
        case 'INT':
          length = 2;
          break;
        case 'DWORD':
        case 'DINT':
        case 'REAL':
          length = 4;
          break;
        case 'STRING':
          length = dataPoint.length || 32;
          break;
        default:
          length = 4;
      }

      s7Client.DBRead(dbNumber, startByte, length, (err: any, data: Buffer) => {
        if (err) {
          reject(err);
          return;
        }

        let value: any;

        try {
          switch (dataPoint.dataType) {
            case 'BOOL':
              if (dataPoint.bitOffset !== undefined) {
                const byteValue = data.readUInt8(0);
                value = Boolean(byteValue & (1 << dataPoint.bitOffset));
              } else {
                value = Boolean(data.readUInt8(0));
              }
              break;
            case 'BYTE':
              value = data.readUInt8(0);
              break;
            case 'WORD':
              value = data.readUInt16BE(0);
              break;
            case 'DWORD':
              value = data.readUInt32BE(0);
              break;
            case 'INT':
              value = data.readInt16BE(0);
              break;
            case 'DINT':
              value = data.readInt32BE(0);
              break;
            case 'REAL':
              value = data.readFloatBE(0);
              break;
            case 'STRING':
              value = data.toString('ascii').replace(/\0+$/, ''); // Remove null terminators
              break;
            default:
              value = data.readFloatBE(0);
          }

          // Apply factor if specified
          if (dataPoint.factor && typeof value === 'number') {
            value = value * dataPoint.factor;
          }

          // Apply precision if specified
          if (dataPoint.precision && typeof value === 'number') {
            value = parseFloat(value.toFixed(dataPoint.precision));
          }

          resolve(value);
        } catch (parseError) {
          reject(parseError);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Write data to PLC
function writeDataToPLC(dataPoint: S7DataPoint, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!s7Client || !snap7) {
      reject(new Error('S7 client not available'));
      return;
    }

    if (!dataPoint.isWritable) {
      reject(new Error(`Data point ${dataPoint.id} is not writable`));
      return;
    }

    try {
      const dbNumber = dataPoint.dbNumber;
      const startByte = dataPoint.startByte;
      let buffer: Buffer;

      // Create buffer based on data type
      switch (dataPoint.dataType) {
        case 'BOOL':
          buffer = Buffer.alloc(1);
          if (dataPoint.bitOffset !== undefined) {
            // For bit operations, we need to read-modify-write
            s7Client.DBRead(dbNumber, startByte, 1, (err: any, currentData: Buffer) => {
              if (err) {
                reject(err);
                return;
              }
              let byteValue = currentData.readUInt8(0);
              if (value) {
                byteValue |= (1 << dataPoint.bitOffset!);
              } else {
                byteValue &= ~(1 << dataPoint.bitOffset!);
              }
              buffer.writeUInt8(byteValue, 0);
              
              s7Client.DBWrite(dbNumber, startByte, 1, buffer, (writeErr: any) => {
                if (writeErr) reject(writeErr);
                else resolve();
              });
            });
            return;
          } else {
            buffer.writeUInt8(value ? 1 : 0, 0);
          }
          break;
        case 'BYTE':
          buffer = Buffer.alloc(1);
          buffer.writeUInt8(value, 0);
          break;
        case 'WORD':
          buffer = Buffer.alloc(2);
          buffer.writeUInt16BE(value, 0);
          break;
        case 'DWORD':
          buffer = Buffer.alloc(4);
          buffer.writeUInt32BE(value, 0);
          break;
        case 'INT':
          buffer = Buffer.alloc(2);
          buffer.writeInt16BE(value, 0);
          break;
        case 'DINT':
          buffer = Buffer.alloc(4);
          buffer.writeInt32BE(value, 0);
          break;
        case 'REAL':
          buffer = Buffer.alloc(4);
          buffer.writeFloatBE(value, 0);
          break;
        case 'STRING':
          buffer = Buffer.from(value, 'ascii');
          break;
        default:
          buffer = Buffer.alloc(4);
          buffer.writeFloatBE(value, 0);
      }

      s7Client.DBWrite(dbNumber, startByte, buffer.length, buffer, (err: any) => {
        if (err) reject(err);
        else resolve();
      });

    } catch (error) {
      reject(error);
    }
  });
}

// Connect to PLC
async function connectToS7(config: Snap7Config = defaultSnap7Config): Promise<void> {
  if (isConnecting || isDisconnecting) {
    throw new Error('Connection operation already in progress');
  }

  if (!snap7) {
    throw new Error('node-snap7 package not available. Please install: npm install node-snap7');
  }

  isConnecting = true;
  connectionAttempts++;

  try {
    if (s7Client) {
      s7Client.Disconnect();
      s7Client = null;
    }

    s7Client = new snap7.S7Client();
    
    // Connect to PLC
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, config.timeout);

      s7Client.ConnectTo(config.plcIP, config.plcRack, config.plcSlot, (err: any) => {
        clearTimeout(timeout);
        if (err) {
          reject(new Error(`Failed to connect to PLC: ${err}`));
        } else {
          resolve();
        }
      });
    });

    // Get PLC info
    try {
      const cpuInfo = await new Promise<any>((resolve, reject) => {
        s7Client.GetCpuInfo((err: any, info: any) => {
          if (err) reject(err);
          else resolve(info);
        });
      });

      connectionStatus.plcInfo = {
        cpuType: cpuInfo.CpuType || 'Unknown',
        serialNumber: cpuInfo.SerialNumber || 'Unknown',
        version: cpuInfo.Version || 'Unknown'
      };
    } catch (infoError) {
      console.warn('Could not retrieve PLC info:', infoError);
    }

    connectionStatus.connected = true;
    connectionStatus.error = undefined;
    connectionStatus.lastConnectionTime = Date.now();
    
    console.log(`Connected to S7 PLC at ${config.plcIP}`);
    
    // Start data polling
    startDataPolling();
    
    // Broadcast connection status
    broadcastData(connectionStatus, 'status');

  } catch (error) {
    connectionStatus.connected = false;
    connectionStatus.error = error instanceof Error ? error.message : String(error);
    console.error('S7 connection error:', error);
    
    // Broadcast error status
    broadcastData(connectionStatus, 'status');
    
    throw error;
  } finally {
    isConnecting = false;
  }
}

// Disconnect from PLC
async function disconnectFromS7(): Promise<void> {
  if (isDisconnecting) return;
  
  isDisconnecting = true;
  
  try {
    if (dataInterval) {
      clearInterval(dataInterval);
      dataInterval = null;
    }

    if (s7Client) {
      await new Promise<void>((resolve) => {
        s7Client.Disconnect((err: any) => {
          if (err) console.warn('Error during disconnect:', err);
          resolve();
        });
      });
      s7Client = null;
    }

    connectionStatus.connected = false;
    connectionStatus.error = undefined;
    
    console.log('Disconnected from S7 PLC');
    
    // Broadcast disconnection status
    broadcastData(connectionStatus, 'status');
    
  } catch (error) {
    console.error('Error during S7 disconnect:', error);
  } finally {
    isDisconnecting = false;
  }
}

// Start demo mode
function startDemoMode() {
  console.log('🎭 Starting Snap7 Demo Mode');
  
  isDemoMode = true;
  connectionStatus.connected = true;
  connectionStatus.demoMode = true;
  connectionStatus.error = undefined;
  connectionStatus.lastConnectionTime = Date.now();
  connectionStatus.plcInfo = {
    cpuType: 'Demo S7-1200',
    serialNumber: 'DEMO123456',
    version: 'V4.4 Demo'
  };

  // Start demo data generation
  snap7DemoMode.start();
  
  // Start demo data polling
  startDemoDataPolling();
  
  // Broadcast connection status
  broadcastData(connectionStatus, 'status');
}

// Stop demo mode
function stopDemoMode() {
  console.log('🛑 Stopping Snap7 Demo Mode');
  
  isDemoMode = false;
  connectionStatus.connected = false;
  connectionStatus.demoMode = false;
  connectionStatus.error = undefined;
  
  // Stop demo data generation
  snap7DemoMode.stop();
  
  // Stop data polling
  if (dataInterval) {
    clearInterval(dataInterval);
    dataInterval = null;
  }
  
  // Broadcast disconnection status
  broadcastData(connectionStatus, 'status');
}

// Start demo data polling
function startDemoDataPolling() {
  if (dataInterval) {
    clearInterval(dataInterval);
  }

  dataInterval = setInterval(() => {
    if (!isDemoMode) return;

    try {
      const demoData = snap7DemoMode.getData();
      const newData: Record<string, any> = {};
      
      // Convert demo data to expected format
      snap7DataPoints.forEach(dataPoint => {
        const value = demoData[dataPoint.id];
        newData[dataPoint.id] = {
          value,
          timestamp: new Date().toISOString(),
          quality: 'good'
        };
      });

      // Update cache
      Object.assign(dataCache, newData);
      
      // Broadcast new data
      broadcastData(dataCache);
      
    } catch (error) {
      console.error('Error during demo data polling:', error);
    }
  }, POLLING_INTERVAL);
}

// Start data polling
function startDataPolling() {
  if (dataInterval) {
    clearInterval(dataInterval);
  }

  dataInterval = setInterval(async () => {
    if (!connectionStatus.connected || !s7Client) return;

    try {
      const newData: Record<string, any> = {};
      
      // Read all data points
      for (const dataPoint of snap7DataPoints) {
        try {
          const value = await readDataFromPLC(dataPoint);
          newData[dataPoint.id] = {
            value,
            timestamp: new Date().toISOString(),
            quality: 'good'
          };
        } catch (error) {
          console.error(`Error reading ${dataPoint.id}:`, error);
          newData[dataPoint.id] = {
            value: null,
            timestamp: new Date().toISOString(),
            quality: 'bad',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }

      // Update cache
      Object.assign(dataCache, newData);
      
      // Broadcast new data
      broadcastData(dataCache);
      
    } catch (error) {
      console.error('Error during data polling:', error);
      
      // Check if connection is still alive
      if (s7Client) {
        s7Client.GetPlcStatus((err: any, status: any) => {
          if (err) {
            console.error('PLC connection lost, attempting reconnect...');
            connectionStatus.connected = false;
            connectionStatus.error = 'Connection lost';
            broadcastData(connectionStatus, 'status');
            
            // Attempt reconnection
            setTimeout(() => {
              if (connectionAttempts < defaultSnap7Config.maxReconnectAttempts) {
                connectToS7().catch(console.error);
              }
            }, RECONNECT_DELAY);
          }
        });
      }
    }
  }, POLLING_INTERVAL);
}

// API Routes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          status: connectionStatus,
          dataPoints: snap7DataPoints,
          config: defaultSnap7Config
        });

      case 'data':
        return NextResponse.json({
          success: true,
          data: dataCache,
          timestamp: new Date().toISOString()
        });

      case 'datapoints':
        return NextResponse.json({
          success: true,
          dataPoints: snap7DataPoints
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'Snap7 API is running',
          availableActions: ['status', 'data', 'datapoints']
        });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, dataPointId, value } = body;

    switch (action) {
      case 'connect':
        // Initialize WebSocket server if not already done
        initializeWebSocketServer();
        
        const connectionConfig = config || defaultSnap7Config;
        await connectToS7(connectionConfig);
        
        return NextResponse.json({
          success: true,
          message: 'Connected to S7 PLC',
          status: connectionStatus
        });

      case 'connect-demo':
        // Initialize WebSocket server if not already done
        initializeWebSocketServer();
        
        startDemoMode();
        
        return NextResponse.json({
          success: true,
          message: 'Connected to Snap7 Demo Mode',
          status: connectionStatus
        });

      case 'disconnect':
        if (isDemoMode) {
          stopDemoMode();
        } else {
          await disconnectFromS7();
        }
        
        return NextResponse.json({
          success: true,
          message: isDemoMode ? 'Disconnected from Demo Mode' : 'Disconnected from S7 PLC',
          status: connectionStatus
        });

      case 'write':
        if (!dataPointId || value === undefined) {
          return NextResponse.json({
            success: false,
            error: 'dataPointId and value are required for write operation'
          }, { status: 400 });
        }

        const dataPoint = snap7DataPoints.find(dp => dp.id === dataPointId);
        if (!dataPoint) {
          return NextResponse.json({
            success: false,
            error: `Data point ${dataPointId} not found`
          }, { status: 404 });
        }

        if (isDemoMode) {
          // Handle write in demo mode
          const success = snap7DemoMode.writeValue(dataPointId, value);
          if (!success) {
            return NextResponse.json({
              success: false,
              error: `Failed to write to ${dataPointId} in demo mode`
            }, { status: 400 });
          }
        } else {
          // Handle write to real PLC
          await writeDataToPLC(dataPoint, value);
        }
        
        return NextResponse.json({
          success: true,
          message: `Successfully wrote value ${value} to ${dataPointId}`
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Cleanup on module unload
process.on('exit', () => {
  if (s7Client) {
    s7Client.Disconnect();
  }
  if (wsServer) {
    wsServer.close();
  }
});

process.on('SIGINT', () => {
  if (s7Client) {
    s7Client.Disconnect();
  }
  if (wsServer) {
    wsServer.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (s7Client) {
    s7Client.Disconnect();
  }
  if (wsServer) {
    wsServer.close();
  }
  process.exit(0);
});
