'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebSocketStatusProps {
    isConnected: boolean;
    onClick: () => void;
    wsAddress?: string;
    delay: number;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = React.memo(({ isConnected, onClick, wsAddress, delay }) => {
    const getTitle = () => {
        const addressInfo = wsAddress || "address not available";
        if (isConnected) {
            return `Live Data Feed (WebSocket Connected)\nServer: ${addressInfo}\nLast data received ${delay} ms ago.`;
        }
        return `Connection Offline. Click to manage.\nTarget Server: ${addressInfo}`;
    };

    const validDelay = typeof delay === 'number' && !isNaN(delay) ? delay : 0;
    const lagText = validDelay > 30000 ? '>30s' : `${(validDelay / 1000).toFixed(1)}s`;

    const getStatusInfo = () => {
        if (isConnected) {
            let lagColor = 'text-green-800 dark:text-green-300';
            if (validDelay >= 10000) lagColor = 'text-red-800 dark:text-red-300';
            else if (validDelay >= 3000) lagColor = 'text-yellow-800 dark:text-yellow-300';

            return {
                text: 'WS: Live',
                Icon: Wifi,
                className: `bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 cursor-pointer hover:bg-green-200 dark:hover:bg-green-800/60`,
                lagColor: lagColor,
                pulsate: true,
            };
        }
        return {
            text: 'WS: Off',
            Icon: WifiOff,
            className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 cursor-pointer hover:bg-red-200 dark:hover:bg-red-800/60',
            lagColor: '',
            pulsate: false,
        };
    };

    const { text, Icon, className, lagColor, pulsate } = getStatusInfo();

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        onClick={onClick}
                        className={cn(
                            'flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors',
                            className
                        )}
                    >
                        <motion.div
                            animate={pulsate ? { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7], transition: { duration: 2.5, repeat: Infinity } } : {}}
                        >
                            <Icon className="h-4 w-4" />
                        </motion.div>
                        <span>{text}</span>
                        {isConnected && (
                            <span className={cn("font-mono text-xs", lagColor)}>
                                {lagText}
                            </span>
                        )}
                    </div>
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