import { ApiConfig, ApiInstanceStatus } from '@/types/apiMonitoring';

export interface TimeSeriesDataPoint {
  timestamp: string; // ISO Date string
  value: number | string | boolean | null;
  quality?: string; // Optional quality status from OPC UA
}

export interface TimeSeriesData {
  nodeId: string;
  displayName?: string;
  sourceTimestamp?: string; // Timestamp from the source system
  serverTimestamp?: string; // Timestamp when the server processed it
  values: TimeSeriesDataPoint[];
}

export interface KeyValuePair {
  [key: string]: {
    value: any;
    sourceTimestamp?: string;
    statusCode?: { name: string; value: number };
    dataType?: string;
    nodeId?: string; // Optional, if the API provides it per item
  };
}

export interface AllDataResponse {
  timestamp: string; // Overall timestamp for the snapshot
  data: KeyValuePair;
  serverProcessingTimeMs?: number;
}

export interface SingleDataResponse {
  nodeId: string;
  displayName?: string;
  value: any;
  sourceTimestamp?: string;
  serverTimestamp?: string;
  statusCode?: { name: string; value: number };
  dataType?: string;
  error?: string; // If fetching this specific node failed
}


const DEFAULT_TIMEOUT = 10000; // 10 seconds

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);
  return response;
}

// Helper to determine active URL (local first, then online)
// This simplified version assumes the status is already updated by useApiStatusMonitor
// A more robust version might re-check status here if needed, or take current statuses as args.
const getActiveUrl = (apiConfig: ApiConfig): { url: string; type: 'local' | 'online' } | null => {
  if (apiConfig.localApi.url && apiConfig.localApi.status === 'online') {
    return { url: apiConfig.localApi.url, type: 'local' };
  }
  if (apiConfig.onlineApi.url && apiConfig.onlineApi.status === 'online') {
    return { url: apiConfig.onlineApi.url, type: 'online' };
  }
  // Fallback if neither is 'online' but URLs exist (e.g. if called before status check or both are offline)
  if (apiConfig.localApi.url) {
      return { url: apiConfig.localApi.url, type: 'local' };
  }
  if (apiConfig.onlineApi.url) {
      return { url: apiConfig.onlineApi.url, type: 'online' };
  }
  return null;
};


export async function fetchReadRange(
  apiConfig: ApiConfig,
  nodeId: string,
  start: string, // ISO string
  end: string,   // ISO string
): Promise<TimeSeriesData[] | null> {
  const activeApi = getActiveUrl(apiConfig);
  if (!activeApi) {
    console.error(`No active URL for API: ${apiConfig.name}`);
    // throw new Error(`No active URL for API: ${apiConfig.name}`);
    return null;
  }

  const params = new URLSearchParams({
    nodeId: nodeId,
    start: start,
    end: end,
  });
  if (apiConfig.withFactor) {
    params.append('withFactor', 'true');
  }

  const url = `${activeApi.url}${activeApi.url.includes('?') ? '&' : '?'}${params.toString()}`;

  try {
    const response = await fetchWithTimeout(url, { method: 'GET' });
    if (!response.ok) {
      // throw new Error(`API request failed: ${response.status} ${response.statusText} from ${url}`);
      console.error(`API request failed: ${response.status} ${response.statusText} from ${url}`);
      return null;
    }
    const data = await response.json();
    // Assuming the API returns data directly in TimeSeriesData[] format or similar
    // Add validation or transformation if needed
    return data as TimeSeriesData[];
  } catch (error) {
    console.error(`Error fetching read-range data from ${url}:`, error);
    // throw error;
    return null;
  }
}

export async function fetchReadAll(
  apiConfig: ApiConfig,
): Promise<AllDataResponse | null> {
  const activeApi = getActiveUrl(apiConfig);
  if (!activeApi) {
    // throw new Error(`No active URL for API: ${apiConfig.name}`);
    console.error(`No active URL for API: ${apiConfig.name}`);
    return null;
  }

  const params = new URLSearchParams();
  if (apiConfig.withFactor) {
    params.append('withFactor', 'true');
  }
  const paramString = params.toString();
  const url = `${activeApi.url}${paramString ? (activeApi.url.includes('?') ? '&' : '?') + paramString : ''}`;


  try {
    const response = await fetchWithTimeout(url, { method: 'GET' });
    if (!response.ok) {
      // throw new Error(`API request failed: ${response.status} ${response.statusText} from ${url}`);
      console.error(`API request failed: ${response.status} ${response.statusText} from ${url}`);
      return null;
    }
    const data = await response.json();
    // Add validation or transformation if needed
    return data as AllDataResponse;
  } catch (error) {
    console.error(`Error fetching read-all data from ${url}:`, error);
    // throw error;
    return null;
  }
}

export async function fetchReadOne(
  apiConfig: ApiConfig,
  nodeId: string,
): Promise<SingleDataResponse | null> {
  const activeApi = getActiveUrl(apiConfig);
  if (!activeApi) {
    // throw new Error(`No active URL for API: ${apiConfig.name}`);
    console.error(`No active URL for API: ${apiConfig.name}`);
    return null;
  }

  // The example URL for read-one is like: http://192.168.1.9:8200/read-one/ns=4;i=187
  // So, the nodeId should be appended as a path segment.
  // Ensure the base URL in config does not end with a slash if nodeId is appended directly.
  // Or, ensure the base URL *does* end with a slash.
  // For this example, assuming base URL might be "http://host/path" or "http://host/path/"

  let baseUrl = activeApi.url;
  if (!baseUrl.endsWith('/')) {
    baseUrl += '/';
  }

  const fullUrlWithoutParams = `${baseUrl}${encodeURIComponent(nodeId)}`;

  const params = new URLSearchParams();
  if (apiConfig.withFactor) {
    params.append('withFactor', 'true');
  }
  const paramString = params.toString();
  const url = `${fullUrlWithoutParams}${paramString ? '?' + paramString : ''}`;

  try {
    const response = await fetchWithTimeout(url, { method: 'GET' });
    if (!response.ok) {
      // throw new Error(`API request failed: ${response.status} ${response.statusText} from ${url}`);
      console.error(`API request failed: ${response.status} ${response.statusText} from ${url}`);
      return null;
    }
    const data = await response.json();
    // Add validation or transformation if needed
    return data as SingleDataResponse;
  } catch (error) {
    console.error(`Error fetching read-one data from ${url}:`, error);
    // throw error;
    return null;
  }
}
