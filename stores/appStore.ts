// store/appStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // <-- IMPORT PERSIST
import {
    SLDState as SLDStateFromTypes,
    RealTimeData,
    DataPoint,
} from '@/types/sld';
import { User, UserRole } from '@/types/auth';

import React, { forwardRef } from 'react';
import { Cable as LucideCable, CircuitBoard as LucideCircuitBoard, BatteryCharging as LucideBatteryCharging, Gauge as LucideGauge, Zap as LucideZap, Rows as LucideRows } from 'lucide-react';
import { toast } from 'sonner';
import { dataPoints as rawDataPoints } from '@/config/dataPoints';


// Icons (ensure React.createElement is used correctly if they are class components or need specific handling)
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

// No change to initial state definition needed for persist, but know it will be overridden by localStorage if present.
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
  logout: () => void; // <-- ADD LOGOUT ACTION
}

export const useAppStore = create<AppState & SLDActions>()( // <-- Note the structure change for middleware
  persist(
    (set, get) => ({
      ...initialState, // Provide initial state for the first load if nothing is in localStorage

      updateRealtimeData: (updates) =>
        set((state) => ({
          realtimeData: { ...state.realtimeData, ...updates },
        })),

      setDataPoints: (dataPoints) => set({ dataPoints }),

      toggleEditMode: () => {
        const currentUser = get().currentUser;
        if (currentUser?.role === UserRole.ADMIN) {
          set((state) => ({ isEditMode: !state.isEditMode }));
        } else {
          console.warn('User without ADMIN role tried to toggle edit mode.');
          toast.error("Access Denied", { description: "Only administrators can enable edit mode." });
        }
      },

      setCurrentUser: (user) => set({ currentUser: user, isEditMode: user?.role === UserRole.ADMIN ? get().isEditMode : false }), // Reset edit mode if user is not admin

      logout: () => { // <-- IMPLEMENT LOGOUT
        set({ currentUser: defaultUser, isEditMode: false }); // Reset to default guest user, clear edit mode
        // Optionally, clear other sensitive data from the store here if needed
        toast.info("Logged Out", { description: "You have been successfully logged out." });
        // The redirect to /login should happen from the component that calls logout or from a route guard.
      },
    }),
    {
      name: 'app-storage', // Name of the item in localStorage
      storage: createJSONStorage(() => localStorage), // Use localStorage
      partialize: (state) => ({ currentUser: state.currentUser, isEditMode: state.isEditMode }), // Persist only currentUser and isEditMode
      // onRehydrateStorage might be useful for initial hydration logic if needed, but usually not for just user
      onRehydrateStorage: (state) => { // Only accept the state parameter
        return (persistedState, error) => { // persistedState is the hydrated state object
          if (error) {
            console.error("Zustand: Failed to rehydrate state from storage:", error);
            // If rehydration fails, log the error but we can't reset state here directly
            toast.error("Session Error", { description: "Could not restore your session. Please log in again." });
          } else {
            console.log("Zustand: Hydration finished.");
            const hydratedCurrentUser = persistedState?.currentUser;
            if (hydratedCurrentUser) {
              console.log("Zustand: Rehydrated user:", hydratedCurrentUser.email, "Role:", hydratedCurrentUser.role);
            } else {
              console.log("Zustand: No user found in rehydrated state, will use initial default user.");
            }
          }
        }
      }      
    }
  )
);

// Selectors remain the same
export const useIsEditMode = () => useAppStore((state) => state.isEditMode);
export const useCurrentUser = () => useAppStore((state) => state.currentUser);
export const useCurrentUserRole = () => useAppStore((state) => state.currentUser?.role);
export const useRealtimeValue = (dataPointId: string) => useAppStore((state) => state.realtimeData[dataPointId]);