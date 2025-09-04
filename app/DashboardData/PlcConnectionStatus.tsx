'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, Server, WifiOff, RefreshCw } from 'lucide-react';

interface PlcConnectionStatusProps {
    status: 'online' | 'offline' | 'disconnected';
}

const PlcConnectionStatus: React.FC<PlcConnectionStatusProps> = React.memo(({ status }) => {
    let StatusIcon;
    let statusText;
    let title;
    let iconColor;

    switch (status) {
        case 'online':
            StatusIcon = Wifi;
            statusText = 'Online';
            title = 'PLC connected remotely via API';
            iconColor = 'text-blue-500';
            break;
        case 'offline':
            StatusIcon = Server;
            statusText = 'Local';
            title = 'PLC connected locally';
            iconColor = 'text-sky-400';
            break;
        case 'disconnected':
        default:
            StatusIcon = WifiOff;
            statusText = 'Offline';
            title = 'PLC Disconnected';
            iconColor = 'text-gray-400 dark:text-gray-600';
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
                        <div className="flex items-center gap-2">
                            <StatusIcon className={`h-5 w-5 ${iconColor}`} />
                            <span className="text-xs sm:text-sm text-muted-foreground">{statusText}</span>
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
                            <RefreshCw className={`h-4 w-4 ${status === 'disconnected' ? 'animate-spin' : ''}`} />
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
