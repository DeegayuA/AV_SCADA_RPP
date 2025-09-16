// components/onboarding/WelcomeStep.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Sparkles, Upload, RotateCw, ShieldCheck, Loader2, Server, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useOnboarding } from './OnboardingContext';
import { APP_LOGO, APP_NAME } from '@/config/constants';
import { useCurrentUser, useAppStore } from '@/stores/appStore';
import { UserRole } from '@/types/auth';
import { ImportBackupDialogContent } from '@/app/onboarding/import_all';
import { restoreFromBackupContent, BackupFileContent } from '@/lib/restore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebSocket } from '@/hooks/useWebSocketListener';
import { toast } from 'sonner';
import styles from './WelcomeStep.module.css';

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

// --- Motion Variants for Animations ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  },
  exit: { opacity: 0, transition: { duration: 0.3 } }
};

const itemVariants = (delay: number = 0, yOffset: number = 25, blurAmount: number = 5): Variants => ({
  hidden: { opacity: 0, y: yOffset, filter: `blur(${blurAmount}px)` },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 120, damping: 18, delay, mass: 1 }
  },
});

const buttonMotionProps = (delay: number) => ({
  variants: itemVariants(delay, 20, 3),
  whileHover: {
    scale: 1.03,
    transition: { type: "spring" as const, stiffness: 400, damping: 15 }
  },
  whileTap: { scale: 0.98 }
});

const Orb = ({ size, initialX, initialY, colorFrom, colorTo }: { size: string, initialX: string, initialY: string, colorFrom:string, colorTo: string }) => (
  <motion.div
    className={`absolute ${size} rounded-full opacity-30 dark:opacity-20 blur-3xl`}
    style={{ background: `radial-gradient(circle, ${colorFrom} 0%, ${colorTo} 70%)` }}
    initial={{ x: initialX, y: initialY, scale: 0.8, opacity: 0 }}
    animate={{
      x: [initialX, `calc(${initialX} + 30px)`, initialX],
      y: [initialY, `calc(${initialY} - 30px)`, initialY],
      scale: [0.9, 1.1, 0.9],
      opacity: [0, 0.25, 0],
      transition: { duration: 25, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 5 }
    }}
  />
);

export default function WelcomeStep() {
  const { nextStep } = useOnboarding();
  const currentUser = useCurrentUser();
  const { sendJsonMessage, isConnected, connect: connectWebSocket } = useWebSocket();
  const logoutUser = useAppStore((state) => state.logout);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [backups, setBackups] = useState<{ filename: string }[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const storeHasHydrated = useAppStore.persist.hasHydrated();
  const isAdmin = storeHasHydrated && currentUser?.role === UserRole.ADMIN;

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/backups')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.backups)) {
            setBackups(data.backups);
          } else {
            setBackups([]);
          }
        })
        .catch(error => {
          console.error("Failed to fetch backups:", error);
          setBackups([]);
        });
    }
  }, [isAdmin]);

  const handleRestore = async () => {
    if (!selectedBackup) {
      toast.warning("Please select a backup file to restore.");
      return;
    }
    setIsRestoring(true);
    toast.info("Starting restore...", { description: `Restoring from ${selectedBackup}`});
    try {
      const response = await fetch(`/api/backups/${selectedBackup}`);
      if (!response.ok) throw new Error('Failed to fetch backup file from server.');
      
      const backupData: BackupFileContent = await response.json();
      await restoreFromBackupContent(backupData, { isConnected, connect: connectWebSocket, sendJsonMessage }, logoutUser);
      // The page will reload after restore, no need to setIsRestoring(false)
    } catch (error) {
      toast.error('Failed to restore backup', { description: (error as Error).message });
      setIsRestoring(false);
    }
  }

  return (
    <>
      <div className={`relative h-full w-full flex flex-col items-center justify-center overflow-hidden 
                     bg-gradient-to-br from-slate-100 via-sky-100 to-indigo-100 
                     dark:from-neutral-900 dark:via-sky-950 dark:to-indigo-950 
                     ${styles['animated-gradient']} p-4 rounded-lg`}>

        <Orb size="w-72 h-72 md:w-96 md:h-96" initialX="-25%" initialY="5%" colorFrom="hsla(var(--primary)/0.4)" colorTo="hsla(var(--primary)/0.05)" />
        <Orb size="w-64 h-64 md:w-80 md:h-80" initialX="65%" initialY="55%" colorFrom="hsla(220, 90%, 60%, 0.3)" colorTo="hsla(220, 90%, 60%, 0.05)" />
        <Orb size="w-48 h-48 md:w-64 md:h-64" initialX="20%" initialY="80%" colorFrom="hsla(180, 80%, 50%, 0.2)" colorTo="hsla(180, 80%, 50%, 0.05)" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`relative z-1 flex flex-col items-center justify-center text-center 
                     w-full max-w-2xl p-6 sm:p-10 
                     bg-card/70 dark:bg-card/60 backdrop-blur-2xl
                     shadow-2xl dark:shadow-black/50 rounded-2xl border border-white/20 dark:border-white/10`}
        >
          <motion.div variants={itemVariants(0.1, 40, 8)} className="mb-6">
            <AppLogo className="h-20 w-20 sm:h-24 sm:w-24 drop-shadow-xl" />
          </motion.div>

          <motion.h1 variants={itemVariants(0.2, 35, 6)}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">
            Welcome to <span className={`text-transparent bg-clip-text 
              bg-gradient-to-r from-primary via-primary/80 to-primary-focus
              dark:from-primary-light dark:via-primary dark:to-primary-focus
              inline-block drop-shadow-sm`}>{APP_NAME}!</span>
          </motion.h1>

          <motion.p variants={itemVariants(0.3, 30, 4)}
            className="text-base sm:text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
            Let's get your regenerative energy minigrid monitoring system up and running in just a few clicks.
          </motion.p>
          
          <motion.div
            variants={itemVariants(0.4, 25, 3)}
            className="flex items-start gap-4 text-sm text-amber-900 dark:text-amber-200 w-full max-w-lg mb-8 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 shadow-md ring-1 ring-inset ring-amber-500/20 dark:bg-amber-950/20"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }}}
            >
              <AlertTriangle className="flex-shrink-0 w-6 h-6 text-amber-500" />
            </motion.div>
            <div className="text-left">
              <strong className="block mb-1">This is a Beta Version</strong>
              To avoid data loss, please do not edit critical information. Your changes are temporary as there is no database connected.
            </div>
          </motion.div>
          
          <div className="flex flex-col items-center gap-4 w-full max-w-md">
            <motion.div {...buttonMotionProps(0.5)} className="w-full">
              <Button
                size="lg"
                onClick={nextStep}
                className={`w-full h-14 text-lg font-semibold rounded-xl group shadow-lg relative overflow-hidden ${styles['button-shine']}
                bg-gradient-to-r from-primary to-primary-focus hover:shadow-primary/30 dark:hover:shadow-primary-light/20
                text-primary-foreground focus-visible:ring-primary/60 transition-all duration-300 ease-out transform`}
              >
                <Sparkles className="mr-3 h-6 w-6 text-yellow-300 transition-transform duration-500 ease-out group-hover:scale-125 group-hover:rotate-[30deg]" />
                Start New Setup
              </Button>
            </motion.div>
            
            {isAdmin && (
              <Tabs defaultValue="server" className="w-full mt-4">
                <motion.div variants={itemVariants(0.6, 20, 2)}>
                  <TabsList className="grid w-full grid-cols-2 bg-muted/80 dark:bg-neutral-800/80">
                    <TabsTrigger value="server"><Server className="w-4 h-4 mr-2"/>Restore from Server</TabsTrigger>
                    <TabsTrigger value="file"><Upload className="w-4 h-4 mr-2"/>Import from File</TabsTrigger>
                  </TabsList>
                </motion.div>
                <motion.div variants={itemVariants(0.7, 15, 1)}>
                  <TabsContent value="server" className="mt-4">
                      {backups.length > 0 ? (
                        <div className="w-full space-y-3 p-4 rounded-md border bg-background/50">
                          <p className="text-sm text-muted-foreground text-left">Select a recent periodic backup to restore the system state.</p>
                          <Select onValueChange={setSelectedBackup}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose a backup file..." />
                            </SelectTrigger>
                            <SelectContent>
                              {backups.map(backup => (
                                <SelectItem key={backup.filename} value={backup.filename}>{backup.filename}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={handleRestore} disabled={!selectedBackup || isRestoring} className="w-full">
                            {isRestoring ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<RotateCw className="mr-2 h-4 w-4"/>)}
                            {isRestoring ? 'Restoring...' : 'Restore Selected Backup'}
                          </Button>
                        </div>
                      ) : (
                         <div className="text-sm text-muted-foreground mt-6">No server backups found.</div>
                      )}
                  </TabsContent>
                  <TabsContent value="file" className="mt-4">
                     <div className="w-full p-4 rounded-md border bg-background/50 flex flex-col items-center gap-3">
                         <p className="text-sm text-muted-foreground">Upload a <code className="text-xs">.json</code> backup file to overwrite local settings.</p>
                         <Button
                            variant="outline"
                            onClick={() => setIsImportDialogOpen(true)}
                            className="w-full group"
                          >
                           <Upload className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                           Choose a Backup File...
                         </Button>
                     </div>
                  </TabsContent>
                </motion.div>
              </Tabs>
            )}
          </div>

          <motion.p variants={itemVariants(isAdmin ? 0.8 : 0.6, 15, 0)}
            className="text-xs text-muted-foreground mt-10 max-w-sm flex items-center">
            <ShieldCheck className="inline h-4 w-4 mr-1.5 text-green-500 shrink-0" />
            A seamless setup ensures peak performance and reliable data.
          </motion.p>
        </motion.div>

        <AnimatePresence>
          {isImportDialogOpen && (
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogContent className={`sm:max-w-lg md:max-w-xl w-[95vw] p-0 max-h-[90vh] flex flex-col
              bg-card/90 dark:bg-neutral-800/90 backdrop-blur-md focus:outline-none focus-visible:ring-0
              shadow-2xl rounded-xl border border-border/50`}>
                <DialogHeader className="p-6 border-b">
                  <DialogTitle className="text-xl font-semibold flex items-center">
                    <RotateCw className="w-5 h-5 mr-3 text-primary"/> Restore Configuration
                  </DialogTitle>
                  <DialogDescription>
                    Import data from a valid <code className="text-xs bg-muted p-1 rounded-md">.json</code> backup. This will overwrite all current local settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto p-6">
                  <ImportBackupDialogContent onDialogClose={() => setIsImportDialogOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}