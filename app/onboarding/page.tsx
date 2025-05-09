'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
// Dialog components from shadcn/ui are no longer used for the main onboarding flow
// import { Dialog, DialogContent, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'; // Still useful
import { Loader2, CheckCircle, XOctagon, Sparkles } from 'lucide-react';
import { isOnboardingComplete, clearOnboardingData } from '@/lib/idb-store';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/config/constants';

import { OnboardingProvider, useOnboarding } from './OnboardingContext'; // Ensure this provides STABLE functions
import WelcomeStep from './WelcomeStep';
import PlantConfigStep from './PlantConfigStep';
import DataPointConfigStep from './DataPointConfigStep';
import OpcuaTestStep from './OpcuaTestStep';
import ReviewStep from './ReviewStep';
import OnboardingProgressBar from './OnboardingProgressBar';
import OnboardingNavigation from './OnboardingNavigation';

// OnboardingPageContentInternal will render the content of our custom panel.
// It no longer needs DialogTitle or DialogDescription from the Dialog component.
const OnboardingPanelInternalContent = React.memo(() => {
  const { currentStep, completeOnboarding, nextStep: contextNextStep, prevStep: contextPrevStep } = useOnboarding();
  const [direction, setDirection] = useState(1);

  // Ensure these step components are well-behaved and don't cause issues themselves.
  const stepComponents = [
    <WelcomeStep key="welcome" />,
    <PlantConfigStep key="plant" />,
    <DataPointConfigStep key="datapoints" />,
    <OpcuaTestStep key="opcua" />,
    <ReviewStep key="review" />,
  ];

  const stepSlideVariants = {
    hidden: (dir: number) => ({ opacity: 0, x: dir > 0 ? "50%" : "-50%" }),
    visible: { opacity: 1, x: "0%", transition: { type: "spring", stiffness: 350, damping: 35 } },
    exit: (dir: number) => ({ opacity: 0, x: dir < 0 ? "50%" : "-50%", transition: { type: "spring", stiffness: 350, damping: 35 } }),
  };

  const handleNext = useCallback(() => {
    setDirection(1);
    if (currentStep === 4) { // Review step is the last before finalizing
      completeOnboarding(); // This function MUST BE STABLE from context
    } else {
      contextNextStep();    // This function MUST BE STABLE from context
    }
  }, [currentStep, completeOnboarding, contextNextStep]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    contextPrevStep();      // This function MUST BE STABLE from context
  }, [contextPrevStep]);

  return (
    <>
      {/* Visually hidden titles for accessibility, not Dialog specific */}
      <VisuallyHidden>
        <h2>Onboarding Setup Process for {APP_NAME}</h2>
      </VisuallyHidden>
      <VisuallyHidden>
        <p>Follow the steps to configure your application.</p>
      </VisuallyHidden>

      {/* Header for the panel */}
      <div className="p-6 border-b flex items-center space-x-3 bg-muted/30 sticky top-0 z-10">
        <Sparkles className="h-7 w-7 text-primary shrink-0" />
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground truncate" id="onboarding-panel-header">
          Configure Your {APP_NAME}
        </h2>
      </div>

      {/* Progress Bar */}
      {currentStep > 0 && currentStep < 5 && ( // Show for steps 1-4
        <div className="px-6 pt-4 pb-2">
          <OnboardingProgressBar />
        </div>
      )}

      {/* Step Content */}
      <div className="flex-grow overflow-y-auto p-6 pt-2 relative min-h-[200px] sm:min-h-[300px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepSlideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            {stepComponents[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-6 border-t mt-auto bg-muted/30 sticky bottom-0 z-10">
        <OnboardingNavigation onNext={handleNext} onPrev={handlePrev} />
      </div>
    </>
  );
});
OnboardingPanelInternalContent.displayName = 'OnboardingPanelInternalContent';


const OnboardingPageContent = () => {
  const { currentStep, resetOnboarding, saveStatus } = useOnboarding();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  // This useEffect is critical. `resetOnboarding` MUST BE STABLE (memoized in context).
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      // setIsLoading(true); // Already true initially. Re-setting might be redundant unless this effect re-runs often.

      const completed = await isOnboardingComplete();
      if (!isMounted) return;

      const wantsReset = searchParams.get('reset') === 'true';

      if (wantsReset) {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('reset');
        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false }); // Clean URL

        if (completed) await clearOnboardingData();
        if (!isMounted) return;
        await resetOnboarding(); // MUST BE STABLE
      } else if (completed) {
        router.replace('/login');
      }
      // If !completed and !wantsReset, context's currentStep should take over.

      if (isMounted) setIsLoading(false);
    };

    checkStatus();
    return () => { isMounted = false; };
  }, [router, resetOnboarding, pathname, searchParams]); // `resetOnboarding` is the most likely culprit for loops if not stable.

  const shouldRenderOnboardingPanel = !isLoading && currentStep >= 0 && currentStep <= 4;

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[100]"
      >
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading setup...</p>
      </motion.div>
    );
  }

  if (currentStep === 5) { // Finalizing/Completion screen
    let iconToShow = <Loader2 className="h-16 w-16 animate-spin text-primary" />;
    let titleText = "Finalizing Your Setup...";
    let messageText = "Just a moment, saving your configurations...";

    if (saveStatus === 'success') {
      iconToShow = <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 200, damping: 10 } }}><CheckCircle className="h-16 w-16 text-green-500" /></motion.div>;
      titleText = "Setup Complete!";
      messageText = `Welcome to ${APP_NAME}! You're all set.`;
    } else if (saveStatus === 'error') {
      iconToShow = <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><XOctagon className="h-16 w-16 text-destructive" /></motion.div>;
      titleText = "Setup Error";
      messageText = "An error occurred. You may need to try again or contact support.";
      // TODO: Consider a button to retry or go back to review (e.g., by calling a context function like `goToStep(4)`)
    }
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center bg-background z-[100]"
      >
        <div className="mb-6">{iconToShow}</div>
        <h2 className="text-2xl md:text-3xl font-bold mb-3">{titleText}</h2>
        <p className="text-muted-foreground max-w-md">{messageText}</p>
      </motion.div>
    );
  }

  if (shouldRenderOnboardingPanel) {
    return (
      // This is our custom "dialog-like" UI container
      // 1. Full-screen overlay
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* 2. Centered content panel/card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.98 }} // Optional: Add exit animation if desired
          transition={{ type: "spring", stiffness: 260, damping: 25 }}
          className="relative bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          // We are not a true modal, so ARIA roles like 'dialog' might be misleading
          // unless full modal accessibility (focus trap, etc.) is implemented.
          // For simplicity, we omit them here.
          // aria-labelledby="onboarding-panel-header" (if OnboardingPanelInternalContent h2 has this id)
        >
          <OnboardingPanelInternalContent />
          
          {/* Reset Button, positioned on our custom panel */}
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              if (window.confirm("Are you sure you want to start over? All unsaved progress will be lost.")) {
                await resetOnboarding(); // MUST BE STABLE
              }
            }}
            className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full z-20" // z-20 to be above sticky header
            aria-label="Start Over or Reset Configuration"
          >
            <XOctagon className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // If not loading, not step 5, and panel shouldn't be rendered (e.g., if routing occurred)
  return null;
};

export default function Onboarding() {
  // CRITICAL REMINDER: OnboardingProvider MUST use useCallback/useMemo for its context values.
  return (
    <OnboardingProvider>
      <OnboardingPageContent />
    </OnboardingProvider>
  );
}