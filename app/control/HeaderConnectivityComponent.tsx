'use client';
import React from 'react';
import { UserRole } from '@/types/auth';
import DashboardHeaderControl from './DashboardHeader';

interface HeaderComponentProps {
    plcStatus: 'connected' | 'connecting' | 'disconnected';
    isConnected: boolean;
    connectWebSocket: () => Promise<void>;
    currentTime: string;
    delay: number;
    version: string;
    isEditMode: boolean;
    toggleEditMode: () => void;
    onOpenConfigurator: () => void;
    onRemoveAll: () => void;
    onResetToDefault: () => void;
    currentUserRole?: UserRole;
    onOpenWsConfigurator: () => void;
    activeWsUrl: string;
}

const HeaderComponent: React.FC<HeaderComponentProps> = ({
    plcStatus,
    isConnected,
    connectWebSocket,
    currentTime,
    delay,
    version,
    isEditMode,
    toggleEditMode,
    onOpenConfigurator,
    onRemoveAll,
    onResetToDefault,
    currentUserRole,
    onOpenWsConfigurator,
    activeWsUrl,
}) => {
    return (
        <DashboardHeaderControl
            plcStatus={plcStatus}
            isConnected={isConnected}
            connectWebSocket={connectWebSocket}
            currentTime={currentTime}
            delay={delay}
            version={version}
            isEditMode={isEditMode}
            toggleEditMode={toggleEditMode}
            onOpenConfigurator={onOpenConfigurator}
            onRemoveAll={onRemoveAll}
            onResetToDefault={onResetToDefault}
            currentUserRole={currentUserRole}
            onOpenWsConfigurator={onOpenWsConfigurator}
            activeWsUrl={activeWsUrl}
        />
    );
};

export default HeaderComponent;