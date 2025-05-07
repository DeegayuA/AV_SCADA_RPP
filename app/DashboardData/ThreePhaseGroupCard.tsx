'use client';

// src/components/dashboard/ThreePhaseGroupCard.tsx
import React from 'react';
import { ThreePhaseGroupInfo, NodeData } from './dashboardInterfaces';
import ThreePhaseDisplayGroup from './ThreePhaseDisplayGroup';
import ThreePhaseGaugeGroup from './ThreePhaseGaugeGroup';
import { motion } from 'framer-motion'; // Needed for itemVariants
import { itemVariants } from '@/config/animationVariants'; // Needed for itemVariants
import { Card } from '@/components/ui/card'; // For error state

interface ThreePhaseGroupCardProps {
    group: ThreePhaseGroupInfo;
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: any;
     playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
}

const ThreePhaseGroupCard: React.FC<ThreePhaseGroupCardProps> = React.memo(
    ({ group, nodeValues, isDisabled, currentHoverEffect, playNotificationSound, lastToastTimestamps }) => {

        // The column span needs to be determined by the group type as in the original code
        const colSpanClass = group.uiType === 'gauge' ? 'col-span-2 md:col-span-3' : 'col-span-1 md:col-span-2';

        let content;
        if (group.uiType === 'display') {
            content = (
                <ThreePhaseDisplayGroup
                    group={group}
                    nodeValues={nodeValues}
                    isDisabled={isDisabled}
                    currentHoverEffect={currentHoverEffect}
                     playNotificationSound={playNotificationSound}
                    lastToastTimestamps={lastToastTimestamps}
                />
            );
        } else if (group.uiType === 'gauge') {
            content = (
                <ThreePhaseGaugeGroup
                    group={group}
                    nodeValues={nodeValues}
                    isDisabled={isDisabled}
                    currentHoverEffect={currentHoverEffect}
                />
            );
        } else {
            // Should not happen based on groupDataPoints logic, but good for safety
             return (
                 <motion.div className={`${colSpanClass}`} variants={itemVariants}>
                     <Card className="h-full p-3 flex items-center justify-center bg-red-100 border border-red-400 text-red-700 shadow-sm">
                         Unknown Group UI Type: {group.uiType} for {group.title}
                     </Card>
                 </motion.div>
             );
        }


        // Apply item animation variant and column span class
        if (content) {
             return (
                <motion.div className={colSpanClass} variants={itemVariants}>
                    {content}
                </motion.div>
             );
        }

        return null; // Should not happen
    }
);

ThreePhaseGroupCard.displayName = 'ThreePhaseGroupCard';    
export default ThreePhaseGroupCard;
