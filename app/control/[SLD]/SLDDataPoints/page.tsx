// src/app/page.tsx (or your main dashboard page component)
'use client';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { dataPoints as configuredDataPoints, DataPoint as DataPointConfig } from '@/config/dataPoints';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { WS_URL, VERSION } from '@/config/constants'; // Adjust path if needed
import { playSound } from '@/lib/utils'; // Adjust path for sound utility
import {
    Activity, AudioWaveform, Battery, Zap, Gauge, Sun, Moon, AlertCircle, Power, Sigma, Thermometer,
    Wind, Droplets, Info, Settings, Minimize2, Maximize2, FileOutput, Waypoints, SigmaSquare, Lightbulb,
    HelpCircle, Clock, Percent, ToggleLeft, ToggleRight, Waves, DivideIcon as LucideIcon,
    Volume2, VolumeX,
    CheckCircle,
    XCircle,
    AlertTriangleIcon,
    InfoIcon,
    BellOff,
    Bell
} from 'lucide-react';
import { useRouter } from 'next/navigation'; // Although not used for redirection here, keep if used elsewhere

// --- Interfaces --- (Keep unchanged)
interface NodeData {
    [nodeId: string]: string | number | boolean | null | 'Error';
}
interface ThreePhaseGroupInfo {
    groupKey: string;
    title: string;
    points: {
        a?: DataPointConfig;
        b?: DataPointConfig;
        c?: DataPointConfig;
    };
    icon: typeof LucideIcon;
    unit?: string;
    description?: string;
    uiType: 'display' | 'gauge';
    config: DataPointConfig;
}

// --- Helper Components --- (Keep unchanged)
const PlcConnectionStatus = ({ status }: { status: 'online' | 'offline' | 'disconnected' }) => {
    let statusText = '';
    let dotClass = '';
    let title = `PLC Status: ${status}`;
    let clickHandler = () => { };

    switch (status) {
        case 'online': statusText = 'PLC: Online (Remote)'; dotClass = 'bg-blue-500 ring-2 ring-blue-500/30 animate-pulse'; title = 'PLC connected remotely via API'; break;
        case 'offline': statusText = 'PLC: Online (Local)'; dotClass = 'bg-sky-400 ring-2 ring-sky-400/30 animate-pulse'; title = 'PLC connected locally (Direct?)'; break;
        case 'disconnected': default: statusText = 'PLC: Disconnected'; dotClass = 'bg-gray-400 dark:bg-gray-600'; title = 'PLC Disconnected. Click to refresh page.'; clickHandler = () => { if (typeof window !== 'undefined') window.location.reload(); }; break;
    }
    const dotVariants = { initial: { scale: 0 }, animate: { scale: 1 } };

    return (
        <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {/* Ensure motion.div is the SINGLE child */}
                        <motion.div className={`w-3 h-3 rounded-full ${dotClass} ${status === 'disconnected' ? 'cursor-pointer hover:opacity-80' : ''} flex-shrink-0`}
                            variants={dotVariants} initial="initial" animate={"animate"} onClick={clickHandler} whileHover={status === 'disconnected' ? { scale: 1.2 } : {}} />
                    </TooltipTrigger>
                    <TooltipContent><p>{title}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <span className="text-xs sm:text-sm text-muted-foreground">{statusText}</span>
        </motion.div>
    );
};

interface WebSocketStatusProps { isConnected: boolean; connectFn: () => void; }
const WebSocketStatus = ({ isConnected, connectFn }: WebSocketStatusProps) => {
    const title = isConnected ? "WebSocket Connected (Live Data)" : "WebSocket Disconnected. Click to attempt reconnect.";
    const pulseVariants = { pulse: { scale: [1, 1.15, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } };
    return (
        <motion.div className="flex items-center gap-2 cursor-pointer" onClick={connectFn} title={title} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <motion.div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 ring-2 ring-green-500/30' : 'bg-red-500 ring-2 ring-red-500/30'} flex-shrink-0`} variants={pulseVariants} animate={isConnected ? "pulse" : {}} />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground"> WS: {isConnected ? 'Live' : 'Offline'} </span>
        </motion.div>
    );
};

const ThemeToggle = () => {
    const { resolvedTheme, setTheme } = useTheme();
    const Icon = resolvedTheme === 'dark' ? Sun : Moon;
    const title = `Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`;
    return (
        <TooltipProvider delayDuration={100}><Tooltip>
            <TooltipTrigger asChild>
                {/* Button with asChild forwarding to motion.button */}
                <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label={title} asChild >
                    <motion.button className="text-muted-foreground hover:text-foreground transition-colors" whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }} >
                        <Icon className="w-5 h-5" />
                    </motion.button>
                </Button>
            </TooltipTrigger><TooltipContent><p>{title}</p></TooltipContent>
        </Tooltip></TooltipProvider>
    );
};

// --- Motion Variants --- (Keep unchanged)
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 10, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 150, damping: 18 } } };
const cardHoverEffect = { y: -4, boxShadow: "0 8px 20px -4px rgba(0, 0, 0, 0.08), 0 5px 8px -5px rgba(0, 0, 0, 0.08)", transition: { type: 'spring', stiffness: 350, damping: 20 } };
const darkCardHoverEffect = { y: -4, boxShadow: "0 8px 20px -4px rgba(0, 0, 0, 0.15), 0 5px 8px -5px rgba(0, 0, 0, 0.2)", transition: { type: 'spring', stiffness: 350, damping: 20 } };


// --- Main Dashboard Component ---
const ControlPanel = () => {
    // const { resolvedTheme } = useTheme();
    // const [nodeValues, setNodeValues] = useState<NodeData>({});
    // const [isConnected, setIsConnected] = useState(false);
    // const [plcStatus, setPlcStatus] = useState<'online' | 'offline' | 'disconnected'>('disconnected');
    // const [currentTime, setCurrentTime] = useState<string>('');
    // const ws = useRef<WebSocket | null>(null);
    // const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
    // const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
    // const [delay, setDelay] = useState<number>(0); // State to hold current delay in ms
    // const reconnectAttempts = useRef(0);
    // const maxReconnectAttempts = 10;
    // const lastToastTimestamps = useRef<Record<string, number>>({});
    // // const router = useRouter(); // Keep if used elsewhere, not needed for window.location

    // // --- Sound State & Toggle ---
    // const [soundEnabled, setSoundEnabled] = useState(() => {
    //     if (typeof window !== 'undefined') { return localStorage.getItem('dashboardSoundEnabled') === 'true'; } return false;
    // });
    // useEffect(() => { if (typeof window !== 'undefined') { localStorage.setItem('dashboardSoundEnabled', String(soundEnabled)); } }, [soundEnabled]);
    // const SoundToggle = () => (
    //     <TooltipProvider delayDuration={100}>
    //     <Tooltip>
    //       <TooltipTrigger asChild>
    //         <Button
    //           variant="ghost"
    //           size="icon"
    //           onClick={() => setSoundEnabled(!soundEnabled)}
    //           aria-label={soundEnabled ? 'Mute Notifications' : 'Unmute Notifications'}
    //           asChild
    //         >
    //           <motion.button
    //             className={`transition-colors rounded-full ${
    //               soundEnabled
    //                 ? 'text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200'
    //                 : 'text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200'
    //             }`}
    //             whileHover={{ scale: 1.1, rotate: 10 }}
    //             whileTap={{ scale: 0.9 }}
    //           >
    //             {!soundEnabled ? (
    //               <BellOff className="w-5 h-5" />
    //             ) : (
    //               <Bell className="w-5 h-5" />
    //             )}
    //           </motion.button>
    //         </Button>
    //       </TooltipTrigger>
    //       <TooltipContent>
    //         <p>
    //           {/* Corrected Tooltip Content */}
    //           {soundEnabled ? 'Unmute Notifications' : 'Mute Notifications'}
    //         </p>
    //       </TooltipContent>
    //     </Tooltip>
    //   </TooltipProvider>
    // );
    // const playNotificationSound = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
    //     if (!soundEnabled) return; const soundMap = { success: '/sounds/success.mp3', error: '/sounds/error.mp3', warning: '/sounds/warning.mp3', info: '/sounds/info.mp3' }; const volumeMap = { success: 0.99, error: 0.6, warning: 0.5, info: 0.3 }; playSound(soundMap[type], volumeMap[type]);
    // }, [soundEnabled]);

    // // --- Core Hooks ---
    // useEffect(() => { // Clock
    //     const updateClock = () => setCurrentTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: 'short', year: 'numeric' })); updateClock(); const interval = setInterval(updateClock, 1000); return () => clearInterval(interval);
    // }, []);

    // // --- MODIFIED: Lag Check & Redirection ---
    // useEffect(() => { // Lag Check
    //     const interval = setInterval(() => {
    //         const currentDelay = Date.now() - lastUpdateTime;
    //         setDelay(currentDelay); // Update state for display

    //         const reloadingFlag = 'reloadingDueToDelay';
    //         const redirectingFlag = 'redirectingDueToExtremeDelay';

    //         // --- Check for > 40s lag for REDIRECT ---
    //         if (isConnected && currentDelay > 40000 && typeof window !== 'undefined' && sessionStorage.getItem(redirectingFlag) !== 'true') {
    //             console.error(`Extreme WS data lag (${(currentDelay / 1000).toFixed(1)}s) > 40s. Redirecting to API endpoint.`);
    //             toast.error('Critical Lag Detected', { description: 'Redirecting to API page for connection check...', duration: 5000 });
    //             playNotificationSound('error');
    //             sessionStorage.setItem(redirectingFlag, 'true'); // Set flag before redirecting
    //             const apiUrl = new URL('/api/opcua', window.location.origin);
    //             window.location.href = apiUrl.href; // Perform redirect
    //             return; // Stop further checks in this interval iteration after triggering redirect
    //         }

    //         // --- Check for > 30s lag for RELOAD --- (Only if not already redirecting)
    //         else if (isConnected && currentDelay > 30000 && typeof window !== 'undefined' && sessionStorage.getItem(reloadingFlag) !== 'true') {
    //             console.warn(`WS data lag (${(currentDelay / 1000).toFixed(1)}s) exceeded 30s threshold. Reloading.`);
    //             // Changed to warning as 40s is now the critical error
    //             toast.warning('Stale Data Detected', { description: 'Refreshing connection...', duration: 5000 });
    //             playNotificationSound('warning'); // Use warning sound
    //             sessionStorage.setItem(reloadingFlag, 'true'); // Set flag before reload timeout
    //             setTimeout(() => window.location.reload(), 1500);
    //         }

    //         // --- Reset flags if delay is back below 30s ---
    //         else if (currentDelay < 30000 && typeof window !== 'undefined') {
    //             // Only remove flags if they exist, slight optimization
    //             if (sessionStorage.getItem(reloadingFlag)) {
    //                 sessionStorage.removeItem(reloadingFlag);
    //             }
    //             if (sessionStorage.getItem(redirectingFlag)) {
    //                 sessionStorage.removeItem(redirectingFlag);
    //             }
    //         }
    //     }, 2000); // Checks every 2 seconds

    //     return () => clearInterval(interval);
    // }, [lastUpdateTime, isConnected, playNotificationSound]); // Dependencies are correct

    // const checkPlcConnection = useCallback(async () => { // PLC Status Check
    //     try { const res = await fetch('/api/opcua/status'); if (!res.ok) throw new Error(`API Error: ${res.status}`); const data = await res.json(); const newStatus = data.connectionStatus; if (newStatus && ['online', 'offline', 'disconnected'].includes(newStatus)) { setPlcStatus(newStatus); } else { console.error("Invalid PLC status:", data); if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); } } catch (err: any) { if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); }
    // }, [plcStatus]);
    // useEffect(() => { checkPlcConnection(); const interval = setInterval(checkPlcConnection, 10000); return () => clearInterval(interval); }, [checkPlcConnection]);

    // const connectWebSocket = useCallback(() => { // WebSocket Connection (Keep unchanged)
    //     if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return; if (typeof window !== 'undefined' && (sessionStorage.getItem('reloadingDueToDelay') === 'true' || sessionStorage.getItem('redirectingDueToExtremeDelay') === 'true')) { setTimeout(() => { sessionStorage.removeItem('reloadingDueToDelay'); sessionStorage.removeItem('redirectingDueToExtremeDelay'); }, 3000); return; } setIsConnected(false); const delayMs = Math.min(1000 + 2000 * Math.pow(1.6, reconnectAttempts.current), 60000); console.log(`Attempting WS connect (Attempt ${reconnectAttempts.current + 1}) in ${(delayMs / 1000).toFixed(1)}s...`); if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
    //     reconnectInterval.current = setTimeout(() => {
    //         ws.current = new WebSocket(WS_URL); ws.current.onopen = () => { console.log("WS Connected"); setIsConnected(true); setLastUpdateTime(Date.now()); reconnectAttempts.current = 0; if (reconnectInterval.current) { clearTimeout(reconnectInterval.current); reconnectInterval.current = null; } toast.success('Connection Established', { description: 'Live data feed active.', duration: 3000 }); playNotificationSound('success'); if (typeof window !== 'undefined') sessionStorage.removeItem('opcuaRedirected'); }; ws.current.onmessage = (event) => { try { const receivedData = JSON.parse(event.data as string); setNodeValues(prev => ({ ...prev, ...receivedData })); setLastUpdateTime(Date.now()); } catch (e) { console.error("WS parse error:", e, "Data:", event.data); toast.error('Data Error', { description: 'Received invalid data format.', duration: 4000 }); playNotificationSound('error'); } }; ws.current.onerror = (event) => {
    //             console.error("WebSocket error event:", event);
    //             toast.error('WebSocket Error', { description: 'Connection error occurred. Attempting recovery...', duration: 5000 });
    //             playNotificationSound('error');

    //             // --- START: Redirection Logic (Keep unchanged) ---
    //             if (typeof window !== 'undefined') {
    //                 const redir = sessionStorage.getItem('opcuaRedirected');
    //                 if (!redir || redir === 'false') {
    //                     console.warn("WebSocket connection error, redirecting to API endpoint for potential authentication/setup...");
    //                     // Construct the URL relative to the current origin
    //                     const apiUrl = new URL('/api/opcua', window.location.origin);
    //                     console.log("Redirecting to:", apiUrl.href);
    //                     sessionStorage.setItem('opcuaRedirected', 'true'); // Set flag BEFORE redirecting
    //                     window.location.href = apiUrl.href; // Perform the redirect
    //                 } else {
    //                     console.warn("WebSocket error occurred, but redirection already attempted. Manual intervention may be required.");
    //                 }
    //             }
    //             // Ensure the socket is closed to allow the onclose handler to potentially trigger reconnects
    //             if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
    //                 ws.current.close();
    //             }
    //         }; ws.current.onclose = (event) => { console.log(`WS disconnected. Code: ${event.code}, Clean: ${event.wasClean}`); setIsConnected(false); ws.current = null; if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) { reconnectAttempts.current++; connectWebSocket(); } else if (reconnectAttempts.current >= maxReconnectAttempts) { console.warn("Max WS reconnect attempts reached."); toast.error('Connection Failed', { description: 'Max reconnect attempts reached.', duration: 10000 }); playNotificationSound('error'); } else { console.log("WS closed cleanly or max attempts reached."); } };
    //     }, delayMs);
    // }, [playNotificationSound]);

    // useEffect(() => { // Initial WS connect & cleanup (Keep unchanged)
    //     if (typeof window === 'undefined') return; connectWebSocket(); sessionStorage.removeItem('opcuaRedirected'); sessionStorage.removeItem('reloadingDueToDelay'); sessionStorage.removeItem('redirectingDueToExtremeDelay'); return () => { if (reconnectInterval.current) clearTimeout(reconnectInterval.current); if (ws.current) { ws.current.onclose = null; ws.current.close(1000); ws.current = null; } };
    // }, [connectWebSocket]);


    // // --- Data Handling and Rendering Functions --- (Keep unchanged)
    // const sendDataToWebSocket = useCallback((nodeId: string, value: boolean | number | string) => { // Send Data
    //     if (ws.current && ws.current.readyState === WebSocket.OPEN) { try { const pointConfig = configuredDataPoints.find(p => p.nodeId === nodeId); let valueToSend = value; if (pointConfig?.dataType.includes('Int') && typeof value === 'boolean') { valueToSend = value ? 1 : 0; } if (pointConfig?.uiType === 'button' && typeof value === 'boolean' && value === true) { valueToSend = 1; } const payload = JSON.stringify({ [nodeId]: valueToSend }); ws.current.send(payload); console.log("Sent via WebSocket:", payload); toast.info('Command Sent', { description: `${pointConfig?.name || nodeId} = ${String(value)}`, duration: 2500 }); playNotificationSound('info'); } catch (e) { console.error("WebSocket send error:", e); toast.error('Send Error', { description: 'Failed to send command via WebSocket.' }); playNotificationSound('error'); } }
    //     else { console.error("WS not connected, cannot send", nodeId); toast.error('Connection Error', { description: 'Cannot send command. WebSocket is disconnected.' }); playNotificationSound('error'); if (!isConnected) connectWebSocket(); }
    // }, [isConnected, connectWebSocket, playNotificationSound]);

    // const formatValue = useCallback((val: number | null, config: DataPointConfig): string => { // Format Value
    //     if (val === null) return '--'; if (config.dataType === 'Boolean' || (config.dataType?.includes('Int') && (val === 0 || val === 1) && (config.name.includes('Status') || config.name.includes('Switch') || config.name.includes('Enable') || config.name.includes('Key')))) { return val === 1 ? 'ON' : 'OFF'; } if (config.id === 'work-mode-status') { const modes: { [k: number]: string } = { 0: 'Standby', 1: 'Grid-tie', 2: 'Off-grid', 3: 'Fault', 4: 'Charging' }; return modes[val] || `Code ${val}`; } if (config.id === 'run-state') { const states: { [k: number]: string } = { 0: 'Idle', 1: 'Self-Test', 2: 'Running', 3: 'Fault', 4: 'Derating', 5: 'Shutdown' }; return states[val] || `State ${val}`; } const absVal = Math.abs(val); let options: Intl.NumberFormatOptions = {}; if (config.unit === '%' || config.dataType === 'Float' || config.dataType === 'Double') { if (absVal < 1 && absVal !== 0) options = { minimumFractionDigits: 2, maximumFractionDigits: 2 }; else if (absVal < 100) options = { minimumFractionDigits: 1, maximumFractionDigits: 1 }; else options = { maximumFractionDigits: 0 }; } else if (config.dataType?.includes('Int')) { options = { maximumFractionDigits: 0 }; } else { if (absVal < 10) options = { minimumFractionDigits: 1, maximumFractionDigits: 1 }; else options = { maximumFractionDigits: 0 }; } return val.toLocaleString(undefined, options);
    // }, []);

    // const currentHoverEffect = resolvedTheme === 'dark' ? darkCardHoverEffect : cardHoverEffect;

    // // --- Component Return ---
    // return (
    //     <div className="min-h-screen bg-background text-foreground p-3 sm:p-4 md:p-6 lg:p-8 transition-colors duration-300 truncate">
    //         <div className="max-w-screen-3xl mx-auto">
    //             {/* Header (Keep unchanged) */}
    //             <motion.div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} >
    //                 <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center sm:text-left"> Mini-Grid Control Panel </h1>
    //                 <motion.div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center" initial="hidden" animate="visible" variants={containerVariants}>
    //                     <motion.div variants={itemVariants}><PlcConnectionStatus status={plcStatus} /></motion.div>
    //                     <motion.div variants={itemVariants}><WebSocketStatus isConnected={isConnected} connectFn={connectWebSocket} /></motion.div>
    //                     <motion.div variants={itemVariants}><SoundToggle /></motion.div>
    //                     <motion.div variants={itemVariants}><ThemeToggle /></motion.div>
    //                 </motion.div>
    //             </motion.div>

    //             {/* --- MODIFIED: Status Bar with Conditional Lag Display --- */}
    //             <motion.div className="text-xs text-muted-foreground mb-6 flex flex-col sm:flex-row justify-between items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
    //                 <div className="flex items-center gap-2">
    //                     <Clock size={12} /><span>{currentTime}</span>
    //                     <TooltipProvider delayDuration={100}><Tooltip>
    //                         <TooltipTrigger asChild>
    //                             {/* Make sure motion.span is the single child */}
    //                             <motion.span
    //                                 className={`font-mono cursor-default px-1.5 py-0.5 rounded text-xs ${
    //                                     delay < 3000 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50'
    //                                     : delay < 10000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50'
    //                                     : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50' // Stays red for >10s
    //                                 }`}
    //                                 whileHover={{ scale: 1.1 }}
    //                             >
    //                                 {/* --- Conditional Lag Text --- */}
    //                                 {delay > 30000
    //                                     ? '>30s lag'
    //                                     : `${(delay / 1000).toFixed(1)}s lag`
    //                                 }
    //                             </motion.span>
    //                         </TooltipTrigger>
    //                         <TooltipContent><p>Last data received {delay} ms ago</p></TooltipContent>
    //                     </Tooltip></TooltipProvider>
    //                 </div>
    //                 <span className='font-mono'>v{VERSION || '?.?.?'}</span>
    //             </motion.div>

    //         </div>
    //     </div>
    // );
};

export default ControlPanel;