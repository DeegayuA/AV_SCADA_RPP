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
import { DataPoint } from '@/config/dataPoints';
import { HelpCircle, Sigma, TrendingUp } from 'lucide-react';
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

        const calculationType = useMemo(() => {
            const unit = group.unit?.trim().toLowerCase() || '';
            if (
                ['w', 'watt', 'watts', 'kw', 'kilowatt', 'kilowatts', 'kwh', 'kilowatt-hour', 'kilowatt-hours',
                 'wh', 'watt-hour', 'watt-hours', 'ah', 'va', 'kva', 'units'].includes(unit)
            ) {
                return 'sum';
            }
            return 'average';
        }, [group.unit]);

        const aggregatedValueData = useMemo(() => {
            let sum = 0;
            let validPhasesCount = 0;
            const phases: ('a' | 'b' | 'c')[] = ['a', 'b', 'c'];

            phases.forEach(phaseKey => {
                const pointConfig = group.points[phaseKey];
                if (pointConfig && pointConfig.nodeId) {
                    const rawValue = nodeValues[pointConfig.nodeId];
                    if (typeof rawValue === 'number' && !isNaN(rawValue)) {
                        sum += rawValue * (pointConfig.factor ?? 1);
                        validPhasesCount++;
                    }
                }
            });

            if (validPhasesCount === 0) {
                return { value: undefined, count: 0 };
            }

            if (calculationType === 'sum') {
                return { value: sum, count: validPhasesCount };
            } else { // 'average'
                return { value: sum / validPhasesCount, count: validPhasesCount };
            }
        }, [group.points, nodeValues, calculationType]);

        const totalOrAverageItemConfig: DataPoint = useMemo(() => {
            const firstPhasePoint = group.points.a || group.points.b || group.points.c;
            const label = calculationType === 'sum' ? 'Total' : 'Average';
            
            const sourceDP = firstPhasePoint?.decimalPlaces;
            let effectiveDecimalPlaces: number;

            if (calculationType === 'sum') {
                if (sourceDP === undefined || sourceDP === null || sourceDP < 0) {
                    effectiveDecimalPlaces = 2; // Default for sum if source DP is not well-defined
                } else {
                    effectiveDecimalPlaces = Math.min(sourceDP, 2); // Use source DP, capped at 2
                }
            } else { // 'average'
                // Averages generally look best with 2 DPs to capture fractional results,
                // e.g., (1+2)/2 = 1.5, displayed as 1.50
                effectiveDecimalPlaces = 2;
            }

            return {
                id: `${group.groupKey}-${calculationType}`,
                nodeId: `${group.groupKey}-${calculationType}-value`,
                name: label,
                label: label,
                dataType: firstPhasePoint?.dataType || 'Float',
                unit: group.unit || firstPhasePoint?.unit || '',
                factor: 1, // Aggregated value is already factored
                uiType: 'display',
                decimalPlaces: effectiveDecimalPlaces,
                icon: calculationType === 'sum' ? Sigma : TrendingUp,
                category: 'three-phase',
            };
        }, [group.groupKey, group.points, group.unit, calculationType]);


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
                                    <div className="grid grid-cols-4 gap-x-2 gap-y-2 items-stretch">
                                        {(['a', 'b', 'c', 'summary'] as const).map(colType => (
                                            <div
                                                key={`head-${group.groupKey}-${colType}`}
                                                className={`text-xs font-medium text-center border-b pb-1.5 dark:border-neutral-700
                                                    ${colType === 'summary' ? 'text-primary dark:text-primary-light font-semibold' : 'text-neutral-500 dark:text-neutral-400'}`
                                                }
                                            >
                                                {colType === 'summary' ? (
                                                    <span className="flex items-center justify-center gap-1">
                                                        {calculationType === 'sum' ? (
                                                            <Sigma size={13} className="opacity-80" />
                                                        ) : (
                                                            <TrendingUp size={13} className="opacity-80" />
                                                        )}
                                                        {calculationType === 'sum' ? 'Total' : 'Average'}
                                                    </span>
                                                ) : (
                                                    group.points[colType as 'a'|'b'|'c'] ? `Phase ${colType.toUpperCase()}` : '–'
                                                )}
                                            </div>
                                        ))}

                                        {(['a', 'b', 'c'] as const).map((phase) => {
                                            const point = group.points[phase];
                                            if (point && point.nodeId) {
                                                const rawValue = nodeValues[point.nodeId];
                                                const displayValue = 
                                                    (typeof rawValue === 'number' && !isNaN(rawValue))
                                                        ? rawValue * (point.factor ?? 1)
                                                        : rawValue;
                                                
                                                let dpForPhase: number;
                                                const sourcePhaseDP = point.decimalPlaces;
                                                if (sourcePhaseDP === undefined || sourcePhaseDP === null || sourcePhaseDP < 0) {
                                                    dpForPhase = 2; // Default for individual phase if not well-defined
                                                } else {
                                                    dpForPhase = Math.min(sourcePhaseDP, 2); // Use source DP, capped at 2
                                                }

                                                const itemForDisplay: DataPoint = { 
                                                    ...point, 
                                                    decimalPlaces: dpForPhase 
                                                };
                                                
                                                return (
                                                    <div key={`${group.groupKey}-${phase}`} className="text-center pt-1.5 min-h-[36px] flex flex-col items-center justify-center">
                                                        <ValueDisplayContent
                                                            item={itemForDisplay}
                                                            rawValue={displayValue}
                                                            isDisabled={isDisabled}
                                                            sendDataToWebSocket={sendDataToWebSocket}
                                                            playNotificationSound={playNotificationSound}
                                                            lastToastTimestamps={lastToastTimestamps}
                                                            isEditMode={isEditMode}
                                                        />
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div key={`${group.groupKey}-${phase}`} className="text-center pt-1.5 min-h-[36px] flex flex-col items-center justify-center">
                                                        <span className="text-neutral-400 dark:text-neutral-600 text-lg">-</span>
                                                    </div>
                                                );
                                            }
                                        })}

                                        <div key={`${group.groupKey}-summary-value`} className="text-center pt-1.5 min-h-[36px] flex flex-col items-center justify-center font-semibold bg-neutral-100/80 dark:bg-neutral-800/60 rounded-lg">
                                            {aggregatedValueData.value !== undefined ? (
                                                <ValueDisplayContent
                                                    item={totalOrAverageItemConfig}
                                                    rawValue={aggregatedValueData.value}
                                                    isDisabled={isDisabled}
                                                    sendDataToWebSocket={sendDataToWebSocket} 
                                                    playNotificationSound={playNotificationSound}
                                                    lastToastTimestamps={lastToastTimestamps}
                                                    isEditMode={false}
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