// server/ws-server.js
import { WebSocketServer, WebSocket } from 'ws';
import {
  OPCUAClient,
  AttributeIds,
  MessageSecurityMode,
  SecurityPolicy,
  DataValue,
  StatusCode,
  StatusCodes,
  DataType, // Import DataType
} from 'node-opcua';
import { NextApiRequest, NextApiResponse } from 'next';
import { dataPoints, nodeIds } from '@/config/dataPoints';


const WS_PORT = 8082; // Port for the WebSocket server
// const OPCUA_ENDPOINT = "opc.tcp://opcua.demo-this.com:51210/UA/SampleServer";
const OPCUA_ENDPOINT = "opc.tcp://192.168.1.2:4840";
const POLLING_INTERVAL = 1000; // ms

const nodeIdsToMonitor = () => {
  return nodeIds.filter(nodeId => nodeId !== undefined);
};


console.log(dataPoints); // Use dataPoints wherever needed

let wss: { on: (arg0: string, arg1: { (ws: WebSocket): void; (error: any): void; }) => void; close: (arg0: () => void) => void; } | null = null;
let opcuaClient: OPCUAClient | null = null; // Ensure proper typing for opcuaClient
let opcuaSession: any = null; // Using 'any' for session type
let clientConnections: Set<WebSocket> = new Set();
let dataInterval: NodeJS.Timeout | null = null;
const nodeDataCache: Record<string, any> = {};
let isConnectingOpcua = false;
let isDisconnectingOpcua = false;

// --- OPC UA Connection Logic ---

async function connectOPCUA() {
  if (opcuaClient || isConnectingOpcua || isDisconnectingOpcua) {
    console.log("OPC UA connection/disconnection already in progress or established.");
    return;
  }
  isConnectingOpcua = true;
  console.log("Attempting to connect to OPC UA server:", OPCUA_ENDPOINT);

  opcuaClient = OPCUAClient.create({
    endpointMustExist: false,
    connectionStrategy: {
      maxRetry: 10, // More retries
      initialDelay: 1500,
      maxDelay: 15000,
    },
    keepSessionAlive: true,
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    requestedSessionTimeout: 60000,
  });

  opcuaClient.on("backoff", (retry, delay) => {
    console.log(`OPC UA connection backoff: retry ${retry} in ${delay}ms`);
  });

  opcuaClient.on("connection_lost", () => {
    console.error("OPC UA connection lost.");
    opcuaSession = null;
    stopDataPolling();
    // Connection strategy will handle reconnection attempts
  });
  opcuaClient.on("connection_reestablished", () => {
    console.log("OPC UA connection re-established.");
    createSessionAndStartPolling(); // Re-create session
  });
  opcuaClient.on("close", () => {
    console.log("OPC UA client connection closed.");
    opcuaSession = null;
    stopDataPolling();
    opcuaClient = null; // Allow reconnection attempt later
  });
  opcuaClient.on("timed_out_request", (request) => {
    console.warn("OPC UA request timed out:", request?.toString());
  });

  try {
    await opcuaClient.connect(OPCUA_ENDPOINT);
    console.log("OPC UA client connected.");
    await createSessionAndStartPolling();
  } catch (err) {
    console.error("Failed to connect OPC UA client:", err instanceof Error ? err.message : err);
    sendErrorToClients(err instanceof Error ? err.message : 'Failed to connect OPC UA client');
    opcuaClient = null; // Reset client on initial connection failure
  } finally {
    isConnectingOpcua = false;
  }
}

async function createSessionAndStartPolling() {
  if (!opcuaClient || opcuaSession) {
      console.log("Cannot create session: No client or session already exists.");
      return;
  }

  try {
    opcuaSession = await opcuaClient.createSession();
    console.log("OPC UA session created.");

    opcuaSession.on("session_closed", () => {
      console.log("OPC UA session explicitly closed.");
      opcuaSession = null;
      stopDataPolling();
      // If clients are still connected, try to reconnect OPC UA
      if (clientConnections.size > 0) {
          console.log("Session closed, but clients remain. Attempting OPC UA reconnect.");
          setTimeout(connectOPCUA, 5000); // Wait 5s before reconnecting
      }
    });
     opcuaSession.on("keepalive", (state: string) => {
         // console.log("OPC UA session keepalive state:", state); // Too verbose
     });
     opcuaSession.on("keepalive_failure", (state: string | Error) => {
         console.error("OPC UA session keepalive failure:", state);
         sendErrorToClients(`OPC UA session keepalive failure: ${state}`);
         // Session might be dead, attempt to close and reconnect
         opcuaSession = null; // Assume session is dead
         stopDataPolling();
         if (clientConnections.size > 0) {
             console.log("Keepalive failure. Attempting OPC UA reconnect.");
             setTimeout(connectOPCUA, 5000);
         }
     });

    startDataPolling(); // Start polling now that session is ready
  } catch (err) {
    console.error("Failed to create OPC UA session:", err instanceof Error ? err.message : err);
    sendErrorToClients(err instanceof Error ? err.message : 'Failed to create OPC UA session');
    opcuaSession = null;
    // Attempt to reconnect if clients are present
     if (clientConnections.size > 0) {
         console.log("Session creation failed. Attempting OPC UA reconnect.");
         setTimeout(connectOPCUA, 5000);
     }
  }
}

// --- Data Polling Logic ---

function startDataPolling() {
  if (dataInterval || !opcuaSession) {
      console.log("Polling not started: Already running or no session.");
      return;
  }

  console.log("Starting data polling...");
  dataInterval = setInterval(async () => {
    if (!opcuaSession || clientConnections.size === 0) {
      // console.log("No active session or clients, stopping polling."); // Can be verbose
      stopDataPolling();
      // No need to explicitly reconnect here, connection events handle it
      return;
    }

    try {
      const nodesToRead = nodeIdsToMonitor().map((nodeId: any) => ({
        nodeId: nodeId,
        attributeId: AttributeIds.Value,
      }));

      const dataValues: DataValue[] = await opcuaSession.read(nodesToRead);

      const currentDataBatch: Record<string, any> = {};
      let hasChanged = false;

      dataValues.forEach((dataValue, index) => {
        const nodeId = nodeIdsToMonitor()[index];
        let newValue: any = 'Error'; // Default to error
        let valueChanged = false;

        if (dataValue.statusCode.isGood() && dataValue.value?.value !== undefined) {
          newValue = dataValue.value.value;
        } else if (!dataValue.statusCode.isGood()) {
           console.warn(`Bad status for ${nodeId}: ${dataValue.statusCode.toString()}`);
           broadcast(JSON.stringify({ error: `Bad status for ${nodeId}: ${dataValue.statusCode.toString()}` })); // Broadcast error
        } else {
           console.warn(`No value received for ${nodeId}, status: ${dataValue.statusCode.toString()}`);
           newValue = null; // Or keep 'Error'? Or last known good? Let's use null for no value.
        }

        // Update cache and check for changes
        if (nodeDataCache[nodeId] !== newValue) {
            nodeDataCache[nodeId] = newValue;
            valueChanged = true;
            hasChanged = true;
        }
        currentDataBatch[nodeId] = newValue; // Include current value regardless of change
      });

      // Broadcast the full current state if any value changed, or just periodically
      // Broadcasting full state is simpler for client, ensures sync
      if (Object.keys(currentDataBatch).length > 0 /*&& hasChanged*/) { // Send only if changed? Or always? Let's send always for simplicity.
        // console.log('Broadcasting data:', currentDataBatch); // Verbose
        broadcast(JSON.stringify(currentDataBatch));
      }

    } catch (err) {
      console.error('Error during OPC UA read poll:', err instanceof Error ? err.message : err);
      sendErrorToClients(err instanceof Error ? err.message : 'Error during OPC UA read poll');
      if (err instanceof Error && (err.message.includes("BadSessionIdInvalid") || err.message.includes("BadSessionClosed") || err.message.includes("BadNotConnected"))) {
        console.error("OPC UA Session/Connection error during poll. Stopping poll and attempting reconnect.");
        opcuaSession = null; // Assume session/connection is dead
        stopDataPolling();
        if (clientConnections.size > 0) {
            setTimeout(connectOPCUA, 5000); // Attempt to re-establish connection
        }
      }
      // Handle other specific errors like BadNodeIdUnknown if necessary
    }
  }, POLLING_INTERVAL);
}

function stopDataPolling() {
  if (dataInterval) {
    console.log("Stopping data polling.");
    clearInterval(dataInterval);
    dataInterval = null;
  }
}

// --- OPC UA Disconnect Logic ---

async function disconnectOPCUA() {
  if (isDisconnectingOpcua || !opcuaClient) {
      console.log("OPC UA disconnection in progress or already disconnected.");
      return;
  }
  isDisconnectingOpcua = true;
  console.log("Disconnecting OPC UA...");

  stopDataPolling(); // Stop polling first

  if (opcuaSession) {
    try {
      console.log("Closing OPC UA session...");
      await opcuaSession.close(); // Give it 2 seconds to close
      console.log("OPC UA session closed.");
    } catch (err) {
      console.error("Error closing OPC UA session:", err instanceof Error ? err.message : err);
      sendErrorToClients(err instanceof Error ? err.message : 'Error closing OPC UA session');
    } finally {
      opcuaSession = null;
    }
  }

  if (opcuaClient) {
    try {
      console.log("Disconnecting OPC UA client...");
      await opcuaClient.disconnect();
      console.log("OPC UA client disconnected.");
    } catch (err) {
      console.error("Error disconnecting OPC UA client:", err instanceof Error ? err.message : err);
      sendErrorToClients(err instanceof Error ? err.message : 'Error disconnecting OPC UA client');
    } finally {
      opcuaClient = null;
    }
  }
  isDisconnectingOpcua = false;
  console.log("OPC UA disconnection process finished.");
}

// --- WebSocket Server Logic ---

function sendErrorToClients(errorMessage: string) {
  const errorPayload = JSON.stringify({ error: errorMessage });
  broadcast(errorPayload);
}

function initializeWebSocketServer() {
  if (wss) return;

  wss = new WebSocketServer({ port: WS_PORT });
  console.log(`WebSocket server started on ws://localhost:${WS_PORT}`);
  if (wss) {
    wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected.');
      clientConnections.add(ws);

      // Send current cache immediately to new client
      if (Object.keys(nodeDataCache).length > 0) {
          try {
              ws.send(JSON.stringify(nodeDataCache));
          } catch (err) {
              console.error("Error sending initial cache to client:", err);
          }
      }

      // Start OPC UA connection if this is the first client
      if (clientConnections.size === 1) {
        console.log("First client connected, ensuring OPC UA connection.");
        connectOPCUA(); // Ensure connection and polling starts
      }

      ws.on('message', async (message: Buffer) => {
        const messageString = message.toString();
        console.log('WS Received:', messageString);

        if (!opcuaSession) {
          console.error("Cannot process write command, OPC UA session not active.");
          ws.send(JSON.stringify({ error: "OPC UA session not active", status: "write_error" }));
          return;
        }

        try {
          const data = JSON.parse(messageString);
          if (data.type === 'write' && data.nodeId && data.value !== undefined) {
            console.log(`WS Write request: Node=${data.nodeId}, Value=${data.value}`);

            // Determine DataType based on value
            let opcuaDataType: DataType = DataType.Variant; // Default or determine dynamically
            if (typeof data.value === 'boolean') {
                opcuaDataType = DataType.Boolean;
            } else if (typeof data.value === 'number') {
                // Could be Int, Double, Float etc. Use Double as a common default for numbers.
                // Adjust if specific types like Int16 are needed and known.
                opcuaDataType = DataType.Double;
            }
            // Add more type checks if needed (String, etc.)

            const nodeToWrite = {
              nodeId: data.nodeId,
              attributeId: AttributeIds.Value,
              value: {
                value: { // DataValue
                  dataType: opcuaDataType,
                  value: data.value,
                },
              },
            };

            const statusCode: StatusCode = await opcuaSession.write(nodeToWrite);

            if (statusCode.isGood()) {
              console.log(`OPC UA Write successful for ${data.nodeId}`);
              ws.send(JSON.stringify({ status: 'write_success', nodeId: data.nodeId }));

              // Optimistic update: Update cache and broadcast immediately
              nodeDataCache[data.nodeId] = data.value;
              broadcast(JSON.stringify({ [data.nodeId]: data.value }));

            } else {
              console.error(`OPC UA Write failed for ${data.nodeId}: ${statusCode.toString()}`);
              ws.send(JSON.stringify({ status: 'write_error', nodeId: data.nodeId, error: `OPC UA Write Failed: ${statusCode.toString()}` }));
            }
          } else {
            console.warn("WS Received invalid message format:", data);
          }
        } catch (err) {
          console.error('Error handling WS message or writing value:', err instanceof Error ? err.message : err);
          ws.send(JSON.stringify({ status: 'write_error', error: err instanceof Error ? err.message : 'Failed to process write request' }));
          sendErrorToClients(err instanceof Error ? err.message : 'Error handling WS message or writing value');
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected.');
        clientConnections.delete(ws);
        if (clientConnections.size === 0) {
          console.log("Last client disconnected, disconnecting OPC UA.");
          disconnectOPCUA(); // Disconnect OPC UA if no clients left
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
        sendErrorToClients(`WebSocket client error: ${error.message}`);
        clientConnections.delete(ws); // Remove problematic client
        if (clientConnections.size === 0) {
          console.log("Last client errored, disconnecting OPC UA.");
          disconnectOPCUA();
        }
      });
    });

    wss.on('error', (error) => {
      console.error('WebSocket Server error:', error);
      sendErrorToClients(`WebSocket Server error: ${error.message}`);
      wss = null; // Allow restart attempt
      // Consider more robust error handling/restart logic if needed
    });
  }
}

function broadcast(data: string) {
  clientConnections.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
          client.send(data);
      } catch (err) {
          console.error("Error sending data to client:", err);
          sendErrorToClients(err instanceof Error ? err.message : 'Error sending data to client');
      }
    }
  });
}

// --- Initialization ---
initializeWebSocketServer();

// --- Graceful Shutdown ---
const cleanup = async () => {
  console.log("Shutting down...");
  if (wss) {
    console.log("Closing WebSocket server...");
    wss.close(() => {
      console.log("WebSocket server closed.");
    });
    // Force close remaining client connections
    clientConnections.forEach(ws => ws.terminate());
  }
  await disconnectOPCUA();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => console.log("Process exiting.")); // OPC UA should be disconnected by now

// api/opcua/page.js
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res) {
    console.error("Response object is undefined.");
    return;
  }
  res.status(200).json({ message: "OPC UA API working" });
}