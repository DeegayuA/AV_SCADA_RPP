// app/DashboardData/WebSocketStatus.tsx

'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion'; // Import Variants
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils'; // Optional: for conditional classes if needed

// Interface to receive connection state, the click handler, and the URL
interface WebSocketStatusProps {
    isConnected: boolean;
    onClick: () => void;
    wsAddress?: string; // Optional string for the current WS address
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = React.memo(({ isConnected, onClick, wsAddress }) => {
    // Make the tooltip message more informative based on what we know
    const getTitle = () => {
        const addressInfo = wsAddress || "address not available yet...";
        if (isConnected) {
            return `Live Data Feed (WebSocket Connected)\nServer: ${addressInfo}`;
        }
        return `Connection Offline. Click to manage.\nTarget Server: ${addressInfo}`;
    };

    // Corrected: Added the explicit 'Variants' type annotation
    const pulseVariants: Variants = {
        pulse: {
            scale: [1, 1.15, 1],
            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }
    };

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <motion.div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={onClick}
                        title={getTitle()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={`WebSocket Status: ${isConnected ? 'Live' : 'Offline'}`}
                    >
                        <motion.div
                            className={cn(
                                'w-3 h-3 rounded-full flex-shrink-0 ring-2',
                                isConnected
                                    ? 'bg-green-500 ring-green-500/30'
                                    : 'bg-red-500 ring-red-500/30'
                            )}
                            variants={pulseVariants}
                            animate={isConnected ? "pulse" : {}}
                        />
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                            WS: {isConnected ? 'Live' : 'Offline'}
                        </span>
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