'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, Server, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlcConnectionStatusProps {
    status: 'online' | 'offline' | 'disconnected';
}

const PlcConnectionStatus: React.FC<PlcConnectionStatusProps> = React.memo(({ status }) => {
    let StatusIcon;
    let statusText;
    let title;
    let iconColor;
    let bgColor;

    switch (status) {
        case 'online':
            StatusIcon = Wifi;
            statusText = 'Online';
            title = 'PLC connected remotely via API';
            iconColor = 'text-blue-600 dark:text-blue-300';
            bgColor = 'bg-blue-100 dark:bg-blue-900/50';
            break;
        case 'offline':
            StatusIcon = Server;
            statusText = 'Local';
            title = 'PLC connected locally';
            iconColor = 'text-sky-600 dark:text-sky-300';
            bgColor = 'bg-sky-100 dark:bg-sky-900/50';
            break;
        case 'disconnected':
        default:
            StatusIcon = WifiOff;
            statusText = 'Disconnected';
            title = 'PLC Disconnected';
            iconColor = 'text-gray-600 dark:text-gray-400';
            bgColor = 'bg-gray-200 dark:bg-gray-800';
            break;
    }

    const handleRefresh = () => {
        if (status === 'disconnected' && typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    return (
        <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
        >
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn(
                            "flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-xs sm:text-sm font-medium",
                            bgColor
                        )}>
                            <StatusIcon className={cn("h-4 w-4", iconColor)} />
                            <span className={cn("text-muted-foreground", iconColor)}>{statusText}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{title}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleRefresh}
                            disabled={status !== 'disconnected'}
                            className="disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Refresh PLC Status"
                        >
                            <RefreshCw className={`h-4 w-4 ${status === 'disconnected' ? 'animate-spin' : ''} text-muted-foreground`} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {status === 'disconnected' ? <p>Click to refresh</p> : <p>Refresh (disabled)</p>}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </motion.div>
    );
});

PlcConnectionStatus.displayName = 'PlcConnectionStatus';

export default PlcConnectionStatus;
