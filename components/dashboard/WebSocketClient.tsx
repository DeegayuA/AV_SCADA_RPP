import { useEffect, useState } from 'react';

const WebSocketClient = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Create WebSocket connection to the backend server
    const ws = new WebSocket('ws://localhost:8081/api/ws');

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);
        console.log('Received data:', receivedData);
        setData(receivedData); // Update the state with received data
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Cleanup WebSocket connection when the component unmounts
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div>
      <h1>Real-time Data from OPC UA Server</h1>
      <div>
        <h2>Latest Data:</h2>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
};

export default WebSocketClient;
