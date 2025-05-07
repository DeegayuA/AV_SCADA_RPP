'use client';

// src/components/dashboard/Dashboard.tsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { dataPoints as configuredDataPoints } from '@/config/dataPoints'; // Keep config here
import { motion } from 'framer-motion'; // Used for outer container
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { WS_URL, VERSION } from '@/config/constants'; // Adjust path if needed
import { NodeData } from './dashboardInterfaces'; // Import interfaces
import DashboardHeader from './DashboardHeader'; // Import header
import DashboardSection from './DashboardSection'; // Import section
import { containerVariants, itemVariants } from '@/config/animationVariants'; // Import variants
import { AlertTriangleIcon, CheckCircle, InfoIcon, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playSound } from '@/lib/utils';
import { groupDataPoints } from './groupDataPoints';
// import { usePathname } from 'next/navigation'; // Not used in this component


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
    const lastToastTimestamps = useRef<Record<string, number>>({}); // Ref for toasts from ValueDisplayContent

    // --- Sound State & Toggle ---
    const [soundEnabled, setSoundEnabled] = useState(() => {
        if (typeof window !== 'undefined') { return localStorage.getItem('dashboardSoundEnabled') === 'true'; } return false;
    });
    useEffect(() => { if (typeof window !== 'undefined') { localStorage.setItem('dashboardSoundEnabled', String(soundEnabled)); } }, [soundEnabled]);

    const playNotificationSound = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
        if (!soundEnabled) return;
        const soundMap = { success: '/sounds/success.mp3', error: '/sounds/error.mp3', warning: '/sounds/warning.mp3', info: '/sounds/info.mp3' };
        const volumeMap = { success: 0.99, error: 0.6, warning: 0.5, info: 0.3 };
        // Ensure playSound exists and is imported correctly
        if (typeof playSound === 'function') {
            playSound(soundMap[type], volumeMap[type]);
        } else {
             console.warn("playSound utility not found or not a function.");
        }
    }, [soundEnabled]);


    // --- Core Hooks ---
    useEffect(() => { // Clock
        const updateClock = () => setCurrentTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: 'short', year: 'numeric' }));
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // --- Lag Check & Redirection ---
    // Added comments for clarity on redirect/reload flags
    useEffect(() => {
        const interval = setInterval(() => {
            // Calculate and update data delay
            const currentDelay = Date.now() - lastUpdateTime;
            setDelay(currentDelay);

            // Flags to prevent multiple redirects/reloads triggered by this hook
            const reloadingFlag = 'reloadingDueToDelay';
            const redirectingFlag = 'redirectingDueToExtremeDelay';
            const opcuaRedirectedFlag = 'opcuaRedirected'; // Flag for initial WS error redirect

            // Check if any critical recovery is already in progress (reloading, redirecting, or initial opcuaRedirected)
            if (typeof window !== 'undefined' && (
                sessionStorage.getItem(reloadingFlag) === 'true' ||
                sessionStorage.getItem(redirectingFlag) === 'true' ||
                sessionStorage.getItem(opcuaRedirectedFlag) === 'true' // Added check for the initial redirect flag
            )) {
                 // If already handling a critical state, do not trigger *new* actions from this lag check
                 return;
            }


            // --- Check for > 40s lag for REDIRECT (Critical Stale Data) ---
            if (isConnected && currentDelay > 40000 && typeof window !== 'undefined') {
                console.error(`Extreme WS data lag (${(currentDelay / 1000).toFixed(1)}s) > 40s. Redirecting to API endpoint.`);
                toast.error('Critical Lag Detected', { description: 'Redirecting to API page for connection check...', duration: 5000 });
                playNotificationSound('error');
                sessionStorage.setItem(redirectingFlag, 'true'); // Set specific lag redirect flag
                const apiUrl = new URL('/api/opcua', window.location.origin);
                window.location.href = apiUrl.href; // Perform redirect
                return; // Stop further checks in this interval iteration after triggering redirect
            }

            // --- Check for > 30s lag for RELOAD (Stale Data) --- (Only if not already triggering a redirect)
            else if (isConnected && currentDelay > 30000 && typeof window !== 'undefined') {
                console.warn(`WS data lag (${(currentDelay / 1000).toFixed(1)}s) exceeded 30s threshold. Reloading.`);
                toast.warning('Stale Data Detected', { description: 'Refreshing connection...', duration: 5000 });
                playNotificationSound('warning');
                sessionStorage.setItem(reloadingFlag, 'true'); // Set reload flag
                // Wait a moment before reloading to allow toast/sound to register
                setTimeout(() => {
                     if (typeof window !== 'undefined') {
                         window.location.reload();
                     }
                 }, 1500);
            }

            // --- Reset flags if delay is back below 30s ---
            // This ensures that if connection recovers on its own, future lags can trigger actions again.
            else if (currentDelay < 30000 && typeof window !== 'undefined') {
                // Only remove flags if they exist, slight optimization
                if (sessionStorage.getItem(reloadingFlag)) {
                    sessionStorage.removeItem(reloadingFlag);
                }
                if (sessionStorage.getItem(redirectingFlag)) {
                    sessionStorage.removeItem(redirectingFlag);
                }
            }
        }, 2000); // Checks every 2 seconds

        return () => clearInterval(interval);
    }, [lastUpdateTime, isConnected, playNotificationSound]); // Dependencies are correct

    const checkPlcConnection = useCallback(async () => { // PLC Status Check
        try { const res = await fetch('/api/opcua/status'); if (!res.ok) throw new Error(`API Error: ${res.status}`); const data = await res.json(); const newStatus = data.connectionStatus; if (newStatus && ['online', 'offline', 'disconnected'].includes(newStatus)) { setPlcStatus(newStatus); } else { console.error("Invalid PLC status:", data); if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); } } catch (err: any) { if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); }
    }, [plcStatus]);
    useEffect(() => { checkPlcConnection(); const interval = setInterval(checkPlcConnection, 10000); return () => clearInterval(interval); }, [checkPlcConnection]);

    const connectWebSocket = useCallback(() => { // WebSocket Connection

        // Define session storage flags
        const opcuaRedirectedFlag = 'opcuaRedirected';
        const reloadingFlag = 'reloadingDueToDelay';
        const redirectingFlag = 'redirectingDueToExtremeDelay';


        // Prevent new connection attempts if one is already open/connecting
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
            console.log("WS already connecting or open, skipping new attempt.");
            return;
        }

        // --- IMPORTANT: Check if a redirect is already mandated by session storage ---
        // If the flag is set, it means a previous error or lag condition already decided
        // that the user needs to go to the API page. Do NOT attempt to reconnect WS here.
        if (typeof window !== 'undefined' && (
             sessionStorage.getItem(opcuaRedirectedFlag) === 'true' || // Initial WS error redirect flag
             sessionStorage.getItem(reloadingFlag) === 'true' ||       // Lag reload flag
             sessionStorage.getItem(redirectingFlag) === 'true'        // Extreme lag redirect flag
        )) {
             console.log("Session storage indicates a recovery is in progress (redirect or reload). Aborting WS connect attempt.");
             // Optionally clear flags after a longer timeout if needed,
             // but generally, let the navigation handle the state reset.
             // setTimeout(() => {
             //     sessionStorage.removeItem(opcuaRedirectedFlag);
             //     sessionStorage.removeItem(reloadingFlag);
             //     sessionStorage.removeItem(redirectingFlag);
             // }, 10000); // Clear flags after 10 seconds just in case navigation fails?
             return; // *** EXIT FUNCTION ***
        }


        setIsConnected(false); // Set status to disconnected before attempting connection
        const delayMs = Math.min(1000 + 2000 * Math.pow(1.5, reconnectAttempts.current), 60000);
        console.log(`Attempting WS connect (Attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts}) in ${(delayMs / 1000).toFixed(1)}s...`);

        // Clear any existing reconnect timeout before setting a new one
        if (reconnectInterval.current) {
            clearTimeout(reconnectInterval.current);
            reconnectInterval.current = null;
        }

        reconnectInterval.current = setTimeout(() => {
            if (typeof window === 'undefined') return;

            console.log(`Initiating WebSocket connection to ${WS_URL}...`);
            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = () => {
                console.log("WS Connected");
                setIsConnected(true);
                setNodeValues({}); // Clear old values on successful reconnect? Or merge? Clearing is safer for stale data.
                setLastUpdateTime(Date.now());
                reconnectAttempts.current = 0; // Reset attempts on success
                if (reconnectInterval.current) {
                     clearTimeout(reconnectInterval.current);
                     reconnectInterval.current = null;
                }
                toast.success('Connection Established', { description: 'Live data feed active.', duration: 3000 });
                playNotificationSound('success');
                // Clear any pending redirect/reload flags on successful connection
                 if (typeof window !== 'undefined') {
                     sessionStorage.removeItem(opcuaRedirectedFlag);
                     sessionStorage.removeItem(reloadingFlag);
                     sessionStorage.removeItem(redirectingFlag);
                 }
            };

            ws.current.onmessage = (event) => {
                try {
                    const receivedData = JSON.parse(event.data as string);
                    // Only update if data is an object, basic validation
                    if (typeof receivedData === 'object' && receivedData !== null) {
                         setNodeValues(prev => ({ ...prev, ...receivedData }));
                         setLastUpdateTime(Date.now()); // Update timestamp on *any* successful message
                    } else {
                         console.warn("Received non-object data on WS:", receivedData);
                    }
                } catch (e) {
                    console.error("WS parse error:", e, "Data:", event.data);
                    // Avoid repeated toasts for the same parse error within a short time? Maybe.
                    toast.error('Data Error', { description: 'Received invalid data format.', duration: 4000 });
                    playNotificationSound('error');
                }
            };

            ws.current.onerror = (event) => {
                console.error("WebSocket error event:", event);
                 if (event && (event as any).error) {
                     console.error("Detailed WebSocket error:", (event as any).error);
                 }

                // Check if redirection is already in progress or attempted
                 if (typeof window !== 'undefined' && sessionStorage.getItem(opcuaRedirectedFlag) !== 'true') {
                     console.warn("WebSocket connection error, redirecting to API endpoint for potential authentication/setup...");
                      toast.error('Connection Error', { description: 'Attempting to reconnect. Redirecting for status check.', duration: 5000 });
                     playNotificationSound('error');

                     // Set the flag BEFORE redirecting to prevent loop if API page also fails
                     sessionStorage.setItem(opcuaRedirectedFlag, 'true');
                     const apiUrl = new URL('/api/opcua', window.location.origin);
                     console.log("Redirecting to:", apiUrl.href);
                     window.location.href = apiUrl.href; // Perform the redirect

                 } else {
                      // If redirection was already attempted, log and wait for onclose
                      console.warn("WebSocket error occurred, but redirection already attempted or in progress. Letting onclose handle reconnect logic.");
                      // Close the socket if it's not already closed, to ensure onclose fires
                      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                           ws.current.close(1011, 'Error encountered'); // Use 1011 for internal error
                      } else if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
                           ws.current.close(); // Force close if in connecting/closing state
                      }
                 }
            };

            ws.current.onclose = (event) => {
                console.log(`WS disconnected. Code: ${event.code}, Reason: ${event.reason || 'N/A'}, Clean: ${event.wasClean}`);
                setIsConnected(false);
                setNodeValues({}); // Clear values on disconnect

                // Important: Check if a redirect flag is set. If so, this close event
                // is likely *because* of the redirect navigation happening, or
                // a prior error already triggered a redirect attempt.
                // In these cases, we should *not* attempt auto-reconnect here.
                 if (typeof window !== 'undefined' && (
                      sessionStorage.getItem(opcuaRedirectedFlag) === 'true' ||
                      sessionStorage.getItem(reloadingFlag) === 'true' ||
                      sessionStorage.getItem(redirectingFlag) === 'true'
                 )) {
                     console.log("WS closed, but session flags indicate ongoing recovery action. Aborting auto-reconnect.");
                     return; // *** EXIT onclose handler ***
                 }


                // If no redirect flag is set and closure was not clean (or specific codes), attempt reconnect
                if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    console.log(`WS closed unexpectedly. Attempting reconnect... Attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
                    connectWebSocket(); // Attempt reconnect with backoff
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    console.warn("Max WS reconnect attempts reached after repeated failures.");
                    toast.error('Connection Failed', { description: 'Max reconnect attempts reached. Please refresh manually or check server status.', duration: 10000 });
                    playNotificationSound('error');
                     // At this point, if max attempts are reached and no redirect happened,
                     // maybe *now* trigger a redirect as a last resort? Or just leave it
                     // disconnected and let the user manually refresh or go to API page.
                     // The current logic relies on the *initial* onerror or the *lag* check
                     // for redirection. Let's stick to that for simplicity unless proven insufficient.
                } else {
                    console.log("WS closed cleanly or max attempts reached, no automatic reconnect needed/attempted.");
                    // Inform the user about clean disconnect if needed
                     if (event.code === 1000) {
                          toast.info('Disconnected', { description: 'Connection closed cleanly.', duration: 3000 });
                     }
                }
            };

        }, delayMs); // Delay before the actual connection attempt
    }, [playNotificationSound, reconnectAttempts, maxReconnectAttempts]);


    // --- Initial WS connect & cleanup ---
    useEffect(() => {
        if (typeof window === 'undefined') return;
        console.log("Dashboard component mounted.");

        // --- IMPORTANT: Clear critical session storage flags on mount ---
        // This ensures a fresh start if the user navigates back or reloads after a failed attempt/redirect.
        sessionStorage.removeItem('opcuaRedirected'); // Clear initial WS error redirect flag
        sessionStorage.removeItem('reloadingDueToDelay'); // Clear lag reload flag
        sessionStorage.removeItem('redirectingDueToExtremeDelay'); // Clear extreme lag redirect flag
         // Also reset reconnect attempts counter on mount
         reconnectAttempts.current = 0;


        // Attempt initial WebSocket connection
        console.log("Attempting initial WebSocket connection...");
        connectWebSocket();


        // Cleanup function: Runs on component unmount or when dependencies change (if any, currently none)
        return () => {
            console.log("Dashboard component unmounting, cleaning up resources...");
            // Clear any pending reconnect timer
            if (reconnectInterval.current) {
                clearTimeout(reconnectInterval.current);
                reconnectInterval.current = null;
            }
            // Close the WebSocket connection cleanly if it exists and is not already closed
            if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
                 console.log("Closing WebSocket connection due to component unmount.");
                 // Remove the onclose handler temporarily to prevent it from triggering
                 // reconnect logic for this intentional close.
                 if (ws.current.onclose) {
                      const originalOnClose = ws.current.onclose;
                      ws.current.onclose = null; // Remove the handler
                       // Re-attach the handler briefly after closing? Or just let it go.
                       // For intentional unmount, just closing is usually sufficient.
                 }
                ws.current.close(1000, 'Component Unmounted'); // Use 1000 for normal closure
                ws.current = null;
            }
        };
    }, [connectWebSocket]); // Effect depends on the memoized connectWebSocket function


    // --- Data Processing & Layout ---
    const { threePhaseGroups, individualPoints } = useMemo(() => groupDataPoints(configuredDataPoints), []);

    const sections = useMemo(() => {
        const controlItems = individualPoints.filter(p => p.uiType === 'button' || p.uiType === 'switch');
        const gaugeItemsIndividual = individualPoints.filter(p => p.uiType === 'gauge');
        const displayItemsIndividual = individualPoints.filter(p => p.uiType === 'display');

        const gaugeGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'gauge');
        const displayGroups3Phase = threePhaseGroups.filter(g => g.uiType === 'display');

        // Group individual display items by category, excluding those already part of a 3-phase group
         const displayByCategory = displayItemsIndividual.reduce((acc, point) => {
             // Check if this point's nodeId is referenced in any of the 3-phase groups' point configs
             const isInGroup = threePhaseGroups.some(g =>
                 Object.values(g.points as Record<string, { nodeId?: string }>).some((p) => p?.nodeId === point.nodeId)
             );
             if (isInGroup) return acc; // Skip if already in a 3-phase group

             const category = point.category || 'status'; // Default to 'status' if category is missing
             if (!acc[category]) acc[category] = [];
             acc[category].push(point);
             return acc;
         }, {} as Record<string, typeof individualPoints>); // Type the accumulator correctly

        // Define the sections with grid column classes
        const layoutSections = [
            { title: "Controls & Settings", items: controlItems, gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6' },
            { title: "Gauges & Overview", items: [...gaugeItemsIndividual, ...gaugeGroups3Phase], gridCols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' },
            { title: "Three Phase Readings", items: displayGroups3Phase, gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' },
            // Dynamically add sections for individual display points by category
            ...Object.entries(displayByCategory)
                     .sort(([catA], [catB]) => catA.localeCompare(catB)) // Sort categories alphabetically
                     .map(([category, points]) => ({
                         title: category.charAt(0).toUpperCase() + category.slice(1) + " Readings", // Capitalize first letter
                         items: points,
                         gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' // Standard grid for these
                     }))
        ];

        // Filter out sections that have no items
        return layoutSections.filter(section => section.items.length > 0);

    }, [individualPoints, threePhaseGroups]); // Recompute if grouped points change

    // Determine card hover effect based on theme
    const cardHoverEffect = { y: -4, boxShadow: "0 8px 20px -4px rgba(0, 0, 0, 0.08), 0 5px 8px -5px rgba(0, 0, 0, 0.08)", transition: { type: 'spring', stiffness: 350, damping: 20 } };
    const darkCardHoverEffect = { y: -4, boxShadow: "0 8px 20px -4px rgba(0, 0, 0, 0.15), 0 5px 8px -5px rgba(0, 0, 0, 0.2)", transition: { type: 'spring', stiffness: 350, damping: 20 } };
    const currentHoverEffect = resolvedTheme === 'dark' ? darkCardHoverEffect : cardHoverEffect;


     // --- Data Sending Function ---
     const sendDataToWebSocket = useCallback((nodeId: string, value: boolean | number | string) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                const pointConfig = configuredDataPoints.find(p => p.nodeId === nodeId);
                let valueToSend = value;

                // Ensure valueToSend matches expected type based on config dataType
                if (pointConfig?.dataType.includes('Int')) {
                    // If target is Int, convert boolean to 0/1
                     if (typeof value === 'boolean') valueToSend = value ? 1 : 0;
                    // If target is Int and value is string, try parsing (e.g., from input field)
                     else if (typeof value === 'string') valueToSend = parseInt(value, 10); // Use radix 10
                } else if (pointConfig?.dataType === 'Boolean') {
                     // If target is Boolean, convert number (0/1) or string to boolean
                     if (typeof value === 'number') valueToSend = value !== 0;
                     else if (typeof value === 'string') valueToSend = value.toLowerCase() === 'true' || value === '1';
                } else if (pointConfig?.dataType === 'Float' || pointConfig?.dataType === 'Double') {
                     // If target is Float/Double, convert string to float
                     if (typeof value === 'string') valueToSend = parseFloat(value);
                }
                 // Ensure valueToSend is not NaN/Infinity after conversion if it was a number type
                 if (typeof valueToSend === 'number' && !isFinite(valueToSend)) {
                      console.error(`Invalid number value for nodeId ${nodeId}: ${value}`);
                      toast.error('Send Error', { description: 'Invalid number value provided.', duration: 3000 });
                      playNotificationSound('error');
                      return; // Abort send if value is invalid number
                 }

                const payload = JSON.stringify({ [nodeId]: valueToSend });
                ws.current.send(payload);
                console.log("Sent via WebSocket:", payload);
                toast.info('Command Sent', { description: `${pointConfig?.name || nodeId} = ${String(value)}`, duration: 2500 });
                playNotificationSound('info');

            } catch (e) {
                console.error("WebSocket send error:", e);
                toast.error('Send Error', { description: 'Failed to send command via WebSocket.' });
                playNotificationSound('error');
            }
        } else {
            console.error("WS not connected, cannot send", nodeId);
            toast.error('Connection Error', { description: 'Cannot send command. WebSocket is disconnected.' });
            playNotificationSound('error');
            // If not connected, attempt to connect
            if (!isConnected) {
                 console.log("Attempting to reconnect WS after failed send...");
                 connectWebSocket(); // Attempt reconnect if not connected
            }
        }
    }, [ws, isConnected, connectWebSocket, configuredDataPoints, playNotificationSound]);


    // --- Component Return ---
    return (
        <div className="min-h-screen bg-background text-foreground p-3 sm:p-4 md:p-6 lg:p-8 transition-colors duration-300 truncate">
            <div className="max-w-screen-3xl mx-auto">
                {/* Header component */}
                <DashboardHeader
                    plcStatus={plcStatus}
                    isConnected={isConnected}
                    connectWebSocket={connectWebSocket}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    currentTime={currentTime}
                    delay={delay}
                    version={VERSION} // Pass version from config
                />

                {/* Sections */}
                <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
                    {sections.map((section) => (
                        <DashboardSection
                            key={section.title} // Use title as key for sections
                            title={section.title}
                            gridCols={section.gridCols}
                            items={section.items}
                            nodeValues={nodeValues} // Pass data down
                            isDisabled={!isConnected} // Pass connection status down
                            currentHoverEffect={currentHoverEffect} // Pass theme-based hover effect
                            sendDataToWebSocket={sendDataToWebSocket} // Pass send function
                            playNotificationSound={playNotificationSound} // Pass sound utility
                            lastToastTimestamps={lastToastTimestamps} // Pass ref for toasts
                        />
                    ))}
                </motion.div>

                {/* Toast & Sound Testing UI (Keep unchanged or remove for production) */}
                {process.env.NODE_ENV === 'development' && (
                    <motion.section className="m-8 p-4 border border-dashed rounded-lg border-muted-foreground/50" variants={containerVariants} initial="hidden" animate="visible">
                         <motion.div variants={itemVariants}>
                            <h2 className="text-base font-semibold text-muted-foreground mb-3">Toast & Sound Test Area (Dev Only)</h2>
                         </motion.div>
                        <motion.div className="flex flex-wrap gap-3" variants={containerVariants}>
                            <motion.div variants={itemVariants}>
                                <Button size="sm" variant="outline" onClick={() => { toast.success("Success Toast", { description: "Operation completed successfully." }); playNotificationSound('success'); }}>
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Trigger Success
                                </Button>
                            </motion.div>
                             <motion.div variants={itemVariants}>
                                <Button size="sm" variant="outline" onClick={() => { toast.error("Error Toast", { description: "Something went wrong." }); playNotificationSound('error'); }}>
                                    <XCircle className="w-4 h-4 mr-2 text-red-500" /> Trigger Error
                                </Button>
                            </motion.div>
                             <motion.div variants={itemVariants}>
                                <Button size="sm" variant="outline" onClick={() => { toast.warning("Warning Toast", { description: "Check configuration." }); playNotificationSound('warning'); }}>
                                    <AlertTriangleIcon className="w-4 h-4 mr-2 text-yellow-500" /> Trigger Warning
                                </Button>
                            </motion.div>
                             <motion.div variants={itemVariants}>
                                <Button size="sm" variant="outline" onClick={() => { toast.info("Info Toast", { description: "Command sent to device." }); playNotificationSound('info'); }}>
                                    <InfoIcon className="w-4 h-4 mr-2 text-blue-500" /> Trigger Info
                                </Button>
                            </motion.div>
                             <motion.div variants={itemVariants}>
                                <Button size="sm" variant="outline" onClick={() => { toast("Default Toast", { description: "This is a default message." }); /* Optional: playInfoSound(); */ }}>
                                    Trigger Default
                                </Button>
                            </motion.div>
                        </motion.div>
                    </motion.section>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
