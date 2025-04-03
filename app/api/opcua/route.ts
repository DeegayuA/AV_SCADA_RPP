import { WS_PORT } from "@/config/constants";
import { dataPoints, nodeIds } from "@/config/dataPoints"; // Import nodeIds as well
import {
  OPCUAClient,
  ClientSession,
  StatusCodes,
  AttributeIds,
  MessageSecurityMode,
  SecurityPolicy,
  DataType, // Import DataType if you intend to use it for writing
} from "node-opcua";
import { WebSocketServer, WebSocket } from "ws";

const endpointUrl = "opc.tcp://192.168.1.2:4840"; // Replace with your OPC UA server endpoint
const POLLING_INTERVAL = 3000; // ms - Using the interval from your setInterval

// Singleton instances
let opcuaClient: OPCUAClient | null = null;
let opcuaSession: ClientSession | null = null;
const wsServer = new WebSocketServer({ port: WS_PORT });
const connectedClients = new Set<WebSocket>();
let dataInterval: NodeJS.Timeout | null = null;
const nodeDataCache: Record<string, any> = {};
let isConnectingOpcua = false;
let isDisconnectingOpcua = false;

const nodeIdsToMonitor = () => {
  return nodeIds.filter(nodeId => nodeId !== undefined);
};

async function connectOPCUA() {
  if (opcuaClient || isConnectingOpcua || isDisconnectingOpcua) {
    console.log("OPC UA connection/disconnection already in progress or established.");
    if (opcuaClient && opcuaSession) {
      console.log("Reusing existing OPC UA session.");
      startDataPolling();
    }
    return;
  }
  isConnectingOpcua = true;
  console.log("Attempting to connect to OPC UA server:", endpointUrl);

  opcuaClient = OPCUAClient.create({
    endpointMustExist: false,
    connectionStrategy: {
      maxRetry: 10, // More retries as in the old code
      initialDelay: 1500,
      maxDelay: 15000,
    },
    keepSessionAlive: true,
    securityMode: MessageSecurityMode.None, // As in the old code
    securityPolicy: SecurityPolicy.None, // As in the old code
    requestedSessionTimeout: 60000, // As in the old code
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
    createSessionAndStartPolling(); // Re-create session and polling
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
    await opcuaClient.connect(endpointUrl);
    console.log("OPC UA client connected.");
    await createSessionAndStartPolling();
  } catch (err) {
    console.error("Failed to connect OPC UA client:", err);
    // Consider sending error to clients as in the old code if needed
    opcuaClient = null; // Reset client on initial connection failure
  } finally {
    isConnectingOpcua = false;
  }
}

async function createSessionAndStartPolling() {
  if (!opcuaClient || opcuaSession || dataInterval) {
    console.log("Cannot create session: No client or session already exists, or polling already active.");
    return;
  }

  try {
    opcuaSession = await opcuaClient.createSession();
    console.log("OPC UA session created.");

    opcuaSession.on("session_closed", () => {
      console.log("OPC UA session explicitly closed.");
      opcuaSession = null;
      stopDataPolling();
      if (connectedClients.size > 0) {
        console.log("Session closed, but clients remain. Attempting OPC UA reconnect.");
        setTimeout(connectOPCUA, 5000);
      }
    });
    opcuaSession.on("keepalive", (state: string) => {
      // console.log("OPC UA session keepalive state:", state); // Too verbose
    });
    opcuaSession.on("keepalive_failure", (state: string | Error) => {
      console.error("OPC UA session keepalive failure:", state);
      // Consider sending error to clients
      opcuaSession = null;
      stopDataPolling();
      if (connectedClients.size > 0) {
        console.log("Keepalive failure. Attempting OPC UA reconnect.");
        setTimeout(connectOPCUA, 5000);
      }
    });

    startDataPolling(); // Start polling after session is created
  } catch (err) {
    console.error("Failed to create OPC UA session:", err);
    opcuaSession = null;
    if (connectedClients.size > 0) {
      console.log("Session creation failed. Attempting OPC UA reconnect.");
      setTimeout(connectOPCUA, 5000);
    }
  }
}

function startDataPolling() {
  if (dataInterval || !opcuaSession) {
    console.log("Polling not started: Already running or no session.");
    return;
  }

  console.log("Starting data polling...");
  dataInterval = setInterval(async () => {
    if (!opcuaSession || connectedClients.size === 0) {
      console.log("No active session or clients, stopping polling.");
      stopDataPolling();
      return;
    }

    try {
      const nodesToRead = nodeIdsToMonitor().map((nodeId: any) => ({
        nodeId: nodeId,
        attributeId: AttributeIds.Value,
      }));

      const dataValues = await opcuaSession.read(nodesToRead);
      const currentDataBatch: Record<string, any> = {};

      dataValues.forEach((dataValue, index) => {
        const nodeId = nodesToRead[index].nodeId; // Corrected reference to nodesToRead
        let newValue: any = 'Error';

        if (dataValue.statusCode.isGood() && dataValue.value?.value !== undefined) {
          newValue = typeof dataValue.value.value === "number" && !Number.isInteger(dataValue.value.value)
            ? parseFloat(dataValue.value.value.toFixed(2))
            : dataValue.value.value;
        } else if (!dataValue.statusCode.isGood()) {
          console.warn(`Bad status for ${nodeId}: ${dataValue.statusCode.toString()}`);
          broadcast(JSON.stringify({ error: `Bad status for ${nodeId}: ${dataValue.statusCode.toString()}` }));
        } else {
          console.warn(`No value received for ${nodeId}, status: ${dataValue.statusCode.toString()}`);
          newValue = null;
        }
        currentDataBatch[nodeId] = newValue;
        nodeDataCache[nodeId] = newValue; // Update cache
      });

      if (Object.keys(currentDataBatch).length > 0) {
        broadcast(JSON.stringify(currentDataBatch));
      }
    } catch (err) {
      console.error('Error during OPC UA read poll:', err);
      // Handle session or connection errors during polling
      if (err instanceof Error && (err.message.includes("BadSessionIdInvalid") || err.message.includes("BadSessionClosed") || err.message.includes("BadNotConnected"))) {
        console.error("OPC UA Session/Connection error during poll. Stopping poll and attempting reconnect.");
        opcuaSession = null;
        stopDataPolling();
        if (connectedClients.size > 0) {
          setTimeout(connectOPCUA, 5000);
        }
      }
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

function broadcast(data: string) {
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        console.error("Error sending data to client:", err);
      }
    }
  });
}

async function startWebSocketServer() {
  initializeWebSocketServer(); // Initialize WebSocket server
  await connectOPCUA(); // Initial connection attempt will be triggered by the first client connection now
}

function initializeWebSocketServer() {
  wsServer.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    connectedClients.add(ws);

    // Send current cache immediately to new client
    if (Object.keys(nodeDataCache).length > 0) {
      try {
        ws.send(JSON.stringify(nodeDataCache));
      } catch (err) {
        console.error("Error sending initial cache to client:", err);
      }
    }

    // Start OPC UA connection if this is the first client
    if (connectedClients.size === 1) {
      console.log("First client connected, ensuring OPC UA connection.");
      connectOPCUA(); // Ensure connection and polling starts
    }

    ws.on("close", () => {
      console.log("Client disconnected from WebSocket");
      connectedClients.delete(ws);
      if (connectedClients.size === 0) {
        console.log("Last client disconnected, stopping OPC UA connection.");
        disconnectOPCUA();
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      connectedClients.delete(ws);
      if (connectedClients.size === 0) {
        console.log("Last client errored, stopping OPC UA connection.");
        disconnectOPCUA();
      }
    });
  });

  wsServer.on('error', (error) => {
    console.error('WebSocket Server error:', error);
  });

  console.log(`WebSocket server started on port ${WS_PORT}`);
}

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
      await opcuaSession.close();
      console.log("OPC UA session closed.");
    } catch (err) {
      console.error("Error closing OPC UA session:", err);
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
      console.error("Error disconnecting OPC UA client:", err);
    } finally {
      opcuaClient = null;
    }
  }
  isDisconnectingOpcua = false;
  console.log("OPC UA disconnection process finished.");
}

// Start the WebSocket server
startWebSocketServer().catch((error) => {
  console.error("Failed to start WebSocket server:", error);
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  clearInterval(null as any);
  await disconnectOPCUA();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down via SIGTERM...");
  await disconnectOPCUA();
  process.exit(0);
});


export async function GET(req: Request) {
  const host = req.headers.get('host'); // Dynamically get the host
  const protocol = req.headers.get('x-forwarded-proto') || 'http'; // Fallback to 'http' if not set
  const origin = `${protocol}://${host}`; // Combine protocol and host

  return new Response(null, {
    status: 302, // HTTP status code for redirection
    headers: {
      "Location": `${origin}/dashboard`, // Redirect to the dynamic origin with the /dashboard path
    },
  });
}
