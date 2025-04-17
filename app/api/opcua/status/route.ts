import { OPCUAClient, ClientSubscription, MessageSecurityMode, SecurityPolicy, ClientSession } from 'node-opcua';
import { OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from '@/config/constants';
import { NextResponse } from 'next/server';

let client: OPCUAClient | null = null;
let session: ClientSession | null = null; // Keep track of the session
let subscription: ClientSubscription | null = null;
let currentConnectionStatus: 'offline' | 'online' | 'disconnected' = 'disconnected'; // Store the current status
let isConnecting = false; // Prevent concurrent connection attempts

const MAX_RETRIES = 3; // Reduced retries for faster feedback if offline fails
const RETRY_BACKOFF = [1500, 3000, 6000]; // Adjusted backoff times

// --- Helper function to attempt connection and session creation ---
const tryConnectAndCreateSession = async (endpoint: string): Promise<ClientSession | null> => {
    if (!client) {
        console.log("Creating new OPC UA client instance.");
        client = OPCUAClient.create({
            endpointMustExist: false, // Allow connection even if endpoint is initially unavailable
            keepSessionAlive: true,
            connectionStrategy: { // Manage retries internally somewhat, though we add our own layer
                maxRetry: 1, // We handle the main retry logic
                initialDelay: 1000,
                maxDelay: 5000
            },
            securityMode: MessageSecurityMode.None, // Adjust if security is needed
            securityPolicy: SecurityPolicy.None,   // Adjust if security is needed
            // requestedSessionTimeout: 60000, // Optional: Longer timeout
        });

        // Basic event listeners for debugging
        client.on("backoff", (retry, delay) => console.log(`Client backoff: retry ${retry}, delay ${delay}ms`));
        client.on("connection_reestablished", () => console.log("Client connection re-established."));
        client.on("connection_lost", () => console.log("Client connection lost."));
        client.on("start_reconnection", () => console.log("Client starting reconnection..."));
        client.on("reconnection_attempt_has_failed", (error, endpointUrl) => console.error(`Client reconnection attempt failed for ${endpointUrl}:`, error?.message));

    }

    try {
        console.log(`Attempting to connect client to ${endpoint}`);
        // Disconnect if connected to a *different* endpoint or if session is invalid
        if (session && (!session.isOpen() || client.endpointUrl !== endpoint)) {
             console.log(`Session invalid or endpoint mismatch. Disconnecting before reconnecting to ${endpoint}`);
             await disconnectOPC(); // Use a dedicated disconnect function
        } else if (!session && client.endpointUrl) {
             // Client might exist but no session, ensure clean state
             console.log("Client exists but no session. Disconnecting client.");
             await client.disconnect();
        }

        // Only connect if not already connected to the desired endpoint
        if (client.endpointUrl !== endpoint) {
             await client.connect(endpoint);
             console.log(`Client connected to ${endpoint}`);
        } else {
             console.log(`Client already connected to ${endpoint}.`);
        }


        console.log("Creating session...");
        session = await client.createSession();
        console.log("Session created successfully.");

         // Optional: Clean up old subscription if it exists and belongs to a closed session
         if (subscription && subscription.session.hasEnded()) {
             console.log("Cleaning up old subscription from closed session.");
             // No explicit cleanup needed if session is gone, but good practice to nullify
             subscription = null;
         }


        // Recreate subscription if needed (or if it belongs to a different session)
        if (!subscription || subscription.session !== session) {
            console.log("Creating subscription...");
            subscription = await session.createSubscription2({
                requestedPublishingInterval: 1000,
                requestedLifetimeCount: 600, // 10 minutes lifetime
                requestedMaxKeepAliveCount: 10, // 10 seconds keep-alive
                maxNotificationsPerPublish: 100,
                publishingEnabled: true,
                priority: 10,
            });
            console.log("Subscription created.");

            subscription.on("keepalive", () => console.log("Subscription keepalive"));
            subscription.on("terminated", () => {
                console.log("Subscription terminated.");
                subscription = null; // Clear subscription reference
            });
        }


        return session; // Return the created session

    } catch (error: any) {
        console.error(`Error connecting or creating session for ${endpoint}:`, error.message);
        // Clean up potentially partially connected state
        if (session && !session.isOpen()) session = null;
        // Don't disconnect the client here, let the outer logic handle retries/fallback
        return null; // Indicate failure
    }
};

// --- Dedicated Disconnect Function ---
const disconnectOPC = async (): Promise<void> => {
    console.log("Disconnecting OPC UA...");
    if (subscription) {
        try {
            console.log("Terminating subscription...");
            await subscription.terminate();
            console.log("Subscription terminated.");
        } catch (subError: any) {
            console.error("Error terminating subscription:", subError.message);
        } finally {
            subscription = null;
        }
    }
    if (session) {
        try {
            console.log("Closing session...");
            await session.close(); // Pass true to delete subscriptions
            console.log("Session closed.");
        } catch (sessError: any) {
            console.error("Error closing session:", sessError.message);
        } finally {
            session = null;
        }
    }
    if (client) {
        try {
            console.log("Disconnecting client...");
            await client.disconnect();
            console.log("Client disconnected.");
             // Optional: Nullify client if you want a completely fresh start next time
             // client = null;
        } catch (clientError: any) {
            console.error("Error disconnecting client:", clientError.message);
        }
    }
    currentConnectionStatus = 'disconnected'; // Update status after full disconnect
    console.log("OPC UA Disconnection complete.");
};


// --- Main Connection Logic ---
const connectOPC = async (): Promise<'offline' | 'online' | 'disconnected'> => {
    if (isConnecting) {
        console.log("Connection attempt already in progress. Returning current status:", currentConnectionStatus);
        return currentConnectionStatus; // Avoid race conditions
    }
    isConnecting = true;

    // 1. Check if already connected and session is valid
    if (session && session.isOpen() && client?.endpointUrl) {
        console.log(`Already connected and session is open to ${client.endpointUrl}. Status: ${currentConnectionStatus}`);
        isConnecting = false;
        return currentConnectionStatus; // Return existing status
    } else if (session && !session.isOpen()) {
         console.log("Session found but not open. Attempting full reconnect.");
         await disconnectOPC(); // Ensure clean state if session died
    } else if (client && client.isReconnecting) {
         console.log("Client is currently attempting reconnection. Returning 'disconnected' for now.");
         // We might be in a state where the client library is trying to reconnect.
         // It's safer to report disconnected until it succeeds or we force a new connection.
         isConnecting = false;
         return 'disconnected';
    }


    console.log("No valid connection found. Starting connection process...");
    let connectionType: 'offline' | 'online' | 'disconnected' = 'disconnected';
    let sessionCreated: ClientSession | null = null;


    // 2. Try OFFLINE endpoint first with retries
    console.log("--- Attempting OFFLINE Connection ---");
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`Offline Attempt ${attempt}/${MAX_RETRIES}...`);
        sessionCreated = await tryConnectAndCreateSession(OPC_UA_ENDPOINT_OFFLINE);
        if (sessionCreated) {
            console.log("Successfully connected to OFFLINE endpoint.");
            connectionType = 'offline';
            break; // Exit loop on success
        } else {
             console.log(`Offline attempt ${attempt} failed.`);
             // If client exists but failed, disconnect it before retrying or falling back
             if(client && client.endpointUrl) {
                 console.log("Disconnecting client after failed offline attempt...");
                 await client.disconnect().catch(e => console.error("Error disconnecting client after failed attempt:", e.message));
             }
            if (attempt < MAX_RETRIES) {
                const backoffTime = RETRY_BACKOFF[attempt - 1];
                console.log(`Waiting ${backoffTime}ms before next offline attempt...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }

    // 3. If OFFLINE failed, try ONLINE endpoint once
    if (connectionType === 'disconnected') {
        console.log("--- Offline connection failed. Attempting ONLINE Connection ---");
        sessionCreated = await tryConnectAndCreateSession(OPC_UA_ENDPOINT_ONLINE);
        if (sessionCreated) {
            console.log("Successfully connected to ONLINE endpoint.");
            connectionType = 'online';
        } else {
            console.log("Online connection attempt failed.");
            // Ensure disconnected state if online also fails
            await disconnectOPC(); // Clean up thoroughly if both failed
            connectionType = 'disconnected';
        }
    }

    currentConnectionStatus = connectionType; // Update the global status
    isConnecting = false; // Release lock
    console.log(`Connection process finished. Final Status: ${currentConnectionStatus}`);
    return currentConnectionStatus;
};

// --- API Route Handler ---
export async function GET() {
    console.log("GET /api/opcua/status received");
    const status = await connectOPC();
    console.log(`API returning status: ${status}`);
    // Return the status string directly
    return NextResponse.json({ connectionStatus: status });
}

// Optional: Add a cleanup mechanism on server shutdown
// process.on('SIGINT', async () => {
//     console.log("Received SIGINT. Disconnecting OPC UA Client...");
//     await disconnectOPC();
//     process.exit(0);
// });
// process.on('SIGTERM', async () => {
//     console.log("Received SIGTERM. Disconnecting OPC UA Client...");
//     await disconnectOPC();
//     process.exit(0);
// });