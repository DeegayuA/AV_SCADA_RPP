// src/components/dashboard/DataPointCard.tsx
import React from 'react';
import { DataPoint } from '@/config/dataPoints'; // DataPointConfig alias was redundant
import { NodeData } from './dashboardInterfaces';
import DataPointDisplayCard from './DataPointDisplayCard';
import DataPointGaugeCard from './DataPointGaugeCard';
import DataPointButton from './DataPointButton';
import DataPointSwitch from './DataPointSwitch';
import { motion } from 'framer-motion';
import { itemVariants } from '@/config/animationVariants';
import { Card } from '@/components/ui/card';

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
        nodeValues, // This is the full NodeData object
        isDisabled,
        currentHoverEffect,
        sendDataToWebSocket,
        playNotificationSound,
        lastToastTimestamps,
        isEditMode, // Added isEditMode to destructuring
        // onRemoveItem is destructured but not used in this snippet, but kept for completeness
    }) => {
        const nodeValue = nodeValues[point.nodeId]; // This is for components that need the single value

        let content;
        if (point.uiType === 'display') {
            content = (
                <DataPointDisplayCard
                    point={point}
                    // FIX: Pass the entire nodeValues map, not just the single value
                    nodeValues={nodeValues}
                    isDisabled={isDisabled}
                    currentHoverEffect={currentHoverEffect}
                    playNotificationSound={playNotificationSound}
                    lastToastTimestamps={lastToastTimestamps}
                    // FIX: Pass down sendDataToWebSocket and isEditMode
                    sendDataToWebSocket={sendDataToWebSocket}
                    isEditMode={isEditMode}
                />
            );
        } else if (point.uiType === 'gauge') {
            content = (
                <DataPointGaugeCard
                    point={point}
                    nodeValue={nodeValue} // GaugeCard might still expect a single value
                    isDisabled={isDisabled}
                    currentHoverEffect={currentHoverEffect}
                    // DataPointGaugeCard might also need playNotificationSound, lastToastTimestamps, sendDataToWebSocket, isEditMode depending on its implementation
                    // If DataPointGaugeCard internally uses ValueDisplayContent, it will need these.
                    // For now, assuming it doesn't or handles it differently. If errors arise there, it will need similar updates.
                />
            );
        } else if (point.uiType === 'button') {
            content = (
                <DataPointButton
                    point={point}
                    isDisabled={isDisabled}
                    sendData={sendDataToWebSocket}
                    // DataPointButton might need playNotificationSound if it toasts on action
                />
            );
        } else if (point.uiType === 'switch') {
            content = (
                <DataPointSwitch
                    point={point}
                    nodeValue={nodeValue} // Switch likely needs the current value
                    isDisabled={isDisabled}
                    sendData={sendDataToWebSocket}
                    // DataPointSwitch might need playNotificationSound if it toasts on action
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