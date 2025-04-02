import { Client } from "node-opcua";

// Create an OPC UA client
const opcClient = new Client({
  endpoint: "opc.tcp://192.168.1.2:4840", // OPC UA server URL
});

async function fetchData(nodeId) {
  try {
    await opcClient.connect();
    const session = await opcClient.createSession();
    const dataValue = await session.read({ nodeId, attributeId: 13 }); // 13 is for "Value" attribute
    await session.close();
    return dataValue.value;
  } catch (error) {
    console.error("Error fetching data from OPC UA server:", error);
    return { error: "Failed to fetch data" };
  } finally {
    await opcClient.disconnect();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const nodeId = url.searchParams.get("nodeId");
    
    if (!nodeId) {
      return new Response("NodeId is required", { status: 400 });
    }

    try {
      const data = await fetchData(nodeId);
      return new Response(JSON.stringify({ value: data }), { status: 200 });
    } catch (error) {
      return new Response("Error fetching OPC UA data", { status: 500 });
    }
  },

  // WebSocket Handler
  async websocketHandler(ws) {
    ws.accept();

    // Define WebSocket onmessage handler to fetch and send OPC UA data
    ws.addEventListener("message", async (event) => {
      const { nodeId } = JSON.parse(event.data);
      if (!nodeId) {
        ws.send(JSON.stringify({ error: "NodeId is required" }));
        return;
      }

      const data = await fetchData(nodeId);
      ws.send(JSON.stringify({ value: data }));
    });
  },

  // New getDataPoint function
  async getDataPoint(nodeId) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}/opcua/data`);

      ws.onopen = () => {
        ws.send(JSON.stringify({ nodeId }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error('WebSocket error:', data.error);
          reject({ value: 'Error Fetching Data' });
        } else {
          resolve(data);
        }
        ws.close();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject({ value: 'Error Fetching Data' });
        ws.close();
      };
    });
  },
};
