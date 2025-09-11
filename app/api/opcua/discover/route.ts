// app/api/opcua/discover/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Import from the new singleton module
import {
    ensureServerInitialized,
    getOpcuaSession,
    discoverAndSaveDatapoints,
    getDiscoveryProgress, // The user might want to poll this, so let's handle GET
} from '@/lib/opcua-server';

export async function POST(req: NextRequest) {
    console.log("POST /api/opcua/discover endpoint hit.");
    ensureServerInitialized(); // Make sure the server instance is active

    try {
        const session = getOpcuaSession();

        if (!session) {
            console.error("Discovery failed: OPC UA session is not available.");
            return NextResponse.json({
                success: false,
                message: 'OPC UA is not connected. Please establish a connection before starting discovery.',
                error: 'OPC UA session is not available.'
            }, { status: 503 }); // 503 Service Unavailable is appropriate here
        }

        console.log("OPC UA session available. Proceeding with datapoint discovery...");
        // The discovery function is now async and runs in the background.
        // We can either await it here or just trigger it and let the client poll for progress.
        // Let's await it for now, as that matches the original behavior.
        const result = await discoverAndSaveDatapoints(session);

        if (result.success) {
            console.log("Datapoint discovery successful.");
            return NextResponse.json(result, { status: 200 });
        } else {
            console.error("Datapoint discovery failed.", result);
            // Let the result itself determine the status code if possible, otherwise default
            const statusCode = result.error?.includes('file') ? 500 : 400;
            return NextResponse.json(result, { status: statusCode });
        }
    } catch (error: any) {
        console.error("Unhandled error in POST /api/opcua/discover:", error);
        return NextResponse.json({
            success: false,
            message: 'An unexpected error occurred during datapoint discovery.',
            error: error.message
        }, { status: 500 });
    }
}

// It's useful to get the status of an ongoing discovery
export async function GET(req: NextRequest) {
    console.log("GET /api/opcua/discover hit. Returning discovery progress.");
    ensureServerInitialized();

    const progress = getDiscoveryProgress();

    return NextResponse.json({
        success: true,
        ...progress
    });
}
