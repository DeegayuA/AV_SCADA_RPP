// src/components/dashboard/DataPointDisplayCard.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataPoint as DataPointConfig } from '@/config/dataPoints';
import { NodeData } from './dashboardInterfaces';
import { HelpCircle } from 'lucide-react';
import ValueDisplayContent from './ValueDisplayContent'; // Ensure this path is correct

// Augment the DataPoint interface from its original module
declare module '@/config/dataPoints' {
  interface DataPoint {
    notes?: string; // Add the optional 'notes' property
  }
}

interface DataPointDisplayCardProps {
    point: DataPointConfig;
    // nodeValue: NodeData[string]; // Changed to nodeValues (full map)
    nodeValues: NodeData; // Added: ValueDisplayContent needs the full map
    isDisabled: boolean;
    currentHoverEffect: any;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    // Add missing props that ValueDisplayContent needs
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    isEditMode: boolean;
}

const DataPointDisplayCard: React.FC<DataPointDisplayCardProps> = React.memo(
    ({ point, nodeValues, isDisabled, currentHoverEffect, playNotificationSound, lastToastTimestamps, sendDataToWebSocket, isEditMode }) => {
        const rawValue = nodeValues[point.nodeId];
        const PointIcon = point.icon || HelpCircle;
        const effectiveIsDisabled = isDisabled && point.category !== 'status';

        return (
            <motion.div className="rounded-lg overflow-hidden col-span-1" whileHover={currentHoverEffect}>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className={`h-full p-3 flex items-center justify-between min-h-[60px] sm:min-h-[64px] shadow-sm hover:shadow-md transition-all duration-200 border dark:border-border/50 bg-card ${effectiveIsDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-default'}`}>
                                <div className='flex items-center gap-2 overflow-hidden mr-2 flex-1 cursor-help'>
                                    <PointIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                    <span className="text-xs font-medium text-card-foreground/80 truncate" title={point.name}>
                                        {point.name}
                                    </span>
                                </div>
                                <div className="text-sm sm:text-base md:text-lg text-right flex-shrink-0 pl-1 whitespace-nowrap">
                                    <ValueDisplayContent
                                        item={point}
                                        rawValue={rawValue}
                                        isDisabled={effectiveIsDisabled}
                                        sendDataToWebSocket={sendDataToWebSocket}
                                        playNotificationSound={playNotificationSound}
                                        lastToastTimestamps={lastToastTimestamps}
                                        isEditMode={isEditMode}
                                    />
                                </div>
                            </Card>
                        </TooltipTrigger>
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