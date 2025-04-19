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
const RECONNECT_DELAY = 2000;
const SESSION_TIMEOUT = 60000; 
const WEBSOCKET_HEARTBEAT_INTERVAL = 3000; // 3 seconds

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
          maxRetry: 1, // Handle retries manually
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
        // Re-create session is handled by attemptReconnect logic implicitly
        // If connection re-established but session is null, attemptReconnect -> connectOPCUA -> createSession
         if (!opcuaSession) {
             console.log("Connection re-established, creating new session.");
             createSessionAndStartPolling();
         }
        connectionAttempts = 0; // Reset attempts on success
      });
      opcuaClient.on("close", () => {
        console.log("OPC UA client connection closed.");
        opcuaSession = null;
        stopDataPolling();
        // Setting opcuaClient = null might be too aggressive if keepalive is true?
        // Let's only nullify if not KEEP_OPCUA_ALIVE or explicitly disconnected
        // opcuaClient = null; // Allow reconnection --> keep it to allow reconnect attempts
        attemptReconnect("close");
      });
      opcuaClient.on("timed_out_request", (request) => {
        console.warn("OPC UA request timed out:", request?.toString());
      });
    }

    // Ensure client exists before connecting
    if (!opcuaClient) {
        throw new Error("OPC UA client not initialized before connect attempt.");
    }

    await opcuaClient.connect(endpointUrl);
    console.log("OPC UA client connected to:", endpointUrl);
    await createSessionAndStartPolling();
    connectionAttempts = 0; // Reset attempts on success
  } catch (err) {
    console.error(`Failed to connect OPC UA client to ${endpointUrl}:`, err);
    // Fallback logic only if primary fails
    if (endpointUrl === OPC_UA_ENDPOINT_OFFLINE) {
      console.log("Falling back to online OPC UA endpoint...");
      endpointUrl = OPC_UA_ENDPOINT_ONLINE; // Set the endpoint for the next attempt
      if (opcuaClient) { // Try connecting to the fallback with the existing client instance
          try {
              await opcuaClient.disconnect(); // Disconnect previous attempt first
              console.log("Disconnected from offline attempt before fallback.");
          } catch (disconnectErr) {
              console.warn("Error disconnecting before fallback attempt:", disconnectErr);
          }
           try {
              await opcuaClient.connect(endpointUrl);
              console.log("OPC UA client connected to fallback:", endpointUrl);
              await createSessionAndStartPolling();
              connectionAttempts = 0; // Reset attempts on success
          } catch (fallbackErr) {
              console.error("Failed to connect to fallback OPC UA endpoint:", fallbackErr);
              attemptReconnect("fallback_failure");
              // Don't nullify client here, let attemptReconnect handle retries
          }
      } else {
           console.error("OPC UA Client was null during fallback attempt.");
           attemptReconnect("fallback_client_null");
      }

    } else {
      // Failure was on the ONLINE endpoint (or initial was ONLINE)
      attemptReconnect("initial_or_online_failure");
      // Don't nullify client here, let attemptReconnect handle retries
    }
  } finally {
    isConnectingOpcua = false;
  }
}


function attemptReconnect(reason: string) {
    // Only attempt reconnect if there are clients OR if KEEP_OPCUA_ALIVE is true
  const shouldAttempt = connectedClients.size > 0 || KEEP_OPCUA_ALIVE;

  // Avoid scheduling multiple reconnects if one is already pending or connection is in progress
  if (!shouldAttempt || isConnectingOpcua || disconnectTimeout) {
      if (!shouldAttempt) console.log("No clients connected and KEEP_OPCUA_ALIVE is false, not attempting OPC UA reconnect.");
      if (isConnectingOpcua) console.log("Connection attempt already in progress, skipping reconnect schedule.");
      if (disconnectTimeout) console.log("Disconnection scheduled, skipping reconnect schedule.");
      return;
  }

  if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
    connectionAttempts++;
    console.log(`Attempting OPC UA reconnect (${connectionAttempts}) due to: ${reason} in ${RECONNECT_DELAY}ms`);
    // Clear any existing timeout to avoid duplicates
    if (disconnectTimeout) {
        clearTimeout(disconnectTimeout);
        disconnectTimeout = null;
    }
    // Schedule the connection attempt
    setTimeout(connectOPCUA, RECONNECT_DELAY);
  } else {
    console.warn("Maximum OPC UA reconnection attempts reached. Stop reconnecting.");
  }
}

async function createSessionAndStartPolling() {
  if (!opcuaClient) {
      console.log("Cannot create session: OPC UA client does not exist.");
      attemptReconnect("session_creation_no_client");
      return;
  }
   if (opcuaSession) {
      console.log("Cannot create session: Session already exists.");
      // Ensure polling is running if session exists
      if(!dataInterval) startDataPolling();
      return;
  }
   if (dataInterval) {
       console.log("Warning: Polling interval was active without a session. Stopping polling before creating new session.");
       stopDataPolling();
   }


  try {
    opcuaSession = await opcuaClient.createSession();
    console.log("OPC UA session created.");

    opcuaSession.on("session_closed", () => {
      console.log("OPC UA session explicitly closed.");
      opcuaSession = null;
      stopDataPolling();
      // Attempt reconnect if needed (based on clients/KEEP_ALIVE)
      attemptReconnect("session_closed");
    });
    opcuaSession.on("keepalive", (state: string) => {
      console.log("OPC UA session keepalive state:", state);
    });
    opcuaSession.on("keepalive_failure", (state: string | Error) => {
      console.error("OPC UA session keepalive failure:", state);
      opcuaSession = null;
      stopDataPolling();
      attemptReconnect("keepalive_failure");
    });

    startDataPolling(); // Start polling AFTER session is confirmed
  } catch (err) {
    console.error("Failed to create OPC UA session:", err);
    opcuaSession = null; // Ensure session is null on failure
    attemptReconnect("session_creation_failure");
  }
}


function startDataPolling() {
  if (dataInterval) {
    console.log("Polling already running.");
    return;
  }
   if (!opcuaSession) {
    console.log("Polling not started: No active OPC UA session.");
    return;
  }


  console.log("Starting data polling...");
  dataInterval = setInterval(async () => {
    // Double check session hasn't been closed between intervals
    if (!opcuaSession) {
      console.log("No active session found during poll cycle, stopping polling.");
      stopDataPolling();
      // Optionally attempt reconnect here if session disappeared unexpectedly
      attemptReconnect("session_missing_during_poll");
      return;
    }

    try {
      const nodesToRead = nodeIdsToMonitor().map((nodeId: any) => ({
        nodeId: nodeId,
        attributeId: AttributeIds.Value,
      }));

      if(nodesToRead.length === 0) {
        console.log("No nodes configured to monitor."); // Avoid polling if nothing to read
        return;
      }

      const dataValues = await opcuaSession.read(nodesToRead);
      const currentDataBatch: Record<string, any> = {};
      let changed = false; // Track if any value actually changed

      dataValues.forEach((dataValue, index) => {
        const nodeId = nodesToRead[index].nodeId;
        let newValue: any = null; // Default to null if read fails? Or keep previous value? Let's use 'Error' for clarity.
        let readSuccess = false;

        if (dataValue.statusCode.isGood() && dataValue.value?.value !== undefined && dataValue.value?.value !== null) {
             const rawValue = dataValue.value.value;
             const dataPoint = dataPoints.find((point) => point.nodeId === nodeId);
             const factor = dataPoint?.factor ?? 1;

             if (typeof rawValue === "number") {
                 newValue = !Number.isInteger(rawValue)
                   ? parseFloat((rawValue * factor).toFixed(2)) // Apply factor and format float
                   : rawValue * factor;                      // Apply factor to integer
             } else {
                 newValue = rawValue; // Booleans, Strings, etc.
             }
             readSuccess = true;
         } else {
            // Log specific error status if available
            console.warn(`Failed to read NodeId ${nodeId}: ${dataValue.statusCode.toString()}`);
            newValue = "Error"; // Indicate read failure
         }


        // Update cache and broadcast only if the value changed or is newly read
        if (nodeDataCache[nodeId] !== newValue || !(nodeId in nodeDataCache)) {
            currentDataBatch[nodeId] = newValue;
            nodeDataCache[nodeId] = newValue; // Update cache regardless of broadcast need
            if (readSuccess || nodeDataCache[nodeId] === "Error") { // Only mark changed if read was ok or errored
                changed = true;
            }
        }
      });

      // Broadcast only if there are connected clients and data has changed
      if (changed && Object.keys(currentDataBatch).length > 0 && connectedClients.size > 0) {
        // console.log("Broadcasting data changes:", currentDataBatch);
        broadcast(JSON.stringify(currentDataBatch));
      }
      // Optionally log the cached data even if no clients are connected
      // console.log("Current OPC UA data cache:", nodeDataCache);
    } catch (err) {
      console.error("Error during OPC UA read poll:", err);
      // More specific error handling based on node-opcua error types if possible
      if (
        err instanceof Error &&
        (err.message.includes("BadSessionIdInvalid") ||
          err.message.includes("BadSessionClosed") ||
          err.message.includes("BadNotConnected") ||
          err.message.includes("BadTooManySessions") ||
          err.message.includes("Connection Break") || // Add more potential connection errors
          err.message.includes("Socket is closed"))
      ) {
        console.error("OPC UA Session/Connection error during poll. Stopping poll and attempting reconnect.");
        // Don't close session here, it's likely already invalid or closed
        opcuaSession = null;
        stopDataPolling();
        attemptReconnect("polling_error");
      }
      // Handle other potential errors (e.g., network timeout) if necessary
    }
  }, POLLING_INTERVAL);
}

function stopDataPolling() {
  if (dataInterval) {
    // console.log("Stopping data polling."); // Reduce log noise
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
        // Consider removing the client if send fails repeatedly
      }
    }
  });
}

// --- Function to send status back to a specific client ---
function sendStatusToClient(client: WebSocket, status: 'success' | 'error', nodeId: string, message?: string) {
    if (client.readyState === WebSocket.OPEN) {
        try {
            const payload = JSON.stringify({ status, nodeId, message });
            client.send(payload);
        } catch (err) {
            console.error(`Error sending status for ${nodeId} back to client:`, err);
        }
    }
}

async function startWebSocketServer() {
  if (!wsServer) {
    wsServer = new WebSocketServer({ port: WS_PORT });
    initializeWebSocketServer(wsServer);
    console.log(`WebSocket server started on port ${WS_PORT}`);
    // Immediately connect to OPC UA if KEEP_OPCUA_ALIVE
    if (KEEP_OPCUA_ALIVE) {
      connectOPCUA(); // Initial connection attempt
    }
  }
}

function initializeWebSocketServer(server: WebSocketServer) {
  server.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    connectedClients.add(ws);
    (ws as any).isAlive = true; // For heartbeat
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    // Send initial data cache immediately
    if (Object.keys(nodeDataCache).length > 0) {
      try {
        // console.log("Sending initial cache to new client:", nodeDataCache);
        ws.send(JSON.stringify(nodeDataCache));
      } catch (err) {
        console.error("Error sending initial cache to client:", err);
      }
    }

    // Connect OPC UA only if not keeping alive and this is the first client
    if (connectedClients.size === 1 && !KEEP_OPCUA_ALIVE) {
      console.log("First client connected & not keeping alive, ensuring OPC UA connection.");
      if (disconnectTimeout) { // Cancel pending disconnect if a client reconnects quickly
        clearTimeout(disconnectTimeout);
        disconnectTimeout = null;
        console.log("Client reconnected, canceling scheduled OPC UA disconnection.");
      }
      // Only connect if not already connected or attempting to connect
      if (!opcuaClient && !isConnectingOpcua) {
        connectOPCUA();
      } else if(opcuaSession && !dataInterval) {
         // If client reconnected and we have session but no polling
         startDataPolling();
      }
    }

    // --- MODIFIED MESSAGE HANDLER ---
    ws.on("message", async (message) => { // Make handler async
      const messageString = message.toString();
      console.log("Received message from client:", messageString);

      let dataToWrite: Record<string, any>;
      try {
        dataToWrite = JSON.parse(messageString);
        // Basic validation: Ensure it's an object with one key
        if (typeof dataToWrite !== 'object' || dataToWrite === null || Object.keys(dataToWrite).length !== 1) {
            throw new Error("Invalid message format. Expected object with one key-value pair.");
        }
      } catch (parseError) {
        console.error("Failed to parse message from client:", messageString, parseError);
        sendStatusToClient(ws, 'error', 'unknown', 'Invalid message format received.');
        return; // Stop processing
      }

      const nodeId = Object.keys(dataToWrite)[0];
      const value = dataToWrite[nodeId];

      // 1. Check OPC UA Session
      if (!opcuaSession) {
        console.error(`Cannot write to OPC UA: No active session for Node ID ${nodeId}.`);
        sendStatusToClient(ws, 'error', nodeId, 'OPC UA session not active.');
        return;
      }

      // 2. Find Data Point Configuration for Data Type
      const dataPointConfig = dataPoints.find(dp => dp.nodeId === nodeId);
      if (!dataPointConfig) {
        console.error(`Received write request for unknown or unconfigured Node ID: ${nodeId}`);
        sendStatusToClient(ws, 'error', nodeId, 'Node ID not configured for writing.');
        return;
      }

      // 3. Determine OPC UA Data Type
      let opcuaDataType: DataType;
      switch (dataPointConfig.dataType) {
        case 'Boolean':
          opcuaDataType = DataType.Boolean;
          break;
        case 'Float':
          opcuaDataType = DataType.Double;  // Or DataType.Float if specific
          break;
        case 'Int16':
          opcuaDataType = DataType.Int16;
          break;
        // case 'Int32':
        //   opcuaDataType = DataType.Int32;
        //   break;
        // case 'UInt16':
        //   opcuaDataType = DataType.UInt16;
        //   break;
        // case 'UInt32':
        //   opcuaDataType = DataType.UInt32;
        //   break;
        // case 'String':
        //   opcuaDataType = DataType.String;
        //   break;
        // case 'DateTime':
        //   opcuaDataType = DataType.DateTime;
        //   break;
        // case 'ByteString':
        //   opcuaDataType = DataType.ByteString;
        //   break;
        // case 'Guid':
        //   opcuaDataType = DataType.Guid;
        //   break;
        // case 'Byte':
        //   opcuaDataType = DataType.Byte;
        //   break;
        // case 'SByte':
        //   opcuaDataType = DataType.SByte;
        //   break;
        // case 'Int64':
        //   opcuaDataType = DataType.Int64;
        //   break;
        // case 'UInt64':
        //   opcuaDataType = DataType.UInt64;
        //   break;
        default:
          console.error(`Unsupported data type '${dataPointConfig.dataType}' configured for writing to ${nodeId}`);
          sendStatusToClient(ws, 'error', nodeId, `Unsupported data type configured: ${dataPointConfig.dataType}`);
          return;
      }

      // 4. Prepare the OPC UA Write Request
      const nodeToWrite = {
        nodeId: nodeId,
        attributeId: AttributeIds.Value,
        value: new DataValue({
          value: {
            dataType: opcuaDataType,
            value: value // Use the value received from the client
          }
        })
      };

      // 5. Execute the OPC UA Write
      try {
        console.log(`Attempting to write to Node ID ${nodeId} with value:`, value);
        const statusCode = await opcuaSession.write(nodeToWrite);

        if (statusCode.isGood()) {
          console.log(`Successfully wrote value ${value} to Node ID ${nodeId}`);
          sendStatusToClient(ws, 'success', nodeId); // Send success back to client

          // OPTIONAL: Update cache immediately and broadcast if needed
          // This makes the UI update faster than waiting for the next poll cycle
          const immediateUpdate: Record<string, any> = {};
          const factor = dataPointConfig.factor ?? 1;
          let displayValue = value;
          // Apply factor for immediate cache update if it's a number being written
          if (typeof value === 'number') {
              displayValue = !Number.isInteger(value) ? parseFloat((value * factor).toFixed(2)) : value * factor;
          }
          if (nodeDataCache[nodeId] !== displayValue) {
              nodeDataCache[nodeId] = displayValue; // Update cache with potentially factored value
              immediateUpdate[nodeId] = displayValue;
              broadcast(JSON.stringify(immediateUpdate)); // Broadcast the single change
          }

        } else {
          console.error(`Failed to write to Node ID ${nodeId}. Status code: ${statusCode.toString()}`);
          sendStatusToClient(ws, 'error', nodeId, `OPC UA write failed: ${statusCode.toString()}`);
        }
      } catch (writeError) {
        console.error(`Error during OPC UA write operation for ${nodeId}:`, writeError);
        sendStatusToClient(ws, 'error', nodeId, `OPC UA write error: ${writeError instanceof Error ? writeError.message : 'Unknown write error'}`);
        // Check if the error indicates a session problem
        if (writeError instanceof Error && (writeError.message.includes("BadSession") || writeError.message.includes("BadNotConnected"))){
            opcuaSession = null;
            stopDataPolling();
            attemptReconnect("write_error_session_lost");
        }
      }
    });
    // --- END OF MODIFIED MESSAGE HANDLER ---


    ws.on("close", () => {
      console.log("Client disconnected from WebSocket");
      connectedClients.delete(ws);
      // Schedule disconnect only if KEEP_OPCUA_ALIVE is false and it's the last client
      if (connectedClients.size === 0 && !KEEP_OPCUA_ALIVE && opcuaClient) {
          // Use a short delay before disconnecting, allows for quick reconnects without full teardown/setup
          const DISCONNECT_DELAY = 5000; // e.g., 5 seconds
          console.log(`Last client disconnected, scheduling OPC UA disconnection in ${DISCONNECT_DELAY}ms.`);
          if (disconnectTimeout) clearTimeout(disconnectTimeout); // Clear any previous timer
          disconnectTimeout = setTimeout(() => {
              console.log("Executing scheduled OPC UA disconnection.");
              disconnectOPCUA();
              disconnectTimeout = null;
          }, DISCONNECT_DELAY);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket client error:", error);
      // Ensure client is removed and perform same disconnect check as 'close'
      connectedClients.delete(ws);
      ws.terminate(); // Force close the connection on error
       if (connectedClients.size === 0 && !KEEP_OPCUA_ALIVE && opcuaClient) {
           const DISCONNECT_DELAY = 5000;
           console.log(`Last client errored out, scheduling OPC UA disconnection in ${DISCONNECT_DELAY}ms.`);
           if (disconnectTimeout) clearTimeout(disconnectTimeout);
           disconnectTimeout = setTimeout(() => {
               console.log("Executing scheduled OPC UA disconnection after client error.");
               disconnectOPCUA();
               disconnectTimeout = null;
           }, DISCONNECT_DELAY);
       }
    });
  }); // End server.on('connection')

  server.on("error", (error) => {
    console.error("WebSocket Server error:", error);
    // Handle server-level errors (e.g., EADDRINUSE) if necessary
  });

  // Implement WebSocket heartbeat (Ping/Pong)
  const pingInterval = setInterval(() => {
    server.clients.forEach(clientWs => { // Use different variable name
      const wsClient = clientWs as WebSocket & { isAlive: boolean }; // Type assertion
      if (wsClient.isAlive === false) {
        console.log("WebSocket client not responding to ping, terminating connection.");
        return wsClient.terminate();
      }
      wsClient.isAlive = false; // Expect a pong back
      wsClient.ping(); // Send ping
    });
  }, WEBSOCKET_HEARTBEAT_INTERVAL);

  server.on('close', () => {
    console.log("WebSocket server shutting down.");
    clearInterval(pingInterval); // Clean up heartbeat interval
  });
}

async function disconnectOPCUA() {
  if (isDisconnectingOpcua || !opcuaClient) {
    // console.log("OPC UA disconnection already in progress or client not initialized.");
    return;
  }
  isDisconnectingOpcua = true;
  console.log("Disconnecting OPC UA client and session...");

  stopDataPolling(); // Stop polling first

  if (opcuaSession) {
    try {
      console.log("Closing OPC UA session...");
      await opcuaSession.close(); // Request clean close
      console.log("OPC UA session closed.");
    } catch (err) {
      console.error("Error closing OPC UA session:", err);
      // Continue disconnection even if session close fails
    } finally {
      opcuaSession = null; // Ensure session is marked as null
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
      opcuaClient = null; // Clean up client instance after disconnect
      connectionAttempts = 0; // Reset connection attempts after explicit disconnect
    }
  }
  isDisconnectingOpcua = false;
  console.log("OPC UA disconnection process finished.");
}

// Initialize WebSocket server on module load
startWebSocketServer().catch((error) => {
  console.error("Failed to start WebSocket server on initial load:", error);
  // Consider exiting or implementing a retry mechanism for the WS server itself if critical
});

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    if (disconnectTimeout) {
        clearTimeout(disconnectTimeout);
    }
    clearInterval(null as any); // Clear any other potential intervals if needed

    // 1. Close WebSocket Server to prevent new connections
    if (wsServer) {
        console.log("Closing WebSocket server...");
        wsServer.close(() => {
            console.log("WebSocket server closed.");
            // Proceed to disconnect OPC UA after WS server is closed
            disconnectOPCUA().then(() => {
                console.log("Shutdown complete.");
                process.exit(0);
            }).catch(err => {
                console.error("Error during OPC UA disconnect on shutdown:", err);
                process.exit(1);
            });
        });
        // Force close existing client connections after a short delay
        setTimeout(() => {
            console.log("Terminating remaining WebSocket client connections...");
            connectedClients.forEach(client => client.terminate());
        }, 2000); // Give clients 2 seconds to disconnect cleanly
    } else {
        // If WS server wasn't even up, just disconnect OPC UA
        await disconnectOPCUA();
        console.log("Shutdown complete (no WS server was running).");
        process.exit(0);
    }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));


// GET handler remains the same for potentially redirecting root requests
export async function GET(req: NextRequest) {
  const host = req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  // Example: Redirect '/' to '/dashboard'
  const shouldRedirect = req.nextUrl.pathname === '/api/opcua' || req.nextUrl.pathname === '/api/opcua/'; // Check if accessing the API route directly via GET
  if (shouldRedirect) {
    // Redirect to the main dashboard page instead of showing "OPC UA Service Ready"
    const dashboardUrl = new URL('/dashboard', origin); // Construct the absolute URL
    console.log(`Redirecting API GET request from ${req.url} to ${dashboardUrl.toString()}`);
    return NextResponse.redirect(dashboardUrl.toString(), { status: 302 });
  }

  // Fallback or handle other GET requests if necessary
  return new NextResponse("OPC UA WebSocket Service is Running", { status: 200 });
}