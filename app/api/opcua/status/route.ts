import { OPCUAClient, ClientSubscription, MessageSecurityMode, SecurityPolicy, ClientSession } from 'node-opcua';
import { OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from '@/config/constants';
import { NextResponse } from 'next/server';

let client: OPCUAClient | null = null;
let session: ClientSession | null = null;
let subscription: ClientSubscription | null = null;
let currentConnectionStatus: 'offline' | 'online' | 'disconnected' = 'disconnected';
let isConnecting = false;
let connectionCheckInterval: NodeJS.Timeout | null = null;

const MAX_RETRIES = 3;
const RETRY_BACKOFF = [1500, 3000, 6000];
const CONNECTION_CHECK_INTERVAL = 5000; // Check connection every 5 seconds

const tryConnectAndCreateSession = async (endpoint: string): Promise<ClientSession | null> => {
    if (!client) {
        // console.log("Creating new OPC UA client instance.");
        client = OPCUAClient.create({
            endpointMustExist: false,
            keepSessionAlive: true,
            connectionStrategy: {
                maxRetry: 1,
                initialDelay: 1000,
                maxDelay: 5000
            },
            securityMode: MessageSecurityMode.None,
            securityPolicy: SecurityPolicy.None,
        });

        client.on("backoff", (retry, delay) => /* console.log(`Client backoff: retry ${retry}, delay ${delay}ms`) */ {});
        client.on("connection_reestablished", () => {
            // console.log("Client connection re-established.");
            // Ensure subscription is recreated after re-establishment
            createSubscriptionIfNotExist();
        });
        client.on("connection_lost", () => {
            // console.log("Client connection lost.");
            currentConnectionStatus = 'disconnected';
            // No need to explicitly call connectOPC here as the client's connectionStrategy will handle it
        });
        client.on("start_reconnection", () => /* console.log("Client starting reconnection...") */ {});
        client.on("reconnection_attempt_has_failed", (error: Error, endpointUrl: string) => {
            console.error(`Client reconnection attempt failed for ${endpointUrl}:`, error.message);
        });
    }

    try {
        // console.log(`Attempting to connect client to ${endpoint}`);
        if (session && (!session.sessionId || client?.endpointUrl !== endpoint)) {
            // console.log(`Session invalid or endpoint mismatch. Disconnecting before reconnecting to ${endpoint}`);
            await disconnectOPC();
        } else if (!session && client?.endpointUrl && !client.isReconnecting) {
            // console.log("Client exists but no session. Closing existing connection.");
            await client.disconnect();
        }

        if (client?.isReconnecting || client?.endpointUrl !== endpoint) {
            await client.connect(endpoint);
            // console.log(`Client connected to ${endpoint}`);
        }

        // console.log("Creating session...");
        session = await client.createSession();
        // console.log("Session created successfully.");
        // console.log(`Session created successfully for endpoint: ${endpoint}`); // Log the endpoint instead of assigning it

        await createSubscriptionIfNotExist();

        return session;
    } catch (error: any) {
        console.error(`Error connecting or creating session for ${endpoint}:`, error.message);
        if (session && !session.sessionId) session = null;
        return null;
    }
};

const createSubscriptionIfNotExist = async (): Promise<void> => {
    if (session && (!subscription || subscription.session !== session || !subscription.subscriptionId)) {
        if (subscription && subscription.subscriptionId) {
            // console.log("Cleaning up existing subscription before creating a new one.");
            try {
                await subscription.terminate();
            } catch (error) {
                console.warn("Error terminating old subscription:", error);
            }
            subscription = null;
        }
        // console.log("Creating subscription...");
        subscription = await session.createSubscription2({
            requestedPublishingInterval: 1000,
            requestedLifetimeCount: 600,
            requestedMaxKeepAliveCount: 10,
            maxNotificationsPerPublish: 100,
            publishingEnabled: true,
            priority: 10,
        });
        // console.log("Subscription created.");

        subscription.on("keepalive", () => /* console.log("Subscription keepalive") */ {});
        subscription.on("terminated", () => {
            // console.log("Subscription terminated.");
            subscription = null;
        });
    } else if (subscription) {
        // Optionally check if the publishing is still enabled
        if (!subscription.publishingEnabled) {
            // console.log("Subscription publishing is disabled, re-enabling...");
            try {
                // console.log("Recreating subscription to enable publishing mode...");
                await createSubscriptionIfNotExist();
                // console.log("Subscription publishing re-enabled.");
            } catch (error) {
                console.error("Error re-enabling subscription publishing:", error);
            }
        }
    }
};

const disconnectOPC = async (): Promise<void> => {
    // console.log("Disconnecting OPC UA...");
    if (subscription) {
        try {
            // console.log("Terminating subscription...");
            await subscription.terminate();
            // console.log("Subscription terminated.");
        } catch (subError: any) {
            console.error("Error terminating subscription:", subError.message);
        } finally {
            subscription = null;
        }
    }
    if (session) {
        try {
            // console.log("Closing session...");
            await session.close();
            // console.log("Session closed.");
        } catch (sessError: any) {
            console.error("Error closing session:", sessError.message);
        } finally {
            session = null;
        }
    }
    if (client) {
        try {
            // console.log("Disconnecting client...");
            await client.disconnect();
            // console.log("Client disconnected.");
        } catch (clientError: any) {
            console.error("Error disconnecting client:", clientError.message);
        } finally {
            client = null; // Allow reconnect to create a fresh client if needed
        }
    }
    currentConnectionStatus = 'disconnected';
    // console.log("OPC UA Disconnection complete.");
};

const connectOPC = async (): Promise<'offline' | 'online' | 'disconnected'> => {
    if (isConnecting) {
        // console.log("Connection attempt already in progress. Returning current status:", currentConnectionStatus);
        return currentConnectionStatus;
    }
    isConnecting = true;

    if (session && session.sessionId && client?.endpointUrl && !client.isReconnecting) {
        // console.log(`Already connected and session is open to ${client.endpointUrl}. Status: ${currentConnectionStatus}`);
        isConnecting = false;
        return currentConnectionStatus;
    } else if (session && !session.sessionId) {
        // console.log("Session found but not open. Attempting full reconnect.");
        await disconnectOPC();
    } else if (client && client.isReconnecting) {
        // console.log("Client is currently attempting reconnection. Returning 'disconnected' for now.");
        isConnecting = false;
        return 'disconnected';
    } else if (client && client.isReconnecting === false && !session?.sessionId) {
        // console.log("Client is connected but no session. Attempting to create session.");
        const endpoint = client.endpointUrl;
        if (endpoint) {
            const newSession = await tryConnectAndCreateSession(endpoint);
            if (newSession) {
                currentConnectionStatus = endpoint === OPC_UA_ENDPOINT_OFFLINE ? 'offline' : 'online';
                isConnecting = false;
                return currentConnectionStatus;
            }
        }
    }

    // console.log("No valid connection found. Starting connection process...");
    let connectionType: 'offline' | 'online' | 'disconnected' = 'disconnected';
    let sessionCreated: ClientSession | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // console.log(`Offline Attempt ${attempt}/${MAX_RETRIES}...`);
        sessionCreated = await tryConnectAndCreateSession(OPC_UA_ENDPOINT_OFFLINE);
        if (sessionCreated) {
            // console.log("Successfully connected to OFFLINE endpoint.");
            connectionType = 'offline';
            break;
        } else {
            // console.log(`Offline attempt ${attempt} failed.`);
            if (attempt < MAX_RETRIES) {
                const backoffTime = RETRY_BACKOFF[attempt - 1];
                // console.log(`Waiting ${backoffTime}ms before next offline attempt...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }

    if (connectionType === 'disconnected') {
        // console.log("--- Offline connection failed. Attempting ONLINE Connection ---");
        sessionCreated = await tryConnectAndCreateSession(OPC_UA_ENDPOINT_ONLINE);
        if (sessionCreated) {
            // console.log("Successfully connected to ONLINE endpoint.");
            connectionType = 'online';
        } else {
            // console.log("Online connection attempt failed.");
            await disconnectOPC();
            connectionType = 'disconnected';
        }
    }

    currentConnectionStatus = connectionType;
    isConnecting = false;
    // console.log(`Connection process finished. Final Status: ${currentConnectionStatus}`);
    return currentConnectionStatus;
};

const monitorConnection = (): void => {
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
    }
    connectionCheckInterval = setInterval(async () => {
        if (currentConnectionStatus !== 'online' && currentConnectionStatus !== 'offline' && !isConnecting) {
            // console.log("Connection status is disconnected, attempting to reconnect...");
            await connectOPC();
        } else if (session && !session.sessionId && !isConnecting) {
            // console.log("Session is invalid, attempting to reconnect...");
            await connectOPC();
        } else if (client && !client.isReconnecting && !isConnecting) {
            // console.log("Client is disconnected, attempting to reconnect...");
            await connectOPC();
        } else if (session?.sessionId && client && (!subscription?.subscriptionId || subscription?.session !== session)) {
            // console.log("Session and client are connected, but subscription is missing or invalid. Recreating subscription.");
            await createSubscriptionIfNotExist();
        }
    }, CONNECTION_CHECK_INTERVAL);
};

// Start monitoring the connection when this module loads
monitorConnection();

export async function GET() {
    console.log("GET /api/opcua/status received");
    const status = await connectOPC();
    console.log(`API returning status: ${status}`);
    return NextResponse.json({ connectionStatus: status });
}