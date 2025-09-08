// app/DashboardData/ThreePhaseGroupCard.tsx
import React from 'react';
import { ThreePhaseGroupInfo, NodeData } from './dashboardInterfaces';
import ThreePhaseDisplayGroup from './ThreePhaseDisplayGroup';
import ThreePhaseGaugeGroup from './ThreePhaseGaugeGroup';
import { motion, Variants } from 'framer-motion'; // Import Variants
import { itemVariants } from '@/config/animationVariants'; // Import directly
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

interface ThreePhaseGroupCardProps {
    group: ThreePhaseGroupInfo;
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: any;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    isEditMode: boolean;
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
        onRemoveItem
    }) => {

        const colSpanClass = (group.uiType as string) === 'gauge' ? 'col-span-2 md:col-span-3' : 'col-span-1 md:col-span-2';

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
        } else if ((group.uiType as string) === 'gauge') {
            content = (
                <ThreePhaseGaugeGroup
                    group={group}
                    nodeValues={nodeValues}
                    isDisabled={isDisabled}
                    currentHoverEffect={currentHoverEffect}
                />
            );
        } else {
            return (
                <motion.div className={`${colSpanClass}`} variants={itemVariants as Variants}>
                    <Card className="h-full p-3 flex items-center justify-center bg-red-100 border border-red-400 text-red-700 shadow-sm">
                        Unknown Group UI Type: {group.uiType} for {group.title}
                    </Card>
                </motion.div>
            );
        }

        if (content) {
            return (
                <motion.div 
                    className={`${colSpanClass} relative h-full`}
                    variants={itemVariants as Variants}
                >
                    {content}
                    {isEditMode && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 text-muted-foreground hover:text-destructive z-10"
                            onClick={() => onRemoveItem(group.groupKey, true, group.groupKey)}
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