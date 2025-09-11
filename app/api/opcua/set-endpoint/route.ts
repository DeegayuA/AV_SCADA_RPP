// app/api/opcua/set-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { opcuaSession, connectOPCUA } from '../route';

let customEndpointUrl: string | null = null;

export function getCustomEndpointUrl(): string | null {
  return customEndpointUrl;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid URL provided.' }, { status: 400 });
    }

    console.log(`Setting custom OPC UA endpoint URL to: ${url}`);
    customEndpointUrl = url;

    // Trigger a reconnection of the main OPC UA client
    if (opcuaSession) {
      await opcuaSession.close();
    }
    await connectOPCUA();

    return NextResponse.json({ success: true, message: `OPC UA endpoint set to ${url}. Reconnecting...` });
  } catch (error: any) {
    console.error("Error setting OPC UA endpoint:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
