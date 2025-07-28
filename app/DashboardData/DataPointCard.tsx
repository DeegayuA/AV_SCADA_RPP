// app/DashboardData/DataPointCard.tsx
import React from 'react';
import { DataPoint } from '@/config/dataPoints';
import { NodeData } from './dashboardInterfaces';
import DataPointDisplayCard from './DataPointDisplayCard';
import DataPointGaugeCard from './DataPointGaugeCard';
import DataPointButton from './DataPointButton';
import DataPointSwitch from './DataPointSwitch';
import DataPointInputCard from './DataPointInputCard';
import { motion, Variants } from 'framer-motion';
import { itemVariants as _itemVariants } from '@/config/animationVariants';
import { Card } from '@/components/ui/card';

// Cast to Variants to satisfy TypeScript
const itemVariants = _itemVariants as Variants;

interface DataPointCardProps {
    point: DataPoint;
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: any;
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    isEditMode: boolean;
    onRemoveItem: (dataPointId: string) => void;
}

const DataPointCard: React.FC<DataPointCardProps> = React.memo(
    ({
        point,
        nodeValues,
        isDisabled,
        currentHoverEffect,
        sendDataToWebSocket,
        playNotificationSound,
        lastToastTimestamps,
        isEditMode,
        onRemoveItem, // Destructured for completeness, used by sub-components
    }) => {
        const nodeValue = nodeValues[point.nodeId];

        let content;
        if (point.uiType === 'display') {
            content = (
                <DataPointDisplayCard
                    point={point}
                    nodeValues={nodeValues}
                    isDisabled={isDisabled}
                    currentHoverEffect={currentHoverEffect}
                    playNotificationSound={playNotificationSound}
                    lastToastTimestamps={lastToastTimestamps}
                    sendDataToWebSocket={sendDataToWebSocket}
                    isEditMode={isEditMode}
                />
            );
        } else if (point.uiType === 'gauge') {
            content = (
                <DataPointGaugeCard
                    point={point}
                    nodeValue={nodeValue}
                    isDisabled={isDisabled}
                />
            );
        } else if (point.uiType === 'button') {
            content = (
                <DataPointButton
                    point={point}
                    isDisabled={isDisabled}
                    sendData={sendDataToWebSocket}
                />
            );
        } else if (point.uiType === 'switch') {
            content = (
                <DataPointSwitch
                    point={point}
                    nodeValue={nodeValue}
                    isDisabled={isDisabled}
                    sendData={sendDataToWebSocket}
                />
            );
        } else if (point.uiType === 'input') {
            content = (
                <DataPointInputCard
                    point={point}
                    nodeValue={nodeValue}
                    isDisabled={isDisabled}
                    sendData={sendDataToWebSocket}
                    isEditMode={isEditMode}
                />
            );
        } else {
             return (
                 <motion.div className="col-span-1" variants={itemVariants}>
                     <Card className="h-full p-3 flex items-center justify-center bg-red-100 border border-red-400 text-red-700 shadow-sm">
                         Unknown UI Type: {point.uiType} for {point.name}
                     </Card>
                 </motion.div>
             );
        }

        if (content) {
            return (
                <motion.div className="col-span-1" variants={itemVariants}>
                    {content}
                </motion.div>
            );
        }

        return null;
    }
);

DataPointCard.displayName = 'DataPointCard';

export default DataPointCard;