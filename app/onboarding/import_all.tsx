// components/admin/ImportBackupDialogContent.tsx
'use client';

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
// useRouter is removed as page-level navigation from within the dialog might not be ideal.
// Primary auth check happens at the point where the dialog is triggered.
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, Loader2, CheckCircle, AlertTriangle, XCircle, Info, ListChecks, RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// Card components for internal structuring
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; 
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useAppStore, useCurrentUser } from '@/stores/appStore';
import { SLDLayout, AppOnboardingData as ExpectedAppOnboardingData } from '@/types/index';
import { UserRole } from '@/types/auth'; // Assuming this path is correct for UserRole
import { toast } from 'sonner';

import { saveOnboardingData as saveIdbOnboardingData, clearOnboardingData as clearIdbBeforeImport } from '@/lib/idb-store';
import { APP_NAME } from '@/config/appConfig';
import { PLANT_NAME } from '@/config/constants';
import { useWebSocket } from '@/hooks/useWebSocketListener';

const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2`;
const APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT = [
  'app-storage',
  'user',
  USER_DASHBOARD_CONFIG_KEY,
  'dashboardSoundEnabled',
  // Consider 'theme' separately, usually user preference
];
const EXPECTED_BACKUP_SCHEMA_VERSION = "1.0.0";

interface BackupFileContent {
  backupSchemaVersion: string;
  createdAt: string;
  application: { name: string; version: string };
  plant: { name: string; location: string; capacity: string };
  configurations?: { dataPointDefinitions?: any[] };
  userSettings?: { dashboardLayout?: any };
  browserStorage: {
    indexedDB?: { onboardingData?: ExpectedAppOnboardingData; };
    localStorage: Record<string, any>;
  };
  sldLayouts?: Record<string, SLDLayout | null>;
}

type ImportStage = 'idle' | 'fileSelected' | 'validating' | 'confirmation' | 'importing' | 'completed' | 'error';
type ValidationStatus = 'pending' | 'valid' | 'invalid' | 'warning';

interface ImportBackupDialogContentProps {
  onDialogClose?: () => void; // Optional: To signal closure from within
}

export function ImportBackupDialogContent({ onDialogClose }: ImportBackupDialogContentProps) {
  const currentUser = useCurrentUser();
  const { sendJsonMessage, lastJsonMessage, isConnected, connect: connectWebSocket } = useWebSocket();
  const logoutUser = useAppStore((state) => state.logout);

  // Internal auth check for displaying content - dialog should only be opened for admins
  const [isAllowedForContent, setIsAllowedForContent] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [importStage, setImportStage] = useState<ImportStage>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<BackupFileContent | null>(null);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('pending');
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [importProgressMessage, setImportProgressMessage] = useState('');

  useEffect(() => {
    setIsLoadingAuth(true);
    if (currentUser) {
      setIsAllowedForContent(currentUser.role === UserRole.ADMIN);
      if(currentUser.role !== UserRole.ADMIN){
          toast.error("Access Denied", { description: "Only administrators can import data." });
          onDialogClose?.(); // If opened mistakenly
      }
    } else if (currentUser === null) { // Explicitly checked, not just falsy
        setIsAllowedForContent(false);
        toast.error("Authentication Required to import.");
        onDialogClose?.();
    }
    setIsLoadingAuth(false);
  }, [currentUser, onDialogClose]);

  useEffect(() => { // For SLD save confirmations
    if (lastJsonMessage && importStage === 'importing') {
      const message = lastJsonMessage as any;
      if (message.type === 'layout-saved-confirmation') {
        toast.success(`SLD layout ${message.payload?.key?.replace('sld_', '') || ''} restored.`);
      } else if (message.type === 'layout-save-error') {
        toast.error(`Failed to restore SLD: ${message.payload?.key?.replace('sld_', '') || ''}`, {
          description: message.payload.error,
        });
      }
    }
  }, [lastJsonMessage, importStage]);

  const resetState = useCallback(() => {
    setImportStage('idle');
    setUploadedFile(null);
    setParsedBackupData(null);
    setValidationStatus('pending');
    setValidationIssues([]);
    setShowConfirmDialog(false);
    setImportProgressMessage('');
    const fileInput = document.getElementById('backup-file-input-modal') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }, []);

  const handleFileChangeInternal = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json') {
        toast.error("Invalid File Type", { description: "Please upload a valid .json backup file." });
        resetState();
        return;
      }
      setUploadedFile(file);
      setImportStage('fileSelected');
      validateFile(file); // Call the memoized version
    }
  };
  const handleFileChange = useCallback(handleFileChangeInternal, [resetState]); // validateFile added in validateFile's useCallback

  const validateFileInternalFunction = async (file: File) => {
    setImportStage('validating');
    setValidationIssues([]);
    setValidationStatus('pending');
    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent) as BackupFileContent;
      setParsedBackupData(data);
      let currentValidationStatus: ValidationStatus = 'valid';
      const issues: string[] = [];

      if (!data.backupSchemaVersion) {
        issues.push("Backup schema version missing. Incompatible file.");
        currentValidationStatus = 'invalid';
      } else if (data.backupSchemaVersion !== EXPECTED_BACKUP_SCHEMA_VERSION) {
        issues.push(`Schema mismatch (File: ${data.backupSchemaVersion}, Expected: ${EXPECTED_BACKUP_SCHEMA_VERSION}). May cause issues.`);
        // Set to warning if it's currently valid
        if (currentValidationStatus === 'valid') {
          currentValidationStatus = 'warning';
        }
      }
      if (!data.application?.name) issues.push("Application metadata missing.");
      if (!data.browserStorage?.localStorage) {
        issues.push("LocalStorage data missing in backup. Critical.");
        currentValidationStatus = 'invalid';
      }
      if (data.browserStorage && data.browserStorage.indexedDB && (typeof data.browserStorage.indexedDB.onboardingData !== 'object' || data.browserStorage.indexedDB.onboardingData === null)){
        issues.push("IndexedDB onboarding data format incorrect or missing.");
        currentValidationStatus = currentValidationStatus !== 'invalid' ? 'warning' : 'invalid';
      }
      
      setValidationIssues(issues);
      setValidationStatus(currentValidationStatus);
      if (currentValidationStatus !== 'invalid') {
        setImportStage('confirmation');
      } else {
        setImportStage('error');
        toast.error("Backup File Invalid", { description: "Critical issues found. Cannot proceed." });
      }
    } catch (error) {
      setValidationIssues(["Failed to read/parse JSON. Ensure valid backup."]);
      setValidationStatus('invalid'); setParsedBackupData(null); setImportStage('error');
      toast.error("File Processing Error", { description: String(error) });
    }
  };
  // Memoize validateFile because it's used in handleFileChange which is also memoized
  const validateFile = useCallback(validateFileInternalFunction, []);
  // Now we can add validateFile to handleFileChange's dependencies
  useEffect(() => {
      // This effect ensures that handleFileChangeInternal uses the latest validateFile
  }, [validateFile]);


  const handleImportData = async () => {
    if (!parsedBackupData || validationStatus === 'invalid') {
      toast.error("Cannot Import: Backup data missing or invalid."); return;
    }
    setImportStage('importing'); setShowConfirmDialog(false);
    const importToastId = toast.loading("Importing data...");

    try {
      setImportProgressMessage("Clearing local settings...");
      await new Promise(res => setTimeout(res, 200));
      APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT.forEach(key => localStorage.removeItem(key));
      const currentTheme = localStorage.getItem('theme'); // Preserve theme
      if (currentTheme) localStorage.setItem('theme', currentTheme);

      setImportProgressMessage("Restoring LocalStorage...");
      await new Promise(res => setTimeout(res, 200));
      if (parsedBackupData.browserStorage.localStorage) {
        for (const key in parsedBackupData.browserStorage.localStorage) {
          if (APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT.includes(key) || key.startsWith('react-flow')) {
            localStorage.setItem(key, JSON.stringify(parsedBackupData.browserStorage.localStorage[key]));
          }
        }
      }
      toast.info("LocalStorage restored.", { id: importToastId });

      setImportProgressMessage("Restoring Onboarding Data (IDB)...");
      await new Promise(res => setTimeout(res, 200));
      if (parsedBackupData.browserStorage.indexedDB?.onboardingData) {
        await clearIdbBeforeImport();
        const onboardingToSave = parsedBackupData.browserStorage.indexedDB.onboardingData as Omit<ExpectedAppOnboardingData, 'onboardingCompleted' | 'version'>;
        await saveIdbOnboardingData(onboardingToSave);
        toast.info("Onboarding data (IDB) restored.", { id: importToastId });
      } else {
        toast.warning("No onboarding data in backup to restore.", { id: importToastId });
      }

      if (parsedBackupData.sldLayouts && Object.keys(parsedBackupData.sldLayouts).length > 0) {
        setImportProgressMessage("Restoring SLD layouts...");
        await new Promise(res => setTimeout(res, 200));
        if (!isConnected) {
          toast.warning("WebSocket disconnected. Attempting connection...", { id: importToastId });
          connectWebSocket(); await new Promise(resolve => setTimeout(resolve, 1500));
        }
        if (isConnected) {
          let sldSuccess = 0;
          Object.values(parsedBackupData.sldLayouts).forEach(layout => {
            if(layout) {
                 sendJsonMessage({ type: 'save-sld-widget-layout', payload: { key: `sld_${layout.layoutId}`, layout }});
                 sldSuccess++;
            }
          });
          toast.info(`Sent ${sldSuccess} SLD layouts for restoration.`, { id: importToastId });
        } else {
          toast.error("SLD restore failed: WebSocket not connected.", { id: importToastId });
        }
      } else {
         toast.info("No SLD layouts found in backup.", {id: importToastId});
      }

      setImportProgressMessage("Finalizing...");
      await new Promise(res => setTimeout(res, 300));
      logoutUser();
      toast.success("Import Complete! Reloading...", {
        id: importToastId, duration: 3000,
        onAutoClose: () => window.location.reload(), onDismiss: () => window.location.reload(),
      });
      setImportStage('completed');
      // onDialogClose?.(); // Close dialog on success, though reload will achieve this

    } catch (error: any) {
      console.error("Import failed:", error);
      toast.error("Import Failed", { id: importToastId, description: error.message || String(error) });
      setImportStage('error');
      setValidationIssues(prev => [...prev, `Runtime import error: ${error.message}`]);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 }}};
  const itemVariants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 }};

  const BackupSummaryDisplay = () => { /* ... same as before, adjusted for smaller space if needed ... */
    if (!parsedBackupData) return null;
    const { application, plant, createdAt, sldLayouts, browserStorage } = parsedBackupData;
    const sldCount = sldLayouts ? Object.values(sldLayouts).filter(Boolean).length : 0;
    const localStorageKeyCount = browserStorage.localStorage ? Object.keys(browserStorage.localStorage).length : 0;
    const hasOnboardingData = !!browserStorage.indexedDB?.onboardingData;
    return (
        <motion.div variants={itemVariants} className="space-y-1.5 p-3 border rounded-md bg-muted/30 text-xs">
            <h4 className="text-sm font-semibold text-foreground mb-1">Backup Summary:</h4>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li><strong>Time:</strong> {new Date(createdAt).toLocaleTimeString()} ({new Date(createdAt).toLocaleDateString()})</li>
                <li><strong>App:</strong> {application.name} v{application.version}</li>
                <li><strong>Plant:</strong> {plant.name}</li>
                <li><strong>SLDs:</strong> {sldCount}</li>
                <li><strong>LocalStorage Keys:</strong> {localStorageKeyCount} (app-specific)</li>
                <li><strong>IDB Onboarding Data:</strong> {hasOnboardingData ? "Present" : "Missing"}</li>
            </ul>
            {validationStatus === 'warning' && validationIssues.find(iss => iss.includes("Schema version mismatch")) && (
                 <p className="text-yellow-700 dark:text-yellow-400 text-[11px] mt-1.5 p-1.5 bg-yellow-500/10 rounded-md border border-yellow-500/30">
                    <AlertTriangle className="inline h-3 w-3 mr-1" /> Schema version mismatch. Use with caution.
                 </p>
            )}
        </motion.div>
    );
  };
  
  if (isLoadingAuth) {
    return (<div className="flex items-center justify-center min-h-[250px] py-8"> <Loader2 className="h-8 w-8 animate-spin text-primary" /></div>);
  }
  if (!isAllowedForContent) {
    return (<div className="flex flex-col items-center justify-center min-h-[250px] py-8 text-center">
        <XCircle className="h-10 w-10 text-destructive mb-2" />
        <p className="text-md font-semibold text-destructive">Access Denied</p>
        <p className="text-xs text-muted-foreground">Administrator privileges required.</p>
    </div>);
  }

  return (
    // This is the content that goes INSIDE DialogContent
    // Max height and overflow are managed by DialogContent, this just fills it.
    // Adjusted paddings for modal context
    <motion.div 
        variants={containerVariants} initial="hidden" animate="visible"
        className="px-2 py-2 space-y-4" // Main padding for content within dialog
    >
      <AnimatePresence mode="wait">
      {(importStage === 'idle' || importStage === 'fileSelected' || (importStage === 'error' && !parsedBackupData) ) && (
          <motion.div key="upload" variants={itemVariants} exit={{ opacity: 0, y:-10 }}
              className="p-4 border border-dashed border-primary/40 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-center">
          <label htmlFor="backup-file-input-modal" className="cursor-pointer block py-3">
              <UploadCloud className="mx-auto h-10 w-10 text-primary mb-1.5" />
              <h3 className="text-md font-semibold text-primary">
              {uploadedFile ? `Selected: ${uploadedFile.name}` : "Upload Backup (.json)"}
              </h3>
              {uploadedFile && <p className="text-xs text-muted-foreground">({(uploadedFile.size / 1024).toFixed(2)} KB)</p>}
              <input id="backup-file-input-modal" type="file" accept=".json" onChange={handleFileChange} className="sr-only" />
          </label>
          {importStage === 'error' && !parsedBackupData && validationIssues.length > 0 && (
              <div className="mt-2 text-left text-xs px-1">
              {validationIssues.map((issue, idx) => (
                  <p key={idx} className="text-destructive flex items-start"><XCircle className="h-3 w-3 mr-1 mt-px shrink-0" />{issue}</p>
              ))}
              <Button variant="link" onClick={resetState} className="mt-1 text-xs h-auto p-0 text-primary">Try again</Button>
              </div>
          )}
          </motion.div>
      )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
      {importStage === 'validating' && (
          <motion.div key="validating" variants={itemVariants} exit={{ opacity: 0 }} className="text-center p-4 space-y-1.5">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Validating file...</p>
          {uploadedFile && <p className="text-xs text-muted-foreground">{uploadedFile.name}</p>}
          </motion.div>
      )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
      {(importStage === 'confirmation' || (importStage === 'error' && parsedBackupData)) && parsedBackupData && (
          <motion.div key="confirm" variants={itemVariants} exit={{ opacity: 0 }} className="p-2.5 border rounded-lg bg-card space-y-3">
          <div className="flex items-center">
              {validationStatus === 'valid' && <CheckCircle className="h-5 w-5 mr-2 text-green-500 shrink-0" />}
              {validationStatus === 'warning' && <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500 shrink-0" />}
              {validationStatus === 'invalid' && <XCircle className="h-5 w-5 mr-2 text-destructive shrink-0" />}
              <h3 className="text-md font-semibold">
              {validationStatus === 'valid' && "File Validated"}
              {validationStatus === 'warning' && "Validated (Warnings)"}
              {validationStatus === 'invalid' && "File Invalid"}
              </h3>
          </div>
          {validationIssues.length > 0 && (
              <div className={`p-2 rounded-md text-xs border ${
              validationStatus === 'invalid' ? 'bg-destructive/10 border-destructive text-destructive-foreground' :
              'bg-yellow-500/10 border-yellow-600 text-yellow-700 dark:text-yellow-300 dark:bg-yellow-700/20 dark:border-yellow-500'}`}>
              <ListChecks className="inline h-3.5 w-3.5 mr-1 mb-px"/><strong>Findings:</strong>
              <ul className="list-disc list-inside pl-3.5 mt-0.5 space-y-px">
                  {validationIssues.map((issue, idx) => <li key={idx}>{issue}</li>)}
              </ul>
              </div>
          )}
          {validationStatus !== 'invalid' && <BackupSummaryDisplay />}
          <div className="mt-3 flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={resetState} className="text-xs px-3 py-1 h-auto">Cancel/New</Button>
              <Button size="sm" onClick={() => setShowConfirmDialog(true)} disabled={validationStatus === 'invalid'}
              className={`text-xs px-3 py-1 h-auto ${validationStatus === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-primary hover:bg-primary/90'}`}>
              <RotateCw className="mr-1 h-3 w-3" />Proceed</Button>
          </div>
          </motion.div>
      )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
      {importStage === 'importing' && (
          <motion.div key="importing" variants={itemVariants} exit={{ opacity: 0 }} className="text-center p-5 space-y-2">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <h3 className="text-lg font-semibold text-primary">Importing Data...</h3>
          <p className="text-xs text-muted-foreground min-h-[1.2em]">{importProgressMessage}</p>
          <p className="text-[11px] text-muted-foreground">Please do not close this dialog.</p>
          </motion.div>
      )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
      {importStage === 'completed' && (
          <motion.div key="completed" variants={itemVariants} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center p-5 space-y-2">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="text-lg font-semibold text-green-600">Import Successful!</h3>
          <p className="text-xs text-muted-foreground">Page will now reload to apply all changes.</p>
          </motion.div>
      )}
      </AnimatePresence>
      {(importStage !== 'idle' && importStage !== 'importing' && importStage !== 'completed' && importStage !== 'validating') && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mt-3">
          <p className="text-[11px] text-muted-foreground flex items-start p-1.5 bg-muted/40 rounded-md">
              <Info className="h-3 w-3 mr-1 shrink-0 mt-px" />
              Importing will overwrite current settings, log you out, and reload the application.
          </p>
        </motion.div>
      )}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="w-[90vw] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-lg"><AlertTriangle className="w-5 h-5 mr-2 text-destructive" />Confirm Import</AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-1">
              Overwrite local data with
              <code className="bg-muted px-1 py-0.5 rounded text-[10px] mx-1 break-all">{uploadedFile?.name || "backup file"}</code>? This is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
           { parsedBackupData && validationStatus !== 'invalid' && (
               <div className="text-xs max-h-[150px] overflow-y-auto my-1 custom-scrollbar-thin pr-1"> {/* pr for scrollbar space */}
                  <BackupSummaryDisplay />
               </div>
           )}
          <AlertDialogFooter className="mt-1">
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)} disabled={importStage === 'importing'} className="px-2.5 py-1 h-auto text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportData} disabled={importStage === 'importing'}
              className={`px-2.5 py-1 h-auto text-xs ${validationStatus === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-destructive hover:bg-destructive/80 text-destructive-foreground'}`}>
              {importStage === 'importing' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}Yes, Import & Overwrite</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}