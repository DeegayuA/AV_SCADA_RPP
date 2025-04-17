'use client';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { dataPoints as configuredDataPoints } from '@/config/dataPoints'; // Assuming this path is correct
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
import { WS_URL, VERSION } from '@/config/constants'; // Removed unused constants
import { Activity, AudioWaveform, Battery, Zap, Gauge, Sun, Moon, AlertCircle, Power, Sigma, Thermometer, Wind, Droplets } from 'lucide-react'; // Added more icons potentially useful for gauges
import { TextHoverEffect } from '@/components/ui/text-hover-effect'; // Assuming this component exists

// Interfaces (remain the same)
export interface DataPointConfig {
    id: string;
    name: string;
    nodeId: string;
    dataType: 'Boolean' | 'Int16' | 'Float' | 'String';
    uiType: 'display' | 'button' | 'switch' | 'gauge';
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    unit?: string;
    min?: number;
    max?: number;
    description?: string;
    category: 'battery' | 'grid' | 'inverter' | 'control' | 'three-phase';
    factor?: number;
    phase?: 'a' | 'b' | 'c' | 'x';
    isSinglePhase?: boolean;
    displayName?: string;
    threePhaseGroup: string;
}

const dataPoints: DataPointConfig[] = configuredDataPoints as DataPointConfig[];

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
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    unit?: string;
    description?: string;
    uiType: 'display' | 'gauge';
}


// Helper Components (PlcConnectionStatus, WebSocketStatus, ThemeToggle - no changes needed)
const PlcConnectionStatus = ({ status }: { status: 'online' | 'offline' | 'disconnected' }) => {
    let statusText = '';
    let dotClass = '';
    let title = `Status: ${status}`;
    let clickHandler = () => { }; // Default no-op

    switch (status) {
        case 'online':
            statusText = 'PLC: Online (Remote)';
            dotClass = 'bg-blue-500'; // Blue for remote online
            title = 'PLC connected remotely';
            break;
        case 'offline':
            statusText = 'PLC: Online (Local)';
            dotClass = 'bg-sky-400'; // Sky blue/Cyan for local online
            title = 'PLC connected locally';
            break;
        case 'disconnected':
            statusText = 'PLC: Disconnected';
            dotClass = 'bg-gray-400 dark:bg-gray-600'; // Gray for disconnected
            title = 'PLC Disconnected. Click to try reconnecting.';
            // Add reload handler specifically for disconnected state
            clickHandler = () => {
                if (typeof window !== 'undefined') {
                    console.log("Reloading page to re-attempt connection...");
                    window.location.reload();
                }
            };
            break;
    }
    const dotVariants = { initial: { scale: 0 }, animate: { scale: 1 }, pulse: { scale: [1, 1.2, 1], transition: { duration: 1, repeat: Infinity, ease: "easeInOut" } } };
    return (
        <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                             className={`w-3.5 h-3.5 rounded-full ${dotClass} ${status === 'disconnected' ? 'cursor-pointer' : ''} flex-shrink-0`} // Add cursor only when clickable
                             variants={dotVariants}
                             initial="initial"
                             animate={status !== 'disconnected' ? ["animate", "pulse"] : "animate"} // Pulse only when connected
                             onClick={clickHandler} // Assign the click handler
                        />
                    </TooltipTrigger>
                    <TooltipContent><p>{title}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <span className="text-xs sm:text-sm">{statusText}</span>
        </motion.div>
    );
};

const WebSocketStatus = ({ isConnected, connectFn }: { isConnected: boolean; connectFn: () => void }) => {
    const title = isConnected ? "WebSocket Connected" : "WebSocket Disconnected. Click to attempt reconnect.";
    return (
        <motion.div className="flex items-center gap-2 cursor-pointer" onClick={connectFn} title={title} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <motion.div className={`w-3.5 h-3.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} flex-shrink-0`} animate={{ scale: isConnected ? [1, 1.2, 1] : 1 }} transition={{ duration: 1, repeat: isConnected ? Infinity : 0, ease: "easeInOut" }} />
            <span className="text-xs sm:text-sm font-medium">WS: {isConnected ? 'Live' : 'Offline'}</span>
        </motion.div>
    );
};

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const Icon = theme === 'dark' ? Sun : Moon;
    const title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
    return (
        <TooltipProvider delayDuration={100}><Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={title} asChild>
                    <motion.button whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }}>
                        <Icon className="w-5 h-5" />
                    </motion.button>
                </Button>
            </TooltipTrigger><TooltipContent><p>{title}</p></TooltipContent>
        </Tooltip></TooltipProvider>
    )
}

// --- Grouping function (remains the same) ---
function groupDataPoints(pointsToGroup: DataPointConfig[]): { threePhaseGroups: ThreePhaseGroupInfo[], individualPoints: DataPointConfig[] } {
    // ... (Grouping logic remains identical to previous version) ...
    const groupsByKey = new Map<string, DataPointConfig[]>();
    const individualPoints: DataPointConfig[] = [];
    const threePhaseGroups: ThreePhaseGroupInfo[] = [];

    // 1. Initial classification
    pointsToGroup.forEach(point => {
        const canBeGrouped =
            point.category === 'three-phase' &&
            !!point.threePhaseGroup &&
            point.phase && ['a', 'b', 'c'].includes(point.phase) &&
            !point.isSinglePhase &&
            (point.uiType === 'display' || point.uiType === 'gauge');

        if (canBeGrouped) {
            const groupKey = point.threePhaseGroup;
            if (!groupsByKey.has(groupKey)) {
                groupsByKey.set(groupKey, []);
            }
            groupsByKey.get(groupKey)!.push(point);
        } else {
            individualPoints.push(point);
        }
    });

    // 2. Validate and create groups
    groupsByKey.forEach((potentialGroup, groupKey) => {
        const phases: { a?: DataPointConfig, b?: DataPointConfig, c?: DataPointConfig } = {};
        let validGroup = true;
        let commonUiType: 'display' | 'gauge' | null = null;
        let commonUnit: string | undefined = undefined;
        let icon: React.ComponentType<React.SVGProps<SVGSVGElement>> | undefined = undefined;
        let description: string | undefined = undefined;
        let title: string = groupKey;

        if (potentialGroup.length !== 3) {
            validGroup = false;
        } else {
            const refPoint = potentialGroup[0];
            commonUiType = refPoint.uiType as 'display' | 'gauge';
            commonUnit = refPoint.unit;
            icon = refPoint.icon;
            const phaseAPoint = potentialGroup.find(p => p.phase === 'a');
            const sourceForTitle = phaseAPoint || refPoint;
            title = sourceForTitle.displayName || sourceForTitle.name || groupKey;
            title = title.replace(/ Phase [ABC]$/i, '').replace(/ Ph [ABC]$/i, '').trim();
            description = sourceForTitle.description?.replace(/ Phase [ABC]/i, '').trim() || `3-Phase ${title}`;

            for (const point of potentialGroup) {
                if (
                    point.threePhaseGroup !== groupKey ||
                    !point.phase ||
                    !['a', 'b', 'c'].includes(point.phase) ||
                    phases[point.phase as 'a' | 'b' | 'c'] ||
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

            if (!phases.a || !phases.b || !phases.c) {
                validGroup = false;
            }
        }

        // 3. Final decision
        if (validGroup && commonUiType && phases.a && phases.b && phases.c) {
            threePhaseGroups.push({
                groupKey: groupKey,
                title: title,
                points: { a: phases.a, b: phases.b, c: phases.c },
                icon: icon,
                unit: commonUnit,
                description: description,
                uiType: commonUiType,
            });
        } else {
            individualPoints.push(...potentialGroup);
        }
    });

    const uniqueIndividualPoints = Array.from(new Map(individualPoints.map(p => [p.id, p])).values());
    return { threePhaseGroups, individualPoints: uniqueIndividualPoints };
}


// --- Motion Variants (remain the same) ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 20, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 12 } } };
const cardHoverEffect = { scale: 1.03, y: -4, boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.1)", transition: { type: 'spring', stiffness: 300, damping: 15 } };
const darkCardHoverEffect = { ...cardHoverEffect, boxShadow: "0px 8px 18px rgba(255, 255, 255, 0.08)" };


// --- Circular Gauge Component (remains the same) ---
interface CircularGaugeProps {
    value: number | null | undefined;
    min?: number;
    max?: number;
    unit?: string;
    label?: string; // Optional label (like Phase A)
    size?: number;
    strokeWidth?: number;
    config: DataPointConfig; // Pass the whole config for context
}

const CircularGauge: React.FC<CircularGaugeProps> = ({
    value: rawValue,
    min = 0,
    max = 100,
    unit = '',
    label,
    size = 80, // Default size
    strokeWidth = 8, // Default stroke width
    config
}) => {
    const { theme } = useTheme();
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    // Use 3/4 circle (270 degrees)
    const arcLength = circumference * 0.75;
    const startAngle = 0;
    const endAngle = 270; 
    // --- Value Processing & Clamping ---
    const factor = config.factor ?? 1;
    const value = typeof rawValue === 'number' ? rawValue * factor : null;

    const getNormalizedValue = () => {
        if (value === null || value === undefined || max === min) {
            return 0; // No value or invalid range
        }
        // Clamp value within min/max for percentage calculation, but use original for color
        const clampedValue = Math.max(min, Math.min(max, value));
        return (clampedValue - min) / (max - min);
    };

    const normalizedValue = getNormalizedValue();
    const offset = arcLength * (1 - normalizedValue);

    // --- Color Logic (3 states + default/error) ---
    const getColor = () => {
        if (value === null || value === undefined) return 'stroke-gray-400 dark:stroke-gray-600'; // Undefined/No Data
        if (config.min === undefined || config.max === undefined) return 'stroke-blue-500 dark:stroke-blue-400'; // No range defined

        if (value < config.min) return 'stroke-yellow-500 dark:stroke-yellow-400'; // Low
        if (value > config.max) return 'stroke-red-500 dark:stroke-red-400';       // High
        return 'stroke-green-500 dark:stroke-green-400';                           // Normal/Good
    };

    const colorClass = getColor();

    // --- Formatting ---
    const formatValue = (val: number | null): string => {
        if (val === null) return '---';
        if (config.dataType === 'Int16' || config.dataType === 'Boolean') {
            return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
        } else if (Math.abs(val) >= 1000) {
            return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
        } else if (Math.abs(val) >= 10) {
            return val.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
        } else {
            return val.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
        }
    };

    const displayValue = formatValue(value);

    // Calculate rotation for the arc
    const rotation = `rotate(${startAngle + 135} ${size / 2} ${size / 2})`; // Rotate so the gap is at the bottom


    return (
        <div className="flex flex-row items-center text-center">
            {label && <span className="text-xs font-medium text-muted-foreground mb-1">{label}</span>}
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <defs>
                        {/* Define gradients if needed */}
                    </defs>
                    <motion.path
                        d={`M ${size / 2 + radius * Math.cos(startAngle * Math.PI / 180)} ${size / 2 + radius * Math.sin(startAngle * Math.PI / 180)} A ${radius} ${radius} 0 1 1 ${size / 2 + radius * Math.cos(endAngle * Math.PI / 180)} ${size / 2 + radius * Math.sin(endAngle * Math.PI / 180)}`}
                        fill="none"
                        className="stroke-gray-200 dark:stroke-gray-700" // Background track color
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        transform={rotation} // Apply rotation
                    />
                    {value !== null && ( // Only render value arc if value exists
                        <motion.path
                            d={`M ${size / 2 + radius * Math.cos(startAngle * Math.PI / 180)} ${size / 2 + radius * Math.sin(startAngle * Math.PI / 180)} A ${radius} ${radius} 0 1 1 ${size / 2 + radius * Math.cos(endAngle * Math.PI / 180)} ${size / 2 + radius * Math.sin(endAngle * Math.PI / 180)}`}
                            fill="none"
                            className={colorClass} // Dynamic color class
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={arcLength}
                            strokeDashoffset={offset}
                            initial={{ strokeDashoffset: arcLength }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                            transform={rotation} // Apply rotation
                        />
                    )}
                </svg>
                {/* Centered Value Text */}
                <div className="absolute inset-0 flex flex-row items-center justify-center">
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                            key={`${config.nodeId}-${value}`} // Key for animation on change
                            className={`text-lg font-semibold ${colorClass.replace('stroke-', 'text-')}`} // Match text color roughly
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                            {displayValue}
                        </motion.span>
                    </AnimatePresence>
                    <span className="text-xs text-muted-foreground -mt-1">{unit}</span>
                </div>
            </div>
        </div>
    );
};


// --- Dashboard Component ---
const Dashboard = () => {
    const { theme } = useTheme();
    const [nodeValues, setNodeValues] = useState<NodeData>({});
    const [isConnected, setIsConnected] = useState(false);
    const [isPlcConnected, setIsPlcConnected] = useState<'online' | 'offline' | 'disconnected'>('disconnected');
    const [currentTime, setCurrentTime] = useState<string>('');
    const ws = useRef<WebSocket | null>(null);
    const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
    const [delay, setDelay] = useState<number>(0);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 10;
    const lastToastTimestamps = useRef<Record<string, number>>({});

    // --- Core Hooks (Time, Delay, PLC Check - no changes) ---
    useEffect(() => { /* Current time update */
        const interval = setInterval(() => { setCurrentTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: '2-digit', year: 'numeric' })); }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { /* Delay monitoring and reload */
        const interval = setInterval(() => {
            const currentDelay = Date.now() - lastUpdateTime;
            setDelay(currentDelay);
            if (isConnected && currentDelay > 20000) {
                if (typeof window !== 'undefined' && sessionStorage.getItem('reloadingDueToDelay') !== 'true') {
                    console.warn(`WebSocket delay (${currentDelay}ms) exceeded 20 seconds. Reloading page.`);
                    sessionStorage.setItem('reloadingDueToDelay', 'true');
                    window.location.reload();
                }
            }
        }, 1000);
        if (delay < 20000 && typeof window !== 'undefined') { sessionStorage.removeItem('reloadingDueToDelay'); }
        return () => clearInterval(interval);
    }, [lastUpdateTime, isConnected, delay]);

    const [plcStatus, setPlcStatus] = useState<'online' | 'offline' | 'disconnected'>('disconnected'); // Initialize state

    const checkPlcConnection = useCallback(async () => {
        console.log("Checking PLC connection status...");
        try {
            const res = await fetch('/api/opcua/status'); // Your API endpoint
            if (!res.ok) {
                // Handle HTTP errors (like 500 Internal Server Error)
                throw new Error(`API request failed with status ${res.status}`);
            }
            const data = await res.json();
    
            // *** Use the status string directly from the API response ***
            if (data.connectionStatus && ['online', 'offline', 'disconnected'].includes(data.connectionStatus)) {
                 console.log("Received PLC Status:", data.connectionStatus);
                 setPlcStatus(data.connectionStatus);
            } else {
                 console.error("Invalid status received from API:", data);
                 setPlcStatus('disconnected'); // Fallback to disconnected on unexpected response
            }
    
        } catch (err) {
            console.error("Failed to fetch PLC connection status:", err);
            setPlcStatus('disconnected'); // Set to disconnected on fetch error
        }
    }, []); // Add dependencies if needed, though likely none for this basic fetch
    
    // Call checkPlcConnection on component mount and potentially periodically
    useEffect(() => {
        checkPlcConnection();
        // Optional: Set up an interval to periodically check the status
        // const intervalId = setInterval(checkPlcConnection, 30000); // Check every 30 seconds
        // return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, [checkPlcConnection]);


    useEffect(() => { /* Periodic PLC check */
        checkPlcConnection();
        const interval = setInterval(checkPlcConnection, 7000);
        return () => clearInterval(interval);
    }, [checkPlcConnection]);

    // --- WebSocket Logic (remains the same) ---
    const connectWebSocket = useCallback(() => {
        // ... (WebSocket connection logic - no changes needed) ...
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;
        if (typeof window !== 'undefined' && sessionStorage.getItem('reloadingDueToDelay') === 'true') { setTimeout(() => sessionStorage.removeItem('reloadingDueToDelay'), 2000); return; }

        setIsConnected(false);
        const delayMs = Math.min(5000 * Math.pow(2, reconnectAttempts.current), 60000);
        console.log(`Attempting WS connection in ${delayMs}ms (attempt ${reconnectAttempts.current + 1}): ${WS_URL}`);

        reconnectInterval.current = setTimeout(() => {
            console.log("Connecting WebSocket...");
            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = () => {
                console.log("WebSocket connected");
                setIsConnected(true);
                setLastUpdateTime(Date.now());
                reconnectAttempts.current = 0;
                if (reconnectInterval.current) { clearTimeout(reconnectInterval.current); reconnectInterval.current = null; }
            };
            ws.current.onmessage = (event) => {
                try {
                    const d = JSON.parse(event.data as string);
                    setNodeValues(p => ({ ...p, ...d }));
                    setLastUpdateTime(Date.now());
                } catch (e) {
                    console.error("WebSocket message parse error:", e);
                }
            };
            ws.current.onerror = (event) => {
                console.error("WebSocket error event:", event);
                console.error("WebSocket error:", 'Connection error.');
                if (typeof window !== 'undefined') {
                    const redir = sessionStorage.getItem('opcuaRedirected');
                    if (!redir || redir === 'false') {
                        console.warn("WebSocket error, potentially redirecting..."); // Modified message
                        const url = `${window.location.protocol}//${window.location.hostname}:${window.location.port || (window.location.protocol === 'https:' ? '443' : '80')}/api/opcua`;
                        sessionStorage.setItem('opcuaRedirected', 'true');
                        window.location.href = url; // Disable automatic redirect
                    } else {
                        console.warn("WebSocket error, already redirected.");
                    }
                }
            };
            ws.current.onclose = (event) => {
                console.log(`WebSocket disconnected. Code: ${event.code}, Reason: '${event.reason || '-'}'`);
                setIsConnected(false);
                ws.current = null;
                if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts && typeof window !== 'undefined' && sessionStorage.getItem('opcuaRedirected') !== 'true') {
                    reconnectAttempts.current++;
                    connectWebSocket();
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    console.warn("Max WebSocket reconnect attempts reached.");
                    toast({ title: 'Error', description: 'Failed to connect to WebSocket after multiple attempts.', variant: 'destructive' });
                }
            };
        }, delayMs);
    }, [toast]);

    useEffect(() => { /* Initial connection & cleanup */
        if (typeof window === 'undefined') return;
        connectWebSocket();
        sessionStorage.removeItem('opcuaRedirected');
        sessionStorage.removeItem('reloadingDueToDelay');
        return () => {
            if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
            if (ws.current) {
                ws.current.onclose = null; // Prevent reconnect logic on manual close
                ws.current.close(1000);
                ws.current = null;
            }
        };
    }, [connectWebSocket]);


    // --- Send Data (remains the same) ---
    const sendDataToWebSocket = (nodeId: string, value: boolean | number | string) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                const payload = JSON.stringify({ [nodeId]: value });
                ws.current.send(payload);
                console.log("Sent to WebSocket:", payload);
            } catch (e) {
                console.error("WebSocket send error:", e);
                toast({ title: 'Error', description: 'Failed to send command.', variant: 'destructive' });
            }
        } else {
            console.error("WebSocket not connected.");
            toast({ title: 'Error', description: 'Cannot send command. WebSocket disconnected.', variant: 'destructive' });
            connectWebSocket(); // Attempt reconnect on send failure
        }
    };

    // --- Render Value (Simplified for non-gauge text display, toast logic remains) ---
    const renderNodeValueText = useCallback((nodeId: string | undefined, unit: string | undefined, pointConfig?: DataPointConfig): React.ReactNode => {
        // ... (renderNodeValueText logic remains identical to previous version) ...
        if (!nodeId) return <span className="text-gray-400 dark:text-gray-600">N/A</span>;
        const rawValue = nodeValues[nodeId];
        const dataPoint = pointConfig ?? dataPoints.find((p) => p.nodeId === nodeId);
        const key = `${nodeId}-${String(rawValue)}`;
        let content: React.ReactNode;
        let valueClass = "text-foreground font-medium";

        if (rawValue === undefined || rawValue === null) {
            content = <span className="text-gray-400 dark:text-gray-500 italic">---</span>;
            if (lastToastTimestamps.current[nodeId] !== undefined) delete lastToastTimestamps.current[nodeId];
        } else if (rawValue === 'Error') {
            content = <span className="text-red-500 font-semibold flex items-center gap-1"><AlertCircle size={14} /> Error</span>;
            if (lastToastTimestamps.current[nodeId] !== undefined) delete lastToastTimestamps.current[nodeId];
        } else if (typeof rawValue === 'boolean') {
            content = <span className={`font-semibold ${rawValue ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{rawValue ? 'ON' : 'OFF'}</span>;
            if (lastToastTimestamps.current[nodeId] !== undefined) delete lastToastTimestamps.current[nodeId];
        } else if (typeof rawValue === 'number') {
            const factor = dataPoint?.factor ?? 1;
            const min = dataPoint?.min;
            const max = dataPoint?.max;
            let adjustedValue = rawValue * factor;
            let displayValue: string;

            if (dataPoint?.dataType === 'Int16' || dataPoint?.dataType === 'Boolean') {
                displayValue = adjustedValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
            } else if (Math.abs(adjustedValue) >= 1000) {
                displayValue = adjustedValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
            } else if (Math.abs(adjustedValue) >= 10) {
                displayValue = adjustedValue.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
            } else {
                displayValue = adjustedValue.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
            }

            const isOutOfRange = (min !== undefined && adjustedValue < min) || (max !== undefined && adjustedValue > max);

            if (isOutOfRange) {
                valueClass = "text-yellow-500 dark:text-yellow-400 font-semibold";

                const now = Date.now();
                const lastToastTime = lastToastTimestamps.current[nodeId];
                const thirtySeconds = 30 * 1000;
                if (lastToastTime === undefined || now - lastToastTime > thirtySeconds) {
                    const direction = (min !== undefined && adjustedValue < min) ? 'below minimum' : 'above maximum';
                    const rangeText = `(${min ?? '-'} to ${max ?? '-'})`;
                    toast({
                        title: 'Value Alert',
                        description: `${dataPoint?.displayName || dataPoint?.name || nodeId} is ${direction}. Current: ${displayValue}${unit || ''}, Range: ${rangeText}.`,
                        variant: 'default', duration: 10000,
                    });
                    lastToastTimestamps.current[nodeId] = now;
                }
            } else {
                if (lastToastTimestamps.current[nodeId] !== undefined) delete lastToastTimestamps.current[nodeId];
            }
            content = <>{displayValue}<span className="text-xs text-muted-foreground ml-0.5">{unit || ''}</span></>;
        } else if (typeof rawValue === 'string') {
            content = <>{rawValue.length > 25 ? `${rawValue.substring(0, 22)}...` : rawValue}{unit ? <span className="text-xs text-muted-foreground ml-0.5">{unit}</span> : ''}</>;
            if (lastToastTimestamps.current[nodeId] !== undefined) delete lastToastTimestamps.current[nodeId];
        } else {
            content = <span className="text-yellow-500">?</span>;
            if (lastToastTimestamps.current[nodeId] !== undefined) delete lastToastTimestamps.current[nodeId];
        }

        return (
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={key}
                    className={valueClass}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {content}
                </motion.span>
            </AnimatePresence>
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeValues, toast]);


    // --- Process and Group Data Points (remains the same) ---
    const { threePhaseGroups, individualPoints } = useMemo(() => groupDataPoints(dataPoints), []);

    // --- Filter points (remains the same) ---
    const controlPoints = individualPoints.filter(p => p.uiType === 'button' || p.uiType === 'switch');
    const gaugePointsIndividual = individualPoints.filter(p => p.uiType === 'gauge');
    const displayPointsIndividual = individualPoints.filter(p => p.uiType === 'display');
    const displayGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'display');
    const gaugeGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'gauge');

    // --- Component Return (Flex Row Layout for Sections) ---
    return (
        <div className="min-h-screen text-foreground p-4 md:p-6 lg:p-8 transition-colors duration-300 rounded-lg bg-background dark:bg-background-dark border dark:border-gray-800">
            <div className="mx-auto">
                {/* Header Section (remains the same) */}
                <motion.div
                    className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <h1 className="text-2xl md:text-3xl font-bold text-center sm:text-left text-gray-800 dark:text-gray-100">
                        Solar Mini-Grid Dashboard
                    </h1>
                    <motion.div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center" initial="hidden" animate="visible" variants={containerVariants}>
                        <motion.div variants={itemVariants}> <PlcConnectionStatus status={plcStatus} /></motion.div>
                        <motion.div variants={itemVariants}><WebSocketStatus isConnected={isConnected} connectFn={connectWebSocket} /></motion.div>
                        <motion.div variants={itemVariants}><ThemeToggle /></motion.div>
                    </motion.div>
                </motion.div>

                {/* Status Bar (remains the same) */}
                <motion.div className="text-xs text-gray-500 dark:text-gray-400 mb-8 flex flex-row sm:flex-row justify-between items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
                    <div className="flex items-center gap-2">
                        <span>{currentTime}</span>
                        <TooltipProvider delayDuration={100}><Tooltip>
                            <TooltipTrigger asChild><motion.span className={`font-medium cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 1500 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-800/50' : delay < 3000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-800/50' : delay < 5000 ? 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-800/50' : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-800/50'}`} whileHover={{ scale: 1.1 }}>{(delay / 1000).toFixed(1)}s</motion.span></TooltipTrigger>
                            <TooltipContent><p>Last update delay ({delay} ms)</p></TooltipContent>
                        </Tooltip></TooltipProvider>
                    </div>
                    <span className='font-mono'>v{VERSION}</span>
                </motion.div>

                {/* --- MAIN CONTAINER for Sections --- */}
                <motion.div
                    className="flex flex-col gap-6" 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* --- Section 1: Three-Phase Items --- */}
                    {threePhaseGroups.length > 0 && (
                        <motion.div
                            className="w-auto flex flex-col flex-wrap gap-4 md:gap-6"
                            variants={itemVariants} // Apply item variant to the whole section container
                        >
                            <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-400 -mb-2 md:-mb-0">
                                Three-Phase Systems
                            </h2>

                            {/* Inner container for 3-phase cards (flex wrap) */}
                            <div className="flex flex-wrap gap-4 md:gap-6">
                                {/* Render 3-Phase Gauge Groups */}
                                {gaugeGroups3Phase.map((group) => (
                                    <motion.div
                                        key={group.groupKey}
                                        // Each card takes full width within its parent on small/medium, adjust if needed
                                        className="w-full cursor-default rounded-lg overflow-hidden"
                                        whileHover={theme === 'dark' ? darkCardHoverEffect : cardHoverEffect}
                                    // Apply individual variants here if needed, or rely on parent staggering
                                    >
                                        <TooltipProvider delayDuration={200}><Tooltip>
                                            <TooltipTrigger asChild>
                                                <Card className="h-full shadow-md hover:shadow-lg transition-shadow duration-300 border dark:border-gray-700/60 bg-card">
                                                    <CardHeader className="p-3 bg-muted/30 dark:bg-gray-800/50 border-b dark:border-gray-700">
                                                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                            {group.icon && React.createElement(group.icon, { className: "w-5 h-5 text-primary flex-shrink-0" })}
                                                            {group.title}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 flex flex-wrap justify-around items-start gap-4">
                                                        {(['a', 'b', 'c'] as const).map((phase) => {
                                                            const point = group.points[phase];
                                                            if (!point) return null;
                                                            const value = nodeValues[point.nodeId];
                                                            return (
                                                                <CircularGauge
                                                                    key={phase} value={typeof value === 'number' ? value : null}
                                                                    min={point.min} max={point.max} unit={group.unit}
                                                                    label={`Phase ${phase.toUpperCase()}`} size={90}
                                                                    strokeWidth={8} config={point}
                                                                />
                                                            );
                                                        })}
                                                    </CardContent>
                                                </Card>
                                            </TooltipTrigger>
                                            {group.description && (<TooltipContent><p>{group.description}</p></TooltipContent>)}
                                        </Tooltip></TooltipProvider>
                                    </motion.div>
                                ))}

                                {/* Render 3-Phase Display Groups */}
                                {displayGroups3Phase.map((group) => (
                                    <motion.div
                                        key={group.groupKey}
                                        // Example sizing: Grow to fill space, basis allows wrapping
                                        className="flex-grow cursor-default rounded-lg overflow-hidden"
                                        whileHover={theme === 'dark' ? darkCardHoverEffect : cardHoverEffect}
                                    >
                                        <TooltipProvider delayDuration={200}><Tooltip>
                                            <TooltipTrigger asChild>
                                                <Card className="h-full shadow-md hover:shadow-lg transition-shadow duration-300 border dark:border-gray-700/60 bg-card">
                                                    <CardHeader className="p-3 bg-muted/30 dark:bg-gray-800/50 border-b dark:border-gray-700/80">
                                                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                                            {group.icon && React.createElement(group.icon, { className: "w-4 h-4 text-primary flex-shrink-0" })}
                                                            {group.title}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-3 space-y-1.5 text-sm">
                                                        <div className="grid grid-cols-3 gap-x-2 gap-y-1 items-center">
                                                            <div className="text-xs font-medium text-muted-foreground text-center border-b pb-1 dark:border-gray-700">Ph A</div>
                                                            <div className="text-xs font-medium text-muted-foreground text-center border-b pb-1 dark:border-gray-700">Ph B</div>
                                                            <div className="text-xs font-medium text-muted-foreground text-center border-b pb-1 dark:border-gray-700">Ph C</div>
                                                            {(['a', 'b', 'c'] as const).map((phase) => {
                                                                const point = group.points[phase];
                                                                return (
                                                                    <div key={phase} className="text-center pt-1 min-h-[24px] flex items-center justify-center">
                                                                        {renderNodeValueText(point?.nodeId, group.unit, point)}
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
                                ))}
                            </div>
                        </motion.div>
                    )}
                    {/* --- Section 2: Single-Phase & Controls Items --- */}
                    {individualPoints.length > 0 && (
                        <motion.div
                            // Take half width on large screens, full on smaller
                            className="w-auto flex flex-col gap-4 md:gap-6"
                            variants={itemVariants} // Apply item variant to the whole section container
                        >
                            <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-400 -mb-2 md:-mb-0">
                                System Details & Controls
                            </h2>

                            {/* Inner container for single-phase cards (flex wrap) */}
                            <div className="flex flex-wrap gap-4 md:gap-6">
                                {/* Render Controls */}
                                {controlPoints.length > 0 && (
                                    // Controls container: full width within this section, items wrap
                                    <div className="w-full flex flex-wrap gap-3 md:gap-4 items-stretch">
                                        {controlPoints.map((point) => {
                                            const baseWidth = 'flex-grow'; // Adjust basis for desired wrapping in this column

                                            if (point.uiType === 'button') {
                                                return (
                                                    <motion.div key={point.id} className={baseWidth} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                                                        <TooltipProvider delayDuration={200}><Tooltip>
                                                            <TooltipTrigger asChild><Button onClick={() => sendDataToWebSocket(point.nodeId, true)} className="w-full h-full justify-start p-3 text-left bg-card border dark:border-gray-700/60 rounded-lg shadow-sm hover:bg-muted/60 dark:hover:bg-gray-700/60 hover:shadow-md transition-all" variant="ghost" disabled={!isConnected}>{point.icon && React.createElement(point.icon, { className: "w-4 h-4 mr-2 text-primary flex-shrink-0" })}<span className="text-sm font-medium text-card-foreground">{point.displayName || point.name}</span></Button></TooltipTrigger>
                                                            {point.description && (<TooltipContent><p>{point.description}</p></TooltipContent>)}
                                                        </Tooltip></TooltipProvider>
                                                    </motion.div>
                                                );
                                            }
                                            if (point.uiType === 'switch') {
                                                const isChecked = typeof nodeValues[point.nodeId] === 'boolean' ? (nodeValues[point.nodeId] as boolean) : false;
                                                const isDisabled = !isConnected || nodeValues[point.nodeId] === undefined || nodeValues[point.nodeId] === 'Error' || nodeValues[point.nodeId] === null;
                                                return (
                                                    <motion.div key={point.id} className={baseWidth} whileHover={{ scale: 1.03, y: -2 }}>
                                                        <TooltipProvider delayDuration={200}><Tooltip>
                                                            <Card className={`h-full p-3 flex items-center justify-between cursor-default transition-opacity shadow-sm hover:shadow-md border dark:border-gray-700/60 bg-card ${isDisabled ? 'opacity-70' : ''}`}>
                                                                <TooltipTrigger asChild><div className="flex items-center gap-2 overflow-hidden mr-2 flex-1">{point.icon && React.createElement(point.icon, { className: "w-4 h-4 text-primary flex-shrink-0" })}<span className="text-sm font-medium truncate" title={point.displayName || point.name}>{point.displayName || point.name}</span></div></TooltipTrigger>
                                                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="flex-shrink-0"><Switch checked={isChecked} onCheckedChange={(checked) => sendDataToWebSocket(point.nodeId, checked)} disabled={isDisabled} aria-label={point.displayName || point.name} /></motion.div>
                                                            </Card>
                                                            {point.description && (<TooltipContent><p>{point.description}</p></TooltipContent>)}
                                                        </Tooltip></TooltipProvider>
                                                    </motion.div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                )}
                                <div className='flex flex-row gap-4 flex-wrap'>
                                 {/* Render Individual Gauge Points */}
                                 {gaugePointsIndividual.map((point) => {
                                    const value = nodeValues[point.nodeId];
                                    // Responsive width for individual gauges within this section
                                    const gaugeWidth = "flex-grow "; 
                                    return (
                                        <motion.div
                                            key={point.id}
                                            className={`${gaugeWidth} cursor-default rounded-lg overflow-hidden`}
                                            whileHover={theme === 'dark' ? darkCardHoverEffect : cardHoverEffect}
                                        >
                                            <TooltipProvider delayDuration={200}><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Card className="h-full p-4 flex flex-col items-center justify-between shadow-md hover:shadow-lg transition-shadow duration-300 border dark:border-gray-700/60 bg-card min-h-[180px]">
                                                        <div className="flex items-center gap-2 mb-3 text-center">
                                                            {point.icon && <point.icon className="w-5 h-5 text-primary flex-shrink-0" />}
                                                            <span className="text-sm font-semibold text-card-foreground truncate" title={point.displayName || point.name}>{point.displayName || point.name}</span>
                                                        </div>
                                                        <CircularGauge
                                                            value={typeof value === 'number' ? value : null} min={point.min} max={point.max}
                                                            unit={point.unit} size={100} strokeWidth={10} config={point}
                                                        />
                                                        {(point.min !== undefined || point.max !== undefined) && (
                                                            <div className="text-xs text-muted-foreground mt-2">({point.min ?? '-'} to {point.max ?? '-'})</div>
                                                        )}
                                                    </Card>
                                                </TooltipTrigger>
                                                {point.description && (<TooltipContent><p>{point.description ?? `Range: ${point.min ?? '-'} to ${point.max ?? '-'}`}</p></TooltipContent>)}
                                            </Tooltip></TooltipProvider>
                                        </motion.div>
                                    );
                                })}

                                </div>
                               
                                <div className='flex flex-row gap-4 flex-wrap'>
                                    {/* Render Individual Display Points */}
                                {displayPointsIndividual.map((point) => {
                                    // Responsive width for display cards within this section
                                    const displayWidth = "flex-grow";
                                    return (
                                        <motion.div
                                            key={point.id}
                                            className={`${displayWidth} cursor-default rounded-lg overflow-hidden`}
                                            whileHover={theme === 'dark' ? darkCardHoverEffect : cardHoverEffect}
                                        >
                                            <TooltipProvider delayDuration={200}><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Card className="h-full p-3 flex items-center justify-between min-h-[70px] shadow-md hover:shadow-lg transition-shadow duration-300 border dark:border-gray-700/60 bg-card">
                                                        <div className='flex items-center gap-2 overflow-hidden mr-2'>
                                                            {point.icon && <point.icon className="w-4 h-4 text-primary flex-shrink-0" />}
                                                            <span className="text-sm font-medium text-muted-foreground truncate" title={point.displayName || point.name}>{point.displayName || point.name}</span>
                                                        </div>
                                                        <div className="text-base font-semibold text-right flex-shrink-0 pl-2">
                                                            {renderNodeValueText(point.nodeId, point.unit, point)}
                                                        </div>
                                                    </Card>
                                                </TooltipTrigger>
                                                {point.description && (<TooltipContent><p>{point.description}</p></TooltipContent>)}
                                            </Tooltip></TooltipProvider>
                                        </motion.div>
                                    );
                                })}
                                </div>
                            </div> {/* End Inner container for single-phase cards */}
                        </motion.div> // End Section 2
                    )}

                </motion.div> {/* End Main Flex Container for Sections */}

            </div> {/* End max-w container */}
        </div> // End main container
    );
};

export default Dashboard;