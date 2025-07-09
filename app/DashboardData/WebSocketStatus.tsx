'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// CORRECTED PROPS INTERFACE
interface WebSocketStatusProps {
    isConnected: boolean;
    onClick: () => void;
    wsAddress?: string;
    onConnect?: () => void;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = React.memo(({ isConnected, onClick, wsAddress }) => {
    const title = isConnected
        ? `WebSocket Connected (Live Data)\n${wsAddress || 'Unknown Address'}`
        : `WebSocket Disconnected. Click to manage connection.\n${wsAddress || 'Default Address'}`;
    const pulseVariants = { pulse: { scale: [1, 1.15, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } };

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {/* The div below now correctly uses the 'onClick' prop */}
                    <motion.div
                         className="flex items-center gap-2 cursor-pointer"
                         onClick={onClick}
                         title={title}
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