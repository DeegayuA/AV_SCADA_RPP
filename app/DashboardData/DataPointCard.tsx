'use client';

// src/components/dashboard/DataPointCard.tsx
import React from 'react';
import { DataPoint as DataPointConfig } from '@/config/dataPoints';
import { NodeData } from './dashboardInterfaces';
import DataPointDisplayCard from './DataPointDisplayCard';
import DataPointGaugeCard from './DataPointGaugeCard';
import DataPointButton from './DataPointButton';
import DataPointSwitch from './DataPointSwitch';
import { motion } from 'framer-motion'; // Needed for itemVariants
import { itemVariants } from '@/config/animationVariants'; // Needed for itemVariants
import { Card } from '@/components/ui/card';

interface DataPointCardProps {
    point: DataPointConfig;
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: any;
    sendDataToWebSocket: (nodeId: string, value: boolean | number | string) => void;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
}

const DataPointCard: React.FC<DataPointCardProps> = React.memo(
    ({ point, nodeValues, isDisabled, currentHoverEffect, sendDataToWebSocket, playNotificationSound, lastToastTimestamps }) => {
        const nodeValue = nodeValues[point.nodeId];

        // Wrap each specific component render in motion.div for item animation
        let content;
        if (point.uiType === 'display') {
            content = (
                <DataPointDisplayCard
                    point={point}
                    nodeValue={nodeValue}
                    isDisabled={isDisabled}
                    currentHoverEffect={currentHoverEffect}
                    playNotificationSound={playNotificationSound}
                    lastToastTimestamps={lastToastTimestamps}
                />
            );
        } else if (point.uiType === 'gauge') {
            content = (
                <DataPointGaugeCard
                    point={point}
                    nodeValue={nodeValue}
                    isDisabled={isDisabled}
                    currentHoverEffect={currentHoverEffect}
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
        } else {
             // Handle unknown uiTypes
             return (
                 <motion.div className="col-span-1" variants={itemVariants}>
                     <Card className="h-full p-3 flex items-center justify-center bg-red-100 border border-red-400 text-red-700 shadow-sm">
                         Unknown UI Type: {point.uiType} for {point.name}
                     </Card>
                 </motion.div>
             );
        }

        // Apply item animation variant to the wrapper div if the component exists
        if (content) {
            return (
                <motion.div className="col-span-1" variants={itemVariants}>
                    {content}
                </motion.div>
            );
        }

        return null; // Should not happen if all uiTypes are covered
    }
);

DataPointCard.displayName = 'DataPointCard';

export default DataPointCard;