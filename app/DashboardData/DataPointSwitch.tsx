'use client';

// src/components/dashboard/DataPointSwitch.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataPoint as DataPointConfig } from '@/config/dataPoints';
import { NodeData } from './dashboardInterfaces';
import { HelpCircle } from 'lucide-react'; // Default icon

interface DataPointSwitchProps {
    point: DataPointConfig;
    nodeValue: NodeData[string];
    isDisabled: boolean; // Disable based on connection status
    sendData: (nodeId: string, value: boolean | number | string) => void;
}

const DataPointSwitch: React.FC<DataPointSwitchProps> = React.memo(
    ({ point, nodeValue, isDisabled, sendData }) => {
        const PointIcon = point.icon || HelpCircle;

        // Determine checked state based on raw value
        let isChecked = false;
        if (typeof nodeValue === 'boolean') isChecked = nodeValue;
        else if (typeof nodeValue === 'number') isChecked = nodeValue === 1;
        // Add other type checks if necessary, though OPC UA bool/int(0/1) are common

        // Determine if the switch itself should be disabled (disconnected, or value is unknown/error)
        const switchDisabled = isDisabled || nodeValue === undefined || nodeValue === null || nodeValue === 'Error';

        return (
            <motion.div className="col-span-1"> {/* No whileHover here */}
                 <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        {/* Card is the trigger, allowing tooltip over the text */}
                        <Card className={`h-full p-3 flex items-center justify-between cursor-default transition-opacity shadow-sm hover:shadow-md border dark:border-border/50 bg-card min-h-[60px] sm:min-h-[64px] ${switchDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
                            <TooltipTrigger asChild>
                                 {/* This div triggers the tooltip on hover */}
                                <div className="flex items-center gap-2 overflow-hidden mr-2 flex-1 cursor-help">
                                    <PointIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                    <span className="text-xs font-medium truncate text-card-foreground/80" title={point.name}>{point.name}</span>
                                </div>
                            </TooltipTrigger>
                             {/* Motion div wraps the switch for hover effects */}
                            <motion.div
                                whileHover={!switchDisabled ? { scale: 1.05 } : {}}
                                whileTap={!switchDisabled ? { scale: 0.95 } : {}}
                                className="flex-shrink-0"
                            >
                                 {/* The actual Switch component */}
                                <Switch
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                        // Send appropriate value based on data type
                                        const valueToSend = point.dataType === 'Boolean' ? checked : (checked ? 1 : 0);
                                        sendData(point.nodeId, valueToSend);
                                    }}
                                    disabled={switchDisabled}
                                    aria-label={point.name}
                                    id={`switch-${point.id}`}
                                />
                            </motion.div>
                        </Card>
                         {/* Tooltip Content */}
                        <TooltipContent side="bottom">
                            <p>{point.description ?? 'Toggle setting.'}</p>
                            <p className="text-xs text-muted-foreground mt-1">ID: {point.nodeId} ({point.dataType})</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </motion.div>
        );
    }
);

DataPointSwitch.displayName = 'DataPointSwitch';

export default DataPointSwitch;