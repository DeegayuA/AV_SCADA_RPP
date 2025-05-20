// components/onboarding/OnboardingNavigation.tsx
'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { useOnboarding } from './OnboardingContext';

interface OnboardingNavigationProps {
  onNext: () => void | Promise<void>;
  onPrev: () => void;
  currentStep: number;
  totalSteps: number;
  isNextDisabled?: boolean;
}

export default function OnboardingNavigation({ onNext, onPrev, isNextDisabled }: OnboardingNavigationProps) {
  const { currentStep, totalSteps } = useOnboarding();

  return (
    <div className="flex justify-between items-center">
      <Button
        variant="outline"
        onClick={onPrev}
        disabled={currentStep === 0}
        aria-label="Previous step"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Previous
      </Button>
      <Button
        onClick={onNext}
        disabled={isNextDisabled}
        aria-label={currentStep === totalSteps -1 ? "Confirm and Save Settings" : "Next step"}
      >
        {currentStep === totalSteps -1 ? 'Confirm & Save' : 'Next'}
        {currentStep === totalSteps -1 ? <CheckCircle className="h-4 w-4 ml-2" /> : <ArrowRight className="h-4 w-4 ml-2" />}
      </Button>
    </div>
  );
}