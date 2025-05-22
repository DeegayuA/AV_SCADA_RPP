'use client';

// src/components/dashboard/WebSocketStatus.tsx
import React from 'react';
import { motion } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';


interface WebSocketStatusProps {
    isConnected: boolean;
    connectFn: () => void;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = React.memo(({ isConnected, connectFn }) => {
    const wsAddress = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
    const title = isConnected
        ? `WebSocket Connected (Live Data)\n${wsAddress}`
        : `WebSocket Disconnected. Click to attempt reconnect.\n${wsAddress}`;
    const pulseVariants = { pulse: { scale: [1, 1.15, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } };

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {/* TooltipTrigger requires a single child */}
                    <motion.div
                         className="flex items-center gap-2 cursor-pointer"
                         onClick={connectFn}
                         title={title} // Using title prop as a fallback, but tooltip is preferred
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         aria-label={`WebSocket Status: ${isConnected ? 'Live' : 'Offline'}`}
                     >
                         <motion.div
                             className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 ring-2 ring-green-500/30' : 'bg-red-500 ring-2 ring-red-500/30'} flex-shrink-0`}
                             variants={pulseVariants}
                             animate={isConnected ? "pulse" : {}}
                         />
                         <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                              WS: {isConnected ? 'Live' : 'Offline'}
                         </span>
                    </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="whitespace-pre-line">{title}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

WebSocketStatus.displayName = 'WebSocketStatus';

export default WebSocketStatus;
