// app/api/opcua/discover/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
    opcuaSession,
    connectOPCUA,
    discoverAndSaveDatapoints,
    DiscoveredDataPoint // Optional: for type safety if dealing with result.data directly
} from '../route'; // Adjust path if Next.js resolves module paths differently, e.g. '../route.js' or specific alias
import { ClientSession } from 'node-opcua'; // For type checking opcuaSession.isOpen if needed

export async function POST(req: NextRequest) {
    console.log("POST /api/opcua/discover endpoint hit.");

    try {
        // Check if opcuaSession is active and open
        // Note: opcuaSession might be null or its internal state might indicate it's not truly "open"
        // The ClientSession type itself doesn't have an `isOpen()` method.
        // We rely on opcuaSession being non-null as an indicator of an active session.
        // connectOPCUA should ensure the session is truly usable.
        if (!opcuaSession) {
            console.log("No active OPC UA session. Attempting to connect...");
            await connectOPCUA(); // connectOPCUA handles its own logging and errors internally
                                 // and sets up the shared opcuaSession
        }

        // After attempting connection, check session status again
        if (!opcuaSession) {
            console.error("Failed to establish OPC UA session after connection attempt.");
            return NextResponse.json({
                success: false,
                message: 'Failed to establish OPC UA session.',
                error: 'OPC UA session is not available after connection attempt.'
            }, { status: 500 });
        }

        console.log("OPC UA session available. Proceeding with datapoint discovery...");
        const result = await discoverAndSaveDatapoints(opcuaSession);

        if (result.success) {
            console.log("Datapoint discovery successful.");
            return NextResponse.json(result, { status: 200 });
        } else {
            console.error("Datapoint discovery failed.", result);
            // Determine appropriate status code based on error
            let statusCode = 400; // Default for general client-side correctable errors
            if (result.message?.includes('Failed to save discovered datapoints to file')) {
                statusCode = 500; // Server-side issue (file system)
            } else if (result.message?.includes('Error during datapoint discovery')) {
                statusCode = 500; // Could be server or OPC UA server issue
            }
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

export async function GET(req: NextRequest) {
    console.log("GET /api/opcua/discover endpoint hit. Method not allowed.");
    return NextResponse.json({
        message: 'Method Not Allowed. Use POST to discover OPC UA datapoints.'
    }, {
        status: 405,
        headers: { 'Allow': 'POST' }
    });
}
