// components/onboarding/OnboardingProgressBar.tsx
'use client';
import { Progress } from '@/components/ui/progress';
import { useOnboarding } from './OnboardingContext';

const stepNames = ["Welcome", "Plant Details", "Data Points", "Connection Test", "Review"];

export default function OnboardingProgressBar() {
  const { currentStep, totalSteps } = useOnboarding();
  // Progress for steps 1-4 (totalSteps adjusted)
  const progressPercentage = currentStep > 0 ? ((currentStep) / (totalSteps -1 )) * 100 : 0;


  return (
    <div className="my-4">
      <div className="flex justify-between mb-1 text-sm text-muted-foreground">
        <span>Step {currentStep} of {totalSteps -1}: {stepNames[currentStep]}</span>
        {/* <span>{Math.round(progressPercentage)}%</span> */}
      </div>
      <Progress value={progressPercentage} className="w-full" />
    </div>
  );
}