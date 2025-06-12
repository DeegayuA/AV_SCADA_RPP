// app/onboarding/OnboardingClient.tsx (or page.tsx)
'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, CheckCircle, XOctagon, Sparkles, UserCog, AlertTriangle, ArrowLeft, ArrowRight, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

import { isOnboardingComplete, clearOnboardingData as clearIdbOnboardingDataOnly } from '@/lib/idb-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { APP_NAME } from '@/config/constants';
import { useAppStore } from '@/stores/appStore';
import { User, UserRole } from '@/types/auth'; 
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import { OnboardingProvider, useOnboarding, OnboardingContextType, OnboardingStep } from './OnboardingContext';
// Assuming WelcomeStep.tsx is as per the initial problem description for THIS thread
import WelcomeStep from './WelcomeStep'; 
import PlantConfigStep from './PlantConfigStep';
// import DataPointConfigStep from './DataPointConfigStep'; // Removed import
import OpcuaTestStep from './OpcuaTestStep';
import DatapointDiscoveryStep from './DatapointDiscoveryStep'; // This now includes DataPointConfigStep functionality
// import GeminiKeyConfigStep from './GeminiKeyConfigStep'; // Fully removed as per current task
import ReviewStep from './ReviewStep';
import { useTheme } from 'next-themes';

// CSS for animated gradient (typically in globals.css)
// @keyframes gradient-animation {
//   0% { background-position: 0% 50%; }
//   50% { background-position: 100% 50%; }
//   100% { background-position: 0% 50%; }
// }
// .animated-gradient {
//   background-size: 200% 200%; /* Or 400% 400% for smoother/slower */
//   animation: gradient-animation 18s ease infinite;
// }

// --- Animation Variants (Mostly unchanged from provided) ---
const pageTransitionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: "anticipate" } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }
};
const panelVariants = { 
    initial: { opacity: 0, y: 50, scale: 0.95, filter: "blur(4px)" }, // Enhanced initial state
    animate: { 
        opacity: 1, y: 0, scale: 1, filter: "blur(0px)", 
        transition: { type: "spring", stiffness: 200, damping: 25, delay: 0.15 } 
    },
    exit: { opacity: 0, y: 30, scale: 0.97, filter: "blur(2px)", transition: { duration: 0.3 } }
};
const itemVariantsStagger = { 
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
const itemVariants = { 
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 18 } },
};
const iconPulseVariants = { 
    pulse: { scale: [1, 1.15, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }
};


// --- Decorative Orb Component (NEW for impressive UI) ---
const Orb: React.FC<{ size: string, initialX: string, initialY: string, colorFrom: string, colorTo: string, delay?: number, className?: string }> = 
React.memo(({ size, initialX, initialY, colorFrom, colorTo, delay = 0, className }) => (
  <motion.div
    className={`absolute ${size} rounded-full opacity-0 blur-2xl pointer-events-none ${className}`} // opacity starts at 0, controlled by animate
    style={{ background: `radial-gradient(circle, ${colorFrom} 0%, ${colorTo} 70%)`, zIndex: 0 }} // zIndex to be behind panel
    initial={{ x: initialX, y: initialY, scale: 0.7 }}
    animate={{ 
      x: [`calc(${initialX} - 15px)`, `calc(${initialX} + 15px)`, `calc(${initialX} - 15px)`], // Subtle movement
      y: [`calc(${initialY} + 10px)`, `calc(${initialY} - 10px)`, `calc(${initialY} + 10px)`],
      scale: [0.7, 1, 0.7],
      opacity: [0, 0.4, 0.4, 0.3, 0], // Dark mode opacity for orbs; 0.4 for light mode, .25 for dark
      transition: { 
        duration: 25, // Longer duration for slower, more ambient effect
        repeat: Infinity, 
        ease: "easeInOut", 
        delay: delay 
      }
    }}
  />
));
Orb.displayName = "Orb";


// --- OnboardingProgressBarInternal (Internalized) ---
interface OnboardingProgressBarInternalProps {
  currentStep: number; 
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
                  Step {Math.min(currentStep + 1, totalSteps)} of {totalSteps}: <span className="font-semibold">{currentStepName}</span>
              </p>
              <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </div>
        <Progress value={progress} className="w-full h-2 [&>*]:bg-gradient-to-r [&>*]:from-primary [&>*]:to-primary/70 transition-all duration-300 ease-out" />
      </div>
    </TooltipProvider>
  );
});
OnboardingProgressBarInternal.displayName = "OnboardingProgressBarInternal";

// --- OnboardingNavigationInternal (Internalized & UPDATED for consistency) ---
interface OnboardingNavigationInternalProps {
  onNext: () => void;
  onPrev: () => void;
  currentStep: number; 
  totalSteps: number;
  isLoading?: boolean;
}
const OnboardingNavigationInternal: React.FC<OnboardingNavigationInternalProps> = React.memo(({ onNext, onPrev, currentStep, totalSteps, isLoading }) => {
  const isFirstStep = currentStep === 0;
  // This definition means ReviewStep is the last functional step *before* completion
  const isLastFunctionalStep = currentStep === totalSteps - 1; 

  const buttonVariants = {
    hover: { scale: 1.03, transition: { type: "spring", stiffness: 400, damping: 15 } },
    tap: { scale: 0.97 }
  };

  return (
    <div className="flex w-full justify-between items-center gap-3 sm:gap-4">
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
      {/* Conditionally render Next/Finish button. For WelcomeStep (isFirstStep), its own buttons are primary. */}
      {/* This ensures "Next" doesn't appear for WelcomeStep which has its own CTAs like "Start New Config" */}
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
  currentUser: User | null; 
  redirectDelay?: number;
}
const SuccessRedirector: React.FC<SuccessRedirectorProps> = React.memo(({ currentUser, redirectDelay = 3500 }) => {
    const router = useRouter();
    
    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace(currentUser?.redirectPath || '/dashboard');
        }, redirectDelay);
        return () => clearTimeout(timer);
    }, [router, currentUser, redirectDelay]);

    return (
        <motion.div variants={itemVariants} className="mt-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
        </motion.div>
    );
});
SuccessRedirector.displayName = "SuccessRedirector";

// --- OnboardingPanelInternalContent ---
const OnboardingPanelInternalContent: React.FC = React.memo(() => {
    const context = useOnboarding();
    if (!context) throw new Error("useOnboarding must be used within OnboardingProvider");
    const { currentStep, completeOnboarding, nextStep, prevStep, isLoading } = context as Required<OnboardingContextType>;
    
    const [direction, setDirection] = useState(1);

    // This config drives the steps.
    const stepsConfig = [
        { component: <WelcomeStep key="welcome" />, name: "Welcome" }, // Uses imported WelcomeStep
        { component: <PlantConfigStep key="plant" />, name: "Plant Setup" },
        // { component: <OpcuaTestStep key="opcua" />, name: "OPC UA Test" },
        // GeminiKeyConfigStep was here
        { component: <DatapointDiscoveryStep key="datapoint_discovery_merged" />, name: "Datapoint Management" }, // Renamed and now merged
        // { component: <DataPointConfigStep key="datapoints_manual" />, name: "Manual Data Points" }, // Removed step
        { component: <ReviewStep key="review" />, name: "Review & Finalize" },
    ];
    const totalSteps = stepsConfig.length; // This will now be 5 (or 4 if OPCUA/Gemini are also commented out)

    const stepSlideVariants = {
        hidden: (dir: number) => ({ opacity: 0, x: dir > 0 ? "30px" : "-30px", scale: 0.99, filter: "blur(2px)" }),
        visible: { opacity: 1, x: "0px", scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 260, damping: 28 } },
        exit: (dir: number) => ({ opacity: 0, x: dir < 0 ? "30px" : "-30px", scale: 0.99, filter: "blur(2px)", transition: { type: "tween", duration: 0.15, ease:"easeIn" } }),
    };

    const handleNext = useCallback(async () => {
        setDirection(1);
        if (currentStep === totalSteps - 1) { // If on the last step (e.g., Review)
            await completeOnboarding();
        } else if (nextStep) {
            nextStep();
        }
    }, [currentStep, completeOnboarding, nextStep, totalSteps]);

    const handlePrev = useCallback(() => {
        setDirection(-1);
        if (prevStep) {
            prevStep();
        }
    }, [prevStep]);


    return (
        <>
            <VisuallyHidden><h2>Onboarding Setup Process for {APP_NAME}</h2></VisuallyHidden>
            <CardHeader className="p-4 sm:p-5 border-b sticky top-0 z-10 bg-card/80 dark:bg-card/70 backdrop-blur-sm rounded-t-xl">
                <div className="flex items-center space-x-3">
                    <motion.div variants={iconPulseVariants} animate="pulse">
                        <Sparkles className="h-7 w-7 text-primary shrink-0" />
                    </motion.div>
                    <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground truncate" id="onboarding-panel-header">
                        Setup {APP_NAME}
                    </CardTitle>
                </div>
            </CardHeader>

            {/* Progress bar is shown for all steps including WelcomeStep, as it's part of the process */}
            {currentStep < totalSteps && (
                <CardContent className="p-0 border-b">
                   <div className="px-4 sm:px-6 py-3">
                    <OnboardingProgressBarInternal currentStep={currentStep} totalSteps={totalSteps} stepNames={stepsConfig.map(s=>s.name)} />
                   </div>
                </CardContent>
            )}

            <CardContent className="flex-grow overflow-y-auto p-0 sm:p-0 relative min-h-[380px] sm:min-h-[480px]">
                {/* p-0 for CardContent as WelcomeStep has its own padding */}
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentStep} 
                        custom={direction}
                        variants={stepSlideVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full h-full" // WelcomeStep and other steps will use this height
                    >
                        {stepsConfig[currentStep]?.component}
                    </motion.div>
                </AnimatePresence>
            </CardContent>

            {/* Navigation is shown for all steps, but "Next" is hidden on first step (WelcomeStep) */}
            {currentStep < totalSteps && (
                 <CardFooter className="p-4 sm:p-5 border-t sticky bottom-0 z-10 bg-card/80 dark:bg-card/70 backdrop-blur-sm rounded-b-xl">
                    <OnboardingNavigationInternal 
                        onNext={handleNext} 
                        onPrev={handlePrev} 
                        currentStep={currentStep} 
                        totalSteps={totalSteps}
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

    // CRITICAL: This MUST match the actual number of steps defined in OnboardingPanelInternalContent's stepsConfig
    // Welcome, Plant, DatapointManagement, Review = 4 steps (if OPCUA and Gemini commented out)
    // If OPCUA and Gemini were active, it would be 6.
    // Current config: Welcome, Plant, Datapoint Management, Review. So, 4 functional steps.
    const totalFunctionalSteps = stepsConfig.length; // Dynamically set based on active stepsConfig

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
                        await resetOnboardingData(); // This should reset context.currentStep to 0
                        const newParams = new URLSearchParams(searchParams.toString());
                        newParams.delete('reset');
                        newParams.delete('step'); // Also clear step from URL on reset
                        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
                        setPageState('onboarding_active');
                        // No need to setHasSyncedUrlToContext(true) here, let the step sync logic handle it if needed for step 0 (or no step param)
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

    // URL to Context Sync & Context to URL Sync
    useEffect(() => {
        if (pageState !== 'onboarding_active' && pageState !== 'finalizing') return;
        if (!goToStep) return; 

        const stepFromUrlStr = searchParams.get('step');
        const stepFromUrl = stepFromUrlStr ? parseInt(stepFromUrlStr, 10) : null;

        // Sync URL to Context (once, primarily on load or if URL driven externally)
        if (stepFromUrl !== null && stepFromUrl >= 1 && stepFromUrl <= totalFunctionalSteps && !hasSyncedUrlToContext) {
            const contextEquivalentStep = (stepFromUrl - 1) as OnboardingStep;
            if (currentStep !== contextEquivalentStep) {
                console.log(`[SYNC URL->CTX] URL step ${stepFromUrl} to Context step ${contextEquivalentStep}. Current context: ${currentStep}`);
                goToStep(contextEquivalentStep);
            }
            setHasSyncedUrlToContext(true); // Mark that initial URL sync attempt has occurred
        } else if (stepFromUrl === null && currentStep !== 0 && !hasSyncedUrlToContext) {
            // If no step in URL, and context isn't at step 0, sync context to step 0
            // Or, more commonly, if no step in URL, the currentStep (default 0) is fine.
            // This part might need refinement based on desired behavior for missing 'step' param.
            // For now, let's assume if 'step' is missing, it implies step 1 (index 0).
             setHasSyncedUrlToContext(true); // Treat as synced if no step param and currentStep is 0
        }

        // Sync Context to URL (continuously, as user navigates with internal buttons)
        if (hasSyncedUrlToContext && currentStep < totalFunctionalSteps) {
            const contextStepForUrl = currentStep + 1; // 1-indexed for URL
            if (contextStepForUrl !== stepFromUrl) { // Only update if different
                console.log(`[SYNC CTX->URL] Context step ${currentStep} to URL step ${contextStepForUrl}. Current URL step: ${stepFromUrl}`);
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.set('step', contextStepForUrl.toString());
                // Avoid replacing if only the hash changes or if it's identical
                if (window.location.search !== `?${newParams.toString()}`) {
                     router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
                }
            }
        }
    }, [pageState, currentStep, searchParams, pathname, router, goToStep, totalFunctionalSteps, hasSyncedUrlToContext]);

    useEffect(() => {
        if (pageState === 'onboarding_active' && currentStep >= totalFunctionalSteps) { // e.g. 6 steps (0-5), currentStep becomes 6
            setPageState('finalizing');
        } else if (pageState === 'finalizing' && currentStep < totalFunctionalSteps) {
            // If user goes back from finalizing state (e.g. error, review)
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
                    variants={itemVariantsStagger} initial="initial" animate="animate">
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
                <motion.div 
                    key="onboarding_active" 
                    className="fixed inset-0 bg-gradient-to-br from-slate-100 via-gray-50 to-sky-100 dark:from-neutral-950 dark:via-zinc-900 dark:to-sky-950 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden z-40 animated-gradient" // Added animated-gradient & overflow-hidden
                    initial="initial" animate="animate" exit="exit" // Use pageTransitionVariants or define new ones if needed for this full screen container
                >
                    {/* Decorative Orbs - ensure your primary and accent colors are defined via CSS vars if using hsla(var(--primary)) */}
                    <Orb size="w-60 h-60 md:w-[450px] md:h-[450px]" initialX="-25%" initialY="-15%" colorFrom="hsla(var(--primary)/0.3)" colorTo="hsla(var(--primary)/0.03)" delay={0} className="opacity-60 dark:opacity-30" />
                    <Orb size="w-56 h-56 md:w-[400px] md:h-[400px]" initialX="65%" initialY="55%" colorFrom="hsla(210, 80%, 70%, 0.35)" colorTo="hsla(210, 80%, 50%, 0.03)" delay={1.5} className="opacity-60 dark:opacity-30"/>
                    
                    <motion.div
                        variants={panelVariants} initial="initial" animate="animate" exit="exit" // Panel animation
                        className="relative z-10 bg-card/80 dark:bg-neutral-800/85 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl md:max-w-3xl max-h-[95vh] flex flex-col overflow-hidden border border-border/50 dark:border-neutral-700/50"
                    > {/* Increased blur, adjusted opacity */}
                        <OnboardingPanelInternalContent />
                         <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost" size="icon"
                                        onClick={async () => { 
                                            if (window.confirm("Are you sure you want to reset and start over? Current progress will be lost.")) { 
                                                // Before resetting, clear the step URL param to ensure fresh start at step 1
                                                const newParams = new URLSearchParams(window.location.search);
                                                newParams.delete('step');
                                                router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
                                                // Then reset onboarding data, which should set context.currentStep to 0
                                                await resetOnboardingData(); 
                                            } 
                                        }}
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
    // Wrap with Suspense at a higher level if useSearchParams directly triggers it.
    // However, Suspense is usually for components that `React.lazy` load or data fetching hooks that suspend.
    // `useSearchParams` in Next.js 13+ App Router doesn't typically require Suspense at this direct level 
    // unless a parent component up the tree is already expecting it.
    // For now, retaining the Suspense wrapper around the content.
    <Suspense fallback={
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-neutral-900 text-slate-200 z-[200]">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
            <p className="text-xl font-medium text-slate-300">Loading Onboarding...</p>
        </div>
    }>
        <OnboardingProvider>
            <OnboardingPageContentInternal />
            <ThemeToggleButton />
        </OnboardingProvider>
    </Suspense>
  );
}


const ThemeToggleButton = React.memo(() => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20 h-10 w-10 rounded-full bg-black/10 dark:bg-white/5 animate-pulse" />;
  
  const cycleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 1.0, type: 'spring', stiffness:150, damping:12 } }}
      className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20" >
      <Button
        variant="outline" size="icon"
        className="rounded-full bg-black/20 dark:bg-white/10 border-white/10 dark:border-black/10 text-white dark:text-black hover:bg-black/40 dark:hover:bg-white/20 backdrop-blur-md h-10 w-10 sm:h-11 sm:w-11 shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={ theme === 'dark' ? {borderColor:'rgba(255,255,255,0.15)', color: '#f5f5f5'} : {borderColor: 'rgba(0,0,0,0.15)', color:'#0a0a0a'}}
        onClick={cycleTheme} aria-label="Toggle theme" >
        <AnimatePresence mode="wait" initial={false}>
          {theme === 'dark' ?
            <motion.div key="sun-icon" initial={{ y: -12, opacity: 0, rotate: -45 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 12, opacity: 0, rotate: 45 }} transition={{ duration: 0.25, ease: "circOut" }}>
              <Sun className="h-5 w-5 sm:h-[22px] sm:w-[22px] text-yellow-300" />
            </motion.div>
            :
            <motion.div key="moon-icon" initial={{ y: -12, opacity: 0, rotate: 45 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 12, opacity: 0, rotate: -45 }} transition={{ duration: 0.25, ease: "circOut" }}>
              <Moon className="h-5 w-5 sm:h-[22px] sm:w-[22px] text-sky-500" />
            </motion.div>
          }
        </AnimatePresence>
      </Button>
    </motion.div>
  );
});
ThemeToggleButton.displayName = "ThemeToggleButton";