'use client';
import React from 'react';
import { motion } from 'framer-motion';
import PlcConnectionStatus from './PlcConnectionStatus';
import WebSocketStatus from './WebSocketStatus';
import ThemeToggle from './ThemeToggle';
import SoundToggle from './SoundToggle';
import { itemVariants } from '@/config/animationVariants'; // Assuming variants are moved here
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import { Tooltip, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { PLANT_NAME } from '@/config/constants';
import { usePathname } from 'next/navigation';

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
}

const DashboardHeader: React.FC<DashboardHeaderProps> = React.memo(
    ({ plcStatus, isConnected, connectWebSocket, soundEnabled, setSoundEnabled, currentTime, delay, version }) => {
        const pathname = usePathname();
        const header = pathname?.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
        return (
            <><motion.div
                className="flex flex-col sm:flex-row justify-between items-center mb-2 md:mb-4 gap-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center sm:text-left">
                   {PLANT_NAME} {header}
                </h1>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center"> {/* Removed motion.div here as itemVariants are applied to children */}
                    <motion.div variants={itemVariants}><PlcConnectionStatus status={plcStatus} /></motion.div>
                    <motion.div variants={itemVariants}><WebSocketStatus isConnected={isConnected} connectFn={connectWebSocket} /></motion.div>
                    <motion.div variants={itemVariants}><SoundToggle soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} /></motion.div>
                    <motion.div variants={itemVariants}><ThemeToggle /></motion.div>
                </div>
            </motion.div>
                <motion.div className="text-xs text-muted-foreground mb-2 flex flex-col sm:flex-row justify-between items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
                    <div className="flex items-center gap-2">
                        {/* Clock Display */}
                        {/* Assuming Clock icon is available or imported if needed */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        <span>{currentTime}</span>
                        {/* Lag Display */}
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {/* Using a span for the trigger */}
                                    <span
                                        className={`font-mono cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 3000 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50'
                                                : delay < 10000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50'
                                                    : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50'}`}
                                    >
                                        {/* Conditional Lag Text */}
                                        {delay > 30000
                                            ? '>30s lag'
                                            : `${(delay / 1000).toFixed(1)}s lag`}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent><p>Last data received {delay} ms ago</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    {/* Version Display */}
                    <span className='font-mono'>v{version || '?.?.?'}</span>
                </motion.div></>
        );
    }
);

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;
