// src/components/DashboardData/DashboardSection.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { DataPoint } from '@/config/dataPoints'; // This is for individual items
import { NodeData, ThreePhaseGroupInfo as BaseThreePhaseGroupInfo } from '../DashboardData/dashboardInterfaces';

// Extended interface to include missing properties
interface ThreePhaseGroupInfo extends BaseThreePhaseGroupInfo {
    average?: DataPoint;
    total?: DataPoint;
}
import DataPointCard from '../DashboardData/DataPointCard';
import ValueDisplayContent from '../DashboardData/ValueDisplayContent';
import { UserRole } from '@/types/auth';



interface DashboardSectionProps {
    title: string;
    gridCols: string;
    items: (DataPoint | ThreePhaseGroupInfo)[];
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: any;
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    isEditMode: boolean;
    onRemoveItem: (dataPointId: string) => void;
    allPossibleDataPoints: DataPoint[];
    currentUserRole?: UserRole;

}

const DashboardSection: React.FC<DashboardSectionProps> = ({
    title,
    gridCols,
    items, // Now items are (DataPoint | ThreePhaseGroupInfo)[]
    nodeValues,
    isDisabled,
    currentHoverEffect,
    sendDataToWebSocket,
    playNotificationSound,
    lastToastTimestamps,
    isEditMode,
    onRemoveItem,
    allPossibleDataPoints,
}) => {
    // ... (rest of your DashboardSection.tsx component code from previous correct version)
    // The logic inside to differentiate item types should now work correctly:
    // if ('nodeId' in item) { // This is a DataPoint }
    // else if ('groupKey' in item) { // This is a ThreePhaseGroupInfo }
    // ...
// (Make sure the item type check `if ('nodeId' in item)` still correctly identifies DataPoint
// vs `else if ('groupKey' in item && 'points' in item)` for ThreePhaseGroupInfo.
// `nodeId` is specific to `DataPoint`, and `groupKey` is specific to `ThreePhaseGroupInfo`)

    if (!items || items.length === 0) {
        return null;
    }

    const itemVariantsMotion = { // Renamed to avoid conflict with itemVariants from animationVariants if it was global
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.05, type: 'spring', stiffness: 260, damping: 20 },
        }),
    };

    return (
        <section className="mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 pb-2 border-b border-border">{title}</h2>
            <motion.div
                className={`grid gap-3 sm:gap-4 ${gridCols}`}
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                initial="hidden"
                animate="visible"
            >
                {items.map((item, index) => {
                    // Key needs to be derived carefully if groupKey is not unique across all possible sections
                    // but given the processing in Dashboard.tsx, items should be distinct in this 'items' array.
                    const key = ('nodeId' in item ? item.id : item.groupKey) || `item-${index}`;

                    // Check for individual DataPoint first
                    if ('nodeId' in item && !('groupKey' in item)) {
                        const dataPointItem = item as DataPoint;
                        return (
                            <DataPointCard
                                key={dataPointItem.id} // Use DataPointCard's key handling
                                point={dataPointItem}
                                nodeValues={nodeValues}
                                isDisabled={isDisabled}
                                currentHoverEffect={currentHoverEffect}
                                sendDataToWebSocket={sendDataToWebSocket}
                                playNotificationSound={playNotificationSound}
                                lastToastTimestamps={lastToastTimestamps}
                                isEditMode={isEditMode}
                                onRemoveItem={onRemoveItem} // Make sure DataPointCard has this prop
                            />
                        );
                    }
                    // Check for ThreePhaseGroupInfo
                    else if ('groupKey' in item && 'points' in item) {
                        const groupInfoItem = item as ThreePhaseGroupInfo;
                        return (
                            <motion.div
                                key={groupInfoItem.groupKey}
                                className="relative bg-card p-3 sm:p-4 rounded-lg shadow-sm border border-border transition-shadow duration-200"
                                variants={itemVariantsMotion}
                                custom={index}
                                whileHover={!isEditMode ? currentHoverEffect : {}} // Group container hover (optional)
                            >
                                {isEditMode && (
                                    <div className="absolute top-1 right-1 z-10 flex flex-col items-end space-y-0.5 p-0.5 bg-background/50 rounded">
                                        <span className="text-xs text-muted-foreground mb-0.5 px-1">Remove:</span>
                                        {(['a', 'b', 'c'] as const).map((phaseKey) => {
                                            const phasePointConfig = groupInfoItem.points[phaseKey];
                                            if (!phasePointConfig || !phasePointConfig.id) return null;
                                            return (
                                                <Button
                                                    key={`remove-${groupInfoItem.groupKey}-${phasePointConfig.id}`}
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-5 px-1 text-xs opacity-80 hover:opacity-100"
                                                    onClick={(e) => { e.stopPropagation(); onRemoveItem(phasePointConfig.id); }}
                                                    title={`Remove ${phasePointConfig.name || `Phase ${phaseKey.toUpperCase()}`}`}
                                                >
                                                    {phaseKey.toUpperCase()} <XCircle className="ml-1 h-3 w-3" />
                                                </Button>
                                            );
                                        })}
                                        {groupInfoItem.average?.id && (
                                            <Button variant="destructive" size="sm" className="h-5 px-1 text-xs opacity-80" onClick={() => onRemoveItem(groupInfoItem.average!.id)} title={`Remove ${groupInfoItem.average.name || 'Average'}`} >AVG <XCircle className="ml-1 h-3 w-3" /></Button>
                                        )}
                                        {groupInfoItem.total?.id && (
                                            <Button variant="destructive" size="sm" className="h-5 px-1 text-xs opacity-80" onClick={() => onRemoveItem(groupInfoItem.total!.id)} title={`Remove ${groupInfoItem.total.name || 'Total'}`}>TOT <XCircle className="ml-1 h-3 w-3" /></Button>
                                        )}
                                    </div>
                                )}
                                <h4 className="text-sm font-semibold text-center mb-2 text-card-foreground">{groupInfoItem.title}</h4>
                                <div className="space-y-1.5">
                                    {(['a', 'b', 'c'] as const).map((phaseKey) => { // Renamed 'phase' to 'phaseKey' for clarity in this context
                                        const phaseConfig = groupInfoItem.points[phaseKey];
                                        if (!phaseConfig) return null;
                                        return (
                                            <div key={`${groupInfoItem.groupKey}-${phaseConfig.id || phaseKey}`} className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground capitalize w-1/2 truncate" title={phaseConfig.name || `Phase ${phaseKey.toUpperCase()}`}>{phaseConfig.name || `Phase ${phaseKey.toUpperCase()}`}</span>
                                                <div className="w-1/2 text-right">
                                                    <ValueDisplayContent
                                                        item={phaseConfig}
                                                        nodeValues={nodeValues} isDisabled={isDisabled}
                                                        sendDataToWebSocket={sendDataToWebSocket}
                                                        playNotificationSound={playNotificationSound}
                                                        lastToastTimestamps={lastToastTimestamps}
                                                        isEditMode={isEditMode}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {groupInfoItem.average && (
                                        <div className="flex justify-between items-center text-xs pt-1.5 mt-1.5 border-t border-dashed">
                                            <span className="text-muted-foreground font-medium w-1/2 truncate" title={groupInfoItem.average.name}>{groupInfoItem.average.name || 'Average'}</span>
                                            <div className="w-1/2 text-right">
                                                <ValueDisplayContent item={groupInfoItem.average} nodeValues={nodeValues} isDisabled={isDisabled} sendDataToWebSocket={sendDataToWebSocket} playNotificationSound={playNotificationSound} lastToastTimestamps={lastToastTimestamps} isEditMode={isEditMode} />
                                            </div>
                                        </div>
                                    )}
                                    {groupInfoItem.total && (
                                        <div className="flex justify-between items-center text-xs pt-1.5 mt-1.5 border-t">
                                            <span className="text-muted-foreground font-semibold w-1/2 truncate" title={groupInfoItem.total.name}>{groupInfoItem.total.name || 'Total'}</span>
                                            <div className="w-1/2 text-right">
                                                <ValueDisplayContent item={groupInfoItem.total} nodeValues={nodeValues} isDisabled={isDisabled} sendDataToWebSocket={sendDataToWebSocket} playNotificationSound={playNotificationSound} lastToastTimestamps={lastToastTimestamps} isEditMode={isEditMode} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    }
                    console.warn("Unknown item type in DashboardSection:", item);
                    return (
                        <div key={`unknown-${index}`} className="p-2 border border-dashed border-red-400 text-red-600 text-xs">
                            Unknown item structure in section. Item: {JSON.stringify(item)}
                        </div>
                    );
                })}
            </motion.div>
        </section>
    );
};
export default DashboardSection;