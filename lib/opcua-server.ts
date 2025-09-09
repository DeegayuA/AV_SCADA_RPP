// lib/opcua-server.ts
import { WS_PORT, OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from "@/config/constants";
import { dataPoints } from "@/config/dataPoints";
import {
  OPCUAClient,
  ClientSession,
  StatusCodes,
  AttributeIds,
  MessageSecurityMode,
  SecurityPolicy,
  DataType,
  DataValue,
  ClientSubscription,
  TimestampsToReturn,
} from "node-opcua";
import { WebSocketServer, WebSocket } from "ws";

// --- SINGLETON PATTERN using globalThis ---
// This ensures that in a development environment with hot-reloading,
// we don't end up with multiple server instances.

declare global {
  var wsServer: WebSocketServer | undefined;
  var opcuaClient: OPCUAClient | undefined;
  var opcuaSession: ClientSession | undefined;
  var opcuaSubscription: ClientSubscription | undefined;
  var isConnectingOpcua: boolean | undefined;
  var isDisconnectingOpcua: boolean | undefined;
  var connectionAttempts: number | undefined;
  var disconnectTimeout: NodeJS.Timeout | undefined;
  var pingIntervalId: NodeJS.Timeout | undefined;
  var connectionMonitorInterval: NodeJS.Timeout | undefined;
  var nodeDataCache: Record<string, any> | undefined;
  var connectedClients: Set<WebSocket> | undefined;
}

const initializeGlobal = <T>(name: keyof typeof globalThis, defaultValue: T): T => {
  if (!globalThis[name]) {
    globalThis[name] = defaultValue;
  }
  return globalThis[name] as T;
};

globalThis.endpointUrl = initializeGlobal('endpointUrl', OPC_UA_ENDPOINT_OFFLINE);
const RECONNECT_DELAY = 5000;
const SESSION_TIMEOUT = 60000;
const WEBSOCKET_HEARTBEAT_INTERVAL = 30000;
const CONNECTION_MONITOR_INTERVAL = 5000;
const OPCUA_MAX_RETRY = 3;
const OPCUA_RETRY_BACKOFF = [1500, 3000, 6000];

// Initialize global variables
globalThis.wsServer = initializeGlobal('wsServer', undefined);
globalThis.opcuaClient = initializeGlobal('opcuaClient', undefined);
globalThis.opcuaSession = initializeGlobal('opcuaSession', undefined);
globalThis.opcuaSubscription = initializeGlobal('opcuaSubscription', undefined);
globalThis.isConnectingOpcua = initializeGlobal('isConnectingOpcua', false);
globalThis.isDisconnectingOpcua = initializeGlobal('isDisconnectingOpcua', false);
globalThis.connectionAttempts = initializeGlobal('connectionAttempts', 0);
globalThis.disconnectTimeout = initializeGlobal('disconnectTimeout', undefined);
globalThis.pingIntervalId = initializeGlobal('pingIntervalId', undefined);
globalThis.connectionMonitorInterval = initializeGlobal('connectionMonitorInterval', undefined);
globalThis.nodeDataCache = initializeGlobal('nodeDataCache', {});
globalThis.connectedClients = initializeGlobal('connectedClients', new Set<WebSocket>());


const nodeIdsToMonitor = (): string[] => {
    const uniqueNodeIds = new Set<string>();
    dataPoints.forEach(dp => {
        if (dp.nodeId && dp.nodeId.trim() !== '') {
        uniqueNodeIds.add(dp.nodeId);
        }
    });
    return Array.from(uniqueNodeIds);
};

function broadcast(data: string) {
    if (!globalThis.wsServer) { return; }
    globalThis.wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try { client.send(data); }
            catch (err) { console.error("Error sending data to client during broadcast:", err); }
        }
    });
}

function broadcastError(message: string) {
    console.error(`Broadcasting backend error: ${message}`);
    const errorPayload = {
        type: 'backend-error',
        payload: {
            message,
            timestamp: new Date().toISOString(),
        }
    };
    broadcast(JSON.stringify(errorPayload));
}

async function stopSubscription() {
  if (globalThis.opcuaSubscription) {
    console.log("Stopping OPC UA subscription...");
    try {
      await globalThis.opcuaSubscription.terminate();
    } catch (err: any) {
      console.error("Error terminating subscription:", err.message);
    } finally {
      globalThis.opcuaSubscription = undefined;
      console.log("OPC UA subscription stopped.");
    }
  }
}

async function createSubscriptionAndMonitorItems() {
    if (!globalThis.opcuaSession) {
      console.error("Cannot create subscription without a session.");
      return;
    }

    if (globalThis.opcuaSubscription) {
      console.log("Terminating existing subscription before creating a new one.");
      await stopSubscription();
    }

    try {
      globalThis.opcuaSubscription = await globalThis.opcuaSession.createSubscription2({
        requestedPublishingInterval: 1000,
        requestedLifetimeCount: 600,
        requestedMaxKeepAliveCount: 10,
        maxNotificationsPerPublish: 100,
        publishingEnabled: true,
        priority: 10,
      });

      globalThis.opcuaSubscription
        .on("keepalive", () => { /* console.log("Subscription keepalive."); */ })
        .on("terminated", () => {
          console.error("CRITICAL: OPC UA Subscription terminated unexpectedly.");
          globalThis.opcuaSubscription = undefined;
          // Attempt to reconnect the whole stack to be safe
          attemptReconnect("subscription_terminated");
        });

      const monitorIds = nodeIdsToMonitor();
      console.log(`Setting up ${monitorIds.length} monitored items...`);

      const monitoredItems = await Promise.all(monitorIds.map(nodeId => {
        return globalThis.opcuaSubscription!.monitor(
          { nodeId: nodeId, attributeId: AttributeIds.Value },
          { samplingInterval: 1000, discardOldest: true, queueSize: 10 },
          TimestampsToReturn.Both
        );
      }));

      monitoredItems.forEach((monitoredItem, index) => {
        const nodeId = monitorIds[index];
        const dataPoint = dataPoints.find(p => p.nodeId === nodeId);
        monitoredItem.on("changed", (dataValue: DataValue) => {
          let newValue: any = globalThis.nodeDataCache![nodeId] ?? "Error";
          if (dataValue.statusCode.isGood() && dataValue.value?.value !== null && dataValue.value?.value !== undefined) {
            const rawValue = dataValue.value.value;
            const factor = dataPoint?.factor ?? 1;
            const decimalPlaces = dataPoint?.decimalPlaces ?? 2;

            if (typeof rawValue === "number") {
                if (dataPoint?.dataType === 'Float' || dataPoint?.dataType === 'Double' || !Number.isInteger(rawValue * factor)) {
                    newValue = parseFloat((rawValue * factor).toFixed(decimalPlaces));
                } else {
                    newValue = Math.round(rawValue * factor);
                }
            } else {
              newValue = rawValue;
            }
          }

          if (globalThis.nodeDataCache![nodeId] !== newValue || !(nodeId in globalThis.nodeDataCache!)) {
            globalThis.nodeDataCache![nodeId] = newValue;
            const update = { [nodeId]: newValue };
            broadcast(JSON.stringify(update));
          }
        });
      });
      console.log("Monitored items set up successfully.");
    } catch (err: any) {
      const errorMsg = `Failed to create subscription or monitor items: ${err.message}`;
      broadcastError(errorMsg);
      if (globalThis.opcuaSubscription) {
        await globalThis.opcuaSubscription.terminate();
        globalThis.opcuaSubscription = undefined;
      }
      attemptReconnect("subscription_creation_failure");
    }
}

async function createSessionAndStartSubscription() {
    if (!globalThis.opcuaClient) {
        console.log("Cannot create session: OPC UA client non-existent.");
        attemptReconnect("session_creation_no_client");
        return;
    }
    if (globalThis.opcuaSession) {
        console.log("OPC UA Session already exists. Ensuring subscription is active.");
        if (!globalThis.opcuaSubscription) {
            await createSubscriptionAndMonitorItems();
        }
        return;
    }

    try {
        globalThis.opcuaSession = await globalThis.opcuaClient.createSession();
        console.log(`OPC UA session created. SessionId: ${globalThis.opcuaSession.sessionId.toString()}`);
        globalThis.connectionAttempts = 0;

        globalThis.opcuaSession.on("session_closed", (statusCode) => {
            console.warn(`OPC UA SEvt: Session closed. Status: ${statusCode.toString()}`);
            globalThis.opcuaSession = undefined;
            stopSubscription();
            attemptReconnect("session_closed_event");
        });
        globalThis.opcuaSession.on("keepalive_failure", (state) => {
            console.error("OPC UA SEvt: Session keepalive failure:", state ? state.toString() : "No state info");
            globalThis.opcuaSession = undefined;
            stopSubscription();
            attemptReconnect("keepalive_failure_event");
        });

        await createSubscriptionAndMonitorItems();
    } catch (err: any) {
        const errorMsg = `Failed to create OPC UA session: ${err.message}`;
        broadcastError(errorMsg);
        globalThis.opcuaSession = undefined;
        attemptReconnect("session_creation_failure");
    }
}

function attemptReconnect(reason: string) {
    if (globalThis.isConnectingOpcua) {
        console.log("Not attempting reconnect: Connection attempt already in progress.");
        return;
    }
    console.log(`Scheduling OPC UA reconnect due to: ${reason}. Will try in ${RECONNECT_DELAY / 1000}s.`);
    setTimeout(() => {
        connectOPCUA().catch(err => console.error("Error from scheduled connectOPCUA:", err));
    }, RECONNECT_DELAY);
}

async function connectOPCUA() {
    if (globalThis.opcuaClient && globalThis.opcuaSession) {
      console.log("OPC UA session already active.");
      return;
    }
    if (globalThis.isConnectingOpcua || globalThis.isDisconnectingOpcua) {
      console.log("OPC UA connection/disconnection already in progress.");
      return;
    }

    globalThis.isConnectingOpcua = true;
    globalThis.connectionAttempts!++;
    // Use globalThis.endpointUrl
    console.log(`Attempting to connect to OPC UA server (attempt ${globalThis.connectionAttempts}): ${globalThis.endpointUrl}`);

    try {
      if (!globalThis.opcuaClient) {
        console.log("Creating new OPCUAClient instance.");
        globalThis.opcuaClient = OPCUAClient.create({
          endpointMustExist: false,
          connectionStrategy: { maxRetry: OPCUA_MAX_RETRY, initialDelay: OPCUA_RETRY_BACKOFF[0], maxDelay: OPCUA_RETRY_BACKOFF[OPCUA_RETRY_BACKOFF.length - 1] },
          keepSessionAlive: true,
          securityMode: MessageSecurityMode.None,
          securityPolicy: SecurityPolicy.None,
          requestedSessionTimeout: SESSION_TIMEOUT,
        });

        globalThis.opcuaClient.on("backoff", (retry, delay) => console.log(`OPC UA internal backoff: retry ${retry} in ${delay}ms`));
        globalThis.opcuaClient.on("connection_lost", () => { console.error("OPC UA CEvt: Connection lost."); globalThis.opcuaSession = undefined; stopSubscription(); attemptReconnect("connection_lost_event"); });
        globalThis.opcuaClient.on("connection_reestablished", () => {
          console.log("OPC UA CEvt: Connection re-established.");
          if (!globalThis.opcuaSession) { createSessionAndStartSubscription(); }
        });
        globalThis.opcuaClient.on("close", (err?: Error) => { console.log(`OPC UA CEvt: Connection closed.`); globalThis.opcuaSession = undefined; stopSubscription(); });
      }

      await globalThis.opcuaClient.connect(globalThis.endpointUrl as string);
      console.log("OPC UA client connected to:", globalThis.endpointUrl);
      await createSessionAndStartSubscription();
    } catch (err: any) {
      const errorMsg = `Failed to connect OPC UA client to ${globalThis.endpointUrl}: ${err.message}`;
      broadcastError(errorMsg);
      if (globalThis.endpointUrl === OPC_UA_ENDPOINT_OFFLINE && OPC_UA_ENDPOINT_ONLINE) {
        console.log("Falling back to online OPC UA endpoint...");
        globalThis.endpointUrl = OPC_UA_ENDPOINT_ONLINE;
        try {
            await globalThis.opcuaClient!.connect(globalThis.endpointUrl as string);
            console.log("OPC UA client connected to fallback:", globalThis.endpointUrl);
            await createSessionAndStartSubscription();
        } catch (fallbackErr: any) {
            const fallbackErrorMsg = `Failed to connect to fallback OPC UA: ${fallbackErr.message}`;
            broadcastError(fallbackErrorMsg);
            attemptReconnect("fallback_failure");
        }
      } else {
        attemptReconnect("initial_or_online_failure");
      }
    } finally {
      globalThis.isConnectingOpcua = false;
    }
}

function initializeWebSocketEventHandlers(serverInstance: WebSocketServer) {
    serverInstance.on("connection", (ws: WebSocket) => {
        console.log(`Client connected to WebSocket.`);
        globalThis.connectedClients!.add(ws);
        const wsWithAlive = ws as WebSocket & { isAlive: boolean };
        wsWithAlive.isAlive = true;
        ws.on('pong', () => { wsWithAlive.isAlive = true; });

        if (Object.keys(globalThis.nodeDataCache!).length > 0) {
            try { ws.send(JSON.stringify(globalThis.nodeDataCache)); }
            catch (err) { console.error("Error sending initial cache to new client:", err); }
        }

        ws.on("close", () => {
            console.log(`Client disconnected from WebSocket.`);
            globalThis.connectedClients!.delete(ws);
        });

        ws.on("error", (error) => {
            console.error(`WebSocket client error:`, error);
            globalThis.connectedClients!.delete(ws);
            ws.terminate();
        });
    });

    if (globalThis.pingIntervalId) clearInterval(globalThis.pingIntervalId);

    globalThis.pingIntervalId = setInterval(() => {
        serverInstance.clients.forEach(clientWs => {
            const wsClient = clientWs as WebSocket & { isAlive: boolean };
            if (wsClient.isAlive === false) return wsClient.terminate();
            wsClient.isAlive = false;
            wsClient.ping();
        });
    }, WEBSOCKET_HEARTBEAT_INTERVAL);
}

export function ensureServerInitialized() {
    if (!globalThis.wsServer) {
        console.log(`Initializing WebSocket server on port ${WS_PORT}`);
        globalThis.wsServer = new WebSocketServer({ port: WS_PORT });
        initializeWebSocketEventHandlers(globalThis.wsServer);
        console.log("WebSocket server initialized.");
    }

    if (!globalThis.opcuaClient && !globalThis.isConnectingOpcua) {
        console.log("OPC UA client not found, ensuring connection.");
        connectOPCUA().catch(console.error);
    }
}

export function getOpcuaStatus(): 'online' | 'offline' | 'disconnected' | 'connecting' {
    if (globalThis.isConnectingOpcua) {
        return 'connecting';
    }
    if (globalThis.opcuaSession && !globalThis.opcuaSession.sessionId.isEmpty() && globalThis.opcuaSubscription) {
        const url = globalThis.endpointUrl as string || '';
        if (url.startsWith('opc.tcp://192.168.') || url.startsWith('opc.tcp://10.') || (url.startsWith('opc.tcp://172.') && parseInt(url.split('.')[1],10) >= 16 && parseInt(url.split('.')[1],10) <= 31)) {
            return 'offline'; // Local connection
        }
        return 'online'; // Remote connection
    }
    return 'disconnected';
}

// Graceful shutdown
if (typeof process !== 'undefined') {
    process.on("SIGINT", async () => {
        console.log("Shutting down server...");
        if (globalThis.pingIntervalId) clearInterval(globalThis.pingIntervalId);
        if (globalThis.wsServer) {
            globalThis.wsServer.close();
        }
        if (globalThis.opcuaClient) {
            await globalThis.opcuaClient.disconnect();
        }
        process.exit(0);
    });
}
