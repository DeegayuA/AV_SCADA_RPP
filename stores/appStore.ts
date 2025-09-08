// stores/appStore.ts
import { create, StoreApi } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import React, { useCallback } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import {
    DataPoint,
    CustomNodeType,
    CustomFlowEdge,
    SLDLayout,
} from '@/types/sld';
import { ActiveAlarm } from '@/types';
import { User, UserRole } from '@/types/auth';
import { exportIdbData } from '@/lib/idb-store';
import { sldLayouts as constantSldLayouts } from '@/config/sldLayouts';
import * as appConstants from '@/config/constants';
import { BackupFileContent } from '@/lib/restore';
import { getFormattedTimestamp } from '@/lib/timeUtils';
import { logActivity } from '@/lib/activityLog';
import {
    ApiConfig,
    ApiDowntimeEvent,
    ApiInstanceConfig,
} from '@/types/apiMonitoring';
import { WebSocketMessageToServer } from '@/hooks/useWebSocketListener';
import { dataPoints as rawDataPoints } from '@/config/dataPoints';

const dataPointsWithIcons = rawDataPoints.map((dp) => ({
  ...dp,
  icon: typeof dp.icon === 'string' ? undefined : dp.icon
}));

const defaultUser: User = {
  email: 'guest@example.com',
  name: 'Guest Viewer',
  role: UserRole.VIEWER,
  redirectPath: '/dashboard',
  avatar: `https://avatar.vercel.sh/guest.png`,
};

// All state that is reactive and/or persisted
interface AppState {
  opcUaNodeValues: Record<string, string | number | boolean>;
  dataPoints: Record<string, DataPoint>;
  isEditMode: boolean;
  currentUser: User | null;
  selectedElementForDetails: CustomNodeType | CustomFlowEdge | null;
  soundEnabled: boolean;
  activeAlarms: ActiveAlarm[];
  apiConfigs: Record<string, ApiConfig>;
  apiDowntimes: ApiDowntimeEvent[];
  isWebSocketConnected: boolean;
  activeWebSocketUrl: string;
}

// All functions (actions) for the store
interface AppActions {
  updateOpcUaNodeValues: (updates: Record<string, string | number | boolean>) => void;
  setDataPoints: (dataPoints: Record<string, DataPoint>) => void;
  toggleEditMode: () => void;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  setSelectedElementForDetails: (element: CustomNodeType | CustomFlowEdge | null) => void;
  updateNodeConfig: (nodeId: string, config: any, data?: any) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setActiveAlarms: (alarms: ActiveAlarm[]) => void;
  setWebSocketStatus: (isConnected: boolean, url: string) => void;
  addApiConfig: (config: Omit<ApiConfig, 'id' | 'localApi' | 'onlineApi'> & { localUrl: string, onlineUrl: string }) => void;
  updateApiConfig: (configId: string, updates: Partial<ApiConfig>) => void;
  removeApiConfig: (configId: string) => void;
  setApiInstanceStatus: (configId: string, urlType: 'local' | 'online', status: ApiInstanceConfig['status'], timestamp?: Date, error?: string) => void;
  recordApiDowntimeStart: (apiConfigId: string, urlType: 'local' | 'online', urlChecked: string, startTime: Date) => void;
  resolveApiDowntimeEvent: (apiConfigId: string, urlType: 'local' | 'online', endTime: Date) => void;
  loadApiConfigs: (configs: Record<string, ApiConfig>) => void;
  loadApiDowntimes: (downtimes: ApiDowntimeEvent[]) => void;
  clearApiMonitoringData: () => void;
  handleAutoBackup: () => Promise<void>;
}

// Non-reactive ("transient") state and actions. These should NOT be persisted.
interface TransientState {
  sendJsonMessage: (message: WebSocketMessageToServer) => void;
  setSendJsonMessage: (fn: (message: WebSocketMessageToServer) => void) => void;
  requestWithResponse: <T>(message: WebSocketMessageToServer, timeout?: number) => Promise<T>;
  setRequestWithResponse: (fn: <T>(message: WebSocketMessageToServer, timeout?: number) => Promise<T>) => void;
}

// The complete type for our store
type FullStoreState = AppState & AppActions & TransientState;

const initialState: AppState = {
  opcUaNodeValues: {},
  dataPoints: dataPointsWithIcons.reduce<Record<string, DataPoint>>((acc, dp) => { acc[dp.id] = dp; return acc; }, {}),
  isEditMode: false,
  currentUser: defaultUser,
  selectedElementForDetails: null,
  soundEnabled: typeof window !== 'undefined' ? localStorage.getItem('dashboardSoundEnabled') === 'true' : true,
  activeAlarms: [],
  apiConfigs: {},
  apiDowntimes: [],
  isWebSocketConnected: false,
  activeWebSocketUrl: '',
};

const safeLocalStorage: StateStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const useAppStore = create<FullStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      sendJsonMessage: (message: WebSocketMessageToServer) => {
        console.warn("WebSocket send function not yet initialized. Message ignored:", message);
      },

      setSendJsonMessage: (fn) => {
        set({ sendJsonMessage: fn });
      },

      requestWithResponse: async (message, timeout) => {
        console.warn("WebSocket requestWithResponse not yet initialized.");
        return Promise.reject(new Error("WebSocket not initialized."));
      },

      setRequestWithResponse: (fn) => {
        set({ requestWithResponse: fn });
      },

      updateOpcUaNodeValues: (updates) =>
        set((state) => {
          if (typeof updates !== 'object' || updates === null) {
            console.warn("Zustand (appStore): updateOpcUaNodeValues received non-object data. Ignoring update.", updates);
            return state;
          }
          return { opcUaNodeValues: { ...state.opcUaNodeValues, ...updates }};
        }),

      setDataPoints: (newDataPoints) =>
        set({ dataPoints: newDataPoints }),

      toggleEditMode: () => {
        const currentUser = get().currentUser;
        if (currentUser?.role === UserRole.ADMIN) {
          set((state) => ({ isEditMode: !state.isEditMode }));
          toast.info(`Edit Mode ${get().isEditMode ? "Enabled" : "Disabled"}`);
        } else {
          console.warn('Attempt to toggle edit mode by non-admin user:', currentUser?.email);
          toast.error("Access Denied", { description: "You do not have permission to change edit mode." });
        }
      },

      setCurrentUser: (user) => {
        const previousUser = get().currentUser;
        const currentEditMode = get().isEditMode;
        set({
            currentUser: user,
            isEditMode: user?.role === UserRole.ADMIN ? currentEditMode : false
        });
        if (previousUser && user === null) {
          logActivity('LOGOUT', { email: previousUser.email, role: previousUser.role }, typeof window !== 'undefined' ? window.location.pathname : undefined);
        }
      },

      logout: () => {
        const previousUser = get().currentUser;
        if (previousUser && previousUser.email !== defaultUser.email) {
          logActivity('LOGOUT', { email: previousUser.email, role: previousUser.role }, typeof window !== 'undefined' ? window.location.pathname : undefined);
        }
        set({ currentUser: defaultUser, isEditMode: false, selectedElementForDetails: null });
        toast.success("Logged Out", { description: "You have been successfully signed out." });
      },

      setSelectedElementForDetails: (element) =>
        set({ selectedElementForDetails: element }),

      updateNodeConfig: (nodeId, config, data) => {
        console.log('Updating node config for', nodeId, config, data);
        set((state) => state);
      },

      setSoundEnabled: (enabled) => {
        set({ soundEnabled: enabled });
        if (typeof window !== 'undefined') {
          localStorage.setItem('dashboardSoundEnabled', String(enabled));
        }
      },
      setActiveAlarms: (alarms) => set({ activeAlarms: alarms }),

      setWebSocketStatus: (isConnected, url) => set({
        isWebSocketConnected: isConnected,
        activeWebSocketUrl: url
      }),

      addApiConfig: (newConfigPartial) => set((state) => {
        const newId = uuidv4();
        const fullConfig: ApiConfig = { id: newId, name: newConfigPartial.name, type: newConfigPartial.type, localApi: { url: newConfigPartial.localUrl, status: 'pending' }, onlineApi: { url: newConfigPartial.onlineUrl, status: 'pending' }, nodeId: newConfigPartial.nodeId, withFactor: newConfigPartial.withFactor, isEnabled: newConfigPartial.isEnabled !== undefined ? newConfigPartial.isEnabled : true, category: newConfigPartial.category, };
        return { apiConfigs: { ...state.apiConfigs, [newId]: fullConfig } };
      }),

      updateApiConfig: (configId, updates) => set((state) => {
        const existingConfig = state.apiConfigs[configId]; if (!existingConfig) return state;
        let updatedLocalApi = existingConfig.localApi; if (updates.localApi) { updatedLocalApi = { ...existingConfig.localApi, ...updates.localApi }; }
        let updatedOnlineApi = existingConfig.onlineApi; if (updates.onlineApi) { updatedOnlineApi = { ...existingConfig.onlineApi, ...updates.onlineApi }; }
        const updatedConfig = { ...existingConfig, ...updates, localApi: updatedLocalApi, onlineApi: updatedOnlineApi, };
        return { apiConfigs: { ...state.apiConfigs, [configId]: updatedConfig } };
      }),

      removeApiConfig: (configId) => set((state) => {
        const { [configId]: _, ...remainingConfigs } = state.apiConfigs;
        const remainingDowntimes = state.apiDowntimes.filter(dt => dt.apiConfigId !== configId);
        return { apiConfigs: remainingConfigs, apiDowntimes: remainingDowntimes };
      }),

      setApiInstanceStatus: (configId, urlType, status, timestamp, errorMsg) => set(state => {
        const config = state.apiConfigs[configId]; if (!config) return state;
        const nowISO = (timestamp || new Date()).toISOString();
        const updatedInstanceConf: ApiInstanceConfig = { ...(urlType === 'local' ? config.localApi : config.onlineApi), status, lastChecked: nowISO, error: errorMsg || undefined, };
        if (status === 'online' || status === 'disabled') { delete updatedInstanceConf.error; }
        const updatedConfig = { ...config };
        if (urlType === 'local') { updatedConfig.localApi = updatedInstanceConf; } else { updatedConfig.onlineApi = updatedInstanceConf; }
        if (updatedInstanceConf.error) { updatedConfig.lastError = `${urlType === 'local' ? 'Local' : 'Online'} Error: ${updatedInstanceConf.error}`; }
        else { const otherInstance = urlType === 'local' ? updatedConfig.onlineApi : updatedConfig.localApi; if (!otherInstance.error) { delete updatedConfig.lastError; } else { updatedConfig.lastError = `${urlType === 'local' ? 'Online' : 'Local'} Error: ${otherInstance.error}`; } }
        if (status === 'offline' || status === 'error') { if (!updatedInstanceConf.downtimeStart) { updatedInstanceConf.downtimeStart = nowISO; } }
        else if (status === 'online') { if (updatedInstanceConf.downtimeStart) { delete updatedInstanceConf.downtimeStart; delete updatedInstanceConf.currentDowntimeDuration; } }
        return { apiConfigs: { ...state.apiConfigs, [configId]: updatedConfig } };
      }),

      recordApiDowntimeStart: (apiConfigId, urlType, urlChecked, startTime) => set(state => {
        const newDowntime: ApiDowntimeEvent = { id: uuidv4(), apiConfigId, urlType, urlChecked, startTime: startTime.toISOString(), endTime: null, acknowledged: false, };
        const config = state.apiConfigs[apiConfigId];
        if (config) {
            const instanceToUpdate = urlType === 'local' ? config.localApi : config.onlineApi;
            const updatedInstanceConf: ApiInstanceConfig = { ...instanceToUpdate, downtimeStart: startTime.toISOString(), };
            const updatedConfig = { ...config };
            if (urlType === 'local') updatedConfig.localApi = updatedInstanceConf; else updatedConfig.onlineApi = updatedInstanceConf;
            return { apiDowntimes: [...state.apiDowntimes.filter(d => !(d.apiConfigId === apiConfigId && d.urlType === urlType && d.endTime === null)), newDowntime], apiConfigs: { ...state.apiConfigs, [apiConfigId]: updatedConfig } };
        }
        return { apiDowntimes: [...state.apiDowntimes.filter(d => !(d.apiConfigId === apiConfigId && d.urlType === urlType && d.endTime === null)), newDowntime] };
      }),

      resolveApiDowntimeEvent: (apiConfigId, urlType, endTimeDate) => set(state => {
        const endTimeISO = endTimeDate.toISOString(); let downtimeResolved = false;
        const updatedDowntimes = state.apiDowntimes.map(dt => { if (dt.apiConfigId === apiConfigId && dt.urlType === urlType && dt.endTime === null) { const durationMs = endTimeDate.getTime() - new Date(dt.startTime).getTime(); downtimeResolved = true; return { ...dt, endTime: endTimeISO, durationMinutes: Math.round(durationMs / 60000) }; } return dt; });
        if (!downtimeResolved) return state;
        const config = state.apiConfigs[apiConfigId];
        if (config) {
            const instanceConf = urlType === 'local' ? config.localApi : config.onlineApi;
            if (instanceConf.downtimeStart) {
                const updatedInstanceConf = {...instanceConf}; delete updatedInstanceConf.downtimeStart; delete updatedInstanceConf.currentDowntimeDuration;
                const updatedConfig = { ...config };
                if (urlType === 'local') updatedConfig.localApi = updatedInstanceConf; else updatedConfig.onlineApi = updatedInstanceConf;
                return { apiDowntimes: updatedDowntimes, apiConfigs: { ...state.apiConfigs, [apiConfigId]: updatedConfig } };
            }
        }
        return { apiDowntimes: updatedDowntimes };
      }),

      loadApiConfigs: (configs) => set({ apiConfigs: configs }),
      loadApiDowntimes: (downtimes) => set({ apiDowntimes: downtimes }),
      clearApiMonitoringData: () => set ({ apiConfigs: {}, apiDowntimes: [] }),

      handleAutoBackup: async () => {
        console.log("Performing automated hourly backup...");
        const currentUser = get().currentUser;

        try {
          const now = new Date();
          const localTime = getFormattedTimestamp();
          const sldStoragePrefix = 'sldLayout_';
          const allLayouts: Record<string, SLDLayout> = JSON.parse(JSON.stringify(constantSldLayouts));
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(sldStoragePrefix)) {
              try {
                const rawLayout = localStorage.getItem(key);
                if (rawLayout) {
                  const parsedLayout = JSON.parse(rawLayout) as SLDLayout;
                  if (parsedLayout?.layoutId) {
                    allLayouts[parsedLayout.layoutId] = parsedLayout;
                  }
                }
              } catch (error) {
                console.warn(`AutoBackup: Could not parse SLD layout from localStorage for key: ${key}`, error);
              }
            }
          }

          const idbData = await exportIdbData();
          const localStorageData: Record<string, any> = {};
          const appLocalStorageKeys = [
            `userDashboardLayout_${appConstants.PLANT_NAME.replace(/\s+/g, '_')}_v2`,
            'user-preferences',
            'last-session',
            'theme',
            `weatherCardConfig_v3.5_compact_${appConstants.PLANT_NAME || 'defaultPlant'}`,
            appConstants.WEBSOCKET_CUSTOM_URL_KEY,
          ];
          appLocalStorageKeys.forEach(key => {
              const item = localStorage.getItem(key);
              if (item !== null) {
                  try { localStorageData[key] = JSON.parse(item); } catch { localStorageData[key] = item; }
              }
          });

          const backupData: Partial<BackupFileContent> = {
            backupSchemaVersion: "2.0.0",
            createdAt: now.toISOString(),
            createdBy: 'auto-backup',
            localTime: localTime,
            application: { name: appConstants.APP_NAME, version: appConstants.VERSION },
            plant: { name: appConstants.PLANT_NAME, location: appConstants.PLANT_LOCATION, capacity: appConstants.PLANT_CAPACITY },
            configurations: { dataPointDefinitions: rawDataPoints },
            browserStorage: { indexedDB: idbData, localStorage: localStorageData },
            sldLayouts: allLayouts,
          };

          const jsonData = JSON.stringify(backupData, null, 2);

          await fetch('/api/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonData,
          });
          console.log("Automated backup successful.");

        } catch (error) {
          console.error("Automated backup failed:", error);
        }
      },
    }),
    {
      name: 'app-user-session-storage',
      storage: createJSONStorage(() => safeLocalStorage),
      // `partialize` tells `persist` what to save. This is the robust fix.
      partialize: (state: FullStoreState) => {
        // This destructuring cleanly separates the persisted state from all functions.
        const {
            // Actions to explicitly ignore
            updateOpcUaNodeValues,
            setDataPoints,
            toggleEditMode,
            setCurrentUser,
            logout,
            setSelectedElementForDetails,
            updateNodeConfig,
            setSoundEnabled,
            setActiveAlarms,
            setWebSocketStatus,
            addApiConfig,
            updateApiConfig,
            removeApiConfig,
            setApiInstanceStatus,
            recordApiDowntimeStart,
            resolveApiDowntimeEvent,
            loadApiConfigs,
            loadApiDowntimes,
            clearApiMonitoringData,
            handleAutoBackup,
            // Transient state to explicitly ignore
            sendJsonMessage,
            setSendJsonMessage,
            requestWithResponse,
            setRequestWithResponse,
            // State to explicitly ignore
            opcUaNodeValues,
            // ...rest now contains only the AppState we want to save
            ...rest
        } = state;
        return rest;
      },
    }
  )
);

// Convenience hooks (no changes needed)
export const useIsEditMode = () => useAppStore((state) => state.isEditMode);
export const useCurrentUser = () => useAppStore((state) => state.currentUser);
export const useCurrentUserRole = () => useAppStore((state) => state.currentUser?.role);
export const useSelectedElementForDetails = () => useAppStore((state) => state.selectedElementForDetails);
export const useSoundEnabled = () => useAppStore((state) => state.soundEnabled);
export const useActiveAlarms: () => ActiveAlarm[] = () => useAppStore((state) => state.activeAlarms);
export const useApiConfigs = () => useAppStore((state) => state.apiConfigs);
export const useApiDowntimes = () => useAppStore((state) => state.apiDowntimes);
export const useWebSocketStatus = () => useAppStore((state) => ({ isConnected: state.isWebSocketConnected, activeUrl: state.activeWebSocketUrl, }));
export const useSendJsonMessage = () => useAppStore((state) => state.sendJsonMessage);
export const useOpcUaNodeValue = (nodeId: string | undefined): string | number | boolean | undefined =>
    useAppStore(useCallback((state) => nodeId ? state.opcUaNodeValues[nodeId] : undefined, [nodeId]));