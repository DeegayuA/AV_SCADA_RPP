'use client';

// src/components/dashboard/ThreePhaseGaugeGroup.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ThreePhaseGroupInfo, NodeData } from './dashboardInterfaces';
import CircularGauge from './CircularGauge';
import { HelpCircle } from 'lucide-react'; // Default icon

interface ThreePhaseGaugeGroupProps {
    group: ThreePhaseGroupInfo;
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: any;
}

const ThreePhaseGaugeGroup: React.FC<ThreePhaseGaugeGroupProps> = React.memo(
    ({ group, nodeValues, isDisabled, currentHoverEffect }) => {
        const RepresentativeIcon = group.icon || HelpCircle;

        return (
            <motion.div className="rounded-lg overflow-hidden col-span-2 md:col-span-3" whileHover={currentHoverEffect}>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* Card is the trigger */}
                            <Card className={`h-full shadow-sm hover:shadow-md transition-all duration-200 border dark:border-border/50 bg-card ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-default'}`}>
                                <CardHeader className="p-3 bg-muted/30 dark:bg-muted/20 border-b dark:border-border/50">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground/90 truncate">
                                        <RepresentativeIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                        <span className="truncate" title={group.title}>{group.title}</span>
                                        {group.unit && <span className="ml-auto text-xs text-muted-foreground">({group.unit})</span>}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 flex flex-wrap justify-around items-end gap-x-4 gap-y-3">
                                    {/* Phase Gauges */}
                                    {(['a', 'b', 'c'] as const).map((phase) => {
                                        const point = group.points[phase];
                                        if (!point) return <div key={`${group.groupKey}-${phase}`} className="w-[90px] h-[110px] flex items-center justify-center text-xs text-muted-foreground opacity-50">(N/A)</div>;

                                        const value = nodeValues[point.nodeId];
                                        const gaugeValue = typeof value === 'number' ? value : null;

                                        return (
                                            <CircularGauge
                                                key={point.id} // Use the point's id for gauge key
                                                value={gaugeValue}
                                                unit={group.unit} // Use the group unit for consistent display
                                                label={`Phase ${phase.toUpperCase()}`} // Label for individual gauge
                                                size={90}
                                                strokeWidth={9}
                                                config={point} // Pass the individual point config for specific min/max/factor
                                            />
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        {/* Tooltip Content */}
                        {group.description && (<TooltipContent><p>{group.description}</p></TooltipContent>)}
                    </Tooltip>
                </TooltipProvider>
            </motion.div>
        );
    }
);

ThreePhaseGaugeGroup.displayName = 'ThreePhaseGaugeGroup';

export default ThreePhaseGaugeGroup;
