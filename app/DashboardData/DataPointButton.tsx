'use client';

// src/components/dashboard/DataPointButton.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataPoint as DataPointConfig } from '@/config/dataPoints';
import { HelpCircle } from 'lucide-react'; // Default icon

interface DataPointButtonProps {
    point: DataPointConfig;
    isDisabled: boolean; // Disable based on connection status
    sendData: (nodeId: string, value: boolean | number | string) => void;
}

const DataPointButton: React.FC<DataPointButtonProps> = React.memo(
    ({ point, isDisabled, sendData }) => {
        const PointIcon = point.icon || HelpCircle;

        // Assuming buttons send a specific value (e.g., `true` or `1`)
        // The original code sent `true`
        const valueToSend = point.dataType === 'Boolean' ? true : (point.dataType?.includes('Int') ? 1 : String(true));


        return (
            <motion.div className="col-span-1"> {/* No whileHover here, it's on the inner motion.div */}
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        {/* TooltipTrigger wraps the clickable motion.div */}
                        <TooltipTrigger asChild>
                            <motion.div
                                 whileHover={!isDisabled ? { scale: 1.03, y: -1 } : {}}
                                 whileTap={!isDisabled ? { scale: 0.98 } : {}}
                                 className="h-full"
                             >
                                 {/* The actual Button component */}
                                <Button
                                    onClick={() => sendData(point.nodeId, valueToSend)}
                                    className="w-full h-full justify-start p-3 text-left bg-card border dark:border-border/50 rounded-lg shadow-sm hover:bg-muted/50 dark:hover:bg-muted/30 hover:shadow-md transition-all text-card-foreground/90"
                                    variant="outline"
                                    disabled={isDisabled}
                                    aria-label={point.name}
                                >
                                    <PointIcon className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                                    <span className="text-sm font-medium">{point.name}</span>
                                </Button>
                            </motion.div>
                        </TooltipTrigger>
                        {/* Tooltip Content */}
                        <TooltipContent side="bottom">
                            <p>{point.description ?? 'Click to activate.'}</p>
                            <p className="text-xs text-muted-foreground mt-1">ID: {point.nodeId} ({point.dataType})</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </motion.div>
        );
    }
);

DataPointButton.displayName = 'DataPointButton';

export default DataPointButton;