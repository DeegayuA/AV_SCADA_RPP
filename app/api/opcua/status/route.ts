// /api/opcua/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getOpcuaStatus, connectOPCUA } from '../route';
import { OPCUAClient, ClientSession, MessageSecurityMode, SecurityPolicy } from 'node-opcua';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const status = getOpcuaStatus();

    if (status === 'disconnected') {
        console.log("Status endpoint reports disconnected, triggering a connection attempt in the background.");
        connectOPCUA().catch(err => {
            console.error("Error initiating OPC UA connection from status endpoint:", err);
        });
    }

    // The original file had a special handler for testing endpoints.
    // That logic is separate from the main connection status and can be re-added if needed.
    // For now, focusing on the primary bug.
    const searchParams = request.nextUrl.searchParams;
    const testedEndpointUrl = searchParams.get('testedClientSideEndpoint');

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
            
            return NextResponse.json({
                connectionStatus: 'disconnected',
                message: errorMsg,
                testedEndpoint: testedEndpointUrl,
                errorDetail: error.message,
            }, { status: 200 }); 
        }
    }


    return NextResponse.json({ connectionStatus: status });
}