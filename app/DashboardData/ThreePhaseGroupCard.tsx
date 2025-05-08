// src/components/dashboard/ThreePhaseGroupCard.tsx
import React from 'react';
import { ThreePhaseGroupInfo, NodeData } from './dashboardInterfaces';
import ThreePhaseDisplayGroup from './ThreePhaseDisplayGroup';
import ThreePhaseGaugeGroup from './ThreePhaseGaugeGroup';
import { motion } from 'framer-motion';
import { itemVariants } from '@/config/animationVariants';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Assuming you might want a remove button
import { XCircle } from 'lucide-react'; // Assuming you might want an icon

interface ThreePhaseGroupCardProps {
    group: ThreePhaseGroupInfo;
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: any; // Consider defining a more specific type if possible
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    isEditMode: boolean;
    // ADD THIS LINE: Define the onRemoveItem prop
    onRemoveItem: (widgetIdToRemove: string, isGroup: boolean, groupKeyToRemove?: string) => void;
}


const ThreePhaseGroupCard: React.FC<ThreePhaseGroupCardProps> = React.memo(
    ({ 
        group, 
        nodeValues, 
        isDisabled, 
        currentHoverEffect, 
        playNotificationSound, 
        lastToastTimestamps,
        sendDataToWebSocket,
        isEditMode,
        onRemoveItem // Destructure the new prop
    }) => {

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
                    sendDataToWebSocket={sendDataToWebSocket}
                    isEditMode={isEditMode}
                />
            );
        } else if (group.uiType === 'gauge') {
            content = (
                <ThreePhaseGaugeGroup
                    group={group}
                    nodeValues={nodeValues}
                    isDisabled={isDisabled}
                    currentHoverEffect={currentHoverEffect}
                    // If ThreePhaseGaugeGroup needs to show errors or interact, pass relevant props
                    // playNotificationSound={playNotificationSound}
                    // lastToastTimestamps={lastToastTimestamps}
                    // sendDataToWebSocket={sendDataToWebSocket}
                    // isEditMode={isEditMode}
                />
            );
        } else {
            return (
                <motion.div className={`${colSpanClass}`} variants={itemVariants}>
                    <Card className="h-full p-3 flex items-center justify-center bg-red-100 border border-red-400 text-red-700 shadow-sm">
                        Unknown Group UI Type: {group.uiType} for {group.title}
                    </Card>
                </motion.div>
            );
        }

        if (content) {
            return (
                <motion.div 
                    className={`${colSpanClass} relative h-full`} // Added relative and h-full
                    variants={itemVariants}
                >
                    {content}
                    {isEditMode && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 text-muted-foreground hover:text-destructive z-10" // z-10 to be above content
                            onClick={() => onRemoveItem(group.groupKey, true, group.groupKey)} // Pass group ID as widgetIdToRemove and groupKeyToRemove
                            title={`Remove group ${group.title}`}
                        >
                            <XCircle className="h-5 w-5" />
                        </Button>
                    )}
                </motion.div>
            );
        }

        return null;
    }
);

ThreePhaseGroupCard.displayName = 'ThreePhaseGroupCard';    
export default ThreePhaseGroupCard;