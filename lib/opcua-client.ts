import { EventEmitter } from 'events';

export class OPCUAClient extends EventEmitter {
  private connected: boolean = false;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly url: string;

  constructor() {
    super();
    this.url = typeof window !== 'undefined' 
      ? `ws://${window.location.hostname}:8081/api/ws` 
      : 'ws://localhost:8081/api/ws';
  }

  connect() {
    if (typeof window === 'undefined' || this.connected) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connection opened');
        this.connected = true;
        this.emit('connected');
        clearInterval(this.reconnectTimer!);
        this.reconnectTimer = null;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('data', data);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.error('WebSocket error occurred:', event);
        this.emit('error', event);
      };

      this.ws.onclose = (event) => {
        console.error('WebSocket closed:', event);
        this.connected = false;
        this.emit('disconnected');
        if (!this.reconnectTimer) {
          this.startReconnectTimer();
        }
      };
    } catch (error) {
      console.error('Connection error:', error);
      this.startReconnectTimer();
    }
  }

  private startReconnectTimer() {
    this.reconnectTimer = setInterval(() => {
      console.log('Reconnecting...');
      this.connect();
    }, 5000);
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    clearInterval(this.reconnectTimer!);
  }

  async writeValue(nodeId: string, value: any) {
    if (!this.connected) throw new Error('Not connected');

    const message = {
      type: 'write',
      nodeId,
      value,
    };
    this.ws?.send(JSON.stringify(message));
  }
}
