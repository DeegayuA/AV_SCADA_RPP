'use client';

// src/components/dashboard/DataPointDisplayCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card'; // Assuming Card is ui/card
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataPoint as DataPointConfig } from '@/config/dataPoints';
import { NodeData } from './dashboardInterfaces'; // Import NodeData
import { HelpCircle } from 'lucide-react'; // Default icon
import ValueDisplayContent from './ValueDisplayContent';

interface DataPointDisplayCardProps {
    point: DataPointConfig;
    nodeValue: NodeData[string];
    isDisabled: boolean; // Consider disabling based on connection status
    currentHoverEffect: any; // Pass hover effect based on theme
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
}

const DataPointDisplayCard: React.FC<DataPointDisplayCardProps> = React.memo(
    ({ point, nodeValue, isDisabled, currentHoverEffect, playNotificationSound, lastToastTimestamps }) => {
        const PointIcon = point.icon || HelpCircle;
        // Disable only if disconnected AND it's not a status point
        const effectiveIsDisabled = isDisabled && point.category !== 'status';

        return (
            <motion.div className="rounded-lg overflow-hidden col-span-1" whileHover={currentHoverEffect}>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* The Card itself is the trigger */}
                            <Card className={`h-full p-3 flex items-center justify-between min-h-[60px] sm:min-h-[64px] shadow-sm hover:shadow-md transition-all duration-200 border dark:border-border/50 bg-card ${effectiveIsDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-default'}`}>
                                <div className='flex items-center gap-2 overflow-hidden mr-2 flex-1 cursor-help'> {/* cursor-help on this div for tooltip */}
                                    <PointIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                    <span className="text-xs font-medium text-card-foreground/80 truncate" title={point.name}>
                                        {point.name}
                                    </span>
                                </div>
                                {/* Render the actual value using the helper component */}
                                <div className="text-sm sm:text-base md:text-lg text-right flex-shrink-0 pl-1 whitespace-nowrap">
                                    <ValueDisplayContent
                                        value={nodeValue}
                                        config={point}
                                        playNotificationSound={playNotificationSound}
                                        lastToastTimestamps={lastToastTimestamps}
                                    />
                                </div>
                            </Card>
                        </TooltipTrigger>
                        {/* Tooltip Content */}
                        <TooltipContent side="bottom">
                            <p>{point.description ?? 'No description.'}</p>
                            <p className="text-xs text-muted-foreground mt-1">ID: {point.nodeId} ({point.dataType})</p>
                             {point.notes && <p className="text-xs text-blue-500 mt-1">Note: {point.notes}</p>}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </motion.div>
        );
    }
);

DataPointDisplayCard.displayName = 'DataPointDisplayCard';

export default DataPointDisplayCard;