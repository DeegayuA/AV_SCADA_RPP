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



export async function fetchReadRange(
  baseUrl: string,
  nodeId: string,
  start: string, // ISO string
  end: string,   // ISO string
): Promise<TimeSeriesData[] | null> {
  if (!baseUrl) {
    console.error("API base URL is not configured.");
    return null;
  }

  const params = new URLSearchParams({
    start: start,
    end: end,
  });

  const url = `${baseUrl}${encodeURIComponent(nodeId)}?${params.toString()}`;

  try {
    const response = await fetchWithTimeout(url, { method: 'GET' });
    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText} from ${url}`);
      return null;
    }
    const data = await response.json();
    return data as TimeSeriesData[];
  } catch (error) {
    console.error(`Error fetching read-range data from ${url}:`, error);
    return null;
  }
}

export async function fetchReadAll(
  apiConfig: ApiConfig,
): Promise<AllDataResponse | null> {
  const baseUrl = apiConfig.localApi.status === 'online' ? apiConfig.localApi.url : apiConfig.onlineApi.url;
  if (!baseUrl) {
    console.error(`No active URL for API: ${apiConfig.name}`);
    return null;
  }

  const params = new URLSearchParams();
  if (apiConfig.withFactor) {
    params.append('withFactor', 'true');
  }
  const paramString = params.toString();
  const url = `${baseUrl}${paramString ? (baseUrl.includes('?') ? '&' : '?') + paramString : ''}`;


  try {
    const response = await fetchWithTimeout(url, { method: 'GET' });
    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText} from ${url}`);
      return null;
    }
    const data = await response.json();
    return data as AllDataResponse;
  } catch (error) {
    console.error(`Error fetching read-all data from ${url}:`, error);
    return null;
  }
}

export async function fetchReadOne(
  apiConfig: ApiConfig,
  nodeId: string,
): Promise<SingleDataResponse | null> {
  const baseUrl = apiConfig.localApi.status === 'online' ? apiConfig.localApi.url : apiConfig.onlineApi.url;
  if (!baseUrl) {
    console.error(`No active URL for API: ${apiConfig.name}`);
    return null;
  }

  let url = baseUrl;
  if (!url.endsWith('/')) {
    url += '/';
  }

  const fullUrlWithoutParams = `${url}${encodeURIComponent(nodeId)}`;

  const params = new URLSearchParams();
  if (apiConfig.withFactor) {
    params.append('withFactor', 'true');
  }
  const paramString = params.toString();
  const finalUrl = `${fullUrlWithoutParams}${paramString ? '?' + paramString : ''}`;

  try {
    const response = await fetchWithTimeout(finalUrl, { method: 'GET' });
    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText} from ${finalUrl}`);
      return null;
    }
    const data = await response.json();
    return data as SingleDataResponse;
  } catch (error) {
    console.error(`Error fetching read-one data from ${finalUrl}:`, error);
    return null;
  }
}
