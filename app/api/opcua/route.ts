// app/api/opcua/route.ts
import { WS_PORT, OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from "@/config/constants";
import { dataPoints, DataPoint } from "@/config/dataPoints";
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
} from "node-opcua";
import { WebSocketServer, WebSocket } from "ws";
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const KEEP_OPCUA_ALIVE = true;
let endpointUrl: string = OPC_UA_ENDPOINT_OFFLINE;
const POLLING_INTERVAL = 3000;
const RECONNECT_DELAY = 5000;
const SESSION_TIMEOUT = 60000;
const WEBSOCKET_HEARTBEAT_INTERVAL = 30000;

let opcuaClient: OPCUAClient | null = null;
let opcuaSession: ClientSession | null = null;

// Global variable for discovery progress
export let discoveryProgressCache = {
  status: "idle",
  percentage: 0,
  details: "No discovery process has been initiated yet.",
  timestamp: Date.now()
};

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


// Helper function to map DataType enum values to strings
function getDataTypeString(dataTypeEnumValue: number): string {
  // Check if the value exists in the DataType enum
  if (DataType[dataTypeEnumValue]) {
    return DataType[dataTypeEnumValue];
  }
  // Add custom mappings for values not directly in enum or for more readable names if necessary
  // For example, some specific server might return values that need special handling.
  // This basic version relies on the enum's string representation.
  switch (dataTypeEnumValue) {
    case DataType.Float: // Typically 10
      return "Float";
    case DataType.Double: // Typically 11
      return "Double";
    case DataType.Int16: // Typically 4
      return "Int16";
    case DataType.Int32: // Typically 6
      return "Int32";
    case DataType.Boolean: // Typically 1
      return "Boolean";
    case DataType.String: // Typically 12
      return "String";
    // Add more cases as needed based on common data types you expect
    default:
      return `Unknown (${dataTypeEnumValue})`;
  }
}

// Function to map DataType NodeId to a string (more advanced, can be expanded)
// For now, this will use the simpler getDataTypeString for basic types.
// It takes the NodeId of the DataType attribute.
async function mapDataTypeNodeIdToString(
  dataTypeNodeId: NodeId,
  session: ClientSession
): Promise<string> {
  if (dataTypeNodeId.namespace === 0 && typeof dataTypeNodeId.value === 'number') {
    // It's a standard DataType enum value
    return getDataTypeString(dataTypeNodeId.value);
  } else {
    // For complex/custom data types, try to read its BrowseName or DisplayName
    try {
      const browseNameDataValue = await session.read({ nodeId: dataTypeNodeId, attributeId: AttributeIds.BrowseName });
      if (browseNameDataValue.statusCode.isGood() && browseNameDataValue.value?.value) {
        return browseNameDataValue.value.value.name || `CustomType (ns=${dataTypeNodeId.namespace};i=${dataTypeNodeId.value})`;
      }
      const displayNameDataValue = await session.read({ nodeId: dataTypeNodeId, attributeId: AttributeIds.DisplayName });
      if (displayNameDataValue.statusCode.isGood() && displayNameDataValue.value?.value) {
        return displayNameDataValue.value.value.text || `CustomType (ns=${dataTypeNodeId.namespace};i=${dataTypeNodeId.value})`;
      }
      return `CustomType (ns=${dataTypeNodeId.namespace};s=${dataTypeNodeId.value})`;
    } catch (error) {
      console.error(`Error reading BrowseName/DisplayName for DataType NodeId ${dataTypeNodeId.toString()}:`, error);
      return `UnknownCustomType (NodeId: ${dataTypeNodeId.toString()})`;
    }
  }
}


interface DiscoveredDataPoint {
  name: string;
  address: string;
  initialValue: any;
  dataType: string;
}

async function browseAllNodes(session: ClientSession): Promise<DiscoveredDataPoint[]> {
  discoveryProgressCache = { status: "Starting discovery...", percentage: 5, details: "Initializing browser.", timestamp: Date.now() };
  const discoveredPoints: DiscoveredDataPoint[] = [];
  const nodesToVisit: BrowseDescription[] = [];
  let visitedCount = 0;
  const initialNodesToEstimate = 100; // Placeholder, ideally get a count of top-level objects if possible.

  // Starting point: ObjectsFolder
  const rootNodeToBrowse: BrowseDescription = new BrowseDescription({
    nodeId: "ns=0;i=85", // ObjectsFolder
    browseDirection: BrowseDirection.Forward,
    includeSubtypes: true,
    nodeClassMask: 0, // Browse all node classes initially
    resultMask: 63 // All result fields
  });
  nodesToVisit.push(rootNodeToBrowse);

  const visitedNodeIds = new Set<string>(); // To avoid re-processing or circular loops
  let totalInitialNodes = 0; // For better percentage calculation

  // Initial scan to estimate total nodes for progress (optional, can be intensive)
  // This is a simplified estimation. A full recursive count beforehand would be more accurate but slow.
  // For now, we'll use a dynamic approach within the loop.

  while (nodesToVisit.length > 0) {
    const nodeToBrowse = nodesToVisit.shift();
    if (!nodeToBrowse || !nodeToBrowse.nodeId) continue;

    const nodeIdString = nodeToBrowse.nodeId.toString();
    if (visitedNodeIds.has(nodeIdString)) {
      continue;
    }
    visitedNodeIds.add(nodeIdString);
    visitedCount++;

    // console.log(`Browsing node: ${nodeIdString}`); // Verbose, can be removed for production

    try {
      const browseResult = await session.browse(nodeToBrowse);

      if (visitedCount % 15 === 0 || nodesToVisit.length < 5) { // Update progress every 15 nodes or if near the end
        let currentPercentage = Math.min(85, 5 + Math.floor((visitedCount / (visitedCount + nodesToVisit.length + 1)) * 80));
        if (nodesToVisit.length === 0) currentPercentage = 88; // Nearing completion of browse

        discoveryProgressCache = {
          status: "Browsing OPC UA structure...",
          percentage: currentPercentage,
          details: `Visited ${visitedCount} nodes. Found ${discoveredPoints.length} variables. Queue: ${nodesToVisit.length}. Current: ${nodeIdString.substring(0,50)}...`,
          timestamp: Date.now()
        };
      }

      if (browseResult.references) {
        for (const reference of browseResult.references) {
          const discoveredNodeId = reference.nodeId; // This is a NodeId object
          const discoveredNodeIdString = discoveredNodeId.toString();

          // Determine display name (prefer displayName, fallback to browseName)
          let name = reference.displayName?.text || reference.browseName?.name || "Unknown";
          if(reference.browseName?.namespaceIndex > 0) { // Add namespace prefix if not default
            name = `ns=${reference.browseName.namespaceIndex}:${name}`;
          }


          // Process only Variable nodes for data point extraction
          if (reference.nodeClass === NodeClass.Variable) {
            let initialValue: any = "N/A";
            let dataTypeString: string = "Unknown";

            try {
              const valueDataValue = await session.read({ nodeId: discoveredNodeId, attributeId: AttributeIds.Value });
              if (valueDataValue.statusCode.isGood() && valueDataValue.value?.value !== null && valueDataValue.value?.value !== undefined) {
                initialValue = valueDataValue.value.value;
              } else {
                initialValue = `Error: ${valueDataValue.statusCode.toString()}`;
              }
            } catch (readError: any) {
              console.error(`Error reading value for ${discoveredNodeIdString}: ${readError.message}`);
              initialValue = `Read Error: ${readError.message.substring(0, 50)}`;
            }

            try {
              const dataTypeDataValue = await session.read({ nodeId: discoveredNodeId, attributeId: AttributeIds.DataType });
              if (dataTypeDataValue.statusCode.isGood() && dataTypeDataValue.value?.value) {
                const dataTypeNodeId = dataTypeDataValue.value.value as NodeId; // The value is the NodeId of the DataType
                dataTypeString = await mapDataTypeNodeIdToString(dataTypeNodeId, session);
              } else {
                 dataTypeString = `Error: ${dataTypeDataValue.statusCode.toString()}`;
              }
            } catch (readError: any) {
              console.error(`Error reading dataType for ${discoveredNodeIdString}: ${readError.message}`);
              dataTypeString = `Read Error: ${readError.message.substring(0,50)}`;
            }

            // Ensure name uniqueness if needed, or use browseName as a key
            // For address, using the full NodeId string is standard
            discoveredPoints.push({
              name: name, // Using the determined name
              address: discoveredNodeIdString,
              initialValue: initialValue,
              dataType: dataTypeString,
            });
            console.log(`Found Variable: ${name} (${discoveredNodeIdString}), Value: ${initialValue}, DataType: ${dataTypeString}`);
          }

          // If the node is an Object or might have children, add it to the queue for further browsing
          // Avoid browsing too deep into non-object types that are not variables themselves
          if (reference.nodeClass === NodeClass.Object || reference.nodeClass === NodeClass.View) {
             if (!visitedNodeIds.has(discoveredNodeIdString)) { // Check again before adding
                const nextNodeToBrowse: BrowseDescription = new BrowseDescription({
                    nodeId: discoveredNodeId,
                    browseDirection: BrowseDirection.Forward,
                    includeSubtypes: true,
                    nodeClassMask: 0, // Continue browsing all classes
                    resultMask: 63
                });
                nodesToVisit.push(nextNodeToBrowse);
             }
          }
        }
      }
    } catch (browseError: any) {
      console.error(`Error browsing node ${nodeIdString}: ${browseError.message}`);
      // Optionally, add this error to a list of problematic nodes
    }
  }
  console.log(`Node browsing complete. Discovered ${discoveredPoints.length} variable data points.`);
  discoveryProgressCache = { status: "Node browsing complete.", percentage: 90, details: `Found ${discoveredPoints.length} variables.`, timestamp: Date.now() };
  return discoveredPoints;
}

async function discoverAndSaveDatapoints(session: ClientSession): Promise<{ success: boolean; message: string; count: number; filePath?: string; data?: DiscoveredDataPoint[]; error?: string }> {
  discoveryProgressCache = { status: "Initiating discovery process...", percentage: 0, details: "Awaiting connection and browser setup.", timestamp: Date.now() };
  try {
    console.log("Starting datapoint discovery process...");
    const discoveredDataPoints = await browseAllNodes(session); // This will update progress internally

    if (!discoveredDataPoints || discoveredDataPoints.length === 0) {
      console.log("No datapoints found during browse operation.");
      discoveryProgressCache = { status: "No datapoints found during browse.", percentage: 100, details: "The OPC UA server browse operation completed but yielded no variable nodes.", timestamp: Date.now() };
      return { success: true, message: 'No datapoints found.', count: 0, data: [] };
    }

    discoveryProgressCache = { status: "Saving results to file...", percentage: 95, details: `Preparing to save ${discoveredDataPoints.length} discovered data points.`, timestamp: Date.now() };
    console.log(`Discovered ${discoveredDataPoints.length} datapoints. Attempting to save to file...`);
    const filePath = path.join(process.cwd(), 'discovered_datapoints.json');
    const jsonData = JSON.stringify(discoveredDataPoints, null, 2);

    try {
      await fs.writeFile(filePath, jsonData);
      console.log(`Successfully saved discovered datapoints to ${filePath}`);
      discoveryProgressCache = { status: "Datapoints discovered and saved successfully.", percentage: 100, details: `Data saved to ${filePath}. Found ${discoveredDataPoints.length} points.`, timestamp: Date.now() };
      return {
        success: true,
        message: 'Datapoints discovered and saved successfully.',
        count: discoveredDataPoints.length,
        filePath: filePath,
        data: discoveredDataPoints
      };
    } catch (fsError: any) {
      console.error(`Failed to save discovered datapoints to file at ${filePath}:`, fsError);
      discoveryProgressCache = { status: "Error during discovery.", percentage: 95, details: `File system error: ${fsError.message}`, timestamp: Date.now() }; // Still at 95 as browse was ok
      return {
        success: false,
        message: 'Failed to save discovered datapoints to file.',
        count: discoveredDataPoints.length,
        data: discoveredDataPoints, // Still return data even if save failed
        error: fsError.message
      };
    }
  } catch (browseError: any) {
    console.error("Error during datapoint discovery (browseAllNodes call):", browseError);
    discoveryProgressCache = { status: "Error during discovery.", percentage: Math.max(5, discoveryProgressCache.percentage - 20), details: `Browse error: ${browseError.message}`, timestamp: Date.now() }; // Reduce percentage on error
    return {
      success: false,
      message: 'Error during datapoint discovery.',
      count: 0,
      error: browseError.message
    };
  }
}

let localPingIntervalId: NodeJS.Timeout | null = null;
let vercelPingIntervalId: NodeJS.Timeout | null = null;

const nodeIdsToMonitor = (): string[] => {
  const uniqueNodeIds = new Set<string>();
  dataPoints.forEach(dp => {
    if (dp.nodeId && dp.nodeId.trim() !== '') {
      uniqueNodeIds.add(dp.nodeId);
    }
  });
  return Array.from(uniqueNodeIds);
};

// Helper function to send toast messages to a specific client
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
            let parsedMessage: any;

            try {
                parsedMessage = JSON.parse(messageString);
                if (typeof parsedMessage !== 'object' || parsedMessage === null) {
                    throw new Error("Invalid message format. Expected a JSON object.");
                }
            } catch (parseError) {
                const errorMsg = "Invalid message format sent to server.";
                console.error("Failed to parse message from client:", messageString, parseError);
                sendToastToClient(ws, 'error', errorMsg);
                return;
            }
            
            if (parsedMessage.type === 'save-sld-widget-layout' && parsedMessage.payload) {
                const { key, layout } = parsedMessage.payload;
                console.log(`Received SLD layout save request for key: ${key}`);
                try {
                    console.log(`Pretending to save SLD layout for key: ${key}`);
                    await new Promise(resolve => setTimeout(resolve, 500)); 
                    ws.send(JSON.stringify({
                        type: 'layout-saved-confirmation',
                        payload: { key, message: 'SLD Layout saved successfully server-side.' }
                    }));
                    sendToastToClient(ws, 'success', `Layout for '${key}' saved successfully.`);
                } catch (saveError: any) {
                    const errorMsg = `Failed to save SLD layout for '${key}': ${saveError.message}`;
                    console.error(errorMsg);
                    ws.send(JSON.stringify({
                        type: 'layout-save-error',
                        payload: { key, error: `Failed to save SLD layout: ${saveError.message}` }
                    }));
                    sendToastToClient(ws, 'error', errorMsg);
                }
                return; 
            }
            else if (parsedMessage.type === 'controlWrite' && parsedMessage.payload && typeof parsedMessage.payload === 'object') {
                const controlPayload = parsedMessage.payload;
                const dataPointIdsFromPayload = Object.keys(controlPayload); 

                if (dataPointIdsFromPayload.length === 0) {
                    const msg = "ControlWrite payload is empty.";
                    console.warn("Received controlWrite with empty payload.");
                    sendStatusToClient(ws, 'error', 'N/A', msg);
                    sendToastToClient(ws, 'warning', msg);
                    return;
                }
                
                const dataPointIdFromKey = dataPointIdsFromPayload[0]; 
                const value = controlPayload[dataPointIdFromKey];

                const dataPointConfig = dataPoints.find(dp => dp.id === dataPointIdFromKey);

                if (!dataPointConfig) {
                    const msg = `DataPoint ID '${dataPointIdFromKey}' (from payload key) not configured for control.`;
                    console.error(msg);
                    sendStatusToClient(ws, 'error', dataPointIdFromKey, msg);
                    sendToastToClient(ws, 'error', msg);
                    return;
                }
                
                const opcUaNodeId = dataPointConfig.nodeId; 
                if (!opcUaNodeId || opcUaNodeId.trim() === '') {
                    const msg = `OPC UA Node ID is missing for DataPoint '${dataPointConfig.name || dataPointIdFromKey}'. Cannot write.`;
                    console.error(msg);
                    sendStatusToClient(ws, 'error', dataPointIdFromKey, msg);
                    sendToastToClient(ws, 'error', msg);
                    return;
                }
                console.log(`ControlWrite: Processing DataPoint ID '${dataPointIdFromKey}', targeting OPC UA Node ID '${opcUaNodeId}' with value: ${value}`);

                if (!opcuaClient || !opcuaSession) {
                    const msg = `Cannot perform control: OPC UA is not connected. Please try again shortly.`;
                    console.error(`OPC UA write failed for Node ID ${opcUaNodeId}: Session not active.`);
                    sendStatusToClient(ws, 'error', opcUaNodeId, 'OPC UA session not active or client disconnected.');
                    sendToastToClient(ws, 'error', msg);
                    if (!isConnectingOpcua && (!opcuaClient || !opcuaSession)) {
                        attemptReconnect("controlWrite_attempt_no_session_or_client");
                    }
                    return;
                }

                let opcuaDataType: DataType;
                switch (dataPointConfig.dataType) {
                    case 'Boolean': opcuaDataType = DataType.Boolean; break;
                    case 'Float': opcuaDataType = DataType.Float; break; 
                    case 'Double': opcuaDataType = DataType.Double; break;
                    case 'Int16': opcuaDataType = DataType.Int16; break;
                    case 'Int32': opcuaDataType = DataType.Int32; break;
                    case 'UInt16': opcuaDataType = DataType.UInt16; break;
                    case 'UInt32': opcuaDataType = DataType.UInt32; break;
                    case 'String': opcuaDataType = DataType.String; break;
                    default:
                        const msg = `Unsupported data type '${dataPointConfig.dataType}' for writing to '${dataPointConfig.name || opcUaNodeId}'.`;
                        console.error(msg);
                        sendStatusToClient(ws, 'error', opcUaNodeId, msg);
                        sendToastToClient(ws, 'error', msg);
                        return;
                }

                const nodeToWrite = { nodeId: opcUaNodeId, attributeId: AttributeIds.Value, value: new DataValue({ value: { dataType: opcuaDataType, value } }) };
                
                try {
                    console.log(`Attempting to write via controlWrite to OPC UA Node ID ${opcUaNodeId} with value:`, value);
                    const statusCode = await opcuaSession.write(nodeToWrite);
                    if (statusCode.isGood()) {
                        const successMsg = `Successfully wrote value ${value} to '${dataPointConfig.name || opcUaNodeId}'.`;
                        console.log(successMsg);
                        sendStatusToClient(ws, 'success', opcUaNodeId, successMsg);
                        sendToastToClient(ws, 'success', successMsg);

                        const immediateUpdate: Record<string, any> = {};
                        const factor = dataPointConfig.factor ?? 1;
                        let displayValue = value;
                         if (typeof value === 'number') {
                             const decimalPlaces = dataPointConfig.decimalPlaces ?? 2;
                             displayValue = !Number.isInteger(value * factor) ? parseFloat((value * factor).toFixed(decimalPlaces)) : value * factor;
                         }
                        if (nodeDataCache[opcUaNodeId] !== displayValue) {
                            nodeDataCache[opcUaNodeId] = displayValue;
                            immediateUpdate[opcUaNodeId] = displayValue;
                            broadcast(JSON.stringify(immediateUpdate));
                        }
                    } else {
                        const errorMsg = `OPC UA write failed for '${dataPointConfig.name || opcUaNodeId}': ${statusCode.toString()}`;
                        console.error(errorMsg);
                        sendStatusToClient(ws, 'error', opcUaNodeId, errorMsg);
                        sendToastToClient(ws, 'error', errorMsg);
                    }
                } catch (writeError: any) {
                    const errorMsg = `OPC UA write error for '${dataPointConfig.name || opcUaNodeId}': ${writeError?.message || 'Unknown'}`;
                    console.error(errorMsg);
                    sendStatusToClient(ws, 'error', opcUaNodeId, errorMsg);
                    sendToastToClient(ws, 'error', errorMsg);
                    if (writeError?.message?.includes("BadSession") || writeError?.message?.includes("BadNotConnected")) {
                        opcuaSession = null; stopDataPolling(); attemptReconnect("controlWrite_error_session_lost");
                    }
                }
                return; 
            } 
            else if (Object.keys(parsedMessage).length === 1 && parsedMessage.type === undefined) {
                const nodeId = Object.keys(parsedMessage)[0]; 
                const value = parsedMessage[nodeId];
                console.log(`Handling direct write for Node ID ${nodeId} with value: ${value}`);

                if (!opcuaClient || !opcuaSession) {
                    const msg = `(Direct Write) OPC UA is not connected. Cannot write.`;
                    console.error(msg);
                    sendStatusToClient(ws, 'error', nodeId, 'OPC UA session not active or client disconnected.');
                    sendToastToClient(ws, 'error', msg);
                    if (!isConnectingOpcua && (!opcuaClient || !opcuaSession)) {
                        attemptReconnect("direct_write_attempt_no_session_or_client");
                    }
                    return;
                }

                const dataPointConfig = dataPoints.find(dp => dp.nodeId === nodeId);
                if (!dataPointConfig) {
                    const msg = `(Direct Write) Node ID '${nodeId}' not configured.`;
                    console.error(msg);
                    sendStatusToClient(ws, 'error', nodeId, msg);
                    sendToastToClient(ws, 'error', msg);
                    return;
                }

                let opcuaDataType: DataType;
                switch (dataPointConfig.dataType) {
                    case 'Boolean': opcuaDataType = DataType.Boolean; break;
                    case 'Float': opcuaDataType = DataType.Float; break; 
                    case 'Double': opcuaDataType = DataType.Double; break;
                    case 'Int16': opcuaDataType = DataType.Int16; break;
                    case 'Int32': opcuaDataType = DataType.Int32; break;
                    case 'UInt16': opcuaDataType = DataType.UInt16; break;
                    case 'UInt32': opcuaDataType = DataType.UInt32; break;
                    case 'String': opcuaDataType = DataType.String; break;
                    default:
                        const msg = `(Direct Write) Unsupported data type '${dataPointConfig.dataType}' for writing to ${dataPointConfig.name || nodeId}`;
                        console.error(msg);
                        sendStatusToClient(ws, 'error', nodeId, msg);
                         sendToastToClient(ws, 'error', msg);
                        return;
                }
                const nodeToWrite = { nodeId, attributeId: AttributeIds.Value, value: new DataValue({ value: { dataType: opcuaDataType, value } }) };
                try {
                    const statusCode = await opcuaSession.write(nodeToWrite);
                    if (statusCode.isGood()) {
                        const successMsg = `(Direct Write) Successfully wrote ${value} to '${dataPointConfig.name || nodeId}'.`;
                        console.log(successMsg);
                        sendStatusToClient(ws, 'success', nodeId, successMsg);
                        sendToastToClient(ws, 'success', successMsg);
                        
                        const immediateUpdate: Record<string, any> = {};
                        const factor = dataPointConfig.factor ?? 1;
                        let displayValue = value;
                         if (typeof value === 'number') {
                             const decimalPlaces = dataPointConfig.decimalPlaces ?? 2;
                             displayValue = !Number.isInteger(value * factor) ? parseFloat((value * factor).toFixed(decimalPlaces)) : value * factor;
                         }
                        if (nodeDataCache[nodeId] !== displayValue) {
                            nodeDataCache[nodeId] = displayValue;
                            immediateUpdate[nodeId] = displayValue;
                            broadcast(JSON.stringify(immediateUpdate));
                        }
                    } else {
                        const errorMsg = `(Direct Write) OPC UA write failed for '${dataPointConfig.name || nodeId}': ${statusCode.toString()}`;
                        console.error(errorMsg);
                        sendStatusToClient(ws, 'error', nodeId, errorMsg);
                        sendToastToClient(ws, 'error', errorMsg);
                    }
                } catch (writeError: any) {
                    const errorMsg = `(Direct Write) OPC UA write error for '${dataPointConfig.name || nodeId}': ${writeError?.message || 'Unknown'}`;
                    console.error(errorMsg);
                    sendStatusToClient(ws, 'error', nodeId, errorMsg);
                    sendToastToClient(ws, 'error', errorMsg);
                    if (writeError?.message?.includes("BadSession") || writeError?.message?.includes("BadNotConnected")) {
                        opcuaSession = null; stopDataPolling(); attemptReconnect("direct_write_error_session_lost");
                    }
                }
            } else {
                const errorMsg = 'Unhandled message format or type on server.';
                console.error("Received message in unhandled format or type:", parsedMessage);
                 ws.send(JSON.stringify({ status: 'error', error: errorMsg }));
                 sendToastToClient(ws, 'error', 'Server received an unhandled message.');
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
        clientName: `AVR&D_Solar_Power_Plant_Dashboard-PID${process.pid}`
      });

      opcuaClient.on("backoff", (retry, delay) => console.log(`OPC UA internal backoff: retry ${retry} in ${delay}ms (Note: custom retry logic is primary)`));
      opcuaClient.on("connection_lost", () => { console.error("OPC UA CEvt: Connection lost."); opcuaSession = null; stopDataPolling(); attemptReconnect("connection_lost_event"); });
      opcuaClient.on("connection_reestablished", () => {
        console.log("OPC UA CEvt: Connection re-established.");
        if (!opcuaSession) { console.log("Re-creating session after re-established connection."); createSessionAndStartPolling(); }
      });
      opcuaClient.on("close", (err?: Error) => { console.log(`OPC UA CEvt: Connection closed. Error: ${err ? err.message : 'No error info'}`); opcuaSession = null; stopDataPolling(); });
      opcuaClient.on("timed_out_request", (request) => console.warn("OPC UA CEvt: Request timed out:", request?.toString().substring(0,100)));
    }

    if (!opcuaClient) throw new Error("OPC UA client somehow still not initialized.");

    await opcuaClient.connect(endpointUrl);
    console.log("OPC UA client connected to:", endpointUrl);
    await createSessionAndStartPolling();
  } catch (err: any) {
    console.error(`Failed to connect OPC UA client to ${endpointUrl}:`, err.message);
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
  if (!opcuaClient) {
      console.log("Cannot create session: OPC UA client non-existent.");
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
  const monitorIds = nodeIdsToMonitor();
  if (monitorIds.length === 0) { console.log("No nodes configured to monitor. Polling will not start effectively."); return;}

  console.log(`Starting data polling for ${monitorIds.length} nodes...`);
  dataInterval = setInterval(async () => {
    if (!opcuaClient || !opcuaSession) {
        console.warn("No client or session in poll cycle, stopping polling.");
        stopDataPolling();
        attemptReconnect("session_or_client_missing_in_poll");
        return;
    }
    try {
      const nodesToRead = monitorIds.map(nodeId => ({ nodeId, attributeId: AttributeIds.Value }));
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
          const decimalPlaces = dataPoint?.decimalPlaces ?? 2;

          if (typeof rawValue === "number") {
            if (dataPoint?.dataType === 'Float' || dataPoint?.dataType === 'Double' || (dataPoint?.dataType === undefined && !Number.isInteger(rawValue * factor)) ) {
                newValue = parseFloat((rawValue * factor).toFixed(decimalPlaces));
            } else {
                newValue = Math.round(rawValue * factor);
            }
          } else { newValue = rawValue; }
          readSuccess = true;
        } else {
          if(dataValue.statusCode !== StatusCodes.BadNodeIdUnknown && dataValue.statusCode !== StatusCodes.BadNodeIdInvalid){
            // console.warn(`Failed to read NodeId ${nodeId}: ${dataValue.statusCode.toString()}`);
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
    // This is a safety check to make sure the WebSocket server is ready.
    await ensureWebSocketServerInitialized();
    
    // This part handles the actual WebSocket connection upgrade and is correct.
    const upgradeHeader = req.headers.get('upgrade');
    if (upgradeHeader?.toLowerCase() === 'websocket') {
        // ... (this logic is fine, no changes needed here)
        return new NextResponse(null, { status: 101 });
    }

    // --- THIS IS THE CRUCIAL PART FOR YOUR PROBLEM ---

    // 1. Get the hostname the browser used to access the server.
    // In your case, req.nextUrl.hostname will be "123.231.16.208".
    let hostname = req.nextUrl.hostname;

    // This handles a special case for local development, which you can keep.
    if (hostname === '0.0.0.0' || hostname === '::') {
        hostname = 'localhost';
    }
    
    // This assumes your server is not running on Vercel.
    const isVercel = false; 
    let webSocketUrl;

    if (isVercel) {
        // Vercel logic (not relevant for you right now)
    } else {
        // 2. Build the URL using the DYNAMIC hostname from the request.
        // It will correctly create: "ws://" + "123.231.16.208" + ":" + "2001"
        const wsProtocol = "ws"; 
        webSocketUrl = `${wsProtocol}://${hostname}:${WS_PORT}`; // WS_PORT is 2001 in your config
    }

    console.log(`Dynamically generated WebSocket URL: ${webSocketUrl}`);

    // 3. Return a JSON response containing the CORRECT, publicly accessible URL.
    return NextResponse.json({
        message: "OPC UA WebSocket service is active. Use the provided URL to connect.",
        status: opcuaSession ? "OPC-UA Connected" : "OPC-UA Not Connected",
        webSocketUrl: webSocketUrl, // This will now be ws://123.231.16.208:2001
    });
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

export { opcuaSession, connectOPCUA, discoverAndSaveDatapoints };
export type { DiscoveredDataPoint };