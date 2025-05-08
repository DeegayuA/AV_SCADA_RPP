// app/control/HeaderComponent.tsx
'use client';

import React from 'react';
import DashboardHeaderControl from './DashboardHeader';
// Import the actual UI component you provided
// import { VERSION } from '@/config/constants'; // No longer needed here, version will be passed as a prop

interface HeaderComponentProps {
    plcStatus: 'online' | 'offline' | 'disconnected';
    isConnected: boolean;
    connectWebSocket: () => void;
    soundEnabled: boolean;
    // CORRECTED TYPE: This must match what DashboardHeaderControl expects
    setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    currentTime: string;
    delay: number;
    version: string; // Added: version is now a prop for DashboardHeaderControl
    isEditMode: boolean;
    setIsEditMode: (editMode: boolean) => void;
    onOpenConfigurator: () => void;
    onRemoveAll: () => void;
    onResetToDefault: () => void;
}

const HeaderComponent: React.FC<HeaderComponentProps> = ({
    plcStatus,
    isConnected,
    connectWebSocket,
    soundEnabled,
    setSoundEnabled,
    currentTime,
    delay,
    version, // Pass down version
    isEditMode,
    setIsEditMode,
    onOpenConfigurator,
    onRemoveAll,
    onResetToDefault,
}) => {
    return (
        <DashboardHeaderControl
            plcStatus={plcStatus}
            isConnected={isConnected}
            connectWebSocket={connectWebSocket}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            currentTime={currentTime}
            delay={delay}
            version={version} // Pass the version prop
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
            onOpenConfigurator={onOpenConfigurator}
            onRemoveAll={onRemoveAll}
            onResetToDefault={onResetToDefault}
        />
    );
};

export default HeaderComponent;