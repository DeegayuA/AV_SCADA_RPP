'use client';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useCallback, useMemo } from 'react'; // Added useCallback, useMemo
import { AppOnboardingData, saveOnboardingData as saveToIDB, clearOnboardingData as clearFromIDB } from '@/lib/idb-store';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DataPointConfig, dataPoints as actualDefaultDataPointsFromConfig } from '@/config/dataPoints'; // Source of truth
// Use the aliased import consistently or just one of them
import { APP_NAME, OPC_UA_ENDPOINT_OFFLINE, PLANT_CAPACITY, PLANT_LOCATION, PLANT_NAME as initialPlantNameFromConst, PLANT_TYPE } from '@/config/constants';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;
export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';
export type PartialOnboardingData = Partial<Omit<AppOnboardingData, 'onboardingCompleted' | 'version'>>;


type PartialDataPointFromFile = Partial<Omit<DataPointConfig, 'icon'>> & { icon?: string | React.ComponentType };
interface FullConfigFile {
    plantName?: string;
    plantLocation?: string;
    plantType?: string;
    configuredDataPoints: PartialDataPointFromFile[];
}

interface OnboardingContextType {
  currentStep: OnboardingStep;
  setCurrentStep: Dispatch<SetStateAction<OnboardingStep>>;
  onboardingData: PartialOnboardingData;
  updateOnboardingData: (data: PartialOnboardingData) => void;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  defaultDataPoints: DataPointConfig[];
  configuredDataPoints: DataPointConfig[];
  setConfiguredDataPoints: Dispatch<SetStateAction<DataPointConfig[]>>;
  saveStatus: SaveStatus;
  setPlantDetails: (details: Partial<FullConfigFile>) => void;

}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// This global 'defaultDataPoints' is the source for resets. It's created once.
const sourceDefaultDataPoints: DataPointConfig[] = JSON.parse(JSON.stringify(actualDefaultDataPointsFromConfig));

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [onboardingData, setOnboardingData] = useState<PartialOnboardingData>({
    plantName: initialPlantNameFromConst,
    plantLocation: PLANT_LOCATION,
    plantType: PLANT_TYPE,
    plantCapacity: PLANT_CAPACITY,
    opcUaEndpointOffline: OPC_UA_ENDPOINT_OFFLINE.replace('opc.tcp://', ''),
    appName: APP_NAME,
  });

  const [configuredDataPoints, setConfiguredDataPoints] = useState<DataPointConfig[]>(
    () => JSON.parse(JSON.stringify(sourceDefaultDataPoints)) // Initial state from the source copy
  );

  const totalSteps = 5;

  const updateOnboardingData = useCallback((data: PartialOnboardingData) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => (prev < totalSteps ? (prev + 1) as OnboardingStep : prev));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev > 0 ? (prev - 1) as OnboardingStep : prev));
  }, []);

  const completeOnboarding = useCallback(async () => {
    setCurrentStep(5);
    setSaveStatus('saving');
    let loadingToastId: string | number | undefined;
    loadingToastId = toast.loading("Saving configuration...", { duration: Infinity });

    try {
      const finalDataToSave = {
        ...onboardingData,
        configuredDataPoints: configuredDataPoints,
      } as Omit<AppOnboardingData, 'onboardingCompleted' | 'version'>;

      if (!finalDataToSave.plantName || !finalDataToSave.opcUaEndpointOffline) {
        throw new Error("Essential configuration data is missing.");
      }

      await saveToIDB(finalDataToSave);
      await new Promise(resolve => setTimeout(resolve, 1200));

      setSaveStatus('success');
      if (loadingToastId) toast.dismiss(loadingToastId);
      toast.success("Configuration complete! Welcome aboard.", { duration: 3000 });

      setTimeout(() => {
        router.push('/login');
      }, 1800);

    } catch (errorCaught) { // Renamed to avoid conflict with any outer 'error'
      console.error("Failed to save onboarding data:", errorCaught);
      if (loadingToastId) toast.dismiss(loadingToastId);
      toast.error(`Failed to save configuration: ${(errorCaught as Error).message || "Please try again."}`);
      setSaveStatus('error');
      setCurrentStep(4);
    }
  }, [onboardingData, configuredDataPoints, router]); // router added as dependency

  const resetOnboarding = useCallback(async () => {
    await clearFromIDB();
    setOnboardingData({
      plantName: initialPlantNameFromConst,
      plantLocation: PLANT_LOCATION,
      plantType: PLANT_TYPE,
      plantCapacity: PLANT_CAPACITY,
      opcUaEndpointOffline: OPC_UA_ENDPOINT_OFFLINE.replace('opc.tcp://', ''),
      appName: APP_NAME,
    });
    setConfiguredDataPoints(JSON.parse(JSON.stringify(sourceDefaultDataPoints)));
    setCurrentStep(0);
    setSaveStatus('idle');
    toast.info("Onboarding configuration has been reset.");
  // Removed `router` from dependency array as resetOnboarding doesn't use it directly for navigation itself.
  // The page component handles navigation after reset if needed.
  }, []);

  const contextValue = useMemo(() => ({
    saveStatus,
    currentStep,
    setCurrentStep,
    onboardingData,
    updateOnboardingData,
    totalSteps,
    nextStep,
    prevStep,
    completeOnboarding,
    resetOnboarding,
    defaultDataPoints: sourceDefaultDataPoints, // Pass the stable source defaults
    configuredDataPoints,
    setConfiguredDataPoints,
    setPlantDetails: (details: Partial<FullConfigFile>) => {
      setOnboardingData(prev => {
        return {
          ...prev,
          ...details,
          configuredDataPoints: Array.isArray(details.configuredDataPoints)
            ? (details.configuredDataPoints.filter(dp => dp && typeof dp.id === 'string') as DataPointConfig[])
            : prev.configuredDataPoints,
        };
      });
      toast.info("Plant details updated from file.");
    },

  }), [
    saveStatus, currentStep, onboardingData, updateOnboardingData,
    nextStep, prevStep, completeOnboarding, resetOnboarding, // totalSteps is stable
    configuredDataPoints, // sourceDefaultDataPoints is stable
  ]);

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
