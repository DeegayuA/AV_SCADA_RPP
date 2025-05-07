'use client';

// Main Dashboard Component - path from error context: app/control/header.tsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { dataPoints as allPossibleDataPointsConfig, DataPoint, ThreePhaseDisplayGroup } from '@/config/dataPoints';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { WS_URL, VERSION, PLANT_NAME } from '@/config/constants';
import { containerVariants } from '@/config/animationVariants';
import { Settings as SettingsIcon, InfoIcon } from 'lucide-react';

import { playSound } from '@/lib/utils';
import DashboardSection from '../DashboardData/DashboardSection'; // Adjust path if needed
import { NodeData, ThreePhaseGroupInfo } from '../DashboardData/dashboardInterfaces'; // Adjust path if needed
import { groupDataPoints } from '../DashboardData/groupDataPoints'; // Adjust path if needed
import DashboardItemConfigurator, { ConfiguratorThreePhaseGroup } from '@/components/DashboardItemConfigurator'; // Assuming export
import DashboardHeader from './DashboardHeader'; // Assumed to be in the same 'app/control/' directory

// Key for localStorage - updated to include PLANT_NAME for better uniqueness
const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2`;
const DEFAULT_DISPLAY_COUNT = 6;

const Dashboard: React.FC = () => {
    const { resolvedTheme } = useTheme();
    const [nodeValues, setNodeValues] = useState<NodeData>({});
    const [isConnected, setIsConnected] = useState(false);
    const [plcStatus, setPlcStatus] = useState<'online' | 'offline' | 'disconnected'>('disconnected');
    const [currentTime, setCurrentTime] = useState<string>('');
    const ws = useRef<WebSocket | null>(null);
    const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
    const [delay, setDelay] = useState<number>(0);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 10;
    const lastToastTimestamps = useRef<Record<string, number>>({});

    const [soundEnabled, setSoundEnabled] = useState(() => {
        if (typeof window !== 'undefined') { return localStorage.getItem('dashboardSoundEnabled') === 'true'; } return false;
    });
    useEffect(() => { if (typeof window !== 'undefined') { localStorage.setItem('dashboardSoundEnabled', String(soundEnabled)); } }, [soundEnabled]);

    const [isEditMode, setIsEditMode] = useState(false);
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
    const allPossibleDataPoints = useMemo(() => allPossibleDataPointsConfig, []);

    const getDefaultDataPointIds = useCallback(() => {
        const criticalDefaultIds = [
            'grid-total-active-power-side-to-side', 'inverter-output-total-power', 'load-total-power',
            'battery-capacity', 'battery-output-power', 'input-power-pv1',
        ].filter(id => allPossibleDataPoints.some(dp => dp.id === id));
        if (criticalDefaultIds.length > 0) return criticalDefaultIds;
        return allPossibleDataPoints.slice(0, DEFAULT_DISPLAY_COUNT).map(dp => dp.id);
    }, [allPossibleDataPoints]);

    const [displayedDataPointIds, setDisplayedDataPointIds] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const savedString = localStorage.getItem(USER_DASHBOARD_CONFIG_KEY);
            if (savedString) {
                try {
                    const parsedIds = JSON.parse(savedString) as string[];
                    return parsedIds.filter(id => allPossibleDataPoints.some(dp => dp.id === id));
                } catch (e) { console.error("Error parsing saved dashboard configuration:", e); }
            }
        }
        return getDefaultDataPointIds();
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(USER_DASHBOARD_CONFIG_KEY, JSON.stringify(displayedDataPointIds));
        }
    }, [displayedDataPointIds]);

    const currentlyDisplayedDataPoints = useMemo(() => {
        return displayedDataPointIds
            .map(id => allPossibleDataPoints.find(dp => dp.id === id))
            .filter(Boolean) as DataPoint[];
    }, [displayedDataPointIds, allPossibleDataPoints]);

    const playNotificationSound = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
        if (!soundEnabled) return;
        const soundMap = { success: '/sounds/success.mp3', error: '/sounds/error.mp3', warning: '/sounds/warning.mp3', info: '/sounds/info.mp3' };
        const volumeMap = { success: 0.99, error: 0.6, warning: 0.5, info: 0.3 };
        if (typeof playSound === 'function') playSound(soundMap[type], volumeMap[type]);
        else console.warn("playSound utility not found.");
    }, [soundEnabled]);

    useEffect(() => { // Clock
        const updateClock = () => setCurrentTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: 'short', year: 'numeric' }));
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { // Lag Check
        const interval = setInterval(() => {
            const currentDelay = Date.now() - lastUpdateTime;
            setDelay(currentDelay);
            const reloadingFlag = 'reloadingDueToDelay';
            const redirectingFlag = 'redirectingDueToExtremeDelay';
            const opcuaRedirectedFlag = 'opcuaRedirected';
            if (typeof window !== 'undefined' && (sessionStorage.getItem(reloadingFlag) || sessionStorage.getItem(redirectingFlag) || sessionStorage.getItem(opcuaRedirectedFlag))) return;

            if (isConnected && currentDelay > 40000 && typeof window !== 'undefined') {
                console.error(`Extreme WS data lag (${(currentDelay / 1000).toFixed(1)}s). Redirecting.`);
                toast.error('Critical Lag Detected', { description: 'Redirecting for connection check...', duration: 5000 });
                playNotificationSound('error');
                sessionStorage.setItem(redirectingFlag, 'true');
                window.location.href = new URL('/api/opcua', window.location.origin).href;
                return;
            } else if (isConnected && currentDelay > 30000 && typeof window !== 'undefined') {
                console.warn(`WS data lag (${(currentDelay / 1000).toFixed(1)}s). Reloading.`);
                toast.warning('Stale Data Detected', { description: 'Refreshing connection...', duration: 5000 });
                playNotificationSound('warning');
                sessionStorage.setItem(reloadingFlag, 'true');
                setTimeout(() => { if (typeof window !== 'undefined') window.location.reload(); }, 1500);
            } else if (currentDelay < 30000 && typeof window !== 'undefined') {
                if (sessionStorage.getItem(reloadingFlag)) sessionStorage.removeItem(reloadingFlag);
                if (sessionStorage.getItem(redirectingFlag)) sessionStorage.removeItem(redirectingFlag);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [lastUpdateTime, isConnected, playNotificationSound]);

    const checkPlcConnection = useCallback(async () => {
        try {
            const res = await fetch('/api/opcua/status'); if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json(); const newStatus = data.connectionStatus;
            if (newStatus && ['online', 'offline', 'disconnected'].includes(newStatus)) setPlcStatus(newStatus);
            else { console.error("Invalid PLC status:", data); if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); }
        } catch (err) { if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); }
    }, [plcStatus]);

    useEffect(() => { // PLC Status Check
        checkPlcConnection();
        const interval = setInterval(checkPlcConnection, 10000);
        return () => clearInterval(interval);
    }, [checkPlcConnection]);

    const connectWebSocket = useCallback(() => {
        const opcuaRedirectedFlag = 'opcuaRedirected', reloadingFlag = 'reloadingDueToDelay', redirectingFlag = 'redirectingDueToExtremeDelay';
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;
        if (typeof window !== 'undefined' && (sessionStorage.getItem(opcuaRedirectedFlag) || sessionStorage.getItem(reloadingFlag) || sessionStorage.getItem(redirectingFlag))) return;

        setIsConnected(false);
        const delayMs = Math.min(1000 + 2000 * Math.pow(1.5, reconnectAttempts.current), 60000);
        if (reconnectInterval.current) clearTimeout(reconnectInterval.current);

        reconnectInterval.current = setTimeout(() => {
            if (typeof window === 'undefined') return;
            ws.current = new WebSocket(WS_URL);
            ws.current.onopen = () => {
                console.log("WS Connected"); setIsConnected(true); setNodeValues({}); setLastUpdateTime(Date.now()); reconnectAttempts.current = 0;
                if (reconnectInterval.current) { clearTimeout(reconnectInterval.current); reconnectInterval.current = null; }
                toast.success('Connection Established', { description: 'Live data feed active.', duration: 3000 });
                playNotificationSound('success');
                if (typeof window !== 'undefined') { [opcuaRedirectedFlag, reloadingFlag, redirectingFlag].forEach(flag => sessionStorage.removeItem(flag)); }
            };
            ws.current.onmessage = (event) => {
                try {
                    const receivedData = JSON.parse(event.data as string);
                    if (typeof receivedData === 'object' && receivedData !== null) { setNodeValues(prev => ({ ...prev, ...receivedData })); setLastUpdateTime(Date.now()); }
                    else console.warn("Received non-object data on WS:", receivedData);
                } catch (e) { console.error("WS parse error:", e, "Data:", event.data); toast.error('Data Error', { description: 'Received invalid data format.' }); playNotificationSound('error'); }
            };
            ws.current.onerror = (event) => {
                console.error("WebSocket error event:", event);
                if (typeof window !== 'undefined' && !sessionStorage.getItem(opcuaRedirectedFlag)) {
                    toast.error('Connection Error', { description: 'Redirecting for status check.' }); playNotificationSound('error');
                    sessionStorage.setItem(opcuaRedirectedFlag, 'true');
                    window.location.href = new URL('/api/opcua', window.location.origin).href;
                } else { if (ws.current) ws.current.close(ws.current.readyState === WebSocket.OPEN ? 1011 : undefined); }
            };
            ws.current.onclose = (event) => {
                console.log(`WS disconnected. Code: ${event.code}, Reason: ${event.reason || 'N/A'}, Clean: ${event.wasClean}`);
                setIsConnected(false); setNodeValues({});
                if (typeof window !== 'undefined' && (sessionStorage.getItem(opcuaRedirectedFlag) || sessionStorage.getItem(reloadingFlag) || sessionStorage.getItem(redirectingFlag))) return;
                if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++; connectWebSocket();
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    toast.error('Connection Failed', { description: 'Max reconnect attempts reached.' }); playNotificationSound('error');
                } else if (event.code === 1000) toast.info('Disconnected', { description: 'Connection closed cleanly.' });
            };
        }, delayMs);
    }, [playNotificationSound, maxReconnectAttempts]);

    useEffect(() => { // Initial WS connect & cleanup
        if (typeof window === 'undefined') return;
        ['opcuaRedirected', 'reloadingDueToDelay', 'redirectingDueToExtremeDelay'].forEach(flag => sessionStorage.removeItem(flag));
        reconnectAttempts.current = 0;
        connectWebSocket();
        return () => {
            if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
            if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
                if(ws.current.onclose) ws.current.onclose = null; ws.current.close(1000, 'Component Unmounted'); ws.current = null;
            }
        };
    }, [connectWebSocket]);

    const { threePhaseGroups, individualPoints } = useMemo(() => groupDataPoints(currentlyDisplayedDataPoints), [currentlyDisplayedDataPoints]);

    const sections = useMemo(() => {
        const controlItems = individualPoints.filter(p => p.uiType === 'button' || p.uiType === 'switch');
        const gaugeItemsIndividual = individualPoints.filter(p => p.uiType === 'gauge');
        const displayItemsIndividual = individualPoints.filter(p => p.uiType === 'display');
        const gaugeGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'gauge');
        const displayGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'display');

        const displayByCategory = displayItemsIndividual.reduce((acc, point) => {
            const isInGroup = threePhaseGroups.some(g => Object.values(g.points as Record<string, { nodeId?: string }>).some(pVal => pVal?.nodeId === point.nodeId));
            if (isInGroup) return acc;
            const categoryKey = point.category || 'status';
            if (!acc[categoryKey as string]) acc[categoryKey as string] = [];
            (acc[categoryKey as string] as DataPoint[]).push(point);
            return acc;
        }, {} as Record<string, DataPoint[]>);

        const layoutSections = [
            { title: "Controls & Settings", items: controlItems as (DataPoint | ThreePhaseGroupInfo)[], gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' },
            { title: "Gauges & Overview", items: [...gaugeItemsIndividual, ...gaugeGroups3Phase] as (DataPoint | ThreePhaseGroupInfo)[], gridCols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' },
            { title: "Three Phase Readings", items: displayGroups3Phase as (DataPoint | ThreePhaseGroupInfo)[], gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' },
            ...Object.entries(displayByCategory)
                .sort(([catA], [catB]) => catA.localeCompare(catB))
                .map(([category, points]) => ({
                    title: `${category.charAt(0).toUpperCase() + category.slice(1)} Readings`,
                    items: points as (DataPoint | ThreePhaseGroupInfo)[],
                    gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                }))
        ];
        return layoutSections.filter(section => section.items && section.items.length > 0);
    }, [individualPoints, threePhaseGroups]);

    const cardHoverEffect = useMemo(() => (resolvedTheme === 'dark'
        ? { y: -4, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.15), 0 5px 8px -5px rgba(0,0,0,0.2)", transition: { type: 'spring', stiffness: 350, damping: 20 } }
        : { y: -4, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.08), 0 5px 8px -5px rgba(0,0,0,0.08)", transition: { type: 'spring', stiffness: 350, damping: 20 } }
    ), [resolvedTheme]);

    const sendDataToWebSocket = useCallback((nodeId: string, value: boolean | number | string) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                const pointConfig = allPossibleDataPoints.find(p => p.nodeId === nodeId);
                let valueToSend = value;
                if (pointConfig?.dataType.includes('Int')) {
                    if (typeof value === 'boolean') valueToSend = value ? 1 : 0;
                    else if (typeof value === 'string') valueToSend = parseInt(value, 10);
                } else if (pointConfig?.dataType === 'Boolean') {
                    if (typeof value === 'number') valueToSend = value !== 0;
                    else if (typeof value === 'string') valueToSend = value.toLowerCase() === 'true' || value === '1';
                } else if (pointConfig?.dataType === 'Float' || pointConfig?.dataType === 'Double') {
                    if (typeof value === 'string') valueToSend = parseFloat(value);
                }
                if (typeof valueToSend === 'number' && !isFinite(valueToSend)) {
                    toast.error('Send Error', { description: 'Invalid number value.' }); playNotificationSound('error'); return;
                }
                const payload = JSON.stringify({ [nodeId]: valueToSend });
                ws.current.send(payload);
                toast.info('Command Sent', { description: `${pointConfig?.name || nodeId} = ${String(valueToSend)}` }); playNotificationSound('info');
            } catch (e) { console.error("WS send error:", e); toast.error('Send Error', { description: 'Failed to send command.' }); playNotificationSound('error'); }
        } else {
            toast.error('Connection Error', { description: 'Cannot send. WebSocket disconnected.' }); playNotificationSound('error');
            if (!isConnected) connectWebSocket();
        }
    }, [ws, isConnected, connectWebSocket, allPossibleDataPoints, playNotificationSound]);

    const handleAddMultipleDataPoints = useCallback((selectedIds: string[]) => {
        const currentDisplayedSet = new Set(displayedDataPointIds);
        const trulyNewIds = selectedIds.filter(id => !currentDisplayedSet.has(id));

        if (trulyNewIds.length === 0 && selectedIds.length > 0) {
            toast.warning("Selected items are already displayed or no new points chosen.");
            return;
        }
        if (trulyNewIds.length > 0) {
            setDisplayedDataPointIds(prevIds => [...prevIds, ...trulyNewIds]);
            toast.success(`${trulyNewIds.length} new data point${trulyNewIds.length > 1 ? 's' : ''} added.`);
        }
        setIsConfiguratorOpen(false);
    }, [displayedDataPointIds]);

    const handleRemoveItem = useCallback((dataPointIdToRemove: string) => {
        setDisplayedDataPointIds(prevIds => prevIds.filter(id => id !== dataPointIdToRemove));
        toast.info("Data point removed.");
    }, []);

    const handleRemoveAllItems = useCallback(() => {
        setDisplayedDataPointIds([]);
        toast.info("All data points removed.");
    }, []);

    const handleResetToDefault = useCallback(() => {
        setDisplayedDataPointIds(getDefaultDataPointIds());
        toast.info("Dashboard reset to default.");
    }, [getDefaultDataPointIds]);

    // Pre-processing for Configurator - ensures lists are always defined
    const { threePhaseGroupsForConfig, individualPointsForConfig } = useMemo(() => {
        const groups: Record<string, ConfiguratorThreePhaseGroup> = {};
        const individuals: DataPoint[] = [];
        const currentDisplayedSet = new Set(displayedDataPointIds);

        allPossibleDataPoints.forEach(dp => {
            if (dp.threePhaseGroup && dp.phase && ['a', 'b', 'c'].includes(dp.phase)) {
                if (!groups[dp.threePhaseGroup]) {
                    let representativeName = dp.name.replace(/ (L[123]|Phase [ABC]\b)/ig, '').trim();
                    representativeName = representativeName.replace(/ \([ABC]\)$/i, '').trim();
                    groups[dp.threePhaseGroup] = {
                        name: dp.threePhaseGroup,
                        representativeName: representativeName || dp.threePhaseGroup,
                        ids: [],
                        category: dp.category,
                    };
                }
                groups[dp.threePhaseGroup].ids.push(dp.id);
            } else if (!dp.threePhaseGroup || (dp.threePhaseGroup && (dp.phase === 'x' || !dp.phase))) {
                if(!(dp.threePhaseGroup && dp.phase && ['a','b','c'].includes(dp.phase))){
                    individuals.push(dp);
                }
            }
        });
        
        Object.values(groups).forEach(group => {
            const relatedSpecialPoints = allPossibleDataPoints.filter(
                dp => dp.threePhaseGroup === group.name && (dp.phase === 'x' || !dp.phase) && !group.ids.includes(dp.id)
            );
            relatedSpecialPoints.forEach(relatedDp => group.ids.push(relatedDp.id));
        });

        const allGroupIds = new Set(Object.values(groups).flatMap(g => g.ids));
        const trulyIndividualPoints = individuals.filter(ind => !allGroupIds.has(ind.id));

        return {
            threePhaseGroupsForConfig: Object.values(groups)
                .filter(g => g.ids.some(id => !currentDisplayedSet.has(id)))
                .sort((a, b) => a.representativeName.localeCompare(b.representativeName)),
            individualPointsForConfig: trulyIndividualPoints
                .filter(dp => !currentDisplayedSet.has(dp.id))
                .sort((a, b) => a.name.localeCompare(b.name)),
        };
    }, [allPossibleDataPoints, displayedDataPointIds]);


    return (
        <div className="bg-background text-foreground px-3 sm:px-4 md:px-6 lg:px-8 transition-colors duration-300">
            <div className="max-w-screen-3xl mx-auto">
                <DashboardHeader
                    plcStatus={plcStatus}
                    isConnected={isConnected}
                    connectWebSocket={connectWebSocket}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    currentTime={currentTime}
                    delay={delay}
                    version={VERSION}
                    isEditMode={isEditMode}
                    setIsEditMode={setIsEditMode}
                    onOpenConfigurator={() => setIsConfiguratorOpen(true)}
                    onRemoveAll={handleRemoveAllItems}
                    onResetToDefault={handleResetToDefault}
                />

                <motion.div className="space-y-8 py-4" variants={containerVariants} initial="hidden" animate="visible">
                    {sections.length === 0 && !isEditMode && (
                        <div className="text-center py-16 text-muted-foreground min-h-[300px] flex flex-col items-center justify-center">
                            <InfoIcon className="w-12 h-12 mb-4 text-gray-400" />
                            <h3 className="text-xl font-semibold mb-2">Dashboard is Empty</h3>
                            <p>No data points configured for display.</p>
                            <p className="mt-2">Click the "Edit Layout" button in the header to add data points.</p>
                        </div>
                    )}
                     {sections.length === 0 && isEditMode && (
                        <div className="text-center py-16 text-muted-foreground min-h-[300px] flex flex-col items-center justify-center">
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
                            currentHoverEffect={cardHoverEffect}
                            sendDataToWebSocket={sendDataToWebSocket}
                            playNotificationSound={playNotificationSound}
                            lastToastTimestamps={lastToastTimestamps}
                            isEditMode={isEditMode}
                            onRemoveItem={handleRemoveItem}
                            allPossibleDataPoints={allPossibleDataPoints}
                        />
                    ))}
                </motion.div>
            </div>

            {isConfiguratorOpen && (
                <DashboardItemConfigurator
                    isOpen={isConfiguratorOpen}
                    onClose={() => setIsConfiguratorOpen(false)}
                    availableIndividualPoints={individualPointsForConfig}
                    availableThreePhaseGroups={threePhaseGroupsForConfig}
                    currentDisplayedIds={displayedDataPointIds}
                    onAddMultipleDataPoints={handleAddMultipleDataPoints}
                />
            )}
        </div>
    );
};

export default Dashboard;