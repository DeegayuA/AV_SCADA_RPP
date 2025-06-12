// /api/opcua/status/route.ts

import { OPCUAClient, ClientSubscription, MessageSecurityMode, SecurityPolicy, ClientSession } from 'node-opcua';
import { OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from '@/config/constants';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let mainClient: OPCUAClient | null = null;
let mainSession: ClientSession | null = null;
let mainSubscription: ClientSubscription | null = null;
let mainCurrentConnectionStatus: 'offline' | 'online' | 'disconnected' = 'disconnected';
let isMainClientConnecting = false;
let mainConnectionCheckInterval: NodeJS.Timeout | null = null;

const MAIN_CLIENT_MAX_RETRIES = 3;
const MAIN_CLIENT_RETRY_BACKOFF = [1500, 3000, 6000]; // ms
const MAIN_CLIENT_CONNECTION_CHECK_INTERVAL = 5000; // ms

const tryConnectAndCreateMainSession = async (endpoint: string, clientInstance: OPCUAClient): Promise<ClientSession | null> => {
    try {
        // Disconnection logic from original code - assuming it's necessary for your specific client reuse strategy
        // This part could be simplified if `connectMainOPCClient` always starts with `disconnectMainOPCClient()`
        if (mainSession && (mainSession.sessionId.isEmpty() || clientInstance.endpointUrl !== endpoint)) {
            console.log(`Main Session invalid or endpoint mismatch for ${clientInstance.endpointUrl} vs ${endpoint}. Disconnecting main client before reconnecting.`);
            await disconnectMainOPCClient(); 
        } else if (!mainSession && clientInstance.endpointUrl && clientInstance.endpointUrl !== endpoint && !clientInstance.isReconnecting) {
             console.log(`Main Client exists (${clientInstance.endpointUrl}), but no session and different target endpoint ${endpoint}. Disconnecting main client's current connection.`);
            await clientInstance.disconnect(); 
        }

        if (clientInstance.endpointUrl !== endpoint || !mainSession || mainSession.sessionId.isEmpty()) {
            console.log(`Attempting to connect main client to ${endpoint}`);
            await clientInstance.connect(endpoint);
            console.log(`Main client connected to ${endpoint}`);
        }
        
        console.log("Creating main session...");
        const newSession = await clientInstance.createSession();
        console.log("Main session created successfully.");
        return newSession;

    } catch (error: any) {
        console.error(`Error connecting or creating main session for ${endpoint}:`, error.message);
        return null;
    }
};

const createMainSubscriptionIfNotExist = async (): Promise<void> => {
    if (mainSession && !mainSession.sessionId.isEmpty() && mainClient && (!mainSubscription || mainSubscription.session !== mainSession || !mainSubscription.subscriptionId)) {
        if (mainSubscription && mainSubscription.subscriptionId) {
            try { 
                console.log("Terminating old main subscription...");
                await mainSubscription.terminate(); 
                console.log("Old main subscription terminated.");
            } catch (error: any) { console.warn("Error terminating old main subscription:", error.message); }
            mainSubscription = null;
        }
        try {
            console.log("Creating main subscription...");
            mainSubscription = await mainSession.createSubscription2({
                requestedPublishingInterval: 1000, requestedLifetimeCount: 600,
                requestedMaxKeepAliveCount: 10, maxNotificationsPerPublish: 100,
                publishingEnabled: true, priority: 10,
            });
            console.log(`Main subscription created with ID: ${mainSubscription.subscriptionId}.`);
            mainSubscription.on("keepalive", () => { /* console.log("Main Subscription keepalive") */ });
            mainSubscription.on("terminated", () => { 
                console.log("Main Subscription terminated event received.");
                mainSubscription = null; 
            });
        } catch (error: any) {
            console.error("Error creating main subscription in createMainSubscriptionIfNotExist:", error.message);
            mainSubscription = null; // Ensure it's null if creation failed
        }
    }
};

const disconnectMainOPCClient = async (): Promise<void> => {
    console.log("Disconnecting Main OPC UA Client...");
    if (mainSubscription) {
        try { await mainSubscription.terminate(); } catch (e: any) { console.warn("Error terminating main subscription during disconnect:", e.message); }
        mainSubscription = null;
    }
    if (mainSession) {
        try { await mainSession.close(); } catch (e: any) { console.warn("Error closing main session during disconnect:", e.message); }
        mainSession = null;
    }
    if (mainClient) {
        try { await mainClient.disconnect(); } catch (e: any) { console.warn("Error disconnecting main client during disconnect:", e.message); }
        mainClient = null;
    }
    mainCurrentConnectionStatus = 'disconnected';
    console.log("Main OPC UA Client Disconnection complete.");
};

const connectMainOPCClient = async (): Promise<'offline' | 'online' | 'disconnected'> => {
    if (isMainClientConnecting) {
        console.log("Main client connection attempt already in progress. Returning current status:", mainCurrentConnectionStatus);
        return mainCurrentConnectionStatus;
    }
    isMainClientConnecting = true;

    if (mainSession && !mainSession.sessionId.isEmpty() && mainClient && !mainClient.isReconnecting) {
        console.log(`Main client already connected to ${mainClient.endpointUrl}. Status: ${mainCurrentConnectionStatus}`);
        isMainClientConnecting = false;
        return mainCurrentConnectionStatus;
    }

    console.log("Attempting to establish main OPC UA connection...");
    await disconnectMainOPCClient(); 

    let connectionType: 'offline' | 'online' | 'disconnected' = 'disconnected';
    
    // Attempt OFFLINE
    console.log("Main Client: Attempting OFFLINE endpoint...");
    mainClient = OPCUAClient.create({ 
        endpointMustExist: false, keepSessionAlive: true,
        connectionStrategy: { maxRetry: MAIN_CLIENT_MAX_RETRIES, initialDelay: MAIN_CLIENT_RETRY_BACKOFF[0], maxDelay: MAIN_CLIENT_RETRY_BACKOFF[MAIN_CLIENT_RETRY_BACKOFF.length -1]},
        securityMode: MessageSecurityMode.None, securityPolicy: SecurityPolicy.None, applicationName: "MainAppClient-MyApp" // Make app name more specific
    });
    mainClient.on("backoff", (retry, delay) => console.log(`MainClient (Offline Attempt) backoff: retry ${retry}, delay ${delay}ms`));
    mainClient.on("connection_reestablished", async () => { // Event handler made async and try-catched
        console.log("MainClient (Offline): Connection re-established event.");
        try { await createMainSubscriptionIfNotExist(); } 
        catch (e: any) { console.error("Error in MainClient 'connection_reestablished' (offline):", e.message); }
    });
    mainClient.on("connection_lost", () => { 
        console.log("MainClient (Offline): Connection lost event.");
        mainCurrentConnectionStatus = 'disconnected'; 
    });

    mainSession = await tryConnectAndCreateMainSession(OPC_UA_ENDPOINT_OFFLINE, mainClient);
    if (mainSession) {
        console.log("Main client successfully connected to OFFLINE endpoint.");
        connectionType = 'offline';
        try {
            await createMainSubscriptionIfNotExist();
        } catch (subError: any) {
            console.error(`Error during initial main subscription creation (offline attempt): ${subError.message}`);
        }
    } else {
        console.log("Main client OFFLINE connection failed. Disconnecting this attempt.");
        if (mainClient) await mainClient.disconnect().catch(() => {});
        mainClient = null; 

        // Attempt ONLINE
        console.log("Main Client: Attempting ONLINE endpoint...");
        mainClient = OPCUAClient.create({ 
            endpointMustExist: false, keepSessionAlive: true,
            connectionStrategy: { maxRetry: 1, initialDelay: 1000, maxDelay: 5000 }, 
            securityMode: MessageSecurityMode.None, securityPolicy: SecurityPolicy.None, applicationName: "MainAppClient-MyApp"
        });
        mainClient.on("backoff", (retry, delay) => console.log(`MainClient (Online Attempt) backoff: retry ${retry}, delay ${delay}ms`));
        mainClient.on("connection_reestablished", async () => {
            console.log("MainClient (Online): Connection re-established event.");
            try { await createMainSubscriptionIfNotExist(); }
            catch (e: any) { console.error("Error in MainClient 'connection_reestablished' (online):", e.message); }
        });
        mainClient.on("connection_lost", () => {
            console.log("MainClient (Online): Connection lost event.");
            mainCurrentConnectionStatus = 'disconnected'; 
        });

        mainSession = await tryConnectAndCreateMainSession(OPC_UA_ENDPOINT_ONLINE, mainClient);
        if (mainSession) {
            console.log("Main client successfully connected to ONLINE endpoint.");
            connectionType = 'online';
            try {
                await createMainSubscriptionIfNotExist();
            } catch (subError: any) {
                console.error(`Error during initial main subscription creation (online attempt): ${subError.message}`);
            }
        } else {
            console.log("Main client ONLINE connection also failed.");
            await disconnectMainOPCClient(); 
            connectionType = 'disconnected';
        }
    }

    mainCurrentConnectionStatus = connectionType;
    isMainClientConnecting = false;
    console.log(`Main client connection process finished. Final Status: ${mainCurrentConnectionStatus}`);
    return mainCurrentConnectionStatus;
};

const monitorMainConnection = (): void => {
    if (mainConnectionCheckInterval) {
        clearInterval(mainConnectionCheckInterval);
    }
    mainConnectionCheckInterval = setInterval(async () => {
        if (isMainClientConnecting) {
            // console.log("Monitor: Skipping check, connection attempt in progress.");
            return;
        }

        try {
            const isSessionInvalid = !mainSession || mainSession.sessionId.isEmpty();
            const isSubscriptionInvalid = mainSession && !mainSession.sessionId.isEmpty() && mainClient && 
                                          (!mainSubscription || mainSubscription.session !== mainSession || !mainSubscription.subscriptionId);

            if (mainCurrentConnectionStatus === 'disconnected' || (mainClient && isSessionInvalid && !mainClient.isReconnecting) ) {
                console.log("Main connection monitor: Status is disconnected or session invalid/empty. Attempting to reconnect main client...");
                await connectMainOPCClient();
            } else if (isSubscriptionInvalid) {
                console.log("Main connection monitor: Session active, but subscription is missing/invalid. Recreating main subscription.");
                await createMainSubscriptionIfNotExist();
            }
        } catch (error: any) {
            console.error("Error in monitorMainConnection interval:", error.message, error.stack);
        }
    }, MAIN_CLIENT_CONNECTION_CHECK_INTERVAL);
};

monitorMainConnection();


export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const testedEndpointUrl = searchParams.get('testedClientSideEndpoint');

    console.log(`GET /api/opcua/status. Tested URL: ${testedEndpointUrl || "(main status request)"}`);

    if (testedEndpointUrl) {
        console.log(`Executing SPECIFIC test for endpoint: ${testedEndpointUrl}`);
        let tempTestClient: OPCUAClient | null = null;
        let tempTestSession: ClientSession | null = null;
        
        try {
            tempTestClient = OPCUAClient.create({
                endpointMustExist: false,
                connectionStrategy: { maxRetry: 0, initialDelay: 500, maxDelay: 1000 },
                securityMode: MessageSecurityMode.None,
                securityPolicy: SecurityPolicy.None,
                applicationName: "OPCUASingleTestClient",
                clientName: `Test-${Date.now()}`,
                keepSessionAlive: false, 
            });

            await tempTestClient.connect(testedEndpointUrl);
            tempTestSession = await tempTestClient.createSession();

            let statusForTestedEndpoint: 'online' | 'offline' = 'online'; 
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
            
            // Return 200 with an error payload for the frontend to parse, as per original logic for this branch
            return NextResponse.json({
                connectionStatus: 'disconnected',
                message: errorMsg,
                testedEndpoint: testedEndpointUrl,
                errorDetail: error.message,
            }, { status: 200 }); 
        }

    } else {
        // --- Return status of the MAIN, persistent client ---
        try {
            if (mainCurrentConnectionStatus === 'disconnected' && !isMainClientConnecting) {
                console.log("Main client is disconnected and not currently connecting. Triggering a connection attempt for main client before returning status.");
                await connectMainOPCClient();
            }
            console.log(`API (main client status) returning: ${mainCurrentConnectionStatus}`);
            return NextResponse.json({ connectionStatus: mainCurrentConnectionStatus });
        } catch (error: any) {
            console.error("Critical error in GET /api/opcua/status (main client status branch):", error.message, error.stack);
            return NextResponse.json(
                { connectionStatus: 'disconnected', error: "Internal server error while checking main OPC UA client status.", details: error.message },
                { status: 500 }
            );
        }
    }
}