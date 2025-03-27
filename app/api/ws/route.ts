import { WebSocketServer } from 'ws';
import { OPCUAClient, AttributeIds } from 'node-opcua';
import { NextResponse } from 'next/server';

let wss: WebSocketServer;

if (!wss) {
  wss = new WebSocketServer({ port: 8080 });

  const opcuaClient = new OPCUAClient({
    endpoint: "opc.tcp://192.168.1.2:4840"
  });

  wss.on('connection', async (ws) => {
    try {
      await opcuaClient.connect();
      const session = await opcuaClient.createSession();

      // Handle incoming messages from the web client
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'write') {
            await session.write({
              nodeId: data.nodeId,
              attributeId: AttributeIds.Value,
              value: {
                value: data.value
              }
            });
          }
        } catch (err) {
          console.error('Error handling message:', err);
        }
      });

      // Start sending updates
      const interval = setInterval(async () => {
        try {
          const values = await session.read({
            nodeId: "ns=4;i=1",
            attributeId: AttributeIds.Value
          });
          
          ws.send(JSON.stringify(values));
        } catch (err) {
          console.error('Error reading values:', err);
        }
      }, 1000);

      ws.on('close', () => {
        clearInterval(interval);
        if (session) {
          session.close();
        }
      });
    } catch (err) {
      console.error('Connection failed:', err);
    }
  });
}

export async function GET() {
  return new NextResponse('WebSocket server is running', {
    status: 200,
  });
}