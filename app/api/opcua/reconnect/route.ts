// app/api/opcua/reconnect/route.ts
import { NextResponse } from 'next/server';
import { connectOPCUA } from '../route'; // Import the connect function

export async function POST() {
  console.log("API: Received request to reconnect OPC-UA.");
  try {
    // We don't need to wait for the full connection, just trigger it.
    // The connection process runs in the background.
    connectOPCUA();
    return NextResponse.json({ message: 'OPC-UA reconnection process initiated.' });
  } catch (error) {
    console.error("API: Error initiating OPC-UA reconnection:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to initiate OPC-UA reconnection.', error: errorMessage }, { status: 500 });
  }
}
