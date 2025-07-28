// app/mobile-config/settings.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
// FIX: Import the 'Variants' type
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { toast } from 'sonner';
import { Save, Loader2, LinkIcon, CheckCircle, AlertCircle, ServerCog, Info, RotateCcw, Trash2, X, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // For better icon buttons
import { cn } from '@/lib/utils';
import { APP_AUTHOR } from '@/config/constants';

// MOCK CONSTANT if not available
const APP_COPYRIGHT = "© 2024 Your Solar Company. All rights reserved.";

// FIX: Explicitly type the variant objects with 'Variants'
const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeInOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeInOut" } },
};

// FIX: Explicitly set the return type of the function to 'Variants'
const itemVariants = (delay: number = 0.1): Variants => ({
  initial: { opacity: 0, y: 15 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: (i * 0.1) + delay + 0.2, duration: 0.4, ease: "easeOut" },
  }),
});

const buttonGroupVariants: Variants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0, transition: { staggerChildren: 0.07, delayChildren: 0.5, duration: 0.3 } },
    exit: { opacity: 0, x: 10 }
}

const iconButtonVariant: Variants = {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.5 }
}

const SettingsPage = () => {
  const [backendUrl, setBackendUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStoredUrl, setIsLoadingStoredUrl] = useState(true);
  const [lastSaveStatus, setLastSaveStatus] = useState<'success' | 'error' | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const loadUrl = async () => {
      setIsLoadingStoredUrl(true);
      setLastSaveStatus(null);
      try {
        const { value } = await Preferences.get({ key: 'backendUrl' });
        if (value) {
          setBackendUrl(value);
          setSavedUrl(value);
        } else {
          setBackendUrl('');
          setSavedUrl('');
        }
      } catch (error) {
        console.error('Failed to load backend URL from preferences', error);
        toast.error('Could not load saved URL.', {
          description: 'Please try refreshing the page or check app permissions.',
        });
      } finally {
        setIsLoadingStoredUrl(false);
      }
    };
    loadUrl();
  }, []);

  const handleSave = async (event?: React.FormEvent) => {
    if(event) event.preventDefault();
    if (!backendUrl.trim()) {
        toast.warning("Backend URL cannot be empty.", {
            description: "Please enter a valid URL."
        });
        return;
    }
    try {
        new URL(backendUrl); // Basic validation
    } catch (_) {
        toast.error("Invalid URL format.", {
            description: "Please enter a valid URL (e.g., https://api.example.com)."
        });
        return;
    }

    setIsSaving(true);
    setLastSaveStatus(null);
    try {
      await Preferences.set({ key: 'backendUrl', value: backendUrl });
      setSavedUrl(backendUrl);
      toast.success('Backend URL Saved!', {
        description: `API calls will now target: ${backendUrl}`,
        icon: <CheckCircle className="text-green-500" />
      });
      setLastSaveStatus('success');
    } catch (error) {
      console.error('Failed to save backend URL to preferences', error);
      toast.error('Save Failed.', {
        description: 'Could not save the URL. Please try again.',
        icon: <AlertCircle className="text-red-500" />
      });
      setLastSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setLastSaveStatus(null), 4000); // Increased duration for visibility
    }
  };

  const handleResetInputToSaved = () => {
    setBackendUrl(savedUrl);
    setLastSaveStatus(null);
    toast.info("Input reset to currently saved URL.", { icon: <Undo2 />, duration: 2500 });
  };
  
  const handleClearInputField = () => {
    setBackendUrl('');
    setLastSaveStatus(null);
    toast.info("Input field cleared.", { icon: <X className="text-slate-500" />, duration: 2000 });
  };

  const handleClearSavedUrl = async () => {
    setIsResetting(true);
    try {
        await Preferences.remove({ key: 'backendUrl' });
        setBackendUrl('');
        setSavedUrl('');
        setLastSaveStatus(null);
        toast.success('Saved URL Cleared!', {
            description: 'The app will now use its default backend configuration.',
            icon: <Trash2 className="text-red-500" />
        });
    } catch (error) {
        console.error('Failed to clear backend URL from preferences', error);
        toast.error('Clear Failed.', {
            description: 'Could not clear the saved URL. Please try again.',
            icon: <AlertCircle className="text-red-500" />
        });
    } finally {
        setIsResetting(false);
    }
  };

  const isUrlDirty = backendUrl !== savedUrl; // More intuitive name
  const canClearInput = backendUrl !== '';
  const canResetToSaved = backendUrl !== savedUrl && savedUrl !== '';

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8 flex flex-col items-center selection:bg-primary/20"
      >
        <motion.div custom={0} variants={itemVariants()} className="w-full max-w-lg">
          <Card className="shadow-xl dark:shadow-slate-950/40 backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/70 overflow-hidden rounded-xl">
            <CardHeader className="text-center pt-8 pb-5 bg-gradient-to-b from-white/60 to-transparent dark:from-slate-800/60 dark:to-transparent border-b border-slate-200/80 dark:border-slate-700/60">
              <motion.div 
                  className="mx-auto mb-5 p-3.5 bg-primary/10 dark:bg-primary/20 rounded-full w-fit shadow-lg border-2 border-primary/20"
                  initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1, transition: {delay:0.2, type:"spring", stiffness:180, damping:12}}}
              >
                  <ServerCog className="h-10 w-10 text-primary" />
              </motion.div>
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-50">
                Backend Server URL
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-1.5 text-sm max-w-md mx-auto">
                Configure the API endpoint your application connects to.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6 px-4 sm:px-6">
              <motion.form
                onSubmit={handleSave}
                className="space-y-5" // Reduced space for a tighter look
                initial="initial"
                animate="animate"
              >
                <motion.div custom={1} variants={itemVariants()}>
                  <label htmlFor="backendUrl" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    Server Address
                  </label>
                  <div className="relative flex items-center group">
                    <LinkIcon className="absolute left-3.5 h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors pointer-events-none" />
                    <Input
                      id="backendUrl"
                      type="url"
                      value={backendUrl}
                      onChange={(e) => {
                          setBackendUrl(e.target.value);
                          if (lastSaveStatus) setLastSaveStatus(null);
                      }}
                      placeholder="e.g., https://api.your.domain"
                      className="pl-11 pr-[calc(0.75rem+22px+0.75rem)] h-12 text-base bg-slate-50 dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/30 rounded-lg shadow-sm"
                      disabled={isSaving || isLoadingStoredUrl}
                      aria-describedby="savedUrlStatus"
                    />
                    {/* Input Action Icons Group */}
                    <AnimatePresence mode="popLayout">
                    {(canClearInput || canResetToSaved) && (
                        <motion.div 
                            key="input-actions"
                            variants={buttonGroupVariants} initial="initial" animate="animate" exit="exit"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1.5"
                        >
                            {canResetToSaved && !isSaving && !isLoadingStoredUrl && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <motion.div variants={iconButtonVariant}>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-dark" onClick={handleResetInputToSaved} aria-label="Reset to saved URL">
                                                <Undo2 className="h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-none shadow-lg">
                                        <p>Reset to: <span className="font-semibold break-all max-w-xs block">{savedUrl}</span></p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {canClearInput && !isSaving && !isLoadingStoredUrl && (
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <motion.div variants={iconButtonVariant}>
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400" onClick={handleClearInputField} aria-label="Clear input field">
                                            <X className="h-4 w-4" />
                                        </Button>
                                        </motion.div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-none shadow-lg"><p>Clear Input</p></TooltipContent>
                                </Tooltip>
                            )}
                        </motion.div>
                     )}
                     </AnimatePresence>
                     {/* Save Status Icon (appears if no input actions are visible) */}
                      <AnimatePresence mode="wait">
                        {!canClearInput && !canResetToSaved && !isLoadingStoredUrl && lastSaveStatus && (
                            <motion.div
                                key={lastSaveStatus}
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1, transition:{delay: 0.1}}}
                                exit={{ opacity: 0, scale: 0.7 }}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                            >
                                {lastSaveStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                {lastSaveStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                            </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Main Save Button */}
                <motion.div custom={2} variants={itemVariants(0.15)}>
                  <motion.div
                    whileHover={{ scale: (isSaving || isLoadingStoredUrl || (!isUrlDirty && savedUrl !== '')) ? 1 : 1.02, y: (isSaving || isLoadingStoredUrl || (!isUrlDirty && savedUrl !== '')) ? 0 : -1 }}
                    whileTap={{ scale: (isSaving || isLoadingStoredUrl || (!isUrlDirty && savedUrl !== '')) ? 1 : 0.98 }}
                  >
                    <Button
                      type="submit"
                      className={cn(
                        "w-full h-12 text-md font-semibold group transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg shadow-md hover:shadow-lg",
                         !isUrlDirty && savedUrl !== '' && !isSaving ? 
                            "bg-green-600 hover:bg-green-500 dark:bg-green-500 dark:hover:bg-green-400 focus-visible:ring-green-500 text-white cursor-not-allowed" :
                            "bg-primary hover:bg-primary/90 dark:hover:bg-primary/80 focus-visible:ring-primary text-primary-foreground" 
                      )}
                      disabled={isSaving || isLoadingStoredUrl || (!isUrlDirty && savedUrl !== '')}
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                      ) : (!isUrlDirty && savedUrl !== '') ? (
                        <CheckCircle className="mr-2.5 h-5 w-5" />
                      ) : (
                        <Save className="mr-2.5 h-5 w-5" />
                      )}
                      {isSaving ? 'Saving Changes...' : (!isUrlDirty && savedUrl !== '') ? 'URL is Up-to-Date' : 'Save Changes'}
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.form>

            {/* Current Active URL Display */}
              <motion.div custom={3} variants={itemVariants(0.2)} className="mt-8 text-center" id="savedUrlStatus">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Currently Active Server URL:
                </p>
                {isLoadingStoredUrl ? (
                  <div className="flex items-center justify-center h-10 bg-slate-100 dark:bg-slate-700/50 rounded-md py-2 px-3 animate-pulse">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
                      <span className="ml-2.5 text-sm text-slate-500 dark:text-slate-400">Loading configuration...</span>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={savedUrl || 'not-set'}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                          "text-md font-medium break-all px-4 py-2.5 rounded-lg inline-block max-w-full text-center min-h-[44px] flex items-center justify-center",
                          savedUrl ? "text-primary-foreground bg-primary/90 dark:text-primary dark:bg-primary/20 shadow-md border border-primary/30" : "text-amber-700 dark:text-amber-300 bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 shadow-sm"
                      )}
                    >
                      {savedUrl || 'Default App Configuration'}
                    </motion.div>
                  </AnimatePresence>
                )}
              </motion.div>

             {/* Clear Saved URL Section */}
             <AnimatePresence>
                {savedUrl && !isLoadingStoredUrl && (
                    <motion.div 
                        custom={4} 
                        variants={itemVariants(0.25)} 
                        className="mt-8 pt-6 border-t border-slate-200/90 dark:border-slate-700/60"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto", transition: { delay: 0.6 } }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Reset Configuration</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                            Revert to the application's default server settings by clearing the custom URL.
                        </p>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 text-sm group border-red-500/40 hover:border-red-500/70 text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/5 dark:hover:bg-red-500/10 focus-visible:ring-red-500"
                                    disabled={isResetting || isLoadingStoredUrl}
                                    aria-label="Clear saved URL and reset to default"
                                >
                                    {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4 group-hover:scale-105 transition-transform" />}
                                    {isResetting ? 'Resetting to Default...' : 'Clear Custom URL & Use Default'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-lg">
                                <AlertDialogHeader>
                                <AlertDialogTitle className="text-slate-800 dark:text-slate-100 flex items-center">
                                    <AlertCircle className="text-red-500 mr-2 h-6 w-6" /> Reset to Default Settings?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-600 dark:text-slate-400 pt-2">
                                    This will remove your custom server URL (<span className="font-semibold text-primary break-all">{savedUrl}</span>). The application will then use its built-in default configuration. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-4">
                                <AlertDialogCancel className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-700/70 h-10 rounded-md">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleClearSavedUrl}
                                    className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white h-10 rounded-md"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Yes, Reset to Default
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </motion.div>
                )}
             </AnimatePresence>
            </CardContent>

            <CardFooter className="pt-6 pb-8 px-4 sm:px-6 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-700/60 mt-6">
              <motion.div 
                  custom={5} 
                  variants={itemVariants(0.3)}
                  className="flex items-start text-xs text-slate-500 dark:text-slate-400/90 p-3.5 bg-sky-500/10 dark:bg-sky-500/15 rounded-lg border border-sky-500/20 dark:border-sky-500/30 w-full shadow-inner"
              >
                <Info className="h-5 w-5 sm:h-4 sm:w-4 mr-2.5 mt-0.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                <div>
                  Changes to the server URL typically require an app restart or data re-fetch to fully apply. This setting critically impacts where the application sends its API requests.
                </div>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>

         <motion.p
          custom={6} variants={itemVariants(0.35)}
          className="mt-10 text-center text-xs text-slate-500 dark:text-slate-400"
        >
          {APP_AUTHOR}
        </motion.p>
      </motion.div>
    </TooltipProvider>
  );
};

export default SettingsPage;