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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { useAppStore, useCurrentUser } from '@/stores/appStore';
import { UserRole } from '@/types/auth';
import { toast } from 'sonner';
import { 
    Loader2, Download, AlertTriangle, ShieldAlert, UploadCloud, RotateCw, 
    ListChecks, AlertCircle, LockKeyhole, CheckCircle2, Server, HardDriveUpload,
    Settings, Brush, Network, Database
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ImportBackupDialogContent } from '@/app/onboarding/import_all';
import { exportIdbData, clearOnboardingData } from '@/lib/idb-store';
import { restoreFromBackupContent, BackupFileContent, RestoreSelection } from '@/lib/restore';
import { dataPoints as rawDataPointsDefinitions } from '@/config/dataPoints';
import * as appConstants from '@/config/constants';
import { sldLayouts as constantSldLayouts } from '@/config/sldLayouts';
import { getFormattedTimestamp } from '@/lib/timeUtils';
import { SLDLayout } from '@/types/sld';
import { useWebSocket } from '@/hooks/useWebSocketListener';

// --- CONFIGURATION ---
const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${appConstants.PLANT_NAME.replace(/\s+/g, '_')}_v2`;
const WEATHER_CARD_CONFIG_KEY = `weatherCardConfig_v3.5_compact_${appConstants.PLANT_NAME || 'defaultPlant'}`;
const GRAPH_SERIES_CONFIG_KEY = `powerGraphConfig_${appConstants.PLANT_NAME.replace(/\s+/g, '_')}_control_dashboard_series_v1`;

const APP_LOCAL_STORAGE_KEYS = [
  USER_DASHBOARD_CONFIG_KEY,
  'user-preferences',
  'last-session',
  'theme',
  WEATHER_CARD_CONFIG_KEY,
  appConstants.WEBSOCKET_CUSTOM_URL_KEY,
  GRAPH_SERIES_CONFIG_KEY,
];

const SLD_LAYOUT_IDS_TO_BACKUP: string[] = ['main_plant'];
const APP_LOCAL_STORAGE_KEYS_TO_PRESERVE_ON_RESET = ['theme'];


// --- ANIMATION VARIANTS (ENHANCED) ---
const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.4, ease: [0.76, 0, 0.24, 1] } }
};

const cardContainerVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const cardSectionVariants: Variants = {
  initial: { opacity: 0, filter: 'blur(8px)', y: 30, scale: 0.95 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 180, damping: 25, mass: 0.8 }
  },
};

const interactiveElementVariants: Variants = {
  hover: { scale: 1.03, transition: { type: "spring", stiffness: 350, damping: 12 } },
  tap: { scale: 0.97, transition: { type: "spring", stiffness: 400, damping: 18 } },
};

const listItemVariants = (delayIncrement: number = 0.05): Variants => ({
  initial: { opacity: 0, x: -25 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * delayIncrement + 0.3, type: 'spring', stiffness: 250, damping: 15 }
  }),
});

const feedbackMessageVariants: Variants = {
  initial: { opacity: 0, height: 0, y: 15, marginTop: '0px' },
  animate: { opacity: 1, height: 'auto', y: 0, marginTop: '1rem', transition: { duration: 0.4, ease: "backOut" } },
  exit: { opacity: 0, height: 0, y: -15, marginTop: '0px', transition: { duration: 0.3, ease: "backIn" } }
};

// --- REUSABLE COMPONENTS (STYLED & ENHANCED) ---

const ActionSection = React.memo(({
  title,
  description,
  icon: Icon,
  children,
  className,
  iconColorClass = "text-primary"
}: {
  title: string,
  description: string,
  icon: React.ElementType,
  children: React.ReactNode,
  className?: string,
  iconColorClass?: string
}) => (
  <motion.div variants={cardSectionVariants}>
    <motion.section
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
      className={`relative p-6 border rounded-2xl overflow-hidden bg-white/60 dark:bg-neutral-800/50 backdrop-blur-xl shadow-lg dark:shadow-2xl dark:shadow-black/20 transition-all duration-300 ${className}`}
    >
      <div className="flex items-start mb-4">
        <motion.div 
          initial={{ scale: 0, opacity: 0, rotate: -30 }} 
          animate={{ scale: 1, opacity: 1, rotate: 0, transition: { delay: 0.3, type: 'spring', stiffness: 220, damping: 12 } }}
          className="mr-4 mt-1"
        >
          <div className={`p-2.5 rounded-full bg-gradient-to-br ${iconColorClass.includes('red') ? 'from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50' : iconColorClass.includes('green') ? 'from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50' : 'from-blue-100 to-indigo-200 dark:from-blue-900/50 dark:to-indigo-800/50'}`}>
            <Icon className={`w-6 h-6 shrink-0 ${iconColorClass}`} />
          </div>
        </motion.div>
        <div className="flex-grow">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
      </div>
      {children}
    </motion.section>
  </motion.div>
));
ActionSection.displayName = "ActionSection";


// --- ServerRestoreSection (Correctly Integrated) ---
const ServerRestoreSection = ({ setShowImportDialog, onBackupFetched }: { setShowImportDialog: (show: boolean) => void, onBackupFetched: (data: BackupFileContent) => void }) => {
    const [serverBackups, setServerBackups] = useState<ServerBackup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);
  
    useEffect(() => {
      const fetchBackups = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/backups');
          if (!response.ok) throw new Error('Failed to fetch server backups.');
          const data = await response.json();
          setServerBackups(data.backups || []);
        } catch (error) {
          console.error("Error fetching backups:", error);
          toast.error("Could not load server backups.", { description: (error as Error).message });
        } finally {
          setIsLoading(false);
        }
      };
      fetchBackups();
    }, []);
  
    const handleFetchBackup = async () => {
      if (!selectedBackup) {
        return toast.warning("Please select a backup to restore.");
      }

      setIsFetching(true);
      const fetchToastId = toast.loading("Fetching backup from server...", {
        description: `Retrieving ${selectedBackup}.`
      });

      try {
        const response = await fetch(`/api/backups/${selectedBackup}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch backup file from server.');
        }
        const backupData: BackupFileContent = await response.json();
        toast.success("Backup file fetched!", { id: fetchToastId });
        onBackupFetched(backupData); // Pass data to parent to open selection modal

      } catch (error) {
        console.error("Server backup fetch failed:", error);
        toast.error("Fetch Failed", { id: fetchToastId, description: (error as Error).message });
      } finally {
        setIsFetching(false);
      }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
      };
  
    return (
      <div className="space-y-4 pt-4 mt-4 border-t border-gray-200/80 dark:border-neutral-700/60">
        <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-gray-500"/>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">Restore from Server</h4>
        </div>
        <Select onValueChange={setSelectedBackup} disabled={isFetching || isLoading}>
          <SelectTrigger className="w-full text-base bg-gray-50/50 dark:bg-neutral-900/50">
            <SelectValue placeholder={isLoading ? "Loading backups..." : "Choose a server backup..."} />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[180px]">
              {serverBackups.length > 0 ? (
                serverBackups.map((backup) => (
                  <SelectItem key={backup.filename} value={backup.filename}>
                    <div className="flex justify-between w-full text-sm">
                      <span>{backup.filename}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 pr-4">
                        {new Date(backup.createdAt).toLocaleString()} ({formatBytes(backup.size)})
                      </span>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">No server backups found.</div>
              )}
            </ScrollArea>
          </SelectContent>
        </Select>
        <motion.div variants={interactiveElementVariants} whileHover="hover" whileTap="tap">
          <Button
            onClick={handleFetchBackup}
            disabled={!selectedBackup || isFetching || isLoading}
            variant="outline"
            className="w-full text-base py-6 rounded-xl border-2 transition-all duration-300"
          >
            {isFetching ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
            {isFetching ? 'Fetching...' : 'Fetch Backup from Server'}
          </Button>
        </motion.div>
         <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Or, <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowImportDialog(true)}>upload a local backup file</Button>.
         </p>
      </div>
    );
  };


// --- MAIN PAGE COMPONENT ---
export default function ResetApplicationPage() {
  const router = useRouter();
  const storeHasHydrated = useAppStore.persist.hasHydrated();
  const directStoreUser = useAppStore((state) => state.currentUser);
  const currentUserForUI = useCurrentUser();

  const { sendJsonMessage, lastJsonMessage, isConnected, connect: connectWebSocket } = useWebSocket();
  const logoutUser = useAppStore((state) => state.logout);

  const zustandResetFn = useAppStore((state) => (state as any).resetToInitial);
  const resetStoreToInitial = useCallback(() => {
    if (typeof zustandResetFn === 'function') zustandResetFn();
    else console.warn('Zustand store "resetToInitial" function not available.');
  }, [zustandResetFn]);

  const [authStatus, setAuthStatus] = useState<'loading' | 'admin' | 'unauthorized'>('loading');
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [isResetInProgress, setIsResetInProgress] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showRestoreSelectionDialog, setShowRestoreSelectionDialog] = useState(false);
  const [selectedBackupData, setSelectedBackupData] = useState<BackupFileContent | null>(null);
  const [backupSelection, setBackupSelection] = useState({
    configurations: true,
    ui: true,
    appSettings: true,
    sldLayouts: true,
  });

  // --- LOGIC HOOKS ---

  const getAllSldLayoutsFromStorage = useCallback((): Record<string, SLDLayout> => {
    const allLayouts: Record<string, SLDLayout> = JSON.parse(JSON.stringify(constantSldLayouts));
    const sldStoragePrefix = 'sldLayout_';

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(sldStoragePrefix)) {
        try {
          const rawLayout = localStorage.getItem(key);
          if (rawLayout) {
            const parsedLayout = JSON.parse(rawLayout) as SLDLayout;
            if (parsedLayout?.layoutId) {
              // Overwrite constant layout with user-saved version
              allLayouts[parsedLayout.layoutId] = parsedLayout;
            }
          }
        } catch (error) {
          console.warn(`Could not parse SLD layout from localStorage for key: ${key}`, error);
        }
      }
    }
    return allLayouts;
  }, []);

  useEffect(() => {
    if (!storeHasHydrated) {
      setAuthStatus('loading');
      return;
    }

    if (directStoreUser && directStoreUser.email !== 'guest@example.com' && directStoreUser.role === UserRole.ADMIN) {
      setAuthStatus('admin');
    } else {
      setAuthStatus('unauthorized');
      if (directStoreUser && directStoreUser.email !== 'guest@example.com') {
          toast.error("Access Denied", { description: "Admin privileges are required for this section." });
          router.replace(directStoreUser.redirectPath || '/dashboard');
      } else {
          toast.error("Authentication Required", { description: "Please log in as an administrator." });
          router.replace('/login');
      }
    }
  }, [storeHasHydrated, directStoreUser, router]);



  const handleDownloadBackup = async () => {
    if (Object.values(backupSelection).every(v => !v)) {
      toast.warning("No components selected", { description: "Please select at least one component to back up." });
      return;
    }

    setIsBackupInProgress(true);
    const backupToastId = toast.loading("Creating system backup...", { description: "Please remain on this page." });

    try {
      const now = new Date();
      const localTime = getFormattedTimestamp();
      let backupData: Partial<BackupFileContent> & { backupSchemaVersion: string, createdAt: string, createdBy: string, application: object, plant: object, backupType: string, localTime: string } = {
        backupSchemaVersion: "2.0.0",
        createdAt: now.toISOString(),
        createdBy: currentUserForUI?.name || 'Unknown Admin',
        localTime: localTime,
        application: { name: appConstants.APP_NAME, version: appConstants.VERSION },
        plant: { name: appConstants.PLANT_NAME, location: appConstants.PLANT_LOCATION, capacity: appConstants.PLANT_CAPACITY },
        browserStorage: { localStorage: {} },
        backupType: 'manual',
      };

      if (backupSelection.configurations) {
        toast.info("Packaging configurations...", { id: backupToastId });
        backupData.configurations = { dataPointDefinitions: JSON.stringify(rawDataPointsDefinitions) };
      }

      if (backupSelection.ui) {
        toast.info("Packaging UI settings...", { id: backupToastId });
        const localStorageData: Record<string, any> = {};
        APP_LOCAL_STORAGE_KEYS.forEach(key => {
            const item = localStorage.getItem(key);
            if (item !== null) {
                try { localStorageData[key] = JSON.parse(item); } catch { localStorageData[key] = item; }
            }
        });
        if (!backupData.browserStorage) {
          backupData.browserStorage = { localStorage: {} };
        }
        backupData.browserStorage.localStorage = localStorageData;
      }

      if (backupSelection.appSettings) {
        toast.info("Packaging application settings (IDB)...", { id: backupToastId });
        const idbData = await exportIdbData();
        if (!backupData.browserStorage) backupData.browserStorage = { localStorage: {} };
        backupData.browserStorage.indexedDB = idbData;
      }

      if (backupSelection.sldLayouts) {
        toast.info("Packaging SLD layouts...", { id: backupToastId });
        backupData.sldLayouts = getAllSldLayoutsFromStorage();
      }

      const jsonData = JSON.stringify(backupData, null, 2);

      // Save to server
      try {
        const response = await fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: jsonData });
        if (response.ok) {
          const result = await response.json();
          toast.info("Server-side backup created.", { id: backupToastId, description: `File: ${result.filename}` });
        } else {
          throw new Error((await response.json()).message || 'Server backup failed.');
        }
      } catch (error) {
        console.error("Failed to save backup to server:", error);
        toast.error("Server Backup Failed", { id: backupToastId, description: (error as Error).message });
      }

      // Save to client machine
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });
      saveAs(blob, `manual_backup_${localTime}_${(currentUserForUI?.name || 'system').replace(/\s+/g, '_')}.json`);

      toast.success("Backup Download Started!", { id: backupToastId, duration: 6000, description: "Check your browser downloads." });
      setBackupDownloaded(true);
    } catch (error: any) {
      console.error("Backup process failed:", error);
      toast.error("Backup Failed", { id: backupToastId, description: error.message || "An unexpected error occurred." });
    } finally {
      setIsBackupInProgress(false);
    }
  };

  const handleResetApplication = async () => {
    setIsResetInProgress(true);
    const resetToastId = toast.loading("Initiating irreversible system reset...", { description: "Clearing all application data." });
    
    try {
        await new Promise(res => setTimeout(res, 500));
        await clearOnboardingData();

        const preservedData: Record<string, string | null> = {};
        APP_LOCAL_STORAGE_KEYS_TO_PRESERVE_ON_RESET.forEach(key => { preservedData[key] = localStorage.getItem(key); });
        localStorage.clear();
        Object.entries(preservedData).forEach(([key, value]) => { if (value !== null) localStorage.setItem(key, value); });

        logoutUser();
        resetStoreToInitial();
        
        await new Promise(res => setTimeout(res, 300));
        toast.success("Application Reset Complete!", { id: resetToastId, duration: 4000, description: "Redirecting to initial setup..." });
        
        setTimeout(() => router.push('/onboarding?reset=true'), 1500);

    } catch (error: any) {
        console.error("Reset operation failed:", error);
        toast.error("Reset Failed", { id: resetToastId, duration: 7000, description: error.message || "Could not complete the reset." });
        setIsResetInProgress(false);
    }
  };


  // --- RENDER LOGIC ---

  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0f1e]">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, ease: "backOut" } }}>
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
        </motion.div>
      </div>
    );
  }

  if (authStatus !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-neutral-900">
        <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1, transition:{ type:'spring', stiffness:150, damping: 10 }}}>
           <Card className="p-8 max-w-md text-center shadow-2xl">
              <CardHeader>
                <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <CardTitle className="text-2xl font-bold">Access Restricted</CardTitle>
                <CardDescription>Redirecting to a safe place...</CardDescription>
              </CardHeader>
           </Card>
        </motion.div>
      </div>
    );
  }

  const backupItems = [
    { id: 'configurations', label: 'Core Data Point Definitions', icon: Settings },
    { id: 'ui', label: 'User Interface & Preferences', icon: Brush },
    { id: 'appSettings', label: 'Application Settings (IndexedDB)', icon: Database },
    { id: 'sldLayouts', label: 'SLD Network Diagram Layouts', icon: Network },
  ];

  const handleBackupSelectionChange = (id: keyof typeof backupSelection) => {
    setBackupSelection(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-100 to-blue-100 dark:from-[#0a0f1e] dark:via-[#101427] dark:to-[#1a213e] py-16 sm:py-24 text-gray-800 dark:text-gray-200 transition-colors duration-300"
    >
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1, type: 'spring', stiffness: 120, damping: 20 } }}
          className="text-center mb-12 sm:mb-16"
        >
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            System Control Center
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Perform critical system operations like backup, restore, and factory reset. Proceed with caution.
          </p>
        </motion.header>

        <Tabs defaultValue="backup" className="w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}>
            <TabsList className="grid w-full grid-cols-3 bg-white/50 dark:bg-black/20 backdrop-blur-sm h-14 p-2 rounded-xl">
              <TabsTrigger value="backup" className="text-base h-full rounded-lg">Backup</TabsTrigger>
              <TabsTrigger value="restore" className="text-base h-full rounded-lg">Restore</TabsTrigger>
              <TabsTrigger value="reset" className="text-base h-full rounded-lg">System Reset</TabsTrigger>
            </TabsList>
          </motion.div>

          <motion.div variants={cardContainerVariants} initial="initial" animate="animate" className="mt-8">
            <TabsContent value="backup">
              <ActionSection
                  title="System Backup"
                  description="Create and download a backup of system data. Select the components you wish to include."
                  icon={Download}
                  className="border-gray-200/80 dark:border-neutral-700/70"
              >
                  <div className="mt-5 space-y-6">
                    <div className="p-4 border rounded-xl bg-gray-50/70 dark:bg-neutral-900/50">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2.5 mb-4">
                            <ListChecks className="w-5 h-5 text-sky-500" />
                            Select Backup Components
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {backupItems.map((item) => (
                            <motion.div
                              key={item.id}
                              variants={interactiveElementVariants}
                              whileHover="hover"
                              className="flex items-center space-x-3 p-3 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            >
                              <Checkbox
                                id={item.id}
                                checked={backupSelection[item.id as keyof typeof backupSelection]}
                                onCheckedChange={() => handleBackupSelectionChange(item.id as keyof typeof backupSelection)}
                                className="w-5 h-5"
                              />
                              <label
                                htmlFor={item.id}
                                className="flex items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                <item.icon className="w-5 h-5 mr-2 text-gray-500" />
                                {item.label}
                              </label>
                            </motion.div>
                          ))}
                        </div>
                    </div>
                    <motion.div variants={interactiveElementVariants} whileHover="hover" whileTap="tap">
                        <Button
                            onClick={handleDownloadBackup}
                            disabled={isBackupInProgress || Object.values(backupSelection).every(v => !v)}
                            className="w-full text-lg py-7 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                        >
                        {isBackupInProgress ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                        {isBackupInProgress ? 'Creating Backup...' : 'Download Selected Backup'}
                        </Button>
                    </motion.div>
                  </div>
              </ActionSection>
            </TabsContent>

            <TabsContent value="restore">
              <ActionSection
                title="Restore System from Backup"
                description="Overwrite current system state by uploading a backup file or selecting a server backup."
                icon={UploadCloud}
                iconColorClass="text-green-600 dark:text-green-500"
                className="border-gray-200/80 dark:border-neutral-700/70"
              >
                 <motion.div variants={interactiveElementVariants} whileHover="hover" whileTap="tap" className="mt-5">
                    <Button
                      onClick={() => setShowImportDialog(true)}
                      variant="outline"
                      className="w-full text-base py-6 rounded-xl border-2 hover:bg-green-50/80 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800/80 hover:border-green-500 dark:hover:border-green-600 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <HardDriveUpload className="h-5 w-5" />
                      Upload Backup from Computer...
                    </Button>
                  </motion.div>
                 <ServerRestoreSection
                    setShowImportDialog={setShowImportDialog}
                    onBackupFetched={(data) => {
                      setSelectedBackupData(data);
                      setShowRestoreSelectionDialog(true);
                    }}
                  />
              </ActionSection>
            </TabsContent>

            <TabsContent value="reset">
              <ActionSection
                title="Irreversible System Reset"
                description="Erase all data and restore the application to its original factory settings."
                icon={ShieldAlert}
                iconColorClass="text-red-600 dark:text-red-500"
                className="bg-red-50/20 dark:bg-red-900/20 border-red-500/30 dark:border-red-500/40"
              >
                <div className="mt-4">
                  <AnimatePresence>
                    {!backupDownloaded && (
                      <motion.div
                        variants={feedbackMessageVariants}
                        initial="initial" animate="animate" exit="exit"
                        className="flex items-center gap-3 p-3.5 mb-5 text-sm rounded-xl bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border border-amber-300/60 dark:border-amber-500/50"
                      >
                        <AlertCircle className="w-8 h-8 sm:w-5 sm:h-5 shrink-0" />
                        <p className="font-medium">
                          **Strongly recommended:** Download a backup before resetting the system.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.div variants={interactiveElementVariants} whileHover="hover" whileTap="tap">
                    <Button
                      onClick={() => setShowResetConfirmDialog(true)}
                      variant="destructive"
                      disabled={isResetInProgress}
                      className="w-full text-lg py-7 rounded-xl shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300"
                    >
                      {isResetInProgress ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <AlertTriangle className="mr-2 h-5 w-5" />}
                      {isResetInProgress ? 'Resetting System...' : 'Initiate Factory Reset'}
                    </Button>
                  </motion.div>
                </div>
              </ActionSection>
            </TabsContent>
          </motion.div>
        </Tabs>
      </div>

      {/* --- DIALOGS --- */}
      <AlertDialog open={showResetConfirmDialog} onOpenChange={setShowResetConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-2xl">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              Confirm System Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base py-4">
              This action is **permanent and cannot be undone**. It will completely erase all application data, configurations, and user settings.
              <br/><br/>
              If you have not created a backup, this is your last chance to cancel and do so.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="py-2.5 px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetApplication} className="bg-red-600 hover:bg-red-700 py-2.5 px-6">
              I understand, Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
         <DialogContent className="max-w-3xl p-0" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="p-6 pb-4 border-b dark:border-neutral-800">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <LockKeyhole className="w-7 h-7 text-primary"/>
                Restore System from Local Backup
              </DialogTitle>
              <DialogDescription>
                Select your backup file (.json) to restore the system. This will overwrite all current data and configurations.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6">
              <ImportBackupDialogContent />
            </div>
            <DialogFooter className="bg-gray-50 dark:bg-neutral-900/50 px-6 py-4 border-t dark:border-neutral-800">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
      </Dialog>

      <RestoreSelectionDialog
        open={showRestoreSelectionDialog}
        onOpenChange={setShowRestoreSelectionDialog}
        backupData={selectedBackupData}
        onConfirm={async (selection) => {
          if (!selectedBackupData) return;
          setShowRestoreSelectionDialog(false);
          await restoreFromBackupContent(
            selectedBackupData,
            { isConnected, connect: connectWebSocket, sendJsonMessage },
            logoutUser,
            (message) => toast.info(message),
            selection
          );
        }}
      />
    </motion.div>
  );
}

function RestoreSelectionDialog({ open, onOpenChange, backupData, onConfirm }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  backupData: BackupFileContent | null,
  onConfirm: (selection: RestoreSelection) => void
}) {
  if (!backupData) return null;

  const [selection, setSelection] = useState<RestoreSelection>({
    ui: true,
    appSettings: true,
    sldLayouts: true,
    configurations: true,
  });

  const availableComponents = {
    ui: backupData.browserStorage?.localStorage && Object.keys(backupData.browserStorage.localStorage).length > 0,
    appSettings: !!backupData.browserStorage?.indexedDB?.onboardingData,
    sldLayouts: backupData.sldLayouts && Object.keys(backupData.sldLayouts).length > 0,
  };

  const restoreItems = [
    { id: 'ui', label: 'User Interface & Preferences', icon: Brush, available: availableComponents.ui },
    { id: 'appSettings', label: 'Application Settings (IndexedDB)', icon: Database, available: availableComponents.appSettings },
    { id: 'sldLayouts', label: 'SLD Network Diagram Layouts', icon: Network, available: availableComponents.sldLayouts },
  ];

  const handleConfirm = () => {
    onConfirm(selection);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Components to Restore</DialogTitle>
          <DialogDescription>
            This backup file contains the following components. Choose which ones you'd like to restore.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {restoreItems.map(item => (
            <div key={item.id} className={`flex items-center space-x-3 p-2.5 rounded-md transition-all ${!item.available ? 'opacity-50' : ''}`}>
              <Checkbox
                id={`server-restore-${item.id}`}
                checked={item.available && selection[item.id as keyof RestoreSelection]}
                onCheckedChange={(checked) => setSelection(prev => ({ ...prev, [item.id]: !!checked }))}
                disabled={!item.available}
              />
              <label htmlFor={`server-restore-${item.id}`} className={`flex items-center text-sm font-medium leading-none ${!item.available ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
              </label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={Object.values(selection).every(v => !v)}>
            <RotateCw className="mr-2 h-4 w-4" />
            Restore Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dummy type definition for ServerBackup - ensure it matches your API response
interface ServerBackup {
    filename: string;
    createdAt: string;
    size: number;
}