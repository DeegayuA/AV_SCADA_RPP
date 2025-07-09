'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { itemVariants } from '@/config/animationVariants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PLANT_NAME } from '@/config/constants';
import { UserRole } from '@/types/auth';
import {
  Settings, Pencil, Clock, Trash2, RotateCcw, Power, Check, AlertTriangle, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import PlcConnectionStatus from '@/app/DashboardData/PlcConnectionStatus';
import WebSocketStatus from '@/app/DashboardData/WebSocketStatus';
import SoundToggle from '@/app/DashboardData/SoundToggle';
import ThemeToggle from '@/app/DashboardData/ThemeToggle';

interface DashboardHeaderControlProps {
    plcStatus: "online" | "offline" | "disconnected";
    isConnected: boolean;
    connectWebSocket: () => Promise<void>;
    currentTime: string;
    delay: number;
    version: string;
    onOpenConfigurator: () => void;
    isEditMode: boolean;
    toggleEditMode: () => void;
    onRemoveAll: () => void;
    onResetToDefault: () => void;
    currentUserRole?: UserRole;
    onOpenWsConfigurator: () => void;
    activeWsUrl: string;
}

const DashboardHeaderControl: React.FC<DashboardHeaderControlProps> = React.memo(
  ({
    plcStatus,
    isConnected,
    connectWebSocket,
    currentTime,
    delay,
    version,
    onOpenConfigurator,
    isEditMode,
    toggleEditMode,
    onRemoveAll,
    onResetToDefault,
    currentUserRole,
    onOpenWsConfigurator,
    activeWsUrl
  }) => {
    const router = useRouter();
    const currentPathname = usePathname();
    const headerTitle = currentPathname?.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard';
    const isAdmin = currentUserRole === UserRole.ADMIN;

    const navigateToResetPage = () => {
      router.push('/reset');
    };
    
    const handleWsClick = () => {
        if (isAdmin) {
            onOpenWsConfigurator();
        } else {
            connectWebSocket().catch(console.error);
        }
    };

    return (
      <TooltipProvider delayDuration={100}>
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-center mb-2 md:mb-4 gap-4 pt-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center sm:text-left">
            {PLANT_NAME} {headerTitle}
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <motion.div variants={itemVariants}><PlcConnectionStatus status={plcStatus} /></motion.div>
            
            <motion.div variants={itemVariants}>
              {/* This usage is now correct because WebSocketStatus.tsx is updated */}
              <WebSocketStatus 
                isConnected={isConnected} 
                onClick={handleWsClick} 
                wsAddress={activeWsUrl}
              />
            </motion.div>
            
            <motion.div variants={itemVariants}><SoundToggle /></motion.div>
            <motion.div variants={itemVariants}><ThemeToggle /></motion.div>

            {isAdmin && isEditMode && (
              <>
                <motion.div variants={itemVariants}>
                  <Button variant="default" size="sm" onClick={onOpenConfigurator} title="Add new cards to the dashboard">
                    <Pencil className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Edit Cards</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                </motion.div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div variants={itemVariants}>
                      <Button variant="destructive" size="sm" title="Remove all cards from dashboard">
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        <span className="hidden md:inline">Remove All</span>
                        <span className="md:hidden sr-only">Remove All Cards</span>
                      </Button>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will remove all cards from your current dashboard layout. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onRemoveAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Remove All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div variants={itemVariants}>
                      <Button variant="outline" size="sm" title="Reset dashboard to default layout">
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                        <span className="hidden md:inline">Reset Layout</span>
                        <span className="md:hidden sr-only">Reset Layout</span>
                      </Button>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset to Default Layout?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will discard your current layout and restore the default set of cards for this dashboard.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onResetToDefault}>Reset Dashboard</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {isAdmin && (
              <>
                <motion.div variants={itemVariants}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant={isEditMode ? "secondary" : "ghost"} size="icon" onClick={toggleEditMode} title={isEditMode ? "Finalize Dashboard Edits" : "Enable Dashboard Layout Editing"}>
                        {isEditMode ? <Check className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
                        <span className="sr-only">{isEditMode ? "Done Editing Layout" : "Edit Dashboard Layout"}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isEditMode ? "Done Editing Layout" : "Edit Dashboard Layout"}</p></TooltipContent>
                  </Tooltip>
                </motion.div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div variants={itemVariants}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/40 dark:hover:bg-destructive/20 dark:text-destructive/90 dark:hover:text-destructive"
                            title="Access Application Reset Utility"
                          >
                            <ShieldAlert className="h-5 w-5" />
                            <span className="sr-only">Reset Application Data</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-destructive text-destructive-foreground">
                          <p>Access Application Reset Utility (Admin)</p>
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center"><AlertTriangle className="text-destructive mr-2 h-6 w-6" />Confirm Navigation</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to navigate to the <strong>Application Data Management</strong> page. This section contains tools for critical operations like full application reset and data import/export.
                        <br /><br />
                        Proceed with caution. Ensure you understand the implications of actions performed on that page.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Stay on Dashboard</AlertDialogCancel>
                      <AlertDialogAction onClick={navigateToResetPage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Go to Reset Page
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          className="text-xs text-muted-foreground mb-4 flex flex-col sm:flex-row justify-between items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{currentTime}</span>
            {isConnected ? (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`font-mono cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 3000 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50'
                      : delay < 10000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50'
                        : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50'}`
                    }>
                      {delay > 30000 ? '>30s lag' : `${(delay / 1000).toFixed(1)}s lag`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><p>Last data received {delay} ms ago</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
          <span className='font-mono'>{version || '?.?.?'}</span>
        </motion.div>
      </TooltipProvider>
    );
  }
);
DashboardHeaderControl.displayName = 'DashboardHeaderControl';
export default DashboardHeaderControl;