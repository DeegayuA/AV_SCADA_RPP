// components/onboarding/PlantConfigStep.tsx
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
// FIX: Import 'Variants'
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Building2, MapPin, Tag, Bolt, Globe, Settings2, Share2, Server, WifiOff, FileText,
  Loader2, CheckCircle2, XCircle, RefreshCw, AlertCircle, ShieldQuestion, DownloadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

import { plantConfigSchema, PlantConfigFormData } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnboarding } from './OnboardingContext';
import { APP_NAME, PLANT_CAPACITY, PLANT_LOCATION, PLANT_NAME, PLANT_TYPE } from '@/config/constants';
import { cn } from '@/lib/utils';

// --- Framer Motion Variants (FIXED with explicit 'Variants' type) ---
const staggeredContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, filter: 'blur(3px)' },
  visible: { 
    opacity: 1, y: 0, filter: 'blur(0px)', 
    transition: { type: 'spring', stiffness: 120, damping: 15, mass: 0.7 } 
  },
};

const sectionTitleVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { 
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 150, damping: 20, mass: 0.8, delay: 0.1 } 
  },
};

const statusIconVariants: Variants = {
  initial: { scale: 0.5, opacity: 0, rotate: -45 },
  animate: { scale: 1, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 12 } },
  exit: { scale: 0.5, opacity: 0, rotate: 45, transition: { duration: 0.2 } }
};

const resultMessageVariants: Variants = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease:'circOut', delay: 0.1 } },
  exit: { opacity: 0, y: -5, transition: { duration: 0.2, ease: 'circIn' } }
};


// --- Types for Connection Testing ---
type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failed';
interface TestState {
  status: ConnectionStatus;
  buttonLabel: string;
  resultMessage?: string;
  resultIcon?: React.ElementType;
}

export default function PlantConfigStep() {
  const { onboardingData, updateOnboardingData, setBackupDataToRestore } = useOnboarding();
  const [plants, setPlants] = useState<{name: string, path: string}[]>([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        setIsLoadingPlants(true);
        setError(null);
        const response = await fetch('https://api.github.com/repos/DeegayuA/AV_SCADA_Configs/contents/');
        if (!response.ok) {
          throw new Error(`Failed to fetch plant list from GitHub: ${response.statusText}`);
        }
        const data = await response.json();
        const plantFolders = data.filter((item: any) => item.type === 'dir').map((item: any) => ({ name: item.name, path: item.path }));
        setPlants(plantFolders);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        toast.error("Could not load remote configurations", { description: e instanceof Error ? e.message : 'Please check your internet connection or proceed with offline mode.' });
      } finally {
        setIsLoadingPlants(false);
      }
    };

    fetchPlants();
  }, []);

  const form = useForm<PlantConfigFormData>({
    resolver: zodResolver(plantConfigSchema) as any,
    mode: 'onTouched',
    defaultValues: {
      plantName: onboardingData.plantName || PLANT_NAME,
      plantLocation: onboardingData.plantLocation || PLANT_LOCATION,
      plantType: onboardingData.plantType || PLANT_TYPE,
      plantCapacity: onboardingData.plantCapacity || PLANT_CAPACITY,
      opcUaEndpointOfflineIP: onboardingData.opcUaEndpointOffline?.split(':')[0] || '192.168.1.10',
      opcUaEndpointOfflinePort: Number(onboardingData.opcUaEndpointOffline?.split(':')[1]) || 4840,
      opcUaEndpointOnlineIP: onboardingData.opcUaEndpointOnline?.split(':')[0] || '',
      opcUaEndpointOnlinePort: onboardingData.opcUaEndpointOnline ? Number(onboardingData.opcUaEndpointOnline?.split(':')[1]) : undefined,
      appName: onboardingData.appName || APP_NAME,
    },
  });

  const { getValues, formState, watch, trigger, reset } = form;
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);

  const selectedPlantPath = watch('selectedPlant');

  useEffect(() => {
    if (!selectedPlantPath) return;

    const fetchAndApplyConfig = async () => {
      setIsFetchingConfig(true);
      toast.info("Fetching configuration for selected plant...", { description: selectedPlantPath });
      try {
        // 1. Get the file list for the selected plant
        const response = await fetch(`https://api.github.com/repos/DeegayuA/AV_SCADA_Configs/contents/${selectedPlantPath}`);
        if (!response.ok) throw new Error(`Failed to list files for plant: ${response.statusText}`);
        const files = await response.json();

        const constantsFile = files.find((f: any) => f.name === 'constants.ts');
        const dataPointsFile = files.find((f: any) => f.name === 'dataPoints.ts');

        if (!constantsFile || !dataPointsFile) {
          throw new Error("Required configuration files (constants.ts, dataPoints.ts) not found in the repository for this plant.");
        }

        // 2. Fetch the content of the files
        const [constantsResponse, dataPointsResponse] = await Promise.all([
          fetch(constantsFile.download_url),
          fetch(dataPointsFile.download_url)
        ]);

        if (!constantsResponse.ok) throw new Error('Failed to download constants.ts');
        if (!dataPointsResponse.ok) throw new Error('Failed to download dataPoints.ts');

        const constantsContent = await constantsResponse.text();
        const dataPointsContent = await dataPointsResponse.text();

        // 3. POST the content to our backend to be saved as a new template
        const importResponse = await fetch('/api/onboarding/import-plant-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plantName: selectedPlantPath,
            constantsContent,
            dataPointsContent
          })
        });

        if (!importResponse.ok) {
          const errorBody = await importResponse.json();
          throw new Error(`Failed to import configuration on server: ${errorBody.message}`);
        }

        toast.success("Successfully imported remote configuration.", { description: "Form has been updated with the new values." });

        // 4. Parse constants.ts content and pre-fill the form
        const plantNameMatch = constantsContent.match(/export const PLANT_NAME\s*=\s*['"`](.*?)['"`]/);
        const plantLocationMatch = constantsContent.match(/export const PLANT_LOCATION\s*=\s*['"`](.*?)['"`]/);
        const plantTypeMatch = constantsContent.match(/export const PLANT_TYPE\s*=\s*['"`](.*?)['"`]/);
        const plantCapacityMatch = constantsContent.match(/export const PLANT_CAPACITY\s*=\s*['"`](.*?)['"`]/);
        const appNameMatch = constantsContent.match(/export const APP_NAME\s*=\s*['"`](.*?)['"`]/);
        const offlineEndpointMatch = constantsContent.match(/export const OPC_UA_ENDPOINT_OFFLINE\s*=\s*['"`]opc\.tcp:\/\/(.*):(\d+)['"`]/);
        const onlineEndpointMatch = constantsContent.match(/export const OPC_UA_ENDPOINT_ONLINE\s*=\s*['"`]opc\.tcp:\/\/(.*):(\d+)['"`]/);

        const newValues: Partial<PlantConfigFormData> = {};
        if (plantNameMatch) newValues.plantName = plantNameMatch[1];
        if (plantLocationMatch) newValues.plantLocation = plantLocationMatch[1];
        if (plantTypeMatch) newValues.plantType = plantTypeMatch[1];
        if (plantCapacityMatch) newValues.plantCapacity = plantCapacityMatch[1];
        if (appNameMatch) newValues.appName = appNameMatch[1];
        if (offlineEndpointMatch) {
            newValues.opcUaEndpointOfflineIP = offlineEndpointMatch[1];
            newValues.opcUaEndpointOfflinePort = parseInt(offlineEndpointMatch[2], 10);
        }
        if (onlineEndpointMatch) {
            newValues.opcUaEndpointOnlineIP = onlineEndpointMatch[1];
            newValues.opcUaEndpointOnlinePort = parseInt(onlineEndpointMatch[2], 10);
        }

        reset(newValues);


      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(errorMessage);
        toast.error("Failed to apply remote configuration", { description: errorMessage });
      } finally {
        setIsFetchingConfig(false);
      }
    };

    fetchAndApplyConfig();
  }, [selectedPlantPath, reset]);


  const [testStates, setTestStates] = useState<Record<'offline' | 'online', TestState>>({
    offline: { status: 'idle', buttonLabel: 'Test Local PLC', resultMessage: 'Awaiting test for local endpoint.' , resultIcon: ShieldQuestion },
    online: { status: 'idle', buttonLabel: 'Test Remote Server', resultMessage: 'Awaiting test for remote endpoint (optional).', resultIcon: ShieldQuestion },
  });


  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name?.startsWith('opcUaEndpointOffline')) {
        setTestStates(prev => ({ ...prev, offline: { status: 'idle', buttonLabel: 'Test Local PLC', resultMessage: 'Config changed. Re-test needed.', resultIcon: ShieldQuestion }}));
      }
      if (name?.startsWith('opcUaEndpointOnline')) {
         setTestStates(prev => ({ ...prev, online: { status: 'idle', buttonLabel: 'Test Remote Server', resultMessage: 'Config changed. Re-test needed.', resultIcon: ShieldQuestion }}));
      }

      if (formState.isValid) {
        const currentData = getValues();
        const offlineEndpoint = `${currentData.opcUaEndpointOfflineIP}:${currentData.opcUaEndpointOfflinePort}`;
        const onlineEndpoint = currentData.opcUaEndpointOnlineIP && currentData.opcUaEndpointOnlinePort
          ? `${currentData.opcUaEndpointOnlineIP}:${currentData.opcUaEndpointOnlinePort}`
          : undefined;
        
        updateOnboardingData({
          ...currentData,
          opcUaEndpointOffline: offlineEndpoint,
          opcUaEndpointOnline: onlineEndpoint,
        });
      }
    });
    if (formState.isValid) {
      const initialData = getValues();
       const offlineEndpoint = `${initialData.opcUaEndpointOfflineIP}:${initialData.opcUaEndpointOfflinePort}`;
      const onlineEndpoint = initialData.opcUaEndpointOnlineIP && initialData.opcUaEndpointOnlinePort
          ? `${initialData.opcUaEndpointOnlineIP}:${initialData.opcUaEndpointOnlinePort}`
          : undefined;
      updateOnboardingData({ 
        ...initialData,
        opcUaEndpointOffline: offlineEndpoint,
        opcUaEndpointOnline: onlineEndpoint,
      });
    }
    return () => subscription.unsubscribe();
  }, [watch, formState.isValid, getValues, updateOnboardingData]);


  const handleTestConnection = async (endpointType: 'offline' | 'online') => {
    let endpointName = '';
    let ip = '', port: number | undefined;
    let fieldsToValidate: (keyof PlantConfigFormData)[] = [];

    if (endpointType === 'offline') {
      endpointName = "Local PLC Endpoint";
      ip = getValues('opcUaEndpointOfflineIP');
      port = getValues('opcUaEndpointOfflinePort');
      fieldsToValidate = ['opcUaEndpointOfflineIP', 'opcUaEndpointOfflinePort'];
    } else {
      endpointName = "Remote Server Endpoint";
      ip = getValues('opcUaEndpointOnlineIP') || '';
      port = getValues('opcUaEndpointOnlinePort');
       fieldsToValidate = ['opcUaEndpointOnlineIP', 'opcUaEndpointOnlinePort'];
    }
    
    const isValid = await trigger(fieldsToValidate);
    if (!isValid || !ip || !port) {
      toast.warning(`Invalid ${endpointName} configuration.`, {
        description: "Please ensure IP Address and Port are correctly filled."
      });
      setTestStates(prev => ({
        ...prev,
        [endpointType]: {
          status: 'failed',
          buttonLabel: endpointType === 'offline' ? 'Retry Test Local' : 'Retry Test Remote',
          resultMessage: 'Invalid IP/Port for test.',
          resultIcon: AlertCircle,
        }
      }));
      return;
    }

    const endpointUrl = `opc.tcp://${ip}:${port}`;

    setTestStates(prev => ({
      ...prev,
      [endpointType]: {
        status: 'testing',
        buttonLabel: 'Testing...',
        resultMessage: `Attempting connection to ${endpointUrl}...`,
        resultIcon: Loader2,
      }
    }));
    
    try {
      const testApiUrl = `/api/opcua/status?testedClientSideEndpoint=${encodeURIComponent(endpointUrl)}`;
      const response = await fetch(testApiUrl, { method: 'GET' });
      
      let newTestState: Partial<TestState>;

      if (!response.ok) {
        let errorPayload: { message: string, error?: string } = { message: `API Error: ${response.status} ${response.statusText}` };
        const errorText = await response.text(); 
        try { const errorJson = JSON.parse(errorText); if (errorJson.error || errorJson.message) { errorPayload = errorJson; } else if (errorText) { errorPayload.message += `. Details: ${errorText}`; }
        } catch (e) { if (errorText) { errorPayload.message += `. Details: ${errorText}`; } }
        throw new Error(errorPayload.error || errorPayload.message || `Request to ${testApiUrl} failed with status ${response.status}`);
      }

      const result = await response.json(); 
      if (!result || typeof result.connectionStatus === 'undefined') {
        throw new Error('Invalid response from server. Expected { connectionStatus: "online"|"offline"|"disconnected", message?: string }.');
      }
      
      const testSpecificStatus = result.connectionStatus as "offline" | "online" | "disconnected";
      const testSpecificMessage = result.message || ""; // Message from backend about this specific test.

      let isSuccessForThisTest = false;
      let uiMessage = "";
      let toastMessage = "";

      if (endpointType === "offline") {
        if (testSpecificStatus === "offline") {
          isSuccessForThisTest = true;
          uiMessage = testSpecificMessage || `Local PLC connection successful to ${endpointUrl}.`;
          toastMessage = `Local PLC Test: Successful`;
        } else if (testSpecificStatus === "online") {
          isSuccessForThisTest = false;
          uiMessage = testSpecificMessage || `Anomaly: Local PLC test (${endpointUrl}) resulted in 'online' status. Check IP.`;
          toastMessage = `Local PLC Test: Unexpected 'online' Status`;
        } else { // testSpecificStatus === "disconnected"
          isSuccessForThisTest = false;
          uiMessage = testSpecificMessage || `Failed to connect to Local PLC (${endpointUrl}).`;
          toastMessage = `Local PLC Test: Failed`;
        }
      } else if (endpointType === "online") {
        if (testSpecificStatus === "online") {
          isSuccessForThisTest = true;
          uiMessage = testSpecificMessage || `Remote Server connection successful to ${endpointUrl}.`;
          toastMessage = `Remote Server Test: Successful`;
        } else if (testSpecificStatus === "offline") {
          isSuccessForThisTest = false;
          uiMessage = testSpecificMessage || `Anomaly: Remote Server test (${endpointUrl}) resulted in 'offline' status. Check IP.`;
          toastMessage = `Remote Server Test: Unexpected 'offline' Status`;
        } else { // testSpecificStatus === "disconnected"
          isSuccessForThisTest = false;
          uiMessage = testSpecificMessage || `Failed to connect to Remote Server (${endpointUrl}).`;
          toastMessage = `Remote Server Test: Failed`;
        }
      }
      
      newTestState = {
        status: isSuccessForThisTest ? 'success' : 'failed',
        buttonLabel: endpointType === 'offline' ? (isSuccessForThisTest ? 'Test Local Again' : 'Retry Local Test') : (isSuccessForThisTest ? 'Test Remote Again' : 'Retry Remote Test'),
        resultMessage: uiMessage,
        resultIcon: isSuccessForThisTest ? CheckCircle2 : XCircle,
      };
      
      if (isSuccessForThisTest) { toast.success(toastMessage, { description: uiMessage });
      } else { toast.error(toastMessage, { description: uiMessage }); }

      setTestStates(prev => ({ ...prev, [endpointType]: { ...prev[endpointType], ...newTestState } }));

    } catch (error: any) { 
      const errorMessage = error.message || `Failed to test ${endpointName}. An unknown error occurred.`;
      setTestStates(prev => ({
        ...prev,
        [endpointType]: {
          status: 'failed',
          buttonLabel: endpointType === 'offline' ? 'Retry Local Test' : 'Retry Remote Test',
          resultMessage: errorMessage,
          resultIcon: XCircle,
        }
      }));
      toast.error(`Error Testing ${endpointName}`, { description: errorMessage });
    }
  };


  const formSubmitHandler = () => { /* Data synced reactively */ }; 

  const isOnlineTestDisabled = () => {
    const ip = getValues('opcUaEndpointOnlineIP');
    const port = getValues('opcUaEndpointOnlinePort');
    return !ip || !port || testStates.online.status === 'testing';
  };

  const isOfflineTestDisabled = () => {
    const ip = getValues('opcUaEndpointOfflineIP');
    const port = getValues('opcUaEndpointOfflinePort');
    return !ip || !port || testStates.offline.status === 'testing';
  };

  return (
    <motion.div 
      key="plant-config-step"
      variants={staggeredContainerVariants} 
      initial="hidden" 
      animate="visible" 
      exit="exit"
      className="p-4 sm:p-6"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(formSubmitHandler)} className="space-y-10">

          <motion.section variants={itemVariants}>
            <motion.div variants={sectionTitleVariants} className="flex items-center gap-3 mb-6 sm:mb-7">
              <DownloadCloud className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                Load Configuration from Template
              </h2>
            </motion.div>
            {isLoadingPlants && (
              <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin mr-3" />
                <span className="text-muted-foreground">Loading remote configurations...</span>
              </div>
            )}
            {error && !isLoadingPlants && (
               <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                 <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
                    <h3 className="font-semibold">Failed to Load Remote Configurations</h3>
                 </div>
                 <p className="text-xs mt-2 ml-8">{error}</p>
                 <p className="text-xs mt-2 ml-8">You can proceed by filling the form manually below.</p>
               </div>
            )}
            {!isLoadingPlants && !error && plants.length > 0 && (
              <FormField
                name="selectedPlant"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select a Plant Template</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined} disabled={isFetchingConfig}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plant configuration to load..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plants.map(plant => (
                          <SelectItem key={plant.path} value={plant.path}>
                            {plant.name.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This will fetch the configuration from the remote repository and pre-fill the form below.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {error && !isLoadingPlants && (
              <div className="mt-6">
                <motion.div variants={sectionTitleVariants} className="flex items-center gap-3 mb-4">
                  <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500 shrink-0" />
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                    Manual Configuration Upload
                  </h2>
                </motion.div>
                <div className="p-4 border border-dashed border-amber-500/40 rounded-lg bg-amber-500/5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Since remote templates could not be loaded, you can upload your configuration files manually.
                  </p>
                  <ManualUploadForm
                    onApply={async (contents) => {
                      setIsFetchingConfig(true);
                      toast.info("Importing manual configuration...");
                      try {
                        const importResponse = await fetch('/api/onboarding/import-plant-template', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            plantName: contents.plantName,
                            constantsContent: contents.constants,
                            dataPointsContent: contents.dataPoints,
                          })
                        });
                        if (!importResponse.ok) {
                          const errorBody = await importResponse.json();
                          throw new Error(`Failed to import configuration on server: ${errorBody.message}`);
                        }
                        toast.success("Successfully imported manual configuration.");

                        // Pre-fill form from constants file
                        const plantNameMatch = contents.constants.match(/export const PLANT_NAME\s*=\s*['"`](.*?)['"`]/);
                        const plantLocationMatch = contents.constants.match(/export const PLANT_LOCATION\s*=\s*['"`](.*?)['"`]/);
                        const newValues: Partial<PlantConfigFormData> = {};
                        if (plantNameMatch) newValues.plantName = plantNameMatch[1];
                        if (plantLocationMatch) newValues.plantLocation = plantLocationMatch[1];
                        reset(newValues);

                      } catch (e) {
                        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
                        toast.error("Failed to apply manual configuration", { description: errorMessage });
                      } finally {
                        setIsFetchingConfig(false);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </motion.section>
          
          <motion.section variants={itemVariants}>
            <motion.div variants={sectionTitleVariants} className="flex items-center gap-3 mb-6 sm:mb-7">
              <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                Plant & System Details
              </h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 sm:gap-x-6 gap-y-5 sm:gap-y-6">
              <FormFieldItem name="plantName" label="Plant Name" placeholder="e.g., Headoffice Solar Array" icon={FileText} control={form.control} />
              <FormFieldItem name="plantLocation" label="Plant Location" placeholder="e.g., Colombo, Sri Lanka" icon={MapPin} control={form.control} />
              <FormFieldItem name="plantType" label="Plant Type" placeholder="e.g., Solar Mini-Grid" icon={Tag} control={form.control} />
              <FormFieldItem name="plantCapacity" label="Plant Capacity" placeholder="e.g., 100 kW" icon={Bolt} control={form.control} />
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="pt-6 sm:pt-8 border-t border-border/60 dark:border-neutral-700/60">
            <motion.div variants={sectionTitleVariants} className="flex items-center gap-3 mb-6 sm:mb-7">
              <Server className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                OPC UA Configuration
              </h2>
            </motion.div>
            
            {/* Offline Endpoint Section */}
            <div className="mb-6 sm:mb-8 p-4 border border-border/50 dark:border-neutral-700/50 rounded-lg bg-background/30 dark:bg-neutral-800/20 shadow-sm space-y-5">
                <motion.h3 variants={itemVariants} className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <WifiOff className="h-5 w-5 mr-2.5 text-blue-500 dark:text-blue-400 shrink-0"/>
                    Local PLC Endpoint (Offline)
                </motion.h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 sm:gap-x-6 gap-y-5 sm:gap-y-6 items-end">
                    <FormFieldItem name="opcUaEndpointOfflineIP" label="IP Address" placeholder="192.168.1.10" wrapperClassName="md:col-span-2" control={form.control}/>
                    <FormFieldItem name="opcUaEndpointOfflinePort" label="Port" type="number" placeholder="4840" control={form.control} />
                </div>
                <motion.div variants={itemVariants}>
                    <FormDescription className="text-xs sm:text-sm">
                        Endpoint for the OPC UA server on your local network. This is usually required.
                    </FormDescription>
                </motion.div>
                <motion.div variants={itemVariants} className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <Button
                    type="button"
                    onClick={() => handleTestConnection('offline')}
                    disabled={isOfflineTestDisabled()}
                    size="sm"
                    variant={testStates.offline.status === 'failed' ? "destructive" : testStates.offline.status === 'success' ? "outline" : "default"}
                    className="w-full sm:w-auto"
                  >
                    {testStates.offline.status === 'testing' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {testStates.offline.buttonLabel}
                  </Button>
                  <div className="flex items-center gap-2 min-h-[24px] flex-1 sm:justify-end">
                    <AnimatePresence mode="wait">
                      {testStates.offline.resultIcon && (
                        <motion.div
                            key={`offline-icon-${testStates.offline.status}`}
                            variants={statusIconVariants}
                            initial="initial" animate="animate" exit="exit"
                        >
                            <testStates.offline.resultIcon className={cn(
                                "h-5 w-5 shrink-0",
                                testStates.offline.status === 'success' && "text-green-500",
                                testStates.offline.status === 'failed' && "text-red-500",
                                testStates.offline.status === 'testing' && "text-primary animate-spin",
                                testStates.offline.status === 'idle' && "text-muted-foreground"
                            )} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                         <motion.p
                            key={`offline-msg-${testStates.offline.resultMessage?.substring(0,30)}`}
                            variants={resultMessageVariants}
                            initial="initial" animate="animate" exit="exit"
                            className={cn(
                                "text-xs sm:text-sm leading-tight text-right sm:text-left",
                                testStates.offline.status === 'success' && "text-green-600 dark:text-green-400",
                                testStates.offline.status === 'failed' && "text-red-600 dark:text-red-400",
                                testStates.offline.status === 'idle' && "text-muted-foreground"
                            )}
                         >
                            {testStates.offline.resultMessage}
                        </motion.p>
                    </AnimatePresence>
                  </div>
                </motion.div>
            </div>

            {/* Online Endpoint Section */}
            <div className="p-4 border border-border/50 dark:border-neutral-700/50 rounded-lg bg-background/30 dark:bg-neutral-800/20 shadow-sm space-y-5">
                <motion.h3 variants={itemVariants} className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <Share2 className="h-5 w-5 mr-2.5 text-green-500 dark:text-green-400 shrink-0"/>
                    Remote Server Endpoint <span className="text-xs text-muted-foreground ml-1.5">(Optional)</span>
                </motion.h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 sm:gap-x-6 gap-y-5 sm:gap-y-6 items-end">
                    <FormFieldItem name="opcUaEndpointOnlineIP" label="IP Address" placeholder="e.g., 100.91.251.229" isOptional wrapperClassName="md:col-span-2" control={form.control} />
                    <FormFieldItem name="opcUaEndpointOnlinePort" label="Port" type="number" placeholder="4840" isOptional control={form.control} />
                </div>
                <motion.div variants={itemVariants}>
                    <FormDescription className="mt-1 text-xs sm:text-sm">
                        Publicly accessible OPC UA server, if available for remote access or primary connection.
                    </FormDescription>
                </motion.div>
                 <motion.div variants={itemVariants} className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <Button
                    type="button"
                    onClick={() => handleTestConnection('online')}
                    disabled={isOnlineTestDisabled()}
                    size="sm"
                     variant={testStates.online.status === 'failed' ? "destructive" : testStates.online.status === 'success' ? "outline" : "default"}
                    className="w-full sm:w-auto"
                  >
                    {testStates.online.status === 'testing' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {testStates.online.buttonLabel}
                  </Button>
                  <div className="flex items-center gap-2 min-h-[24px] flex-1 sm:justify-end">
                     <AnimatePresence mode="wait">
                      {testStates.online.resultIcon && (
                        <motion.div
                            key={`online-icon-${testStates.online.status}`}
                            variants={statusIconVariants}
                            initial="initial" animate="animate" exit="exit"
                        >
                            <testStates.online.resultIcon className={cn(
                                "h-5 w-5 shrink-0",
                                testStates.online.status === 'success' && "text-green-500",
                                testStates.online.status === 'failed' && "text-red-500",
                                testStates.online.status === 'testing' && "text-primary animate-spin",
                                testStates.online.status === 'idle' && "text-muted-foreground"
                            )} />
                        </motion.div>
                       )}
                    </AnimatePresence>
                     <AnimatePresence mode="wait">
                        <motion.p
                            key={`online-msg-${testStates.online.resultMessage?.substring(0,30)}`} 
                            variants={resultMessageVariants}
                            initial="initial" animate="animate" exit="exit"
                             className={cn(
                                "text-xs sm:text-sm leading-tight text-right sm:text-left",
                                testStates.online.status === 'success' && "text-green-600 dark:text-green-400",
                                testStates.online.status === 'failed' && "text-red-600 dark:text-red-400",
                                testStates.online.status === 'idle' && "text-muted-foreground"
                            )}
                        >
                            {testStates.online.resultMessage}
                        </motion.p>
                    </AnimatePresence>
                  </div>
                </motion.div>
            </div>
          </motion.section>
            
          <motion.section variants={itemVariants} className="pt-6 sm:pt-8 border-t border-border/60 dark:border-neutral-700/60">
            <motion.div variants={sectionTitleVariants} className="flex items-center gap-3 mb-5 sm:mb-6">
              <Settings2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                Application Personalization
              </h2>
            </motion.div>
            <FormFieldItem name="appName" label="Application Display Name" placeholder={`e.g., ${APP_NAME} Control Panel`} icon={Globe} isOptional control={form.control} />
             <motion.div variants={itemVariants}>
                 <FormDescription className="mt-3 text-xs sm:text-sm">
                    Customize the name displayed in the application header. Default is "{APP_NAME}".
                </FormDescription>
            </motion.div>
          </motion.section>

          <button type="submit" className="hidden" aria-hidden="true">Submit</button>
        </form>
      </Form>
    </motion.div>
  );
}

// --- Reusable FormFieldItem Component ---
import { Control } from 'react-hook-form';

interface ManualUploadFormProps {
  onApply: (contents: { plantName: string; constants: string; dataPoints: string; backup?: string }) => void;
}

function ManualUploadForm({ onApply }: ManualUploadFormProps) {
  const [plantName, setPlantName] = useState('');
  const [constantsFile, setConstantsFile] = useState<File | null>(null);
  const [dataPointsFile, setDataPointsFile] = useState<File | null>(null);
  const [isReading, setIsReading] = useState(false);

  const handleFileRead = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  };

  const handleApplyClick = async () => {
    if (!plantName || !constantsFile || !dataPointsFile) {
      toast.error("Required fields missing", { description: "Please provide a plant name and select both configuration files." });
      return;
    }
    setIsReading(true);
    try {
      const constants = await handleFileRead(constantsFile);
      const dataPoints = await handleFileRead(dataPointsFile);
      onApply({ plantName, constants, dataPoints });
    } catch (error) {
      toast.error("Error reading files", { description: (error as Error).message });
    } finally {
      setIsReading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <FormLabel htmlFor="plant-name-upload">New Plant Name</FormLabel>
        <Input id="plant-name-upload" type="text" placeholder="e.g., MyCustomPlant" value={plantName} onChange={(e) => setPlantName(e.target.value)} className="mt-1" />
        <FormDescription className="text-xs mt-1">Provide a unique name for this configuration (no spaces or special characters).</FormDescription>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormLabel htmlFor="constants-upload">constants.ts</FormLabel>
          <Input id="constants-upload" type="file" accept=".ts" onChange={(e) => setConstantsFile(e.target.files?.[0] || null)} className="mt-1" />
        </div>
        <div>
          <FormLabel htmlFor="datapoints-upload">dataPoints.ts</FormLabel>
          <Input id="datapoints-upload" type="file" accept=".ts" onChange={(e) => setDataPointsFile(e.target.files?.[0] || null)} className="mt-1" />
        </div>
      </div>
      <div className="text-right pt-2">
        <Button onClick={handleApplyClick} disabled={isReading}>
          {isReading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Apply Manual Files
        </Button>
      </div>
    </div>
  );
}


interface FormFieldItemProps {
  control: Control<PlantConfigFormData>; 
  name: keyof PlantConfigFormData;
  label: string;
  placeholder?: string;
  type?: string;
  icon?: React.ElementType;
  isOptional?: boolean;
  wrapperClassName?: string;
}

const FormFieldItem: React.FC<FormFieldItemProps> = ({ control, name, label, placeholder, type = 'text', icon: Icon, isOptional, wrapperClassName }) => {
  return (
    <motion.div variants={itemVariants} className={wrapperClassName}>
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem className="relative">
            <FormLabel className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {Icon && <Icon className="h-[1.1rem] w-[1.1rem] mr-2 text-gray-500 dark:text-gray-400 shrink-0" />}
              {label}
              {isOptional && <span className="ml-1.5 text-xs text-muted-foreground font-normal">(Optional)</span>}
            </FormLabel>
            <FormControl>
              <Input 
                type={type} 
                placeholder={placeholder} 
                {...field} 
                value={String(field.value ?? '')}
                onChange={(e) => {
                    if (type === 'number') {
                        const val = e.target.value;
                        field.onChange(val === '' ? undefined : Number(val));
                    } else {
                        field.onChange(e);
                    }
                }}
                className="bg-background/70 dark:bg-neutral-800/50 focus:bg-background dark:focus:bg-neutral-800/90"
              />
            </FormControl>
            <FormMessage className="text-xs pt-1"/>
          </FormItem>
        )}
      />
    </motion.div>
  );
};