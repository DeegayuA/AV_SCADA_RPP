// src/components/dashboard/ThreePhaseDisplayGroup.tsx

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ThreePhaseGroupInfo, NodeData } from './dashboardInterfaces';
import { DataPoint } from '@/config/dataPoints'; // Make sure DataPoint is exported
import { HelpCircle,Sigma } from 'lucide-react'; // Sigma for Total
import ValueDisplayContent from './ValueDisplayContent';

interface ThreePhaseDisplayGroupProps {
    group: ThreePhaseGroupInfo;
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: any;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    isEditMode: boolean;
}

const ThreePhaseDisplayGroup: React.FC<ThreePhaseDisplayGroupProps> = React.memo(
    ({ group, nodeValues, isDisabled, currentHoverEffect, playNotificationSound, lastToastTimestamps, sendDataToWebSocket, isEditMode }) => {
        const RepresentativeIcon = group.icon || HelpCircle;

        // Calculate Total Value
        const totalValue = useMemo(() => {
            let sum = 0;
            let hasValidPhase = false;
            (['a', 'b', 'c'] as const).forEach(phase => {
                const point = group.points[phase];
                if (point && point.nodeId) {
                    const rawValue = nodeValues[point.nodeId];
                    if (typeof rawValue === 'number' && !isNaN(rawValue)) {
                        sum += rawValue * (point.factor ?? 1); // Apply factor if present
                        hasValidPhase = true;
                    }
                }
            });
            return hasValidPhase ? sum : undefined; // Return undefined if no valid phases to sum
        }, [group.points, nodeValues]);

        // Create a pseudo DataPoint item for the total value for consistent rendering
        // We take formatting hints from the first available phase, or provide defaults.
        const totalItemConfig: DataPoint = useMemo(() => {
            const firstPhasePoint = group.points.a || group.points.b || group.points.c;
            return {
                id: `${group.groupKey}-total`, // Unique ID for the total
                nodeId: `${group.groupKey}-total`, // For keying in ValueDisplayContent if needed
                name: 'Total',
                label: 'Total',
                dataType: firstPhasePoint?.dataType || 'Float', // Infer from phases or default
                unit: group.unit || firstPhasePoint?.unit || '',
                factor: 1, // Total is already calculated with factors
                uiType: 'display',
                // Copy relevant formatting settings if needed, e.g., decimalPlaces
                // For simplicity, ValueDisplayContent will use formatValue which might have defaults
                // You might want to explicitly pass precision or formatting rules here
                // from one of the phase points or define general rules.
                ...(firstPhasePoint ? { 
                    decimalPlaces: firstPhasePoint.decimalPlaces,
                    // Copy other relevant format-related fields from DataPoint type
                } : {}),
                icon: Sigma, // Added Sigma icon
                category: 'three-phase', // Changed category to 'three-phase'

            };
        }, [group.groupKey, group.points, group.unit]);


        return (
            <motion.div className="rounded-lg overflow-hidden" whileHover={currentHoverEffect}>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className={`h-full shadow-lg hover:shadow-xl transition-all duration-300 border dark:border-neutral-700 bg-card ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-default'}`}>
                                <CardHeader className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border-b dark:border-neutral-700 sticky top-0 z-10">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground truncate">
                                        <RepresentativeIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                        <span className="truncate" title={group.title}>{group.title}</span>
                                        {group.unit && <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">({group.unit})</span>}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 text-sm">
                                    {/* Updated grid to 4 columns */}
                                    <div className="grid grid-cols-4 gap-x-2 gap-y-2 items-stretch">
                                        {/* Phase and Total Headers */}
                                        {(['a', 'b', 'c', 'total'] as const).map(colType => (
                                            <div
                                                key={`head-${group.groupKey}-${colType}`}
                                                className={`text-xs font-medium text-center border-b pb-1.5 dark:border-neutral-700
                                                    ${colType === 'total' ? 'text-primary dark:text-primary-light font-semibold' : 'text-neutral-500 dark:text-neutral-400'}`
                                                }
                                            >
                                                {colType === 'total' ? (
                                                    <span className="flex items-center justify-center gap-1">
                                                        <Sigma size={13} className="opacity-80"/> Total
                                                    </span>
                                                ) : (
                                                    group.points[colType as 'a'|'b'|'c'] ? `Phase ${colType.toUpperCase()}` : '–'
                                                )}
                                            </div>
                                        ))}

                                        {/* Phase Values */}
                                        {(['a', 'b', 'c'] as const).map((phase) => {
                                            const point = group.points[phase];
                                            return (
                                                <div key={`${group.groupKey}-${phase}`} className="text-center pt-1.5 min-h-[36px] flex flex-col items-center justify-center">
                                                    {point ? (
                                                        <ValueDisplayContent
                                                            item={point}
                                                            nodeValues={nodeValues}
                                                            isDisabled={isDisabled}
                                                            sendDataToWebSocket={sendDataToWebSocket}
                                                            playNotificationSound={playNotificationSound}
                                                            lastToastTimestamps={lastToastTimestamps}
                                                            isEditMode={isEditMode}
                                                        />
                                                    ) : (
                                                        <span className="text-neutral-400 dark:text-neutral-600 text-lg">-</span>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Total Value Column */}
                                        <div key={`${group.groupKey}-total-value`} className="text-center pt-1.5 min-h-[36px] flex flex-col items-center justify-center font-semibold bg-neutral-50/50 dark:bg-neutral-800/30 rounded-sm">
                                            {totalValue !== undefined ? (
                                                <ValueDisplayContent
                                                    item={totalItemConfig} // Use the pseudo config
                                                    // Pass the pre-calculated totalValue directly if ValueDisplayContent can take it
                                                    // Otherwise, put it in nodeValues with totalItemConfig.nodeId as key
                                                    nodeValues={{ ...nodeValues, [totalItemConfig.nodeId]: totalValue }}
                                                    isDisabled={isDisabled}
                                                    sendDataToWebSocket={sendDataToWebSocket} // Likely not applicable for Total
                                                    playNotificationSound={playNotificationSound} // Likely not applicable for Total
                                                    lastToastTimestamps={lastToastTimestamps} // Likely not applicable for Total
                                                    isEditMode={false} // Total is usually not directly editable
                                                />
                                            ) : (
                                                <span className="text-neutral-400 dark:text-neutral-600 text-lg">-</span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        {group.description && (<TooltipContent align="center" side="bottom"><p>{group.description}</p></TooltipContent>)}
                    </Tooltip>
                </TooltipProvider>
            </motion.div>
        );
    }
);

ThreePhaseDisplayGroup.displayName = 'ThreePhaseDisplayGroup';

export default ThreePhaseDisplayGroup;