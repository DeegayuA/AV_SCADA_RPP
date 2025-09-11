import { OPCUAClient, ClientSession, ClientSubscription } from "node-opcua";
import { WebSocketServer, WebSocket } from "ws";

declare global {
  var wsServer: WebSocketServer | undefined;
  var opcuaClient: OPCUAClient | undefined;
  var opcuaSession: ClientSession | undefined;
  var opcuaSubscription: ClientSubscription | undefined;
  var isConnectingOpcua: boolean | undefined;
  var isDisconnectingOpcua: boolean | undefined;
  var connectionAttempts: number | undefined;
  var disconnectTimeout: NodeJS.Timeout | undefined;
  var pingIntervalId: NodeJS.Timeout | undefined;
  var connectionMonitorInterval: NodeJS.Timeout | undefined;
  var nodeDataCache: Record<string, any> | undefined;
  var connectedClients: Set<WebSocket> | undefined;
  var endpointUrl: string | undefined;
  var discoveryProgressCache: any | undefined;
  var _opcua_initialized: boolean | undefined;
}

// This empty export is necessary to make this file a module.
export {};
