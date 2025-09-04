'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Signal, SignalZero } from 'lucide-react';

interface WebSocketStatusProps {
    isConnected: boolean;
    onClick: () => void;
    wsAddress?: string;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = React.memo(({ isConnected, onClick, wsAddress }) => {
    const StatusIcon = isConnected ? Signal : SignalZero;
    const statusText = isConnected ? 'Live' : 'Offline';
    const iconColor = isConnected ? 'text-green-500' : 'text-red-500';

    const getTitle = () => {
        const addressInfo = wsAddress || "address not available";
        if (isConnected) {
            return `Live Data Feed (WebSocket Connected)\nServer: ${addressInfo}`;
        }
        return `Connection Offline. Click to manage.\nTarget Server: ${addressInfo}`;
    };

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <motion.div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={onClick}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={`WebSocket Status: ${statusText}`}
                    >
                        <StatusIcon className={`h-5 w-5 ${iconColor} ${isConnected ? 'animate-pulse' : ''}`} />
                        <span className="text-xs sm:text-sm text-muted-foreground">{statusText}</span>
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