import { NextResponse } from 'next/server';
import { OPCUAClient, ClientSubscription } from 'node-opcua';

export const dynamic = "force-dynamic"; 

const endpointUrl = "opc.tcp://192.168.1.2:4840"; // OPC UA endpoint for the PLC
let client: OPCUAClient | null = null;
let subscription: ClientSubscription | null = null;
let retryCount = 0;

const MAX_RETRIES = 5;
const RETRY_BACKOFF = [1500, 3000, 6000, 12000, 15000];

// Function to connect to OPC UA server
const connectOPC = async (): Promise<boolean> => {
  if (client) {
    await client.disconnect();  // Disconnect existing client
  }

  client = OPCUAClient.create({ endpointMustExist: false });

  try {
    console.log(`Attempting to connect to OPC UA server: ${endpointUrl}`);
    await client.connect(endpointUrl); // Try to connect
    console.log("OPC UA client connected.");

    // Optionally create a session and subscription to monitor data
    const session = await client.createSession();
    subscription = await session.createSubscription2({
      requestedPublishingInterval: 1000, // 1 second
      requestedLifetimeCount: 600,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: 100,
      publishingEnabled: true,
      priority: 10
    });

    retryCount = 0; // Reset retry count on successful connection
    return true; // Return true when connected
  } catch (error) {
    console.error("OPC UA Connection Error:", error);
    if (retryCount < MAX_RETRIES) {
      const backoffTime = RETRY_BACKOFF[retryCount];
      console.log(`Retrying connection in ${backoffTime}ms`);
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, backoffTime)); // Wait before retrying
    } else {
      console.log("Max retries reached.");
      return false; // Return false if the connection fails after max retries
    }
  }
  return false; // Ensure a return value in case of unexpected behavior
};
// API route to check PLC connection status
export async function GET() {
  const isConnected = await connectOPC();
  
  if (isConnected) {
    return NextResponse.json({ connected: true });
  } else {
    return NextResponse.json({ connected: false });
  }
}