import { EventEmitter } from 'events';

export class OPCUAClient extends EventEmitter {
  private connected: boolean = false;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly url: string;

  constructor() {
    super();
    // Check if we're in the browser environment
    this.url = typeof window !== 'undefined' 
      ? `ws://${window.location.host}/api/ws`
      : 'ws://localhost:8080/api/ws';
  }

  connect() {
    // Only attempt connection in browser environment
    if (typeof window === 'undefined') return;
    if (this.connected) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.connected = true;
        this.emit('connected');
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.emit('disconnected');
        this.startReconnectTimer();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('data', data);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Connection error:', error);
      this.startReconnectTimer();
    }
  }

  private startReconnectTimer() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setInterval(() => {
        this.connect();
      }, 5000);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  async writeValue(nodeId: string, value: any) {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected');
    }

    const message = {
      type: 'write',
      nodeId,
      value,
    };

    this.ws.send(JSON.stringify(message));
  }

  isConnected() {
    return this.connected;
  }
}