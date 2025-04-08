import { WS_PORT, OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from "@/config/constants";
import { dataPoints, nodeIds } from "@/config/dataPoints";
import {
  OPCUAClient,
  ClientSession,
  StatusCodes,
  AttributeIds,
  MessageSecurityMode,
  SecurityPolicy,
} from "node-opcua";
import { WebSocketServer, WebSocket } from "ws";
import { NextRequest, NextResponse } from 'next/server';

// Variable to control if OPC UA connection should always be kept alive
const KEEP_OPCUA_ALIVE = true;

let endpointUrl: string;
const POLLING_INTERVAL = 1000;
const RECONNECT_DELAY = 5000;
const SESSION_TIMEOUT = 60000; // Increased session timeout
const WEBSOCKET_HEARTBEAT_INTERVAL = 30000; // 30 seconds

let opcuaClient: OPCUAClient | null = null;
let opcuaSession: ClientSession | null = null;
let wsServer: WebSocketServer | null = null;
const connectedClients = new Set<WebSocket>();
let dataInterval: NodeJS.Timeout | null = null;
const nodeDataCache: Record<string, any> = {};
let isConnectingOpcua = false;
let isDisconnectingOpcua = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = Infinity; // Retry indefinitely
let disconnectTimeout: NodeJS.Timeout | null = null;

const nodeIdsToMonitor = () => {
  return nodeIds.filter((nodeId) => nodeId !== undefined);
};

async function connectOPCUA() {
  if (!wsServer) {
    await startWebSocketServer();
  }

  endpointUrl = OPC_UA_ENDPOINT_OFFLINE;
  if (opcuaClient && opcuaSession) {
    console.log("OPC UA session already active.");
    startDataPolling();
    return;
  }
  if (isConnectingOpcua || isDisconnectingOpcua) {
    console.log("OPC UA connection/disconnection in progress.");
    return;
  }
  isConnectingOpcua = true;
  console.log(`Attempting to connect to OPC UA server (${connectionAttempts + 1}):`, endpointUrl);

  try {
    if (!opcuaClient) {
      opcuaClient = OPCUAClient.create({
        endpointMustExist: false,
        connectionStrategy: {
          maxRetry: 0, // Handle retries manually
          initialDelay: RECONNECT_DELAY,
          maxDelay: RECONNECT_DELAY * 3,
        },
        keepSessionAlive: true,
        securityMode: MessageSecurityMode.None,
        securityPolicy: SecurityPolicy.None,
        requestedSessionTimeout: SESSION_TIMEOUT,
      });

      opcuaClient.on("backoff", (retry, delay) => {
        console.log(`OPC UA connection backoff: retry ${retry} in ${delay}ms`);
      });

      opcuaClient.on("connection_lost", () => {
        console.error("OPC UA connection lost.");
        opcuaSession = null;
        stopDataPolling();
        attemptReconnect("connection_lost");
      });
      opcuaClient.on("connection_reestablished", () => {
        console.log("OPC UA connection re-established.");
        createSessionAndStartPolling();
        connectionAttempts = 0; // Reset attempts on success
      });
      opcuaClient.on("close", () => {
        console.log("OPC UA client connection closed.");
        opcuaSession = null;
        stopDataPolling();
        opcuaClient = null; // Allow reconnection
        attemptReconnect("close");
      });
      opcuaClient.on("timed_out_request", (request) => {
        console.warn("OPC UA request timed out:", request?.toString());
      });
    }

    await opcuaClient.connect(endpointUrl);
    console.log("OPC UA client connected to:", endpointUrl);
    await createSessionAndStartPolling();
    connectionAttempts = 0; // Reset attempts on success
  } catch (err) {
    console.error(`Failed to connect OPC UA client to ${endpointUrl}:`, err);
    if (endpointUrl === OPC_UA_ENDPOINT_OFFLINE) {
      console.log("Falling back to online OPC UA endpoint...");
      endpointUrl = OPC_UA_ENDPOINT_ONLINE;
      try {

        if (!opcuaClient) {
          throw new Error("OPC UA client is not initialized.");
        }

        await opcuaClient.connect(endpointUrl);
        console.log("OPC UA client connected to fallback:", endpointUrl);
        await createSessionAndStartPolling();
        connectionAttempts = 0; // Reset attempts on success
      } catch (fallbackErr) {
        console.error("Failed to connect to fallback OPC UA endpoint:", fallbackErr);
        attemptReconnect("fallback_failure");
        if (opcuaClient) {
          try {
            await opcuaClient.disconnect();
          } catch (disconnectErr) {
            console.error("Error during fallback disconnect:", disconnectErr);
          } finally {
            opcuaClient = null;
          }
        }
      }
    } else {
      attemptReconnect("initial_failure");
      if (opcuaClient) {
        try {
          await opcuaClient.disconnect();
        } catch (disconnectErr) {
          console.error("Error during initial disconnect:", disconnectErr);
        } finally {
          opcuaClient = null;
        }
      }
    }
  } finally {
    isConnectingOpcua = false;
  }
}

function attemptReconnect(reason: string) {
  if (connectedClients.size > 0 && connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
    connectionAttempts++;
    console.log(`Attempting OPC UA reconnect (${connectionAttempts}) due to: ${reason} in ${RECONNECT_DELAY}ms`);
    setTimeout(connectOPCUA, RECONNECT_DELAY);
  } else if (connectedClients.size > 0) {
    console.warn("Maximum OPC UA reconnection attempts reached or no clients connected. Stop reconnecting.");
  } else {
    console.log("No clients connected, not attempting OPC UA reconnect.");
  }
}

async function createSessionAndStartPolling() {
  if (!opcuaClient || opcuaSession || dataInterval) {
    console.log("Cannot create session: No client or session exists, or polling active.");
    return;
  }

  try {
    opcuaSession = await opcuaClient.createSession();
    console.log("OPC UA session created.");

    opcuaSession.on("session_closed", () => {
      console.log("OPC UA session explicitly closed.");
      opcuaSession = null;
      stopDataPolling();
      attemptReconnect("session_closed");
    });
    opcuaSession.on("keepalive", (state: string) => {
      // console.log("OPC UA session keepalive state:", state);
    });
    opcuaSession.on("keepalive_failure", (state: string | Error) => {
      console.error("OPC UA session keepalive failure:", state);
      opcuaSession = null;
      stopDataPolling();
      attemptReconnect("keepalive_failure");
    });

    startDataPolling();
  } catch (err) {
    console.error("Failed to create OPC UA session:", err);
    opcuaSession = null;
    attemptReconnect("session_creation_failure");
  }
}

function startDataPolling() {
  if (dataInterval || !opcuaSession) {
    console.log("Polling not started: Already running or no session.");
    return;
  }

  console.log("Starting data polling...");
  dataInterval = setInterval(async () => {
    if (!opcuaSession) { // Keep polling even if no clients are connected
      console.log("No active session, stopping polling.");
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
        const nodeId = nodesToRead[index].nodeId;
        let newValue: any = "Error";
        const dataPoint = dataPoints.find((point) => point.nodeId === nodeId);
        if (dataPoint && dataPoint.factor) {
          if (dataValue.statusCode.isGood() && dataValue.value?.value !== undefined) {
            newValue =
              typeof dataValue.value.value === "number" && !Number.isInteger(dataValue.value.value)
                ? parseFloat((dataValue.value.value * dataPoint.factor).toFixed(2))
                : dataValue.value.value * dataPoint.factor;
          }
        } else if (dataValue.statusCode.isGood() && dataValue.value?.value !== undefined) {
          newValue =
            typeof dataValue.value.value === "number" && !Number.isInteger(dataValue.value.value)
              ? parseFloat(dataValue.value.value.toFixed(2))
              : dataValue.value.value;
        }
        currentDataBatch[nodeId] = newValue;
        nodeDataCache[nodeId] = newValue;
      });

      if (Object.keys(currentDataBatch).length > 0 && connectedClients.size > 0) {
        broadcast(JSON.stringify(currentDataBatch));
      }
      // Optionally log the cached data even if no clients are connected
      // console.log("Current OPC UA data:", nodeDataCache);
    } catch (err) {
      console.error("Error during OPC UA read poll:", err);
      if (
        err instanceof Error &&
        (err.message.includes("BadSessionIdInvalid") ||
          err.message.includes("BadSessionClosed") ||
          err.message.includes("BadNotConnected") ||
          err.message.includes("BadTooManySessions"))
      ) {
        console.error("OPC UA Session/Connection error during poll. Stopping poll and attempting reconnect.");
        opcuaSession = null;
        stopDataPolling();
        attemptReconnect("polling_error");
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
  if (!wsServer) {
    wsServer = new WebSocketServer({ port: WS_PORT });
    initializeWebSocketServer(wsServer);
    console.log(`WebSocket server started on port ${WS_PORT}`);
    // Immediately connect to OPC UA when the server starts
    if (KEEP_OPCUA_ALIVE) {
      connectOPCUA();
    }
  }
}

function initializeWebSocketServer(server: WebSocketServer) {
  server.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    connectedClients.add(ws);
    (ws as any).isAlive = true;
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    if (Object.keys(nodeDataCache).length > 0) {
      try {
        ws.send(JSON.stringify(nodeDataCache));
      } catch (err) {
        console.error("Error sending initial cache to client:", err);
      }
    }

    if (connectedClients.size === 1 && !KEEP_OPCUA_ALIVE) {
      console.log("First client connected, ensuring OPC UA connection.");
      connectOPCUA();
      if (disconnectTimeout) {
        clearTimeout(disconnectTimeout);
        disconnectTimeout = null;
        console.log("New client connected, canceling OPC UA disconnection.");
      }
    }

    ws.on("message", (message) => {
      console.log("Received message from client:", message);
    });

    ws.on("close", () => {
      console.log("Client disconnected from WebSocket");
      connectedClients.delete(ws);
      if (connectedClients.size === 0 && !KEEP_OPCUA_ALIVE && opcuaClient) {
        console.log(`Last client disconnected, scheduling OPC UA disconnection.`);
        // Disconnect immediately if KEEP_OPCUA_ALIVE is false
        disconnectOPCUA();
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      ws.terminate();
      connectedClients.delete(ws);
      if (connectedClients.size === 0 && !KEEP_OPCUA_ALIVE && opcuaClient) {
        console.log(`Last client errored, scheduling OPC UA disconnection.`);
        // Disconnect immediately if KEEP_OPCUA_ALIVE is false
        disconnectOPCUA();
      }
    });
  });

  server.on("error", (error) => {
    console.error("WebSocket Server error:", error);
  });

  // Implement WebSocket heartbeat
  const pingInterval = setInterval(() => {
    server.clients.forEach(client => {
      if ((client as any).isAlive === false) {
        console.log("WebSocket client not responding, terminating connection.");
        return client.terminate();
      }

      (client as any).isAlive = false;
      client.ping();
    });
  }, WEBSOCKET_HEARTBEAT_INTERVAL);

  server.on('close', () => {
    clearInterval(pingInterval);
  });
}

async function disconnectOPCUA() {
  if (isDisconnectingOpcua || !opcuaClient) {
    console.log("OPC UA disconnection in progress or already disconnected.");
    return;
  }
  isDisconnectingOpcua = true;
  console.log("Disconnecting OPC UA...");

  stopDataPolling();

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
      connectionAttempts = 0; // Reset connection attempts after explicit disconnect
    }
  }
  isDisconnectingOpcua = false;
  console.log("OPC UA disconnection process finished.");
}

// Initialize WebSocket server on module load
startWebSocketServer().catch((error) => {
  console.error("Failed to start WebSocket server:", error);
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  clearInterval(null as any);
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout);
  }
  await disconnectOPCUA();
  if (wsServer) {
    wsServer.close(() => {
      console.log("WebSocket server closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on("SIGTERM", async () => {
  console.log("Shutting down via SIGTERM...");
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout);
  }
  await disconnectOPCUA();
  if (wsServer) {
    wsServer.close(() => {
      console.log("WebSocket server closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

export async function GET(req: NextRequest) {
  const host = req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  const shouldRedirect = true; // Adjust as needed
  if (shouldRedirect) {
    return NextResponse.redirect(`${origin}/dashboard`, { status: 302 });
  }

  return new NextResponse("OPC UA Service Ready", { status: 200 });
}