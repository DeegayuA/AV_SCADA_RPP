// store/appStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    RealTimeData,
    DataPoint,
} from '@/types/sld';
import { User, UserRole } from '@/types/auth';

import React, { forwardRef } from 'react';
import { toast } from 'sonner';
import { dataPoints as rawDataPoints } from '@/config/dataPoints';

const dataPointsWithIcons = rawDataPoints.map((dp) => ({
  ...dp,
  icon: dp.icon && typeof dp.icon === 'function'
    ? forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<'svg'>>((props, ref) => React.createElement(dp.icon, { ...props, ref }))
    : dp.icon,
}));

const defaultUser: User = {
  email: 'guest@example.com',
  name: 'Guest Viewer',
  role: UserRole.VIEWER,
  redirectPath: '/dashboard',
  avatar: `https://avatar.vercel.sh/guest.png`,
};

interface AppState {
  realtimeData: RealTimeData;
  dataPoints: Record<string, DataPoint>;
  isEditMode: boolean;
  currentUser: User | null;
}

const initialState: AppState = {
  realtimeData: {},
  dataPoints: dataPointsWithIcons.reduce<Record<string, DataPoint>>((acc, dp) => {
    acc[dp.id] = { ...dp, label: dp.label || dp.id };
    return acc;
  }, {}),
  isEditMode: false,
  currentUser: defaultUser,
};

interface SLDActions {
  updateRealtimeData: (updates: RealTimeData) => void;
  setDataPoints: (dataPoints: Record<string, DataPoint>) => void;
  toggleEditMode: () => void;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
}

// Directly type the callback parameters for onRehydrateStorage
const onRehydrateStorageCallback = (
    hydratedState: AppState | undefined, // Zustand passes the fully hydrated store state
    error?: Error | unknown
) => {
    if (error) {
        console.error("Zustand (appStore): Failed to rehydrate state from storage:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error("Session Error", { description: `Could not restore your session. Details: ${errorMessage}` });
    } else {
        console.log("Zustand (appStore): Hydration finished from storage.");
        if (hydratedState?.currentUser && hydratedState.currentUser.email !== defaultUser.email) {
            console.log(
                "Zustand (appStore): Store rehydrated. Current User:",
                hydratedState.currentUser.email,
                "Role:",
                hydratedState.currentUser.role
            );
        } else {
            console.log("Zustand (appStore): Store rehydrated with initial/default user or no user data found in storage.");
        }
    }
};

// Type for the Zustand setter and getter functions
type SetState<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>),
  replace?: boolean
) => void;

type GetState<T> = () => T;

// Define interface for persist configuration
interface PersistOptions<T> {
  name: string;
  storage: ReturnType<typeof createJSONStorage>;
  partialize?: (state: T) => Partial<T>;
  onRehydrateStorage?: (state?: T, error?: Error | unknown) => void;
}

export const useAppStore = create<AppState & SLDActions>()(
  persist(
    (set: SetState<AppState & SLDActions>, get: GetState<AppState & SLDActions>) => ({
      ...initialState,

      updateRealtimeData: (updates: RealTimeData) =>
        set((state) => {
          // Ensure updates is not overwriting, but merging with existing realtimeData
          // And ensure 'updates' itself is treated as a Record<string, any>
          if (typeof updates !== 'object' || updates === null) {
            console.warn("updateRealtimeData received non-object:", updates);
            return state; // No change
          }
          return { realtimeData: { ...state.realtimeData, ...updates }};
        }),

      setDataPoints: (dataPoints: Record<string, DataPoint>) => set({ dataPoints }),

      toggleEditMode: () => {
        const currentUser = get().currentUser;
        if (currentUser?.role === UserRole.ADMIN) {
          set((state) => ({ isEditMode: !state.isEditMode }));
        } else {
          console.warn('User without ADMIN role tried to toggle edit mode.');
          toast.error("Access Denied", { description: "Only administrators can enable edit mode." });
        }
      },

      setCurrentUser: (user: User | null) => set((state) => ({
        currentUser: user,
        isEditMode: user?.role === UserRole.ADMIN ? state.isEditMode : false
      })),

      logout: () => {
        set({ currentUser: defaultUser, isEditMode: false });
        toast.info("Logged Out", { description: "You have been successfully logged out." });
      },
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state: AppState & SLDActions): Partial<AppState> => ({
        currentUser: state.currentUser,
        isEditMode: state.isEditMode,
      }),
      onRehydrateStorage: onRehydrateStorageCallback,
    }
  )
);

export const useIsEditMode = () => useAppStore((state) => state.isEditMode);
export const useCurrentUser = () => useAppStore((state) => state.currentUser);
export const useCurrentUserRole = () => useAppStore((state) => state.currentUser?.role);
export const useRealtimeValue = (dataPointId: string) => useAppStore((state) => state.realtimeData[dataPointId]);