// store/appStore.ts
import { create } from 'zustand';
import {
    SLDState,
    RealTimeData,
    DataPoint, // Use the imported DataPoint type
    CurrentUser
} from '@/types/sld'; // Adjust path
import { Cable, CircuitBoard, BatteryCharging, Gauge, Zap, Rows } from 'lucide-react'; // Example icons
import { dataPoints } from '@/config/dataPoints';


// Define the initial state structure matching SLDState
const initialState: Omit<SLDState, 'updateRealtimeData' | 'setDataPoints' | 'toggleEditMode' | 'setCurrentUser'> = {
  realtimeData: {},
  dataPoints: dataPoints.reduce<Record<string, DataPoint>>((acc, dp) => {
    acc[dp.id] = { ...dp, label: dp.label || dp.id };
    return acc;
  }, {}), // Use the example data points
  isEditMode: false, // Start in view mode by default
  currentUser: { id: 'user-123', role: 'admin' },
};

interface SLDActions {
  updateRealtimeData: (updates: RealTimeData) => void;
  setDataPoints: (dataPoints: Record<string, DataPoint>) => void; // Use DataPoint here
  toggleEditMode: () => void;
  setCurrentUser: (user: CurrentUser | null) => void;
}

export const useAppStore = create<SLDState & SLDActions>((set) => ({
  ...initialState,

  updateRealtimeData: (updates) =>
    set((state) => ({
      realtimeData: { ...state.realtimeData, ...updates },
    })),

  setDataPoints: (dataPoints) => set({ dataPoints }),

  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),

  setCurrentUser: (user) => set({ currentUser: user }),
}));

// Optional selectors remain the same conceptually
export const useIsEditMode = () => useAppStore((state) => state.isEditMode);
export const useCurrentUserRole = () => useAppStore((state) => state.currentUser?.role);
export const useRealtimeValue = (dataPointId: string) => useAppStore((state) => state.realtimeData[dataPointId]);