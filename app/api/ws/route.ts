import { WebSocketServer, WebSocket } from 'ws';
import { OPCUAClient, AttributeIds, MessageSecurityMode } from 'node-opcua';
import { NextResponse } from 'next/server';

let wss: WebSocketServer | null = null;

function initializeWebSocketServer() {
  if (wss) return; // Prevent duplicate initialization

  wss = new WebSocketServer({
    port: 8081,
    path: '/api/ws',
  });

  console.log("WebSocket server initialized on ws://localhost:8081");

  const opcuaClient = OPCUAClient.create({
    endpointMustExist: false,
    connectionStrategy: {
      maxRetry: 3,
      initialDelay: 1000, 
    },
    keepSessionAlive: true,
    securityMode: MessageSecurityMode.None,  // Try disabling security mode to lessen time sync dependency - client : server token creation date exposes a time discrepancy late by 30.979 seconds
  });
  
  // Define the node IDs you want to retrieve data from
  const nodeIds = [
    "ns=4;i=127",  // Example node ID
    "ns=4;i=156",  // Add more node IDs here
    "ns=4;i=142",  // Out of grid total power
    // You can add as many node IDs as needed
  ];

  // To keep track of the latest data from each node
  const nodeData: Record<string, any> = {};

  wss.on('connection', async (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    try {
      await opcuaClient.connect('opc.tcp://192.168.1.2:4840');
      const session = await opcuaClient.createSession();
      console.log("Connected to OPC UA server");

      ws.on('message', async (message: string) => {
        console.log('Received message:', message);
        try {
          const data = JSON.parse(message);
          if (data.type === 'write') {
            await session.write({
              nodeId: data.nodeId,
              attributeId: AttributeIds.Value,
              value: { value: data.value }
            });
          }
        } catch (err) {
          console.error('Error handling message:', err);
        }
      });

      const interval = setInterval(async () => {
        try {
          // Fetch data from all defined nodes
          const values = await Promise.all(
            nodeIds.map(async (nodeId) => {
              const value = await session.read({
                nodeId: nodeId,
                attributeId: AttributeIds.Value,
              });
              nodeData[nodeId] = value.value.value; // Store the latest value of the node
              return { nodeId, value: value.value.value }; // Send back the nodeId and the corresponding value
            })
          );

          // Send all data only if there is any data received from a node
          if (Object.keys(nodeData).length > 0) {
            console.log('Sending values:', values);
            ws.send(JSON.stringify(values));  // Send the values of all nodes
          }

        } catch (err) {
          console.error('Error reading values:', err);
        }
      }, 1000);  // Adjust the interval as needed

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        clearInterval(interval);
        session.close();
      });

    } catch (err) {
      console.error('Error establishing OPC UA session:', err);
    }
  });
}

// Ensure server initializes automatically
initializeWebSocketServer();

export async function GET() {
  return new NextResponse('WebSocket server is running', {
    status: 200,
  });
}
