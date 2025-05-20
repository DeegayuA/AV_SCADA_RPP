// app/control/RenderingComponent.tsx
'use client';

import React from 'react';
import { motion, Variants, TargetAndTransition } from 'framer-motion';
import { Settings as SettingsIcon, InfoIcon } from 'lucide-react';
import DashboardSection from '../DashboardData/DashboardSection';
import { DataPoint } from '@/config/dataPoints';
import { NodeData, ThreePhaseGroupInfo } from '../DashboardData/dashboardInterfaces';

interface Section {
    title: string;
    items: (DataPoint | ThreePhaseGroupInfo)[];
    gridCols: string;
}

interface RenderingComponentProps {
    sections: Section[];
    isEditMode: boolean;
    nodeValues: NodeData;
    isConnected: boolean;
    currentHoverEffect: TargetAndTransition;
    sendDataToWebSocket: (nodeId: string, value: boolean | number | string) => void;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    onRemoveItem: (dataPointIdToRemove: string) => void;
    allPossibleDataPoints: DataPoint[];
    containerVariants: Variants;
}

const RenderingComponent: React.FC<RenderingComponentProps> = ({
    sections,
    isEditMode,
    nodeValues,
    isConnected,
    currentHoverEffect,
    sendDataToWebSocket,
    playNotificationSound,
    lastToastTimestamps,
    onRemoveItem,
    allPossibleDataPoints,
    containerVariants,
}) => {
    return (
        <motion.div className="space-y-8 py-4" variants={containerVariants} initial="hidden" animate="visible">
            {sections.length === 0 && !isEditMode && (
                <div className="text-center py-16 text-muted-foreground min-h-[100px] flex flex-col items-center justify-center">
                    <InfoIcon className="w-12 h-12 mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold mb-2">Dashboard is Empty</h3>
                    <p>No data points configured for display.</p>
                    <p className="mt-2">Click the "Edit Layout" button in the header to add data points.</p>
                </div>
            )}
            {sections.length === 0 && isEditMode && (
                <div className="text-center py-16 text-muted-foreground min-h-[100px] flex flex-col items-center justify-center">
                    <SettingsIcon className="w-12 h-12 mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold mb-2">Layout Editor Mode</h3>
                    <p>No data points currently selected.</p>
                    <p className="mt-2">Click the "Add Cards" button above to get started.</p>
                    <p className="mt-1 text-sm">You can also "Remove All" or "Reset Layout".</p>
                </div>
            )}
            {sections.map((section) => (
                <DashboardSection
                    key={section.title}
                    title={section.title}
                    gridCols={section.gridCols}
                    items={section.items}
                    nodeValues={nodeValues}
                    isDisabled={!isConnected}
                    currentHoverEffect={currentHoverEffect}
                    sendDataToWebSocket={sendDataToWebSocket}
                    playNotificationSound={playNotificationSound}
                    lastToastTimestamps={lastToastTimestamps}
                    isEditMode={isEditMode}
                    onRemoveItem={onRemoveItem}
                    allPossibleDataPoints={allPossibleDataPoints}
                />
            ))}
        </motion.div>
    );
};

export default RenderingComponent;