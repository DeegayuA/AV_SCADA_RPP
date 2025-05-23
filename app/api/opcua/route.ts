// app/api/opcua/route.ts
import { WS_PORT, OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from "@/config/constants";
// Ensure DataPoint type in "@/config/dataPoints" includes "decimalPlaces?: number;"
import { dataPoints, nodeIds, DataPoint } from "@/config/dataPoints";
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

let endpointUrl: string = OPC_UA_ENDPOINT_OFFLINE; // Initialize with a default
const POLLING_INTERVAL = 3000;
const RECONNECT_DELAY = 5000;
const SESSION_TIMEOUT = 60000;
const WEBSOCKET_HEARTBEAT_INTERVAL = 30000;

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

let localWsServer: WebSocketServer | null = null;
let vercelWsServer: WebSocketServer | null = null;

let localPingIntervalId: NodeJS.Timeout | null = null;
let vercelPingIntervalId: NodeJS.Timeout | null = null;

const nodeIdsToMonitor = (): string[] => {
  return nodeIds.filter((nodeId): nodeId is string => nodeId !== undefined);
};

function initializeWebSocketEventHandlers(serverInstance: WebSocketServer) {
    console.log(`Initializing event handlers for WebSocketServer instance (PID: ${process.pid})`);
    serverInstance.on("connection", (ws, req) => {
        const clientIp = req?.socket?.remoteAddress || req?.headers['x-forwarded-for'] || 'unknown';
        console.log(`Client connected to WebSocket from IP: ${clientIp}`);
        connectedClients.add(ws);
        const wsWithAlive = ws as WebSocket & { isAlive: boolean };
        wsWithAlive.isAlive = true;
        ws.on('pong', () => { wsWithAlive.isAlive = true; });

        if (Object.keys(nodeDataCache).length > 0) {
            try { ws.send(JSON.stringify(nodeDataCache)); }
            catch (err) { console.error("Error sending initial cache to new client:", err); }
        }

        if (connectedClients.size === 1 && !KEEP_OPCUA_ALIVE) {
            console.log("First client connected (KEEP_OPCUA_ALIVE is false), ensuring OPC UA connection.");
            if (disconnectTimeout) {
                clearTimeout(disconnectTimeout);
                disconnectTimeout = null;
                console.log("Client reconnected, canceling scheduled OPC UA disconnection.");
            }
            if (!opcuaClient && !isConnectingOpcua) {
                connectOPCUA().catch(err => console.error("Error in connectOPCUA from WS connection:", err));
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

            // Corrected check: Rely on session and client existence
            if (!opcuaClient || !opcuaSession) {
                console.error(`Cannot write to OPC UA: No active client or session for Node ID ${nodeId}.`);
                sendStatusToClient(ws, 'error', nodeId, 'OPC UA session not active or client disconnected.');
                // Corrected check for attempting reconnect
                if (!isConnectingOpcua && (!opcuaClient || !opcuaSession)) {
                    attemptReconnect("write_attempt_no_session_or_client");
                }
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
                        // Ensure DataPoint type in config/dataPoints.ts includes decimalPlaces?: number;
                        const decimalPlaces = dataPointConfig.decimalPlaces ?? 2;
                        displayValue = !Number.isInteger(value * factor) ? parseFloat((value * factor).toFixed(decimalPlaces)) : value * factor;
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
            } catch (writeError: any) {
                console.error(`Error during OPC UA write for ${nodeId}:`, writeError);
                sendStatusToClient(ws, 'error', nodeId, `OPC UA write error: ${writeError?.message || 'Unknown'}`);
                if (writeError?.message?.includes("BadSession") || writeError?.message?.includes("BadNotConnected")) {
                    opcuaSession = null; stopDataPolling(); attemptReconnect("write_error_session_lost");
                }
            }
        });

        ws.on("close", () => {
            console.log(`Client disconnected from WebSocket. IP: ${clientIp}. Remaining clients: ${connectedClients.size-1}`);
            connectedClients.delete(ws);
            if (connectedClients.size === 0 && !KEEP_OPCUA_ALIVE && (opcuaClient || opcuaSession)) {
                const DISCONNECT_DELAY = 5000;
                console.log(`Last client disconnected, scheduling OPC UA disconnect in ${DISCONNECT_DELAY / 1000}s.`);
                if (disconnectTimeout) clearTimeout(disconnectTimeout);
                disconnectTimeout = setTimeout(() => {
                    console.log("Executing scheduled OPC UA disconnection.");
                    disconnectOPCUA().catch(err => console.error("Error during scheduled OPCUA disconnect:", err));
                    disconnectTimeout = null;
                }, DISCONNECT_DELAY);
            }
        });

        ws.on("error", (error) => {
            console.error(`WebSocket client error. IP: ${clientIp}:`, error);
            connectedClients.delete(ws);
            ws.terminate();
             if (connectedClients.size === 0 && !KEEP_OPCUA_ALIVE && (opcuaClient || opcuaSession)) {
                const DISCONNECT_DELAY = 5000;
                console.log(`Last client errored out, scheduling OPC UA disconnect in ${DISCONNECT_DELAY / 1000}s.`);
                if (disconnectTimeout) clearTimeout(disconnectTimeout);
                disconnectTimeout = setTimeout(() => {
                    console.log("Executing scheduled OPC UA disconnection after client error.");
                    disconnectOPCUA().catch(err => console.error("Error during scheduled OPCUA disconnect after error:", err));
                    disconnectTimeout = null;
                }, DISCONNECT_DELAY);
            }
        });
    });

    serverInstance.on("error", (error) => {
        console.error("WebSocket Server instance error:", error);
    });

    const activePingIntervalId = process.env.VERCEL === "1" ? vercelPingIntervalId : localPingIntervalId;
    if (activePingIntervalId) {
        clearInterval(activePingIntervalId);
    }

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
    let serverToUse: WebSocketServer | null = isVercel ? vercelWsServer : localWsServer;

    if (!serverToUse) {
        if (isVercel) {
            console.log("Initializing WebSocket server for Vercel (noServer: true)");
            vercelWsServer = new WebSocketServer({ noServer: true });
            initializeWebSocketEventHandlers(vercelWsServer);
            serverToUse = vercelWsServer;
        } else {
            console.log(`Initializing WebSocket server locally on port ${WS_PORT}`);
            localWsServer = new WebSocketServer({ port: WS_PORT });
            initializeWebSocketEventHandlers(localWsServer);
            serverToUse = localWsServer;
        }
    }

    if (KEEP_OPCUA_ALIVE && (!opcuaClient || !opcuaSession) && !isConnectingOpcua) {
        console.log("KEEP_OPCUA_ALIVE is true, ensuring OPC UA connection.");
        if (!isConnectingOpcua) {
            await connectOPCUA();
        }
    }
    return serverToUse;
}


async function connectOPCUA() {
  endpointUrl = OPC_UA_ENDPOINT_OFFLINE;
  // Corrected check: Rely on session and client existence
  if (opcuaClient && opcuaSession) {
    console.log("OPC UA session already active and client presumed connected.");
    if(!dataInterval) startDataPolling();
    return;
  }
  if (isConnectingOpcua || isDisconnectingOpcua) {
    console.log("OPC UA connection/disconnection already in progress.");
    return;
  }

  isConnectingOpcua = true;
  connectionAttempts++;
  console.log(`Attempting to connect to OPC UA server (attempt ${connectionAttempts}): ${endpointUrl}`);

  try {
    if (!opcuaClient) {
      console.log("Creating new OPCUAClient instance.");
      opcuaClient = OPCUAClient.create({
        endpointMustExist: false,
        connectionStrategy: { maxRetry: 0, initialDelay: RECONNECT_DELAY, maxDelay: RECONNECT_DELAY * 2 },
        keepSessionAlive: true,
        securityMode: MessageSecurityMode.None,
        securityPolicy: SecurityPolicy.None,
        requestedSessionTimeout: SESSION_TIMEOUT,
        clientName: `MyNextJsApp-PID${process.pid}`
      });

      opcuaClient.on("backoff", (retry, delay) => console.log(`OPC UA internal backoff: retry ${retry} in ${delay}ms (Note: custom retry logic is primary)`));
      opcuaClient.on("connection_lost", () => { console.error("OPC UA CEvt: Connection lost."); opcuaSession = null; stopDataPolling(); attemptReconnect("connection_lost_event"); });
      opcuaClient.on("connection_reestablished", () => {
        console.log("OPC UA CEvt: Connection re-established.");
        if (!opcuaSession) { console.log("Re-creating session after re-established connection."); createSessionAndStartPolling(); }
      });
      // Typed err parameter
      opcuaClient.on("close", (err?: Error) => { console.log(`OPC UA CEvt: Connection closed. Error: ${err ? err.message : 'No error info'}`); opcuaSession = null; stopDataPolling(); });
      opcuaClient.on("timed_out_request", (request) => console.warn("OPC UA CEvt: Request timed out:", request?.toString().substring(0,100)));
    }

    if (!opcuaClient) throw new Error("OPC UA client somehow still not initialized.");

    await opcuaClient.connect(endpointUrl);
    console.log("OPC UA client connected to:", endpointUrl);
    await createSessionAndStartPolling();
  } catch (err: any) {
    console.error(`Failed to connect OPC UA client to ${endpointUrl}:`, err.message);
    // Corrected comparison with type assertion to satisfy TS strict literal checks if constants are literals
    if (endpointUrl === OPC_UA_ENDPOINT_OFFLINE && OPC_UA_ENDPOINT_ONLINE && (OPC_UA_ENDPOINT_ONLINE as string) !== (OPC_UA_ENDPOINT_OFFLINE as string)) {
      console.log("Falling back to online OPC UA endpoint...");
      endpointUrl = OPC_UA_ENDPOINT_ONLINE;
      try {
          if (opcuaClient) {
            await opcuaClient.connect(endpointUrl);
            console.log("OPC UA client connected to fallback:", endpointUrl);
            await createSessionAndStartPolling();
          } else {
             console.error("OPC UA Client became null before fallback connection attempt.");
             attemptReconnect("fallback_client_null_state");
          }
      } catch (fallbackErr: any) {
          console.error("Failed to connect to fallback OPC UA:", fallbackErr.message);
          attemptReconnect("fallback_failure");
      }
    } else {
      attemptReconnect("initial_or_online_failure");
    }
  } finally {
    isConnectingOpcua = false;
  }
}

function attemptReconnect(reason: string) {
  const shouldAttempt = (connectedClients.size > 0 || KEEP_OPCUA_ALIVE) && !isDisconnectingOpcua;
  if (!shouldAttempt) {
    if (isDisconnectingOpcua) console.log("Not attempting reconnect: OPC UA disconnection is in progress.");
    else console.log("Not attempting reconnect: No clients and KEEP_OPCUA_ALIVE is false.");
    return;
  }
  if (isConnectingOpcua) {
      console.log("Not attempting reconnect: Connection attempt already in progress.");
      return;
  }
  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS && MAX_CONNECTION_ATTEMPTS !== Infinity) {
    console.warn("Max OPC UA reconnect attempts reached. Not attempting further auto-reconnects.");
    return;
  }

  console.log(`Scheduling OPC UA reconnect due to: ${reason}. Will try in ${RECONNECT_DELAY / 1000}s.`);
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout);
    disconnectTimeout = null;
  }
  setTimeout(() => {
      connectOPCUA().catch(err => console.error("Error from scheduled connectOPCUA:", err));
  }, RECONNECT_DELAY);
}

async function createSessionAndStartPolling() {
  // Corrected check: Relies on opcuaClient existence. `connectOPCUA` ensures client is connected before calling this.
  if (!opcuaClient) {
      console.log("Cannot create session: OPC UA client non-existent.");
      // It's unlikely this specific path is hit if called from connectOPCUA's success path.
      // But as a general safeguard for other potential callers:
      attemptReconnect("session_creation_no_client");
      return;
  }
  if (opcuaSession) {
      console.log("OPC UA Session already exists. Ensuring polling is active.");
      if(!dataInterval) startDataPolling();
      return;
  }
  if (dataInterval) { console.log("Polling was active without session. Stopping polling before creating new session."); stopDataPolling(); }

  try {
    opcuaSession = await opcuaClient.createSession();
    console.log(`OPC UA session created. SessionId: ${opcuaSession.sessionId.toString()}`);
    connectionAttempts = 0;

    opcuaSession.on("session_closed", (statusCode) => {
        console.warn(`OPC UA SEvt: Session closed. Status: ${statusCode.toString()}`);
        opcuaSession = null;
        stopDataPolling();
        attemptReconnect("session_closed_event");
    });
    opcuaSession.on("keepalive", (state) => {/*console.log("OPC UA SEvt: Session keepalive:", state.toString());*/});
    opcuaSession.on("keepalive_failure", (state) => {
        console.error("OPC UA SEvt: Session keepalive failure:", state ? state.toString() : "No state info");
        opcuaSession = null; stopDataPolling(); attemptReconnect("keepalive_failure_event");
    });
    startDataPolling();
  } catch (err: any) {
    console.error("Failed to create OPC UA session:", err.message);
    opcuaSession = null;
    attemptReconnect("session_creation_failure");
  }
}

function startDataPolling() {
  if (dataInterval) { return; }
  if (!opcuaSession) { console.log("Polling not started: No OPC UA session."); return; }
  if (nodeIdsToMonitor().length === 0) { console.log("No nodes configured to monitor. Polling will not start effectively."); return;}

  console.log("Starting data polling...");
  dataInterval = setInterval(async () => {
    // Corrected check
    if (!opcuaClient || !opcuaSession) {
        console.warn("No client or session in poll cycle, stopping polling.");
        stopDataPolling();
        attemptReconnect("session_or_client_missing_in_poll");
        return;
    }
    try {
      const nodesToRead = nodeIdsToMonitor().map(nodeId => ({ nodeId, attributeId: AttributeIds.Value }));
      if (nodesToRead.length === 0) return;

      const dataValues = await opcuaSession.read(nodesToRead);
      const currentDataBatch: Record<string, any> = {};
      let changed = false;

      dataValues.forEach((dataValue, index) => {
        const nodeId = nodesToRead[index].nodeId;
        let newValue: any = nodeDataCache[nodeId] !== undefined ? nodeDataCache[nodeId] : "Error";
        let readSuccess = false;

        if (dataValue.statusCode.isGood() && dataValue.value?.value !== null && dataValue.value?.value !== undefined) {
          const rawValue = dataValue.value.value;
          const dataPoint = dataPoints.find(p => p.nodeId === nodeId);
          const factor = dataPoint?.factor ?? 1;
          // Ensure DataPoint type in config/dataPoints.ts includes decimalPlaces?: number;
          const decimalPlaces = dataPoint?.decimalPlaces ?? 2;

          if (typeof rawValue === "number") {
            if (dataPoint?.dataType === 'Float' || (dataPoint?.dataType === undefined && !Number.isInteger(rawValue * factor)) ) {
                newValue = parseFloat((rawValue * factor).toFixed(decimalPlaces));
            } else {
                newValue = Math.round(rawValue * factor);
            }
          } else { newValue = rawValue; }
          readSuccess = true;
        } else {
          if(dataValue.statusCode !== StatusCodes.BadNodeIdUnknown && dataValue.statusCode !== StatusCodes.BadNodeIdInvalid){
            console.warn(`Failed to read NodeId ${nodeId}: ${dataValue.statusCode.toString()}`);
          }
          if(!readSuccess && nodeDataCache[nodeId] !== "Error") { newValue = "Error"; }
        }

        if (nodeDataCache[nodeId] !== newValue || !(nodeId in nodeDataCache)) {
          nodeDataCache[nodeId] = newValue;
          currentDataBatch[nodeId] = newValue;
          changed = true;
        }
      });

      if (changed && Object.keys(currentDataBatch).length > 0 && connectedClients.size > 0) {
        broadcast(JSON.stringify(currentDataBatch));
      }
    } catch (err: any) {
      console.error("Error during OPC UA read poll:", err.message);
      if (err.message?.includes("BadSession") || err.message?.includes("BadNotConnected") || err.message?.includes("Socket is closed") || err.message?.includes("BadSecureChannelClosed")) {
        console.error("OPC UA Session/Connection error during poll. Will attempt to reconnect.");
        if (opcuaSession) opcuaSession = null;
        stopDataPolling();
        attemptReconnect("polling_error_session_connection");
      }
    }
  }, POLLING_INTERVAL);
}

function stopDataPolling() {
  if (dataInterval) { clearInterval(dataInterval); dataInterval = null; console.log("Data polling stopped."); }
}

function broadcast(data: string) {
    const serverToUse = process.env.VERCEL === "1" ? vercelWsServer : localWsServer;
    if (!serverToUse) { return; }
    if (serverToUse.clients.size === 0) { return; }
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
  if (isDisconnectingOpcua) {
    console.log("OPC UA disconnection already in progress.");
    return;
  }
  if (!opcuaClient && !opcuaSession) {
      console.log("OPC UA already disconnected or never connected.");
      return;
  }

  isDisconnectingOpcua = true;
  console.log("Disconnecting OPC UA client and session...");
  stopDataPolling();

  if (opcuaSession) {
    try {
      console.log("Closing OPC UA session...");
      await opcuaSession.close(true);
      console.log("OPC UA session closed.");
    } catch (err: any) {
      console.error("Error closing OPC UA session:", err.message);
    } finally {
      opcuaSession = null;
    }
  }

  if (opcuaClient) {
    try {
      console.log("Disconnecting OPC UA client...");
      await opcuaClient.disconnect();
      console.log("OPC UA client disconnected.");
    } catch (err: any) {
      console.error("Error disconnecting OPC UA client:", err.message);
    } finally {
      opcuaClient = null;
      connectionAttempts = 0;
    }
  }
  isDisconnectingOpcua = false;
  console.log("OPC UA disconnection process finished.");
}

(async () => {
    if (typeof process !== 'undefined' && process.pid) {
        console.log(`API Route Module Loaded (PID: ${process.pid}). Ensuring WebSocket Server and OPC UA (if KEEP_ALIVE) are initialized.`);
        try {
            await ensureWebSocketServerInitialized();
        } catch (error) {
            console.error("Error during initial server setup:", error);
        }
    }
})();

export async function GET(req: NextRequest) {
    await ensureWebSocketServerInitialized();
    const upgradeHeader = req.headers.get('upgrade');

    if (upgradeHeader?.toLowerCase() === 'websocket') {
        console.log(`GET /api/opcua: Detected WebSocket upgrade request (Vercel: ${process.env.VERCEL === "1"})`);
        if (process.env.VERCEL === "1") {
            if (vercelWsServer) {
                console.log("Relying on Vercel's implicit WebSocket upgrade handling for 'noServer: true' WSS.");
                const response = new Response(null, { status: 101 });
                return response;
            } else {
                console.error("Vercel WebSocket upgrade detected, but vercelWsServer not initialized.");
                return new NextResponse("WebSocket service not ready.", { status: 503 });
            }
        } else {
            console.warn("WebSocket upgrade request to /api/opcua in local/non-Vercel env. This path is not for direct WS upgrades locally.");
            return new NextResponse("Misconfigured WebSocket upgrade. Connect directly to ws port.", { status: 426 });
        }
    }

    const host = req.headers.get("host") || "";
    const reqUrl = req.nextUrl;
    
    const xForwardedProto = req.headers.get("x-forwarded-proto");
    let protocol = "http";
    if (xForwardedProto) {
        protocol = xForwardedProto.split(',')[0].trim();
    } else if (req.nextUrl.protocol) {
        protocol = req.nextUrl.protocol.slice(0, -1);
    } else if (process.env.NODE_ENV === "production" && host.includes("vercel.app")) {
        protocol = "https";
    }
    const origin = `${protocol}://${host}`;

    if (reqUrl.pathname === '/api/opcua' || reqUrl.pathname === '/api/opcua/') {
        const dashboardUrl = new URL('/control', origin);
        console.log(`HTTP GET to /api/opcua, redirecting to ${dashboardUrl.toString()}`);
        return NextResponse.redirect(dashboardUrl.toString(), 302);
    }

    return new NextResponse("OPC UA WebSocket Service is active. This is the HTTP endpoint.", { status: 200 });
}


async function gracefulShutdown(signal: string) {
    console.log(`Received ${signal}. Initiating graceful shutdown (PID: ${process.pid})...`);
    if (disconnectTimeout) clearTimeout(disconnectTimeout);

    if (localPingIntervalId) { clearInterval(localPingIntervalId); console.log("Cleared local WebSocket ping interval."); localPingIntervalId = null;}
    if (vercelPingIntervalId) { clearInterval(vercelPingIntervalId); console.log("Cleared Vercel WebSocket ping interval."); vercelPingIntervalId = null;}

    const shutdownPromises: Promise<void>[] = [];

    const closeWebSocketServer = (server: WebSocketServer | null, name: string): Promise<void> => {
        return new Promise((resolve) => {
            if (server) {
                console.log(`Closing ${name} WebSocket server...`);
                let activeClients = 0;
                server.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
                        activeClients++;
                        client.terminate();
                    }
                });
                console.log(`Terminated ${activeClients} client(s) for ${name} server.`);
                server.close((err) => {
                    if (err) console.error(`Error closing ${name} WebSocket server:`, err);
                    else console.log(`${name} WebSocket server closed.`);
                    resolve();
                });
                setTimeout(() => {
                    console.warn(`${name} WebSocket server close timed out.`);
                    resolve();
                }, 5000);
            } else {
                resolve();
            }
        });
    };

    shutdownPromises.push(closeWebSocketServer(localWsServer, "Local"));
    shutdownPromises.push(closeWebSocketServer(vercelWsServer, "Vercel"));

    try {
        await Promise.all(shutdownPromises);
        console.log("All WebSocket servers notified or closed.");

        if (opcuaClient || opcuaSession) {
            console.log("Proceeding with OPC UA disconnection...");
            await disconnectOPCUA();
        } else {
            console.log("OPC UA was not active, no disconnection needed.");
        }

        console.log("Graceful shutdown sequence complete.");
        setTimeout(() => process.exit(0), 1000);

    } catch (err) {
        console.error("Error during graceful shutdown:", err);
        setTimeout(() => process.exit(1), 1000);
    }
}

if (typeof process !== 'undefined') {
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on('uncaughtException', (error, origin) => {
        console.error(`Uncaught Exception (PID: ${process.pid}):`, error);
        console.error('Exception origin:', origin);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error(`Unhandled Rejection at (PID: ${process.pid}):`, promise);
        console.error('Reason:', reason);
    });
}