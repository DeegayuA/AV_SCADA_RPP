'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose
} from '@/components/ui/dialog';
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

// Define keys to include in backup
const APP_LOCAL_STORAGE_KEYS = [
  USER_DASHBOARD_CONFIG_KEY,
  'user-preferences',
  'last-session',
  'theme',
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
  animate: { opacity: 1, filter: 'blur(0px) saturate(1)', y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 25, mass: 0.8 } },
};
const buttonWrapperVariants: Variants = {
  hover: { scale: 1.03, boxShadow: "0px 6px 18px hsla(var(--primary)/0.25)", transition: { type: "spring", stiffness: 350, damping: 10 } },
  tap: { scale: 0.97, boxShadow: "0px 2px 8px hsla(var(--primary)/0.2)", transition: { type: "spring", stiffness: 400, damping: 15 } },
};
const listItemVariants = (delayIncrement: number = 0.04): Variants => ({
  initial: { opacity: 0, x: -20 },
  animate: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * delayIncrement + 0.2, type: 'spring', stiffness: 180, damping: 12 }}),
});
const feedbackMessageVariants: Variants = {
  initial: { opacity: 0, height: 0, marginTop: "0px", y: 10 },
  animate: { opacity: 1, height: 'auto', marginTop: '0.75rem', y: 0, transition: { duration: 0.35, ease: "circOut" } },
  exit: { opacity: 0, height: 0, marginTop: "0px", y: -10, transition: { duration: 0.25, ease: "circIn" } }
};

const ActionSection = React.memo(({ title, description, icon: Icon, children, className, variants, iconColor = "text-primary" } : 
  {title: string, description: string, icon: React.ElementType, children: React.ReactNode, className?: string, variants?: any, iconColor?: string }) => (
  <motion.section variants={variants} className={`p-5 sm:p-6 border rounded-2xl shadow-lg overflow-hidden bg-opacity-80 backdrop-blur-sm ${className}`}>
    <div className="flex items-start mb-3 sm:mb-4">
      <motion.div initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1, transition:{delay:0.1, type:'spring', stiffness:200, damping:12}}}>
         <Icon className={`w-7 h-7 sm:w-8 sm:h-8 mr-3 sm:mr-4 shrink-0 mt-1 ${iconColor}`} />
      </motion.div>
      <div>
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
    <div className="mt-4">{children}</div>
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


  useEffect(() => { /* ... (WebSocket message handler - no change from your existing good version) ... */
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

  const fetchAllSldLayouts = useCallback(async (): Promise<Record<string, SLDLayout | null>> => { /* ... (no change from your good version) ... */
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

  const handleDownloadBackup = async () => { /* ... (no major functional change from your version, UI feedback enhanced by toast) ... */
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

  const handleResetApplication = async () => { /* ... (UI feedback for toasts enhanced) ... */
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
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-neutral-900 text-slate-200 z-50">
        <motion.div initial={{ opacity: 0, filter: 'blur(8px)' }} animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.5, delay: 0.1, ease: "easeOut" } }}>
          <Loader2 className="h-16 w-16 sm:h-20 sm:w-20 animate-spin text-primary mb-6" />
        </motion.div>
        <motion.p initial={{ opacity: 0, y:15 }} animate={{ opacity: 1, y:0, transition:{delay:0.3, type:'spring', stiffness:100}}} 
            className="text-xl sm:text-2xl font-medium text-slate-300">
            Verifying Administrator Access...
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition:{delay:0.5}}}
            className="text-sm text-slate-400 mt-2">
            Securing session...
        </motion.p>
      </div>
    );
  }

  if (authStatus !== 'admin') {
    return (
      // This fallback is for the very brief moment before router.replace kicks in.
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-rose-900 text-rose-100 p-6 text-center z-50">
        <motion.div initial={{ opacity: 0, y: -20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale:1, transition:{ type:'spring', stiffness:150, damping: 10, delay: 0.1 }}}>
            <AlertTriangle className="h-16 w-16 sm:h-20 sm:w-20 text-rose-300 mb-4 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Access Restricted</h1>
            <p className="text-rose-200 text-sm sm:text-base">Redirecting to a safe place...</p>
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
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 dark:from-neutral-900 dark:via-zinc-900 dark:to-gray-900 py-10 sm:py-16 transition-colors duration-300"
    >
      <div className="container mx-auto px-4">
        <motion.header 
            initial={{ opacity: 0, y: -25 }} 
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1, type: 'spring', stiffness: 120, damping:15 } }}
            className="text-center mb-10 sm:mb-16"
        >
          <ShieldAlert className="w-14 h-14 sm:w-20 sm:w-20 mx-auto mb-4 text-primary drop-shadow-lg" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            Application Data Management
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Essential administrative tools to securely backup, restore, or reset your application's operational data.
          </p>
        </motion.header>

        <motion.main 
            variants={cardContainerVariants} initial="initial" animate="animate"
            className="grid grid-cols-1 gap-6 sm:gap-8 max-w-4xl mx-auto"
        >
          <ActionSection 
            variants={cardSectionVariants} 
            title="Download Full Application Backup" 
            description="Secure the current application state. Essential before any major changes or system reset."
            icon={Download}
            iconColor="text-emerald-500 dark:text-emerald-400"
            className="bg-white dark:bg-neutral-800/60 border-emerald-500/30 dark:border-emerald-500/40"
          >
            <div className="text-xs text-muted-foreground mb-4 pl-1">This backup includes:
              <ul className="list-none mt-2 space-y-1.5">
                {backupContents.map((item, index) => (
                  <motion.li key={item} custom={index} variants={listItemVariants(0.035)} initial="initial" animate="animate" className="flex items-center">
                    <ListChecks className="w-4 h-4 mr-2.5 text-emerald-500 shrink-0" /> {item}
                  </motion.li>
                ))}
              </ul>
            </div>
            {!isConnected && SLD_LAYOUT_IDS_TO_BACKUP.length > 0 && connectWebSocket && (
                <motion.div initial={{opacity:0, y:5}} animate={{opacity:1,y:0}} className="p-3 mb-4 rounded-lg bg-yellow-400/10 border border-yellow-500/40 text-yellow-700 dark:text-yellow-300 text-xs sm:text-sm flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2.5 shrink-0" />
                    <span>WebSocket offline. SLD diagrams may not be included.
                        <Button variant="link" size="sm" onClick={connectWebSocket} className="p-0 h-auto text-yellow-700 dark:text-yellow-300 hover:underline font-semibold ml-1.5">Attempt Reconnect</Button>
                    </span>
                </motion.div>
            )}
            <motion.div variants={buttonWrapperVariants} whileHover="hover" whileTap="tap">
                <Button onClick={handleDownloadBackup} disabled={isBackupInProgress || isResetInProgress || showImportDialog} 
                    className="w-full text-sm sm:text-base py-3 shadow-md hover:shadow-lg transition-all duration-200 bg-emerald-500 hover:bg-emerald-600 text-white group" size="lg">
                {isBackupInProgress ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5 transition-transform group-hover:translate-y-[-2px]" />}
                Download Secure Backup
                </Button>
            </motion.div>
            <AnimatePresence>
            {backupDownloaded && (
                <motion.p variants={feedbackMessageVariants} initial="initial" animate="animate" exit="exit"
                    className="text-sm text-green-700 dark:text-green-400 flex items-center font-medium bg-green-500/10 p-3 rounded-lg border border-green-500/40">
                    <Info className="w-5 h-5 mr-2.5 shrink-0" />Backup initiated successfully! Check your browser downloads.
                </motion.p>
            )}
            </AnimatePresence>
          </ActionSection>

          <ActionSection 
            variants={cardSectionVariants} 
            title="Restore from Backup" 
            description="Upload a previously saved backup to restore the application's settings and data. This will overwrite current local data."
            icon={UploadCloud}
            iconColor="text-blue-500 dark:text-blue-400"
            className="bg-white dark:bg-neutral-800/60 border-blue-500/30 dark:border-blue-500/40"
          >
            <p className="text-xs text-muted-foreground mb-4 pl-1">
                Utilize this to recover a previous state or set up a new instance with existing configurations from a <code className="text-xs bg-gray-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded-md">.json</code> backup.
            </p>
            <motion.div variants={buttonWrapperVariants} whileHover="hover" whileTap="tap">
            <Button onClick={() => setShowImportDialog(true)} disabled={isBackupInProgress || isResetInProgress} 
                className="w-full text-sm sm:text-base py-3 shadow-md hover:shadow-lg transition-all duration-200 border-blue-500 text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:border-blue-600 hover:bg-blue-500/10 group" 
                variant="outline" size="lg">
              <UploadCloud className="mr-2 h-5 w-5 transition-transform group-hover:translate-y-[-2px] group-hover:text-blue-500" />
              Import Data from Backup File
            </Button>
            </motion.div>
          </ActionSection>

          <ActionSection 
            variants={cardSectionVariants} 
            title="Reset to Factory Defaults" 
            description="Irreversibly clear all local application data. The system will return to its initial out-of-the-box state."
            icon={RotateCw}
            iconColor="text-red-500 dark:text-red-400"
            className="bg-red-500/5 dark:bg-red-900/20 border-red-500/30 dark:border-red-500/40"
          >
             <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start">
                <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 mr-2.5 shrink-0 mt-px" />
                <div>
                    <strong className="font-semibold">Critical Action:</strong> This operation is permanent and cannot be undone. 
                    A backup is highly recommended beforehand.
                </div>
            </div>
            <motion.div variants={buttonWrapperVariants} whileHover="hover" whileTap="tap">
            <Button variant="destructive" onClick={() => setShowResetConfirmDialog(true)} 
                disabled={!backupDownloaded || isResetInProgress || isBackupInProgress || showImportDialog} 
                className="w-full text-sm sm:text-base py-3 shadow-md hover:shadow-lg transition-all duration-200 bg-red-600 hover:bg-red-700 text-white group" size="lg">
              {isResetInProgress ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RotateCw className="mr-2 h-5 w-5 transition-transform group-hover:rotate-[45deg]" />}
              Proceed with Full Reset
            </Button>
            </motion.div>
            <AnimatePresence>
            {!backupDownloaded && (
                <motion.p variants={feedbackMessageVariants} initial="initial" animate="animate" exit="exit"
                    className="text-xs text-gray-600 dark:text-gray-400 bg-gray-200/70 dark:bg-neutral-700/60 p-2.5 rounded-lg border border-gray-300/70 dark:border-neutral-600/50">
                    <LockKeyhole className="w-4 h-4 mr-2 shrink-0 inline-block text-gray-500 dark:text-gray-400" />
                    Please download a backup of the current state first to unlock this option for safety.
                </motion.p>
            )}
            </AnimatePresence>
          </ActionSection>
        </motion.main>
      </div>

      <AlertDialog open={showResetConfirmDialog} onOpenChange={setShowResetConfirmDialog}>
        <AlertDialogContent className="sm:max-w-md bg-card rounded-xl shadow-2xl">
          <AlertDialogHeader className="pb-3">
            <AlertDialogTitle className="flex items-center text-2xl font-bold text-red-600 dark:text-red-500">
                <AlertTriangle className="w-7 h-7 mr-3 stroke-[2.5]" />Confirm Irreversible Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base text-muted-foreground pt-2 space-y-3">
              <p>All application data specific to this browser (configurations, session details, etc.) will be permanently erased. The application will require a fresh setup.</p>
              <p className="font-semibold text-foreground dark:text-gray-200">This cannot be undone.</p>
              <p>Confirm that you have either backed up the current state or wish to proceed with a complete wipe.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 sm:mt-5 gap-2 sm:gap-3">
            <Button variant="outline" onClick={()=>setShowResetConfirmDialog(false)} disabled={isResetInProgress} className="w-full sm:w-auto px-6 py-2.5 text-sm transition-colors hover:bg-muted/70 dark:hover:bg-neutral-700">Cancel</Button>
            <Button onClick={handleResetApplication} disabled={isResetInProgress}
              variant="destructive" className="w-full sm:w-auto px-6 py-2.5 text-sm bg-red-600 hover:bg-red-700 transition-colors">
              {isResetInProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, Erase and Reset Now
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg md:max-w-xl w-[95vw] p-0 max-h-[90vh] flex flex-col bg-card dark:bg-neutral-800 focus-visible:ring-primary/60 shadow-2xl rounded-xl">
            <DialogHeader className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-border/70 dark:border-neutral-700 sticky top-0 bg-card/90 dark:bg-neutral-800/90 backdrop-blur-md z-10 rounded-t-xl">
                <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center text-gray-800 dark:text-gray-100">
                    <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-primary shrink-0" />
                    Import Application Data from Backup
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                    Restore from a valid <code className="text-xs bg-muted dark:bg-neutral-700 px-1.5 py-0.5 rounded-md">.json</code> backup. This overwrites local settings.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6">
                <ImportBackupDialogContent onDialogClose={() => setShowImportDialog(false)} />
            </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}