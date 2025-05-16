// src/components/dashboard/Dashboard.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo, Dispatch, SetStateAction } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Added
import { motion, Variants, TargetAndTransition } from 'framer-motion';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
    Settings, Pencil, Clock, Trash2, RotateCcw, Power, AlertTriangle, Check, ShieldAlert,
    InfoIcon as InfoIconLucide, Loader2, Maximize2, X
} from 'lucide-react'; // Added more icons
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card"; // Added
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Added
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Added
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog"; // Added

import { dataPoints as allPossibleDataPointsConfig, DataPoint } from '@/config/dataPoints';
import { WS_URL, VERSION, PLANT_NAME } from '@/config/constants';
import { containerVariants, itemVariants } from '@/config/animationVariants';
import { playSound } from '@/lib/utils';
import { NodeData, ThreePhaseGroupInfo } from './dashboardInterfaces'; // Adjusted path
import { groupDataPoints } from './groupDataPoints'; // Adjusted path
import DashboardItemConfigurator, { ConfiguratorThreePhaseGroup } from '@/components/DashboardItemConfigurator'; // Assuming this component exists and path is correct
import PlcConnectionStatus from './PlcConnectionStatus'; // Assuming component exists, adjust path as needed
import WebSocketStatus from './WebSocketStatus'; // Assuming component exists, adjust path as needed
import SoundToggle from './SoundToggle';         // Assuming component exists, adjust path as needed
import ThemeToggle from './ThemeToggle';         // Assuming component exists, adjust path as needed
import DashboardSection from './DashboardSection'; // Already imported
import { UserRole } from '@/types/auth'; // Assuming this type exists
import SLDWidget from "@/app/circuit/sld/SLDWidget"; // Assuming component exists, adjust path as needed
import { useDynamicDefaultDataPointIds } from '@/app/utils/defaultDataPoints'; // Assuming hook exists, adjust path as needed
import PowerTimelineGraph, { TimeScale } from '@/app/control/PowerTimelineGraph'; // Assuming component exists, adjust path for PowerTimelineGraph
import { useAppStore, useCurrentUser, useIsEditMode } from '@/stores/appStore'; // Assuming store setup

// Re-using DashboardHeaderControl structure from ControlPage
interface DashboardHeaderControlProps {
    plcStatus: "online" | "offline" | "disconnected"; isConnected: boolean; connectWebSocket: () => void;
    soundEnabled: boolean; setSoundEnabled: Dispatch<SetStateAction<boolean>>; currentTime: string; delay: number;
    version: string; onOpenConfigurator: () => void;
    isEditMode: boolean;
    toggleEditMode: () => void;
    currentUserRole?: UserRole;
    onRemoveAll: () => void; onResetToDefault: () => void;
}

const DashboardHeaderControl: React.FC<DashboardHeaderControlProps> = React.memo(
  ({
    plcStatus, isConnected, connectWebSocket, soundEnabled, setSoundEnabled, currentTime, delay,
    version, onOpenConfigurator, isEditMode, toggleEditMode, currentUserRole, onRemoveAll, onResetToDefault,
  }) => {
    const router = useRouter();
    const currentPathname = usePathname();
    const headerTitle = PLANT_NAME + " " + (currentPathname?.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard');
    const isAdmin = currentUserRole === UserRole.ADMIN;

    const navigateToResetPage = () => {
      router.push('/reset'); // Or a relevant admin/config page
    };

    return (
      <>
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-center mb-2 md:mb-4 gap-4 pt-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center sm:text-left">
            {headerTitle}
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <motion.div variants={itemVariants}><PlcConnectionStatus status={plcStatus} /></motion.div>
            <motion.div variants={itemVariants}><WebSocketStatus isConnected={isConnected} connectFn={connectWebSocket} /></motion.div>
            <motion.div variants={itemVariants}><SoundToggle soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} /></motion.div>
            <motion.div variants={itemVariants}><ThemeToggle /></motion.div>

            {isAdmin && isEditMode && (
              <>
                <motion.div variants={itemVariants}>
                  <Button variant="default" size="sm" onClick={onOpenConfigurator} title="Add new cards to the dashboard">
                    <Pencil className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Edit Cards</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                </motion.div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div variants={itemVariants}>
                      <Button variant="destructive" size="sm" title="Remove all cards from dashboard">
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        <span className="hidden md:inline">Remove All</span>
                        <span className="md:hidden sr-only">Remove All Cards</span>
                      </Button>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will remove all cards from your current dashboard layout. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onRemoveAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove All</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div variants={itemVariants}>
                      <Button variant="outline" size="sm" title="Reset dashboard to default layout">
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                        <span className="hidden md:inline">Reset Layout</span>
                        <span className="md:hidden sr-only">Reset Layout</span>
                      </Button>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Reset to Default Layout?</AlertDialogTitle><AlertDialogDescription>This will discard your current layout and restore the default set of cards for this dashboard.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onResetToDefault}>Reset Dashboard</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            {isAdmin && (
              <>
                <motion.div variants={itemVariants}>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant={isEditMode ? "secondary" : "ghost"} size="icon" onClick={toggleEditMode} title={isEditMode ? "Finalize Dashboard Edits" : "Enable Dashboard Layout Editing"}>
                          {isEditMode ? <Check className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
                          <span className="sr-only">{isEditMode ? "Done Editing Layout" : "Edit Dashboard Layout"}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{isEditMode ? "Done Editing Layout" : "Edit Dashboard Layout"}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div variants={itemVariants}>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/40 dark:hover:bg-destructive/20 dark:text-destructive/90 dark:hover:text-destructive" title="Access Application Reset Utility">
                              <ShieldAlert className="h-5 w-5" /><span className="sr-only">Reset Application Data</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-destructive text-destructive-foreground"><p>Access Application Reset Utility (Admin)</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle className="flex items-center"><AlertTriangle className="text-destructive mr-2 h-6 w-6" />Confirm Navigation</AlertDialogTitle><AlertDialogDescription>You are about to navigate to the <strong>Application Data Management</strong> page. This section contains tools for critical operations like full application reset and data import/export.<br/><br/>Proceed with caution. Ensure you understand the implications of actions performed on that page.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Stay on Dashboard</AlertDialogCancel><AlertDialogAction onClick={navigateToResetPage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Go to Reset Page</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </motion.div>
        <motion.div
          className="text-xs text-muted-foreground mb-4 flex flex-col sm:flex-row justify-between items-center gap-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" /><span>{currentTime}</span>
            {isConnected ? (
              <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                <span className={`font-mono cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 3000 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50' : delay < 10000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50' : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50'}`}>
                  {delay > 30000 ? '>30s lag' : `${(delay / 1000).toFixed(1)}s lag`}
                </span></TooltipTrigger><TooltipContent><p>Last data received {delay} ms ago</p></TooltipContent></Tooltip></TooltipProvider>
            ) : (
              <Button variant="ghost" size="sm" className="px-1.5 py-0.5 h-auto text-xs text-muted-foreground hover:text-foreground" onClick={connectWebSocket} title="Attempt manual WebSocket reconnection">
                <Power className="mr-1 h-3 w-3" /> Reconnect
              </Button>
            )}
          </div>
          <span className='font-mono'>v{version || '?.?.?'}</span>
        </motion.div>
      </>
    );
  });
DashboardHeaderControl.displayName = 'DashboardHeaderControl';


// Re-using RenderingComponent from ControlPage
interface SectionToRender { title: string; items: (DataPoint | ThreePhaseGroupInfo)[]; gridCols: string; }
interface RenderingComponentProps {
    sections: SectionToRender[]; isEditMode: boolean; nodeValues: NodeData; isConnected: boolean;
    currentHoverEffect: TargetAndTransition; sendDataToWebSocket: (nodeId: string, value: boolean | number | string) => void;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>; onRemoveItem: (dataPointIdToRemove: string) => void;
    allPossibleDataPoints: DataPoint[]; containerVariants: Variants; currentUserRole?: UserRole;
}
const RenderingComponent: React.FC<RenderingComponentProps> = ({ sections, isEditMode, nodeValues, isConnected, currentHoverEffect, sendDataToWebSocket, playNotificationSound, lastToastTimestamps, onRemoveItem, allPossibleDataPoints, containerVariants, currentUserRole }) => (
    <motion.div className="space-y-8 py-4" variants={containerVariants} initial="hidden" animate="visible">
        {sections.length === 0 && !isEditMode && (<div className="text-center py-16 text-muted-foreground min-h-[100px] flex flex-col items-center justify-center"><InfoIconLucide className="w-12 h-12 mb-4 text-gray-400" /><h3 className="text-xl font-semibold mb-2">Dashboard is Empty</h3><p>No data points configured for display in these sections.</p><p className="mt-2">{currentUserRole === UserRole.ADMIN ? 'Click the "Edit Layout" button in the header to add data points.' : 'Contact an administrator to configure the dashboard.'}</p></div>)}
        {sections.length === 0 && isEditMode && (<div className="text-center py-16 text-muted-foreground min-h-[100px] flex flex-col items-center justify-center"><Settings className="w-12 h-12 mb-4 text-gray-400" /><h3 className="text-xl font-semibold mb-2">Layout Editor Mode</h3><p>No data points currently selected for these sections.</p><p className="mt-2">Click the "Add Cards" button above to get started.</p></div>)}
        {sections.map((section) => (
            <DashboardSection
                key={section.title + ((section.items[0] as DataPoint)?.id || Math.random().toString())}
                title={section.title} gridCols={section.gridCols} items={section.items} nodeValues={nodeValues}
                isDisabled={!isConnected}
                currentHoverEffect={currentHoverEffect} sendDataToWebSocket={sendDataToWebSocket}
                playNotificationSound={playNotificationSound} lastToastTimestamps={lastToastTimestamps}
                isEditMode={isEditMode}
                onRemoveItem={onRemoveItem} allPossibleDataPoints={allPossibleDataPoints} currentUserRole={currentUserRole} />
        ))}
    </motion.div>
);
RenderingComponent.displayName = 'RenderingComponent';

const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2_main`; // Added _main to differentiate if needed
const DEFAULT_DISPLAY_COUNT = 6;
const CONTROLS_AND_STATUS_BREAKOUT_THRESHOLD = 4;
const OTHER_READINGS_CATEGORY_BREAKOUT_THRESHOLD = 4;

const Dashboard: React.FC = () => {
    const router = useRouter();
    const currentPath = usePathname(); // May not be strictly needed if PLANT_NAME is globally fixed for this dashboard
    const currentUser = useCurrentUser();
    const isGlobalEditMode = useIsEditMode();
    const storeHasHydrated = useAppStore.persist.hasHydrated();
    const [authCheckComplete, setAuthCheckComplete] = useState(false);

    const { resolvedTheme } = useTheme();
    const toggleEditModeAction = useAppStore((state) => state.toggleEditMode);

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
    const [soundEnabled, setSoundEnabled] = useState<boolean>(() => typeof window !== 'undefined' ? localStorage.getItem('dashboardSoundEnabled') === 'true' : false);
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
    const [isSldModalOpen, setIsSldModalOpen] = useState(false);

    const currentUserRole = currentUser?.role;
    const sldLayoutId = 'main_plant'; // Example SLD layout ID
    const allPossibleDataPoints = useMemo(() => allPossibleDataPointsConfig, []);

    useEffect(() => { // Auth check effect
        if (!storeHasHydrated) return;
        if (!currentUser || !currentUser.email || currentUser.email === 'guest@example.com') {
            toast.error("Authentication Required", { description: "Please log in to access this page." });
            router.replace('/login'); // Or your app's login route
        } else {
            setAuthCheckComplete(true);
        }
    }, [currentUser, router, storeHasHydrated, currentPath]);

    const getHardcodedDefaultDataPointIds = useCallback(() => {
        const criticalDefaultIds = ['grid-total-active-power-side-to-side', 'inverter-output-total-power', 'load-total-power', 'battery-capacity', 'battery-output-power', 'input-power-pv1'].filter(id => allPossibleDataPoints.some(dp => dp.id === id));
        if (criticalDefaultIds.length > 0) return criticalDefaultIds;
        return allPossibleDataPoints.slice(0, DEFAULT_DISPLAY_COUNT).map(dp => dp.id);
    }, [allPossibleDataPoints]);

    const getSmartDefaults = useDynamicDefaultDataPointIds(allPossibleDataPoints);
    const [displayedDataPointIds, setDisplayedDataPointIds] = useState<string[]>([]);

    useEffect(() => { // Load dashboard config from localStorage
        if (typeof window !== 'undefined' && allPossibleDataPoints.length > 0 && authCheckComplete) {
            const savedString = localStorage.getItem(USER_DASHBOARD_CONFIG_KEY);
            if (savedString) {
                try {
                    const parsedIds = JSON.parse(savedString) as string[];
                    const validSavedIds = parsedIds.filter(id => allPossibleDataPoints.some(dp => dp.id === id));
                    if (validSavedIds.length > 0) {
                        setDisplayedDataPointIds(validSavedIds);
                        return;
                    } else if (parsedIds.length > 0) { // Saved IDs existed but none were valid
                        localStorage.removeItem(USER_DASHBOARD_CONFIG_KEY); // Clear invalid stored data
                    }
                } catch (e) {
                    console.error("Error parsing saved dashboard configuration:", e);
                    localStorage.removeItem(USER_DASHBOARD_CONFIG_KEY);
                }
            }
            // If no valid saved config, set defaults
            const smartDefaultIds = getSmartDefaults();
            setDisplayedDataPointIds(smartDefaultIds.length > 0 ? smartDefaultIds : getHardcodedDefaultDataPointIds());
        }
    }, [allPossibleDataPoints, getSmartDefaults, getHardcodedDefaultDataPointIds, authCheckComplete]);

    useEffect(() => { // Save dashboard config to localStorage
        if (typeof window !== 'undefined' && authCheckComplete) {
            if (displayedDataPointIds.length > 0) {
                localStorage.setItem(USER_DASHBOARD_CONFIG_KEY, JSON.stringify(displayedDataPointIds));
            } else if (localStorage.getItem(USER_DASHBOARD_CONFIG_KEY)) { // If list becomes empty, save empty array
                localStorage.setItem(USER_DASHBOARD_CONFIG_KEY, JSON.stringify([]));
            }
        }
    }, [displayedDataPointIds, authCheckComplete]);

    useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('dashboardSoundEnabled', String(soundEnabled)); }, [soundEnabled]);

    const currentlyDisplayedDataPoints = useMemo(() => displayedDataPointIds.map(id => allPossibleDataPoints.find(dp => dp.id === id)).filter(Boolean) as DataPoint[], [displayedDataPointIds, allPossibleDataPoints]);

    const playNotificationSound = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
        if (!soundEnabled) return;
        const soundMap = { success: '/sounds/success.mp3', error: '/sounds/error.mp3', warning: '/sounds/warning.mp3', info: '/sounds/info.mp3' };
        const volumeMap = { success: 0.99, error: 0.6, warning: 0.5, info: 0.3 };
        if (typeof playSound === 'function') playSound(soundMap[type], volumeMap[type]); else console.warn("playSound utility not found.");
    }, [soundEnabled]);

    useEffect(() => { // Clock
        const updateClock = () => setCurrentTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: 'short', year: 'numeric' }));
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { // Lag Check & Redirection (from ControlPage, adapted)
        if (!authCheckComplete) return;
        const lagCheckInterval = setInterval(() => {
            const currentDelay = Date.now() - lastUpdateTime; setDelay(currentDelay);
            const reloadingFlag = 'reloadingDueToDelay', redirectingFlag = 'redirectingDueToExtremeDelay', opcuaRedirectedFlag = 'opcuaRedirected';

            if (typeof window !== 'undefined' && (sessionStorage.getItem(reloadingFlag) || sessionStorage.getItem(redirectingFlag) || sessionStorage.getItem(opcuaRedirectedFlag))) return;

            if (isConnected && currentDelay > 40000 && typeof window !== 'undefined') {
                console.error(`Extreme WS data lag (${(currentDelay / 1000).toFixed(1)}s). Redirecting.`);
                toast.error('Critical Lag Detected', { description: 'Redirecting for connection check...', duration: 5000 });
                playNotificationSound('error');
                sessionStorage.setItem(redirectingFlag, 'true');
                window.location.href = new URL('/api/opcua', window.location.origin).href; // Ensure this is the correct health check URL
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
                // opcuaRedirectedFlag is typically cleared on successful WS open or component mount.
            }
        }, 2000);
        return () => clearInterval(lagCheckInterval);
    }, [lastUpdateTime, isConnected, playNotificationSound, authCheckComplete]);

    const checkPlcConnection = useCallback(async () => { // PLC Status Check (from ControlPage)
        if (!authCheckComplete) return;
        try {
            const res = await fetch('/api/opcua/status'); // Ensure this endpoint is correct
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json();
            const newStatus = data.connectionStatus;
            if (newStatus && ['online', 'offline', 'disconnected'].includes(newStatus)) {
                setPlcStatus(newStatus);
            } else {
                console.error("Invalid PLC status:", data);
                if (plcStatus !== 'disconnected') setPlcStatus('disconnected');
            }
        } catch (err) {
            console.warn("Failed to check PLC status:", err);
            if (plcStatus !== 'disconnected') setPlcStatus('disconnected');
        }
    }, [plcStatus, authCheckComplete]);
    useEffect(() => { if (!authCheckComplete) return () => {}; checkPlcConnection(); const plcInterval = setInterval(checkPlcConnection, 10000); return () => clearInterval(plcInterval); }, [checkPlcConnection, authCheckComplete]);

    const connectWebSocket = useCallback(() => { // WebSocket Connection (merged logic)
        if (!authCheckComplete) return;
        const opcuaRedirectedFlag = 'opcuaRedirected', reloadingFlag = 'reloadingDueToDelay', redirectingFlag = 'redirectingDueToExtremeDelay';

        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;
        if (typeof window !== 'undefined' && (sessionStorage.getItem(opcuaRedirectedFlag) || sessionStorage.getItem(reloadingFlag) || sessionStorage.getItem(redirectingFlag))) {
             console.log("Session storage indicates a recovery is in progress. Aborting WS connect attempt.");
             return;
        }

        setIsConnected(false);
        const delayMs = Math.min(1000 + 2000 * Math.pow(1.5, reconnectAttempts.current), 60000);
        if (reconnectInterval.current) clearTimeout(reconnectInterval.current);

        reconnectInterval.current = setTimeout(() => {
            if (typeof window === 'undefined') return;
            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = () => {
                console.log("WS Connected");
                setIsConnected(true);
                setNodeValues({}); // Clear stale data
                setLastUpdateTime(Date.now());
                reconnectAttempts.current = 0;
                if (reconnectInterval.current) { clearTimeout(reconnectInterval.current); reconnectInterval.current = null; }
                toast.success('WebSocket Connected', { description: 'Successfully connected to the backend.', duration: 3000 });
                playNotificationSound('success');
                if (typeof window !== 'undefined') { [opcuaRedirectedFlag, reloadingFlag, redirectingFlag].forEach(flag => sessionStorage.removeItem(flag)); }
            };

            ws.current.onmessage = (event) => {
                try {
                    const receivedData = JSON.parse(event.data as string);
                    if (typeof receivedData === 'object' && receivedData !== null) {
                        setNodeValues(prev => ({ ...prev, ...receivedData }));
                        setLastUpdateTime(Date.now());
                    } else console.warn("Received non-object data on WS:", receivedData);
                } catch (e) {
                    console.error("WS parse error:", e, "Data:", event.data);
                    toast.error('Data Error', { description: 'Received invalid data format.' });
                    playNotificationSound('error');
                }
            };

            ws.current.onerror = (event) => {
                console.error("WebSocket error event:", event);
                // Redirect logic from ControlPage
                if (typeof window !== 'undefined' && !sessionStorage.getItem(opcuaRedirectedFlag)) {
                    toast.error('Connection Error', { description: 'Redirecting for status check.' });
                    playNotificationSound('error');
                    sessionStorage.setItem(opcuaRedirectedFlag, 'true');
                    window.location.href = new URL('/api/opcua', window.location.origin).href;
                } else {
                    if (ws.current) ws.current.close(ws.current.readyState === WebSocket.OPEN ? 1011 : undefined);
                }
            };

            ws.current.onclose = (event) => {
                console.log(`WS disconnected. Code: ${event.code}, Reason: ${event.reason || 'N/A'}, Clean: ${event.wasClean}`);
                setIsConnected(false);
                setNodeValues({});
                if (typeof window !== 'undefined' && (sessionStorage.getItem(opcuaRedirectedFlag) || sessionStorage.getItem(reloadingFlag) || sessionStorage.getItem(redirectingFlag))) return;

                if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    connectWebSocket();
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    toast.error('Connection Failed', { description: 'Max reconnect attempts reached.' });
                    playNotificationSound('error');
                }
                // else if (event.code === 1000) { /* Optional: toast.info('Disconnected cleanly') */ }
            };
        }, delayMs);
    }, [playNotificationSound, authCheckComplete, WS_URL, maxReconnectAttempts]); // Added dependencies

    useEffect(() => { // Initial WS connect & cleanup (from ControlPage, adapted)
        if (!authCheckComplete) return () => {}; // Wait for auth check
        if (typeof window === 'undefined') return;

        ['opcuaRedirected', 'reloadingDueToDelay', 'redirectingDueToExtremeDelay'].forEach(flag => sessionStorage.removeItem(flag));
        reconnectAttempts.current = 0;
        connectWebSocket();

        return () => {
            if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
            if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
                ws.current.onopen = null; ws.current.onmessage = null; ws.current.onerror = null; ws.current.onclose = null;
                ws.current.close(1000, 'Component Unmounted');
                ws.current = null;
            }
        };
    }, [connectWebSocket, authCheckComplete]); // Added authCheckComplete

    // --- Data Processing & Layout (from ControlPage) ---
    const { threePhaseGroups, individualPoints } = useMemo(() => groupDataPoints(currentlyDisplayedDataPoints), [currentlyDisplayedDataPoints]);
    const controlItems = useMemo(() => individualPoints.filter(p => p.uiType === 'button' || p.uiType === 'switch'), [individualPoints]);
    const statusDisplayItems = useMemo(() => individualPoints.filter(p => p.category === 'status' && p.uiType === 'display'), [individualPoints]);
    const gaugeItems = useMemo(() => individualPoints.filter(p => p.uiType === 'gauge'), [individualPoints]);
    const otherDisplayItems = useMemo(() => individualPoints.filter(p => p.uiType === 'display' && p.category !== 'status'), [individualPoints]);

    const topSections = useMemo<SectionToRender[]>(() => {
        const sections: SectionToRender[] = []; const commonGridCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
        const shouldBreakoutControls = controlItems.length > CONTROLS_AND_STATUS_BREAKOUT_THRESHOLD;
        const shouldBreakoutStatus = statusDisplayItems.length > CONTROLS_AND_STATUS_BREAKOUT_THRESHOLD;
        if (shouldBreakoutControls || shouldBreakoutStatus) {
            if (statusDisplayItems.length > 0) sections.push({ title: "Status Readings", items: statusDisplayItems, gridCols: commonGridCols });
            if (controlItems.length > 0) sections.push({ title: "Controls", items: controlItems, gridCols: commonGridCols });
        } else {
            const combinedItems = [...statusDisplayItems, ...controlItems];
            if (combinedItems.length > 0) sections.push({ title: "Controls & Status", items: combinedItems, gridCols: commonGridCols });
        }
        return sections;
    }, [controlItems, statusDisplayItems]);

    const gaugesOverviewSectionDefinition = useMemo<SectionToRender | null>(() => {
        if (gaugeItems.length > 0) return { title: "Gauges & Overview", items: gaugeItems, gridCols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' };
        return null;
    }, [gaugeItems]);

    const bottomReadingsSections = useMemo<SectionToRender[]>(() => {
        if (otherDisplayItems.length === 0) return [];
        const commonGridCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'; const sections: SectionToRender[] = [];
        const displayByCategory = otherDisplayItems.reduce((acc, point) => {
            const categoryKey = point.category || 'miscellaneous'; if (!acc[categoryKey]) acc[categoryKey] = []; acc[categoryKey].push(point); return acc;
        }, {} as Record<string, DataPoint[]>);
        const generalOtherReadingsPool: DataPoint[] = [];
        Object.entries(displayByCategory).sort(([catA], [catB]) => catA.localeCompare(catB)).forEach(([category, points]) => {
            if (points.length > OTHER_READINGS_CATEGORY_BREAKOUT_THRESHOLD) sections.push({ title: `${category.charAt(0).toUpperCase() + category.slice(1)} Readings`, items: points, gridCols: commonGridCols });
            else generalOtherReadingsPool.push(...points);
        });
        if (generalOtherReadingsPool.length > 0) {
            const otherReadingsSection: SectionToRender = { title: "Other Readings", items: generalOtherReadingsPool, gridCols: commonGridCols };
            if (sections.some(s => s.title !== "Other Readings")) sections.push(otherReadingsSection); else sections.unshift(otherReadingsSection);
        }
        return sections.filter(section => section.items.length > 0);
    }, [otherDisplayItems]);

    const cardHoverEffect = useMemo(() => (resolvedTheme === 'dark' ? { y: -4, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.15), 0 5px 8px -5px rgba(0,0,0,0.2)", transition: { type: 'spring', stiffness: 350, damping: 20 } } : { y: -4, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.08), 0 5px 8px -5px rgba(0,0,0,0.08)", transition: { type: 'spring', stiffness: 350, damping: 20 } }), [resolvedTheme]);

    // --- Dashboard Modification Handlers (from ControlPage) ---
    const handleResetToDefault = useCallback(() => {
        if (currentUserRole !== UserRole.ADMIN) return;
        const smartDefaultIds = getSmartDefaults();
        setDisplayedDataPointIds(smartDefaultIds.length > 0 ? smartDefaultIds : getHardcodedDefaultDataPointIds());
        toast.info("Dashboard reset to default layout.");
    }, [getSmartDefaults, getHardcodedDefaultDataPointIds, currentUserRole]);

    const handleRemoveAllItems = useCallback(() => {
        if (currentUserRole !== UserRole.ADMIN) return;
        setDisplayedDataPointIds([]);
        toast.info("All data points removed from layout.");
    }, [currentUserRole]);

    const sendDataToWebSocket = useCallback((nodeId: string, value: boolean | number | string) => { // Enhanced from ControlPage
        if (currentUserRole === UserRole.VIEWER) { toast.warning("Action Restricted", { description: "Viewers cannot send commands." }); playNotificationSound('warning'); return; }
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                const pointConfig = allPossibleDataPoints.find(p => p.nodeId === nodeId); let v = value;
                if (pointConfig?.dataType.includes('Int')) { if (typeof value === 'boolean') v = value ? 1 : 0; else if (typeof value === 'string') v = parseInt(value, 10); if(typeof v === 'number' && isNaN(v)) {toast.error('Send Error', {description: 'Invalid integer value.'}); return;}}
                else if (pointConfig?.dataType === 'Boolean') { if (typeof value === 'number') v = value !== 0; else if (typeof value === 'string') v = value.toLowerCase() === 'true' || value === '1'; }
                else if (pointConfig?.dataType === 'Float' || pointConfig?.dataType === 'Double') { if (typeof value === 'string') v = parseFloat(value); if(typeof v === 'number' && isNaN(v)) {toast.error('Send Error', {description: 'Invalid number value.'}); return;}}
                if (typeof v === 'number' && !isFinite(v)) { toast.error('Send Error', { description: 'Invalid number value (Infinite or NaN).' }); playNotificationSound('error'); return; }
                const payload = JSON.stringify({ [nodeId]: v });
                ws.current.send(payload);
                toast.info('Command Sent', { description: `${pointConfig?.name || nodeId} = ${String(v)}` });
                playNotificationSound('info');
            } catch (e) { console.error("WS send error:", e); toast.error('Send Error', { description: 'Failed to send command.' }); playNotificationSound('error'); }
        } else { toast.error('Connection Error', { description: 'Cannot send. WebSocket disconnected.' }); playNotificationSound('error'); if (!isConnected) connectWebSocket(); }
    }, [isConnected, connectWebSocket, allPossibleDataPoints, playNotificationSound, currentUserRole]);

    const handleAddMultipleDataPoints = useCallback((selectedIds: string[]) => {
        if (currentUserRole !== UserRole.ADMIN) return;
        const currentDisplayedSet = new Set(displayedDataPointIds);
        const trulyNewIds = selectedIds.filter(id => !currentDisplayedSet.has(id));
        if (trulyNewIds.length === 0 && selectedIds.length > 0) { toast.warning("Selected items are already displayed or no new points chosen."); return; }
        if (trulyNewIds.length > 0) { setDisplayedDataPointIds(prevIds => Array.from(new Set([...prevIds, ...trulyNewIds]))); toast.success(`${trulyNewIds.length} new data point${trulyNewIds.length > 1 ? 's' : ''} added.`); }
        setIsConfiguratorOpen(false);
    }, [displayedDataPointIds, currentUserRole]);

    const handleRemoveItem = useCallback((dataPointIdToRemove: string) => {
        if (currentUserRole !== UserRole.ADMIN) return;
        const pointToRemove = allPossibleDataPoints.find(dp => dp.id === dataPointIdToRemove);
        if (pointToRemove?.threePhaseGroup) {
            const groupIdsToRemove = allPossibleDataPoints.filter(dp => dp.threePhaseGroup === pointToRemove.threePhaseGroup).map(dp => dp.id);
            setDisplayedDataPointIds(prevIds => prevIds.filter(id => !groupIdsToRemove.includes(id)));
            toast.info(`${pointToRemove.threePhaseGroup} group removed.`);
        } else {
            setDisplayedDataPointIds(prevIds => prevIds.filter(id => id !== dataPointIdToRemove));
            toast.info("Data point removed.");
        }
    }, [allPossibleDataPoints, currentUserRole]);

    const { threePhaseGroupsForConfig, individualPointsForConfig } = useMemo(() => { // For Configurator (from ControlPage)
        const groups: Record<string, ConfiguratorThreePhaseGroup> = {}; const individuals: DataPoint[] = [];
        const currentDisplayedSet = new Set(displayedDataPointIds);
        allPossibleDataPoints.forEach(dp => {
            if (dp.threePhaseGroup && dp.phase && ['a', 'b', 'c', 'x', 'total'].includes(dp.phase)) {
                if (!groups[dp.threePhaseGroup]) { let repName = dp.name.replace(/ (L[123]|Phase [ABCX]\b|Total\b)/ig, '').trim().replace(/ \([ABCX]\)$/i, '').trim(); groups[dp.threePhaseGroup] = { name: dp.threePhaseGroup, representativeName: repName || dp.threePhaseGroup, ids: [], category: dp.category }; }
                groups[dp.threePhaseGroup].ids.push(dp.id);
            } else if (!dp.threePhaseGroup) { individuals.push(dp); }
        });
        const allGroupIdsAsArray = Array.from(new Set(Object.values(groups).flatMap(g => g.ids)));
        const trulyIndividualPoints = individuals.filter(ind => !allGroupIdsAsArray.includes(ind.id));
        const currentDisplayedArray = Array.from(currentDisplayedSet);
        return {
            threePhaseGroupsForConfig: Object.values(groups).filter(g => g.ids.some(id => !currentDisplayedArray.includes(id))).sort((a, b) => a.representativeName.localeCompare(b.representativeName)),
            individualPointsForConfig: trulyIndividualPoints.filter(dp => !currentDisplayedArray.includes(dp.id)).sort((a, b) => a.name.localeCompare(b.name))
        };
    }, [allPossibleDataPoints, displayedDataPointIds]);

    // SLD & Graph specific states and calcs (from ControlPage)
    const sldSpecificEditMode = isGlobalEditMode && currentUserRole === UserRole.ADMIN;
    const sldSectionMinHeight = "400px";
    const sldHeaderButtonHeight = sldSpecificEditMode ? '2.75rem' : '0rem'; // Assuming sld-edit mode might affect this
    const sldInternalMaxHeight = `calc(${sldSectionMinHeight} - 2.5rem - ${sldHeaderButtonHeight})`;

    const [graphGenerationNodes, setGraphGenerationNodes] = useState<string[]>(['inverter-output-total-power']);
    const [graphUsageNodes, setGraphUsageNodes] = useState<string[]>(['grid-total-active-power-side-to-side']);
    const [graphTimeScale, setGraphTimeScale] = useState<TimeScale>('day');


    const commonRenderingProps = {
        isEditMode: isGlobalEditMode && currentUserRole === UserRole.ADMIN,
        nodeValues,
        isConnected,
        currentHoverEffect: cardHoverEffect,
        sendDataToWebSocket,
        playNotificationSound,
        lastToastTimestamps,
        onRemoveItem: handleRemoveItem,
        allPossibleDataPoints,
        containerVariants, // Ensure this is defined or imported
        currentUserRole,
    };
    const hasAnyDynamicCardContent = topSections.length > 0 || !!gaugesOverviewSectionDefinition || bottomReadingsSections.length > 0;


    if (!storeHasHydrated || !authCheckComplete) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-lg">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="bg-background text-foreground px-3 sm:px-4 md:px-6 lg:px-8 transition-colors duration-300 pb-8">
            <div className="max-w-screen-3xl mx-auto">
                <DashboardHeaderControl
                    plcStatus={plcStatus} isConnected={isConnected} connectWebSocket={connectWebSocket}
                    soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} currentTime={currentTime} delay={delay}
                    version={VERSION}
                    isEditMode={isGlobalEditMode}
                    toggleEditMode={toggleEditModeAction}
                    currentUserRole={currentUserRole}
                    onOpenConfigurator={() => { if (currentUserRole === UserRole.ADMIN) setIsConfiguratorOpen(true); else toast.warning("Access Denied", { description: "Only administrators can add cards." }); }}
                    onRemoveAll={handleRemoveAllItems} onResetToDefault={handleResetToDefault} />

                {topSections.length > 0 && ( <RenderingComponent sections={topSections} {...commonRenderingProps} /> )}

                {/* SLD and Three-Phase Section from ControlPage */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
                    <Card className={`lg:col-span-2 shadow-lg`} style={{ minHeight: sldSectionMinHeight }}>
                        <CardContent className="p-4 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xl font-semibold">Plant Layout View : {sldLayoutId}</h3>
                                <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => setIsSldModalOpen(true)} title="Open SLD in larger view">
                                                <Maximize2 className="h-5 w-5" />
                                                <span className="sr-only">Open SLD in larger view</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Open SLD in larger view</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <div style={{ height: sldInternalMaxHeight }} className="overflow-hidden rounded-md border flex-grow">
                                <SLDWidget
                                    layoutId={sldLayoutId}
                                    isEditMode={sldSpecificEditMode} // SLD edit mode might be different
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className={`shadow-lg`} style={{ minHeight: sldSectionMinHeight }}>
                        <CardContent className="p-4 h-full flex flex-col">
                            <h3 className="text-xl font-semibold mb-3">Three-Phase Elements</h3>
                            <div className="overflow-y-auto flex-grow" style={{ maxHeight: `calc(${sldSectionMinHeight} - 2.5rem)` }}>
                                {threePhaseGroups.length > 0 ? (
                                    <DashboardSection title="" gridCols="grid-cols-1 gap-y-3" items={threePhaseGroups}
                                        isDisabled={!isConnected} // Pass common props
                                        {...commonRenderingProps}
                                    />
                                ) : ( <p className="text-muted-foreground italic text-sm pt-2"> {displayedDataPointIds.length > 0 ? "No three-phase groups among displayed items." : "Add data points to see three-phase elements."} </p> )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* PowerTimelineGraph Section from ControlPage */}
                <Card className="shadow-lg my-6">
                     <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-3">
                            <h3 className="text-xl font-semibold">Timeline Graph</h3>
                            <div className="flex space-x-1 mt-2 sm:mt-0 flex-wrap justify-center">
                                {(['1m', '5m', '30m', '1h', '6h', 'day'] as TimeScale[]).map((ts) => (
                                    <Button key={ts} variant={graphTimeScale === ts ? "default" : "outline"} size="sm" onClick={() => setGraphTimeScale(ts)} className="text-xs px-2 py-1 h-auto"> {ts.toUpperCase()} </Button>
                                ))}
                            </div>
                        </div>
                        {(graphGenerationNodes.length > 0 || graphUsageNodes.length > 0) ? ( // Check if either has nodes
                             <PowerTimelineGraph nodeValues={nodeValues} generationNodes={graphGenerationNodes} usageNodes={graphUsageNodes} timeScale={graphTimeScale} allPossibleDataPoints={allPossibleDataPoints} isLive={isConnected && plcStatus === 'online'} />
                        ) : (
                             <div className="flex items-center justify-center h-[300px] text-muted-foreground"> <p>Timeline graph not configured. {(isGlobalEditMode && currentUserRole === UserRole.ADMIN) ? "Select data points in the configurator." : (currentUserRole === UserRole.ADMIN ? "Enable Edit Mode to configure." : "Contact an administrator.")}</p> </div>
                        )}
                    </CardContent>
                </Card>

                {gaugesOverviewSectionDefinition && ( <RenderingComponent sections={[gaugesOverviewSectionDefinition]} {...commonRenderingProps} /> )}
                {bottomReadingsSections.length > 0 && ( <RenderingComponent sections={bottomReadingsSections} {...commonRenderingProps} /> )}

                {/* Empty state messages from ControlPage */}
                {!hasAnyDynamicCardContent && currentlyDisplayedDataPoints.length > 0 && ( <div className="text-center py-16 text-muted-foreground min-h-[100px] flex flex-col items-center justify-center"> <InfoIconLucide className="w-12 h-12 mb-4 text-gray-400" /><h3 className="text-xl font-semibold mb-2">No items match current section filters.</h3> <p>Selected data points might not fit into the configured dynamic sections.</p> {(isGlobalEditMode && currentUserRole === UserRole.ADMIN) && <p className="mt-2">Try adding or changing data point types/categories.</p>} </div> )}
                {!hasAnyDynamicCardContent && currentlyDisplayedDataPoints.length === 0 && ( <RenderingComponent sections={[]} {...commonRenderingProps} /> )}

            </div>

            {/* Configurator Modal from ControlPage */}
            {(isConfiguratorOpen && currentUserRole === UserRole.ADMIN) && (
                <DashboardItemConfigurator
                    isOpen={isConfiguratorOpen}
                    onClose={() => setIsConfiguratorOpen(false)}
                    availableIndividualPoints={individualPointsForConfig}
                    availableThreePhaseGroups={threePhaseGroupsForConfig}
                    currentDisplayedIds={displayedDataPointIds}
                    onAddMultipleDataPoints={handleAddMultipleDataPoints} />
            )}

            {/* SLD Modal from ControlPage */}
            <Dialog open={isSldModalOpen} onOpenChange={setIsSldModalOpen}>
                <DialogContent className="sm:max-w-[90vw] w-[95vw] h-[90vh] p-0 flex flex-col dark:bg-background bg-background border dark:border-slate-800">
                    <DialogHeader className="p-4 border-b dark:border-slate-700 flex flex-row justify-between items-center sticky top-0 bg-inherit z-10">
                        <DialogTitle>Plant Layout View - {sldLayoutId}</DialogTitle>
                         <DialogClose asChild>
                             <Button variant="ghost" size="icon" className="rounded-full">
                                <X className="h-5 w-5" /><span className="sr-only">Close</span>
                            </Button>
                        </DialogClose>
                    </DialogHeader>
                    <div className="flex-grow p-2 sm:p-4 overflow-hidden">
                        <SLDWidget layoutId={sldLayoutId} isEditMode={false} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
Dashboard.displayName = 'Dashboard';
export default Dashboard;