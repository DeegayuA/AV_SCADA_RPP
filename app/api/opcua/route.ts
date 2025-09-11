// app/api/opcua/route.ts
import { NextResponse } from 'next/server';
import { ensureServerInitialized } from '@/lib/opcua-server';
import { WS_PORT } from '@/config/constants';

// This initializes the server when the app starts up in dev mode,
// or on the first API hit in a serverless environment.
ensureServerInitialized();

export async function GET(req: Request) {
  // The main purpose of this GET endpoint is now just to inform the client
  // about the WebSocket URL, especially in dynamic environments.
  const host = req.headers.get('host') || 'localhost';
  const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
  const webSocketUrl = `${protocol}://${host.split(':')[0]}:${WS_PORT}`;

  return NextResponse.json({
    message: "OPC UA WebSocket service is managed by a persistent server process.",
    webSocketUrl: webSocketUrl,
  });
}
