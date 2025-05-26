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
import { HelpCircle, Sigma, TrendingUp } from 'lucide-react'; // Sigma for Total/Average
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

        // Calculate aggregated Value (Sum or Average)
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
            
            let configuredDecimalPlaces = firstPhasePoint?.decimalPlaces;
            if (calculationType === 'average') {
                // For average, ensure at least some decimal places if original is 0 or undefined
                if (configuredDecimalPlaces === undefined || configuredDecimalPlaces < 1) {
                    configuredDecimalPlaces = 2; 
                } else {
                    // Optionally add one more decimal place for average if original is already defined
                    configuredDecimalPlaces = configuredDecimalPlaces + 1;
                }
            }

            return {
                id: `${group.groupKey}-${calculationType}`, // Unique ID
                nodeId: `${group.groupKey}-${calculationType}-value`, // Unique Node ID for nodeValues map key
                name: label,
                label: label, // Used by ValueDisplayContent if it had label logic
                dataType: firstPhasePoint?.dataType || 'Float',
                unit: group.unit || firstPhasePoint?.unit || '', // Preserve original unit
                factor: 1, // Value is pre-calculated
                uiType: 'display',
                decimalPlaces: configuredDecimalPlaces,
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
                                        {/* Phase and Total/Average Headers */}
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

                                        {/* Total/Average Value Column */}
                                        <div key={`${group.groupKey}-summary-value`} className="text-center pt-1.5 min-h-[36px] flex flex-col items-center justify-center font-semibold bg-neutral-100/80 dark:bg-neutral-800/60 rounded-lg">
                                            {aggregatedValueData.value !== undefined ? (
                                                <ValueDisplayContent
                                                    item={totalOrAverageItemConfig}
                                                    // Pass the pre-calculated value by adding it to a temporary nodeValues map
                                                    // using the unique nodeId from totalOrAverageItemConfig
                                                    nodeValues={{ [totalOrAverageItemConfig.nodeId]: aggregatedValueData.value }}
                                                    isDisabled={isDisabled}
                                                    // These props are likely not applicable for a calculated display-only value
                                                    sendDataToWebSocket={sendDataToWebSocket} 
                                                    playNotificationSound={playNotificationSound}
                                                    lastToastTimestamps={lastToastTimestamps}
                                                    isEditMode={false} // Calculated value is not directly editable
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