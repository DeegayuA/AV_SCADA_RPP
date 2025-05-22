// app/api/opcua/route.ts
import { WS_PORT, OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from "@/config/constants";
import { dataPoints, nodeIds } from "@/config/dataPoints";
import {
  OPCUAClient,
  ClientSession,
  StatusCodes,
  AttributeIds,
  MessageSecurityMode,
  SecurityPolicy,
  DataType,
  DataValue,
} from "node-opcua";
import { WebSocketServer, WebSocket } from "ws";
import { NextRequest, NextResponse } from 'next/server';

// Variable to control if OPC UA connection should always be kept alive
const KEEP_OPCUA_ALIVE = true;

let endpointUrl: string;
const POLLING_INTERVAL = 3000;
const RECONNECT_DELAY = 5000;
const SESSION_TIMEOUT = 60000;
const WEBSOCKET_HEARTBEAT_INTERVAL = 5000;

let opcuaClient: OPCUAClient | null = null;
let opcuaSession: ClientSession | null = null;
const connectedClients = new Set<WebSocket>();
let dataInterval: NodeJS.Timeout | null = null;
const nodeDataCache: Record<string, any> = {};
let isConnectingOpcua = false;
let isDisconnectingOpcua = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = Infinity;
let disconnectTimeout: NodeJS.Timeout | null = null;

// Global WebSocketServer instances
let localWsServer: WebSocketServer | null = null;
let vercelWsServer: WebSocketServer | null = null;

// Store ping interval IDs for cleanup
let localPingIntervalId: NodeJS.Timeout | null = null;
let vercelPingIntervalId: NodeJS.Timeout | null = null;

const nodeIdsToMonitor = () => {
  return nodeIds.filter((nodeId) => nodeId !== undefined);
};

// Refactored function to initialize WebSocket event handlers for a given server instance
function initializeWebSocketEventHandlers(serverInstance: WebSocketServer) {
    console.log(`Initializing event handlers for a WebSocketServer instance.`);
    serverInstance.on("connection", (ws, req) => {
        const clientIp = req?.socket?.remoteAddress || req?.headers['x-forwarded-for'] || 'unknown';
        console.log(`Client connected to WebSocket from IP: ${clientIp}`);
        connectedClients.add(ws);
        (ws as any).isAlive = true;
        ws.on('pong', () => { (ws as any).isAlive = true; });

        if (Object.keys(nodeDataCache).length > 0) {
            try { ws.send(JSON.stringify(nodeDataCache)); }
            catch (err) { console.error("Error sending initial cache to new client:", err); }
        }

        if (connectedClients.size === 1 && !KEEP_OPCUA_ALIVE) {
            console.log("First client connected (not KEEP_ALIVE), ensuring OPC UA connection.");
            if (disconnectTimeout) {
                clearTimeout(disconnectTimeout);
                disconnectTimeout = null;
                console.log("Client reconnected, canceling scheduled OPC UA disconnection.");
            }
            if (!opcuaClient && !isConnectingOpcua) {
                connectOPCUA();
            } else if (opcuaSession && !dataInterval) {
                startDataPolling();
            }
        }

        ws.on("message", async (message) => {
            const messageString = message.toString();
            console.log("Received message from client:", messageString);
            let dataToWrite: Record<string, any>;
            try {
                dataToWrite = JSON.parse(messageString);
                if (typeof dataToWrite !== 'object' || dataToWrite === null || Object.keys(dataToWrite).length !== 1) {
                    throw new Error("Invalid message format. Expected object with one key-value pair.");
                }
            } catch (parseError) {
                console.error("Failed to parse message from client:", messageString, parseError);
                sendStatusToClient(ws, 'error', 'unknown', 'Invalid message format received.');
                return;
            }
            const nodeId = Object.keys(dataToWrite)[0];
            const value = dataToWrite[nodeId];
            if (!opcuaSession) {
                console.error(`Cannot write to OPC UA: No active session for Node ID ${nodeId}.`);
                sendStatusToClient(ws, 'error', nodeId, 'OPC UA session not active.');
                return;
            }
            const dataPointConfig = dataPoints.find(dp => dp.nodeId === nodeId);
            if (!dataPointConfig) {
                console.error(`Received write request for unknown or unconfigured Node ID: ${nodeId}`);
                sendStatusToClient(ws, 'error', nodeId, 'Node ID not configured for writing.');
                return;
            }
            let opcuaDataType: DataType;
            switch (dataPointConfig.dataType) {
                case 'Boolean': opcuaDataType = DataType.Boolean; break;
                case 'Float': opcuaDataType = DataType.Double; break;
                case 'Int16': opcuaDataType = DataType.Int16; break;
                default:
                    console.error(`Unsupported data type '${dataPointConfig.dataType}' for writing to ${nodeId}`);
                    sendStatusToClient(ws, 'error', nodeId, `Unsupported dataType: ${dataPointConfig.dataType}`);
                    return;
            }
            const nodeToWrite = { nodeId, attributeId: AttributeIds.Value, value: new DataValue({ value: { dataType: opcuaDataType, value } }) };
            try {
                console.log(`Attempting to write to Node ID ${nodeId} with value:`, value);
                const statusCode = await opcuaSession.write(nodeToWrite);
                if (statusCode.isGood()) {
                    console.log(`Successfully wrote value ${value} to Node ID ${nodeId}`);
                    sendStatusToClient(ws, 'success', nodeId);
                    const immediateUpdate: Record<string, any> = {};
                    const factor = dataPointConfig.factor ?? 1;
                    let displayValue = value;
                    if (typeof value === 'number') {
                        displayValue = !Number.isInteger(value) ? parseFloat((value * factor).toFixed(2)) : value * factor;
                    }
                    if (nodeDataCache[nodeId] !== displayValue) {
                        nodeDataCache[nodeId] = displayValue;
                        immediateUpdate[nodeId] = displayValue;
                        broadcast(JSON.stringify(immediateUpdate));
                    }
                } else {
                    console.error(`Failed to write to Node ID ${nodeId}. Status: ${statusCode.toString()}`);
                    sendStatusToClient(ws, 'error', nodeId, `OPC UA write failed: ${statusCode.toString()}`);
                }
            } catch (writeError) {
                console.error(`Error during OPC UA write for ${nodeId}:`, writeError);
                sendStatusToClient(ws, 'error', nodeId, `OPC UA write error: ${writeError instanceof Error ? writeError.message : 'Unknown'}`);
                if (writeError instanceof Error && (writeError.message.includes("BadSession") || writeError.message.includes("BadNotConnected"))) {
                    opcuaSession = null; stopDataPolling(); attemptReconnect("write_error_session_lost");
                }
            }
        });

        ws.on("close", () => {
            console.log("Client disconnected from WebSocket");
            connectedClients.delete(ws);
            if (connectedClients.size === 0 && !KEEP_OPCUA_ALIVE && opcuaClient) {
                const DISCONNECT_DELAY = 5000;
                console.log(`Last client disconnected, scheduling OPC UA disconnect in ${DISCONNECT_DELAY}ms.`);
                if (disconnectTimeout) clearTimeout(disconnectTimeout);
                disconnectTimeout = setTimeout(() => {
                    console.log("Executing scheduled OPC UA disconnection.");
                    disconnectOPCUA();
                    disconnectTimeout = null;
                }, DISCONNECT_DELAY);
            }
        });

        ws.on("error", (error) => {
            console.error("WebSocket client error:", error);
            connectedClients.delete(ws);
            ws.terminate();
            if (connectedClients.size === 0 && !KEEP_OPCUA_ALIVE && opcuaClient) {
                const DISCONNECT_DELAY = 5000;
                console.log(`Last client errored, scheduling OPC UA disconnect in ${DISCONNECT_DELAY}ms.`);
                if (disconnectTimeout) clearTimeout(disconnectTimeout);
                disconnectTimeout = setTimeout(() => {
                    console.log("Executing scheduled OPC UA disconnection after error.");
                    disconnectOPCUA();
                    disconnectTimeout = null;
                }, DISCONNECT_DELAY);
            }
        });
    });

    serverInstance.on("error", (error) => {
        console.error("WebSocket Server instance error:", error);
    });

    const pingInterval = setInterval(() => {
        serverInstance.clients.forEach(clientWs => {
            const wsClient = clientWs as WebSocket & { isAlive: boolean };
            if (wsClient.isAlive === false) {
                console.log("Client not responding to ping, terminating.");
                return wsClient.terminate();
            }
            wsClient.isAlive = false;
            wsClient.ping();
        });
    }, WEBSOCKET_HEARTBEAT_INTERVAL);

    if (process.env.VERCEL === "1") {
        vercelPingIntervalId = pingInterval;
    } else {
        localPingIntervalId = pingInterval;
    }
}


async function ensureWebSocketServerInitialized() {
    const isVercel = process.env.VERCEL === "1";
    let serverToUse: WebSocketServer | null = null;

    if (isVercel) {
        if (!vercelWsServer) {
            console.log("Initializing WebSocket server for Vercel (noServer: true)");
            vercelWsServer = new WebSocketServer({ noServer: true });
            initializeWebSocketEventHandlers(vercelWsServer);
        }
        serverToUse = vercelWsServer;
    } else { // Local development
        if (!localWsServer) {
            console.log(`Initializing WebSocket server locally on port ${WS_PORT}`);
            localWsServer = new WebSocketServer({ port: WS_PORT });
            initializeWebSocketEventHandlers(localWsServer);
        }
        serverToUse = localWsServer;
    }

    if (KEEP_OPCUA_ALIVE && (!opcuaClient || !opcuaSession) && !isConnectingOpcua) {
        console.log("KEEP_OPCUA_ALIVE is true, ensuring OPC UA connection.");
        // Ensure we don't call connectOPCUA if it's already running due to a previous call
        // from another concurrent request during a cold start. isConnectingOpcua helps.
        if (!isConnectingOpcua) {
            await connectOPCUA(); // `connectOPCUA` sets `isConnectingOpcua`
        }
    }
    return serverToUse; // Return the server instance for direct use in GET if needed.
}


async function connectOPCUA() {
  // The call to startWebSocketServer() or ensure it's started is now handled by ensureWebSocketServerInitialized()
  // which is called before or at the start of typical workflows.

  endpointUrl = OPC_UA_ENDPOINT_OFFLINE;
  if (opcuaClient && opcuaSession) {
    console.log("OPC UA session already active.");
    if(!dataInterval) startDataPolling(); // Ensure polling starts if session exists
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
        connectionStrategy: { maxRetry: 1, initialDelay: RECONNECT_DELAY, maxDelay: RECONNECT_DELAY * 3 },
        keepSessionAlive: true,
        securityMode: MessageSecurityMode.None,
        securityPolicy: SecurityPolicy.None,
        requestedSessionTimeout: SESSION_TIMEOUT,
      });

      opcuaClient.on("backoff", (retry, delay) => console.log(`OPC UA backoff: retry ${retry} in ${delay}ms`));
      opcuaClient.on("connection_lost", () => { console.error("OPC UA connection lost."); opcuaSession = null; stopDataPolling(); attemptReconnect("connection_lost"); });
      opcuaClient.on("connection_reestablished", () => {
        console.log("OPC UA connection re-established.");
        if (!opcuaSession) { console.log("Re-creating session."); createSessionAndStartPolling(); }
        connectionAttempts = 0;
      });
      opcuaClient.on("close", () => { console.log("OPC UA client connection closed."); opcuaSession = null; stopDataPolling(); attemptReconnect("close"); });
      opcuaClient.on("timed_out_request", (request) => console.warn("OPC UA request timed out:", request?.toString()));
    }

    if (!opcuaClient) throw new Error("OPC UA client not initialized.");
    await opcuaClient.connect(endpointUrl);
    console.log("OPC UA client connected to:", endpointUrl);
    await createSessionAndStartPolling();
    connectionAttempts = 0;
  } catch (err) {
    console.error(`Failed to connect OPC UA client to ${endpointUrl}:`, err);
    if (endpointUrl === OPC_UA_ENDPOINT_OFFLINE) {
      console.log("Falling back to online OPC UA endpoint...");
      endpointUrl = OPC_UA_ENDPOINT_ONLINE;
      if (opcuaClient) {
          try { await opcuaClient.disconnect(); console.log("Disconnected from offline before fallback."); }
          catch (disconnectErr) { console.warn("Error disconnecting before fallback:", disconnectErr); }
           try {
              await opcuaClient.connect(endpointUrl);
              console.log("OPC UA client connected to fallback:", endpointUrl);
              await createSessionAndStartPolling();
              connectionAttempts = 0;
          } catch (fallbackErr) {
              console.error("Failed to connect to fallback OPC UA:", fallbackErr);
              attemptReconnect("fallback_failure");
          }
      } else {
           console.error("OPC UA Client null during fallback.");
           attemptReconnect("fallback_client_null");
      }
    } else {
      attemptReconnect("initial_or_online_failure");
    }
  } finally {
    isConnectingOpcua = false;
  }
}

function attemptReconnect(reason: string) {
  const shouldAttempt = connectedClients.size > 0 || KEEP_OPCUA_ALIVE;
  if (!shouldAttempt || isConnectingOpcua || disconnectTimeout) {
    if (!shouldAttempt) console.log("No clients and not KEEP_ALIVE, not reconnecting OPC UA.");
    return;
  }
  if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
    connectionAttempts++;
    console.log(`OPC UA reconnect (${connectionAttempts}) due to: ${reason} in ${RECONNECT_DELAY}ms`);
    if (disconnectTimeout) clearTimeout(disconnectTimeout); // Should not happen here
    setTimeout(connectOPCUA, RECONNECT_DELAY);
  } else {
    console.warn("Max OPC UA reconnect attempts reached.");
  }
}

async function createSessionAndStartPolling() {
  if (!opcuaClient) { console.log("Cannot create session: OPC UA client non-existent."); attemptReconnect("session_no_client"); return; }
  if (opcuaSession) { console.log("Session already exists."); if(!dataInterval) startDataPolling(); return; }
  if (dataInterval) { console.log("Polling active without session. Stopping."); stopDataPolling(); }

  try {
    opcuaSession = await opcuaClient.createSession();
    console.log("OPC UA session created.");
    opcuaSession.on("session_closed", () => { console.log("OPC UA session closed event."); opcuaSession = null; stopDataPolling(); attemptReconnect("session_closed_event"); });
    opcuaSession.on("keepalive", (state) => console.log("OPC UA session keepalive:", state));
    opcuaSession.on("keepalive_failure", (state) => { console.error("OPC UA session keepalive failure:", state); opcuaSession = null; stopDataPolling(); attemptReconnect("keepalive_failure_event"); });
    startDataPolling();
  } catch (err) {
    console.error("Failed to create OPC UA session:", err);
    opcuaSession = null;
    attemptReconnect("session_creation_failure");
  }
}

function startDataPolling() {
  if (dataInterval) { /*console.log("Polling already running.");*/ return; }
  if (!opcuaSession) { console.log("Polling not started: No OPC UA session."); return; }
  console.log("Starting data polling...");
  dataInterval = setInterval(async () => {
    if (!opcuaSession) { console.log("No session in poll cycle, stopping."); stopDataPolling(); attemptReconnect("session_missing_in_poll"); return; }
    try {
      const nodesToRead = nodeIdsToMonitor().map(nodeId => ({ nodeId, attributeId: AttributeIds.Value }));
      if (nodesToRead.length === 0) { /*console.log("No nodes to monitor.");*/ return; }
      const dataValues = await opcuaSession.read(nodesToRead);
      const currentDataBatch: Record<string, any> = {};
      let changed = false;
      dataValues.forEach((dataValue, index) => {
        const nodeId = nodesToRead[index].nodeId;
        let newValue: any = "Error"; let readSuccess = false;
        if (dataValue.statusCode.isGood() && dataValue.value?.value !== null && dataValue.value?.value !== undefined) {
          const rawValue = dataValue.value.value;
          const dataPoint = dataPoints.find(p => p.nodeId === nodeId);
          const factor = dataPoint?.factor ?? 1;
          if (typeof rawValue === "number") {
            newValue = !Number.isInteger(rawValue) ? parseFloat((rawValue * factor).toFixed(2)) : rawValue * factor;
          } else { newValue = rawValue; }
          readSuccess = true;
        } else { console.warn(`Failed to read NodeId ${nodeId}: ${dataValue.statusCode.toString()}`); }
        if (nodeDataCache[nodeId] !== newValue || !(nodeId in nodeDataCache)) {
          currentDataBatch[nodeId] = newValue; nodeDataCache[nodeId] = newValue;
          if (readSuccess || nodeDataCache[nodeId] === "Error") changed = true;
        }
      });
      if (changed && Object.keys(currentDataBatch).length > 0 && connectedClients.size > 0) {
        broadcast(JSON.stringify(currentDataBatch));
      }
    } catch (err) {
      console.error("Error during OPC UA read poll:", err);
      if (err instanceof Error && (err.message.includes("BadSession") || err.message.includes("BadNotConnected") || err.message.includes("Socket is closed"))) {
        console.error("OPC UA Session/Connection error during poll. Reconnecting.");
        opcuaSession = null; stopDataPolling(); attemptReconnect("polling_error");
      }
    }
  }, POLLING_INTERVAL);
}

function stopDataPolling() {
  if (dataInterval) { clearInterval(dataInterval); dataInterval = null; /*console.log("Data polling stopped.");*/ }
}

function broadcast(data: string) {
    const serverToUse = process.env.VERCEL === "1" ? vercelWsServer : localWsServer;
    if (!serverToUse) {
        // console.warn("Broadcast: No active WebSocket server instance."); // Can be noisy if OPCUA connects before first client on Vercel
        return;
    }
    serverToUse.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try { client.send(data); }
            catch (err) { console.error("Error sending data to client during broadcast:", err); }
        }
    });
}

function sendStatusToClient(client: WebSocket, status: 'success' | 'error', nodeId: string, message?: string) {
    if (client.readyState === WebSocket.OPEN) {
        try { client.send(JSON.stringify({ status, nodeId, message })); }
        catch (err) { console.error(`Error sending status for ${nodeId} to client:`, err); }
    }
}

async function disconnectOPCUA() {
  if (isDisconnectingOpcua || !opcuaClient) return;
  isDisconnectingOpcua = true;
  console.log("Disconnecting OPC UA client and session...");
  stopDataPolling();
  if (opcuaSession) {
    try { console.log("Closing OPC UA session..."); await opcuaSession.close(); console.log("OPC UA session closed."); }
    catch (err) { console.error("Error closing OPC UA session:", err); }
    finally { opcuaSession = null; }
  }
  if (opcuaClient) {
    try { console.log("Disconnecting OPC UA client..."); await opcuaClient.disconnect(); console.log("OPC UA client disconnected."); }
    catch (err) { console.error("Error disconnecting OPC UA client:", err); }
    finally { opcuaClient = null; connectionAttempts = 0; }
  }
  isDisconnectingOpcua = false;
  console.log("OPC UA disconnection process finished.");
}

// Eager initialization when the module loads.
// This is important if KEEP_OPCUA_ALIVE is true.
(async () => {
    console.log("API Route Module Loaded. Ensuring WebSocket Server is initialized.");
    try {
        await ensureWebSocketServerInitialized();
    } catch (error) {
        console.error("Error during initial WebSocket server setup:", error);
    }
})();

export async function GET(req: NextRequest, res: NextResponse) { // res is not standard for Route Handlers but some examples use it
    const currentWsServer = await ensureWebSocketServerInitialized(); // Ensure server is ready and get the active instance
    const upgradeHeader = req.headers.get('upgrade');

    if (process.env.VERCEL === "1" && upgradeHeader?.toLowerCase() === 'websocket') {
        console.log("GET /api/opcua: Detected WebSocket upgrade request on Vercel.");
        if (vercelWsServer) { // We can't access socket directly in NextRequest
            // Vercel/Next.js edge runtime often uses a more direct way to handle upgrades.
            // The 'ws' library's handleUpgrade can be used if direct access to underlying request/socket is possible.
            // However, if `new WebSocketServer({ noServer: true })`'s 'connection' event fires automatically
            // when client connects to `/api/opcua`, explicit handling here might not be needed
            // or might conflict.

            // Key: Test if vercelWsServer.on('connection', (ws, req) => {...}) in initializeWebSocketEventHandlers
            // fires *without* the handleUpgrade call below. If it does, Vercel handles proxying well.
            // If not, you *might* need something like this (but it depends heavily on Vercel's internals):
            /*
            const head = req.headers.get('sec-websocket-key'); // Simplified, proper head buffer is complex here
            // In Next.js API routes, we can't directly access the socket
            // We rely on Vercel's automatic handling of WebSocket connections
            // when using WebSocketServer with {noServer: true}
            
            console.log("With noServer:true WSS, Vercel should handle the upgrade automatically.");
            // We cannot use traditional handleUpgrade because we don't have access to raw socket in NextRequest
            /* 
            // This won't work in Next.js API routes:
            vercelWsServer.handleUpgrade(req as any, req.socket as any, Buffer.from(head, 'base64'), (ws) => {
                vercelWsServer.emit('connection', ws, req);
            });
            */
            // For now, rely on Vercel's runtime + ws({noServer: true}) implicit handling.
            // The primary role of this GET for websockets is just to exist as an HTTP endpoint
            // that Vercel can then promote to a WebSocket connection.
             console.log("Relying on Vercel's implicit upgrade handling for noServer:true WSS.");
        } else {
            console.warn("Vercel upgrade detected, but vercelWsServer or req.socket not available.");
            return new NextResponse("WebSocket service not ready for upgrade.", { status: 503 });
        }
        // Return 101 Switching Protocols - The standard response after successful upgrade
        // The socket itself has been taken over by the WebSocket connection.
        // NOTE: Returning a Response body can sometimes break the upgrade on Vercel.
        // An empty Response might be safer if a response is strictly required by Next.js.
        const response = new Response(null, { status: 101 });
        // In some Vercel configurations, special headers are needed on the 101
        // response.ws.add মানে কী?
        // response.headers.set('upgrade', 'websocket');
        // response.headers.set('connection', 'Upgrade');
        return response;

    } else if (upgradeHeader?.toLowerCase() === 'websocket') {
        // Local development - ws://localhost:WS_PORT is handled directly by localWsServer,
        // not through this GET route. So an upgrade request here locally would be unexpected.
        console.warn("GET /api/opcua: WebSocket upgrade request received in non-Vercel/unexpected context.");
        return new NextResponse("WebSocket upgrade endpoint misconfigured for local.", { status: 426 });
    }

    // Standard HTTP GET handling (redirect or status message)
    const host = req.headers.get("host");
    // Correctly determine protocol, especially behind proxies
    const xForwardedProto = req.headers.get("x-forwarded-proto");
    let protocol = "http";
    if (xForwardedProto) {
        protocol = xForwardedProto.split(',')[0].trim(); // Handle multiple proxies
    } else if (req.headers.get("referer")?.startsWith("https://")) {
        protocol = "https";
    } else if (process.env.NODE_ENV === "production" && process.env.VERCEL_URL?.startsWith("https://")) { // Vercel prod usually https
        protocol = "https";
    }

    const origin = `${protocol}://${host}`;
    const isApiRouteAccess = req.nextUrl.pathname === '/api/opcua' || req.nextUrl.pathname === '/api/opcua/';

    if (isApiRouteAccess) {
        const dashboardUrl = new URL('/control', origin);
        console.log(`Redirecting API HTTP GET from ${req.url} to ${dashboardUrl.toString()}`);
        return NextResponse.redirect(dashboardUrl.toString(), { status: 302 });
    }

    return new NextResponse("OPC UA WebSocket Service is Running (HTTP Endpoint)", { status: 200 });
}

async function gracefulShutdown(signal: string) {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    if (disconnectTimeout) clearTimeout(disconnectTimeout);

    if (localPingIntervalId) { clearInterval(localPingIntervalId); console.log("Cleared local WebSocket ping interval.");}
    if (vercelPingIntervalId) { clearInterval(vercelPingIntervalId); console.log("Cleared Vercel WebSocket ping interval.");}

    const shutdownPromises: Promise<void>[] = [];

    const closeServer = (server: WebSocketServer | null, name: string): Promise<void> => {
        return new Promise<void>(resolve => {
            if (server) {
                console.log(`Closing ${name} WebSocket server instance...`);
                let clientCount = 0;
                server.clients.forEach(client => { clientCount++; client.terminate(); });
                console.log(`Terminated ${clientCount} clients for ${name}.`);
                server.close((err) => {
                    if (err) console.error(`Error closing ${name} WebSocket server:`, err);
                    else console.log(`${name} WebSocket server instance closed.`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    };

    shutdownPromises.push(closeServer(vercelWsServer, "Vercel"));
    shutdownPromises.push(closeServer(localWsServer, "Local"));

    try {
        await Promise.all(shutdownPromises);
        if (opcuaClient) { // Only disconnect OPC UA if it was ever connected
            await disconnectOPCUA();
        }
        console.log("Graceful shutdown complete.");
        process.exit(0);
    } catch (err) {
        console.error("Error during graceful shutdown:", err);
        process.exit(1);
    }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));