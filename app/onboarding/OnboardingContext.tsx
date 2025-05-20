// app/onboarding/OnboardingContext.tsx
'use client';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { AppOnboardingData, saveOnboardingData as saveToIDB, clearOnboardingData as clearFromIDB } from '@/lib/idb-store';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DataPointConfig, dataPoints as actualDefaultDataPointsFromConfig } from '@/config/dataPoints';
import { APP_NAME, OPC_UA_ENDPOINT_OFFLINE, PLANT_CAPACITY, PLANT_LOCATION, PLANT_NAME as initialPlantNameFromConst, PLANT_TYPE } from '@/config/constants';
import { Sparkles } from 'lucide-react';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;
export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';
export type PartialOnboardingData = Partial<Omit<AppOnboardingData, 'onboardingCompleted' | 'version'>>;

// Keep your existing type definitions
type PartialDataPointFromFile = Partial<Omit<DataPointConfig, 'icon'>> & { icon?: string | React.ComponentType };
interface FullConfigFile {
    plantName?: string;
    plantLocation?: string;
    plantType?: string;
    configuredDataPoints: PartialDataPointFromFile[];
}

export interface OnboardingConfigData {
  plantName?: string;
  plantLocation?: string;
  plantType?: string;
  plantCapacity?: string;
  opcUaEndpointOffline?: string;
  appName?: string;
  configuredDataPoints?: DataPointConfig[];
}

export interface OnboardingContextType {
  currentStep: OnboardingStep;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  saveStatus: SaveStatus;
  completeOnboarding: () => Promise<void>;
  resetOnboardingData: () => Promise<void>;
  configData: OnboardingConfigData;
  updateConfigData: (partialData: Partial<OnboardingConfigData>) => void;
  isLoading: boolean;
  totalSteps: number;
  onboardingData: PartialOnboardingData;
  updateOnboardingData: (data: PartialOnboardingData) => void;
  defaultDataPoints: DataPointConfig[];
  configuredDataPoints: DataPointConfig[];
  setConfiguredDataPoints: Dispatch<SetStateAction<DataPointConfig[]>>;
  setPlantDetails: (details: Partial<FullConfigFile>) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

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
    () => JSON.parse(JSON.stringify(sourceDefaultDataPoints))
  );

  const totalSteps = 5; // This seems fixed for the defined steps

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
    setCurrentStep(5); // Move to finalizing screen
    setSaveStatus('saving');
    let loadingToastId: string | number | undefined;
    // Show indefinite loading toast
    loadingToastId = toast.loading("Finalizing configuration...", { duration: Infinity });

    try {
      const finalDataToSave = {
        ...onboardingData,
        configuredDataPoints: configuredDataPoints, // Ensure this is the up-to-date state
      } as Omit<AppOnboardingData, 'onboardingCompleted' | 'version'>;

      // Basic validation
      if (!finalDataToSave.plantName || !finalDataToSave.opcUaEndpointOffline || !finalDataToSave.plantLocation) {
        console.error("Missing essential data for save:", finalDataToSave);
        throw new Error("Essential plant details or OPC UA endpoint are missing.");
      }
      if (!finalDataToSave.configuredDataPoints || finalDataToSave.configuredDataPoints.length === 0) {
        // Depending on requirements, this might be an error or a warning.
        // For now, let's assume some data points are expected.
        console.warn("No data points configured. Saving with empty set.");
        // throw new Error("At least one data point must be configured.");
      }
      
      await saveToIDB(finalDataToSave);
      // Simulate some network latency if desired for better UX feedback
      await new Promise(resolve => setTimeout(resolve, 1200)); 

      setSaveStatus('success');
      if(loadingToastId) toast.dismiss(loadingToastId); // Dismiss the loading toast
      toast.success("Configuration Complete!", { 
        description: `Welcome to ${APP_NAME}. Your settings have been saved.`,
        duration: 3500 
      });
      
      // Redirect after success
      setTimeout(() => {
        router.push('/login'); // Or to the dashboard if the user is already logged in
      }, 2000); // Delay slightly more than toast

    } catch (errorCaught) {
      console.error("Failed to save onboarding data:", errorCaught);
      if(loadingToastId) toast.dismiss(loadingToastId);
      const errorMessage = (errorCaught instanceof Error) ? errorCaught.message : "An unknown error occurred.";
      toast.error("Save Failed", {
          description: `Could not save configuration: ${errorMessage}. Please review your settings or try again.`,
          duration: 7000
      });
      setSaveStatus('error');
      // Optionally, send user back to review step or last configuration step
      setCurrentStep(4); // Example: back to review step
    }
  }, [onboardingData, configuredDataPoints, router]);


  const resetOnboardingDataInternal = useCallback(async () => { // <--- CHANGED HERE (function name)
    await clearFromIDB(); // Clear data from IndexedDB
    // Reset local state in context
    setOnboardingData({
      plantName: initialPlantNameFromConst,
      plantLocation: PLANT_LOCATION,
      plantType: PLANT_TYPE,
      plantCapacity: PLANT_CAPACITY,
      opcUaEndpointOffline: OPC_UA_ENDPOINT_OFFLINE.replace('opc.tcp://', ''),
      appName: APP_NAME,
    });
    setConfiguredDataPoints(JSON.parse(JSON.stringify(sourceDefaultDataPoints))); // Reset to deep copy of defaults
    setCurrentStep(0); // Go back to the first step
    setSaveStatus('idle'); // Reset save status
    toast.info("Onboarding Reset", { description: "Configuration has been reset to defaults." });
  }, []); // Dependencies for this reset are minimal as it uses constants and setters

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step <= totalSteps) {
      setCurrentStep(step as OnboardingStep);
    }
  }, [totalSteps]);

  const contextValue = useMemo(() => ({
    currentStep,
    setCurrentStep,
    onboardingData,
    updateOnboardingData,
    totalSteps,
    nextStep,
    prevStep,
    goToStep,
    completeOnboarding,
    resetOnboardingData: resetOnboardingDataInternal, // <--- CHANGED HERE (exported name)
    defaultDataPoints: sourceDefaultDataPoints,
    configuredDataPoints,
    setConfiguredDataPoints,
    saveStatus,
    isLoading: saveStatus === 'saving',
    configData: {
      plantName: onboardingData.plantName,
      plantLocation: onboardingData.plantLocation,
      plantType: onboardingData.plantType,
      plantCapacity: onboardingData.plantCapacity,
      opcUaEndpointOffline: onboardingData.opcUaEndpointOffline,
      appName: onboardingData.appName,
      configuredDataPoints
    },
    updateConfigData: (partialData: Partial<OnboardingConfigData>) => {
      const { configuredDataPoints: newDataPoints, ...rest } = partialData;
      if (newDataPoints) {
        setConfiguredDataPoints(newDataPoints);
      }
      updateOnboardingData(rest);
    },
    setPlantDetails: (details: Partial<FullConfigFile>) => { // Renamed for clarity
        // When importing plant details, also update onboardingData for plant-specific fields
        const { plantName, plantLocation, plantType, configuredDataPoints: importedPoints } = details;
        const updatedOnboardingDetails: PartialOnboardingData = {};
        if (plantName) updatedOnboardingDetails.plantName = plantName;
        if (plantLocation) updatedOnboardingDetails.plantLocation = plantLocation;
        if (plantType) updatedOnboardingDetails.plantType = plantType;
        // Assuming capacity and opcUaEndpointOffline might not be in a simple plant config file.
        // They could be if your `FullConfigFile` includes them.

        setOnboardingData(prev => ({ ...prev, ...updatedOnboardingDetails }));

        if (Array.isArray(importedPoints)) {
          // Filter and map imported points to ensure they conform to DataPointConfig
          // This example assumes direct casting, but you might need more robust mapping/validation
          // based on how `PartialDataPointFromFile` relates to `DataPointConfig`
          const validImportedPoints = importedPoints
            .filter(dp => dp && typeof dp.id === 'string' && typeof dp.nodeId === 'string' && typeof dp.name === 'string' && typeof dp.dataType === 'string') // Add more checks as needed
            .map(dp => {
                // Attempt to find a matching actual default to get the icon function
                const actualDefault = actualDefaultDataPointsFromConfig.find(actualDp => actualDp.id === dp.id);
                return {
                    ...actualDefault, // Base it on an actual default if found (for icon and other static properties)
                    ...dp,           // Overlay with data from the file
                    icon: actualDefault ? actualDefault.icon : Sparkles, // Fallback icon
                } as DataPointConfig;
            });
          setConfiguredDataPoints(validImportedPoints);
        }
    },
  }), [
    currentStep, onboardingData, updateOnboardingData, totalSteps,
    nextStep, prevStep, goToStep, completeOnboarding, resetOnboardingDataInternal, 
    configuredDataPoints, setConfiguredDataPoints, saveStatus, setOnboardingData
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