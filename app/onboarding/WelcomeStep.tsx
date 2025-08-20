// components/onboarding/WelcomeStep.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
// FIX: Import the 'Variants' type
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Sparkles, Upload, RotateCw, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { useOnboarding } from './OnboardingContext';
import { APP_LOGO, APP_NAME } from '@/config/constants';
import { useCurrentUser, useAppStore } from '@/stores/appStore';
import { UserRole } from '@/types/auth';
import { ImportBackupDialogContent } from '@/app/onboarding/import_all';
import { restoreFromBackupContent, BackupFileContent } from '@/lib/restore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import React, { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocketListener';
import { toast } from 'sonner';


const AppLogo = ({ className }: { className?: string }) => (
  <Image
    src={APP_LOGO}
    alt={`${APP_NAME} Logo`}
    className={className || "h-16 w-auto"}
    width={128}
    height={128}
    priority
  />
);

// FIX: Add explicit 'Variants' types
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1, ease: "circOut" }
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const itemVariants = (delay: number = 0, yOffset: number = 20, blurAmount: number = 4): Variants => ({
  hidden: { opacity: 0, y: yOffset, filter: `blur(${blurAmount}px)` },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 100, damping: 15, delay, mass: 0.8 }
  },
});

const buttonMotionProps = (delay: number) => ({
  variants: itemVariants(delay, 15, 2),
  whileHover: {
    scale: 1.03,
    boxShadow: "0px 8px 25px hsla(var(--primary)/0.3)",
    transition: { type: "spring" as const, stiffness: 300, damping: 10 }
  },
  whileTap: { scale: 0.97 }
});

const Orb = ({ className, size, initialX, initialY, colorFrom, colorTo }: { className?: string, size: string, initialX: string, initialY: string, colorFrom: string, colorTo: string }) => (
  <motion.div
    className={`absolute ${size} rounded-full opacity-30 dark:opacity-20 blur-2xl ${className}`}
    style={{ background: `radial-gradient(circle, ${colorFrom} 0%, ${colorTo} 70%)` }}
    initial={{ x: initialX, y: initialY, scale: 0.8, opacity: 0 }}
    animate={{
      x: [initialX, `calc(${initialX} + 20px)`, initialX],
      y: [initialY, `calc(${initialY} - 20px)`, initialY],
      scale: [0.8, 1, 0.8],
      opacity: [0, 0.3, 0],
      transition: { duration: 20, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 }
    }}
  />
);

export default function WelcomeStep() {
  const { nextStep } = useOnboarding();
  const currentUser = useCurrentUser();
  const { sendJsonMessage, lastJsonMessage, isConnected, connect: connectWebSocket } = useWebSocket();
  const logoutUser = useAppStore((state) => state.logout);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [backups, setBackups] = useState<{filename: string}[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const storeHasHydrated = useAppStore.persist.hasHydrated();
  const isAdmin = storeHasHydrated && currentUser?.role === UserRole.ADMIN;

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/backups')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setBackups(data);
          }
        });
    }
  }, [isAdmin]);

  const handleRestore = async () => {
    if (!selectedBackup) return;
    setIsRestoring(true);
    try {
      const response = await fetch(`/api/backups/${selectedBackup}`);
      if (!response.ok) {
        throw new Error('Failed to fetch backup file');
      }
      const backupData: BackupFileContent = await response.json();

      await restoreFromBackupContent(
        backupData,
        { isConnected, connect: connectWebSocket, sendJsonMessage },
        logoutUser
      );
      // The page will reload, so no need to set isRestoring to false
    } catch (error) {
      toast.error('Failed to restore backup', { description: (error as Error).message });
      setIsRestoring(false);
    }
  }

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden 
                   bg-gradient-to-br from-slate-100 via-sky-100 to-indigo-100 
                   dark:from-neutral-900 dark:via-sky-950 dark:to-indigo-950 
                   animated-gradient p-4 rounded-lg">

      <Orb size="w-64 h-64 md:w-96 md:h-96" initialX="-20%" initialY="10%" colorFrom="hsla(var(--primary)/0.5)" colorTo="hsla(var(--primary)/0.1)" />
      <Orb size="w-48 h-48 md:w-80 md:h-80" initialX="70%" initialY="60%" colorFrom="hsla(220, 90%, 60%, 0.4)" colorTo="hsla(220, 90%, 60%, 0.05)" />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative z-1 flex flex-col items-center justify-center text-center 
                   w-full max-w-xl p-6 sm:p-10 
                   bg-card/70 dark:bg-neutral-800/70 backdrop-blur-xl 
                   shadow-2xl dark:shadow-black/50 rounded-2xl"
      >
        <motion.div variants={itemVariants(0.1, 30, 5)} className="mb-6 sm:mb-8">
          <AppLogo className="h-20 w-20 sm:h-24 sm:w-24 drop-shadow-xl opacity-90" />
        </motion.div>

        <motion.h1 variants={itemVariants(0.2, 25, 4)}
          className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-800 dark:text-gray-50 mb-4 leading-tight">
          Welcome to <br className="sm:hidden" />
          <span
            className="text-transparent bg-clip-text 
                       bg-gradient-to-r from-primary via-primary-dark to-primary-focus 
                       dark:from-primary-light dark:via-primary dark:to-primary-focus
                       inline-block drop-shadow-sm"
          >
            {APP_NAME}!
          </span>
        </motion.h1>

        <motion.p variants={itemVariants(0.3, 20, 3)}
          className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md sm:max-w-lg mb-8 sm:mb-10 leading-relaxed">
          Let's quickly set up your regenerative energy minigrid monitoring. Get started by creating a new configuration, or if you're an admin, restore from a backup.
        </motion.p>
        <motion.p
          variants={itemVariants(0.3, 20, 3)}
          className="flex items-start gap-2 text-sm sm:text-base text-amber-900 dark:text-amber-200 max-w-md sm:max-w-lg mb-8 sm:mb-10 leading-relaxed p-4 rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-900/20 shadow-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 w-6 h-6 mr-2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="8" />
          </svg>
          <span>
            <strong>This is a beta version.</strong> Changes made here are not permanent as there’s no database connected.
            <br />
            Please <strong>do not edit anything</strong> you’d like to keep.
            <br />
            <a href="#learn-more" className="ml-1 text-amber-600 dark:text-amber-400 underline font-semibold">Learn more →</a>
          </span>
        </motion.p>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full max-w-sm sm:max-w-md">
          <motion.div {...buttonMotionProps(0.4)} className="w-full">
            <Button
              size="lg"
              onClick={nextStep}
              className="w-full px-8 py-3.5 h-auto text-base font-semibold rounded-xl group shadow-lg bg-gradient-to-r from-primary to-primary-focus hover:from-primary-focus hover:to-primary-dark text-primary-foreground focus-visible:ring-primary/60 transition-all duration-300 ease-out transform dark:from-primary-dark dark:to-primary-focus-dark dark:hover:from-primary-focus dark:hover:to-primary dark:focus-visible:ring-primary-light/60"
            >
              <Sparkles className="mr-2.5 h-5 w-5 text-yellow-300 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-[25deg] rounded-lg" />
              Start New Setup
            </Button>
          </motion.div>

          {isAdmin && (
            <>
              <motion.div {...buttonMotionProps(0.5)} className="w-full">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(true)}
                  className="w-full px-8 py-3.5 h-auto text-base font-semibold rounded-xl group shadow-lg border-sky-500/70 text-sky-600 dark:text-sky-400 dark:border-sky-500/60 hover:border-sky-500 dark:hover:border-sky-400 hover:bg-sky-500/10 dark:hover:bg-sky-500/15 focus-visible:ring-sky-500/50 transition-all duration-300 ease-out transform"
                >
                  <Upload className="mr-2.5 h-5 w-5 transition-transform duration-300 group-hover:translate-y-[-2px] group-hover:text-sky-500 dark:group-hover:text-sky-300" />
                  Import from Backup File
                </Button>
              </motion.div>
              {backups.length > 0 && (
                <motion.div variants={itemVariants(0.6, 15, 2)} className="w-full space-y-2">
                  <Select onValueChange={setSelectedBackup}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Or restore from a periodic backup" />
                    </SelectTrigger>
                    <SelectContent>
                      {backups.map(backup => (
                        <SelectItem key={backup.filename} value={backup.filename}>
                          {backup.filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleRestore}
                    disabled={!selectedBackup || isRestoring}
                    className="w-full"
                  >
                    {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isRestoring ? 'Restoring...' : 'Restore Selected Backup'}
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>

        <motion.p variants={itemVariants(isAdmin ? 0.6 : 0.5, 10, 1)}
          className="text-xs text-gray-500 dark:text-gray-500 mt-10 max-w-sm flex items-center">
          <ShieldCheck className="inline h-4 w-4 mr-1.5 mb-px text-green-600 dark:text-green-500 shrink-0" />
          A seamless setup ensures peak performance and reliable data.
        </motion.p>

        <AnimatePresence>
          {isImportDialogOpen && (
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogContent
                className="sm:max-w-lg md:max-w-xl w-[95vw] p-0 max-h-[90vh] flex flex-col 
                                 bg-card/90 dark:bg-neutral-800/90 backdrop-blur-md 
                                 focus-visible:ring-primary/60 shadow-2xl rounded-xl border border-border/50">
                <DialogHeader className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-border/70 dark:border-neutral-700 sticky top-0 bg-transparent z-10 rounded-t-xl">
                  <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center text-gray-800 dark:text-gray-100">
                    <RotateCw className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-primary shrink-0 animate-spin-slow" />
                    Restore Configuration
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                    Import data from a valid <code className="text-xs bg-muted dark:bg-neutral-700 px-1.5 py-0.5 rounded-md font-mono">.json</code> backup. This overwrites current local settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6">
                  <ImportBackupDialogContent key={Date.now()} onDialogClose={() => setIsImportDialogOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}