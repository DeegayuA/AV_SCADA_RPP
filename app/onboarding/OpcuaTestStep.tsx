// components/onboarding/OpcuaTestStep.tsx
'use client';
import React, { useState, useMemo, useEffect } from 'react';
// Import 'Variants'
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, SkipForward, Server, Cloud, CheckCircle2, XCircle, Info, RefreshCw, RadioTower, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useOnboarding } from './OnboardingContext';
import { cn } from '@/lib/utils'; 

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failed';

interface EndpointTestResult {
  endpointName: string; 
  endpointUrl: string;
  status: ConnectionStatus;
  message?: string;
}

// --- Framer Motion Variants (FIXED) ---
const staggeredContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, 
      delayChildren: 0.1,
      ease: "circOut"
    },
  },
  exit: { opacity: 0, y: -15, transition: { duration: 0.25 } }
};

const itemVariants = (delay: number = 0): Variants => ({
  hidden: { opacity: 0, y: 20, filter: 'blur(3px)' },
  visible: { 
    opacity: 1, y: 0, filter: 'blur(0px)', 
    transition: { type: 'spring', stiffness: 110, damping: 16, delay, mass: 0.9 } 
  },
});

const testItemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y:10 },
    visible: { 
        opacity: 1, scale: 1, y:0,
        transition: { type: 'spring', stiffness: 150, damping: 20, duration: 0.4 } 
    },
    exit: { opacity: 0, scale: 0.95, y:-10, transition: { duration: 0.2 }}
};

const statusIconContainerVariants: Variants = {
  initial: { scale: 0.5, opacity: 0, rotate: -45 },
  animate: { scale: 1, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 12 } },
  exit: { scale: 0.5, opacity: 0, rotate: 45, transition: { duration: 0.2 } }
};

// FIX: Add 'as const' to ensure correct type inference for direct use in the 'animate' prop.
const buttonPulseAnimation = {
  scale: [1, 1.05, 1],
  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut", delay:0.5 }
} as const;


export default function OpcuaTestStep() {
  const { onboardingData, nextStep } = useOnboarding();
  const [testResults, setTestResults] = useState<EndpointTestResult[]>([]);
  
  const endpointsToTest = useMemo(() => {
    const offlineEp = onboardingData.opcUaEndpointOffline;
    const onlineEp = onboardingData.opcUaEndpointOnline;
    
    const endpoints = [];
    if (offlineEp) {
      endpoints.push({ name: "Local PLC Endpoint", id: 'offline' as const, icon: Server, url: `opc.tcp://${offlineEp}` });
    }
    if (onlineEp) {
      endpoints.push({ name: "Remote Server Endpoint", id: 'online' as const, icon: Cloud,  url: `opc.tcp://${onlineEp}` });
    }
    return endpoints;
  }, [onboardingData.opcUaEndpointOffline, onboardingData.opcUaEndpointOnline]);

  useEffect(() => {
    setTestResults(
      endpointsToTest.map(ep => ({ 
        endpointName: ep.name,
        endpointUrl: ep.url, 
        status: 'idle',
        message: 'Awaiting test initiation.'
      }))
    );
  }, [endpointsToTest]);

  const handleTestConnection = async (endpointId: 'offline' | 'online', endpointName: string, endpointUrl: string) => {
    setTestResults(prev => prev.map(r => r.endpointUrl === endpointUrl ? { ...r, status: 'testing', message: 'Verifying backend connection status...' } : r));
    
    try {
      const testApiUrl = `/api/opcua/status?testedClientSideEndpoint=${encodeURIComponent(endpointUrl)}`;
      const response = await fetch(testApiUrl, { method: 'GET' });
      
      if (!response.ok) {
        let errorPayload: { message: string, error?: string } = { message: `API Error: ${response.status} ${response.statusText}` };
        const errorText = await response.text(); 
        try { const errorJson = JSON.parse(errorText); if (errorJson.error || errorJson.message) { errorPayload = errorJson; } else if (errorText) { errorPayload.message += `. Details: ${errorText}`; }
        } catch (e) { if (errorText) { errorPayload.message += `. Details: ${errorText}`; } }
        throw new Error(errorPayload.error || errorPayload.message || `Request to ${testApiUrl} failed with status ${response.status}`);
      }

      const result = await response.json(); 
      if (!result || typeof result.connectionStatus === 'undefined') {
        throw new Error('Invalid response from server. Expected { connectionStatus: string }.');
      }

      const backendStatus = result.connectionStatus;
      let isSuccessForThisTest = false;
      let uiMessage = "";
      let toastMessage = "";

      if (backendStatus === "disconnected") {
        isSuccessForThisTest = false;
        uiMessage = `Backend reports: Currently not connected to any OPC UA endpoint.`;
        toastMessage = `OPC Test: Backend Disconnected`;
      } else if (endpointId === "offline") {
        if (backendStatus === "offline") {
          isSuccessForThisTest = true;
          uiMessage = `Connection confirmed: Backend is actively using its OFFLINE endpoint.`;
          toastMessage = `Local PLC: Test Successful`;
        } else { // backendStatus must be "online"
          isSuccessForThisTest = false;
          uiMessage = `Backend is using its ONLINE endpoint. Specific test for Local PLC failed (server prioritized online).`;
          toastMessage = `Local PLC Test: Backend Online`;
        }
      } else if (endpointId === "online") {
        if (backendStatus === "online") {
          isSuccessForThisTest = true;
          uiMessage = `Connection confirmed: Backend is actively using its ONLINE endpoint.`;
          toastMessage = `Remote Server: Test Successful`;
        } else { // backendStatus must be "offline"
          isSuccessForThisTest = false;
          uiMessage = `Backend is using its OFFLINE endpoint. Specific test for Remote Server failed (server prioritized offline or remote unavailable).`;
          toastMessage = `Remote Server Test: Backend Offline`;
        }
      } else {
        isSuccessForThisTest = false;
        uiMessage = `Unexpected backend status: '${backendStatus}'.`;
        toastMessage = `Test: Unexpected Status`;
      }
      
      setTestResults(prev => prev.map(r => r.endpointUrl === endpointUrl ? { ...r, status: isSuccessForThisTest ? 'success' : 'failed', message: uiMessage } : r));
      if (isSuccessForThisTest) { toast.success(toastMessage, { description: uiMessage });
      } else { toast.error(toastMessage, { description: uiMessage }); }

    } catch (error: any) { 
      const errorMessage = error.message || `Failed to test connection. An unknown error occurred.`;
      setTestResults(prev => prev.map(r => r.endpointUrl === endpointUrl ? { ...r, status: 'failed', message: errorMessage } : r));
      toast.error(errorMessage, { description: `Please review configuration and network.` });
    }
  };


  return (
    <motion.div 
      key="opcua-test-step-v2"
      variants={staggeredContainerVariants} 
      initial="hidden" 
      animate="visible" 
      exit="exit"
      className="space-y-6 sm:space-y-8 p-4 sm:p-6"
    >
      <motion.div variants={itemVariants(0)} className="flex items-start gap-3 sm:gap-4">
        <RadioTower className="h-7 w-7 sm:h-8 sm:w-8 text-primary mt-0.5 sm:mt-1 shrink-0 opacity-80" />
        <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-50 mb-1.5 leading-tight">
              Test OPC UA Endpoint Reachability
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
              Verify if the application backend can communicate with your configured OPC UA servers. This test reflects the backend's current global connection.
            </p>
        </div>
      </motion.div>

      <motion.div 
        variants={itemVariants(0.1)} 
        className="flex items-start gap-3 text-sm sm:text-base bg-primary/5 dark:bg-primary/10 border-l-4 border-primary text-primary-dark dark:text-primary-light p-3.5 sm:p-4 rounded-lg shadow-sm"
      >
        <Info className="h-5 w-5 mt-0.5 shrink-0 opacity-80" />
        <p><span className="font-semibold">Important:</span> A successful connection is required for reliable operation and vital for using <span className="font-semibold">AI-assisted Data Point Discovery</span> in subsequent steps.</p>
      </motion.div>
      
      {endpointsToTest.length === 0 && (
          <motion.div variants={itemVariants(0.2)} className="flex flex-col items-center justify-center text-center py-10 sm:py-14 bg-card/50 dark:bg-neutral-800/30 rounded-xl border border-dashed border-border/70 dark:border-neutral-700/50 shadow-inner">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-amber-500 dark:text-amber-400 mb-4 opacity-80" />
            <p className="text-lg font-semibold text-foreground mb-1">No Endpoints Configured</p>
            <p className="text-sm text-muted-foreground max-w-sm">
                Please return to "Plant Configuration" to define OPC UA endpoints for testing and automated discovery.
            </p>
        </motion.div>
      )}

      <div className="space-y-4 sm:space-y-5">
        {endpointsToTest.map(({ id, name, icon: EndpointIcon, url }, index) => {
          const result = testResults.find(r => r.endpointUrl === url);
          
          let statusTextColor = "text-muted-foreground";
          let statusIconElement = <Info className="h-5 w-5" />;
          let buttonLabel = `Verify ${id === 'offline' ? 'Local' : 'Remote'} Connection`;
          let buttonIcon = <RefreshCw className="h-4 w-4" />;
          let buttonVariant: "default" | "outline" | "secondary" | "destructive" = "default";
          let buttonDisabled = false;
          let showPulse = false;

          if (result?.status === 'testing') {
            statusTextColor = "text-primary dark:text-primary-light";
            statusIconElement = <Loader2 className="h-5 w-5 animate-spin" />;
            buttonLabel = "Testing...";
            buttonIcon = <Loader2 className="h-4 w-4 animate-spin" />;
            buttonVariant = "outline";
            buttonDisabled = true;
          } else if (result?.status === 'success') {
            statusTextColor = "text-green-600 dark:text-green-400";
            statusIconElement = <CheckCircle2 className="h-5 w-5" />;
            buttonLabel = "Test Again";
            buttonIcon = <RefreshCw className="h-4 w-4" />;
            buttonVariant = "secondary";
          } else if (result?.status === 'failed') {
            statusTextColor = "text-red-600 dark:text-red-400";
            statusIconElement = <XCircle className="h-5 w-5" />;
            buttonLabel = "Retry Test";
            buttonIcon = <RefreshCw className="h-4 w-4" />;
            buttonVariant = "destructive";
          } else { // idle
            showPulse = true;
          }

          return (
            <motion.div 
              key={url}
              variants={testItemVariants}
              className={cn(
                  "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl transition-all duration-300",
                  "bg-card/60 dark:bg-neutral-800/50 backdrop-blur-sm border",
                  result?.status === 'testing' ? "border-primary/40 shadow-lg shadow-primary/10" :
                  result?.status === 'success' ? "border-green-500/30 dark:border-green-400/30 shadow-md shadow-green-500/5" :
                  result?.status === 'failed' ? "border-red-500/30 dark:border-red-400/30 shadow-md shadow-red-500/5" :
                  "border-border/70 dark:border-neutral-700/60 hover:border-border dark:hover:border-neutral-600 shadow-sm hover:shadow-md"
              )}
            >
              <div className="flex-grow flex items-center gap-3.5 sm:gap-4">
                <EndpointIcon className="h-8 w-8 sm:h-9 sm:w-9 text-primary/70 dark:text-primary-light/70 shrink-0 opacity-90" />
                <div className="flex-grow">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">{name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground break-all">{url}</p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2.5 sm:w-[260px] flex-shrink-0 mt-3 sm:mt-0">
                  <div className={`flex items-center gap-2 text-xs sm:text-sm font-medium ${statusTextColor} min-h-[24px] w-full sm:w-auto sm:justify-end`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${result?.status || 'idle'}-icon`}
                            variants={statusIconContainerVariants}
                            initial="initial" animate="animate" exit="exit"
                        >
                            {statusIconElement}
                        </motion.div>
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={result?.message || 'initial'}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease:'circOut' } }}
                            exit={{ opacity: 0, x: 10, transition: { duration: 0.2, ease: 'circIn' } }}
                            className="text-right sm:text-left leading-tight"
                        >
                            {result?.message}
                        </motion.span>
                    </AnimatePresence>
                </div>
                <motion.div 
                  className="w-full sm:w-auto"
                  // animate={showPulse && !buttonDisabled ? buttonPulseAnimation : {}}
                  whileHover={!buttonDisabled ? {scale:1.03} : {}}
                  whileTap={!buttonDisabled ? {scale:0.97} : {}}
                >
                    <Button 
                      size="sm"
                      onClick={() => handleTestConnection(id as 'offline' | 'online', name, url)} 
                      disabled={buttonDisabled}
                      variant={buttonVariant}
                      className={cn("w-full sm:w-auto min-w-[150px] transition-all duration-200 group shadow-sm", {
                        "hover:shadow-md": !buttonDisabled,
                        "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70": buttonVariant === 'default' && !buttonDisabled,
                      })}
                    >
                      {React.cloneElement(buttonIcon, {className: cn(buttonIcon.props.className, "mr-2 h-4 w-4", {"group-hover:rotate-[15deg] transition-transform duration-300": !buttonDisabled && (result?.status === 'idle' || result?.status === 'success' || result?.status === 'failed')})} )}
                      {buttonLabel}
                    </Button>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div 
        variants={itemVariants(0.3 + endpointsToTest.length * 0.05)} 
        className="pt-4 sm:pt-6 flex justify-end"
      >
        <motion.div whileHover={{scale:1.03}} whileTap={{scale:0.97}}>
            <Button variant="outline" onClick={nextStep} className="group min-w-[180px] text-sm font-medium shadow-sm hover:shadow-md transition-shadow duration-200 border-border/80 dark:border-neutral-700/80 hover:border-border dark:hover:border-neutral-600">
                <SkipForward className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                Skip and Proceed
            </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}