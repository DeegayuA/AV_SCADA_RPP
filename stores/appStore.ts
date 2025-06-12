// store/appStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import {
    DataPoint,
    CustomNodeType,
    CustomFlowEdge,
} from '@/types/sld';
import { User, UserRole } from '@/types/auth'; // Assuming auth types are correct

import React from 'react'; // forwardRef and createElement are part of React
import { toast } from 'sonner';
import { dataPoints as rawDataPoints } from '@/config/dataPoints'; // Assuming dataPoints are defined here

// Process rawDataPoints for icons, ensure this pattern works for your icon components
const dataPointsWithIcons = rawDataPoints.map((dp) => {
  let iconComponent = dp.icon; // Assume dp.icon is already a React Component or null/undefined
  // If dp.icon was a function that _returns_ a component or JSX, that's different.
  // The original forwardRef approach might be if dp.icon itself needs a ref.
  // For simple LucideIcon components, they are already functions/components.
  if (dp.icon && typeof dp.icon === 'function' && !(React.isValidElement(dp.icon))) {
      // This condition tries to check if it's a component function vs already an element instance
      // If dp.icon is like `BatteryCharging`, it's already a component.
      // The forwardRef example from original code seems complex if icons are just standard components.
      // Simpler: just use the icon component directly if it's a valid React component type.
      // For this example, assuming dp.icon are direct Lucide components:
      // iconComponent = dp.icon; (no change needed if already a component)
  }
  return { ...dp, icon: iconComponent };
});


const defaultUser: User = {
  email: 'guest@example.com',
  name: 'Guest Viewer',
  role: UserRole.VIEWER,
  redirectPath: '/dashboard', // Example path
  avatar: `https://avatar.vercel.sh/guest.png`, // Example avatar
};

interface AppState {
  opcUaNodeValues: Record<string, string | number | boolean>; // Renamed and typed
  dataPoints: Record<string, DataPoint>; // Keyed by DataPoint ID for easy lookup
  isEditMode: boolean;
  currentUser: User | null;
  selectedElementForDetails: CustomNodeType | CustomFlowEdge | null; // Added for detail sheet
}

const initialState: AppState = {
  opcUaNodeValues: {}, // Initialized to empty object
  dataPoints: dataPointsWithIcons.reduce<Record<string, DataPoint>>((acc, dp) => {
    acc[dp.id] = { ...dp, label: dp.label || dp.name || dp.id }; // Ensure label exists
    return acc;
  }, {}),
  isEditMode: false, // Default to false, admin can toggle
  currentUser: defaultUser, // Default to guest or null if prefer explicit login
  selectedElementForDetails: null, // Initialize as null
};

interface SLDActions {
  updateOpcUaNodeValues: (updates: Record<string, string | number | boolean>) => void; // Renamed and typed
  setDataPoints: (dataPoints: Record<string, DataPoint>) => void; // For dynamic updates to metadata if needed
  toggleEditMode: () => void;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  setSelectedElementForDetails: (element: CustomNodeType | CustomFlowEdge | null) => void; // Added action
  updateNodeConfig: (nodeId: string, config: any, data?: any) => void;
}

const onRehydrateStorageCallback = (
    hydratedState: AppState | undefined,
    error?: Error | unknown
): void => {
    if (error) {
        console.error("Zustand (appStore): Failed to rehydrate state from storage.", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error("Session Restore Failed", { description: `Could not restore your session data. Details: ${errorMessage}. Some settings may be reset.` });
    } else {
        // console.log("Zustand (appStore): Hydration from storage complete.");
        if (hydratedState?.currentUser && hydratedState.currentUser.email !== defaultUser.email) {
            // console.log("Zustand (appStore): Rehydrated with User:", hydratedState.currentUser.email, "Role:", hydratedState.currentUser.role);
        }
    }
};

// Define the storage explicitly to handle potential SSR issues if localStorage isn't available immediately
const safeLocalStorage: StateStorage = typeof window !== 'undefined'
  ? {
      getItem: (name) => {
        try {
          return localStorage.getItem(name);
        } catch (error) {
          console.warn(`Zustand (appStore): localStorage.getItem failed for '${name}'.`, error);
          return null;
        }
      },
      setItem: (name, value) => {
        try {
          localStorage.setItem(name, value);
        } catch (error) {
          console.warn(`Zustand (appStore): localStorage.setItem failed for '${name}'.`, error);
        }
      },
      removeItem: (name) => {
        try {
          localStorage.removeItem(name);
        } catch (error) {
          console.warn(`Zustand (appStore): localStorage.removeItem failed for '${name}'.`, error);
        }
      },
    }
  : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
export const useAppStore = create<AppState & SLDActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateOpcUaNodeValues: (updates: Record<string, string | number | boolean>) => // Renamed and typed
        set((state) => {
          if (typeof updates !== 'object' || updates === null) {
            // console.warn("Zustand (appStore): updateOpcUaNodeValues received non-object data. Ignoring update.", updates);
            return state; // No change if updates is not a valid object
          }
          // Merge updates with existing opcUaNodeValues
          return { opcUaNodeValues: { ...state.opcUaNodeValues, ...updates }};
        }),

      setDataPoints: (newDataPoints: Record<string, DataPoint>) =>
        set({ dataPoints: newDataPoints }),

      toggleEditMode: () => {
        const currentUser = get().currentUser;
        if (currentUser?.role === UserRole.ADMIN) { 
          set((state) => ({ isEditMode: !state.isEditMode }));
          toast.info(`Edit Mode ${get().isEditMode ? "Enabled" : "Disabled"}`);
        } else {
          console.warn('Attempt to toggle edit mode by non-admin/editor user:', currentUser?.email);
          toast.error("Access Denied", { description: "You do not have permission to change edit mode." });
        }
      },

      setCurrentUser: (user: User | null) => {
        const currentEditMode = get().isEditMode;
        set({ 
            currentUser: user, 
            // Disable edit mode if user is not admin/editor or if logging out (user is null)
            isEditMode: user && (user.role === UserRole.ADMIN) ? currentEditMode : false 
        });
        if (user) {
            // toast.info(`Logged in as ${user.name}`);
        }
      },

      logout: () => {
        set({ currentUser: defaultUser, isEditMode: false, selectedElementForDetails: null }); // Revert to default user on logout, clear selected element
        toast.success("Logged Out", { description: "You have been successfully signed out." });
      },

      setSelectedElementForDetails: (element: CustomNodeType | CustomFlowEdge | null) =>
        set({ selectedElementForDetails: element }),
      
      updateNodeConfig: (nodeId: string, config: any, data?: any) => {
        // Implementation of updateNodeConfig
        // You need to implement this method according to your requirements
        console.log('Updating node config for', nodeId, config, data);
        // Example implementation - update with actual logic as needed
        set((state) => {
          // Update logic here - this is just a placeholder
          return state;
        });
      },
    }),
    {
      name: 'app-user-session-storage', // More specific name
      storage: createJSONStorage(() => safeLocalStorage), // Use safe local storage
      partialize: (state: AppState & SLDActions): Partial<AppState> => ({ // Only persist these parts
        // currentUser: state.currentUser,
        isEditMode: state.isEditMode,
        // Do NOT persist opcUaNodeValues or dataPoints metadata from constants
        // selectedElementForDetails should also NOT be persisted as it's transient UI state
      }),
      onRehydrateStorage: (state) => onRehydrateStorageCallback(state as AppState | undefined), // Cast type
    }
  )
);

// Convenience hooks
export const useIsEditMode = () => useAppStore((state) => state.isEditMode);
export const useCurrentUser = () => useAppStore((state) => state.currentUser);
export const useCurrentUserRole = () => useAppStore((state) => state.currentUser?.role);
export const useSelectedElementForDetails = () => useAppStore((state) => state.selectedElementForDetails); // New hook

// Get a single OPC UA node value, subscribing only to changes for that ID
export const useOpcUaNodeValue = (nodeId: string | undefined): string | number | boolean | undefined => 
    useAppStore(useCallback((state) => nodeId ? state.opcUaNodeValues[nodeId] : undefined, [nodeId]));

// useCallback imported from React for useOpcUaNodeValue hook
import { useCallback } from 'react';