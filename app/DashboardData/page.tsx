'use client';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { dataPoints as configuredDataPoints, DataPoint as DataPointConfig, dataPoints } from '@/config/dataPoints'; // Assuming this path is correct & combine interfaces
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
import { useToast } from '@/hooks/use-toast'; // Correct hook import
import { WS_URL, VERSION } from '@/config/constants';
import {
    Activity, AudioWaveform, Battery, Zap, Gauge, Sun, Moon, AlertCircle, Power, Sigma, Thermometer,
    Wind, Droplets, Info, Settings, Minimize2, Maximize2, FileOutput, Waypoints, SigmaSquare, Lightbulb,
    HelpCircle, Clock, Percent, ToggleLeft, ToggleRight, Waves // Import all used icons
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Interfaces (Combined DataPointConfig from import)
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
    icon?: React.ComponentType<any>; // Allow any Lucide icon type
    unit?: string;
    description?: string;
    uiType: 'display' | 'gauge';
    config: DataPointConfig; // Add reference config for min/max/etc. on group level if needed
}


// Helper Components (PlcConnectionStatus, WebSocketStatus, ThemeToggle - Minor style tweaks)
const PlcConnectionStatus = ({ status }: { status: 'online' | 'offline' | 'disconnected' }) => {
    let statusText = '';
    let dotClass = '';
    let title = `Status: ${status}`;
    let clickHandler = () => { };

    switch (status) {
        case 'online':
            statusText = 'PLC: Online (Remote)';
            dotClass = 'bg-blue-500 ring-2 ring-blue-500/30'; // Added subtle ring
            title = 'PLC connected remotely';
            break;
        case 'offline':
            statusText = 'PLC: Online (Local)';
            dotClass = 'bg-sky-400 ring-2 ring-sky-400/30'; // Added subtle ring
            title = 'PLC connected locally';
            break;
        case 'disconnected':
        default: // Handle default case
            statusText = 'PLC: Disconnected';
            dotClass = 'bg-gray-400 dark:bg-gray-600';
            title = 'PLC Disconnected. Click to try reconnecting.';
            clickHandler = () => {
                if (typeof window !== 'undefined') {
                    console.log("Reloading page to re-attempt connection...");
                    window.location.reload();
                }
            };
            break;
    }
    const dotVariants = { initial: { scale: 0 }, animate: { scale: 1 }, pulse: { scale: [1, 1.15, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } };

    return (
        <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            className={`w-3 h-3 rounded-full ${dotClass} ${status === 'disconnected' ? 'cursor-pointer hover:opacity-80' : ''} flex-shrink-0`}
                            variants={dotVariants}
                            initial="initial"
                            animate={status !== 'disconnected' ? ["animate", "pulse"] : "animate"}
                            onClick={clickHandler}
                            whileHover={status === 'disconnected' ? { scale: 1.2 } : {}}
                        />
                    </TooltipTrigger>
                    <TooltipContent><p>{title}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <span className="text-xs sm:text-sm text-muted-foreground">{statusText}</span>
        </motion.div>
    );
};

interface WebSocketStatusProps {
    isConnected: boolean;
    connectFn: () => void;
}

const WebSocketStatus = ({ isConnected, connectFn }: WebSocketStatusProps) => {
    const router = useRouter();
    const [wasConnected, setWasConnected] = useState(isConnected);

    const title = isConnected ? "WebSocket Connected" : "WebSocket Disconnected. Click to attempt reconnect.";
    const pulseVariants = { pulse: { scale: [1, 1.15, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } };

    const handleTextClick = useCallback(() => {
        router.push('/api/opcua');
    }, [router]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;

        if (!isConnected && wasConnected) {
            // WebSocket just went offline
            timeoutId = setTimeout(() => {
                router.push('/api/opcua');
            }, 10000); // 10 seconds
        } else if (isConnected) {
            // WebSocket is now connected, clear any pending redirects
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        }

        setWasConnected(isConnected);

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [isConnected, router, wasConnected]);

    return (
        <motion.div className="flex items-center gap-2 cursor-pointer" onClick={connectFn} title={title} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <motion.div
                className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 ring-2 ring-green-500/30' : 'bg-red-500 ring-2 ring-red-500/30'} flex-shrink-0`}
                variants={pulseVariants}
                animate={isConnected ? "pulse" : {}} // Only pulse when connected
            />
            <span
                className="text-xs sm:text-sm font-medium text-muted-foreground cursor-pointer"
                onClick={handleTextClick}
            >
                WS: {isConnected ? 'Live' : 'Offline'}
            </span>
        </motion.div>
    );
};



const ThemeToggle = () => {
    const { resolvedTheme, setTheme } = useTheme(); // Use resolvedTheme for accurate state
    const Icon = resolvedTheme === 'dark' ? Sun : Moon;
    const title = `Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`;
    return (
        <TooltipProvider delayDuration={100}><Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost" // Use ghost for subtle look
                    size="icon"
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    aria-label={title}
                    asChild // Allows motion.button to receive props
                >
                    <motion.button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        whileHover={{ scale: 1.1, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Icon className="w-5 h-5" />
                    </motion.button>
                </Button>
            </TooltipTrigger><TooltipContent><p>{title}</p></TooltipContent>
        </Tooltip></TooltipProvider>
    )
}

// --- Grouping function (Improved with better title cleaning and passing full config) ---
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

        if (canBeGrouped) {
            const groupKey = point.threePhaseGroup;
            if (groupKey) {
                if (!groupsByKey.has(groupKey)) groupsByKey.set(groupKey, []);
            }
            const group = groupKey ? groupsByKey.get(groupKey) : undefined;
            if (group) {
                group.push(point);
            }
        } else {
            individualPoints.push(point);
        }
    });

    groupsByKey.forEach((potentialGroup, groupKey) => {
        const phases: { a?: DataPointConfig, b?: DataPointConfig, c?: DataPointConfig } = {};
        let validGroup = true;
        let commonUiType: 'display' | 'gauge' | null = null;
        let commonUnit: string | undefined = undefined;
        let icon: React.ComponentType<any> | undefined = undefined;
        let description: string | undefined = undefined;
        let title: string = groupKey;
        let representativePoint: DataPointConfig | null = null;

        if (potentialGroup.length < 2 || potentialGroup.length > 3) { // Allow groups of 2 or 3
            validGroup = false;
        } else {
            representativePoint = potentialGroup.find(p => p.phase === 'a') || potentialGroup[0]; // Prefer phase A for consistency
            commonUiType = representativePoint.uiType as 'display' | 'gauge';
            commonUnit = representativePoint.unit;
            icon = representativePoint.icon;
            // More robust title cleaning
            title = representativePoint.name || groupKey;
            title = title.replace(/ Phase [ABC]$/i, '').replace(/ Ph [ABC]$/i, '').replace(/ L[123]$/i, '').replace(/[ _-][abc]$/i, '').replace(/ \(Precise\)$/i, '').trim();
            description = representativePoint.description?.replace(/ Phase [ABC]/i, '').replace(/ L[123]/i, '').replace(/ \(high precision\)/i, '').trim() || `3-Phase ${title}`;

            for (const point of potentialGroup) {
                if (
                    point.threePhaseGroup !== groupKey ||
                    !point.phase ||
                    !['a', 'b', 'c'].includes(point.phase) ||
                    phases[point.phase as 'a' | 'b' | 'c'] || // Check if phase already assigned
                    point.unit !== commonUnit ||
                    point.uiType !== commonUiType
                ) {
                    validGroup = false;
                    break;
                }
                if (point.phase === 'a' || point.phase === 'b' || point.phase === 'c') {
                    phases[point.phase] = point;
                }
            }
            // Check if all expected phases are present *if* the group size is 3
            if (potentialGroup.length === 3 && (!phases.a || !phases.b || !phases.c)) {
                validGroup = false;
            }
            // Allow groups with only 2 phases if needed (e.g., only A and B exist)
            if (potentialGroup.length === 2 && (!phases.a && !phases.b && !phases.c)) {
                validGroup = false; // Need at least one phase!
            }
            // Ensure representativePoint is not null
            if (!representativePoint) validGroup = false;

        }

        if (validGroup && commonUiType && representativePoint) {
            threePhaseGroups.push({
                groupKey: groupKey,
                title: title,
                points: { a: phases.a, b: phases.b, c: phases.c }, // Will contain undefined if phase missing
                icon: icon,
                unit: commonUnit,
                description: description,
                uiType: commonUiType,
                config: representativePoint // Pass a representative point for group-level config access
            });
        } else {
            individualPoints.push(...potentialGroup);
        }
    });

    const uniqueIndividualPoints = Array.from(new Map(individualPoints.map(p => [p.id, p])).values());
    return { threePhaseGroups, individualPoints: uniqueIndividualPoints };
}

// --- Motion Variants (Enhanced hover effects) ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }; // Slightly faster stagger
const itemVariants = { hidden: { opacity: 0, y: 15, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 14 } } }; // Slightly adjusted spring

const cardHoverEffect = {
    y: -5, // Lift effect
    boxShadow: "0px 12px 25px -5px rgba(0, 0, 0, 0.1), 0px 8px 10px -6px rgba(0, 0, 0, 0.1)", // Enhanced shadow
    transition: { type: 'spring', stiffness: 300, damping: 15 }
};
const darkCardHoverEffect = {
    y: -5,
    boxShadow: "0px 10px 22px -5px rgba(0, 0, 0, 0.2), 0px 6px 8px -6px rgba(0, 0, 0, 0.25)", // Adjusted shadow for dark mode
    transition: { type: 'spring', stiffness: 300, damping: 15 }
};

// --- Circular Gauge Component (Refined Visuals) ---interface CircularGaugeConfig {
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

const CircularGauge: React.FC<CircularGaugeProps> = ({
    value: rawValue,
    unit = '',
    label,
    size = 90,
    strokeWidth = 9,
    config
}) => {
    const { resolvedTheme } = useTheme();
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * 0.75;
    const startAngle = 225;

    const factor = config.factor ?? 1;
    const value = typeof rawValue === 'number' ? rawValue * factor : null;
    const min = config.min ?? 0;
    const max = config.max ?? 100;

    const getNormalizedValue = () => {
        if (value === null || max === min) return 0;
        const clampedValue = Math.max(min, Math.min(max, value));
        return (clampedValue - min) / (max - min);
    };

    const normalizedValue = getNormalizedValue();
    const offset = circumference * 0.25 + circumference * (1 - normalizedValue) * 0.75;

    const getColor = () => {
        if (value === null) return 'gray';
        const range = max - min;
        const buffer = range * 0.05;

        if (value < min || value > max) return 'red';
        if (value < min + buffer || value > max - buffer) return 'yellow';
        return 'green';
    };

    const color = getColor();
    const isCritical = color === 'red';
    const gradientId = `gauge-gradient-${config.nodeId}`;
    const shadowColor = {
        green: 'shadow-green-400/30',
        yellow: 'shadow-yellow-400/40',
        red: 'shadow-red-500/50',
        gray: 'shadow-gray-400/20'
    }[color];

    const formatValue = (val: number | null): string => {
        if (val === null) return '--';
        const absVal = Math.abs(val);
        let options: Intl.NumberFormatOptions = {};
        if (absVal < 1 && absVal > 0) options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
        else if (absVal < 10) options = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
        else options = { maximumFractionDigits: 0 };

        if ((config.dataType === 'Boolean' || config.nodeId.includes('-status') || config.nodeId.includes('-switch')) && (val === 0 || val === 1)) {
            return val === 1 ? 'ON' : 'OFF';
        }

        return val.toLocaleString(undefined, options);
    };

    const displayValue = formatValue(value);
    const isOnOff = displayValue === 'ON' || displayValue === 'OFF';

    const lineY1 = size / 2 - radius - strokeWidth / 2;
    const lineY2 = size / 2 - radius + strokeWidth / 2;

    return (
        <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${shadowColor}`}>
            {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
            <div
                className="relative"
                style={{ width: size, height: size }}
                aria-label={`Gauge showing value ${displayValue} ${unit}`}
            >
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-[225deg]">
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                            {color === 'green' && (
                                <>
                                    <stop offset="0%" stopColor="#4ade80" />
                                    <stop offset="100%" stopColor="#22c55e" />
                                </>
                            )}
                            {color === 'yellow' && (
                                <>
                                    <stop offset="0%" stopColor="#facc15" />
                                    <stop offset="100%" stopColor="#eab308" />
                                </>
                            )}
                            {color === 'red' && (
                                <>
                                    <stop offset="0%" stopColor="#f87171" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </>
                            )}
                            {color === 'gray' && (
                                <>
                                    <stop offset="0%" stopColor="#9ca3af" />
                                    <stop offset="100%" stopColor="#6b7280" />
                                </>
                            )}
                        </linearGradient>
                    </defs>

                    {/* Background Track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        strokeWidth={strokeWidth}
                        className="stroke-muted opacity-30"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * 0.25}
                        strokeLinecap="round"
                    />

                    {/* Value Arc */}
                    {value !== null && !isNaN(normalizedValue) && (
                        <motion.circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={`url(#${gradientId})`}
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ type: 'spring', stiffness: 60, damping: 15, mass: 0.8 }}
                        />
                    )}

                </svg>

                {/* Center Value */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={`${config.nodeId}-${displayValue}`}
                            className={`flex items-end space-x-1 ${isCritical ? 'animate-pulse' : ''
                                }`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.25 }}
                        >
                            <motion.span
                                className={`text-xl lg:text-2xl font-semibold leading-tight ${color === 'gray'
                                        ? 'text-muted-foreground'
                                        : `text-${color}-500 dark:text-${color}-400`
                                    }`}
                            >
                                {displayValue}
                            </motion.span>
                            {!isOnOff && unit && (
                                <span className="text-xs text-muted-foreground mt-0.5">{unit}</span>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};


// --- Dashboard Component ---
const Dashboard = () => {
    const { theme, resolvedTheme } = useTheme(); // Use resolvedTheme
    const [nodeValues, setNodeValues] = useState<NodeData>({});
    const [isConnected, setIsConnected] = useState(false);
    const [plcStatus, setPlcStatus] = useState<'online' | 'offline' | 'disconnected'>('disconnected');
    const [currentTime, setCurrentTime] = useState<string>('');
    const ws = useRef<WebSocket | null>(null);
    const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
    const [delay, setDelay] = useState<number>(0);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 10;
    const lastToastTimestamps = useRef<Record<string, number>>({});

    // --- Core Hooks (Time, Delay, PLC Check - minor changes) ---
    useEffect(() => {
        const updateClock = () => setCurrentTime(new Date().toLocaleString('en-GB', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            // day: '2-digit', month: 'short', year: 'numeric' // Slightly cleaner date format
        }));
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const currentDelay = Date.now() - lastUpdateTime;
            setDelay(currentDelay);
            if (isConnected && currentDelay > 25000) { // Increased threshold slightly
                if (typeof window !== 'undefined' && sessionStorage.getItem('reloadingDueToDelay') !== 'true') {
                    console.warn(`WebSocket delay (${currentDelay}ms) exceeded threshold. Reloading page.`);
                    toast({ title: 'Stale Data Detected', description: 'Attempting to refresh connection...', variant: 'destructive', duration: 5000 });
                    sessionStorage.setItem('reloadingDueToDelay', 'true');
                    setTimeout(() => window.location.reload(), 1500); // Add small delay before reload
                }
            } else if (delay < 25000 && typeof window !== 'undefined') {
                sessionStorage.removeItem('reloadingDueToDelay');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lastUpdateTime, isConnected, delay, toast]); // Added toast dependency

    // --- PLC Check ---
    const checkPlcConnection = useCallback(async () => {
        // console.log("Checking PLC connection status..."); // Reduce console noise
        try {
            const res = await fetch('/api/opcua/status');
            if (!res.ok) throw new Error(`API request failed with status ${res.status}`);
            const data = await res.json();
            if (data.connectionStatus && ['online', 'offline', 'disconnected'].includes(data.connectionStatus)) {
                // Only update state if it changes to prevent unnecessary re-renders
                if (data.connectionStatus !== plcStatus) {
                    // console.log("Received PLC Status:", data.connectionStatus);
                    setPlcStatus(data.connectionStatus);
                }
            } else {
                console.error("Invalid status received from PLC API:", data);
                if (plcStatus !== 'disconnected') setPlcStatus('disconnected');
            }
        } catch (err) {
            // console.error("Failed to fetch PLC connection status:", err); // Reduce noise
            if (plcStatus !== 'disconnected') setPlcStatus('disconnected');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plcStatus]); // Depend on plcStatus to check if update is needed

    useEffect(() => {
        checkPlcConnection();
        const interval = setInterval(checkPlcConnection, 7000); // Check periodically
        return () => clearInterval(interval);
    }, [checkPlcConnection]);

    // --- WebSocket Logic (Minor logging adjustments) ---
    const connectWebSocket = useCallback(() => {
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;
        if (typeof window !== 'undefined' && sessionStorage.getItem('reloadingDueToDelay') === 'true') { setTimeout(() => sessionStorage.removeItem('reloadingDueToDelay'), 2000); return; }

        setIsConnected(false);
        const delayMs = Math.min(3000 * Math.pow(1.8, reconnectAttempts.current), 45000); // Adjusted reconnect backoff
        // console.log(`Attempting WS connection in ${Math.round(delayMs/1000)}s (attempt ${reconnectAttempts.current + 1})`); // Simpler log

        if (reconnectInterval.current) clearTimeout(reconnectInterval.current); // Clear previous timer

        reconnectInterval.current = setTimeout(() => {
            console.log("Connecting WebSocket...");
            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = () => {
                console.log("WebSocket connected");
                setIsConnected(true);
                setLastUpdateTime(Date.now());
                reconnectAttempts.current = 0;
                if (reconnectInterval.current) { clearTimeout(reconnectInterval.current); reconnectInterval.current = null; }
                toast({ title: 'Connection Restored', description: 'Live data feed active.', variant: 'default', duration: 3000 });
            };
            ws.current.onmessage = (event) => {
                try {
                    const d = JSON.parse(event.data as string);
                    setNodeValues(p => ({ ...p, ...d }));
                    setLastUpdateTime(Date.now());
                } catch (e) { console.error("WebSocket message parse error:", e); }
            };
            ws.current.onerror = (event) => {
                console.error("WebSocket error event:", event);
                console.error("WebSocket error:", 'Connection error.'); // Keep the original error message

                // Re-introduce redirection logic
                if (typeof window !== 'undefined') {
                    const redir = sessionStorage.getItem('opcuaRedirected');
                    if (!redir || redir === 'false') {
                        console.warn("WebSocket connection error, attempting to redirect to API endpoint for potential authentication/setup...");
                        // Construct the URL relative to the current origin
                        const apiUrl = new URL('/api/opcua', window.location.origin);
                        console.log("Redirecting to:", apiUrl.href);
                        sessionStorage.setItem('opcuaRedirected', 'true'); // Set flag before redirecting
                        window.location.href = apiUrl.href; // Perform the redirect
                    } else {
                        console.warn("WebSocket error occurred, but redirection already attempted. Manual intervention may be required.");
                        // Optionally, clear the flag after some time if the user navigates back manually?
                        // Or provide a button to try redirecting again?
                    }
                }

                // Still attempt to close the errored socket if it exists
                if (ws.current) {
                    console.log("Closing WebSocket due to error.");
                    // Don't set onclose to null here, let the regular onclose handler manage reconnect attempts if configured
                    ws.current.close();
                }
            };
            ws.current.onclose = (event) => {
                console.log(`WebSocket disconnected. Code: ${event.code}, Reason: '${event.reason || '-'}'`);
                setIsConnected(false);
                ws.current = null;
                if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts && typeof window !== 'undefined' && sessionStorage.getItem('opcuaRedirected') !== 'true') {
                    reconnectAttempts.current++;
                    connectWebSocket(); // Recursive call for reconnect
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    console.warn("Max WebSocket reconnect attempts reached.");
                    toast({ title: 'Connection Error', description: 'Failed to establish live data connection.', variant: 'destructive' });
                }
            };
        }, delayMs);
    }, [toast]); // Added toast dependency

    useEffect(() => {
        if (typeof window === 'undefined') return;
        connectWebSocket();
        sessionStorage.removeItem('opcuaRedirected');
        sessionStorage.removeItem('reloadingDueToDelay');
        return () => {
            if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
            if (ws.current) {
                ws.current.onclose = null;
                ws.current.close(1000);
                ws.current = null;
            }
        };
    }, [connectWebSocket]);


    // --- Send Data (Improved Error Handling) ---
    const sendDataToWebSocket = (nodeId: string, value: boolean | number | string) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                const payload = JSON.stringify({ [nodeId]: value });
                ws.current.send(payload);
                console.log("Sent to WebSocket:", payload);
                // Optimistic UI update feedback (optional)
                // setNodeValues(prev => ({ ...prev, [nodeId]: value }));
                toast({ title: 'Command Sent', description: `Value set for ${dataPoints.find(p => p.nodeId === nodeId)?.name || nodeId}`, duration: 2500 });
            } catch (e) {
                console.error("WebSocket send error:", e);
                toast({ title: 'Send Error', description: 'Failed to send command.', variant: 'destructive' });
            }
        } else {
            console.error("WebSocket not connected, cannot send data.");
            toast({ title: 'Connection Error', description: 'Cannot send command. WebSocket disconnected.', variant: 'destructive' });
            if (!isConnected) connectWebSocket(); // Attempt reconnect if known to be disconnected
        }
    };

    // --- Render Value (Enhanced Styling and Logic) ---
    const renderNodeValueText = useCallback((nodeId: string | undefined, unit: string | undefined, pointConfig?: DataPointConfig): React.ReactNode => {
        if (!nodeId || !pointConfig) return <span className="text-gray-400 dark:text-gray-500">N/A</span>;

        const rawValue = nodeValues[nodeId];
        const key = `${nodeId}-${String(rawValue)}`;
        let content: React.ReactNode;
        let valueClass = "text-foreground font-semibold"; // Default: Use font-semibold for emphasis
        let iconPrefix: React.ReactNode = null;

        if (rawValue === undefined || rawValue === null) {
            content = <span className="text-gray-400 dark:text-gray-500 italic">--</span>;
            if (lastToastTimestamps.current[nodeId]) delete lastToastTimestamps.current[nodeId];
        } else if (rawValue === 'Error') {
            content = <span className="text-red-500 dark:text-red-400 font-semibold">Error</span>;
            iconPrefix = <AlertCircle size={14} className="text-red-500 dark:text-red-400 mr-1 inline-block" />;
            if (lastToastTimestamps.current[nodeId]) delete lastToastTimestamps.current[nodeId];
        } else if (typeof rawValue === 'boolean' || (pointConfig.dataType === 'Boolean' && (rawValue === 0 || rawValue === 1))) {
            const isActive = rawValue === true || rawValue === 1;
            content = isActive ? 'ON' : 'OFF';
            valueClass = `font-semibold ${isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`;
            if (lastToastTimestamps.current[nodeId]) delete lastToastTimestamps.current[nodeId];
        } else if (typeof rawValue === 'number') {
            const factor = pointConfig.factor ?? 1;
            const min = pointConfig.min;
            const max = pointConfig.max;
            let adjustedValue = rawValue * factor;
            let displayValue = formatValue(adjustedValue, pointConfig); // Use helper

            const isOutOfRange = (min !== undefined && adjustedValue < min) || (max !== undefined && adjustedValue > max);

            if (isOutOfRange) {
                valueClass = "text-yellow-600 dark:text-yellow-400 font-semibold";
                iconPrefix = <AlertCircle size={14} className="text-yellow-600 dark:text-yellow-400 mr-1 inline-block" />;

                // Debounced Toast Logic
                const now = Date.now();
                const lastToastTime = lastToastTimestamps.current[nodeId];
                const cooldown = 60 * 1000; // 1 minute cooldown per node ID
                if (!lastToastTime || now - lastToastTime > cooldown) {
                    const direction = (min !== undefined && adjustedValue < min) ? 'below minimum' : 'above maximum';
                    const rangeText = `(${min ?? '-'} to ${max ?? '-'})`;
                    toast({
                        title: 'Value Alert',
                        description: `${pointConfig.name} is ${direction}. Current: ${displayValue}${unit || ''} ${rangeText}.`,
                        variant: 'default', duration: 8000,
                    });
                    lastToastTimestamps.current[nodeId] = now;
                }
            } else {
                if (lastToastTimestamps.current[nodeId]) delete lastToastTimestamps.current[nodeId];
                // Add subtle color hints based on value relative to midpoint if min/max exist
                if (min !== undefined && max !== undefined && min !== max) {
                    const midPoint = (min + max) / 2;
                    const range = max - min;
                    if (adjustedValue > midPoint + range * 0.25) { // Top 25%
                        // valueClass = "text-emerald-600 dark:text-emerald-400 font-semibold"; // Slightly positive indication
                    } else if (adjustedValue < midPoint - range * 0.25) { // Bottom 25%
                        // valueClass = "text-sky-600 dark:text-sky-400 font-semibold"; // Slightly low indication
                    }
                }
            }
            content = <>{displayValue}<span className="text-xs text-muted-foreground ml-1">{unit || ''}</span></>;
        } else if (typeof rawValue === 'string') {
            // Basic status string formatting
            content = <span className="text-sm">{rawValue.length > 30 ? `${rawValue.substring(0, 27)}...` : rawValue}</span>;
            valueClass = "text-muted-foreground font-normal"; // Less emphasis for strings
            if (lastToastTimestamps.current[nodeId]) delete lastToastTimestamps.current[nodeId];
        } else {
            content = <span className="text-yellow-500">?</span>; // Unknown type
            if (lastToastTimestamps.current[nodeId]) delete lastToastTimestamps.current[nodeId];
        }

        return (
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={key}
                    className={`inline-flex items-center ${valueClass}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "linear" }} // Faster, linear transition
                >
                    {iconPrefix}{content}
                </motion.span>
            </AnimatePresence>
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeValues, toast]); // Keep dependencies minimal

    // Helper to format numeric values consistently
    const formatValue = (val: number | null, config: DataPointConfig): string => {
        if (val === null) return '--';
        const absVal = Math.abs(val);
        let options: Intl.NumberFormatOptions = {};
        if (absVal < 1 && absVal !== 0) options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
        else if (absVal < 10) options = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
        else options = { maximumFractionDigits: 0 };

        // If it's likely an integer type from config, always show 0 decimals
        if (config.dataType === 'Int16' || config.dataType === 'Boolean') {
            options = { maximumFractionDigits: 0 };
        }

        return val.toLocaleString(undefined, options);
    };


    // --- Process and Group Data Points ---
    const { threePhaseGroups, individualPoints } = useMemo(() => groupDataPoints(configuredDataPoints), []);

    // --- Filter points (Categorize for layout) ---
    const controlPoints = individualPoints.filter(p => p.uiType === 'button' || p.uiType === 'switch');
    const gaugePointsIndividual = individualPoints.filter(p => p.uiType === 'gauge');
    const displayPointsIndividual = individualPoints.filter(p => p.uiType === 'display');
    // const displayGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'display'); // Already grouped below
    // const gaugeGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'gauge'); // Already grouped below

    // Define Layout Sections
    const sections = useMemo(() => [
        { title: "Controls & Settings", points: controlPoints },
        { title: "System Overview & Gauges", points: [...gaugePointsIndividual, ...threePhaseGroups.filter(g => g.uiType === 'gauge')] },
        {
            title: "Three Phase Readings",
            points: threePhaseGroups.filter(g => g.uiType === 'display'),
        },
        {
            title: "Individual Readings",
            points: displayPointsIndividual,
        }], [gaugePointsIndividual, threePhaseGroups, displayPointsIndividual, controlPoints]);


    const currentHoverEffect = resolvedTheme === 'dark' ? darkCardHoverEffect : cardHoverEffect;

    // --- Component Return (Improved Layout & Styling) ---
    return (
        <div className="min-h-screen text-foreground p-4 md:p-6 lg:p-8 transition-colors duration-300">
            <div className="max-w-screen-2xl mx-auto"> {/* Wider max width */}
                {/* Header Section */}
                <motion.div
                    className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center sm:text-left text-gray-800 dark:text-gray-100">
                        ⚡️ Solar Mini-Grid Dashboard
                    </h1>
                    <motion.div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center" initial="hidden" animate="visible" variants={containerVariants}>
                        <motion.div variants={itemVariants}> <PlcConnectionStatus status={plcStatus} /></motion.div>
                        <motion.div variants={itemVariants}><WebSocketStatus isConnected={isConnected} connectFn={connectWebSocket} /></motion.div>
                        <motion.div variants={itemVariants}><ThemeToggle /></motion.div>
                    </motion.div>
                </motion.div>

                {/* Status Bar */}
                <motion.div className="text-xs text-gray-500 dark:text-gray-400 mb-8 flex flex-col sm:flex-row justify-between items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
                    <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>{currentTime}</span>
                        <TooltipProvider delayDuration={100}><Tooltip>
                            <TooltipTrigger asChild>
                                <motion.span className={`font-mono cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 1500 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/60' : delay < 3000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/60' : delay < 5000 ? 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/60' : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/60'}`} whileHover={{ scale: 1.1 }}>
                                    {(delay / 1000).toFixed(1)}s data-lag
                                </motion.span>
                            </TooltipTrigger>
                            <TooltipContent><p>Last update delay: {delay} ms</p></TooltipContent>
                        </Tooltip></TooltipProvider>
                    </div>
                    <span className='font-mono'>v{VERSION}</span>
                </motion.div>

                {/* --- MAIN GRID/FLEX CONTAINER for Sections --- */}
                <motion.div
                    className="space-y-8" // Use space-y for vertical spacing between sections
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {sections.map((section, sectionIndex) => section.points.length > 0 && (
                        <motion.section key={section.title} variants={itemVariants}>
                            <h2 className="text-lg md:text-xl font-semibold tracking-tight text-gray-700 dark:text-gray-300 mb-4 border-l-4 border-primary pl-3">
                                {section.title}
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5"> {/* Responsive Grid */}
                                {/* Render points within the section */}
                                {section.points.map((item) => {
                                    // --- Type Guard for Discriminating Union ---
                                    const isGroupInfo = (obj: any): obj is ThreePhaseGroupInfo => obj && obj.groupKey !== undefined;
                                    const isDataPoint = (obj: any): obj is DataPointConfig => obj && obj.id !== undefined;

                                    if (isGroupInfo(item)) {
                                        // --- RENDER 3-PHASE GROUP ---
                                        const group = item;
                                        const RepresentativeIcon = group.icon || HelpCircle; // Fallback Icon
                                        if (group.uiType === 'gauge') {
                                            return (
                                                <motion.div
                                                    key={group.groupKey}
                                                    className="cursor-default rounded-lg overflow-hidden col-span-1 md:col-span-2" // Gauges take more space
                                                    whileHover={currentHoverEffect}
                                                    variants={itemVariants}
                                                >
                                                    <TooltipProvider delayDuration={200}><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Card className="h-full shadow-md hover:shadow-lg transition-all duration-300 border dark:border-gray-700/60 bg-card">
                                                                <CardHeader className="p-3 bg-muted/40 dark:bg-gray-800/40 border-b dark:border-gray-700/80">
                                                                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                                                                        <RepresentativeIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                                                        <span className="truncate" title={group.title}>{group.title}</span>
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent className="p-4 flex flex-wrap justify-around items-center gap-x-4 gap-y-2">
                                                                    {(['a', 'b', 'c'] as const).map((phase) => {
                                                                        const point = group.points[phase];
                                                                        if (!point) return <div key={phase} className="w-[90px] opacity-50 flex items-center justify-center text-xs text-muted-foreground">(Phase {phase.toUpperCase()})</div>; // Placeholder if phase missing
                                                                        const value = nodeValues[point.nodeId];
                                                                        return (
                                                                            <CircularGauge
                                                                                key={phase} value={typeof value === 'number' ? value : null}
                                                                                unit={group.unit} label={`Phase ${phase.toUpperCase()}`}
                                                                                size={90} strokeWidth={9} config={point}
                                                                            />
                                                                        );
                                                                    })}
                                                                </CardContent>
                                                            </Card>
                                                        </TooltipTrigger>
                                                        {group.description && (<TooltipContent><p>{group.description}</p></TooltipContent>)}
                                                    </Tooltip></TooltipProvider>
                                                </motion.div>
                                            );
                                        } else { // Display Group
                                            return (
                                                <motion.div
                                                    key={group.groupKey}
                                                    className="cursor-default rounded-lg overflow-hidden col-span-1" // Display groups take less space
                                                    whileHover={currentHoverEffect}
                                                    variants={itemVariants}
                                                >
                                                    <TooltipProvider delayDuration={200}><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Card className="h-full shadow-md hover:shadow-lg transition-all duration-300 border dark:border-gray-700/60 bg-card">
                                                                <CardHeader className="p-3 bg-muted/40 dark:bg-gray-800/40 border-b dark:border-gray-700/80">
                                                                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                                                                        <RepresentativeIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                                                        <span className="truncate" title={group.title}>{group.title}</span>
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent className="p-3 space-y-1.5 text-sm">
                                                                    <div className="grid grid-cols-3 gap-x-2 gap-y-1 items-center">
                                                                        {/* Headers */}
                                                                        {(['a', 'b', 'c'] as const).map(phase => (
                                                                            <div key={`head-${phase}`} className="text-xs font-medium text-muted-foreground text-center border-b pb-1 dark:border-gray-700">
                                                                                {group.points[phase] ? `Ph ${phase.toUpperCase()}` : ''}
                                                                            </div>
                                                                        ))}
                                                                        {/* Values */}
                                                                        {(['a', 'b', 'c'] as const).map((phase) => {
                                                                            const point = group.points[phase];
                                                                            return (
                                                                                <div key={phase} className="text-center pt-1 min-h-[26px] flex items-center justify-center text-base"> {/* Slightly larger text */}
                                                                                    {point ? renderNodeValueText(point.nodeId, group.unit, point) : <span className="text-gray-400 dark:text-gray-600">-</span>}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </TooltipTrigger>
                                                        {group.description && (<TooltipContent><p>{group.description}</p></TooltipContent>)}
                                                    </Tooltip></TooltipProvider>
                                                </motion.div>
                                            );
                                        }
                                    } else if (isDataPoint(item)) {
                                        // --- RENDER INDIVIDUAL POINT ---
                                        const point = item;
                                        const PointIcon = point.icon || HelpCircle; // Fallback Icon

                                        if (point.uiType === 'gauge') {
                                            const value = nodeValues[point.nodeId];
                                            return (
                                                <motion.div
                                                    key={point.id}
                                                    className="cursor-default rounded-lg overflow-hidden col-span-1"
                                                    whileHover={currentHoverEffect}
                                                    variants={itemVariants}
                                                >
                                                    <TooltipProvider delayDuration={200}><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Card className="h-full p-3 flex flex-col items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 border dark:border-gray-700/60 bg-card min-h-[170px]"> {/* Min height for consistency */}
                                                                <div className="flex flex-col items-center gap-1 mb-2 text-center">
                                                                    <PointIcon className="w-5 h-5 text-primary flex-shrink-0 mb-1" />
                                                                    <span className="text-xs font-semibold text-card-foreground leading-tight px-1 truncate max-w-[120px]" title={point.name}>{point.name}</span>
                                                                    {(point.min !== undefined || point.max !== undefined) && (
                                                                        <div className="text-xs text-muted-foreground -mt-0.5">({point.min ?? '-'} to {point.max ?? '-'})</div>
                                                                    )}
                                                                </div>
                                                                <CircularGauge
                                                                    value={typeof value === 'number' ? value : null}
                                                                    unit={point.unit} size={100} strokeWidth={10} config={point}
                                                                />
                                                            </Card>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">
                                                            <p>{point.description ?? `Range: ${point.min ?? '-'} to ${point.max ?? '-'}`}</p>
                                                            <p className="text-xs text-muted-foreground">ID: {point.nodeId}</p>
                                                        </TooltipContent>
                                                    </Tooltip></TooltipProvider>
                                                </motion.div>
                                            );
                                        } else if (point.uiType === 'display') {
                                            return (
                                                <motion.div
                                                    key={point.id}
                                                    className="cursor-default rounded-lg overflow-hidden col-span-1"
                                                    whileHover={currentHoverEffect}
                                                    variants={itemVariants}
                                                >
                                                    <TooltipProvider delayDuration={200}><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Card className="h-full p-3 flex items-center justify-between min-h-[64px] shadow-md hover:shadow-lg transition-all duration-300 border dark:border-gray-700/60 bg-card">
                                                                <div className='flex items-center gap-2 overflow-hidden mr-2'>
                                                                    <PointIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                                                    <span className="text-xs font-medium text-muted-foreground truncate" title={point.name}>{point.name}</span>
                                                                </div>
                                                                <div className="text-base text-right flex-shrink-0 pl-2"> {/* Ensure value doesn't wrap easily */}
                                                                    {renderNodeValueText(point.nodeId, point.unit, point)}
                                                                </div>
                                                            </Card>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">
                                                            <p>{point.description ?? 'No description available.'}</p>
                                                            <p className="text-xs text-muted-foreground">ID: {point.nodeId}</p>
                                                        </TooltipContent>
                                                    </Tooltip></TooltipProvider>
                                                </motion.div>
                                            );
                                        } else if (point.uiType === 'button') {
                                            return (
                                                <motion.div key={point.id} className="col-span-1" variants={itemVariants}>
                                                    <TooltipProvider delayDuration={200}><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                                                                <Button
                                                                    onClick={() => sendDataToWebSocket(point.nodeId, true)}
                                                                    className="w-full h-full justify-start p-3 text-left bg-card border dark:border-gray-700/60 rounded-lg shadow-sm hover:bg-muted/60 dark:hover:bg-gray-800/60 hover:shadow-md transition-all text-card-foreground"
                                                                    variant="outline" // Use outline for clearer boundary
                                                                    disabled={!isConnected}
                                                                >
                                                                    <PointIcon className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                                                                    <span className="text-sm font-medium">{point.name}</span>
                                                                </Button>
                                                            </motion.div>
                                                        </TooltipTrigger>
                                                        {point.description && (<TooltipContent side="bottom"><p>{point.description}</p></TooltipContent>)}
                                                    </Tooltip></TooltipProvider>
                                                </motion.div>
                                            );
                                        } else if (point.uiType === 'switch') {
                                            const isChecked = typeof nodeValues[point.nodeId] === 'boolean' ? (nodeValues[point.nodeId] as boolean) : (typeof nodeValues[point.nodeId] === 'number' && nodeValues[point.nodeId] === 1);
                                            const isDisabled = !isConnected || nodeValues[point.nodeId] === undefined || nodeValues[point.nodeId] === 'Error' || nodeValues[point.nodeId] === null;
                                            return (
                                                <motion.div key={point.id} className="col-span-1" variants={itemVariants}>
                                                    <TooltipProvider delayDuration={200}><Tooltip>
                                                        <Card className={`h-full p-3 flex items-center justify-between cursor-default transition-opacity shadow-sm hover:shadow-md border dark:border-gray-700/60 bg-card ${isDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2 overflow-hidden mr-2 flex-1 cursor-help"> {/* Make label trigger tooltip */}
                                                                    <PointIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                                                    <span className="text-xs font-medium truncate text-muted-foreground" title={point.name}>{point.name}</span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <motion.div whileHover={{ scale: isDisabled ? 1 : 1.1 }} whileTap={{ scale: isDisabled ? 1 : 0.95 }} className="flex-shrink-0">
                                                                <Switch
                                                                    checked={isChecked}
                                                                    onCheckedChange={(checked) => sendDataToWebSocket(point.nodeId, checked)}
                                                                    disabled={isDisabled}
                                                                    aria-label={point.name}
                                                                />
                                                            </motion.div>
                                                        </Card>
                                                        {point.description && (<TooltipContent side="bottom"><p>{point.description}</p></TooltipContent>)}
                                                    </Tooltip></TooltipProvider>
                                                </motion.div>
                                            );
                                        }
                                    }
                                    return null; // Should not happen
                                })}
                            </div>
                        </motion.section>
                    ))}
                </motion.div> {/* End Main Grid Container */}

            </div> {/* End max-w container */}
        </div> // End main container
    );
};

export default Dashboard;