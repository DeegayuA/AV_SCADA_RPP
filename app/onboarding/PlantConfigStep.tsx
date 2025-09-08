// components/onboarding/PlantConfigStep.tsx
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
// FIX: Import 'Variants'
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Building2, MapPin, Tag, Bolt, Globe, Settings2, Share2, Server, WifiOff, FileText,
  Loader2, CheckCircle2, XCircle, RefreshCw, AlertCircle, ShieldQuestion, Activity, Cpu,
} from 'lucide-react';
import { toast } from 'sonner';

import { plantConfigSchema, PlantConfigFormData } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
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
  const { onboardingData, updateOnboardingData } = useOnboarding();

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
      snap7PlcIP: onboardingData.snap7PlcIP || '192.168.1.100',
      snap7PlcRack: onboardingData.snap7PlcRack || 0,
      snap7PlcSlot: onboardingData.snap7PlcSlot || 2,
      selectedProtocol: onboardingData.selectedProtocol || 'opcua',
      appName: onboardingData.appName || APP_NAME,
    },
  });

  const { getValues, formState, watch, trigger } = form;
  const selectedProtocol = watch('selectedProtocol');

  const [testStates, setTestStates] = useState<Record<'offline' | 'online' | 'snap7' | 'snap7Remote', TestState>>({
    offline: { status: 'idle', buttonLabel: 'Test Local PLC', resultMessage: 'Awaiting test for local endpoint.' , resultIcon: ShieldQuestion },
    online: { status: 'idle', buttonLabel: 'Test Remote Server', resultMessage: 'Awaiting test for remote endpoint (optional).', resultIcon: ShieldQuestion },
    snap7: { status: 'idle', buttonLabel: 'Test PLC Connection', resultMessage: 'Awaiting test for Siemens PLC connection.', resultIcon: ShieldQuestion },
    snap7Remote: { status: 'idle', buttonLabel: 'Test Remote PLC', resultMessage: 'Awaiting test for remote Snap7 endpoint (optional).', resultIcon: ShieldQuestion },
  });


  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name?.startsWith('opcUaEndpointOffline')) {
        setTestStates(prev => ({ ...prev, offline: { status: 'idle', buttonLabel: 'Test Local PLC', resultMessage: 'Config changed. Re-test needed.', resultIcon: ShieldQuestion }}));
      }
      if (name?.startsWith('opcUaEndpointOnline')) {
         setTestStates(prev => ({ ...prev, online: { status: 'idle', buttonLabel: 'Test Remote Server', resultMessage: 'Config changed. Re-test needed.', resultIcon: ShieldQuestion }}));
      }
      if (name?.startsWith('snap7') && !name.startsWith('snap7Remote')) {
        setTestStates(prev => ({ ...prev, snap7: { status: 'idle', buttonLabel: 'Test PLC Connection', resultMessage: 'Config changed. Re-test needed.', resultIcon: ShieldQuestion }}));
      }
      if (name?.startsWith('snap7Remote')) {
        setTestStates(prev => ({ ...prev, snap7Remote: { status: 'idle', buttonLabel: 'Test Remote PLC', resultMessage: 'Config changed. Re-test needed.', resultIcon: ShieldQuestion }}));
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
          snap7RemoteIP: currentData.snap7RemoteIP,
          snap7RemotePort: currentData.snap7RemotePort,
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
        snap7RemoteIP: initialData.snap7RemoteIP,
        snap7RemotePort: initialData.snap7RemotePort,
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

  const handleTestSnap7Connection = async (endpointType: 'local' | 'remote') => {
    let ip: string | undefined, rack: number | undefined, slot: number | undefined, port: number | undefined;
    let fieldsToValidate: (keyof PlantConfigFormData)[];
    const stateKey = endpointType === 'local' ? 'snap7' : 'snap7Remote';

    if (endpointType === 'local') {
      ip = getValues('snap7PlcIP');
      rack = getValues('snap7PlcRack');
      slot = getValues('snap7PlcSlot');
      fieldsToValidate = ['snap7PlcIP', 'snap7PlcRack', 'snap7PlcSlot'];
    } else {
      ip = getValues('snap7RemoteIP');
      port = getValues('snap7RemotePort');
      // Assuming rack and slot are not needed for remote, or are standard.
      // If they are needed, they should be added to the form.
      rack = 0; 
      slot = 1;
      fieldsToValidate = ['snap7RemoteIP', 'snap7RemotePort'];
    }
    
    const isValid = await trigger(fieldsToValidate);
    
    if (!isValid || !ip || (endpointType === 'local' && (rack === undefined || slot === undefined)) || (endpointType === 'remote' && port === undefined)) {
      toast.warning('Invalid Snap7 PLC configuration.', {
        description: "Please ensure all required fields are correctly filled."
      });
      setTestStates(prev => ({
        ...prev,
        [stateKey]: {
          status: 'failed',
          buttonLabel: 'Retry Test',
          resultMessage: 'Invalid configuration for test.',
          resultIcon: AlertCircle,
        }
      }));
      return;
    }

    setTestStates(prev => {
      const newState = { ...prev };
      newState[stateKey] = {
        status: 'testing',
        buttonLabel: 'Testing...',
        resultMessage: `Attempting connection to PLC at ${ip}...`,
        resultIcon: Loader2,
      };
      return newState;
    });
    
    try {
      const params = new URLSearchParams({
        ip: ip,
        rack: String(rack),
        slot: String(slot),
      });
      if (endpointType === 'remote' && port) {
        params.append('port', String(port));
      }
      const testApiUrl = `/api/snap7/status?${params.toString()}`;
      const response = await fetch(testApiUrl, { method: 'GET' });
      
      let newTestState: Partial<TestState>;

      if (!response.ok) {
        let errorPayload: { message: string, error?: string } = { message: `API Error: ${response.status} ${response.statusText}` };
        const errorText = await response.text(); 
        try { 
          const errorJson = JSON.parse(errorText); 
          if (errorJson.error || errorJson.message) { 
            errorPayload = errorJson; 
          } else if (errorText) { 
            errorPayload.message += `. Details: ${errorText}`; 
          }
        } catch (e) { 
          if (errorText) { 
            errorPayload.message += `. Details: ${errorText}`; 
          } 
        }
        throw new Error(errorPayload.error || errorPayload.message || `Request to ${testApiUrl} failed with status ${response.status}`);
      }

      const result = await response.json(); 
      if (!result || typeof result.connected === 'undefined') {
        throw new Error('Invalid response from server. Expected { connected: boolean, message?: string }.');
      }
      
      const isConnected = result.connected;
      const message = result.message || "";
      const isDemo = result.demo || false;

      let uiMessage = "";
      let toastMessage = "";

      if (isConnected) {
        uiMessage = isDemo 
          ? `Demo mode: Simulated PLC connection successful at ${ip}.`
          : message || `PLC connection successful at ${ip} (Rack: ${rack}, Slot: ${slot}).`;
        toastMessage = `Snap7 PLC Test: ${isDemo ? 'Demo Mode' : 'Successful'}`;
      } else {
        uiMessage = message || `Failed to connect to PLC at ${ip} (Rack: ${rack}, Slot: ${slot}).`;
        toastMessage = `Snap7 PLC Test: Failed`;
      }
      
      newTestState = {
        status: isConnected ? 'success' : 'failed',
        buttonLabel: isConnected ? 'Test PLC Again' : 'Retry PLC Test',
        resultMessage: uiMessage,
        resultIcon: isConnected ? CheckCircle2 : XCircle,
      };
      
      if (isConnected) { 
        toast.success(toastMessage, { description: uiMessage });
      } else { 
        toast.error(toastMessage, { description: uiMessage }); 
      }

      setTestStates(prev => ({ ...prev, [stateKey]: { ...prev[stateKey], ...newTestState } }));

    } catch (error: any) { 
      const errorMessage = error.message || `Failed to test Snap7 PLC connection. An unknown error occurred.`;
      setTestStates(prev => ({
        ...prev,
        [stateKey]: {
          status: 'failed',
          buttonLabel: 'Retry Test',
          resultMessage: errorMessage,
          resultIcon: XCircle,
        }
      }));
      toast.error(`Error Testing Snap7 PLC`, { description: errorMessage });
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

  const isSnap7TestDisabled = () => {
    const ip = getValues('snap7PlcIP');
    const rack = getValues('snap7PlcRack');
    const slot = getValues('snap7PlcSlot');
    return !ip || rack === undefined || slot === undefined || testStates.snap7.status === 'testing';
  };

  const isSnap7RemoteTestDisabled = () => {
    const ip = getValues('snap7RemoteIP');
    const port = getValues('snap7RemotePort');
    return !ip || !port || testStates.snap7Remote?.status === 'testing';
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

          {/* Protocol Selector (OPC UA vs Snap7) */}
          <motion.section variants={itemVariants} className="pt-6 sm:pt-8 border-t border-border/60 dark:border-neutral-700/60">
            <motion.div variants={sectionTitleVariants} className="flex items-center gap-3 mb-4">
              <Settings2 className="h-5 w-5 text-primary shrink-0" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">Choose Protocol</h3>
            </motion.div>
            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                variant={selectedProtocol === 'opcua' ? 'default' : 'outline'}
                onClick={() => form.setValue('selectedProtocol', 'opcua', { shouldDirty: true, shouldTouch: true })}
                className="min-w-[110px]"
              >
                OPC UA
              </Button>
              <Button
                type="button"
                variant={selectedProtocol === 'snap7' ? 'default' : 'outline'}
                onClick={() => form.setValue('selectedProtocol', 'snap7', { shouldDirty: true, shouldTouch: true })}
                className="min-w-[110px]"
              >
                Snap7
              </Button>
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className={cn("pt-6 sm:pt-8 border-t border-border/60 dark:border-neutral-700/60", selectedProtocol !== 'opcua' && 'hidden')}>
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

          <motion.section variants={itemVariants} className={cn("pt-6 sm:pt-8 border-t border-border/60 dark:border-neutral-700/60", selectedProtocol !== 'snap7' && 'hidden')}>
            <motion.div variants={sectionTitleVariants} className="flex items-center gap-3 mb-6 sm:mb-7">
              <Cpu className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                Snap7 Configuration
              </h2>
            </motion.div>

            {/* Snap7 Local Endpoint Section */}
            <div className="mb-6 sm:mb-8 p-4 border border-border/50 dark:border-neutral-700/50 rounded-lg bg-background/30 dark:bg-neutral-800/20 shadow-sm space-y-5">
                <motion.h3 variants={itemVariants} className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <WifiOff className="h-5 w-5 mr-2.5 text-blue-500 dark:text-blue-400 shrink-0"/>
                    Local PLC Endpoint (Offline)
                </motion.h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 sm:gap-x-6 gap-y-5 sm:gap-y-6 items-end">
                    <FormFieldItem name="snap7PlcIP" label="IP Address" placeholder="192.168.1.100" wrapperClassName="md:col-span-1" control={form.control}/>
                    <FormFieldItem name="snap7PlcRack" label="Rack" type="number" placeholder="0" control={form.control} />
                    <FormFieldItem name="snap7PlcSlot" label="Slot" type="number" placeholder="2" control={form.control} />
                </div>
                <motion.div variants={itemVariants}>
                    <FormDescription className="text-xs sm:text-sm">
                        Endpoint for the Siemens S7 PLC on your local network.
                    </FormDescription>
                </motion.div>
                <motion.div variants={itemVariants} className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <Button
                    type="button"
                    onClick={() => handleTestSnap7Connection('local')}
                    disabled={isSnap7TestDisabled()}
                    size="sm"
                    variant={testStates.snap7.status === 'failed' ? "destructive" : testStates.snap7.status === 'success' ? "outline" : "default"}
                    className="w-full sm:w-auto"
                  >
                    {testStates.snap7.status === 'testing' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {testStates.snap7.buttonLabel}
                  </Button>
                  <div className="flex items-center gap-2 min-h-[24px] flex-1 sm:justify-end">
                    <AnimatePresence mode="wait">
                      {testStates.snap7.resultIcon && (
                        <motion.div
                            key={`snap7-icon-${testStates.snap7.status}`}
                            variants={statusIconVariants}
                            initial="initial" animate="animate" exit="exit"
                        >
                            <testStates.snap7.resultIcon className={cn(
                                "h-5 w-5 shrink-0",
                                testStates.snap7.status === 'success' && "text-green-500",
                                testStates.snap7.status === 'failed' && "text-red-500",
                                testStates.snap7.status === 'testing' && "text-primary animate-spin",
                                testStates.snap7.status === 'idle' && "text-muted-foreground"
                            )} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                         <motion.p
                            key={`snap7-msg-${testStates.snap7.resultMessage?.substring(0,30)}`}
                            variants={resultMessageVariants}
                            initial="initial" animate="animate" exit="exit"
                            className={cn(
                                "text-xs sm:text-sm leading-tight text-right sm:text-left",
                                testStates.snap7.status === 'success' && "text-green-600 dark:text-green-400",
                                testStates.snap7.status === 'failed' && "text-red-600 dark:text-red-400",
                                testStates.snap7.status === 'idle' && "text-muted-foreground"
                            )}
                         >
                            {testStates.snap7.resultMessage}
                        </motion.p>
                    </AnimatePresence>
                  </div>
                </motion.div>
            </div>

            {/* Snap7 Remote Endpoint Section */}
            <div className="p-4 border border-border/50 dark:border-neutral-700/50 rounded-lg bg-background/30 dark:bg-neutral-800/20 shadow-sm space-y-5">
              <motion.h3 variants={itemVariants} className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <Share2 className="h-5 w-5 mr-2.5 text-green-500 dark:text-green-400 shrink-0"/>
                Remote PLC Endpoint <span className="text-xs text-muted-foreground ml-1.5">(Optional)</span>
              </motion.h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 sm:gap-x-6 gap-y-5 sm:gap-y-6 items-end">
                <FormFieldItem name="snap7RemoteIP" label="IP Address" placeholder="e.g., 100.91.251.229" isOptional wrapperClassName="md:col-span-2" control={form.control} />
                <FormFieldItem name="snap7RemotePort" label="Port" type="number" placeholder="102" isOptional control={form.control} />
              </div>
              <motion.div variants={itemVariants}>
                <FormDescription className="mt-1 text-xs sm:text-sm">
                  Publicly accessible Snap7 PLC endpoint, if available for remote access or primary connection.
                </FormDescription>
              </motion.div>
              <motion.div variants={itemVariants} className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <Button
                  type="button"
                  onClick={() => handleTestSnap7Connection('remote')}
                  disabled={isSnap7RemoteTestDisabled()}
                  size="sm"
                  variant={testStates.snap7Remote?.status === 'failed' ? "destructive" : testStates.snap7Remote?.status === 'success' ? "outline" : "default"}
                  className="w-full sm:w-auto"
                >
                  {testStates.snap7Remote?.status === 'testing' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {testStates.snap7Remote?.buttonLabel || 'Test Remote PLC'}
                </Button>
                <div className="flex items-center gap-2 min-h-[24px] flex-1 sm:justify-end">
                  <AnimatePresence mode="wait">
                    {testStates.snap7Remote.resultIcon && (
                        <motion.div
                            key={`snap7-remote-icon-${testStates.snap7Remote.status}`}
                            variants={statusIconVariants}
                            initial="initial" animate="animate" exit="exit"
                        >
                            <testStates.snap7Remote.resultIcon className={cn(
                                "h-5 w-5 shrink-0",
                                {
                                  "text-green-500": testStates.snap7Remote.status === 'success',
                                  "text-red-500": testStates.snap7Remote.status === 'failed',
                                  "text-primary animate-spin": testStates.snap7Remote.status === 'testing',
                                  "text-muted-foreground": testStates.snap7Remote.status === 'idle'
                                }
                            )} />
                        </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence mode="wait">
                    <motion.p
                        key={`snap7-remote-msg-${testStates.snap7Remote.resultMessage?.substring(0,30)}`}
                        variants={resultMessageVariants}
                        initial="initial" animate="animate" exit="exit"
                        className={cn(
                            "text-xs sm:text-sm leading-tight text-right sm:text-left",
                            {
                              "text-green-600 dark:text-green-400": testStates.snap7Remote.status === 'success',
                              "text-red-600 dark:text-red-400": testStates.snap7Remote.status === 'failed',
                              "text-muted-foreground": testStates.snap7Remote.status === 'idle'
                            }
                        )}
                        >
                        {testStates.snap7Remote.resultMessage}
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
                value={field.value ?? ''}
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
