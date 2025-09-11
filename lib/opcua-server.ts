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
  BrowseDirection,
  NodeClass,
  BrowseDescription,
  NodeId,
  ClientSubscription,
  TimestampsToReturn,
} from "node-opcua";
import { WebSocketServer, WebSocket } from "ws";
import { promises as fs } from 'fs';
import path from 'path';

// --- SINGLETON PATTERN using global ---
const g = global as any;

if (!g._opcua_initialized) {
    g.wsServer = undefined;
    g.opcuaClient = undefined;
    g.opcuaSession = undefined;
    g.opcuaSubscription = undefined;
    g.isConnectingOpcua = false;
    g.isDisconnectingOpcua = false;
    g.connectionAttempts = 0;
    g.disconnectTimeout = undefined;
    g.pingIntervalId = undefined;
    g.connectionMonitorInterval = undefined;
    g.nodeDataCache = {};
    g.connectedClients = new Set<WebSocket>();
    g.endpointUrl = OPC_UA_ENDPOINT_OFFLINE;
    g.discoveryProgressCache = {
        status: "idle",
        percentage: 0,
        details: "No discovery process has been initiated yet.",
        timestamp: Date.now()
    };
    g._opcua_initialized = true;
}

const RECONNECT_DELAY = 5000;
const SESSION_TIMEOUT = 60000;
const WEBSOCKET_HEARTBEAT_INTERVAL = 30000;
const CONNECTION_MONITOR_INTERVAL = 5000;
const OPCUA_MAX_RETRY = 3;
const OPCUA_RETRY_BACKOFF = [1500, 3000, 6000];

// --- Types ---
export interface DiscoveredDataPoint {
    name: string;
    address: string;
    initialValue: any;
    dataType: string;
}

// --- Helper Functions ---
function getDataTypeString(dataTypeEnumValue: number): string {
    if (DataType[dataTypeEnumValue]) {
      return DataType[dataTypeEnumValue];
    }
    switch (dataTypeEnumValue) {
      case DataType.Float: return "Float";
      case DataType.Double: return "Double";
      case DataType.Int16: return "Int16";
      case DataType.Int32: return "Int32";
      case DataType.Boolean: return "Boolean";
      case DataType.String: return "String";
      default: return `Unknown (${dataTypeEnumValue})`;
    }
}

async function mapDataTypeNodeIdToString(dataTypeNodeId: NodeId, session: ClientSession): Promise<string> {
    if (dataTypeNodeId.namespace === 0 && typeof dataTypeNodeId.value === 'number') {
      return getDataTypeString(dataTypeNodeId.value);
    } else {
      try {
        const browseNameDataValue = await session.read({ nodeId: dataTypeNodeId, attributeId: AttributeIds.BrowseName });
        if (browseNameDataValue.statusCode.isGood() && browseNameDataValue.value?.value) {
          return browseNameDataValue.value.value.name || `CustomType (ns=${dataTypeNodeId.namespace};i=${dataTypeNodeId.value})`;
        }
        return `CustomType (ns=${dataTypeNodeId.namespace};s=${dataTypeNodeId.value})`;
      } catch (error) {
        console.error(`Error reading BrowseName for DataType NodeId ${dataTypeNodeId.toString()}:`, error);
        return `UnknownCustomType (NodeId: ${dataTypeNodeId.toString()})`;
      }
    }
}

function broadcast(data: string) {
    if (!g.wsServer) { return; }
    g.wsServer.clients.forEach((client: WebSocket) => {
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
        payload: message
    };
    broadcast(JSON.stringify(errorPayload));
}

function sendToastToClient(ws: WebSocket, severity: 'success' | 'error' | 'warning' | 'info' | 'default', message: string, description?: string, duration?: number, id?: string) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({
        type: 'toast',
        payload: { severity, message, description, duration, id }
      }));
    } catch (err) {
      console.error("Error sending toast message to client:", err);
    }
  }
}

// --- Core OPC-UA and WebSocket Logic ---

async function stopSubscription() {
    if (g.opcuaSubscription) {
      console.log("Stopping OPC UA subscription...");
      try {
        await g.opcuaSubscription.terminate();
      } catch (err: any) {
        console.error("Error terminating subscription:", err.message);
      } finally {
        g.opcuaSubscription = undefined;
        console.log("OPC UA subscription stopped.");
      }
    }
}

async function createSubscriptionAndMonitorItems() {
    if (!g.opcuaSession) {
        broadcastError("Cannot create subscription: No active session.");
        return;
    }
    if (g.opcuaSubscription) {
        await stopSubscription();
    }
    try {
        g.opcuaSubscription = await g.opcuaSession.createSubscription2({
            requestedPublishingInterval: 1000,
            requestedLifetimeCount: 600,
            requestedMaxKeepAliveCount: 10,
            maxNotificationsPerPublish: 100,
            publishingEnabled: true,
            priority: 10,
        });
        g.opcuaSubscription
            .on("keepalive", () => {})
            .on("terminated", () => {
                broadcastError("CRITICAL: OPC UA Subscription terminated unexpectedly.");
                g.opcuaSubscription = undefined;
                attemptReconnect("subscription_terminated");
            });

        const monitorIds = dataPoints.map(dp => dp.nodeId).filter(Boolean);
        const monitoredItems = await Promise.all(monitorIds.map(nodeId =>
            g.opcuaSubscription.monitor(
                { nodeId, attributeId: AttributeIds.Value },
                { samplingInterval: 1000, discardOldest: true, queueSize: 10 },
                TimestampsToReturn.Both
            )
        ));

        monitoredItems.forEach((monitoredItem, index) => {
            const dataPoint = dataPoints.find(dp => dp.nodeId === monitorIds[index]);
            monitoredItem.on("changed", (dataValue: DataValue) => {
                if (dataValue.statusCode.isGood() && dataValue.value?.value !== null) {
                    const rawValue = dataValue.value.value;
                    const factor = dataPoint?.factor ?? 1;
                    const decimalPlaces = dataPoint?.decimalPlaces ?? 2;
                    let newValue: any = rawValue;
                    if (typeof rawValue === "number") {
                        newValue = parseFloat((rawValue * factor).toFixed(decimalPlaces));
                    }
                    if (g.nodeDataCache[monitorIds[index]] !== newValue) {
                        g.nodeDataCache[monitorIds[index]] = newValue;
                        broadcast(JSON.stringify({ [monitorIds[index]]: newValue }));
                    }
                }
            });
        });
        console.log("Monitored items set up successfully.");
    } catch (err: any) {
        const errorMsg = `Failed to create subscription: ${err.message}`;
        broadcastError(errorMsg);
        await stopSubscription();
        attemptReconnect("subscription_creation_failure");
    }
}

async function createSessionAndStartSubscription() {
    if (!g.opcuaClient) {
        broadcastError("Cannot create session: OPC UA client non-existent.");
        attemptReconnect("session_creation_no_client");
        return;
    }
    if (g.opcuaSession) {
        await createSubscriptionAndMonitorItems();
        return;
    }
    try {
        g.opcuaSession = await g.opcuaClient.createSession();
        g.connectionAttempts = 0;
        g.opcuaSession.on("session_closed", (statusCode?: StatusCodes) => {
            broadcastError(`OPC UA Session closed. Status: ${statusCode?.toString()}`);
            g.opcuaSession = undefined;
            stopSubscription();
            attemptReconnect("session_closed_event");
        });
        await createSubscriptionAndMonitorItems();
    } catch (err: any) {
        const errorMsg = `Failed to create OPC UA session: ${err.message}`;
        broadcastError(errorMsg);
        g.opcuaSession = undefined;
        attemptReconnect("session_creation_failure");
    }
}

export function attemptReconnect(reason: string) {
    if (g.isConnectingOpcua) return;
    console.log(`Scheduling OPC UA reconnect due to: ${reason}.`);
    setTimeout(() => connectOPCUA().catch(console.error), RECONNECT_DELAY);
}

async function connectOPCUA() {
    if (g.opcuaClient && g.opcuaSession) return;
    if (g.isConnectingOpcua) return;
    g.isConnectingOpcua = true;
    g.connectionAttempts++;
    try {
        if (!g.opcuaClient) {
            g.opcuaClient = OPCUAClient.create({
                endpointMustExist: false,
                connectionStrategy: { maxRetry: OPCUA_MAX_RETRY, initialDelay: 1000, maxDelay: 5000 },
                securityMode: MessageSecurityMode.None,
                securityPolicy: SecurityPolicy.None,
                requestedSessionTimeout: SESSION_TIMEOUT,
            });
            g.opcuaClient.on("connection_lost", () => {
                broadcastError("OPC UA Connection lost.");
                g.opcuaSession = undefined;
                stopSubscription();
                attemptReconnect("connection_lost_event");
            });
        }
        await g.opcuaClient.connect(g.endpointUrl);
        await createSessionAndStartSubscription();
    } catch (err: any) {
        const errorMsg = `Failed to connect to ${g.endpointUrl}: ${err.message}`;
        broadcastError(errorMsg);
        if (g.endpointUrl === OPC_UA_ENDPOINT_OFFLINE && OPC_UA_ENDPOINT_ONLINE) {
            g.endpointUrl = OPC_UA_ENDPOINT_ONLINE;
            attemptReconnect("fallback_to_online");
        } else {
            attemptReconnect("connection_failure");
        }
    } finally {
        g.isConnectingOpcua = false;
    }
}

function initializeWebSocketEventHandlers(serverInstance: WebSocketServer) {
    serverInstance.on("connection", (ws: WebSocket) => {
        g.connectedClients.add(ws);
        if (Object.keys(g.nodeDataCache).length > 0) {
            ws.send(JSON.stringify(g.nodeDataCache));
        }

        ws.on("message", async (message) => {
            const messageString = message.toString();
            let parsedMessage: any;
            try {
                parsedMessage = JSON.parse(messageString);
            } catch (e) {
                broadcastError("Invalid JSON message received from client.");
                return;
            }

            if (parsedMessage.type === 'controlWrite' && parsedMessage.payload) {
                const { nodeId, value } = parsedMessage.payload;
                const dataPointConfig = dataPoints.find(dp => dp.nodeId === nodeId);

                if (!dataPointConfig) {
                    broadcastError(`ControlWrite failed: Node ID '${nodeId}' not configured.`);
                    return;
                }

                if (!g.opcuaSession) {
                    broadcastError("ControlWrite failed: OPC UA session not active.");
                    return;
                }

                let opcuaDataType: DataType;
                switch (dataPointConfig.dataType) {
                    case 'Boolean': opcuaDataType = DataType.Boolean; break;
                    case 'Float': opcuaDataType = DataType.Float; break;
                    case 'Double': opcuaDataType = DataType.Double; break;
                    case 'Int16': opcuaDataType = DataType.Int16; break;
                    case 'Int32': opcuaDataType = DataType.Int32; break;
                    default:
                        broadcastError(`Unsupported data type '${dataPointConfig.dataType}' for write on node '${nodeId}'.`);
                        return;
                }
                const nodeToWrite = { nodeId, attributeId: AttributeIds.Value, value: new DataValue({ value: { dataType: opcuaDataType, value } }) };
                try {
                    const statusCode = await g.opcuaSession.write(nodeToWrite);
                    if (statusCode.isGood()) {
                        sendToastToClient(ws, 'success', `Successfully wrote ${value} to ${dataPointConfig.name}.`);
                        const factor = dataPointConfig.factor ?? 1;
                        const decimalPlaces = dataPointConfig.decimalPlaces ?? 2;
                        let displayValue = typeof value === 'number' ? parseFloat((value * factor).toFixed(decimalPlaces)) : value;
                        if (g.nodeDataCache[nodeId] !== displayValue) {
                            g.nodeDataCache[nodeId] = displayValue;
                            broadcast(JSON.stringify({ [nodeId]: displayValue }));
                        }
                    } else {
                        broadcastError(`OPC UA write failed for ${dataPointConfig.name}: ${statusCode.toString()}`);
                    }
                } catch (writeError: any) {
                    broadcastError(`OPC UA write error for ${dataPointConfig.name}: ${writeError.message}`);
                    if (writeError?.message?.includes("BadSession")) {
                        g.opcuaSession = undefined;
                        stopSubscription();
                        attemptReconnect("controlWrite_error_session_lost");
                    }
                }
            }
        });

        ws.on("close", () => g.connectedClients.delete(ws));
        ws.on("error", (error: Error) => {
            console.error("WebSocket client error:", error);
            g.connectedClients.delete(ws);
            ws.terminate();
        });
    });
}

// --- Public Functions ---
export function ensureServerInitialized() {
    if (!g.wsServer) {
        console.log(`Initializing WebSocket server on port ${WS_PORT}`);
        g.wsServer = new WebSocketServer({ port: WS_PORT });
        initializeWebSocketEventHandlers(g.wsServer);
        console.log("WebSocket server initialized.");
    }
    if (!g.opcuaClient && !g.isConnectingOpcua) {
        console.log("OPC UA client not found, ensuring connection.");
        connectOPCUA().catch(console.error);
    }
}

export function getServerStatus(): { opc: 'connected' | 'connecting' | 'disconnected'; ws: 'connected' | 'disconnected' } {
    return {
        opc: g.isConnectingOpcua ? 'connecting' : (g.opcuaSession && !g.opcuaSession.sessionId.isEmpty() ? 'connected' : 'disconnected'),
        ws: g.wsServer && g.wsServer.clients.size > 0 ? 'connected' : 'disconnected',
    };
}

export function getOpcuaSession(): ClientSession | undefined {
    return g.opcuaSession;
}

export function getDiscoveryProgress() {
    return g.discoveryProgressCache;
}

async function browseAllNodes(session: ClientSession): Promise<DiscoveredDataPoint[]> {
  g.discoveryProgressCache = { status: "Starting discovery...", percentage: 5, details: "Initializing browser." };
  const discoveredPoints: DiscoveredDataPoint[] = [];
  const nodesToVisit = [new BrowseDescription({ nodeId: "ns=0;i=85", browseDirection: BrowseDirection.Forward, includeSubtypes: true, nodeClassMask: 0, resultMask: 63 })];
  const visitedNodeIds = new Set<string>();
  while (nodesToVisit.length > 0) {
    const nodeToBrowse = nodesToVisit.shift()!;
    const nodeIdString = nodeToBrowse.nodeId.toString();
    if (visitedNodeIds.has(nodeIdString)) continue;
    visitedNodeIds.add(nodeIdString);
    try {
      const browseResult = await session.browse(nodeToBrowse);
      if (browseResult.references) {
        for (const reference of browseResult.references) {
          if (reference.nodeClass === NodeClass.Variable) {
            const value = await session.read({ nodeId: reference.nodeId, attributeId: AttributeIds.Value });
            const dataType = await session.read({ nodeId: reference.nodeId, attributeId: AttributeIds.DataType });
            discoveredPoints.push({
              name: reference.displayName.text || 'Unknown',
              address: reference.nodeId.toString(),
              initialValue: value.value?.value,
              dataType: await mapDataTypeNodeIdToString(dataType.value?.value, session),
            });
          }
          if (reference.nodeClass === NodeClass.Object || reference.nodeClass === NodeClass.View) {
            if (!visitedNodeIds.has(reference.nodeId.toString())) {
                nodesToVisit.push(new BrowseDescription({ nodeId: reference.nodeId, browseDirection: BrowseDirection.Forward, includeSubtypes: true, nodeClassMask: 0, resultMask: 63 }));
            }
          }
        }
      }
    } catch (err: any) {
      console.error(`Error browsing node ${nodeIdString}: ${err.message}`);
    }
  }
  g.discoveryProgressCache = { status: "Node browsing complete.", percentage: 100, details: `Found ${discoveredPoints.length} variables.` };
  return discoveredPoints;
}

export async function discoverAndSaveDatapoints(session: ClientSession): Promise<{ success: boolean; message: string; count: number; error?: string }> {
  try {
    const discoveredDataPoints = await browseAllNodes(session);
    const filePath = path.join(process.cwd(), 'discovered_datapoints.json');
    await fs.writeFile(filePath, JSON.stringify(discoveredDataPoints, null, 2));
    return { success: true, message: 'Datapoints discovered and saved successfully.', count: discoveredDataPoints.length };
  } catch (err: any) {
    return { success: false, message: 'Error during datapoint discovery.', count: 0, error: err.message };
  }
}

if (typeof process !== 'undefined') {
    process.on("SIGINT", async () => {
        if (g.wsServer) g.wsServer.close();
        if (g.opcuaClient) await g.opcuaClient.disconnect();
        process.exit(0);
    });
}
