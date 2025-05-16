// app/onboarding/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, CheckCircle, XOctagon, Sparkles, UserCog, AlertTriangle, Lock } from 'lucide-react'; // Added UserCog, AlertTriangle, Lock
import { toast } from 'sonner'; // Import toast from your UI components
import { isOnboardingComplete, clearOnboardingData as clearIdbOnboardingDataOnly } from '@/lib/idb-store'; // Renamed for clarity
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/config/constants'; // Ensure this is the correct path
import { useAppStore, useCurrentUser } from '@/stores/appStore'; // For auth check
import { UserRole } from '@/types/auth'; // For role comparison
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'; // Still useful

import { OnboardingProvider, useOnboarding } from './OnboardingContext';
import WelcomeStep from './WelcomeStep';
import PlantConfigStep from './PlantConfigStep';
import DataPointConfigStep from './DataPointConfigStep';
import OpcuaTestStep from './OpcuaTestStep';
import ReviewStep from './ReviewStep';
import OnboardingProgressBar from './OnboardingProgressBar';
import OnboardingNavigation from './OnboardingNavigation';

// Animation variants for full page states
const fullPageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.3, ease: "easeIn" } }
};
const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 14 } },
};

// --- OnboardingPanelInternalContent (No major changes needed here) ---
const OnboardingPanelInternalContent = React.memo(() => {
  // ... (Keep your existing OnboardingPanelInternalContent code)
  // ... (Ensure it uses the refined WelcomeStep etc.)
    const { currentStep, completeOnboarding, nextStep: contextNextStep, prevStep: contextPrevStep } = useOnboarding();
    const [direction, setDirection] = useState(1);

    const stepComponents = [
        <WelcomeStep key="welcome" />,
        <PlantConfigStep key="plant" />,
        <DataPointConfigStep key="datapoints" />,
        <OpcuaTestStep key="opcua" />,
        <ReviewStep key="review" />,
    ];

    const stepSlideVariants = {
        hidden: (dir: number) => ({ opacity: 0, x: dir > 0 ? "50%" : "-50%", filter: "blur(5px)" }),
        visible: { opacity: 1, x: "0%", filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 30, mass:0.8 } },
        exit: (dir: number) => ({ opacity: 0, x: dir < 0 ? "50%" : "-50%", filter: "blur(5px)", transition: { type: "spring", stiffness: 300, damping: 30, mass:0.8 } }),
    };

    const handleNext = useCallback(() => {
        setDirection(1);
        if (currentStep === 4) { completeOnboarding(); } else { contextNextStep(); }
    }, [currentStep, completeOnboarding, contextNextStep]);

    const handlePrev = useCallback(() => {
        setDirection(-1); contextPrevStep();
    }, [contextPrevStep]);

    return (
        <>
            <VisuallyHidden><h2>Onboarding Setup Process for {APP_NAME}</h2></VisuallyHidden>
            <div className="p-5 sm:p-6 border-b flex items-center space-x-3 bg-card/80 dark:bg-neutral-800/80 backdrop-blur-sm sticky top-0 z-10 rounded-t-lg">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0 animate-pulse" />
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground truncate" id="onboarding-panel-header">
                    Configure Your {APP_NAME}
                </h2>
            </div>
            {currentStep > 0 && currentStep < 5 && (
                <div className="px-5 sm:px-6 pt-4 pb-2 border-b">
                    <OnboardingProgressBar />
                </div>
            )}
            <div className="flex-grow overflow-y-auto p-5 sm:p-6 pt-3 sm:pt-4 relative min-h-[250px] sm:min-h-[350px]">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div key={currentStep} custom={direction} variants={stepSlideVariants} initial="hidden" animate="visible" exit="exit" className="w-full">
                        {stepComponents[currentStep]}
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="p-5 sm:p-6 border-t mt-auto bg-card/80 dark:bg-neutral-800/80 backdrop-blur-sm sticky bottom-0 z-10 rounded-b-lg">
                <OnboardingNavigation onNext={handleNext} onPrev={handlePrev} />
            </div>
        </>
    );
});
OnboardingPanelInternalContent.displayName = 'OnboardingPanelInternalContent';

// --- Main OnboardingPageContent ---
const OnboardingPageContent = () => {
  const { currentStep, resetOnboardingData, saveStatus, completeOnboarding: markContextOnboardingComplete } = useOnboarding(); // Renamed context method for clarity
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const storeHasHydrated = useAppStore.persist.hasHydrated();
  const currentUserFromStore = useAppStore((state) => state.currentUser); // Direct access to store value
  const [authChecked, setAuthChecked] = useState(false);
  const [isAllowedToOnboard, setIsAllowedToOnboard] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // General loading state for checks
  const [onboardingWasComplete, setOnboardingWasComplete] = useState<boolean | null>(null);


  useEffect(() => {
    console.log("[Onboarding Auth] Start | Hydrated:", storeHasHydrated, "| Direct Store User:", currentUserFromStore);

    if (!storeHasHydrated) {
      console.log("[Onboarding Auth] Waiting for Zustand hydration...");
      return; // Wait for Zustand to hydrate
    }
    
    setInitialLoading(true); // Start loading animation if not already
    let isMounted = true;

    const performChecks = async () => {
      // 1. Check existing onboarding status from IDB
      const idbOnboardingCompleted = await isOnboardingComplete();
      if (!isMounted) return;
      setOnboardingWasComplete(idbOnboardingCompleted); // Store this for later logic
      console.log("[Onboarding Auth] IDB Onboarding Complete Status:", idbOnboardingCompleted);

      // 2. Evaluate current user from Zustand store (which is now hydrated)
      const user = currentUserFromStore; // Use the direct store value after hydration
      console.log("[Onboarding Auth] Current User from Store:", user);

      const wantsReset = searchParams.get('reset') === 'true';
      console.log("[Onboarding Auth] Wants Reset:", wantsReset);

      // --- Decision Logic ---
      if (!user || user.email === 'guest@example.com') {
        // Scenario: No authenticated user
        console.log("[Onboarding Auth] Action: No authenticated user. Redirecting to login.");
        toast.error("Authentication Required", { description: "Please log in to proceed with setup."});
        router.replace('/login');
        return; // Stop further processing
      }
      
      // Scenario: User is authenticated
      if (user.role === UserRole.ADMIN) {
        // Admin User
        console.log("[Onboarding Auth] User is ADMIN.");
        if (wantsReset) {
          console.log("[Onboarding Auth] ADMIN wants reset. Clearing data and starting onboarding.");
          if (idbOnboardingCompleted) await clearIdbOnboardingDataOnly();
          if (!isMounted) return;
          await resetOnboardingData(); // This resets OnboardingContext state
          setIsAllowedToOnboard(true);
          // Clean URL param
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.delete('reset');
          router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });

        } else if (!idbOnboardingCompleted) {
          console.log("[Onboarding Auth] ADMIN, onboarding not complete. Allowing onboarding.");
          setIsAllowedToOnboard(true);
        } else {
          // Admin, onboarding IS complete, and no reset requested
          console.log("[Onboarding Auth] ADMIN, onboarding already complete. Redirecting to dashboard/control.");
          toast.info("Setup Already Complete", { description: "Redirecting to your dashboard."});
          router.replace(user.redirectPath || '/dashboard'); // Or specific admin dashboard
        }
      } else {
        // Non-Admin User
        console.log("[Onboarding Auth] User is NON-ADMIN. Role:", user.role);
        setIsAllowedToOnboard(false); // Non-admins cannot actively onboard
        if (!idbOnboardingCompleted) {
          console.log("[Onboarding Auth] NON-ADMIN, onboarding NOT complete. Showing 'Admin Required' message.");
          // Stays on this page, will render the 'admin required' message.
        } else {
          // Non-admin, onboarding IS complete by an admin previously
          console.log("[Onboarding Auth] NON-ADMIN, onboarding complete by admin. Redirecting to dashboard.");
          toast.info("Welcome!", { description: "System configuration is complete." });
          router.replace(user.redirectPath || '/dashboard');
        }
      }
      
      if(isMounted) setAuthChecked(true);
      if(isMounted) setInitialLoading(false); // Finish initial loading screen
    };

    performChecks();
    return () => { isMounted = false; };

  }, [storeHasHydrated, currentUserFromStore, router, resetOnboardingData, searchParams, pathname]);


  // ---- Render logic based on auth and onboarding state ----

  // Full-screen Initial Loading state (covers hydration + initial auth checks)
  if (initialLoading || (storeHasHydrated && !authChecked)) {
    return (
      <motion.div variants={fullPageVariants} initial="initial" animate="animate" exit="exit"
        className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-neutral-900 text-slate-200 z-[100]">
        <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 150, damping: 12, delay: 0.1 } }}>
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        </motion.div>
        <motion.p variants={itemVariants} className="text-xl font-medium text-slate-300">Loading Application Setup...</motion.p>
        <motion.p variants={itemVariants} custom={1} className="text-sm text-slate-400 mt-2">Verifying configuration and session...</motion.p>
      </motion.div>
    );
  }

  // Screen for Non-Admin when onboarding is NOT yet complete by anyone
  if (authChecked && !isAllowedToOnboard && onboardingWasComplete === false) {
    return (
      <motion.div variants={fullPageVariants} initial="initial" animate="animate" exit="exit"
        className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-gray-900 text-center p-6 z-[90]">
        <motion.div variants={itemVariants}>
            <UserCog className="h-20 w-20 text-amber-500 dark:text-amber-400 mx-auto mb-6 opacity-80" />
        </motion.div>
        <motion.h1 variants={itemVariants} custom={1} className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            Administrator Setup Required
        </motion.h1>
        <motion.p variants={itemVariants} custom={2} className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
            The initial configuration for {APP_NAME} needs to be completed by an administrator.
            Please contact your system administrator to set up the application.
        </motion.p>
        <motion.div variants={itemVariants} custom={3}>
            <Button onClick={() => router.push('/login')} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg px-8 py-3 text-base">
                Go to Login
            </Button>
        </motion.div>
      </motion.div>
    );
  }
  
  // Onboarding is complete or setup process is being finalized by admin
  if (authChecked && isAllowedToOnboard && currentStep === 5) { 
    let iconToShow = <Loader2 className="h-20 w-20 animate-spin text-primary" />;
    let titleText = "Finalizing Your Setup...";
    let messageText = "Saving configurations and preparing your dashboard...";

    if (saveStatus === 'success') {
      iconToShow = <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 180, damping: 10, delay:0.1 } }}><CheckCircle className="h-20 w-20 text-green-500" /></motion.div>;
      titleText = "Setup Complete & Successful!";
      messageText = `Welcome aboard! ${APP_NAME} is ready. You will be redirected shortly.`;
    } else if (saveStatus === 'error') {
      iconToShow = <motion.div initial={{ rotate: -15, scale:0.8 }} animate={{ rotate: 0, scale:1 }}><XOctagon className="h-20 w-20 text-destructive" /></motion.div>;
      titleText = "Setup Error";
      messageText = "An issue occurred while saving. Please review your settings or contact support.";
      // Option to go back or retry can be added here
    }
    return (
      <motion.div variants={fullPageVariants} initial="initial" animate="animate" exit="exit"
        className="fixed inset-0 flex flex-col items-center justify-center text-center p-6 bg-background z-[100]">
        <div className="mb-8">{iconToShow}</div>
        <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{titleText}</motion.h2>
        <motion.p variants={itemVariants} custom={1} className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">{messageText}</motion.p>
        {/* Auto-redirect or button might go here */}
        {saveStatus === 'success' && <motion.div variants={itemVariants} custom={2} className="mt-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></motion.div>}
         {saveStatus === 'error' && (
            <motion.div variants={itemVariants} custom={2} className="mt-8">
                <Button onClick={() => { /* Call context function to go to review step, e.g., goToStep(4) */ }} 
                        variant="outline">Review Configuration</Button>
            </motion.div>
        )}
      </motion.div>
    );
  }

  // Admin is actively going through the onboarding steps
  if (authChecked && isAllowedToOnboard && currentStep >= 0 && currentStep <= 4) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-200 via-gray-200 to-slate-300 dark:from-neutral-900 dark:via-zinc-900 dark:to-gray-900 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto z-40 transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 260, damping: 25, mass: 0.9 }}
          className="relative bg-card dark:bg-neutral-800/90 rounded-xl shadow-2xl w-full max-w-2xl md:max-w-3xl max-h-[95vh] flex flex-col overflow-hidden border border-border/70 dark:border-neutral-700/80"
        >
          <OnboardingPanelInternalContent />
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              if (window.confirm("Are you sure you want to reset and start over? All progress in this session will be lost.")) {
                await resetOnboardingData(); // Reset OnboardingContext data
              }
            }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full z-20 p-1.5 sm:p-2"
            aria-label="Restart Onboarding"
            title="Restart Onboarding"
          >
            <XOctagon className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // Fallback: If no condition is met (should ideally not happen if logic is exhaustive)
  // Could be if authChecked is true, but no other render condition applies
  // This might indicate user was redirected but component didn't unmount fast enough.
  if (authChecked) {
      console.warn("[Onboarding Auth] Fallback: Auth checked, but no specific render path matched. CurrentStep:", currentStep, "AllowedToOnboard:", isAllowedToOnboard);
      return (
           <motion.div variants={fullPageVariants} initial="initial" animate="animate" exit="exit"
                className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[100]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Preparing...</p>
            </motion.div>
      );
  }

  return null; // Or some default loading/error screen
};


// --- Onboarding (Provider Wrapper) ---
export default function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingPageContent />
    </OnboardingProvider>
  );
}