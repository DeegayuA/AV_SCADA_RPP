'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface WebSocketStatusProps {
    isConnected: boolean;
    onClick: () => void;
    wsAddress?: string;
    delay: number; // Delay in milliseconds
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = React.memo(({ isConnected, onClick, wsAddress, delay }) => {

    const getLagIndicator = () => {
        if (!isConnected) {
            return {
                icon: <WifiOff className="h-5 w-5" />,
                text: 'WS Offline',
                color: 'text-red-500',
                bgColor: 'bg-red-500/10 border-red-500/20',
                tooltip: `WebSocket is disconnected. Click to manage connection.\nTarget: ${wsAddress || 'N/A'}`
            };
        }

        if (delay < 3000) {
            return {
                icon: <Wifi className="h-5 w-5" />,
                text: `${(delay / 1000).toFixed(1)}s lag`,
                color: 'text-green-500',
                bgColor: 'bg-green-500/10 border-green-500/20',
                tooltip: `Live data feed active. Last update was ${delay}ms ago.\nServer: ${wsAddress}`
            };
        } else if (delay < 10000) {
            return {
                icon: <Wifi className="h-5 w-5" />,
                text: `${(delay / 1000).toFixed(1)}s lag`,
                color: 'text-yellow-500',
                bgColor: 'bg-yellow-500/10 border-yellow-500/20',
                tooltip: `Connection is lagging. Last update was ${delay}ms ago.\nServer: ${wsAddress}`
            };
        } else {
            return {
                icon: <Wifi className="h-5 w-5" />,
                text: '>10s lag',
                color: 'text-orange-500',
                bgColor: 'bg-orange-500/10 border-orange-500/20',
                tooltip: `High connection lag. Last update was ${delay}ms ago.\nServer: ${wsAddress}`
            };
        }
    };

    const { icon, text, color, bgColor, tooltip } = getLagIndicator();

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        onClick={onClick}
                        className={cn(
                            "flex items-center gap-2 rounded-full border bg-background py-1 pl-2 pr-3 transition-all cursor-pointer",
                            bgColor
                        )}
                    >
                        <div className={cn("flex-shrink-0", color)}>
                            {icon}
                        </div>
                        <span className={cn("text-xs sm:text-sm font-mono", color)}>
                            {text}
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="whitespace-pre-line">{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

WebSocketStatus.displayName = 'WebSocketStatus';

export default WebSocketStatus;