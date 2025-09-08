// types/node-snap7.d.ts
declare module 'node-snap7' {
  export interface S7Client {
    new(): S7Client;
    ConnectTo(ip: string, rack: number, slot: number, callback: (err?: Error) => void): void;
    Disconnect(callback?: (err?: Error) => void): void;
    DBRead(dbNumber: number, start: number, size: number, callback: (err?: Error, data?: Buffer) => void): void;
    DBWrite(dbNumber: number, start: number, size: number, data: Buffer, callback: (err?: Error) => void): void;
    GetCpuInfo(callback: (err?: Error, info?: CpuInfo) => void): void;
    GetPlcStatus(callback: (err?: Error, status?: number) => void): void;
    Connected(): boolean;
  }

  export interface CpuInfo {
    CpuType?: string;
    SerialNumber?: string;
    Version?: string;
    ModuleName?: string;
    ModuleTypeName?: string;
    AS?: string;
    Copyright?: string;
  }

  export const S7Client: {
    new(): S7Client;
  };

  // PLC Status Constants
  export const S7CpuStatusUnknown: number;
  export const S7CpuStatusRun: number;
  export const S7CpuStatusStop: number;

  // Connection Types
  export const CONNTYPE_PG: number;
  export const CONNTYPE_OP: number;
  export const CONNTYPE_BASIC: number;
}
