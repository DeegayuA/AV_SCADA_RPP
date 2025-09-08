import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { ApiConfig, ApiInstanceConfig, ApiInstanceStatus } from '@/types/apiMonitoring';

const CHECK_INTERVAL = 30000; // 30 seconds, make configurable later if needed

async function checkApiEndpoint(url: string): Promise<{ status: ApiInstanceStatus; error?: string }> {
  if (!url || !url.trim().startsWith('http')) {
    return { status: 'disabled', error: 'URL is invalid or not configured' };
  }
  try {
    // Using fetch with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    const response = await fetch(url, { signal: controller.signal, method: 'HEAD' })
        .catch(async (headError) => {
            // If HEAD request fails (e.g. not allowed), try a GET request as a fallback
            // console.warn(`HEAD request to ${url} failed: ${headError}. Trying GET.`);
            clearTimeout(timeoutId); // Clear previous timeout
            const getController = new AbortController();
            const getTimeoutId = setTimeout(() => getController.abort(), 7000); // 7-second timeout for GET
            const getResponse = await fetch(url, { signal: getController.signal, method: 'GET' });
            clearTimeout(getTimeoutId);
            return getResponse;
        });

    clearTimeout(timeoutId); // Clear timeout if fetch completed

    if (response.ok) {
      return { status: 'online' };
    } else {
      return { status: 'offline', error: `HTTP status ${response.status}` };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { status: 'offline', error: 'Request timed out' };
    }
    return { status: 'offline', error: error.message || 'Network error or CORS issue' };
  }
}

export function useApiStatusMonitor() {
  const apiConfigs = useAppStore((state) => state.apiConfigs);
  const {
    setApiInstanceStatus,
    recordApiDowntimeStart,
    resolveApiDowntimeEvent
    // updateApiConfig is no longer needed here as setApiInstanceStatus handles the parent lastError
  } = useAppStore((state) => ({
    setApiInstanceStatus: state.setApiInstanceStatus,
    recordApiDowntimeStart: state.recordApiDowntimeStart,
    resolveApiDowntimeEvent: state.resolveApiDowntimeEvent,
    // updateApiConfig: state.updateApiConfig, // No longer directly used here
  }));

  const activeTimers = useRef<NodeJS.Timeout[]>([]);

  const monitorApi = useCallback(async (config: ApiConfig) => {
    const now = new Date();
    if (!config.isEnabled) {
      // If monitoring is disabled for the whole config, set both instances to 'disabled'
      if (config.localApi.status !== 'disabled') {
        setApiInstanceStatus(config.id, 'local', 'disabled', now);
      }
      if (config.onlineApi.status !== 'disabled') {
        setApiInstanceStatus(config.id, 'online', 'disabled', now);
      }
      // Clear any existing downtimes if the API is disabled
      if (config.localApi.downtimeStart) resolveApiDowntimeEvent(config.id, 'local', now);
      if (config.onlineApi.downtimeStart) resolveApiDowntimeEvent(config.id, 'online', now);
      return;
    }

    // Check Local API
    const localResult = await checkApiEndpoint(config.localApi.url);
    const previousLocalStatus = config.localApi.status; // Get status from store before update

    setApiInstanceStatus(config.id, 'local', localResult.status, now, localResult.error);

    if (localResult.status === 'online') {
      if ((previousLocalStatus === 'offline' || previousLocalStatus === 'error') && config.localApi.downtimeStart) {
        resolveApiDowntimeEvent(config.id, 'local', now);
      }
    } else if (localResult.status === 'offline' || localResult.status === 'error') {
      if (previousLocalStatus === 'online' || previousLocalStatus === 'pending' || previousLocalStatus === 'disabled') {
        // Only start new downtime if not already in an error/offline state from previous check
        if (!config.localApi.downtimeStart) { // Check if downtime isn't already active from store's perspective
            recordApiDowntimeStart(config.id, 'local', config.localApi.url, now);
        }
      }
    }

    // Check Online API if Local failed or is effectively disabled (no URL)
    if (localResult.status !== 'online' || !config.localApi.url) {
      const onlineResult = await checkApiEndpoint(config.onlineApi.url);
      const previousOnlineStatus = config.onlineApi.status; // Get status from store before update

      setApiInstanceStatus(config.id, 'online', onlineResult.status, now, onlineResult.error);

      if (onlineResult.status === 'online') {
        if ((previousOnlineStatus === 'offline' || previousOnlineStatus === 'error') && config.onlineApi.downtimeStart) {
          resolveApiDowntimeEvent(config.id, 'online', now);
        }
      } else if (onlineResult.status === 'offline' || onlineResult.status === 'error') {
        if (previousOnlineStatus === 'online' || previousOnlineStatus === 'pending' || previousOnlineStatus === 'disabled') {
          if (!config.onlineApi.downtimeStart) { // Check if downtime isn't already active
            recordApiDowntimeStart(config.id, 'online', config.onlineApi.url, now);
          }
        }
      }
    } else {
      // If local is online, we might not check online. If online has an existing error/downtime, it remains.
      // If it was pending, it remains pending. If it was disabled, it remains disabled.
      // If onlineApi.url is empty, ensure its status is 'disabled'
      if (!config.onlineApi.url && config.onlineApi.status !== 'disabled') {
        setApiInstanceStatus(config.id, 'online', 'disabled', now, 'URL not configured');
      } else if (config.onlineApi.url && config.onlineApi.status === 'online' && localResult.status === 'online') {
        // If local came online, and online was also previously online (but not checked this round),
        // ensure its 'lastChecked' is updated to prevent it looking stale.
        // Or, set it to 'pending' to indicate it wasn't checked this round.
        // For simplicity, we'll let its state persist from the last actual check unless explicitly disabled or no URL.
      }
    }
    // The parent ApiConfig.lastError is now managed by setApiInstanceStatus in the store.
    // No need to call updateApiConfig for lastError here.

  }, [setApiInstanceStatus, recordApiDowntimeStart, resolveApiDowntimeEvent]);

  useEffect(() => {
    // Clear previous timers
    activeTimers.current.forEach(clearTimeout);
    activeTimers.current = [];

    const configsToMonitor = Object.values(apiConfigs);

    configsToMonitor.forEach(config => {
      // Initial check
      monitorApi(config);

      // Set up interval if the config is enabled
      if (config.isEnabled) {
        const timerId = setInterval(() => monitorApi(config), CHECK_INTERVAL);
        activeTimers.current.push(timerId);
      }
    });

    return () => {
      activeTimers.current.forEach(clearTimeout);
    };
  }, [apiConfigs, monitorApi]); // Rerun when configs change
}
