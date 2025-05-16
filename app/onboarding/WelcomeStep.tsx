// components/onboarding/WelcomeStep.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkles, Upload, RotateCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger
} from '@/components/ui/dialog';
import { useOnboarding } from './OnboardingContext'; 
import { APP_LOGO, APP_NAME } from '@/config/constants'; 

import { useCurrentUser, useAppStore } from '@/stores/appStore';
import { UserRole } from '@/types/auth';
// Ensure path is correct for your ImportBackupDialogContent
import { ImportBackupDialogContent } from '@/app/onboarding/import_all'; // Updated to provided path


const AppLogo = ({ className }: { className?: string }) => (
  <Image 
    src={APP_LOGO} // Ensure APP_LOGO is correctly sourced
    alt={`${APP_NAME} Logo`} 
    className={className || "h-10 w-auto"} 
    width={100} // Adjusted for a slightly larger default if no class
    height={100} // Adjusted
    priority 
  />
);

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y:10 },
  visible: { opacity: 1, y:0, transition: { staggerChildren: 0.1, delayChildren: 0.05, ease:"circOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

const itemVariants = (delay: number = 0) => ({
  hidden: { opacity: 0, y: 15, filter: 'blur(3px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 150, damping: 18, delay, mass:0.8 } },
});

const buttonMotionConfig = (delay: number) => ({
  variants: itemVariants(delay),
  whileHover: { scale: 1.03, boxShadow: "0px 6px 20px hsla(var(--primary)/0.2)", transition: { type: "spring", stiffness: 300, damping: 10 } },
  whileTap: { scale: 0.97 }
});


export default function WelcomeStep() {
  const { nextStep } = useOnboarding();
  const currentUser = useCurrentUser(); // Assuming this hook gives the current user object from Zustand
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Critical: Check store hydration before relying on currentUser for isAdmin decision
  const storeHasHydrated = useAppStore.persist.hasHydrated();
  const isAdmin = storeHasHydrated && currentUser?.role === UserRole.ADMIN;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col items-center justify-center h-full p-4 sm:p-6 text-center"
    >
      <motion.div variants={itemVariants(0)} className="mb-5 sm:mb-7">
        <AppLogo className="h-24 w-24 sm:h-32 sm:w-32 drop-shadow-lg"/>
      </motion.div>

      <motion.h1 variants={itemVariants(0.1)}
        className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100 mb-3">
        Welcome to <span className="text-primary drop-shadow-sm">{APP_NAME}!</span>
      </motion.h1>

      <motion.p variants={itemVariants(0.2)}
        className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md sm:max-w-lg mb-6 sm:mb-8">
        Let's quickly set up your solar minigrid monitoring. Choose to start fresh or, if you are an administrator, restore a previous configuration.
      </motion.p>

      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-md">
        <motion.div {...buttonMotionConfig(0.3)} className="w-full">
          <Button
            size="lg"
            onClick={nextStep}
            className="w-full px-7 py-3 h-auto text-sm md:text-base font-semibold rounded-lg group shadow-lg hover:shadow-primary/25 focus-visible:ring-primary/50 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
          >
            <Sparkles className="mr-2.5 h-5 w-5 text-yellow-300 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-[15deg]" />
            Start New Configuration
          </Button>
        </motion.div>
        
        {isAdmin && (
            <motion.div {...buttonMotionConfig(0.4)} className="w-full">
            <Button
                size="lg"
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
                className="w-full px-7 py-3 h-auto text-sm md:text-base font-semibold rounded-lg group shadow-lg hover:shadow-sky-500/20 focus-visible:ring-sky-500/50 border-sky-500/60 text-sky-600 dark:text-sky-400 dark:border-sky-500/50 dark:hover:border-sky-400 hover:border-sky-500 hover:bg-sky-500/10 transition-all duration-200"
            >
                <Upload className="mr-2.5 h-5 w-5 transition-transform duration-300 group-hover:animate-bounce group-hover:text-sky-500 dark:group-hover:text-sky-300" />
                Import from Backup
            </Button>
            </motion.div>
        )}
      </div>
      
      <motion.p variants={itemVariants(0.5)}
        className="text-xs text-gray-500 dark:text-gray-500 mt-8 max-w-sm">
        <ShieldCheck className="inline h-3.5 w-3.5 mr-1 mb-px text-green-600 dark:text-green-500"/>
        A correct setup ensures data accuracy and an optimal user experience.
      </motion.p>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-xl w-[95vw] p-0 max-h-[90vh] flex flex-col bg-card dark:bg-neutral-800 focus-visible:ring-primary/60 shadow-2xl rounded-xl">
            <DialogHeader className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-border/70 dark:border-neutral-700 sticky top-0 bg-card/90 dark:bg-neutral-800/90 backdrop-blur-md z-10 rounded-t-xl">
                <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center text-gray-800 dark:text-gray-100">
                    <RotateCw className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-primary shrink-0 animate-spin-slow" />
                    Restore Configuration
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  Import data from a valid <code className="text-xs bg-muted dark:bg-neutral-700 px-1.5 py-0.5 rounded-md">.json</code> backup. This overwrites local settings.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6">
                 {/* Important: The key on ImportBackupDialogContent ensures it re-mounts and resets its internal state
                     if the dialog is closed and reopened, which is generally desired for an import flow. */}
                {isImportDialogOpen && <ImportBackupDialogContent key={Date.now()} onDialogClose={() => setIsImportDialogOpen(false)} />}
            </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}