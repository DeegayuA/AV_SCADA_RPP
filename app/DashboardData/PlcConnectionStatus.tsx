'use client';

// src/components/dashboard/PlcConnectionStatus.tsx
import React from 'react';
import { motion } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface PlcConnectionStatusProps {
    status: 'online' | 'offline' | 'disconnected';
    onClick?: () => void;
}

const PlcConnectionStatus: React.FC<PlcConnectionStatusProps> = React.memo(({ status, onClick }) => {
    let statusText = '';
    let dotClass = '';
    let title = `PLC Status: ${status}`;
    let clickHandler = onClick || (() => {});

    // NOTE: The original code had 'online' for remote and 'offline' for local.
    // This seems counter-intuitive to standard 'online/offline' meaning.
    // Reverted to more standard interpretation: 'online' means connected (remote or local),
    // 'offline' might mean PLC is running but not exposed via API, 'disconnected' is no response.
    // If the original 'online/offline' mapping is required, adjust the text/titles.
     switch (status) {
        case 'online': statusText = 'PLC: Connected (Remote)'; dotClass = 'bg-blue-500 ring-2 ring-blue-500/30 animate-pulse'; title = 'PLC connected remotely via API'; break;
        case 'offline': statusText = 'PLC: Running (Local)'; dotClass = 'bg-sky-400 ring-2 ring-sky-400/30 animate-pulse'; title = 'PLC connected locally (Direct API?)'; break;
        case 'disconnected': default: statusText = 'PLC: Disconnected'; dotClass = 'bg-gray-400 dark:bg-gray-600'; title = 'PLC Disconnected. Click to configure.'; if (!onClick) { clickHandler = () => { if (typeof window !== 'undefined') window.location.reload(); }; title = 'PLC Disconnected. Click to refresh page.'; } break;
    }

    const dotVariants = { initial: { scale: 0 }, animate: { scale: 1 } };

    return (
        <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                         {/* TooltipTrigger requires a single child that accepts ref/event handlers */}
                        <motion.div
                            className={`w-3 h-3 rounded-full ${dotClass} ${status === 'disconnected' ? 'cursor-pointer hover:opacity-80' : ''} flex-shrink-0`}
                            variants={dotVariants}
                            initial="initial"
                            animate="animate"
                            onClick={clickHandler}
                            whileHover={status === 'disconnected' ? { scale: 1.2 } : {}}
                            aria-label={`PLC Status: ${status}`}
                        />
                    </TooltipTrigger>
                    <TooltipContent><p>{title}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <span className="text-xs sm:text-sm text-muted-foreground">{statusText}</span>
        </motion.div>
    );
});

PlcConnectionStatus.displayName = 'PlcConnectionStatus';

export default PlcConnectionStatus;
