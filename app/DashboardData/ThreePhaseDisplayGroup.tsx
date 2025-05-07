'use client';

// src/components/dashboard/ThreePhaseDisplayGroup.tsx
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
import { HelpCircle } from 'lucide-react'; // Default icon
import ValueDisplayContent from './ValueDisplayContent';

interface ThreePhaseDisplayGroupProps {
    group: ThreePhaseGroupInfo;
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: any;
     playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
}

const ThreePhaseDisplayGroup: React.FC<ThreePhaseDisplayGroupProps> = React.memo(
    ({ group, nodeValues, isDisabled, currentHoverEffect, playNotificationSound, lastToastTimestamps }) => {
        const RepresentativeIcon = group.icon || HelpCircle;

        return (
            <motion.div className="rounded-lg overflow-hidden col-span-1 md:col-span-2" whileHover={currentHoverEffect}>
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
                                <CardContent className="p-3 text-sm">
                                    <div className="grid grid-cols-3 gap-x-2 gap-y-1 items-center">
                                        {/* Phase Headers */}
                                        {(['a', 'b', 'c'] as const).map(phase => (
                                            <div key={`head-${group.groupKey}-${phase}`} className="text-xs font-medium text-muted-foreground text-center border-b pb-1 dark:border-border/50">
                                                {group.points[phase] ? `Ph ${phase.toUpperCase()}` : '-'}
                                            </div>
                                        ))}
                                        {/* Phase Values */}
                                        {(['a', 'b', 'c'] as const).map((phase) => {
                                            const point = group.points[phase];
                                            return (
                                                <div key={`${group.groupKey}-${phase}`} className="text-center pt-1 min-h-[28px] flex items-center justify-center text-base md:text-lg">
                                                    {point ? (
                                                        <ValueDisplayContent
                                                            value={nodeValues[point.nodeId]}
                                                            config={point}
                                                            playNotificationSound={playNotificationSound}
                                                            lastToastTimestamps={lastToastTimestamps}
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-gray-600">-</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
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

ThreePhaseDisplayGroup.displayName = 'ThreePhaseDisplayGroup';

export default ThreePhaseDisplayGroup;
