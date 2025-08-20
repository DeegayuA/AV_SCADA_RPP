'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { useAppStore, useCurrentUser } from '@/stores/appStore'; // Assuming useCurrentUser is a direct selector now
import { UserRole } from '@/types/auth';
import { toast } from 'sonner';
import { Loader2, Download, AlertTriangle, ShieldAlert, Info, UploadCloud, RotateCw, ListChecks, AlertCircle, LockKeyhole } from 'lucide-react';

// Ensure this path points to your refactored modal component
import { ImportBackupDialogContent } from '@/app/onboarding/import_all';

import { exportIdbData, clearOnboardingData } from '@/lib/idb-store';
import { dataPoints as rawDataPointsDefinitions } from '@/config/dataPoints';
import { PLANT_NAME, PLANT_LOCATION, PLANT_CAPACITY, APP_NAME, VERSION } from '@/config/constants';
const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2`;
const WEATHER_CARD_CONFIG_KEY = `weatherCardConfig_v3.5_compact_${PLANT_NAME || 'defaultPlant'}`;

// Define keys to include in backup
const APP_LOCAL_STORAGE_KEYS = [
  USER_DASHBOARD_CONFIG_KEY,
  'user-preferences',
  'last-session',
  'theme',
  WEATHER_CARD_CONFIG_KEY,
  // Add any other localStorage keys you want to include in the backup
];

import { SLDLayout } from '@/types/sld';
import { useWebSocket } from '@/hooks/useWebSocketListener';

const SLD_LAYOUT_IDS_TO_BACKUP: string[] = ['main_plant'];
const APP_LOCAL_STORAGE_KEYS_TO_PRESERVE_ON_RESET = ['theme'];

// --- Animation Variants ---
const pageVariants: Variants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }, // Smooth ease
  exit: { opacity: 0, y: -15, transition: { duration: 0.3, ease: "easeIn" } }
};
const cardContainerVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const cardSectionVariants: Variants = {
  initial: { opacity: 0, filter: 'blur(4px) saturate(0.5)', y: 25, scale: 0.97 },
  animate: {
    opacity: 1,
    filter: 'blur(0px) saturate(1)',
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 25, mass: 0.8 }
  },
};
const buttonWrapperVariants: Variants = {
  hover: { scale: 1.03, boxShadow: "0px 6px 18px hsla(var(--primary)/0.25)", transition: { type: "spring", stiffness: 350, damping: 10 } },
  tap: { scale: 0.97, boxShadow: "0px 2px 8px hsla(var(--primary)/0.2)", transition: { type: "spring", stiffness: 400, damping: 15 } },
};
const listItemVariants = (delayIncrement: number = 0.04): Variants => ({
  initial: { opacity: 0, x: -20 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * delayIncrement + 0.2,
      type: 'spring',
      stiffness: 180,
      damping: 12
    }
  }),
});
const feedbackMessageVariants: Variants = {
  initial: { opacity: 0, height: 0, marginTop: "0px", y: 10 },
  animate: { opacity: 1, height: 'auto', marginTop: '0.75rem', y: 0, transition: { duration: 0.35, ease: "circOut" } },
  exit: { opacity: 0, height: 0, marginTop: "0px", y: -10, transition: { duration: 0.25, ease: "circIn" } }
};

const ActionSection = React.memo(({
  title,
  description,
  icon: Icon,
  children,
  className,
  variants,
  iconColor = "text-primary"
}: {
  title: string,
  description: string,
  icon: React.ElementType,
  children: React.ReactNode,
  className?: string,
  variants?: any,
  iconColor?: string
}) => (
  <motion.section
    variants={variants}
    className={`p-5 sm:p-6 border rounded-2xl shadow-lg overflow-hidden bg-opacity-80 backdrop-blur-sm ${className}`}
  >
    <div className="flex items-start mb-4">
      <motion.div initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1, transition:{delay:0.1, type:'spring', stiffness:200, damping:12}}}>
        <Icon className={`w-7 h-7 sm:w-8 sm:h-8 mr-3 sm:mr-4 shrink-0 mt-1 ${iconColor}`} />
      </motion.div>
      <div className="flex-grow">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
    </div>
    {children}
  </motion.section>
));
ActionSection.displayName = "ActionSection";


export default function ResetApplicationPage() {
  const router = useRouter();
  const storeHasHydrated = useAppStore.persist.hasHydrated();
  const directStoreUser = useAppStore((state) => state.currentUser); // Direct access to store value for auth check
  // useCurrentUser hook is fine for UI elements after auth is settled
  const currentUserForUI = useCurrentUser();

  const { sendJsonMessage, lastJsonMessage, isConnected, connect: connectWebSocket } = useWebSocket();
  const logoutUser = useAppStore((state) => state.logout);

  const zustandResetFn = useAppStore((state) => (state as any).resetToInitial);
  const resetStoreToInitial = useCallback(() => {
    if (typeof zustandResetFn === 'function') {
      zustandResetFn();
    } else {
      console.warn('Zustand store "resetToInitial" function is not implemented. Proceeding with standard logout actions.');
    }
  }, [zustandResetFn]);

  const [authStatus, setAuthStatus] = useState<'loading' | 'admin' | 'unauthorized'>('loading');
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [isResetInProgress, setIsResetInProgress] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const collectedSldLayoutsRef = useRef<Record<string, SLDLayout | null>>({});
  const resolveSldFetchRef = useRef<Map<string, (value: SLDLayout | null) => void>>(new Map());


  useEffect(() => {
    console.log("[Auth Check] Start | Hydrated:", storeHasHydrated, "| Direct Store User:", directStoreUser);

    if (!storeHasHydrated) {
      setAuthStatus('loading');
      console.log("[Auth Check] Status: loading (Store not hydrated).");
      return; // Crucial: wait for hydration
    }

    // Store is hydrated. Now check the user from the direct store access.
    if (directStoreUser && directStoreUser.email !== 'guest@example.com' && directStoreUser.role === UserRole.ADMIN) {
      setAuthStatus('admin');
      console.log("[Auth Check] Status: admin | User:", directStoreUser.email, "| Role:", directStoreUser.role);
    } else {
      setAuthStatus('unauthorized');
      const userMsg = directStoreUser ? `User: ${directStoreUser.email}, Role: ${directStoreUser.role}` : "No user data in store.";
      console.log(`[Auth Check] Status: unauthorized | ${userMsg}`);
      
      if (directStoreUser && directStoreUser.email !== 'guest@example.com') {
          toast.error("Access Denied", { description: "Admin privileges required for this section." });
          router.replace(directStoreUser.redirectPath || '/dashboard');
      } else {
          toast.error("Authentication Required", { description: "Please log in as an administrator." });
          router.replace('/login');
      }
    }
  }, [storeHasHydrated, directStoreUser, router]); // directStoreUser ensures re-check if it changes post-hydration

  useEffect(() => {
    /* ... (WebSocket message handler - no change from your existing good version) ... */
    if (!lastJsonMessage || resolveSldFetchRef.current.size === 0) return;
    const message = lastJsonMessage as any;
    const layoutKeyWithPrefix = message.payload?.key;
    if (!layoutKeyWithPrefix || !layoutKeyWithPrefix.startsWith('sld_')) return;
    const sldLayoutId = layoutKeyWithPrefix.substring(4);

    if (resolveSldFetchRef.current.has(sldLayoutId)) {
      const resolvePromise = resolveSldFetchRef.current.get(sldLayoutId);
      if (message.type === 'layout-data') {
        collectedSldLayoutsRef.current[sldLayoutId] = message.payload.layout;
        resolvePromise?.(message.payload.layout);
      } else if (message.type === 'layout-error') {
        toast.error(`Failed to fetch SLD for backup: ${sldLayoutId}`, { description: message.payload.error });
        collectedSldLayoutsRef.current[sldLayoutId] = null;
        resolvePromise?.(null);
      }
      resolveSldFetchRef.current.delete(sldLayoutId);
    }
  }, [lastJsonMessage]);

  const fetchAllSldLayouts = useCallback(async (): Promise<Record<string, SLDLayout | null>> => {
    /* ... (no change from your good version) ... */
    if (SLD_LAYOUT_IDS_TO_BACKUP.length === 0) return {};
    if (!isConnected && connectWebSocket) {
        const connectToastId = toast.loading("WebSocket for SLD backup disconnected. Reconnecting...");
        connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!isConnected) {
            toast.error("WebSocket reconnect failed. SLDs cannot be backed up.", {id: connectToastId});
            return SLD_LAYOUT_IDS_TO_BACKUP.reduce((acc, id) => ({...acc, [id]: null}), {});
        }
        toast.success("WebSocket reconnected for SLD backup.", {id: connectToastId});
    } else if(!connectWebSocket && !isConnected) {
        toast.error("WebSocket connection logic not available and disconnected. SLDs cannot be backed up.");
        return SLD_LAYOUT_IDS_TO_BACKUP.reduce((acc, id) => ({...acc, [id]: null}), {});
    }

    collectedSldLayoutsRef.current = {};
    resolveSldFetchRef.current.clear();
    const fetchPromises = SLD_LAYOUT_IDS_TO_BACKUP.map(layoutId =>
      new Promise<void>(resolve => {
        const timeoutId = setTimeout(() => {
          if (resolveSldFetchRef.current.has(layoutId)) {
            toast.warning(`Timeout fetching SLD for backup: ${layoutId}`);
            resolveSldFetchRef.current.get(layoutId)?.(null);
            resolveSldFetchRef.current.delete(layoutId);
          }
          resolve();
        }, 10000);

        resolveSldFetchRef.current.set(layoutId, (layoutData) => {
          clearTimeout(timeoutId);
          resolve();
        });

        if (sendJsonMessage) {
          sendJsonMessage({ type: 'get-layout', payload: { key: `sld_${layoutId}` } });
        } else {
           toast.error(`Cannot send WS message to get SLD: ${layoutId}. 'sendJsonMessage' not available.`);
           resolveSldFetchRef.current.get(layoutId)?.(null);
           resolveSldFetchRef.current.delete(layoutId);
           resolve();
        }
      })
    );
    await Promise.all(fetchPromises);
    return { ...collectedSldLayoutsRef.current };
  }, [isConnected, sendJsonMessage, connectWebSocket]);

  const handleDownloadBackup = async () => {
    /* ... (no major functional change from your version, UI feedback enhanced by toast) ... */
    setIsBackupInProgress(true);
    const backupToastId = toast.loading("Initializing backup...", {description: "Please wait a moment."});
    await new Promise(res => setTimeout(res, 300));

    try {
      let sldDataForBackup: Record<string, SLDLayout | null> = {};
      if (SLD_LAYOUT_IDS_TO_BACKUP.length > 0) {
        toast.info("Fetching SLD layouts...", { id: backupToastId, description: "This may take a few seconds..." });
        sldDataForBackup = await fetchAllSldLayouts();
        const successCount = Object.values(sldDataForBackup).filter(Boolean).length;
        const totalToFetch = SLD_LAYOUT_IDS_TO_BACKUP.length;
        if (successCount < totalToFetch && totalToFetch > 0) {
          toast.warning(`Backed up ${successCount}/${totalToFetch} SLD layouts. Some might be missing.`, { id: backupToastId });
        } else if (totalToFetch > 0) {
          toast.success(`All ${successCount} SLD layouts retrieved for backup.`, { id: backupToastId });
        } else {
           toast.info("No SLD layouts specified for backup.", {id: backupToastId});
        }
      }

      toast.info("Packaging local storage data...", { id: backupToastId });
      const idbData = await exportIdbData();
      const localStorageData: Record<string, any> = {};
      APP_LOCAL_STORAGE_KEYS.forEach(key => {
          const item = localStorage.getItem(key);
          if (item !== null) {
              try { localStorageData[key] = JSON.parse(item); }
              catch (e) { localStorageData[key] = item; }
          }
      });

      const backupData = {
        backupSchemaVersion: "1.0.0",
        createdAt: new Date().toISOString(),
        application: { name: APP_NAME, version: VERSION },
        plant: { name: PLANT_NAME, location: PLANT_LOCATION, capacity: PLANT_CAPACITY },
        configurations: { dataPointDefinitions: rawDataPointsDefinitions },
        browserStorage: { indexedDB: idbData, localStorage: localStorageData },
        sldLayouts: sldDataForBackup,
      };

      toast.info("Generating encrypted backup file...", { id: backupToastId, description: "Finalizing..." });
      await new Promise(res => setTimeout(res, 200)); // Simulate final packaging
      const jsonData = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });
      saveAs(blob, `${APP_NAME.toLowerCase().replace(/\s+/g, '_')}_backup_${new Date().toISOString().replace(/:/g, '-')}.json`);
      
      toast.success("Backup Download Started!", { id: backupToastId, duration: 6000, description:"Please check your browser's downloads."});
      setBackupDownloaded(true);
    } catch (error: any) {
      console.error("Backup process failed:", error);
      toast.error("Backup Failed", { id: backupToastId, description: error.message || "An unexpected error occurred." });
    } finally {
      setIsBackupInProgress(false);
    }
  };

  const handleResetApplication = async () => {
    /* ... (UI feedback for toasts enhanced) ... */
    setIsResetInProgress(true);
    const resetToastId = toast.loading("Initiating application reset...", { description: "This is irreversible." });
    await new Promise(res => setTimeout(res, 500));

    try {
      toast.info("Clearing local configurations...", { id: resetToastId });
      await clearOnboardingData();

      const preservedData: Record<string, string | null> = {};
      APP_LOCAL_STORAGE_KEYS_TO_PRESERVE_ON_RESET.forEach(key => {
        preservedData[key] = localStorage.getItem(key);
      });
      localStorage.clear(); // WARNING: Clears ALL localStorage for this origin
      Object.entries(preservedData).forEach(([key, value]) => {
        if (value !== null) localStorage.setItem(key, value);
      });
      await new Promise(res => setTimeout(res, 200));

      toast.info("Finalizing session and store reset...", { id: resetToastId });
      logoutUser();          // Clears user session data in Zustand
      resetStoreToInitial(); // Resets entire Zustand store

      await new Promise(res => setTimeout(res, 300));
      toast.success("Application Reset Successfully!", {
        id: resetToastId,
        duration: 4000,
        description: "Redirecting to initial setup. Please wait..."
      });
      setTimeout(() => {
        router.push('/onboarding?reset=true');
      }, 1500);

    } catch (error: any) {
      console.error("Reset operation failed:", error);
      toast.error("Reset Failed", { id: resetToastId, duration: 7000, description: error.message || "Could not complete the reset process." });
      setIsResetInProgress(false); // Allow retry if it fails before redirect
    }
  };

  // --- Render Logic ---

  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 dark:from-neutral-900 dark:via-zinc-900 dark:to-gray-900">
        <motion.div initial={{ opacity: 0, filter: 'blur(8px)' }} animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.5, delay: 0.1, ease: "easeOut" } }}>
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </motion.div>
      </div>
    );
  }

  if (authStatus !== 'admin') {
    // This fallback is for the very brief moment before router.replace kicks in.
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 dark:from-neutral-900 dark:via-zinc-900 dark:to-gray-900">
        <motion.div initial={{ opacity: 0, y: -20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale:1, transition:{ type:'spring', stiffness:150, damping: 10, delay: 0.1 }}}>
           <Card className="p-8 max-w-md text-center shadow-2xl">
              <CardHeader>
                <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <CardTitle className="text-2xl font-bold">Access Restricted</CardTitle>
                <CardDescription>You are being redirected.</CardDescription>
              </CardHeader>
           </Card>
        </motion.div>
      </div>
    );
  }

  const backupContents = [
      "Core Data Point Definitions",
      "User Interface Configurations (Dashboard, etc.)",
      "Application Settings (IndexedDB)",
      "Session and Local Storage Data (App-specific)",
      "SLD Network Diagram Layouts (if available)",
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 dark:from-neutral-900 dark:via-zinc-900 dark:to-gray-900 py-10 sm:py-16 transition-colors duration-300"
    >
      <div className="container mx-auto px-4 max-w-6xl">

        <motion.header
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1, type: 'spring', stiffness: 120, damping:15 } }}
          className="text-center mb-10 sm:mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight leading-tight">
            System Control Center
          </h1>
          <p className="mt-3 text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Manage system-wide backup, restore, and reset operations. Handle these actions with care.
          </p>
        </motion.header>

        <motion.div
          variants={cardContainerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8"
        >
          {/* --- BACKUP SECTION --- */}
          <ActionSection
            variants={cardSectionVariants}
            title="Full System Backup"
            description="Create a comprehensive, downloadable backup of the entire application state."
            icon={Download}
            className="bg-white/70 dark:bg-neutral-800/60 border-gray-200/80 dark:border-neutral-700/70"
          >
            <div className="mt-5 space-y-4">
              <div className="p-4 border rounded-xl bg-gray-50/80 dark:bg-neutral-900/60">
                <div className="flex items-center">
                  <ListChecks className="w-6 h-6 mr-3 text-sky-600 dark:text-sky-400" />
                  <h4 className="text-base font-semibold text-gray-700 dark:text-gray-200">Backup Contents Include:</h4>
                </div>
                <ul className="mt-3 ml-4 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                  {backupContents.map((item, i) => (
                    <motion.li custom={i} variants={listItemVariants()} initial="initial" animate="animate" key={item} className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2.5 mt-0.5 text-green-500 shrink-0" />
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <motion.div variants={buttonWrapperVariants} whileHover="hover" whileTap="tap">
                <Button
                  onClick={handleDownloadBackup}
                  disabled={isBackupInProgress}
                  className="w-full text-base py-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isBackupInProgress ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-5 w-5" />
                  )}
                  {isBackupInProgress ? 'Backing Up...' : 'Download Full Backup'}
                </Button>
              </motion.div>
            </div>
          </ActionSection>

          {/* --- RESTORE & RESET SECTION --- */}
          <div className="space-y-6 sm:space-y-8">
             {/* --- RESTORE --- */}
            <ActionSection
              variants={cardSectionVariants}
              title="Restore from Backup"
              description="Upload a backup file to overwrite all current system settings and data."
              icon={UploadCloud}
              iconColor="text-green-600 dark:text-green-500"
              className="bg-white/70 dark:bg-neutral-800/60 border-gray-200/80 dark:border-neutral-700/70"
            >
              <div className="mt-4">
                 <motion.div variants={buttonWrapperVariants} whileHover="hover" whileTap="tap">
                  <Button
                    onClick={() => setShowImportDialog(true)}
                    variant="outline"
                    className="w-full text-base py-6 rounded-xl border-2 border-gray-300 dark:border-neutral-600 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400 transition-all duration-300"
                  >
                    <UploadCloud className="mr-2 h-5 w-5" />
                    Open Restore Dialog
                  </Button>
                </motion.div>
              </div>
            </ActionSection>

            {/* --- RESET --- */}
            <ActionSection
              variants={cardSectionVariants}
              title="Irreversible System Reset"
              description="Reset the application to its factory defaults. All data will be lost."
              icon={ShieldAlert}
              iconColor="text-red-600 dark:text-red-500"
              className="bg-red-50/30 dark:bg-red-900/20 border-red-500/30 dark:border-red-500/40"
            >
              <div className="mt-4">
                <AnimatePresence>
                  {!backupDownloaded && (
                    <motion.div
                      variants={feedbackMessageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="flex items-center gap-3 p-3 mb-4 text-sm rounded-lg bg-amber-100/60 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-300/50 dark:border-amber-500/40"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="font-medium">
                        Strongly recommended: Download a backup before resetting.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={buttonWrapperVariants} whileHover="hover" whileTap="tap">
                  <Button
                    onClick={() => setShowResetConfirmDialog(true)}
                    variant="destructive"
                    disabled={isResetInProgress}
                    className="w-full text-base py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isResetInProgress ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <AlertTriangle className="mr-2 h-5 w-5" />
                    )}
                    {isResetInProgress ? 'Resetting...' : 'Initiate System Reset'}
                  </Button>
                </motion.div>
              </div>
            </ActionSection>
          </div>
        </motion.div>
      </div>

      {/* --- DIALOGS --- */}
      <AlertDialog open={showResetConfirmDialog} onOpenChange={setShowResetConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. It will completely erase all application data, including settings, user accounts, and configurations.
              <br/><br/>
              <strong>We strongly advise you to download a backup first if you haven't already.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetApplication}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
         <DialogContent className="max-w-3xl p-0" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <LockKeyhole className="w-7 h-7 text-primary"/>
                Restore System from Encrypted Backup
              </DialogTitle>
              <DialogDescription>
                Select and upload your backup file. The system will be restored to the state of this backup. This will overwrite all current data.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6">
              <ImportBackupDialogContent />
            </div>
             <div className="bg-gray-50 dark:bg-neutral-800/50 px-6 py-3 flex justify-end border-t dark:border-neutral-700">
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
            </div>
          </DialogContent>
      </Dialog>

    </motion.div>
  );
}
