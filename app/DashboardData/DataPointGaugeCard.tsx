// src/components/dashboard/DataPointGaugeCard.tsx
'use client';
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
import { HelpCircle, Zap, Thermometer, Droplet, Percent } from 'lucide-react'; // Example icons
import clsx from 'clsx';
import WowCircularGauge from './CircularGauge';

interface DataPointGaugeCardProps {
    point: DataPointConfig;
    nodeValue: NodeData[string];
    isDisabled: boolean;
    currentHoverEffect?: any;}

// Function to select an icon based on unit or name (Example)
const getIconForPoint = (point: DataPointConfig): React.ElementType => {
    if (point.icon) return point.icon; // Use config icon first
    if (point.unit === 'V' || point.unit === 'A' || point.unit === 'W') return Zap;
    if (point.unit === '°C' || point.unit === '°F') return Thermometer;
    if (point.unit === '%') return Percent;
    if (point.name?.toLowerCase().includes('humidity')) return Droplet;
    return HelpCircle; // Default
}


const DataPointGaugeCard: React.FC<DataPointGaugeCardProps> = React.memo(
    ({ point, nodeValue, isDisabled }) => { // Removed currentHoverEffect prop
        const PointIcon = getIconForPoint(point);
        const value = typeof nodeValue === 'number' ? nodeValue : (nodeValue === null ? null : undefined); // Handle undefined for loading state

        // Card hover effect defined here
        const cardHoverEffect = isDisabled ? {} : { scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 20 } };


        return (
            <motion.div
                className="col-span-1"
                whileHover={cardHoverEffect} // Apply hover effect to the motion div wrapper
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                >
                <TooltipProvider delayDuration={150}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             {/* Wrap Card in the trigger */}
                            <Card className={clsx(
                                'h-full p-3 flex flex-col items-center justify-between', // Use justify-between
                                'shadow-md hover:shadow-lg transition-all duration-300',
                                'border dark:border-neutral-800 bg-card/80 dark:bg-neutral-900/80', // Use semi-transparent backgrounds
                                'backdrop-blur-sm', // Glassmorphism hint
                                'min-h-[180px] sm:min-h-[200px]', // Increased min-height
                                isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-default',
                                'rounded-xl' // More rounded
                                )}
                            >
                                {/* Top Section: Icon and Name */}
                                <div className="flex flex-col items-center gap-1 text-center w-full">
                                    <PointIcon className="w-5 h-5 text-primary mb-1 flex-shrink-0" strokeWidth={1.5}/>
                                    <span className="text-xs font-medium text-card-foreground/80 dark:text-neutral-300 leading-tight px-1 truncate max-w-[130px]" title={point.name}>
                                        {point.name}
                                    </span>
                                    {/* Optional Min/Max Display */}
                                    {(point.min !== undefined || point.max !== undefined) && (
                                         <div className="text-[10px] text-muted-foreground/70 dark:text-neutral-500">
                                             ({point.min ?? '–'} to {point.max ?? '–'})
                                         </div>
                                     )}
                                </div>

                                {/* Gauge Section - Takes remaining space */}
                                <div className="w-full flex-grow flex items-center justify-center mt-1 mb-1">
                                    <WowCircularGauge
                                        value={value} // Pass number | null | undefined
                                        // label={point.name} // Label now handled above
                                        size={110}      // Slightly larger default size?
                                        strokeWidth={12} // Match gauge default
                                        config={point}   // Pass the full config
                                    />
                                </div>

                            </Card>
                        </TooltipTrigger>
                        {/* Tooltip Content */}
                        <TooltipContent side="bottom" className="max-w-[250px]">
                             <p className="font-semibold text-sm mb-1">{point.name}</p>
                             <p className="text-xs">{point.description ?? 'No specific description available.'}</p>
                             <p className="text-xs text-muted-foreground mt-2">
                                ID: {point.nodeId}
                                {point.dataType && ` (${point.dataType})`}
                                {point.unit && `, Unit: ${point.unit}`}
                             </p>
                             <p className="text-xs text-muted-foreground">
                                Range: {point.min ?? 'N/A'} - {point.max ?? 'N/A'}
                             </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </motion.div>
        );
    }
);

DataPointGaugeCard.displayName = 'DataPointGaugeCard';
export default DataPointGaugeCard;
