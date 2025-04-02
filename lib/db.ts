import { openDB, DBSchema } from 'idb';
import { DataPoint } from '@/config/dataPoints';

interface SolarDB extends DBSchema {
  dataPoints: {
    key: string;
    value: {
      timestamp: number;
      value: number | boolean;
    };
  };
  controlQueue: {
    key: string;
    value: {
      nodeId: string;
      value: number | boolean;
      timestamp: number;
    };
  };
}

const DB_NAME = 'solar-minigrid';
const DB_VERSION = 1;

export async function initDB() {
  if (typeof window === 'undefined') {
    // This code runs on the server side, where IndexedDB is not available.
    console.error("IndexedDB is not available on the server.");
    return null; // Or handle server-side case differently
  }

  try {
    console.log("Initializing database...");
    const db = await openDB<SolarDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        console.log("Upgrading database schema...");
        db.createObjectStore('dataPoints');
        db.createObjectStore('controlQueue');
      },
    });
    console.log("Database initialized successfully");
    return db;
  } catch (error) {
    console.error("Error initializing the database:", error);
    throw error; // Rethrow the error to handle it in the calling code
  }
}
export async function updateDataPoint(nodeId: string, value: number | boolean) {
  const db = await initDB();
  await db.put('dataPoints', {
    timestamp: Date.now(),
    value,
  }, nodeId);
}

// Update getDataPoint in /lib/db.ts
export const getDataPoint = async (nodeId: string) => {
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
};

export async function queueControlAction(nodeId: string, value: number | boolean) {
  const db = await initDB();
  await db.put('controlQueue', {
    nodeId,
    value,
    timestamp: Date.now(),
  }, `${nodeId}-${Date.now()}`);
}

export async function getControlQueue() {
  const db = await initDB();
  return db.getAll('controlQueue');
}

export async function clearControlQueue() {
  const db = await initDB();
  await db.clear('controlQueue');
}
