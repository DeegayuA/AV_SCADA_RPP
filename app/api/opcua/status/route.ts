// /api/opcua/status/route.ts (or your equivalent file)

import { OPCUAClient, ClientSubscription, MessageSecurityMode, SecurityPolicy, ClientSession } from 'node-opcua';
import { OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from '@/config/constants'; // Ensure these are correct
import { NextRequest, NextResponse } from 'next/server';

// --- Global Persistent Client Variables (for your main application's OPC UA connection) ---
let mainClient: OPCUAClient | null = null;
let mainSession: ClientSession | null = null;
let mainSubscription: ClientSubscription | null = null;
let mainCurrentConnectionStatus: 'offline' | 'online' | 'disconnected' = 'disconnected';
let isMainClientConnecting = false;
let mainConnectionCheckInterval: NodeJS.Timeout | null = null;

const MAIN_CLIENT_MAX_RETRIES = 3;
const MAIN_CLIENT_RETRY_BACKOFF = [1500, 3000, 6000]; // ms
const MAIN_CLIENT_CONNECTION_CHECK_INTERVAL = 5000; // ms

// --- Helper for the Main Persistent Client ---
const tryConnectAndCreateMainSession = async (endpoint: string, clientInstance: OPCUAClient): Promise<ClientSession | null> => {
    // This function assumes clientInstance is the mainClient and tries to connect it
    // It should not create a new client, but use the provided one.
    try {
        if (mainSession && (!mainSession.sessionId || clientInstance.endpointUrl !== endpoint)) {
            // console.log(`Main Session invalid or endpoint mismatch for ${clientInstance.endpointUrl} vs ${endpoint}. Disconnecting main client before reconnecting.`);
            await disconnectMainOPCClient(); // Disconnects mainClient, mainSession, mainSubscription
        } else if (!mainSession && clientInstance.endpointUrl && clientInstance.endpointUrl !== endpoint && !clientInstance.isReconnecting) {
             // console.log(`Main Client exists (${clientInstance.endpointUrl}), but no session and different target endpoint ${endpoint}. Disconnecting main client.`);
            await clientInstance.disconnect(); // Disconnect only the client part, session will be null
        }


        // If the client isn't connected, or connected to a different endpoint, or needs re-establishing.
        // The client's own connectionStrategy should handle retries if client.connect fails.
        // We ensure we only call connect if not already connected or if target changes.
        if (clientInstance.endpointUrl !== endpoint || !mainSession || !mainSession.sessionId) {
            // console.log(`Attempting to connect main client to ${endpoint}`);
            await clientInstance.connect(endpoint);
             // console.log(`Main client connected to ${endpoint}`);
        }
        
        // console.log("Creating main session...");
        const newSession = await clientInstance.createSession();
        // console.log("Main session created successfully.");
        return newSession;

    } catch (error: any) {
        console.error(`Error connecting or creating main session for ${endpoint}:`, error.message);
        // If createSession fails after connect, the client might still be connected.
        // Let the monitor handle full disconnect/reconnect if session remains invalid.
        return null;
    }
};

const createMainSubscriptionIfNotExist = async (): Promise<void> => {
    if (mainSession && mainClient && (!mainSubscription || mainSubscription.session !== mainSession || !mainSubscription.subscriptionId)) {
        if (mainSubscription && mainSubscription.subscriptionId) {
            try { await mainSubscription.terminate(); } catch (error) { console.warn("Error terminating old main subscription:", error); }
            mainSubscription = null;
        }
        // console.log("Creating main subscription...");
        mainSubscription = await mainSession.createSubscription2({
            requestedPublishingInterval: 1000, requestedLifetimeCount: 600,
            requestedMaxKeepAliveCount: 10, maxNotificationsPerPublish: 100,
            publishingEnabled: true, priority: 10,
        });
        // console.log("Main subscription created.");
        mainSubscription.on("keepalive", () => { /* console.log("Main Subscription keepalive") */ });
        mainSubscription.on("terminated", () => { mainSubscription = null; /* console.log("Main Subscription terminated."); */ });
    }
};

const disconnectMainOPCClient = async (): Promise<void> => {
    // console.log("Disconnecting Main OPC UA Client...");
    if (mainSubscription) {
        try { await mainSubscription.terminate(); } catch (e) { console.error("Error terminating main subscription:", e); }
        mainSubscription = null;
    }
    if (mainSession) {
        try { await mainSession.close(); } catch (e) { console.error("Error closing main session:", e); }
        mainSession = null;
    }
    if (mainClient) {
        try { await mainClient.disconnect(); } catch (e) { console.error("Error disconnecting main client:", e); }
        mainClient = null;
    }
    mainCurrentConnectionStatus = 'disconnected';
    // console.log("Main OPC UA Client Disconnection complete.");
};

const connectMainOPCClient = async (): Promise<'offline' | 'online' | 'disconnected'> => {
    if (isMainClientConnecting) {
        // console.log("Main client connection attempt already in progress. Returning current status:", mainCurrentConnectionStatus);
        return mainCurrentConnectionStatus;
    }
    isMainClientConnecting = true;

    // If already connected with a valid session, just return current status
    if (mainSession && mainSession.sessionId && mainClient && !mainClient.isReconnecting) {
        // console.log(`Main client already connected to ${mainClient.endpointUrl}. Status: ${mainCurrentConnectionStatus}`);
        isMainClientConnecting = false;
        return mainCurrentConnectionStatus;
    }

    // console.log("Attempting to establish main OPC UA connection...");
    await disconnectMainOPCClient(); // Ensure a clean state before new attempt

    let connectionType: 'offline' | 'online' | 'disconnected' = 'disconnected';
    
    // Attempt OFFLINE for main client
    // console.log("Main Client: Attempting OFFLINE endpoint...");
    mainClient = OPCUAClient.create({ // Create a new client instance for this connection sequence
        endpointMustExist: false, keepSessionAlive: true,
        connectionStrategy: { maxRetry: MAIN_CLIENT_MAX_RETRIES, initialDelay: MAIN_CLIENT_RETRY_BACKOFF[0], maxDelay: MAIN_CLIENT_RETRY_BACKOFF[MAIN_CLIENT_RETRY_BACKOFF.length -1]},
        securityMode: MessageSecurityMode.None, securityPolicy: SecurityPolicy.None, applicationName: "MainAppClient"
    });
    mainClient.on("backoff", (retry, delay) => { /* console.log(`MainClient (Offline Attempt) backoff: retry ${retry}, delay ${delay}ms`)*/ });
    mainClient.on("connection_reestablished", () => { createMainSubscriptionIfNotExist(); });
    mainClient.on("connection_lost", () => { mainCurrentConnectionStatus = 'disconnected'; });


    mainSession = await tryConnectAndCreateMainSession(OPC_UA_ENDPOINT_OFFLINE, mainClient);
    if (mainSession) {
        // console.log("Main client successfully connected to OFFLINE endpoint.");
        connectionType = 'offline';
        await createMainSubscriptionIfNotExist();
    } else {
        // console.log("Main client OFFLINE connection failed. Disconnecting this attempt.");
        if (mainClient) await mainClient.disconnect().catch(() => {}); // clean up the failed client
        mainClient = null; // ensure it's null so ONLINE attempt creates a new one or logic handles it.

        // Attempt ONLINE for main client
        // console.log("Main Client: Attempting ONLINE endpoint...");
        mainClient = OPCUAClient.create({ // New client instance for online
            endpointMustExist: false, keepSessionAlive: true,
            connectionStrategy: { maxRetry: 1, initialDelay: 1000, maxDelay: 5000 }, // Quicker for online usually
            securityMode: MessageSecurityMode.None, securityPolicy: SecurityPolicy.None, applicationName: "MainAppClient"
        });
        mainClient.on("backoff", (retry, delay) => { /* console.log(`MainClient (Online Attempt) backoff: retry ${retry}, delay ${delay}ms`)*/ });
        mainClient.on("connection_reestablished", () => { createMainSubscriptionIfNotExist(); });
        mainClient.on("connection_lost", () => { mainCurrentConnectionStatus = 'disconnected'; });


        mainSession = await tryConnectAndCreateMainSession(OPC_UA_ENDPOINT_ONLINE, mainClient);
        if (mainSession) {
            // console.log("Main client successfully connected to ONLINE endpoint.");
            connectionType = 'online';
            await createMainSubscriptionIfNotExist();
        } else {
            // console.log("Main client ONLINE connection also failed.");
            await disconnectMainOPCClient(); // Full cleanup if both attempts failed
            connectionType = 'disconnected';
        }
    }

    mainCurrentConnectionStatus = connectionType;
    isMainClientConnecting = false;
    // console.log(`Main client connection process finished. Final Status: ${mainCurrentConnectionStatus}`);
    return mainCurrentConnectionStatus;
};

const monitorMainConnection = (): void => {
    if (mainConnectionCheckInterval) {
        clearInterval(mainConnectionCheckInterval);
    }
    mainConnectionCheckInterval = setInterval(async () => {
        if (isMainClientConnecting) return; // Don't interfere with an ongoing connection attempt

        if (mainCurrentConnectionStatus === 'disconnected' || !mainSession?.sessionId) {
            // console.log("Main connection monitor: Status is disconnected or session invalid. Attempting to reconnect main client...");
            await connectMainOPCClient();
        } else if (mainClient && (!mainSession || !mainSession.sessionId) && !mainClient.isReconnecting) {
             // console.log("Main connection monitor: Client is connected but no active sessions. Attempting reconnect...");
            await connectMainOPCClient();
        }
        else if (mainSession?.sessionId && mainClient && (!mainSubscription?.subscriptionId || mainSubscription?.session !== mainSession)) {
            // console.log("Main connection monitor: Session active, but subscription is missing/invalid. Recreating main subscription.");
            await createMainSubscriptionIfNotExist();
        }
    }, MAIN_CLIENT_CONNECTION_CHECK_INTERVAL);
};

monitorMainConnection(); // Start monitoring the MAIN persistent connection


// --- API GET Handler ---
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const testedEndpointUrl = searchParams.get('testedClientSideEndpoint');

    console.log(`GET /api/opcua/status. Tested URL: ${testedEndpointUrl || "(main status request)"}`);

    if (testedEndpointUrl) {
        // --- Logic to test the SPECIFIC endpoint ---
        console.log(`Executing SPECIFIC test for endpoint: ${testedEndpointUrl}`);
        let tempTestClient: OPCUAClient | null = null;
        let tempTestSession: ClientSession | null = null;
        
        try {
            tempTestClient = OPCUAClient.create({
                endpointMustExist: false,
                connectionStrategy: { maxRetry: 0, initialDelay: 500, maxDelay: 1000 }, // No retry for quick test
                securityMode: MessageSecurityMode.None,
                securityPolicy: SecurityPolicy.None,
                applicationName: "OPCUASingleTestClient",
                clientName: `Test-${Date.now()}`,
                keepSessionAlive: false, // Don't maintain this connection
            });

            // console.log(`Temporary test client: Connecting to ${testedEndpointUrl}`);
            await tempTestClient.connect(testedEndpointUrl);
            // console.log(`Temporary test client: Connected. Creating session for ${testedEndpointUrl}`);
            tempTestSession = await tempTestClient.createSession();
            // console.log(`Temporary test client: Session created for ${testedEndpointUrl}`);

            let statusForTestedEndpoint: 'online' | 'offline' = 'online'; // Default assumption
            if (testedEndpointUrl.startsWith('opc.tcp://192.168.') || 
                testedEndpointUrl.startsWith('opc.tcp://10.') ||
                (testedEndpointUrl.startsWith('opc.tcp://172.') && parseInt(testedEndpointUrl.split('.')[1],10) >= 16 && parseInt(testedEndpointUrl.split('.')[1],10) <= 31) ) {
                statusForTestedEndpoint = 'offline';
            }
            
            const successMsg = `Successfully connected to specific test endpoint ${testedEndpointUrl}. Classified as: ${statusForTestedEndpoint}`;
            console.log(successMsg);
            
            if (tempTestSession) await tempTestSession.close().catch(e => console.warn("Error closing temp test session:", e.message));
            if (tempTestClient) await tempTestClient.disconnect().catch(e => console.warn("Error disconnecting temp test client:", e.message));

            return NextResponse.json({
                connectionStatus: statusForTestedEndpoint,
                message: successMsg,
                testedEndpoint: testedEndpointUrl,
            });

        } catch (error: any) {
            const errorMsg = `Failed to connect to specific test endpoint ${testedEndpointUrl}: ${error.message}`;
            console.error(errorMsg);
            if (tempTestSession) await tempTestSession.close().catch(e => console.warn("Error closing temp test session (on error):", e.message));
            if (tempTestClient) await tempTestClient.disconnect().catch(e => console.warn("Error disconnecting temp test client (on error):", e.message));
            
            return NextResponse.json({
                connectionStatus: 'disconnected',
                message: errorMsg,
                testedEndpoint: testedEndpointUrl,
                errorDetail: error.message,
            }, { status: 200 }); // Return 200 to allow frontend to parse error, or 500 if it's a server issue
        }

    } else {
        // --- Original logic: Return status of the MAIN, persistent client ---
        // console.log("No specific endpoint. Returning status of the main application client.");
        if (mainCurrentConnectionStatus === 'disconnected' && !isMainClientConnecting) {
            // console.log("Main client is disconnected and not currently connecting. Triggering a connection attempt for main client before returning status.");
            await connectMainOPCClient(); // Ensure it tries to connect if completely down
        }
        console.log(`API (main client status) returning: ${mainCurrentConnectionStatus}`);
        return NextResponse.json({ connectionStatus: mainCurrentConnectionStatus });
    }
}

// Ensure OPC_UA_ENDPOINT_OFFLINE and OPC_UA_ENDPOINT_ONLINE are defined in '@/config/constants'
// e.g. export const OPC_UA_ENDPOINT_OFFLINE = "opc.tcp://192.168.1.10:4840";
//      export const OPC_UA_ENDPOINT_ONLINE = "opc.tcp://your.public.ip:4840";