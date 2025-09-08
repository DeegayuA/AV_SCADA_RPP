'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Signal, SignalZero } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebSocketStatusProps {
    isConnected: boolean;
    onClick: () => void;
    wsAddress?: string;
    delay?: number;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = React.memo(({ isConnected, onClick, wsAddress, delay = 0 }) => {
    const StatusIcon = isConnected ? Signal : SignalZero;
    let statusText: string;
    let iconColor: string;
    let bgColor: string;

    if (isConnected) {
        statusText = delay > 30000 ? '>30s lag' : `${(delay / 1000).toFixed(1)}s lag`;
        if (delay < 3000) {
            iconColor = 'text-green-600 dark:text-green-300';
            bgColor = 'bg-green-100 dark:bg-green-900/50';
        } else if (delay < 10000) {
            iconColor = 'text-yellow-600 dark:text-yellow-400';
            bgColor = 'bg-yellow-100 dark:bg-yellow-900/50';
        } else {
            iconColor = 'text-red-600 dark:text-red-400';
            bgColor = 'bg-red-100 dark:bg-red-900/50';
        }
    } else {
        statusText = 'Offline';
        iconColor = 'text-gray-600 dark:text-gray-400';
        bgColor = 'bg-gray-200 dark:bg-gray-800';
    }

    const getTitle = () => {
        const addressInfo = wsAddress || "address not available";
        if (isConnected) {
            return `Live Data Feed (WebSocket Connected)\nLast update: ${delay}ms ago\nServer: ${addressInfo}`;
        }
        return `Connection Offline. Click to manage.\nTarget Server: ${addressInfo}`;
    };

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <motion.div
                        className={cn(
                            "flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-xs sm:text-sm font-medium cursor-pointer",
                            bgColor
                        )}
                        onClick={onClick}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={`WebSocket Status: ${statusText}`}
                    >
                        <StatusIcon className={cn("h-4 w-4", iconColor, { 'animate-pulse': isConnected && delay < 5000 })} />
                        <span className={cn("text-muted-foreground", iconColor)}>{statusText}</span>
                    </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="whitespace-pre-line">{getTitle()}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

WebSocketStatus.displayName = 'WebSocketStatus';

export default WebSocketStatus;