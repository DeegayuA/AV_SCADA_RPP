import React from 'react';
import { motion } from 'framer-motion';
import { DataPoint, DataPoint as DataPointConfig } from '@/config/dataPoints';
import { ThreePhaseGroupInfo, NodeData } from './dashboardInterfaces';
import DataPointCard from './DataPointCard'; // For individual points
import ThreePhaseGroupCard from './ThreePhaseGroupCard'; // For 3-phase groups
import { containerVariants } from '@/config/animationVariants'; // Needed for section variant

type SectionItem = DataPointConfig | ThreePhaseGroupInfo;

interface DashboardSectionProps {
    title: string;
    gridCols: string;
    items: (DataPoint | ThreePhaseGroupInfo)[];
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: object;
    sendDataToWebSocket: (nodeId: string, value: boolean | number | string) => void;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    onRemoveItem: (dataPointId: string) => void;
    allPossibleDataPoints: DataPoint[];
    isEditMode?: boolean;
}

const DashboardSection: React.FC<DashboardSectionProps> = React.memo(
    ({ title, gridCols, items, nodeValues, isDisabled, currentHoverEffect, sendDataToWebSocket, playNotificationSound, lastToastTimestamps, onRemoveItem, isEditMode }) => {

        // Check if an item is a ThreePhaseGroupInfo
        const isThreePhaseGroup = (item: SectionItem): item is ThreePhaseGroupInfo => {
            return (item as ThreePhaseGroupInfo).groupKey !== undefined;
        };

        return (
            <motion.section variants={containerVariants} initial="hidden" animate="visible"> {/* Apply containerVariants here */}
                <h2 className="text-lg md:text-xl font-semibold tracking-tight text-card-foreground mb-4 border-l-4 border-primary pl-3">
                    {title}
                </h2>
                <motion.div className={`grid ${gridCols} gap-3 md:gap-4`} variants={containerVariants}> {/* Apply containerVariants here too for inner staggering */}
                    {items.map((item) => (
                        // Delegate rendering based on item type
                        isThreePhaseGroup(item) ? (
                            <ThreePhaseGroupCard
                                key={item.groupKey} // Use groupKey as the key
                                group={item}
                                nodeValues={nodeValues}
                                isDisabled={isDisabled}
                                currentHoverEffect={currentHoverEffect}
                                playNotificationSound={playNotificationSound}
                                lastToastTimestamps={lastToastTimestamps}
                            />
                        ) : (
                            <DataPointCard
                                key={item.id} // Use point id as the key
                                point={item}
                                nodeValues={nodeValues}
                                isDisabled={isDisabled}
                                currentHoverEffect={currentHoverEffect}
                                sendDataToWebSocket={sendDataToWebSocket}
                                playNotificationSound={playNotificationSound}
                                lastToastTimestamps={lastToastTimestamps}
                                isEditMode={isEditMode ?? false} 
                                onRemoveItem={onRemoveItem}
                            />
                        )
                    ))}
                </motion.div>
            </motion.section>
        );
    }
);

DashboardSection.displayName = 'DashboardSection';

export default DashboardSection;
