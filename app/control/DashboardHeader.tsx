'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { itemVariants } from '@/config/animationVariants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PLANT_NAME } from '@/config/constants';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Settings, Pencil, Clock, Trash2, RotateCcw, Power, Check } from 'lucide-react'; // Added Power, Trash2, RotateCcw
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
} from "@/components/ui/alert-dialog"; // For confirmation
import PlcConnectionStatus from '../DashboardData/PlcConnectionStatus';
import WebSocketStatus from '../DashboardData/WebSocketStatus';
import SoundToggle from '../DashboardData/SoundToggle';
import ThemeToggle from '../DashboardData/ThemeToggle';

interface DashboardHeaderProps {
    plcStatus: "online" | "offline" | "disconnected";
    isConnected: boolean;
    connectWebSocket: () => void;
    soundEnabled: boolean;
    setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    currentTime: string;
    delay: number;
    version: string;
    onOpenConfigurator: () => void;
    isEditMode: boolean;
    setIsEditMode: (isEditing: boolean) => void;
    onRemoveAll: () => void;        // New Prop
    onResetToDefault: () => void;  // New Prop
}

const DashboardHeaderControl: React.FC<DashboardHeaderProps> = React.memo(
    ({
        plcStatus,
        isConnected,
        connectWebSocket,
        soundEnabled,
        setSoundEnabled,
        currentTime,
        delay,
        version,
        onOpenConfigurator,
        isEditMode,
        setIsEditMode,
        onRemoveAll,
        onResetToDefault,
    }) => {
        const pathname = usePathname();
        const headerTitle = pathname?.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';

        return (
            <>
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
                        {isEditMode && (
                            <>
                                <motion.div variants={itemVariants}>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={onOpenConfigurator}
                                        title="Add new cards to the dashboard"
                                    >
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
                                            <AlertDialogAction
                                                onClick={onRemoveAll}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
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
                                            </Button>
                                        </motion.div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Reset to Default Layout?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will discard your current layout and restore the default set of cards.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={onResetToDefault}>Reset</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        )}
                        <motion.div variants={itemVariants}>

                        </motion.div>
                        <motion.div variants={itemVariants}><PlcConnectionStatus status={plcStatus} /></motion.div>
                        <motion.div variants={itemVariants}><WebSocketStatus isConnected={isConnected} connectFn={connectWebSocket} /></motion.div>
                        
                        <motion.div variants={itemVariants}>
                            <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={isEditMode ? "secondary" : "ghost"} // 'secondary' when active, 'ghost' otherwise
                                            size="icon" // Standard icon button size
                                            onClick={() => setIsEditMode(!isEditMode)}
                                        >
                                            {isEditMode ? (
                                                (<Check className="h-5 w-5" />) // Icon when in edit mode (Done)
                                            ) : (
                                                (<Settings className="h-5 w-5" />) // Icon when not in edit mode (Edit)
                                            )}
                                            <span className="sr-only">
                                                {isEditMode ? "Done Editing Layout" : "Edit Dashboard Layout"}
                                            </span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isEditMode ? "Done Editing Layout" : "Edit Dashboard Layout"}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </motion.div>

                        <motion.div variants={itemVariants}><SoundToggle soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} /></motion.div>
                        <motion.div variants={itemVariants}><ThemeToggle /></motion.div>
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
                                        <span
                                            className={`font-mono cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 3000 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50'
                                                    : delay < 10000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50'
                                                        : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50'}`}
                                        >
                                            {delay > 30000 ? '>30s lag' : `${(delay / 1000).toFixed(1)}s lag`}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Last data received {delay} ms ago</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="px-1.5 py-0.5 h-auto text-xs text-muted-foreground hover:text-foreground"
                                onClick={connectWebSocket}
                                title="Attempt manual WebSocket reconnection"
                            >
                                <Power className="mr-1 h-3 w-3" /> Reconnect
                            </Button>
                        )}
                    </div>
                    <span className='font-mono'>{version || '?.?.?'}</span>
                </motion.div>
            </>
        );
    }
);

DashboardHeaderControl.displayName = 'DashboardHeader';

export default DashboardHeaderControl;