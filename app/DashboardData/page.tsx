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
import { useRouter } from 'next/navigation';

// --- Interfaces ---
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

// --- Helper Components ---
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

// --- Grouping Function --- (Assumed correct and unchanged)
function groupDataPoints(pointsToGroup: DataPointConfig[]): { threePhaseGroups: ThreePhaseGroupInfo[], individualPoints: DataPointConfig[] } {
    const groupsByKey = new Map<string, DataPointConfig[]>();
    const individualPoints: DataPointConfig[] = [];
    const threePhaseGroups: ThreePhaseGroupInfo[] = [];

    pointsToGroup.forEach(point => {
        const canBeGrouped =
            point.category === 'three-phase' &&
            !!point.threePhaseGroup &&
            point.phase && ['a', 'b', 'c'].includes(point.phase) &&
            !point.isSinglePhase &&
            (point.uiType === 'display' || point.uiType === 'gauge');

        if (canBeGrouped && point.threePhaseGroup) {
            if (!groupsByKey.has(point.threePhaseGroup)) groupsByKey.set(point.threePhaseGroup, []);
            groupsByKey.get(point.threePhaseGroup)?.push(point);
        } else {
            individualPoints.push(point);
        }
    });

    groupsByKey.forEach((potentialGroup, groupKey) => {
        const phases: { a?: DataPointConfig, b?: DataPointConfig, c?: DataPointConfig } = {};
        let validGroup = true;
        let commonUiType: 'display' | 'gauge' | null = null;
        let commonUnit: string | undefined = undefined;
        let icon: typeof LucideIcon | undefined = undefined;
        let description: string | undefined = undefined;
        let title: string = groupKey;
        let representativePoint: DataPointConfig | null = null;

        if (potentialGroup.length < 2 || potentialGroup.length > 3) { validGroup = false; }
        else {
            representativePoint = potentialGroup.find(p => p.phase === 'a') || potentialGroup[0];
            commonUiType = representativePoint.uiType as 'display' | 'gauge';
            commonUnit = representativePoint.unit;
            icon = representativePoint.icon || HelpCircle;
            title = representativePoint.name || groupKey;
            title = title.replace(/ Phase [ABC]$/i, '').replace(/ Ph [ABC]$/i, '').replace(/ L[123]$/i, '')
                .replace(/[ _-][abc]$/i, '').replace(/ \(Precise\)$/i, '').replace(/ Phase$/i, '').trim();
            description = representativePoint.description?.replace(/ Phase [ABC]/i, '').replace(/ L[123]/i, '')
                .replace(/ \(high precision\)/i, '').trim() || `3-Phase ${title}`;

            for (const point of potentialGroup) {
                if (!point.phase || !['a', 'b', 'c'].includes(point.phase) || phases[point.phase as 'a' | 'b' | 'c'] ||
                    point.threePhaseGroup !== groupKey || point.unit !== commonUnit || point.uiType !== commonUiType) {
                    validGroup = false; break;
                }
                if (point.phase === 'a' || point.phase === 'b' || point.phase === 'c') { phases[point.phase] = point; }
            }
            if (!((phases.a && phases.b) || (phases.a && phases.c) || (phases.b && phases.c))) { validGroup = false; }
        }

        if (validGroup && commonUiType && representativePoint && icon) {
            threePhaseGroups.push({ groupKey, title, points: phases, icon, unit: commonUnit, description, uiType: commonUiType, config: representativePoint });
        } else {
            individualPoints.push(...potentialGroup);
        }
    });
    const uniqueIndividualPoints = Array.from(new Map(individualPoints.map(p => [p.id, p])).values());
    return { threePhaseGroups, individualPoints: uniqueIndividualPoints };
}

// --- Motion Variants --- (Unchanged)
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 10, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 150, damping: 18 } } };
const cardHoverEffect = { y: -4, boxShadow: "0 8px 20px -4px rgba(0, 0, 0, 0.08), 0 5px 8px -5px rgba(0, 0, 0, 0.08)", transition: { type: 'spring', stiffness: 350, damping: 20 } };
const darkCardHoverEffect = { y: -4, boxShadow: "0 8px 20px -4px rgba(0, 0, 0, 0.15), 0 5px 8px -5px rgba(0, 0, 0, 0.2)", transition: { type: 'spring', stiffness: 350, damping: 20 } };

// --- Circular Gauge Component --- (Unchanged)
interface CircularGaugeConfig {
    min?: number;
    max?: number;
    factor?: number;
    dataType?: string;
    nodeId: string;
}

interface CircularGaugeProps {
    value: number | null;
    unit?: string;
    label?: string;
    size?: number;
    strokeWidth?: number;
    config: CircularGaugeConfig;
}

const CircularGauge: React.FC<CircularGaugeProps> = React.memo(
    ({ value: rawValue, unit = '', label, size = 120, strokeWidth = 10, config }) => {
        const { resolvedTheme } = useTheme();
        const factor = config.factor ?? 1;
        const value = typeof rawValue === 'number' ? rawValue * factor : null;
        const min = config.min ?? 0;
        const max = config.max ?? (value !== null && value > 10 ? Math.ceil(value / 10) * 10 * 1.2 : 100);

        const normalizedValue = useMemo(() => {
            if (value === null || max === min) return 0;
            return (Math.max(min, Math.min(max, value)) - min) / (max - min);
        }, [value, min, max]);

        const getColor = useCallback(() => {
            if (value === null) return 'gray';
            const range = max - min;
            const buffer = range * 0.1;
            if ((config.dataType === 'Boolean' || config.dataType?.includes('Int')) && (value === 0 || value === 1) && max === 1) {
                return value === 1 ? 'green' : 'red';
            }
            if (value < min || value > max) return 'red';
            if (value < min + buffer || value > max - buffer) return 'yellow';
            return 'green';
        }, [value, min, max, config.dataType]);

        const color = getColor();
        const isCritical = color === 'red';
        const gradientId = `gauge-gradient-${config.nodeId.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const center = size / 2;
        const radius = (size - strokeWidth) / 2;
        const startAngle = -240;
        const endAngle = 60;
        const angleRange = endAngle - startAngle;
        const arcAngle = normalizedValue * angleRange + startAngle;

        const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
            const rad = (angle * Math.PI) / 180;
            return {
                x: cx + r * Math.cos(rad),
                y: cy + r * Math.sin(rad),
            };
        };

        const describeArc = (start: number, end: number) => {
            const startCoord = polarToCartesian(center, center, radius, end);
            const endCoord = polarToCartesian(center, center, radius, start);
            const largeArcFlag = end - start <= 180 ? '0' : '1';

            return `M ${startCoord.x} ${startCoord.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endCoord.x} ${endCoord.y}`;
        };

        const valueArc = describeArc(startAngle, Math.min(arcAngle, endAngle));

        const formatGaugeValue = useCallback((val: number | null): string => {
            if (val === null) return '--';
            if ((config.dataType === 'Boolean' || config.dataType?.includes('Int')) && (val === 0 || val === 1) && max === 1) {
                return val === 1 ? 'ON' : 'OFF';
            }
            const absVal = Math.abs(val);
            let options: Intl.NumberFormatOptions = {};
            if (absVal < 1 && absVal !== 0) options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
            else if (absVal < 100 && max > 20) options = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
            else options = { maximumFractionDigits: 0 };
            if (config.dataType?.includes('Int') && absVal >= 1) {
                options = { maximumFractionDigits: 0 };
            }
            return val.toLocaleString(undefined, options);
        }, [config.dataType, max]);

        const displayValue = formatGaugeValue(value);
        const isOnOff = displayValue === 'ON' || displayValue === 'OFF';

        return (
            <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${{
                    green: 'shadow-green-400/20 dark:shadow-green-500/25',
                    yellow: 'shadow-yellow-400/25 dark:shadow-yellow-500/30',
                    red: 'shadow-red-500/30 dark:shadow-red-600/35',
                    gray: 'shadow-gray-400/15 dark:shadow-gray-600/20',
                }[color]
                }`}>
                {label && (
                    <span className="text-xs font-medium text-muted-foreground text-center max-w-[120px] truncate" title={label}>
                        {label}
                    </span>
                )}
                <div className="relative" style={{ width: size, height: size }} aria-label={`Gauge for ${label || config.nodeId}, value ${displayValue} ${unit}`}>
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        <defs>
                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                {color === 'green' && (<><stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#22c55e" /></>)}
                                {color === 'yellow' && (<><stop offset="0%" stopColor="#facc15" /><stop offset="100%" stopColor="#eab308" /></>)}
                                {color === 'red' && (<><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#ef4444" /></>)}
                                {color === 'gray' && (<><stop offset="0%" stopColor="#9ca3af" /><stop offset="100%" stopColor="#6b7280" /></>)}
                            </linearGradient>
                        </defs>
                        <path
                            d={describeArc(startAngle, endAngle)}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            stroke="#e5e7eb"
                            fill="none"
                            className="opacity-30"
                        />
                        {value !== null && !isNaN(normalizedValue) && normalizedValue >= 0 && (
                            <motion.path
                                d={valueArc}
                                fill="none"
                                stroke={`url(#${gradientId})`}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                            />
                        )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.div
                                key={`${config.nodeId}-${displayValue}`}
                                className={`flex flex-col items-center justify-center text-center ${isCritical && !isOnOff ? 'animate-pulse' : ''}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className={`text-lg sm:text-xl lg:text-2xl font-semibold leading-tight ${color === 'gray' ? 'text-muted-foreground' : `text-${color}-${resolvedTheme === 'dark' ? 400 : 600}`
                                    }`}>
                                    {displayValue}
                                </span>
                                {!isOnOff && unit && (
                                    <span className="text-[10px] sm:text-xs text-muted-foreground -mt-0.5">{unit}</span>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        );
    }
);

CircularGauge.displayName = 'CircularGauge';


// --- Main Dashboard Component ---
const Dashboard = () => {
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
    const router = useRouter();

    // --- Sound State & Toggle ---
    const [soundEnabled, setSoundEnabled] = useState(() => {
        if (typeof window !== 'undefined') { return localStorage.getItem('dashboardSoundEnabled') === 'true'; } return false;
    });
    useEffect(() => { if (typeof window !== 'undefined') { localStorage.setItem('dashboardSoundEnabled', String(soundEnabled)); } }, [soundEnabled]);
    const SoundToggle = () => (
        <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label={soundEnabled ? 'Mute Notifications' : 'Unmute Notifications'}
              asChild
            >
              <motion.button
                className={`transition-colors rounded-full ${
                  soundEnabled
                    ? 'text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200'
                    : 'text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200'
                }`}
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
              >
                {!soundEnabled ? (
                  <BellOff className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </motion.button>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {!soundEnabled ? 'Mute Notifications' : 'Unmute Notifications'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    const playNotificationSound = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
        if (!soundEnabled) return; const soundMap = { success: '/sounds/success.mp3', error: '/sounds/error.mp3', warning: '/sounds/warning.mp3', info: '/sounds/info.mp3' }; const volumeMap = { success: 0.4, error: 0.6, warning: 0.5, info: 0.3 }; playSound(soundMap[type], volumeMap[type]);
    }, [soundEnabled]);

    // --- Core Hooks --- (Clock, Lag Check, PLC Check, WebSocket Connect, Initial Connect) - Assumed correct
    useEffect(() => { // Clock
        const updateClock = () => setCurrentTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: 'short', year: 'numeric' })); updateClock(); const interval = setInterval(updateClock, 1000); return () => clearInterval(interval);
    }, []);
    useEffect(() => { // Lag Check
        const interval = setInterval(() => { const currentDelay = Date.now() - lastUpdateTime; setDelay(currentDelay); if (isConnected && currentDelay > 30000 && typeof window !== 'undefined' && sessionStorage.getItem('reloadingDueToDelay') !== 'true') { console.warn(`WS data lag (${(currentDelay / 1000).toFixed(1)}s) exceeded threshold. Reloading.`); toast.error('Stale Data Detected', { description: 'Refreshing connection...', duration: 5000 }); playNotificationSound('error'); sessionStorage.setItem('reloadingDueToDelay', 'true'); setTimeout(() => window.location.reload(), 1500); } else if (currentDelay < 30000 && typeof window !== 'undefined') { sessionStorage.removeItem('reloadingDueToDelay'); } }, 2000); return () => clearInterval(interval);
    }, [lastUpdateTime, isConnected, playNotificationSound]);
    const checkPlcConnection = useCallback(async () => { // PLC Status Check
        try { const res = await fetch('/api/opcua/status'); if (!res.ok) throw new Error(`API Error: ${res.status}`); const data = await res.json(); const newStatus = data.connectionStatus; if (newStatus && ['online', 'offline', 'disconnected'].includes(newStatus)) { setPlcStatus(newStatus); } else { console.error("Invalid PLC status:", data); if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); } } catch (err: any) { if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); }
    }, [plcStatus]);
    useEffect(() => { checkPlcConnection(); const interval = setInterval(checkPlcConnection, 10000); return () => clearInterval(interval); }, [checkPlcConnection]);
    const connectWebSocket = useCallback(() => { // WebSocket Connection
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return; if (typeof window !== 'undefined' && sessionStorage.getItem('reloadingDueToDelay') === 'true') { setTimeout(() => sessionStorage.removeItem('reloadingDueToDelay'), 3000); return; } setIsConnected(false); const delayMs = Math.min(1000 + 2000 * Math.pow(1.6, reconnectAttempts.current), 60000); console.log(`Attempting WS connect (Attempt ${reconnectAttempts.current + 1}) in ${(delayMs / 1000).toFixed(1)}s...`); if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
        reconnectInterval.current = setTimeout(() => {
            ws.current = new WebSocket(WS_URL); ws.current.onopen = () => { console.log("WS Connected"); setIsConnected(true); setLastUpdateTime(Date.now()); reconnectAttempts.current = 0; if (reconnectInterval.current) { clearTimeout(reconnectInterval.current); reconnectInterval.current = null; } toast.success('Connection Established', { description: 'Live data feed active.', duration: 3000 }); playNotificationSound('success'); if (typeof window !== 'undefined') sessionStorage.removeItem('opcuaRedirected'); }; ws.current.onmessage = (event) => { try { const receivedData = JSON.parse(event.data as string); setNodeValues(prev => ({ ...prev, ...receivedData })); setLastUpdateTime(Date.now()); } catch (e) { console.error("WS parse error:", e, "Data:", event.data); toast.error('Data Error', { description: 'Received invalid data format.', duration: 4000 }); playNotificationSound('error'); } }; ws.current.onerror = (event) => {
                console.error("WebSocket error event:", event);
                toast.error('WebSocket Error', { description: 'Connection error occurred. Attempting recovery...', duration: 5000 });
                playNotificationSound('error');

                // --- START: Redirection Logic ---
                if (typeof window !== 'undefined') {
                    const redir = sessionStorage.getItem('opcuaRedirected');
                    if (!redir || redir === 'false') {
                        console.warn("WebSocket connection error, redirecting to API endpoint for potential authentication/setup...");
                        // Construct the URL relative to the current origin
                        const apiUrl = new URL('/api/opcua', window.location.origin);
                        console.log("Redirecting to:", apiUrl.href);
                        sessionStorage.setItem('opcuaRedirected', 'true'); // Set flag BEFORE redirecting
                        window.location.href = apiUrl.href; // Perform the redirect
                    } else {
                        console.warn("WebSocket error occurred, but redirection already attempted. Manual intervention may be required.");
                    }
                }
                // Ensure the socket is closed to allow the onclose handler to potentially trigger reconnects
                if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
                    ws.current.close();
                }
            }; ws.current.onclose = (event) => { console.log(`WS disconnected. Code: ${event.code}, Clean: ${event.wasClean}`); setIsConnected(false); ws.current = null; if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) { reconnectAttempts.current++; connectWebSocket(); } else if (reconnectAttempts.current >= maxReconnectAttempts) { console.warn("Max WS reconnect attempts reached."); toast.error('Connection Failed', { description: 'Max reconnect attempts reached.', duration: 10000 }); playNotificationSound('error'); } else { console.log("WS closed cleanly or max attempts reached."); } };
        }, delayMs);
    }, [playNotificationSound]);
    useEffect(() => { // Initial WS connect & cleanup
        if (typeof window === 'undefined') return; connectWebSocket(); sessionStorage.removeItem('opcuaRedirected'); sessionStorage.removeItem('reloadingDueToDelay'); return () => { if (reconnectInterval.current) clearTimeout(reconnectInterval.current); if (ws.current) { ws.current.onclose = null; ws.current.close(1000); ws.current = null; } };
    }, [connectWebSocket]);

    // --- Data Handling and Rendering Functions ---
    const sendDataToWebSocket = useCallback((nodeId: string, value: boolean | number | string) => { // Send Data
        if (ws.current && ws.current.readyState === WebSocket.OPEN) { try { const pointConfig = configuredDataPoints.find(p => p.nodeId === nodeId); let valueToSend = value; if (pointConfig?.dataType.includes('Int') && typeof value === 'boolean') { valueToSend = value ? 1 : 0; } if (pointConfig?.uiType === 'button' && typeof value === 'boolean' && value === true) { valueToSend = 1; } const payload = JSON.stringify({ [nodeId]: valueToSend }); ws.current.send(payload); console.log("Sent via WebSocket:", payload); toast.info('Command Sent', { description: `${pointConfig?.name || nodeId} = ${String(value)}`, duration: 2500 }); playNotificationSound('info'); } catch (e) { console.error("WebSocket send error:", e); toast.error('Send Error', { description: 'Failed to send command via WebSocket.' }); playNotificationSound('error'); } }
        else { console.error("WS not connected, cannot send", nodeId); toast.error('Connection Error', { description: 'Cannot send command. WebSocket is disconnected.' }); playNotificationSound('error'); if (!isConnected) connectWebSocket(); }
    }, [isConnected, connectWebSocket, playNotificationSound]);

    const formatValue = useCallback((val: number | null, config: DataPointConfig): string => { // Format Value
        if (val === null) return '--'; if (config.dataType === 'Boolean' || (config.dataType?.includes('Int') && (val === 0 || val === 1) && (config.name.includes('Status') || config.name.includes('Switch') || config.name.includes('Enable') || config.name.includes('Key')))) { return val === 1 ? 'ON' : 'OFF'; } if (config.id === 'work-mode-status') { const modes: { [k: number]: string } = { 0: 'Standby', 1: 'Grid-tie', 2: 'Off-grid', 3: 'Fault', 4: 'Charging' }; return modes[val] || `Code ${val}`; } if (config.id === 'run-state') { const states: { [k: number]: string } = { 0: 'Idle', 1: 'Self-Test', 2: 'Running', 3: 'Fault', 4: 'Derating', 5: 'Shutdown' }; return states[val] || `State ${val}`; } const absVal = Math.abs(val); let options: Intl.NumberFormatOptions = {}; if (config.unit === '%' || config.dataType === 'Float' || config.dataType === 'Double') { if (absVal < 1 && absVal !== 0) options = { minimumFractionDigits: 2, maximumFractionDigits: 2 }; else if (absVal < 100) options = { minimumFractionDigits: 1, maximumFractionDigits: 1 }; else options = { maximumFractionDigits: 0 }; } else if (config.dataType?.includes('Int')) { options = { maximumFractionDigits: 0 }; } else { if (absVal < 10) options = { minimumFractionDigits: 1, maximumFractionDigits: 1 }; else options = { maximumFractionDigits: 0 }; } return val.toLocaleString(undefined, options);
    }, []);

    const renderNodeValueText = useCallback((nodeId: string | undefined, pointConfig: DataPointConfig): React.ReactNode => { // Render Display Text/Value
        if (!nodeId || !pointConfig) return <span className="text-gray-400 dark:text-gray-500">--</span>;
        const rawValue = nodeValues[nodeId]; const key = `${nodeId}-${String(rawValue)}-${Date.now()}`; let content: React.ReactNode; let valueClass = "text-foreground font-medium"; let iconPrefix: React.ReactNode = null; const unit = pointConfig.unit;
        if (rawValue === undefined || rawValue === null) { content = <span className="text-gray-400 dark:text-gray-500 italic">--</span>; }
        else if (rawValue === 'Error') { content = <span className="font-semibold">Error</span>; valueClass = "text-red-600 dark:text-red-400"; iconPrefix = <AlertCircle size={14} className="mr-1 inline-block" />; }
        else if (typeof rawValue === 'boolean') { content = rawValue ? 'ON' : 'OFF'; valueClass = `font-semibold ${rawValue ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`; }
        else if (typeof rawValue === 'number') {
            const factor = pointConfig.factor ?? 1; const min = pointConfig.min; const max = pointConfig.max; let adjustedValue = rawValue * factor; let displayValue = formatValue(adjustedValue, pointConfig); const isOutOfRange = (min !== undefined && adjustedValue < min) || (max !== undefined && adjustedValue > max); const isOnOff = displayValue === 'ON' || displayValue === 'OFF';
            if (isOnOff) { valueClass = `font-semibold ${displayValue === 'ON' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`; }
            else if (isOutOfRange) {
                valueClass = "text-yellow-600 dark:text-yellow-400 font-semibold"; iconPrefix = <AlertCircle size={14} className="mr-1 inline-block" />;
                const now = Date.now(); const lastToastTime = lastToastTimestamps.current[nodeId]; const cooldown = 60 * 1000;
                if (!lastToastTime || now - lastToastTime > cooldown) { const direction = (min !== undefined && adjustedValue < min) ? 'below min' : 'above max'; const rangeText = `(${formatValue(min ?? null, pointConfig)} to ${formatValue(max ?? null, pointConfig)})`; toast.warning('Value Alert', { description: `${pointConfig.name} is ${direction}. Val: ${displayValue}${unit || ''} ${rangeText}.`, duration: 8000 }); playNotificationSound('warning'); lastToastTimestamps.current[nodeId] = now; }
            } else { if (lastToastTimestamps.current[nodeId]) delete lastToastTimestamps.current[nodeId]; }
            content = isOnOff ? displayValue : <>{displayValue}<span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5">{unit || ''}</span></>;
        } else if (typeof rawValue === 'string') {
            if (pointConfig.dataType === 'DateTime') { try { content = new Date(rawValue).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' }); } catch { content = rawValue; } } else if (pointConfig.dataType === 'Guid') { content = `${rawValue.substring(0, 8)}...`; } else if (pointConfig.dataType === 'ByteString') { content = `[${rawValue.length} bytes]`; } else { content = rawValue.length > 25 ? `${rawValue.substring(0, 22)}...` : rawValue; } valueClass = "text-sm text-muted-foreground font-normal";
        } else { content = <span className="text-yellow-500">?</span>; valueClass = "text-yellow-500"; }
        return (<AnimatePresence mode="wait" initial={false}><motion.span key={key} className={`inline-flex items-center ${valueClass}`} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} exit={{ opacity: 0.6 }} transition={{ duration: 0.15, ease: "linear" }} > {iconPrefix}{content} </motion.span></AnimatePresence>);
    }, [nodeValues, formatValue, playNotificationSound]); // Dependencies correct

    // --- Data Processing & Layout ---
    const { threePhaseGroups, individualPoints } = useMemo(() => groupDataPoints(configuredDataPoints), []); // No need to rerun if config doesn't change
    const sections = useMemo(() => { // Calculate sections based on grouped data
        const controlItems = individualPoints.filter(p => p.uiType === 'button' || p.uiType === 'switch');
        const gaugeItemsIndividual = individualPoints.filter(p => p.uiType === 'gauge');
        const displayItemsIndividual = individualPoints.filter(p => p.uiType === 'display');
        const gaugeGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'gauge');
        const displayGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'display');
        const displayByCategory = displayItemsIndividual.reduce((acc, point) => { const isInGroup = threePhaseGroups.some(g => g.points.a?.id === point.id || g.points.b?.id === point.id || g.points.c?.id === point.id); if (isInGroup) return acc; const category = point.category || 'status'; if (!acc[category]) acc[category] = []; acc[category].push(point); return acc; }, {} as Record<string, DataPointConfig[]>);
        const layoutSections = [{ title: "Controls & Settings", items: controlItems, gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6' }, { title: "Gauges & Overview", items: [...gaugeItemsIndividual, ...gaugeGroups3Phase], gridCols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' }, { title: "Three Phase Readings", items: displayGroups3Phase, gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' }, ...Object.entries(displayByCategory).sort(([catA], [catB]) => catA.localeCompare(catB)).map(([category, points]) => ({ title: category.charAt(0).toUpperCase() + category.slice(1) + " Readings", items: points, gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' }))];
        return layoutSections.filter(section => section.items.length > 0);
    }, [individualPoints, threePhaseGroups]); // Dependencies for layout calculation

    const currentHoverEffect = resolvedTheme === 'dark' ? darkCardHoverEffect : cardHoverEffect;

    // --- Component Return ---
    return (
        <div className="min-h-screen bg-background text-foreground p-3 sm:p-4 md:p-6 lg:p-8 transition-colors duration-300 truncate">
            <div className="max-w-screen-3xl mx-auto">
                {/* Header */}
                <motion.div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} >
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center sm:text-left"> Mini-Grid Dashboard </h1>
                    <motion.div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center" initial="hidden" animate="visible" variants={containerVariants}>
                        <motion.div variants={itemVariants}><PlcConnectionStatus status={plcStatus} /></motion.div>
                        <motion.div variants={itemVariants}><WebSocketStatus isConnected={isConnected} connectFn={connectWebSocket} /></motion.div>
                        <motion.div variants={itemVariants}><SoundToggle /></motion.div>
                        <motion.div variants={itemVariants}><ThemeToggle /></motion.div>
                    </motion.div>
                </motion.div>

                {/* Status Bar */}
                <motion.div className="text-xs text-muted-foreground mb-6 flex flex-col sm:flex-row justify-between items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
                    <div className="flex items-center gap-2">
                        <Clock size={12} /><span>{currentTime}</span>
                        <TooltipProvider delayDuration={100}><Tooltip>
                            <TooltipTrigger asChild>
                                {/* Make sure motion.span is the single child */}
                                <motion.span className={`font-mono cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 3000 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50' : delay < 10000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50' : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50'}`} whileHover={{ scale: 1.1 }}>
                                    {(delay / 1000).toFixed(1)}s lag
                                </motion.span>
                            </TooltipTrigger>
                            <TooltipContent><p>Last data received {delay} ms ago</p></TooltipContent>
                        </Tooltip></TooltipProvider>
                    </div>
                    <span className='font-mono'>v{VERSION || '?.?.?'}</span>
                </motion.div>

                {/* Sections */}
                <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible" >
                    {sections.map((section) => (
                        <motion.section key={section.title} variants={itemVariants}>
                            <h2 className="text-lg md:text-xl font-semibold tracking-tight text-card-foreground mb-4 border-l-4 border-primary pl-3"> {section.title} </h2>
                            <div className={`grid ${section.gridCols} gap-3 md:gap-4`}>
                                {section.items.map((item) => {
                                    const isGroupInfo = (obj: any): obj is ThreePhaseGroupInfo => obj && obj.groupKey !== undefined;
                                    const isDataPoint = (obj: any): obj is DataPointConfig => obj && obj.id !== undefined;

                                    if (isGroupInfo(item)) { // --- Render 3-Phase Group ---
                                        const group = item; const RepresentativeIcon = group.icon || HelpCircle; const isDisabled = !isConnected;
                                        if (group.uiType === 'gauge') {
                                            return (<motion.div key={group.groupKey} className="rounded-lg overflow-hidden col-span-2 md:col-span-3" whileHover={currentHoverEffect} variants={itemVariants}>
                                                <TooltipProvider delayDuration={200}><Tooltip>
                                                    {/* FIX: Card is direct child */}
                                                    <TooltipTrigger asChild>
                                                        <Card className={`h-full shadow-sm hover:shadow-md transition-all duration-200 border dark:border-border/50 bg-card ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-default'}`}>
                                                            <CardHeader className="p-3 bg-muted/30 dark:bg-muted/20 border-b dark:border-border/50"> <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground/90"> <RepresentativeIcon className="w-4 h-4 text-primary flex-shrink-0" /> <span className="truncate" title={group.title}>{group.title}</span> </CardTitle> </CardHeader>
                                                            <CardContent className="p-4 flex flex-wrap justify-around items-end gap-x-4 gap-y-3">
                                                                {(['a', 'b', 'c'] as const).map((phase) => { const point = group.points[phase]; if (!point) return <div key={phase} className="w-[90px] h-[110px] flex items-center justify-center text-xs text-muted-foreground opacity-50">(N/A)</div>; const value = nodeValues[point.nodeId]; return (<CircularGauge key={point.id} value={typeof value === 'number' ? value : null} unit={group.unit} label={`Phase ${phase.toUpperCase()}`} size={90} strokeWidth={9} config={point} />); })}
                                                            </CardContent>
                                                        </Card>
                                                    </TooltipTrigger>
                                                    {group.description && (<TooltipContent><p>{group.description}</p></TooltipContent>)}
                                                </Tooltip></TooltipProvider>
                                            </motion.div>);
                                        } else { // Display Group
                                            return (<motion.div key={group.groupKey} className="rounded-lg overflow-hidden col-span-1 md:col-span-2" whileHover={currentHoverEffect} variants={itemVariants}>
                                                <TooltipProvider delayDuration={200}><Tooltip>
                                                    {/* FIX: Card is direct child */}
                                                    <TooltipTrigger asChild>
                                                        <Card className={`h-full shadow-sm hover:shadow-md transition-all duration-200 border dark:border-border/50 bg-card ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-default'}`}>
                                                            <CardHeader className="p-3 bg-muted/30 dark:bg-muted/20 border-b dark:border-border/50"> <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground/90 truncate"> <RepresentativeIcon className="w-4 h-4 text-primary flex-shrink-0" /> <span className="truncate" title={group.title}>{group.title}</span> {group.unit && <span className="ml-auto text-xs text-muted-foreground">({group.unit})</span>} </CardTitle> </CardHeader>
                                                            <CardContent className="p-3 text-sm">
                                                                <div className="grid grid-cols-3 gap-x-2 gap-y-1 items-center">
                                                                    {(['a', 'b', 'c'] as const).map(phase => (<div key={`head-${phase}`} className="text-xs font-medium text-muted-foreground text-center border-b pb-1 dark:border-border/50"> {group.points[phase] ? `Ph ${phase.toUpperCase()}` : '-'} </div>))}
                                                                    {(['a', 'b', 'c'] as const).map((phase) => { const point = group.points[phase]; return (<div key={phase} className="text-center pt-1 min-h-[28px] flex items-center justify-center text-base md:text-lg"> {point ? renderNodeValueText(point.nodeId, point) : <span className="text-gray-400 dark:text-gray-600">-</span>} </div>); })}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </TooltipTrigger>
                                                    {group.description && (<TooltipContent><p>{group.description}</p></TooltipContent>)}
                                                </Tooltip></TooltipProvider>
                                            </motion.div>);
                                        }
                                    }
                                    else if (isDataPoint(item)) { // --- Render Individual Point ---
                                        const point = item; const PointIcon = point.icon || HelpCircle; const isDisabled = !isConnected || nodeValues[point.nodeId] === 'Error'; const rawValue = nodeValues[point.nodeId];
                                        if (point.uiType === 'gauge') {
                                            const value = typeof rawValue === 'number' ? rawValue : null;
                                            return (<motion.div key={point.id} className="rounded-lg overflow-hidden col-span-1" whileHover={currentHoverEffect} variants={itemVariants}>
                                                <TooltipProvider delayDuration={200}><Tooltip>
                                                    {/* FIX: Card is direct child */}
                                                    <TooltipTrigger asChild>
                                                        <Card className={`h-full p-3 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 border dark:border-border/50 bg-card min-h-[160px] sm:min-h-[180px] ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-default'}`}>
                                                            <div className="flex flex-col items-center gap-0.5 mb-2 text-center"> <PointIcon className="w-5 h-5 text-primary flex-shrink-0 mb-1" /> <span className="text-xs font-semibold text-card-foreground/90 leading-tight px-1 truncate max-w-[120px]" title={point.name}>{point.name}</span> {(point.min !== undefined || point.max !== undefined) && (<div className="text-[10px] text-muted-foreground">({point.min ?? '-'} to {point.max ?? '-'})</div>)} </div>
                                                            <CircularGauge value={value} unit={point.unit} size={100} strokeWidth={10} config={point} />
                                                        </Card>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom"> <p>{point.description ?? 'No description.'}</p> <p className="text-xs text-muted-foreground mt-1">ID: {point.nodeId} ({point.dataType})</p> </TooltipContent>
                                                </Tooltip></TooltipProvider>
                                            </motion.div>);
                                        } else if (point.uiType === 'display') {
                                            return (<motion.div key={point.id} className="rounded-lg overflow-hidden col-span-1" whileHover={currentHoverEffect} variants={itemVariants}>
                                                <TooltipProvider delayDuration={200}><Tooltip>
                                                    {/* FIX: Card is direct child */}
                                                    <TooltipTrigger asChild>
                                                        <Card className={`h-full p-3 flex items-center justify-between min-h-[60px] sm:min-h-[64px] shadow-sm hover:shadow-md transition-all duration-200 border dark:border-border/50 bg-card ${isDisabled && point.category !== 'status' ? 'opacity-60 cursor-not-allowed' : 'cursor-default'}`}>
                                                            <div className='flex items-center gap-2 overflow-hidden mr-2'> <PointIcon className="w-4 h-4 text-primary flex-shrink-0" /> <span className="text-xs font-medium text-card-foreground/80 truncate" title={point.name}>{point.name}</span> </div>
                                                            <div className="text-sm sm:text-base md:text-lg text-right flex-shrink-0 pl-1 whitespace-nowrap"> {renderNodeValueText(point.nodeId, point)} </div>
                                                        </Card>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom"> <p>{point.description ?? 'No description.'}</p> <p className="text-xs text-muted-foreground mt-1">ID: {point.nodeId} ({point.dataType})</p> {point.notes && <p className="text-xs text-blue-500 mt-1">Note: {point.notes}</p>} </TooltipContent>
                                                </Tooltip></TooltipProvider>
                                            </motion.div>);
                                        } else if (point.uiType === 'button') {
                                            return (<motion.div key={point.id} className="col-span-1" variants={itemVariants}>
                                                <TooltipProvider delayDuration={200}><Tooltip>
                                                    {/* FIX: Button is direct child */}
                                                    <TooltipTrigger asChild>
                                                        <motion.div whileHover={!isDisabled ? { scale: 1.03, y: -1 } : {}} whileTap={!isDisabled ? { scale: 0.98 } : {}} className="h-full">
                                                            <Button onClick={() => sendDataToWebSocket(point.nodeId, true)} className="w-full h-full justify-start p-3 text-left bg-card border dark:border-border/50 rounded-lg shadow-sm hover:bg-muted/50 dark:hover:bg-muted/30 hover:shadow-md transition-all text-card-foreground/90" variant="outline" disabled={isDisabled} >
                                                                <PointIcon className="w-4 h-4 mr-2 text-primary flex-shrink-0" /> <span className="text-sm font-medium">{point.name}</span>
                                                            </Button>
                                                        </motion.div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom"> <p>{point.description ?? 'Click to activate.'}</p> <p className="text-xs text-muted-foreground mt-1">ID: {point.nodeId} ({point.dataType})</p> </TooltipContent>
                                                </Tooltip></TooltipProvider>
                                            </motion.div>);
                                        } else if (point.uiType === 'switch') {
                                            let isChecked = false; if (typeof rawValue === 'boolean') isChecked = rawValue; else if (typeof rawValue === 'number') isChecked = rawValue === 1;
                                            const switchDisabled = isDisabled || rawValue === undefined || rawValue === null;
                                            return (<motion.div key={point.id} className="col-span-1" variants={itemVariants}>
                                                <TooltipProvider delayDuration={200}><Tooltip>
                                                    <Card className={`h-full p-3 flex items-center justify-between cursor-default transition-opacity shadow-sm hover:shadow-md border dark:border-border/50 bg-card min-h-[60px] sm:min-h-[64px] ${switchDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
                                                        {/* FIX: Trigger wraps only the label part */}
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-2 overflow-hidden mr-2 flex-1 cursor-help">
                                                                <PointIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                                                <span className="text-xs font-medium truncate text-card-foreground/80" title={point.name}>{point.name}</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        {/* Switch remains outside the trigger */}
                                                        <motion.div whileHover={!switchDisabled ? { scale: 1.05 } : {}} whileTap={!switchDisabled ? { scale: 0.95 } : {}} className="flex-shrink-0">
                                                            <Switch checked={isChecked} onCheckedChange={(checked) => sendDataToWebSocket(point.nodeId, checked)} disabled={switchDisabled} aria-label={point.name} id={`switch-${point.id}`} />
                                                        </motion.div>
                                                    </Card>
                                                    <TooltipContent side="bottom"> <p>{point.description ?? 'Toggle setting.'}</p> <p className="text-xs text-muted-foreground mt-1">ID: {point.nodeId} ({point.dataType})</p> </TooltipContent>
                                                </Tooltip></TooltipProvider>
                                            </motion.div>);
                                        }
                                    }
                                    return null;
                                })}
                            </div>
                        </motion.section>
                    ))}
                </motion.div>
            </div>
            {/* --- START: Toast & Sound Testing UI --- */}
            {/* Conditionally render or remember to remove later */}
            {process.env.NODE_ENV === 'development' && ( // Optional: Show only in development
                <motion.section className="m-8 p-4 border border-dashed rounded-lg border-muted-foreground/50" variants={itemVariants}>
                    <h2 className="text-base font-semibold text-muted-foreground mb-3">Toast & Sound Test Area (Dev Only)</h2>
                    <div className="flex flex-wrap gap-3">
                        <Button size="sm" variant="outline" onClick={() => { toast.success("Success Toast", { description: "Operation completed successfully." }); playNotificationSound('success'); }}>
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Trigger Success
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { toast.error("Error Toast", { description: "Something went wrong." }); playNotificationSound('error'); }}>
                            <XCircle className="w-4 h-4 mr-2 text-red-500" /> Trigger Error
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { toast.warning("Warning Toast", { description: "Check configuration." }); playNotificationSound('warning'); }}>
                            <AlertTriangleIcon className="w-4 h-4 mr-2 text-yellow-500" /> Trigger Warning
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { toast.info("Info Toast", { description: "Command sent to device." }); playNotificationSound('info'); }}>
                            <InfoIcon className="w-4 h-4 mr-2 text-blue-500" /> Trigger Info
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { toast("Default Toast", { description: "This is a default message." }); /* Optional: playInfoSound(); */ }}>
                            Trigger Default
                        </Button>
                    </div>
                </motion.section>
            )}
        </div>
    );
};

export default Dashboard;