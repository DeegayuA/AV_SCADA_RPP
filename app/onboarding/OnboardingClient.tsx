// app/onboarding/OnboardingClient.tsx (or page.tsx)
'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, CheckCircle, XOctagon, Sparkles, UserCog, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { isOnboardingComplete, clearOnboardingData as clearIdbOnboardingDataOnly } from '@/lib/idb-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { APP_NAME } from '@/config/constants';
import { useAppStore } from '@/stores/appStore';
import { User, UserRole } from '@/types/auth'; // Assuming User type is imported or define it based on your store
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import { OnboardingProvider, useOnboarding, OnboardingContextType, OnboardingStep } from './OnboardingContext';
import WelcomeStep from './WelcomeStep';
import PlantConfigStep from './PlantConfigStep';
import DataPointConfigStep from './DataPointConfigStep';
import OpcuaTestStep from './OpcuaTestStep';
import DatapointDiscoveryStep from './DatapointDiscoveryStep';
import GeminiKeyConfigStep from './GeminiKeyConfigStep'; // New Step
import ReviewStep from './ReviewStep';

// Animation variants (ensure itemVariants is defined before SuccessRedirector if used)
const pageTransitionVariants = { /* ... same ... */
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: "anticipate" } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }
};
const panelVariants = { /* ... same ... */
    initial: { opacity: 0, y: 30, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 25, delay: 0.1 } },
    exit: { opacity: 0, y: 20, scale: 0.98, transition: { duration: 0.3 } }
};
const itemVariantsStagger = { /* ... same ... */
    initial: { opacity: 0, y: 15 },
    animate: { 
        opacity: 1, y: 0, 
        transition: { 
            type: "spring", stiffness: 150, damping: 18, 
            staggerChildren: 0.07,
            delayChildren: 0.1  
        } 
    },
};
const itemVariants = { /* ... same ... */
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 18 } },
};
const iconPulseVariants = { /* ... same ... */
    pulse: { scale: [1, 1.15, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }
};

// --- OnboardingProgressBarInternal (Internalized) ---
// ... (Existing component code remains the same)
interface OnboardingProgressBarInternalProps {
  currentStep: number; // 0-indexed
  totalSteps: number;
  stepNames: string[];
}
const OnboardingProgressBarInternal: React.FC<OnboardingProgressBarInternalProps> = React.memo(({ currentStep, totalSteps, stepNames }) => {
  const progress = currentStep < totalSteps ? ((currentStep + 1) / totalSteps) * 100 : 100;
  const currentStepName = stepNames[currentStep] || "Finalizing";
  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-1.5">
          <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-medium text-primary">
                  Step {currentStep + 1} of {totalSteps}: <span className="font-semibold">{currentStepName}</span>
              </p>
              <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </div>
        <Progress value={progress} className="w-full h-2 [&>*]:bg-gradient-to-r [&>*]:from-primary [&>*]:to-primary/70 transition-all duration-300 ease-out" />
      </div>
    </TooltipProvider>
  );
});
OnboardingProgressBarInternal.displayName = "OnboardingProgressBarInternal";

// --- OnboardingNavigationInternal (Internalized & UPDATED) ---
// ... (Existing component code remains the same)
interface OnboardingNavigationInternalProps {
  onNext: () => void;
  onPrev: () => void;
  currentStep: number; // 0-indexed
  totalSteps: number;
  isLoading?: boolean;
}
const OnboardingNavigationInternal: React.FC<OnboardingNavigationInternalProps> = React.memo(({ onNext, onPrev, currentStep, totalSteps, isLoading }) => {
  const isFirstStep = currentStep === 0;
  const isLastFunctionalStep = currentStep === totalSteps - 1;

  const buttonVariants = {
    hover: { scale: 1.03, transition: { type: "spring", stiffness: 400, damping: 15 } },
    tap: { scale: 0.97 }
  };

  return (
    <div className="flex w-full justify-between items-center gap-3 sm:gap-4"> {/* Corrected styling */}
      <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={isFirstStep || isLoading}
          className="px-4 py-2 text-sm sm:min-w-[120px] font-medium"
          aria-label="Previous step"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2" /> Previous
        </Button>
      </motion.div>
      {!isFirstStep && (
        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            onClick={onNext}
            disabled={isLoading}
            className="px-4 py-2 text-sm sm:min-w-[120px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg"
            aria-label={isLastFunctionalStep ? "Finish and save configuration" : "Next step"}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-1.5 sm:mr-2" />}
            {isLastFunctionalStep ? "Finish & Save" : "Next"}
            {!isLoading && !isLastFunctionalStep && <ArrowRight className="h-4 w-4 ml-1.5 sm:ml-2" />}
          </Button>
        </motion.div>
      )}
    </div>
  );
});
OnboardingNavigationInternal.displayName = "OnboardingNavigationInternal";

// --- NEW COMPONENT: SuccessRedirector ---
interface SuccessRedirectorProps {
  currentUser: User | null; // Or: typeof useAppStore extends (selector: (state: any) => infer R) => R ? ReturnType<typeof useAppStore(state => state.currentUser)> : any;
  redirectDelay?: number;
}

const SuccessRedirector: React.FC<SuccessRedirectorProps> = React.memo(({ currentUser, redirectDelay = 3500 }) => {
    const router = useRouter();
    
    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace(currentUser?.redirectPath || '/dashboard');
        }, redirectDelay);
        return () => clearTimeout(timer);
    }, [router, currentUser, redirectDelay]); // Dependencies

    return (
        <motion.div variants={itemVariants} className="mt-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
        </motion.div>
    );
});
SuccessRedirector.displayName = "SuccessRedirector";


// --- OnboardingPanelInternalContent ---
// ... (Existing component code remains the same)
const OnboardingPanelInternalContent: React.FC = React.memo(() => {
    const context = useOnboarding();
    if (!context) throw new Error("useOnboarding must be used within OnboardingProvider");
    const { currentStep, completeOnboarding, nextStep, prevStep, isLoading } = context as Required<OnboardingContextType>;
    
    const [direction, setDirection] = useState(1);

    const stepsConfig = [
        { component: <WelcomeStep key="welcome" />, name: "Welcome" },
        { component: <GeminiKeyConfigStep key="gemini_key" />, name: "Gemini API Key" }, // New Step
        { component: <PlantConfigStep key="plant" />, name: "Plant Setup" },
        { component: <DataPointConfigStep key="datapoints_manual" />, name: "Manual Data Points" },
        { component: <DatapointDiscoveryStep key="datapoints_auto" />, name: "Auto Discover Points" },
        { component: <OpcuaTestStep key="opcua" />, name: "OPC UA Test" },
        { component: <ReviewStep key="review" />, name: "Review & Finalize" },
    ];

    const stepSlideVariants = {
        hidden: (dir: number) => ({ opacity: 0, x: dir > 0 ? "30px" : "-30px", scale: 0.99, filter: "blur(2px)" }),
        visible: { opacity: 1, x: "0px", scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 260, damping: 28 } },
        exit: (dir: number) => ({ opacity: 0, x: dir < 0 ? "30px" : "-30px", scale: 0.99, filter: "blur(2px)", transition: { type: "tween", duration: 0.15, ease:"easeIn" } }),
    };

    const handleNext = useCallback(async () => {
        setDirection(1);
        if (currentStep === stepsConfig.length - 1) {
            await completeOnboarding();
        } else if (nextStep) {
            nextStep();
        }
    }, [currentStep, completeOnboarding, nextStep, stepsConfig.length]);

    const handlePrev = useCallback(() => {
        setDirection(-1);
        if (prevStep) {
            prevStep();
        }
    }, [prevStep]);


    return (
        <>
            <VisuallyHidden><h2>Onboarding Setup Process for {APP_NAME}</h2></VisuallyHidden>
            <CardHeader className="p-4 sm:p-5 border-b sticky top-0 z-10 bg-card/80 backdrop-blur-sm rounded-t-xl">
                <div className="flex items-center space-x-3">
                    <motion.div variants={iconPulseVariants} animate="pulse">
                        <Sparkles className="h-7 w-7 text-primary shrink-0" />
                    </motion.div>
                    <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground truncate" id="onboarding-panel-header">
                        Setup {APP_NAME}
                    </CardTitle>
                </div>
            </CardHeader>

            {currentStep < stepsConfig.length && (
                <CardContent className="p-0 border-b">
                   <div className="px-4 sm:px-6 py-3">
                    <OnboardingProgressBarInternal currentStep={currentStep} totalSteps={stepsConfig.length} stepNames={stepsConfig.map(s=>s.name)} />
                   </div>
                </CardContent>
            )}

            <CardContent className="flex-grow overflow-y-auto p-4 sm:p-6 relative min-h-[350px] sm:min-h-[450px]">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentStep} 
                        custom={direction}
                        variants={stepSlideVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full h-full"
                    >
                        {stepsConfig[currentStep]?.component}
                    </motion.div>
                </AnimatePresence>
            </CardContent>

            {currentStep < stepsConfig.length && (
                 <CardFooter className="p-4 sm:p-5 border-t sticky bottom-0 z-10 bg-card/80 backdrop-blur-sm rounded-b-xl">
                    <OnboardingNavigationInternal 
                        onNext={handleNext} 
                        onPrev={handlePrev} 
                        currentStep={currentStep} 
                        totalSteps={stepsConfig.length} 
                        isLoading={isLoading} 
                    />
                </CardFooter>
            )}
        </>
    );
});
OnboardingPanelInternalContent.displayName = 'OnboardingPanelInternalContent';


// --- Main OnboardingPageContentInternal ---
const OnboardingPageContentInternal: React.FC = () => {
    const context = useOnboarding();
    if (!context) throw new Error("OnboardingPageContentInternal must be used within OnboardingProvider");
    const { currentStep, resetOnboardingData, saveStatus, goToStep, isLoading } = context as Required<OnboardingContextType>;
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const storeHasHydrated = useAppStore.persist.hasHydrated();
    const currentUserFromStore = useAppStore((state) => state.currentUser);

    const [pageState, setPageState] = useState<'loading' | 'auth_required' | 'admin_setup_pending' | 'onboarding_active' | 'finalizing' | 'error_state'>('loading');
    const [hasSyncedUrlToContext, setHasSyncedUrlToContext] = useState(false);

    const totalFunctionalSteps = 7; // Updated total steps

    useEffect(() => {
        if (!storeHasHydrated) {
            console.log("[OnboardingPage] Waiting for Zustand hydration...");
            setPageState('loading');
            return;
        }

        let isMounted = true;
        setPageState('loading');

        const performChecks = async () => {
            try {
                const idbOnboardingCompleted = await isOnboardingComplete();
                if (!isMounted) return;

                const user = currentUserFromStore;
                const wantsReset = searchParams.get('reset') === 'true';

                if (!user || user.email === 'guest@example.com') {
                    setPageState('auth_required');
                    toast.error("Authentication Required", { description: "Please log in.", duration: 5000 });
                    router.replace('/login');
                    return;
                }

                if (user.role === UserRole.ADMIN) {
                    if (wantsReset) {
                        if (idbOnboardingCompleted) await clearIdbOnboardingDataOnly();
                        if (!isMounted) return;
                        await resetOnboardingData();
                        const newParams = new URLSearchParams(searchParams.toString());
                        newParams.delete('reset');
                        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
                        setPageState('onboarding_active');
                        setHasSyncedUrlToContext(true); 
                    } else if (!idbOnboardingCompleted) {
                        setPageState('onboarding_active');
                    } else {
                        toast.info("Setup Complete", { description: "Redirecting to dashboard.", duration: 3000 });
                        router.replace(user.redirectPath || '/dashboard');
                    }
                } else { 
                    if (!idbOnboardingCompleted) {
                        setPageState('admin_setup_pending');
                    } else {
                        toast.info("Welcome!", { description: "Configuration is complete.", duration: 3000 });
                        router.replace(user.redirectPath || '/dashboard');
                    }
                }
            } catch (error) {
                console.error("[OnboardingPage] Error during initial checks:", error);
                if (isMounted) setPageState('error_state');
                toast.error("Initialization Error", { description: "Could not check status." });
            }
        };

        performChecks();
        return () => { isMounted = false; };
    }, [storeHasHydrated, currentUserFromStore, router, resetOnboardingData, searchParams, pathname]); 

    useEffect(() => {
        if (pageState !== 'onboarding_active' && pageState !== 'finalizing') return;
        if (!goToStep) return; 

        const stepFromUrlStr = searchParams.get('step');
        const stepFromUrl = stepFromUrlStr ? parseInt(stepFromUrlStr, 10) : null;

        if (stepFromUrl && stepFromUrl >= 1 && stepFromUrl <= totalFunctionalSteps && !hasSyncedUrlToContext) {
            const contextEquivalentStep = stepFromUrl - 1 as OnboardingStep;
            if (currentStep !== contextEquivalentStep) {
                console.log(`[SYNC] URL (${stepFromUrl}) to Context (${contextEquivalentStep}). Current context: ${currentStep}`);
                goToStep(contextEquivalentStep);
            }
            setHasSyncedUrlToContext(true); 
            return; 
        }
        
        if (hasSyncedUrlToContext && currentStep < totalFunctionalSteps) {
            const contextStepForUrl = currentStep + 1;
            if (contextStepForUrl !== stepFromUrl) {
                console.log(`[SYNC] Context (${currentStep}) to URL (${contextStepForUrl}). Current URL step: ${stepFromUrl}`);
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.set('step', contextStepForUrl.toString());
                const currentHref = window.location.pathname + window.location.search;
                const newHref = `${pathname}?${newParams.toString()}`;
                if (currentHref !== newHref) {
                     router.replace(newHref, { scroll: false });
                }
            }
        }

    }, [pageState, currentStep, searchParams, pathname, router, goToStep, totalFunctionalSteps, hasSyncedUrlToContext]);

    useEffect(() => {
        if (pageState === 'onboarding_active' && currentStep >= totalFunctionalSteps) {
            setPageState('finalizing');
        } else if (pageState === 'finalizing' && currentStep < totalFunctionalSteps) {
            setPageState('onboarding_active');
        }
    }, [currentStep, pageState, totalFunctionalSteps]);


    return (
        <AnimatePresence mode="wait">
            {pageState === 'loading' && (
                <motion.div key="loading" {...pageTransitionVariants} className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-neutral-900 text-slate-200 z-[100]"
                    variants={itemVariantsStagger} initial="initial" animate="animate">
                    <motion.div variants={itemVariants}><Loader2 className="h-16 w-16 text-primary animate-spin mb-6" /></motion.div>
                    <motion.p variants={itemVariants} className="text-xl font-medium text-slate-300">Initializing Setup...</motion.p>
                    <motion.p variants={itemVariants} className="text-sm text-slate-400 mt-2">Verifying your session and configuration.</motion.p>
                </motion.div>
            )}
            {pageState === 'admin_setup_pending' && ( 
                <motion.div key="admin_pending" {...pageTransitionVariants} className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-gray-900 text-center p-6 z-[90]"
                    variants={itemVariantsStagger} initial="initial" animate="animate">
                    <motion.div variants={itemVariants}><UserCog className="h-20 w-20 text-amber-500 dark:text-amber-400 mx-auto mb-6 opacity-80" /></motion.div>
                    <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-3">Administrator Setup Pending</motion.h1>
                    <motion.p variants={itemVariants} className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
                        The initial configuration for {APP_NAME} needs to be performed by an administrator. Please contact them to complete this process.
                    </motion.p>
                    <motion.div variants={itemVariants}><Button onClick={() => router.push('/login')} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg px-8 py-3 text-base">Go to Login</Button></motion.div>
                </motion.div>
            )}
            {pageState === 'finalizing' && (
                 <motion.div key="finalizing" {...pageTransitionVariants} className="fixed inset-0 flex flex-col items-center justify-center text-center p-6 bg-background z-[100]"
                    variants={itemVariantsStagger} initial="initial" animate="animate"> {/* This variants is for the overall div, which is fine */}
                    <motion.div variants={itemVariants} className="mb-8">
                        {saveStatus === 'saving' && isLoading && <Loader2 className="h-20 w-20 animate-spin text-primary" />}
                        {saveStatus === 'success' && !isLoading && <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 12, delay:0.1 }}><CheckCircle className="h-20 w-20 text-green-500" /></motion.div>}
                        {saveStatus === 'error' && !isLoading && <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}><XOctagon className="h-20 w-20 text-destructive" /></motion.div>}
                    </motion.div>
                    <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                        {saveStatus === 'saving' && isLoading && "Finalizing Setup..."}
                        {saveStatus === 'success' && !isLoading && "Configuration Complete!"}
                        {saveStatus === 'error' && !isLoading && "Configuration Error"}
                    </motion.h2>
                    <motion.p variants={itemVariants} className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
                        {saveStatus === 'saving' && isLoading && `Saving your settings for ${APP_NAME}. Please wait a moment.`}
                        {saveStatus === 'success' && !isLoading && `${APP_NAME} is now ready. You'll be redirected shortly.`}
                        {saveStatus === 'error' && !isLoading && "Something went wrong while saving. Please review your settings or contact support."}
                    </motion.p>
                    {/* MODIFIED SECTION: Use the new SuccessRedirector component */}
                    {saveStatus === 'success' && !isLoading && (
                        <SuccessRedirector currentUser={currentUserFromStore} />
                    )}
                    {saveStatus === 'error' && !isLoading && goToStep && (
                        <motion.div variants={itemVariants} className="mt-8 flex gap-3">
                            <Button onClick={() => goToStep((totalFunctionalSteps - 1) as OnboardingStep)} variant="outline" className="shadow-sm">Review Configuration</Button>
                            <Button onClick={async () => { await resetOnboardingData(); }} variant="destructive" className="shadow-sm">Start Over</Button>
                        </motion.div>
                    )}
                </motion.div>
            )}
            {pageState === 'onboarding_active' && ( 
                <motion.div key="onboarding_active" className="fixed inset-0 bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 dark:from-neutral-950 dark:via-zinc-900 dark:to-gray-950 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto z-40">
                    <motion.div
                        variants={panelVariants} initial="initial" animate="animate" exit="exit"
                        className="relative bg-card/95 dark:bg-neutral-800/95 backdrop-blur-lg rounded-xl shadow-2xl w-full max-w-2xl md:max-w-3xl max-h-[95vh] flex flex-col overflow-hidden border border-border/60 dark:border-neutral-700/60"
                    >
                        <OnboardingPanelInternalContent />
                         <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost" size="icon"
                                        onClick={async () => { if (window.confirm("Are you sure you want to reset and start over? Current progress will be lost.")) { await resetOnboardingData(); } }}
                                        className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full z-20 p-1 sm:p-1.5"
                                        aria-label="Restart Onboarding"
                                    > <XOctagon className="h-5 w-5" /> </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="bg-popover text-popover-foreground text-xs px-2 py-1"><p>Restart Onboarding</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </motion.div>
                </motion.div>
            )}
             {pageState === 'error_state' && (
                <motion.div key="error_state" {...pageTransitionVariants} className="fixed inset-0 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/50 text-center p-6 z-[90]"
                    variants={itemVariantsStagger} initial="initial" animate="animate">
                    <motion.div variants={itemVariants}><AlertTriangle className="h-20 w-20 text-destructive mx-auto mb-6 opacity-80" /></motion.div>
                    <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl font-bold text-red-700 dark:text-red-300 mb-3">Application Error</motion.h1>
                    <motion.p variants={itemVariants} className="text-base sm:text-lg text-red-600 dark:text-red-400 max-w-md mx-auto mb-8">
                        An unexpected error occurred. We apologize for the inconvenience. Please try refreshing the page.
                    </motion.p>
                    <motion.div variants={itemVariants}><Button onClick={() => window.location.reload()} variant="destructive" className="shadow-lg px-8 py-3 text-base">Refresh Page</Button></motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
OnboardingPageContentInternal.displayName = 'OnboardingPageContentInternal';


// Main export for the page route (app/onboarding/page.tsx)
export default function OnboardingRoutePage() {
  return (
    <OnboardingProvider>
        <Suspense fallback={<div>Loading Onboarding Experience...</div>}> {/* Added Suspense as a good practice if any part of Onboarding relies on it, check if searchParams or other hooks need it higher up though. If not used here, you can omit */}
            <OnboardingPageContentInternal />
        </Suspense>
    </OnboardingProvider>
  );
}