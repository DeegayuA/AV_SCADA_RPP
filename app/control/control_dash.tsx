// app/control/page.tsx (Assuming this is the route file, previously header.tsx)
'use client';

// Merged Imports
import React, { useEffect, useState, useCallback, useRef, useMemo, Dispatch, SetStateAction } from 'react';
import { motion, Variants, TargetAndTransition } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Settings, PlusCircle, Clock, Trash2, RotateCcw, Power, Check, InfoIcon as InfoIconLucide } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { dataPoints as allPossibleDataPointsConfig, DataPoint } from '@/config/dataPoints';
import { WS_URL, VERSION, PLANT_NAME, USER } from '@/config/constants';
import { containerVariants, itemVariants } from '@/config/animationVariants';
import { playSound } from '@/lib/utils';
import { NodeData, ThreePhaseGroupInfo } from '../DashboardData/dashboardInterfaces'; // Ensure types are correct
import { groupDataPoints } from '../DashboardData/groupDataPoints';
import DashboardItemConfigurator, { ConfiguratorThreePhaseGroup } from '@/components/DashboardItemConfigurator';
import PlcConnectionStatus from '../DashboardData/PlcConnectionStatus';
import WebSocketStatus from '../DashboardData/WebSocketStatus';
import SoundToggle from '../DashboardData/SoundToggle';
import ThemeToggle from '../DashboardData/ThemeToggle';
import DashboardSection from '../DashboardData/DashboardSection';

// Assuming useAppStore is only needed for `currentUser` now if SLD edit isn't independent
import { useAppStore } from "@/stores/appStore";
// SLDWidget component needs to accept `isEditMode` prop
import SLDWidget from "../circuit/sld/SLDWidget";


// ------------------
// Component: DashboardHeaderControl (No changes needed here based on errors)
// ------------------
interface DashboardHeaderControlProps {
    plcStatus: "online" | "offline" | "disconnected"; isConnected: boolean; connectWebSocket: () => void;
    soundEnabled: boolean; setSoundEnabled: Dispatch<SetStateAction<boolean>>; currentTime: string; delay: number;
    version: string; onOpenConfigurator: () => void; isEditMode: boolean; setIsEditMode: (isEditing: boolean) => void;
    onRemoveAll: () => void; onResetToDefault: () => void;
}
const DashboardHeaderControl: React.FC<DashboardHeaderControlProps> = React.memo(
    ({ plcStatus, isConnected, connectWebSocket, soundEnabled, setSoundEnabled, currentTime, delay, version, onOpenConfigurator, isEditMode, setIsEditMode, onRemoveAll, onResetToDefault, }) => {
        const pathname = usePathname();
        const headerTitle = pathname?.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard';
        return (
            <><motion.div className="flex flex-col sm:flex-row justify-between items-center mb-2 md:mb-4 gap-4 pt-3" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}><h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center sm:text-left">{PLANT_NAME} {headerTitle}</h1><div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">{isEditMode && (<><motion.div variants={itemVariants}><Button variant="default" size="sm" onClick={onOpenConfigurator} title="Add new cards to the dashboard"><PlusCircle className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Add Cards</span><span className="sm:hidden">Add</span></Button></motion.div><AlertDialog><AlertDialogTrigger asChild><motion.div variants={itemVariants}><Button variant="destructive" size="sm" title="Remove all cards from dashboard"><Trash2 className="mr-1.5 h-4 w-4" /><span className="hidden md:inline">Remove All</span><span className="md:hidden sr-only">Remove All Cards</span></Button></motion.div></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will remove all cards from your current dashboard layout. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onRemoveAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove All</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><AlertDialog><AlertDialogTrigger asChild><motion.div variants={itemVariants}><Button variant="outline" size="sm" title="Reset dashboard to default layout"><RotateCcw className="mr-1.5 h-4 w-4" /><span className="hidden md:inline">Reset Layout</span><span className="md:hidden sr-only">Reset Layout</span></Button></motion.div></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reset to Default Layout?</AlertDialogTitle><AlertDialogDescription>This will discard your current layout and restore the default set of cards.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onResetToDefault}>Reset</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>)}{/* Other buttons */}<motion.div variants={itemVariants}><PlcConnectionStatus status={plcStatus} /></motion.div><motion.div variants={itemVariants}><WebSocketStatus isConnected={isConnected} connectFn={connectWebSocket} /></motion.div><motion.div variants={itemVariants}><TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant={isEditMode ? "secondary" : "ghost"} size="icon" onClick={() => setIsEditMode(!isEditMode)}>{isEditMode ? <Check className="h-5 w-5" /> : <Settings className="h-5 w-5" />}<span className="sr-only">{isEditMode ? "Done Editing Layout" : "Edit Dashboard Layout"}</span></Button></TooltipTrigger><TooltipContent><p>{isEditMode ? "Done Editing Layout" : "Edit Dashboard Layout"}</p></TooltipContent></Tooltip></TooltipProvider></motion.div><motion.div variants={itemVariants}><SoundToggle soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} /></motion.div><motion.div variants={itemVariants}><ThemeToggle /></motion.div></div></motion.div><motion.div className="text-xs text-muted-foreground mb-4 flex flex-col sm:flex-row justify-between items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}><div className="flex items-center gap-2"><Clock className="h-3 w-3" /><span>{currentTime}</span>{isConnected ? (<TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><span className={`font-mono cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 3000 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50' : delay < 10000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50' : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50'}`}>{delay > 30000 ? '>30s lag' : `${(delay / 1000).toFixed(1)}s lag`}</span></TooltipTrigger><TooltipContent><p>Last data received {delay} ms ago</p></TooltipContent></Tooltip></TooltipProvider>) : (<Button variant="ghost" size="sm" className="px-1.5 py-0.5 h-auto text-xs text-muted-foreground hover:text-foreground" onClick={connectWebSocket} title="Attempt manual WebSocket reconnection"><Power className="mr-1 h-3 w-3" /> Reconnect</Button>)}</div><span className='font-mono'>v{version || '?.?.?'}</span></motion.div></>
        );
    });
DashboardHeaderControl.displayName = 'DashboardHeaderControl';

// ------------------
// Component: HeaderConnectivityComponent (No changes needed here)
// ------------------
interface HeaderConnectivityComponentProps extends DashboardHeaderControlProps {}
const HeaderConnectivityComponent: React.FC<HeaderConnectivityComponentProps> = (props) => {
    return <DashboardHeaderControl {...props} />;
};
HeaderConnectivityComponent.displayName = 'HeaderConnectivityComponent';

// ------------------
// Component: RenderingComponent (No changes needed here - already uses isEditMode prop)
// ------------------
interface SectionToRender { title: string; items: (DataPoint | ThreePhaseGroupInfo)[]; gridCols: string; }
interface RenderingComponentProps { sections: SectionToRender[]; isEditMode: boolean; nodeValues: NodeData; isConnected: boolean; currentHoverEffect: TargetAndTransition; sendDataToWebSocket: (nodeId: string, value: boolean | number | string) => void; playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void; lastToastTimestamps: React.MutableRefObject<Record<string, number>>; onRemoveItem: (dataPointIdToRemove: string) => void; allPossibleDataPoints: DataPoint[]; containerVariants: Variants;}
const RenderingComponent: React.FC<RenderingComponentProps> = ({ sections, isEditMode, nodeValues, isConnected, currentHoverEffect, sendDataToWebSocket, playNotificationSound, lastToastTimestamps, onRemoveItem, allPossibleDataPoints, containerVariants,}) => (
    <motion.div className="space-y-8 py-4" variants={containerVariants} initial="hidden" animate="visible">
        {sections.length === 0 && !isEditMode && (<div className="text-center py-16 text-muted-foreground min-h-[100px] flex flex-col items-center justify-center"><InfoIconLucide className="w-12 h-12 mb-4 text-gray-400" /><h3 className="text-xl font-semibold mb-2">Dashboard is Empty</h3><p>No data points configured for display in these sections.</p><p className="mt-2">Click the "Edit Layout" button in the header to add data points.</p></div>)}
        {sections.length === 0 && isEditMode && (<div className="text-center py-16 text-muted-foreground min-h-[100px] flex flex-col items-center justify-center"><Settings className="w-12 h-12 mb-4 text-gray-400" /><h3 className="text-xl font-semibold mb-2">Layout Editor Mode</h3><p>No data points currently selected for these sections.</p><p className="mt-2">Click the "Add Cards" button above to get started.</p></div>)}
        {sections.map((section) => (<DashboardSection key={section.title + ((section.items[0] as DataPoint)?.id || Math.random())} title={section.title} gridCols={section.gridCols} items={section.items} nodeValues={nodeValues} isDisabled={!isConnected} currentHoverEffect={currentHoverEffect} sendDataToWebSocket={sendDataToWebSocket} playNotificationSound={playNotificationSound} lastToastTimestamps={lastToastTimestamps} isEditMode={isEditMode} onRemoveItem={onRemoveItem} allPossibleDataPoints={allPossibleDataPoints}/>))}
    </motion.div>
);
RenderingComponent.displayName = 'RenderingComponent';


// ------------------
// MAIN DASHBOARD LOGIC
// ------------------
const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2`;
const DEFAULT_DISPLAY_COUNT = 6;

const UnifiedDashboardPage: React.FC = () => { // Renamed component
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

    const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
        if (typeof window !== 'undefined') { return localStorage.getItem('dashboardSoundEnabled') === 'true'; } return false;
    });
    useEffect(() => { if (typeof window !== 'undefined') { localStorage.setItem('dashboardSoundEnabled', String(soundEnabled)); } }, [soundEnabled]);

    // THIS IS THE MASTER EDIT MODE STATE controlled by the header's Settings/Check button
    const [isEditMode, setIsEditMode] = useState(false);
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
    
    // Only needed if currentUser permission check is still required for showing the SLD section header perhaps?
    const { currentUser } = useAppStore(state => ({ currentUser: state.currentUser })); 
    const canViewSLDEditButtonPotentially = currentUser?.role === USER; // Permission check

    const sldLayoutId = 'main_plant';

    const allPossibleDataPoints = useMemo(() => allPossibleDataPointsConfig, []);

    const getDefaultDataPointIds = useCallback(() => {
        const criticalDefaultIds = ['grid-total-active-power-side-to-side', 'inverter-output-total-power', 'load-total-power', 'battery-capacity', 'battery-output-power', 'input-power-pv1'].filter(id => allPossibleDataPoints.some(dp => dp.id === id));
        if (criticalDefaultIds.length > 0) return criticalDefaultIds;
        return allPossibleDataPoints.slice(0, DEFAULT_DISPLAY_COUNT).map(dp => dp.id);
    }, [allPossibleDataPoints]);

    const [displayedDataPointIds, setDisplayedDataPointIds] = useState<string[]>(() => {
        if (typeof window !== 'undefined') { const savedString = localStorage.getItem(USER_DASHBOARD_CONFIG_KEY); if (savedString) { try { const parsedIds = JSON.parse(savedString) as string[]; return parsedIds.filter(id => allPossibleDataPoints.some(dp => dp.id === id)); } catch (e) { console.error("Error parsing saved dashboard configuration:", e); } } }
        return getDefaultDataPointIds();
    });

    useEffect(() => { if (typeof window !== 'undefined') { localStorage.setItem(USER_DASHBOARD_CONFIG_KEY, JSON.stringify(displayedDataPointIds)); } }, [displayedDataPointIds]);

    const currentlyDisplayedDataPoints = useMemo(() => displayedDataPointIds.map(id => allPossibleDataPoints.find(dp => dp.id === id)).filter(Boolean) as DataPoint[], [displayedDataPointIds, allPossibleDataPoints]);

    const playNotificationSound = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
        if (!soundEnabled) return;
        const soundMap = { success: '/sounds/success.mp3', error: '/sounds/error.mp3', warning: '/sounds/warning.mp3', info: '/sounds/info.mp3' };
        const volumeMap = { success: 0.99, error: 0.6, warning: 0.5, info: 0.3 };
        if (typeof playSound === 'function') playSound(soundMap[type], volumeMap[type]); else console.warn("playSound utility not found.");
    }, [soundEnabled]);

    useEffect(() => { const updateClock = () => setCurrentTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: 'short', year: 'numeric' })); updateClock(); const interval = setInterval(updateClock, 1000); return () => clearInterval(interval); }, []);

    useEffect(() => {
        const lagCheckInterval = setInterval(() => {
            const currentDelay = Date.now() - lastUpdateTime; setDelay(currentDelay);
            const reloadingFlag = 'reloadingDueToDelay', redirectingFlag = 'redirectingDueToExtremeDelay', opcuaRedirectedFlag = 'opcuaRedirected';
            if (typeof window !== 'undefined' && (sessionStorage.getItem(reloadingFlag) || sessionStorage.getItem(redirectingFlag) || sessionStorage.getItem(opcuaRedirectedFlag))) return;
            if (isConnected && currentDelay > 40000 && typeof window !== 'undefined') { console.error(`Extreme WS data lag (${(currentDelay / 1000).toFixed(1)}s). Redirecting.`); toast.error('Critical Lag Detected', { description: 'Redirecting for connection check...', duration: 5000 }); playNotificationSound('error'); sessionStorage.setItem(redirectingFlag, 'true'); window.location.href = new URL('/api/opcua', window.location.origin).href; return; }
            else if (isConnected && currentDelay > 30000 && typeof window !== 'undefined') { console.warn(`WS data lag (${(currentDelay / 1000).toFixed(1)}s). Reloading.`); toast.warning('Stale Data Detected', { description: 'Refreshing connection...', duration: 5000 }); playNotificationSound('warning'); sessionStorage.setItem(reloadingFlag, 'true'); setTimeout(() => { if (typeof window !== 'undefined') window.location.reload(); }, 1500); }
            else if (currentDelay < 30000 && typeof window !== 'undefined') { if (sessionStorage.getItem(reloadingFlag)) sessionStorage.removeItem(reloadingFlag); if (sessionStorage.getItem(redirectingFlag)) sessionStorage.removeItem(redirectingFlag); }
        }, 2000); return () => clearInterval(lagCheckInterval);
    }, [lastUpdateTime, isConnected, playNotificationSound]);

    const checkPlcConnection = useCallback(async () => { try { const res = await fetch('/api/opcua/status'); if (!res.ok) throw new Error(`API Error: ${res.status}`); const data = await res.json(); const newStatus = data.connectionStatus; if (newStatus && ['online', 'offline', 'disconnected'].includes(newStatus)) setPlcStatus(newStatus); else { console.error("Invalid PLC status:", data); if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); } } catch (err) { if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); } }, [plcStatus]);
    useEffect(() => { checkPlcConnection(); const plcInterval = setInterval(checkPlcConnection, 10000); return () => clearInterval(plcInterval); }, [checkPlcConnection]);

    const connectWebSocket = useCallback(() => {
        const opcuaRedirectedFlag = 'opcuaRedirected', reloadingFlag = 'reloadingDueToDelay', redirectingFlag = 'redirectingDueToExtremeDelay';
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;
        if (typeof window !== 'undefined' && (sessionStorage.getItem(opcuaRedirectedFlag) || sessionStorage.getItem(reloadingFlag) || sessionStorage.getItem(redirectingFlag))) return;
        setIsConnected(false); const delayMs = Math.min(1000 + 2000 * Math.pow(1.5, reconnectAttempts.current), 60000); if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
        reconnectInterval.current = setTimeout(() => {
            if (typeof window === 'undefined') return; ws.current = new WebSocket(WS_URL);
            ws.current.onopen = () => { console.log("WS Connected"); setIsConnected(true); setNodeValues({}); setLastUpdateTime(Date.now()); reconnectAttempts.current = 0; if (reconnectInterval.current) { clearTimeout(reconnectInterval.current); reconnectInterval.current = null; } toast.success('Connection Established', { description: 'Live data feed active.', duration: 3000 }); playNotificationSound('success'); if (typeof window !== 'undefined') { [opcuaRedirectedFlag, reloadingFlag, redirectingFlag].forEach(flag => sessionStorage.removeItem(flag)); } };
            ws.current.onmessage = (event) => { try { const receivedData = JSON.parse(event.data as string); if (typeof receivedData === 'object' && receivedData !== null) { setNodeValues(prev => ({ ...prev, ...receivedData })); setLastUpdateTime(Date.now()); } else console.warn("Received non-object data on WS:", receivedData); } catch (e) { console.error("WS parse error:", e, "Data:", event.data); toast.error('Data Error', { description: 'Received invalid data format.' }); playNotificationSound('error'); } };
            ws.current.onerror = (event) => { console.error("WebSocket error event:", event); if (typeof window !== 'undefined' && !sessionStorage.getItem(opcuaRedirectedFlag)) { toast.error('Connection Error', { description: 'Redirecting for status check.' }); playNotificationSound('error'); sessionStorage.setItem(opcuaRedirectedFlag, 'true'); window.location.href = new URL('/api/opcua', window.location.origin).href; } else { if (ws.current) ws.current.close(ws.current.readyState === WebSocket.OPEN ? 1011 : undefined); } };
            ws.current.onclose = (event) => { console.log(`WS disconnected. Code: ${event.code}, Reason: ${event.reason || 'N/A'}, Clean: ${event.wasClean}`); setIsConnected(false); setNodeValues({}); if (typeof window !== 'undefined' && (sessionStorage.getItem(opcuaRedirectedFlag) || sessionStorage.getItem(reloadingFlag) || sessionStorage.getItem(redirectingFlag))) return; if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) { reconnectAttempts.current++; connectWebSocket(); } else if (reconnectAttempts.current >= maxReconnectAttempts) { toast.error('Connection Failed', { description: 'Max reconnect attempts reached.' }); playNotificationSound('error'); } else if (event.code === 1000) { /* toast.info('Disconnected', { description: 'Connection closed cleanly.' }) */ } };
        }, delayMs);
    }, [playNotificationSound, maxReconnectAttempts, WS_URL]); 

    useEffect(() => { if (typeof window === 'undefined') return; ['opcuaRedirected', 'reloadingDueToDelay', 'redirectingDueToExtremeDelay'].forEach(flag => sessionStorage.removeItem(flag)); reconnectAttempts.current = 0; connectWebSocket(); return () => { if (reconnectInterval.current) clearTimeout(reconnectInterval.current); if (ws.current && ws.current.readyState !== WebSocket.CLOSED) { ws.current.onopen = null; ws.current.onmessage = null; ws.current.onerror = null; ws.current.onclose = null; ws.current.close(1000, 'Component Unmounted'); ws.current = null; } }; }, [connectWebSocket]);

    const { threePhaseGroups, individualPoints } = useMemo(() => groupDataPoints(currentlyDisplayedDataPoints), [currentlyDisplayedDataPoints]);

    const dynamicDashboardSections = useMemo(() => {
        const controlItems = individualPoints.filter(p => p.uiType === 'button' || p.uiType === 'switch');
        const gaugeItemsIndividual = individualPoints.filter(p => p.uiType === 'gauge');
        const displayItemsIndividual = individualPoints.filter(p => p.uiType === 'display' && !p.threePhaseGroup); 

        const displayByCategory = displayItemsIndividual.reduce((acc, point) => {
            const categoryKey = point.category || 'other-readings'; 
            if (!acc[categoryKey]) acc[categoryKey] = [];
            acc[categoryKey].push(point);
            return acc;
        }, {} as Record<string, DataPoint[]>);

        const layoutSections: SectionToRender[] = [];
        if (controlItems.length > 0) layoutSections.push({ title: "Controls & Settings", items: controlItems, gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' });
        if (gaugeItemsIndividual.length > 0) layoutSections.push({ title: "Gauges & Overview", items: gaugeItemsIndividual, gridCols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' });
        
        Object.entries(displayByCategory).sort(([catA], [catB]) => catA.localeCompare(catB)).forEach(([category, points]) => {
            if (points.length > 0) {
                layoutSections.push({ title: `${category.charAt(0).toUpperCase() + category.slice(1)} Readings`, items: points, gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' });
            }
        });
        return layoutSections;
    }, [individualPoints]);

    const cardHoverEffect = useMemo(() => (resolvedTheme === 'dark' ? { y: -4, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.15), 0 5px 8px -5px rgba(0,0,0,0.2)", transition: { type: 'spring', stiffness: 350, damping: 20 } } : { y: -4, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.08), 0 5px 8px -5px rgba(0,0,0,0.08)", transition: { type: 'spring', stiffness: 350, damping: 20 } }), [resolvedTheme]);

    const sendDataToWebSocket = useCallback((nodeId: string, value: boolean | number | string) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try { const pointConfig = allPossibleDataPoints.find(p => p.nodeId === nodeId); let v = value; if (pointConfig?.dataType.includes('Int')) { if (typeof value === 'boolean') v = value ? 1 : 0; else if (typeof value === 'string') v = parseInt(value,10); } else if (pointConfig?.dataType === 'Boolean') { if (typeof value === 'number') v = value !== 0; else if (typeof value === 'string') v = value.toLowerCase() === 'true' || value === '1'; } else if (pointConfig?.dataType === 'Float' || pointConfig?.dataType === 'Double') { if (typeof value === 'string') v = parseFloat(value); } if (typeof v === 'number' && !isFinite(v)) { toast.error('Send Error', { description: 'Invalid number value.' }); playNotificationSound('error'); return; } const payload = JSON.stringify({ [nodeId]: v }); ws.current.send(payload); toast.info('Command Sent', { description: `${pointConfig?.name || nodeId} = ${String(v)}` }); playNotificationSound('info'); } catch (e) { console.error("WS send error:", e); toast.error('Send Error', { description: 'Failed to send command.' }); playNotificationSound('error'); }
        } else { toast.error('Connection Error', { description: 'Cannot send. WebSocket disconnected.' }); playNotificationSound('error'); if (!isConnected) connectWebSocket(); }
    }, [isConnected, connectWebSocket, allPossibleDataPoints, playNotificationSound]);

    const handleAddMultipleDataPoints = useCallback((selectedIds: string[]) => {
        const currentDisplayedSet = new Set(displayedDataPointIds);
        const trulyNewIds = selectedIds.filter(id => !currentDisplayedSet.has(id));
        if (trulyNewIds.length === 0 && selectedIds.length > 0) {
            toast.warning("Selected items are already displayed or no new points chosen.");
            return;
        }
        if (trulyNewIds.length > 0) {
            // FIX for TS2802: Use Array.from for downlevelIteration compatibility
            setDisplayedDataPointIds(prevIds => Array.from(new Set([...prevIds, ...trulyNewIds])));
            toast.success(`${trulyNewIds.length} new data point${trulyNewIds.length > 1 ? 's' : ''} added.`);
        }
        setIsConfiguratorOpen(false);
    }, [displayedDataPointIds]);

    const handleRemoveItem = useCallback((dataPointIdToRemove: string) => {
        const pointToRemove = allPossibleDataPoints.find(dp => dp.id === dataPointIdToRemove);
        if (pointToRemove?.threePhaseGroup) {
            const groupIdsToRemove = allPossibleDataPoints
                .filter(dp => dp.threePhaseGroup === pointToRemove.threePhaseGroup)
                .map(dp => dp.id);
            setDisplayedDataPointIds(prevIds => prevIds.filter(id => !groupIdsToRemove.includes(id)));
            toast.info(`${pointToRemove.threePhaseGroup} group removed.`);
        } else {
            setDisplayedDataPointIds(prevIds => prevIds.filter(id => id !== dataPointIdToRemove));
            toast.info("Data point removed.");
        }
    }, [allPossibleDataPoints]);

    const handleRemoveAllItems = useCallback(() => { setDisplayedDataPointIds([]); toast.info("All data points removed."); }, []);
    const handleResetToDefault = useCallback(() => { setDisplayedDataPointIds(getDefaultDataPointIds()); toast.info("Dashboard reset to default."); }, [getDefaultDataPointIds]);

    const { threePhaseGroupsForConfig, individualPointsForConfig } = useMemo(() => {
        const groups: Record<string, ConfiguratorThreePhaseGroup> = {};
        const individuals: DataPoint[] = [];
        const currentDisplayedSet = new Set(displayedDataPointIds);
        allPossibleDataPoints.forEach(dp => {
            if (dp.threePhaseGroup && dp.phase && ['a', 'b', 'c', 'x', 'total'].includes(dp.phase)) {
                if (!groups[dp.threePhaseGroup]) {
                    let repName = dp.name.replace(/ (L[123]|Phase [ABCX]\b|Total\b)/ig, '').trim().replace(/ \([ABCX]\)$/i, '').trim();
                    groups[dp.threePhaseGroup] = { name: dp.threePhaseGroup, representativeName: repName || dp.threePhaseGroup, ids: [], category: dp.category };
                }
                groups[dp.threePhaseGroup].ids.push(dp.id);
            } else if (!dp.threePhaseGroup) {
                individuals.push(dp);
            }
        });
        // FIX for potential TS2802: Convert Set to Array before filtering/mapping if issues arise
        const allGroupIdsAsArray = Array.from(new Set(Object.values(groups).flatMap(g => g.ids)));
        const trulyIndividualPoints = individuals.filter(ind => !allGroupIdsAsArray.includes(ind.id));
        
        const currentDisplayedArray = Array.from(currentDisplayedSet);
        return { 
            threePhaseGroupsForConfig: Object.values(groups).filter(g => g.ids.some(id => !currentDisplayedArray.includes(id))).sort((a,b) => a.representativeName.localeCompare(b.representativeName)),
            individualPointsForConfig: trulyIndividualPoints.filter(dp => !currentDisplayedArray.includes(dp.id)).sort((a,b) => a.name.localeCompare(b.name)) 
        };
    }, [allPossibleDataPoints, displayedDataPointIds]);
    
    // Early check for missing core components (REMOVED - assumed components are working or handled elsewhere)
    // if (typeof Card === 'undefined' || ...) { ... } 
    
    const sldSectionMinHeight = "400px";
    // Calculate height based on whether the *potential* to show the SLD edit button exists
    const sldHeaderButtonHeight = canViewSLDEditButtonPotentially ? '2.75rem' : '0rem'; 
    const sldInternalMaxHeight = `calc(${sldSectionMinHeight} - 2.5rem - ${sldHeaderButtonHeight})`; // Header + Potential Button Height

    return (
        <div className="bg-background text-foreground px-3 sm:px-4 md:px-6 lg:px-8 transition-colors duration-300 pb-8">
            <div className="max-w-screen-3xl mx-auto">
                <HeaderConnectivityComponent
                    plcStatus={plcStatus}
                    isConnected={isConnected}
                    connectWebSocket={connectWebSocket}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    currentTime={currentTime}
                    delay={delay}
                    version={VERSION}
                    isEditMode={isEditMode} // Master edit mode state
                    setIsEditMode={setIsEditMode} // Function to toggle master edit mode
                    onOpenConfigurator={() => setIsConfiguratorOpen(true)}
                    onRemoveAll={handleRemoveAllItems}
                    onResetToDefault={handleResetToDefault}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
                    {/* SLD Widget Card */}
                    <Card className={`lg:col-span-2 shadow-lg`} style={{ minHeight: sldSectionMinHeight }}>
                        <CardContent className="p-4 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xl font-semibold">Plant Layout View : {sldLayoutId}</h3>
                                {/* REMOVED SLD-specific edit toggle button - Now controlled by master header button */}
                                {/* {canViewSLDEditButtonPotentially && !isEditMode && ( 
                                     <Button onClick={toggleSLDEditModeStore} variant="outline" size="sm">
                                        {isSLDEditModeFromStore ? 'SLD View Mode' : 'SLD Edit Mode'}
                                    </Button>
                                )} */}
                            </div>
                            <div style={{ height: sldInternalMaxHeight }} className="overflow-hidden rounded-md border flex-grow">
                                {/* FIX for TS2322: Pass the master isEditMode state */}
                                {/* IMPORTANT: SLDWidget *must* accept `isEditMode` prop */}
                                <SLDWidget layoutId={sldLayoutId} isEditMode={isEditMode} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Three-Phase Elements Card */}
                    <Card className={`shadow-lg`} style={{ minHeight: sldSectionMinHeight }}>
                         <CardContent className="p-4 h-full flex flex-col">
                            <h3 className="text-xl font-semibold mb-3">Three-Phase Elements</h3>
                            <div className="overflow-y-auto flex-grow" style={{ maxHeight: `calc(${sldSectionMinHeight} - 2.5rem)` }}> {/* Adjusted height calc */}
                                {threePhaseGroups.length > 0 ? (
                                    <DashboardSection
                                        title=""
                                        gridCols="grid-cols-1 gap-y-3" // Changed space-y to gap-y for better compatibility
                                        items={threePhaseGroups}
                                        nodeValues={nodeValues}
                                        isDisabled={!isConnected}
                                        currentHoverEffect={cardHoverEffect}
                                        sendDataToWebSocket={sendDataToWebSocket}
                                        playNotificationSound={playNotificationSound}
                                        lastToastTimestamps={lastToastTimestamps}
                                        isEditMode={isEditMode} // Use master edit mode
                                        onRemoveItem={handleRemoveItem}
                                        allPossibleDataPoints={allPossibleDataPoints}
                                    />
                                ) : (
                                    <p className="text-muted-foreground italic text-sm pt-2">
                                        {displayedDataPointIds.length > 0 ? "No three-phase groups among displayed items." : "Add data points to see three-phase elements."}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline Graphs Card */}
                <Card className="shadow-lg my-6">
                    <CardContent className="p-4 min-h-[100px]">
                        <h3 className="text-xl font-semibold mb-3">Timeline Graphs</h3>
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Graph content will appear here.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Rendering Component for other dashboard sections */}
                <RenderingComponent
                    sections={dynamicDashboardSections}
                    isEditMode={isEditMode} // Use master edit mode
                    nodeValues={nodeValues}
                    isConnected={isConnected}
                    currentHoverEffect={cardHoverEffect}
                    sendDataToWebSocket={sendDataToWebSocket}
                    playNotificationSound={playNotificationSound}
                    lastToastTimestamps={lastToastTimestamps}
                    onRemoveItem={handleRemoveItem}
                    allPossibleDataPoints={allPossibleDataPoints}
                    containerVariants={containerVariants}
                />
            </div>

            {/* Dashboard Item Configurator Modal */}
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
UnifiedDashboardPage.displayName = 'UnifiedDashboardPage'; // Changed display name

export default UnifiedDashboardPage; // Export the renamed component