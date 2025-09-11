'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Server, RefreshCcw } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PlcStatus = 'connected' | 'connecting' | 'disconnected';

interface PlcConnectionStatusProps {
    status: PlcStatus;
    onRefresh: () => void;
}

const PlcConnectionStatus: React.FC<PlcConnectionStatusProps> = React.memo(({ status, onRefresh }) => {
    const getStatusInfo = (): { icon: React.ReactNode; text: string; color: string; tooltip: string; } => {
        switch (status) {
            case 'connected':
                return {
                    icon: <Wifi className="h-5 w-5" />,
                    text: 'PLC Connected',
                    color: 'text-green-500',
                    tooltip: 'PLC connection is active.'
                };
            case 'connecting':
                return {
                    icon: <Server className="h-5 w-5 animate-pulse" />,
                    text: 'PLC Connecting',
                    color: 'text-yellow-500',
                    tooltip: 'Attempting to connect to the PLC...'
                };
            case 'disconnected':
            default:
                return {
                    icon: <WifiOff className="h-5 w-5" />,
                    text: 'PLC Disconnected',
                    color: 'text-red-500',
                    tooltip: 'PLC is not connected. Click refresh to try again.'
                };
        }
    };

    const { icon, text, color, tooltip } = getStatusInfo();

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "flex items-center gap-2 rounded-full border bg-background py-1 pl-2 pr-3 transition-all",
                        status === 'connected' && 'border-green-500/20',
                        status === 'connecting' && 'border-yellow-500/20',
                        status === 'disconnected' && 'border-red-500/20',
                    )}>
                        <div className={cn("flex-shrink-0", color)}>
                            {icon}
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{text}</span>

                        {status === 'disconnected' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-1 h-6 w-6"
                                onClick={(e) => {
                                    e.stopPropagation(); // prevent tooltip from staying open
                                    onRefresh();
                                }}
                            >
                                <RefreshCcw className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

PlcConnectionStatus.displayName = 'PlcConnectionStatus';

export default PlcConnectionStatus;
