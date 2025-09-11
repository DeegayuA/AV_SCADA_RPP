// /api/opcua/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
// Import from the new singleton module
import { getServerStatus, attemptReconnect, ensureServerInitialized } from '@/lib/opcua-server';
// Keep these imports for the temporary test client logic
import { OPCUAClient, ClientSession, MessageSecurityMode, SecurityPolicy } from 'node-opcua';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // This is good practice to ensure the server is running, especially in serverless.
    ensureServerInitialized();

    const searchParams = request.nextUrl.searchParams;
    const testedEndpointUrl = searchParams.get('testedClientSideEndpoint');

    // The specific endpoint testing logic can remain, as it uses a temporary client.
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

            // This classification logic seems arbitrary but we'll keep it.
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
                connectionStatus: statusForTestedEndpoint, // Keep this key for frontend compatibility
                message: successMsg,
                testedEndpoint: testedEndpointUrl,
            });

        } catch (error: any) {
            const errorMsg = `Failed to connect to specific test endpoint ${testedEndpointUrl}: ${error.message}`;
            console.error(errorMsg);
            if (tempTestSession) await tempTestSession.close().catch(e => console.warn("Error closing temp test session (on error):", e.message));
            if (tempTestClient) await tempTestClient.disconnect().catch(e => console.warn("Error disconnecting temp test client (on error):", e.message));

            return NextResponse.json({
                connectionStatus: 'disconnected', // Keep this key for frontend compatibility
                message: errorMsg,
                testedEndpoint: testedEndpointUrl,
                errorDetail: error.message,
            }, { status: 200 }); // Return 200 so the client can process the error message in the body
        }
    }

    // This is the main logic that is now updated.
    const status = getServerStatus();

    // The old logic triggered a connection attempt. The new `attemptReconnect` does this more safely.
    if (status.opc === 'disconnected') {
        console.log("Status endpoint reports disconnected, triggering a reconnection attempt in the background.");
        // Use the new centralized reconnect function
        attemptReconnect("status_endpoint_check");
    }

    // Return the detailed status from the singleton.
    // The frontend probably uses `connectionStatus`, so we map our detailed status to that key.
    return NextResponse.json({
        connectionStatus: status.opc, // 'connected', 'disconnected', 'connecting'
        details: status // Also provide the full new status object for richer clients
    });
}