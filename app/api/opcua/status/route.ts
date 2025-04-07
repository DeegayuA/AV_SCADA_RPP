import { OPCUAClient, ClientSubscription, MessageSecurityMode, SecurityPolicy } from 'node-opcua';
import { OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE } from '@/config/constants'; 
import { NextResponse } from 'next/server';

let client: OPCUAClient | null = null;
let subscription: ClientSubscription | null = null;
let retryCount = 0;

const MAX_RETRIES = 5;
const RETRY_BACKOFF = [1500, 3000, 6000, 12000, 15000];

const connectToEndpoint = async (endpoint: string): Promise<void> => {
  if (client) {
    await client.connect(endpoint);
  } else {
    throw new Error("Client is null. Cannot connect to endpoint.");
  }
  console.log(`Connected to ${endpoint}`);
};

const connectOPC = async (): Promise<boolean> => {
  if (client && client.isReconnecting === false) {
    // console.log("Client is already connected, no need to reconnect.");
    return true;
  }

  if (!client) {
    client = OPCUAClient.create({
      keepSessionAlive: true,
      securityMode: MessageSecurityMode.None,
      securityPolicy: SecurityPolicy.None,
    });
  }

  let currentEndpoint = OPC_UA_ENDPOINT_OFFLINE;
  try {
    console.log(`Attempting to connect to OPC UA server: ${currentEndpoint}`);
    await connectToEndpoint(currentEndpoint);
    
    const session = await client.createSession();
    subscription = await session.createSubscription2({
      requestedPublishingInterval: 1000,
      requestedLifetimeCount: 600,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: 100,
      publishingEnabled: true,
      priority: 10,
    });

    retryCount = 0;
    return true;
  } catch (error) {
    console.error("OPC UA Connection Error:", error);
    if (retryCount < MAX_RETRIES) {
      const backoffTime = RETRY_BACKOFF[retryCount];
      console.log(`Retrying connection in ${backoffTime}ms`);
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    } else {
      console.log("Max retries reached.");
      currentEndpoint = OPC_UA_ENDPOINT_ONLINE;
      try {
        console.log(`Attempting to connect to OPC UA server: ${currentEndpoint}`);
        await connectToEndpoint(currentEndpoint);
        
        const session = await client.createSession();
        subscription = await session.createSubscription2({
          requestedPublishingInterval: 1000,
          requestedLifetimeCount: 600,
          requestedMaxKeepAliveCount: 10,
          maxNotificationsPerPublish: 100,
          publishingEnabled: true,
          priority: 10,
        });

        retryCount = 0;
        return true;
      } catch (error) {
        console.error("OPC UA Connection Error:", error);
        return false;
      }
    }
  }
  return false;
};

export async function GET() {
  const isConnected = await connectOPC();
  
  if (isConnected) {
    const connectionStatus = client ? (client.isReconnecting ? "Offline" : "Online") : "Offline";
    console.log(`Connection status: ${connectionStatus}`);
    return NextResponse.json({ connected: connectionStatus === "Online" });
  } else {
    console.log("Connection status: Offline");
    return NextResponse.json({ connected: false });
  }
}