'use client';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { dataPoints as configuredDataPoints } from '@/config/dataPoints'; // Assuming this path is correct
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card parts if needed
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { WS_URL, OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE, VERSION } from '@/config/constants';
// Import necessary icons from lucide-react based on your dataPoints config
import { Activity, AudioWaveform, Battery, Zap, Gauge, Sun, Moon, AlertCircle, Power, Sigma } from 'lucide-react'; // Add/remove icons as needed
import { TextHoverEffect } from '@/components/ui/text-hover-effect';

// Define the interface for a single data point configuration
export interface DataPointConfig {
  id: string;
  name: string; // Base name for grouping (e.g., "Grid Voltage")
  nodeId: string;
  dataType: 'Boolean' | 'Int16' | 'Float' | 'String';
  uiType: 'display' | 'button' | 'switch' | 'gauge';
  // Use a specific icon type or a generic one
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category: 'battery' | 'grid' | 'inverter' | 'control' | 'three-phase'; // Use 'three-phase' to indicate potential grouping
  factor?: number;
  phase?: 'a' | 'b' | 'c' | 'x'; // 'x' or undefined for non-phase specific
  isSinglePhase?: boolean; // Explicitly mark as single phase to prevent grouping
  displayName?: string; // Optional: Specific name for the phase (e.g., "Phase A Voltage") if needed
}

// Type assertion for the imported configuration
const dataPoints: DataPointConfig[] = configuredDataPoints as DataPointConfig[];

// --- UI Components ---

const PlcConnectionStatus = ({ status }: { status: 'online' | 'offline' | 'disconnected' }) => {
  let statusText = '';
  let dotClass = '';
  let title = `Status: ${status}`;
  let clickHandler = () => { };

  switch (status) {
    case 'online': statusText = 'PLC: Online (Remote)'; dotClass = 'bg-blue-500'; break;
    case 'offline': statusText = 'PLC: Online (Local)'; dotClass = 'bg-sky-400'; break;
    case 'disconnected':
      statusText = 'PLC: Disconnected'; dotClass = 'bg-gray-400 dark:bg-gray-600'; title = 'PLC Disconnected. Click to reload.';
      clickHandler = () => { if (typeof window !== 'undefined') { console.log("Reloading page..."); window.location.reload(); } };
      break;
  }
  const dotVariants = { initial: { scale: 0 }, animate: { scale: 1 }, pulse: { scale: [1, 1.2, 1], transition: { duration: 1, repeat: Infinity, ease: "easeInOut" } } };
  return (
    <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
      <TooltipProvider delayDuration={100}><Tooltip>
        <TooltipTrigger asChild>
          <motion.div className={`w-3.5 h-3.5 rounded-full ${dotClass} cursor-pointer flex-shrink-0`} variants={dotVariants} initial="initial" animate={["animate", "pulse"]} onClick={clickHandler} />
        </TooltipTrigger><TooltipContent><p>{title}</p></TooltipContent>
      </Tooltip></TooltipProvider>
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

// --- Data Structures and Grouping Logic ---

interface NodeData {
  [nodeId: string]: string | number | boolean | null | 'Error';
}

interface ThreePhaseGroupInfo {
  groupKey: string;
  title: string; // Base name (e.g., "Grid Voltage")
  points: {
    a?: DataPointConfig; // Optional to handle cases where a phase might be missing config but grouping is attempted
    b?: DataPointConfig;
    c?: DataPointConfig;
  };
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  unit?: string;
  description?: string;
  uiType: 'display' | 'gauge';
}

// Enhanced grouping function using the new fields
function groupDataPoints(pointsToGroup: DataPointConfig[]): { threePhaseGroups: ThreePhaseGroupInfo[], individualPoints: DataPointConfig[] } {
  const groupsByKey = new Map<string, DataPointConfig[]>();
  const individualPoints: DataPointConfig[] = [];
  const threePhaseGroups: ThreePhaseGroupInfo[] = [];

  // Use the base 'name' field for grouping directly
  // Phase suffix should ideally be in 'displayName' or handled at render
  pointsToGroup.forEach(point => {
    if (point.isSinglePhase || !point.phase || !['a', 'b', 'c'].includes(point.phase) || point.category !== 'three-phase') {
      // Definitely an individual item if marked single phase, has no phase, is 'x', or isn't category 'three-phase'
      individualPoints.push(point);
    } else {
      // Potential part of a 3-phase group (use base 'name' as key)
      const groupKey = point.name; // The base name IS the group key
      if (!groupsByKey.has(groupKey)) {
        groupsByKey.set(groupKey, []);
      }
      groupsByKey.get(groupKey)!.push(point);
    }
  });

  groupsByKey.forEach((potentialGroup, groupKey) => {
    const phases: { a?: DataPointConfig, b?: DataPointConfig, c?: DataPointConfig } = {};
    let validGroup = true;
    let commonUiType: 'display' | 'gauge' | null = null;
    let commonUnit: string | undefined = undefined;
    let icon = potentialGroup[0]?.icon;
    let description = potentialGroup[0]?.description;

    // Minimal check: needs at least 3 points potentially
    if (potentialGroup.length < 3) {
      validGroup = false;
    } else {
      commonUiType = (potentialGroup[0].uiType === 'display' || potentialGroup[0].uiType === 'gauge') ? potentialGroup[0].uiType : null;
      commonUnit = potentialGroup[0].unit;

      for (const point of potentialGroup) {
        if (          point.isSinglePhase ||
          !point.phase ||
          !['a', 'b', 'c'].includes(point.phase) ||
          phases[point.phase as 'a' | 'b' | 'c'] || // Explicit type assertion
          point.unit !== commonUnit ||
          (point.uiType !== 'display' && point.uiType !== 'gauge') ||
          point.uiType !== commonUiType
        ) {
          validGroup = false;
          break;
        }
        if (point.phase === 'a' || point.phase === 'b' || point.phase === 'c') {
          phases[point.phase] = point;
        }
      }
      if (!phases.a || !phases.b || !phases.c) { // Must have exactly a, b, AND c
        validGroup = false;
      }
    }

    if (validGroup && phases.a && phases.b && phases.c && commonUiType) {
      threePhaseGroups.push({
        groupKey: groupKey,
        title: groupKey, // Use the base name as title
        points: { a: phases.a, b: phases.b, c: phases.c }, // Store the specific points
        icon: icon,
        unit: commonUnit,
        description: description || `3-Phase ${groupKey}`, // Default description
        uiType: commonUiType,
      });
    } else {
      // Group didn't qualify, add all its points to individuals
      individualPoints.push(...potentialGroup);
    }
  });

  return { threePhaseGroups, individualPoints };
}


// --- Motion Variants ---
const containerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

// --- Dashboard Component ---
const Dashboard = () => {
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
  const maxReconnectAttempts = 10; // Example maximum attempts

  // --- Core Hooks (Time, Delay, PLC Check) ---
  useEffect(() => { /* Current time update */
    const interval = setInterval(() => { setCurrentTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: '2-digit', year: 'numeric' })); }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { /* Delay monitoring and reload */
    const interval = setInterval(() => {
      const currentDelay = Date.now() - lastUpdateTime;
      setDelay(currentDelay);
      if (isConnected && currentDelay > 20000) { // Increased threshold slightly
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

  const checkPlcConnection = useCallback(async () => { /* Mock PLC check */
    setIsPlcConnected(prev => prev === 'disconnected' ? 'offline' : prev === 'offline' ? 'online' : 'offline');
  }, []);

  useEffect(() => { /* Periodic PLC check */
    checkPlcConnection();
    const interval = setInterval(checkPlcConnection, 7000);
    return () => clearInterval(interval);
  }, [checkPlcConnection]);

  // --- WebSocket Logic ---
  const connectWebSocket = useCallback(() => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem('reloadingDueToDelay') === 'true') { setTimeout(() => sessionStorage.removeItem('reloadingDueToDelay'), 2000); return; }

    setIsConnected(false);
    const delay = Math.min(5000 * Math.pow(2, reconnectAttempts.current), 60000); // Exponential backoff (max 60s)
    console.log(`Attempting WS connection in ${delay}ms (attempt ${reconnectAttempts.current + 1}): ${WS_URL}`);

    reconnectInterval.current = setTimeout(() => {
      console.log("Connecting WebSocket...");
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setLastUpdateTime(Date.now());
        reconnectAttempts.current = 0; // Reset attempts on successful connection
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
            console.warn("WebSocket error, redirecting to API...");
            const url = `${window.location.protocol}//${window.location.hostname}:${window.location.port || (window.location.protocol === 'https:' ? '443' : '80')}/api/opcua`;            sessionStorage.setItem('opcuaRedirected', 'true');
            window.location.href = url;
          } else {
            console.warn("WebSocket error, already redirected.");
          }
        }
      };
      ws.current.onclose = (event) => {
        console.log(`WebSocket disconnected. Code: <span class="math-inline">\{event\.code\}, Reason\: '</span>{event.reason || '-'}'`);
        setIsConnected(false);
        ws.current = null;
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts && typeof window !== 'undefined' && sessionStorage.getItem('opcuaRedirected') !== 'true') {
          reconnectAttempts.current++;
          connectWebSocket(); // Re-attempt connection
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.warn("Max WebSocket reconnect attempts reached.");
          toast({ title: 'Error', description: 'Failed to connect to WebSocket after multiple attempts.', variant: 'destructive' });
        }
      };
    }, delay);
  }, [WS_URL, toast]);

  useEffect(() => { /* Initial connection & cleanup */
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

  // --- Send Data ---
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
      connectWebSocket(); // Attempt to reconnect if disconnected when trying to send
    }
  };

  // --- Render Value ---
  const renderNodeValue = (nodeId: string | undefined, unit: string | undefined, pointConfig?: DataPointConfig): React.ReactNode => {
    if (!nodeId) return <span className="text-gray-400 dark:text-gray-600">N/A</span>; // Handle missing nodeId

    const value = nodeValues[nodeId];
    const dataPoint = pointConfig ?? dataPoints.find((p) => p.nodeId === nodeId); // Use passed config if available
    const key = `${nodeId}-${String(value)}`;
    let content: React.ReactNode;
    let valueClass = "text-foreground font-medium"; // Default class

    if (value === undefined || value === null) {
      content = <span className="text-gray-400 dark:text-gray-500 italic">---</span>;
    } else if (value === 'Error') {
      content = <span className="text-red-500 font-semibold flex items-center gap-1"><AlertCircle size={14} /> Error</span>;
    } else if (typeof value === 'boolean') {
      content = <span className={`font-semibold ${value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{value ? 'ON' : 'OFF'}</span>;
    } else if (typeof value === 'number') {
      const factor = dataPoint?.factor ?? 1;
      const min = dataPoint?.min;
      const max = dataPoint?.max;
      let adjustedValue = value * factor;
      let displayValue: string;
      // Adjusted formatting
      if (Math.abs(adjustedValue) >= 1000) displayValue = adjustedValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
      else if (Math.abs(adjustedValue) >= 10) displayValue = adjustedValue.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
      else displayValue = adjustedValue.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });

      if ((min !== undefined && adjustedValue < min) || (max !== undefined && adjustedValue > max)) {
        valueClass = "text-orange-500 dark:text-orange-400 font-medium";
      } // Highlight out-of-range
      content = <>{displayValue}<span className="text-xs text-muted-foreground ml-0.5">{unit || ''}</span></>; // Smaller unit
    } else if (typeof value === 'string') {
      content = <>{value.length > 25 ? `${value.substring(0, 22)}...` : value}{unit ? <span className="text-xs text-muted-foreground ml-0.5">{unit}</span> : ''}</>;
    } else {
      content = <span className="text-yellow-500">?</span>;
    }

    return (<motion.span key={key} className={valueClass} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: "easeOut" }}>{content}</motion.span>);
  };

  // --- Process and Group Data Points ---
  const { threePhaseGroups, individualPoints } = useMemo(() => groupDataPoints(dataPoints), []); // Memoize grouping result

  // --- Filter points for different sections based on the grouped results ---
  const controlPoints = individualPoints.filter(p => p.uiType === 'button' || p.uiType === 'switch');
  const gaugePointsIndividual = individualPoints.filter(p => p.uiType === 'gauge');
  const displayPointsIndividual = individualPoints.filter(p => p.uiType === 'display');
  const displayGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'display');
  const gaugeGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'gauge'); // Prepare for 3-phase gauges if needed


  // --- Component Return ---
  return (
    <div className="min-h-screen text-foreground p-4 md:p-6 lg:p-8 transition-colors duration-300 rounded-lg shadow-sm bg-background dark:bg-background-dark">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-3" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
          <h1 className="text-2xl md:text-3xl font-bold text-center sm:text-left text-gray-800 dark:text-gray-100">Solar Mini-Grid Dashboard</h1>
          {/* <TextHoverEffect text="RT Dashboard" /> */}

          <motion.div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center" initial="hidden" animate="visible" variants={containerVariants}>
            <motion.div variants={itemVariants}><PlcConnectionStatus status={isPlcConnected} /></motion.div>
            <motion.div variants={itemVariants}><WebSocketStatus isConnected={isConnected} connectFn={connectWebSocket} /></motion.div>
            <motion.div variants={itemVariants}><ThemeToggle /></motion.div>
          </motion.div>
        </motion.div>

        {/* Status Bar */}
        <motion.div className="text-xs text-gray-500 dark:text-gray-400 mb-6 flex flex-col sm:flex-row justify-between items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <div className="flex items-center gap-2">
            <span>{currentTime}</span>
            <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><span className={`font-medium cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 1500 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-800/50' : delay < 3000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-800/50' : delay < 5000 ? 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-800/50' : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-800/50'}`}>{(delay / 1000).toFixed(1)}s</span></TooltipTrigger><TooltipContent><p>Last update delay ({delay} ms)</p></TooltipContent></Tooltip></TooltipProvider>
          </div>
          <span>v{VERSION}</span>
        </motion.div>

        {/* --- SECTIONS --- */}

        {/* Controls Section */}
        {controlPoints.length > 0 && (
          <motion.section className="mb-6 md:mb-8" initial="hidden" animate="visible" variants={containerVariants}>
            <motion.h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3 md:mb-4" variants={itemVariants}>Controls</motion.h2>
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4" variants={containerVariants}>
              {controlPoints.map((point) => {
                if (point.uiType === 'button') {
                  return (
                    <motion.div key={point.id} variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <TooltipProvider delayDuration={200}><Tooltip>
                        <TooltipTrigger asChild><Button onClick={() => sendDataToWebSocket(point.nodeId, true)} className="w-full h-full justify-start p-3 text-left bg-card border dark:border-gray-700 rounded-lg shadow-sm border-1 hover:bg-muted/60 dark:hover:bg-gray-700/60" variant="ghost" disabled={!isConnected}>{point.icon && React.createElement(point.icon, { className: "w-4 h-4 mr-2 text-primary flex-shrink-0" })}<span className="text-sm font-medium text-card-foreground">{point.displayName || point.name}</span></Button></TooltipTrigger>
                        {point.description && (<TooltipContent><p>{point.description}</p></TooltipContent>)}
                      </Tooltip></TooltipProvider>
                    </motion.div>
                  );
                }
                if (point.uiType === 'switch') {
                  const isChecked = typeof nodeValues[point.nodeId] === 'boolean' ? (nodeValues[point.nodeId] as boolean) : false;
                  const isDisabled = !isConnected || nodeValues[point.nodeId] === undefined || nodeValues[point.nodeId] === 'Error' || nodeValues[point.nodeId] === null;
                  return (
                    <motion.div key={point.id} variants={itemVariants} whileHover={{ scale: 1.05 }}>
                      <TooltipProvider delayDuration={200}><Tooltip>
                        <Card className={`p-3 flex items-center justify-between cursor-default transition-opacity ${isDisabled ? 'opacity-70' : ''}`}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 overflow-hidden mr-2 flex-1">
                              {point.icon && React.createElement(point.icon, { className: "w-4 h-4 text-primary flex-shrink-0" })}
                              <span className="text-sm font-medium truncate" title={point.displayName || point.name}>{point.displayName || point.name}</span>
                            </div>
                          </TooltipTrigger>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="flex-shrink-0">
                            <Switch checked={isChecked} onCheckedChange={(checked) => sendDataToWebSocket(point.nodeId, checked)} disabled={isDisabled} aria-label={point.displayName || point.name} />
                          </motion.div>
                        </Card>
                        {point.description && (<TooltipContent><p>{point.description}</p></TooltipContent>)}
                      </Tooltip></TooltipProvider>
                    </motion.div>
                  );
                }
                return null; // Should not happen based on filter
              })}
            </motion.div>
          </motion.section>
        )}

        {/* Gauges Section */}
        {(gaugePointsIndividual.length > 0 || gaugeGroups3Phase.length > 0) && (
          <motion.section className="mb-6 md:mb-8" initial="hidden" animate="visible" variants={containerVariants}>
            <motion.h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3 md:mb-4" variants={itemVariants}>Gauges</motion.h2>
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4" variants={containerVariants}>
              {/* Render 3-Phase Gauge Groups (if any) */}
              {gaugeGroups3Phase.map((group) => (
                <motion.div key={group.groupKey} variants={itemVariants} whileHover={{ scale: 1.05 }} className="cursor-default">
                  <TooltipProvider delayDuration={200}><Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="overflow-hidden">
                        <CardHeader className="p-3 bg-muted/30 dark:bg-gray-800/50 border-b dark:border-gray-700">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            {group.icon && React.createElement(group.icon, { className: "w-5 h-5 text-primary flex-shrink-0" })}
                            {group.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-1.5 text-sm">
                          {['a', 'b', 'c'].map((phase) => {
                            const point = (phase === 'a' || phase === 'b' || phase === 'c') ? group.points[phase] : undefined;
                            return (
                              <div key={phase} className="flex justify-between items-center">
                                <span className="text-muted-foreground uppercase">Phase {phase}:</span>
                                {renderNodeValue(point?.nodeId, group.unit, point)}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    {group.description && (<TooltipContent><p>{group.description}</p></TooltipContent>)}
                  </Tooltip></TooltipProvider>
                </motion.div>
              ))}
              {/* Render Individual Gauges */}
              {gaugePointsIndividual.map((point) => (
                <motion.div key={point.id} variants={itemVariants} whileHover={{ scale: 1.05 }}>
                  <TooltipProvider delayDuration={200}><Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="p-3 flex flex-col items-center justify-center text-center cursor-default min-h-[110px]">
                        <div className="flex items-center gap-2 mb-1.5">
                          {point.icon && <point.icon className="w-5 h-5 text-primary" />}
                          <span className="text-sm font-medium text-muted-foreground truncate" title={point.displayName || point.name}>{point.displayName || point.name}</span>
                        </div>
                        <div className="text-xl font-bold mb-0.5">
                          {renderNodeValue(point.nodeId, point.unit, point)}
                        </div>
                        {(point.min !== undefined || point.max !== undefined) && (<div className="text-xs text-muted-foreground">({point.min ?? '-'} to {point.max ?? '-'})</div>)}
                      </Card>
                    </TooltipTrigger>
                    {point.description && (<TooltipContent><p>{point.description}</p></TooltipContent>)}
                  </Tooltip></TooltipProvider>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}

        {/* Displays Section */}
        {(displayPointsIndividual.length > 0 || displayGroups3Phase.length > 0) && (
          <motion.section className="mb-6 md:mb-8" initial="hidden" animate="visible" variants={containerVariants}>
            <motion.h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3 md:mb-4" variants={itemVariants}>System Data</motion.h2>
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4" variants={containerVariants}>
              {/* Render 3-Phase Display Groups */}
              {displayGroups3Phase.map((group) => (
                <motion.div key={group.groupKey} variants={itemVariants} whileHover={{ scale: 1.05 }} className="cursor-default">
                  <TooltipProvider delayDuration={200}><Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="overflow-hidden shadow-sm">
                        <CardHeader className="p-3 bg-muted/30 dark:bg-gray-800/50 border-b dark:border-gray-700/80">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                            {group.icon && React.createElement(group.icon, { className: "w-4 h-4 text-primary flex-shrink-0" })}
                            {group.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-1.5 text-sm">
                          {/* Improved 3-phase display layout */}
                          <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                            {/* Headers */}
                            <div className="text-xs font-medium text-muted-foreground text-center border-b pb-1 dark:border-gray-700">Ph A</div>
                            <div className="text-xs font-medium text-muted-foreground text-center border-b pb-1 dark:border-gray-700">Ph B</div>
                            <div className="text-xs font-medium text-muted-foreground text-center border-b pb-1 dark:border-gray-700">Ph C</div>
                            {/* Values */}
                            <div className="text-center pt-1">{renderNodeValue(group.points.a?.nodeId, group.unit, group.points.a)}</div>
                            <div className="text-center pt-1">{renderNodeValue(group.points.b?.nodeId, group.unit, group.points.b)}</div>
                            <div className="text-center pt-1">{renderNodeValue(group.points.c?.nodeId, group.unit, group.points.c)}</div>
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    {group.description && (<TooltipContent><p>{group.description}</p></TooltipContent>)}
                  </Tooltip></TooltipProvider>
                </motion.div>
              ))}
              {/* Render Individual Displays */}
              {displayPointsIndividual.map((point) => (
                <motion.div key={point.id} variants={itemVariants} whileHover={{ scale: 1.05 }}>
                  <TooltipProvider delayDuration={200}><Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="p-3 flex items-center justify-between cursor-default min-h-[70px] shadow-sm border-1">
                        <div className='flex items-center gap-2 overflow-hidden'>
                          {point.icon && <point.icon className="w-4 h-4 text-primary flex-shrink-0" />}
                          <span className="text-sm font-medium text-muted-foreground truncate" title={point.displayName || point.name}>{point.displayName || point.name}</span>
                        </div>
                        <div className="text-base font-semibold text-right flex-shrink-0 pl-2">
                          {renderNodeValue(point.nodeId, point.unit, point)}
                        </div>
                      </Card>
                    </TooltipTrigger>
                    {point.description && (<TooltipContent><p>{point.description}</p></TooltipContent>)}
                  </Tooltip></TooltipProvider>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}

      </div> {/* End max-w-7xl */}
    </div> // End main container
  );
};

export default Dashboard;