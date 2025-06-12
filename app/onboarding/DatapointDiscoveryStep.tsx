// components/onboarding/DataPointConfigStep.tsx
'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DataPointConfig, IconComponentType } from '@/config/dataPoints';
import { useOnboarding } from './OnboardingContext';
import {
    Sigma, Loader2, ListChecks, Database, RefreshCw, RotateCcw,
    FileJson, Wand2, Maximize, Save
} from 'lucide-react';
import * as lucideIcons from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { cn } from '@/lib/utils';

const GEMINI_API_KEY_EXISTS_CLIENT = process.env.NEXT_PUBLIC_GEMINI_API_KEY_EXISTS === 'true';

interface ExtendedDataPointConfig extends DataPointConfig {
    iconName?: string;
    precision?: number;
    isWritable?: boolean;
    enumSet?: Record<number | string, string>;
}

function getIconComponent(iconName: string | undefined): IconComponentType | undefined {
    if (!iconName) return undefined;
    const normalizedIconName = iconName.replace(/Icon$/, '');
    const icons = lucideIcons as unknown as Record<string, IconComponentType>;
    const iconKey = Object.keys(icons).find(key => key.toLowerCase() === normalizedIconName.toLowerCase());
    return iconKey ? icons[iconKey] : undefined;
}

const DEFAULT_ICON: IconComponentType = Sigma; 

interface DiscoveredRawDataPoint {
    nodeId: string;
    browseName: string;
    displayName: string;
    nodeClass: string;
    typeDefinition?: string;
    dataType?: string;
    path: string;
}

interface ProcessingLogEntry {
    id: string;
    timestamp: string;
    type: 'system' | 'info' | 'error' | 'warning' | 'ai';
    message: string;
    details?: string;
}

const DATA_TYPE_OPTIONS: ExtendedDataPointConfig['dataType'][] = [
    'Boolean', 'String', 'Float', 'Double', 'Int16', 'UInt16', 'Int32', 'UInt32', 'DateTime',
    'Byte', 'SByte', 'Guid', 'ByteString', 'Int64', 'UInt64'
];
const UI_TYPE_OPTIONS = [
    'display', 'button', 'switch', 'gauge', 'input', 'slider', 'indicator'
] as const;

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 },},};
const itemVariants = (delay: number = 0, yOffset: number = 20, blurAmount: number = 3) => ({hidden: { opacity: 0, y: yOffset, filter: `blur(${blurAmount}px)` }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 110, damping: 16, delay, mass: 0.9 }}, exit: { opacity: 0, y: -(yOffset / 2), filter: `blur(${blurAmount}px)`, transition: { duration: 0.25 } }});
const contentAppearVariants = {hidden: { opacity: 0, height: 0, y: 15, scale: 0.97 }, visible: { opacity: 1, height: 'auto', y: 0, scale: 1, transition: { duration: 0.45, ease: 'circOut' } }, exit: { opacity: 0, height: 0, y: -15, scale: 0.97, transition: { duration: 0.35, ease: 'circIn' } }};

const formatLogTimestamp = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

const ESTIMATED_MS_PER_NODE_AI = 200;

export default function DataPointConfigStep() {
    const { configuredDataPoints, setConfiguredDataPoints } = useOnboarding();
    const [isLoading, setIsLoading] = useState(false);

    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveredRawPoints, setDiscoveredRawPoints] = useState<DiscoveredRawDataPoint[]>([]);
    const [discoveryProgress, setDiscoveryProgress] = useState(0);
    const [discoveryStatusMessage, setDiscoveryStatusMessage] = useState("");
    const [estimatedDiscoveryTime, setEstimatedDiscoveryTime] = useState(0);
    const [discoveredDataFilePath, setDiscoveredDataFilePath] = useState<string | null>(null);

    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);
    const [aiStatusMessage, setAiStatusMessage] = useState("");
    const [estimatedAiTime, setEstimatedAiTime] = useState(0);
    
    const [aiEnhancedPoints, setAiEnhancedPoints] = useState<ExtendedDataPointConfig[]>([]);

    const [processLog, setProcessLog] = useState<ProcessingLogEntry[]>([]);
    const processLogRef = useRef<HTMLDivElement>(null);
    const discoveryStartTimeRef = useRef<number | null>(null);
    const aiStartTimeRef = useRef<number | null>(null);

    const [editingPoint, setEditingPoint] = useState<ExtendedDataPointConfig | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userProvidedGeminiKey, setUserProvidedGeminiKey] = useState<string>('');
    const [showGeminiKeyInput, setShowGeminiKeyInput] = useState<boolean>(!GEMINI_API_KEY_EXISTS_CLIENT);

    const addLogEntry = useCallback((type: ProcessingLogEntry['type'], message: string, details?: string) => {
        setProcessLog(prev => {
            const newLog = [...prev, { id: Date.now().toString(), timestamp: formatLogTimestamp(), type, message, details }];
            if (newLog.length > 100) return newLog.slice(-100);
            return newLog;
        });
    }, []);

    useEffect(() => {
        if (processLogRef.current) {
            processLogRef.current.scrollTop = processLogRef.current.scrollHeight;
        }
    }, [processLog]);

    const testOpcuaConnection = async (): Promise<boolean> => {
        addLogEntry('system', "Checking OPC UA server connection...");
        setDiscoveryStatusMessage("Verifying OPC UA connection...");
        try {
            const response = await fetch('/api/opcua/status');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `API error ${response.status}`}));
                addLogEntry('error', `Connection Test API failed: ${response.status}`, errorData.message);
                setDiscoveryStatusMessage(`Connection test failed: API Error ${response.status}`);
                return false;
            }
            const data = await response.json();
            const serverStatus = data.status || data.connectionStatus; // Handle both possible keys from backend

            // MODIFICATION: Accept 'offline' (local connection) as a valid state for discovery
            if (serverStatus === 'connected' || serverStatus === 'online' || serverStatus === 'offline') { 
                const connectionType = serverStatus === 'offline' ? 'locally connected (offline mode)' : `connected (${serverStatus})`;
                addLogEntry('info', `OPC UA server is ${connectionType}. Backend reports: ${serverStatus}.`);
                // No need to set discoveryStatusMessage here as handleStartOpcuaDiscovery will proceed
                return true;
            } else {
                addLogEntry('error', "OPC UA Connection Unavailable.", `Server reported: ${serverStatus || 'unknown status'}. Please check PLC & backend configuration.`);
                setDiscoveryStatusMessage(`OPC UA Connection Unavailable: Server reported '${serverStatus || 'unknown'}'`);
                return false;
            }
        } catch (error: any) {
            addLogEntry('error', "Connection test failed (network/fetch error).", error.message);
            setDiscoveryStatusMessage(`Connection test failed: ${error.message}`);
            return false;
        }
    };

    const handleStartOpcuaDiscovery = async () => {
        setIsDiscovering(true);
        setDiscoveryProgress(5); 
        setDiscoveredRawPoints([]);
        setAiEnhancedPoints([]);
        setDiscoveredDataFilePath(null);
        setDiscoveryStatusMessage("Initializing discovery..."); // This will be overwritten by testOpcuaConnection or subsequent steps
        addLogEntry('system', "Initiating OPC UA datapoint discovery sequence...");
        discoveryStartTimeRef.current = Date.now();
        setEstimatedDiscoveryTime(30); 

        const isConnected = await testOpcuaConnection();
        if (!isConnected) {
            // discoveryStatusMessage would have been set by testOpcuaConnection on failure
            toast.error("Discovery Aborted", { description: discoveryStatusMessage || "Cannot start discovery without a valid OPC UA connection." });
            // The discoveryStatusMessage is already set by testOpcuaConnection to be more specific
            // setDiscoveryStatusMessage("Discovery aborted: OPC UA Connection unavailable."); // This line can be removed or kept as a fallback
            setIsDiscovering(false);
            setDiscoveryProgress(0);
            return;
        }
        
        // If connected, proceed
        setDiscoveryStatusMessage("Preparing to browse OPC UA server..."); // Update status
        setDiscoveryProgress(10);

        let progressInterval: NodeJS.Timeout | null = setInterval(() => {
            setDiscoveryProgress(prev => Math.min(prev + 2, 85)); 
            setEstimatedDiscoveryTime(prev => Math.max(10, prev -1)); 
        }, 1000);

        try {
            setDiscoveryStatusMessage("Browsing OPC UA server nodes... This can take a while.");
            const response = await fetch('/api/opcua/discover', { method: 'POST' });
            
            const backendDurationSeconds = discoveryStartTimeRef.current ? ((Date.now() - discoveryStartTimeRef.current) / 1000).toFixed(1) : 'N/A';

            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            setDiscoveryProgress(90);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Unknown server error during discovery." }));
                throw new Error(errorData.message || `Discovery request failed: ${response.statusText} (${response.status})`);
            }
            
            const result = await response.json();
            const SUCCESS_MESSAGE_PATTERN = "datapoints discovered and saved successfully";
            const messageIndicatesSuccess = result.message && result.message.toLowerCase().includes(SUCCESS_MESSAGE_PATTERN);
            // More robust check for nodes, ensuring it's an array, even if empty, for successful mapping
            const nodesAreValidArray = Array.isArray(result.nodes); 
            const nodesArePresentOrNull = result.nodes === null || nodesAreValidArray;


            if ((result.success && nodesAreValidArray) || (messageIndicatesSuccess && nodesArePresentOrNull)) {
                if (messageIndicatesSuccess && !result.success) {
                    addLogEntry('warning', "Interpreting discovery as successful based on message content despite other flags.", `Raw: success=${result.success}, nodes_present=${!!result.nodes}, msg=${result.message}`);
                }

                const nodesToProcess: DiscoveredRawDataPoint[] = Array.isArray(result.nodes) ? result.nodes : [];
                setDiscoveredRawPoints(nodesToProcess);
                setDiscoveredDataFilePath(result.filePath || null);
                
                const successMsg = messageIndicatesSuccess 
                                   ? result.message 
                                   : (result.message || `Discovery successful: Found ${nodesToProcess.length} raw datapoints in ${backendDurationSeconds}s.`);
                
                setDiscoveryStatusMessage(successMsg);
                addLogEntry('info', successMsg, result.filePath ? `Server log: Datapoints saved to ${result.filePath}` : (messageIndicatesSuccess ? "Parsed as success via message." : ""));
                setDiscoveryProgress(100);
                toast.success(messageIndicatesSuccess ? "Discovery Completed" : "OPC UA Discovery Completed!", { 
                    description: messageIndicatesSuccess ? result.message : `Found ${nodesToProcess.length} points.` 
                });

                const baseConfiguredPoints: ExtendedDataPointConfig[] = nodesToProcess.map((rawPoint: DiscoveredRawDataPoint, index: number) => {
                    let generatedId = rawPoint.browseName?.toLowerCase().replace(/[^a-z0-9_.]+/g, '-').replace(/^-+|-+$/g, '') || `dp-${index}-${Date.now()}`;
                    if(!generatedId || generatedId === `dp-${index}-${Date.now()}`) generatedId = rawPoint.nodeId.replace(/[^a-z0-9]+/gi, '-') || `unknown-node-${index}-${Date.now()}`;
                    
                    let mappedDataType: typeof DATA_TYPE_OPTIONS[number] = 'String';
                    const rawDT = rawPoint.dataType?.toLowerCase();
                    if (rawDT) {
                        if (rawDT.includes('bool')) mappedDataType = 'Boolean';
                        else if (rawDT.includes('float')) mappedDataType = 'Float';
                        else if (rawDT.includes('double')) mappedDataType = 'Double';
                        else if (rawDT.includes('string')) mappedDataType = 'String';
                        else if (rawDT.includes('int16') || rawDT.includes('short')) mappedDataType = 'Int16';
                        else if (rawDT.includes('uint16') || rawDT.includes('ushort')) mappedDataType = 'UInt16';
                        else if (rawDT.includes('int32') || (rawDT.includes('int') && !rawDT.includes('int64'))) mappedDataType = 'Int32';
                        else if (rawDT.includes('uint32') || (rawDT.includes('uint') && !rawDT.includes('uint64'))) mappedDataType = 'UInt32';
                        else if (rawDT.includes('int64') || rawDT.includes('long')) mappedDataType = 'Int64';
                        else if (rawDT.includes('uint64') || rawDT.includes('ulong')) mappedDataType = 'UInt64';
                        else if (rawDT.includes('datetime')) mappedDataType = 'DateTime';
                        else if (rawDT.includes('byte') && !rawDT.includes('bytestring')) mappedDataType = 'Byte';
                        else if (rawDT.includes('sbyte')) mappedDataType = 'SByte';
                        else if (rawDT.includes('guid')) mappedDataType = 'Guid';
                        else if (rawDT.includes('bytestring')) mappedDataType = 'ByteString';
                    }

                    return {
                        id: generatedId,
                        name: rawPoint.displayName || rawPoint.browseName || `Unnamed Datapoint ${index + 1}`,
                        nodeId: rawPoint.nodeId,
                        label: rawPoint.displayName || rawPoint.browseName || generatedId,
                        dataType: mappedDataType,
                        uiType: 'display',
                        icon: DEFAULT_ICON, 
                        iconName: "Sigma", 
                        category: 'Discovered',
                        phase: 'a',
                    };
                });
                setAiEnhancedPoints(baseConfiguredPoints); 
            } else {
                throw new Error(result.message || "Discovery process completed but reported failure or returned no/invalid nodes.");
            }
        } catch (error: any) {
            console.error("Discovery process error:", error);
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            setDiscoveryProgress(0);
            const errorMsgForDisplay = `Discovery Error: ${error.message}`;
            setDiscoveryStatusMessage(errorMsgForDisplay);
            addLogEntry('error', "Discovery Process Failed", error.message);
            toast.error("Discovery Failed", { description: error.message.length > 100 ? error.message.substring(0,97) + "..." : error.message });
        } finally {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            setIsDiscovering(false);
            discoveryStartTimeRef.current = null;
            setEstimatedDiscoveryTime(0);
        }
    };
    
    const handleStartAiEnhancement = async () => {
        if (discoveredRawPoints.length === 0 && !discoveredDataFilePath) {
            toast.error("No Data for AI", { description: "Please run OPC UA Discovery first to get datapoints."});
            return;
        }
        if (!GEMINI_API_KEY_EXISTS_CLIENT && !userProvidedGeminiKey.trim()) {
            addLogEntry('warning', "Gemini API Key required for AI enhancement.");
            toast.error("Gemini API Key Missing", { description: "Please provide your Gemini API Key below or set it in environment variables."});
            setShowGeminiKeyInput(true);
            return;
        }

        setIsAiProcessing(true);
        setAiProgress(5);
        setAiStatusMessage("Preparing data for AI...");
        addLogEntry('system', "Initiating AI-driven configuration enhancement...");
        aiStartTimeRef.current = Date.now();
        const pointCount = discoveredRawPoints.length || (discoveredDataFilePath ? 50 : 0);
        setEstimatedAiTime(Math.max(15, Math.ceil(pointCount * ESTIMATED_MS_PER_NODE_AI / 1000)));

        let progressInterval: NodeJS.Timeout | null = setInterval(() => {
            setAiProgress(prev => Math.min(prev + 2, 90));
            setEstimatedAiTime(prev => Math.max(5, prev -1));
        }, 1000);

        try {
            setAiStatusMessage(`Sending ${pointCount} datapoints to AI for analysis...`);
            const requestBody = {
                filePath: discoveredDataFilePath,
                geminiApiKey: userProvidedGeminiKey || undefined
            };

            const response = await fetch('/api/ai/generate-datapoints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const backendAiDuration = aiStartTimeRef.current ? ((Date.now() - aiStartTimeRef.current) / 1000).toFixed(1) : 'N/A';
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "AI generation API error." }));
                throw new Error(errorData.message || `AI Enhancement API failed: ${response.statusText} (${response.status})`);
            }
            setAiProgress(95);
            const result = await response.json();

            if (result.success && result.data) {
                const enhanced: ExtendedDataPointConfig[] = result.data.map((dp: any) => ({
                    ...dp, 
                    id: dp.id || dp.nodeId?.replace(/[^a-z0-9]+/gi, '-') || `ai-dp-${Math.random().toString(36).substring(7)}`,
                    iconName: dp.icon || "Tag", 
                    icon: getIconComponent(dp.icon) || DEFAULT_ICON,
                }));
                setAiEnhancedPoints(enhanced);
                const successMsg = `AI successfully enhanced ${result.data.length} datapoints in ${backendAiDuration}s.`;
                setAiStatusMessage(successMsg);
                addLogEntry('ai', successMsg);
                toast.success("AI Enhancement Completed!");
                setAiProgress(100);
            } else {
                throw new Error(result.message || "AI enhancement process failed or returned no data.");
            }

        } catch (error: any) {
            console.error("AI Enhancement error:", error);
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            setAiProgress(0);
            const errorMsg = `AI Enhancement Error: ${error.message}`;
            setAiStatusMessage(errorMsg);
            addLogEntry('error', "AI Process Failed", error.message);
            toast.error("AI Enhancement Failed", { description: error.message.length > 100 ? error.message.substring(0,97) + "..." : error.message});
        } finally {
             if (progressInterval) {
                clearInterval(progressInterval);
            }
            setIsAiProcessing(false);
            aiStartTimeRef.current = null;
            setEstimatedAiTime(0);
        }
    };
    
    const handleSaveConfiguration = () => {
        const pointsToSave = aiEnhancedPoints.length > 0 ? aiEnhancedPoints : configuredDataPoints;

        if (pointsToSave.length === 0) {
            toast.info("No Data to Save", { description: "Please discover/enhance or upload/add data points first." });
            return;
        }
        
        setIsLoading(true);
        addLogEntry('system', `Attempting to save ${pointsToSave.length} configured data points...`);
        
        const finalPointsToSave = pointsToSave.map((point) => {
            const { iconName, ...rest } = point as ExtendedDataPointConfig; 
            return {
                ...rest,
                icon: rest.icon || getIconComponent(iconName) || DEFAULT_ICON, 
            };
        });

        setConfiguredDataPoints(finalPointsToSave as DataPointConfig[]); 
        
        setTimeout(() => { 
            setIsLoading(false);
            const msg = `Configuration with ${finalPointsToSave.length} data points saved to context.`;
            addLogEntry('info', msg);
            toast.success("Configuration Saved!", { description: "Setup applied for this onboarding session." });
        }, 1000);
    };
    
    const handleResetConfiguration = () => {
        addLogEntry('system', "Configuration reset initiated by user.");
        setConfiguredDataPoints([]); 
        setDiscoveredRawPoints([]);
        setAiEnhancedPoints([]);
        setDiscoveredDataFilePath(null);
        setProcessLog(prev => prev.filter(p => p.type === 'system' && p.message.includes("Configuration reset initiated"))); 
        setDiscoveryStatusMessage("");
        setAiStatusMessage("");
        setDiscoveryProgress(0);
        setAiProgress(0);
        toast.info("Configuration Reset", { description: "All discovered and AI-enhanced data points have been cleared." });
    };

    const openEditModal = (pointToEdit: ExtendedDataPointConfig) => {
        const iconComp = pointToEdit.icon as any; 
        const currentIconName = pointToEdit.iconName || 
                              (typeof iconComp === 'function' ? (Object.keys(lucideIcons).find(key => lucideIcons[key as keyof typeof lucideIcons] === iconComp)) : undefined ) || 
                              "Sigma";
        
        setEditingPoint(JSON.parse(JSON.stringify({
            ...pointToEdit,
            iconName: currentIconName,
        })));
        setIsEditModalOpen(true);
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!editingPoint) return;
        const { name, value, type } = e.target;
        let finalValue: any = value;

        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (name === 'min' || name === 'max' || name === 'factor' || name === 'precision') {
            if (value === '') finalValue = undefined; 
            else finalValue = parseFloat(value);
            if (isNaN(finalValue as number)) finalValue = (editingPoint as any)[name] ?? undefined; 
        }
        
        setEditingPoint(prev => prev ? ({ ...prev, [name]: finalValue }) : null);
    };
    
     const handleEditSelectChange = (fieldName: keyof ExtendedDataPointConfig, value: string) => {
        if (!editingPoint) return;
        setEditingPoint(prev => {
            if (!prev) return null;
            const updatedPoint = { ...prev, [fieldName]: value };
            if (fieldName === 'iconName') {
                updatedPoint.icon = getIconComponent(value) || DEFAULT_ICON;
            }
            return updatedPoint;
        });
    };

    const saveEditedPoint = () => {
        if (!editingPoint) return;
        const finalEditedPoint = {
            ...editingPoint,
            icon: getIconComponent(editingPoint.iconName) || DEFAULT_ICON,
        };

        const listToUpdate = aiEnhancedPoints.length > 0 ? aiEnhancedPoints : configuredDataPoints;
        const setListFunction = aiEnhancedPoints.length > 0 ? setAiEnhancedPoints : setConfiguredDataPoints;
        
        const updatedPoints = listToUpdate.map(p => p.id === finalEditedPoint.id ? finalEditedPoint : p);
        setListFunction(updatedPoints as any);

        addLogEntry('info', `Datapoint "${finalEditedPoint.name}" (ID: ${finalEditedPoint.id}) updated locally.`);
        toast.success(`"${finalEditedPoint.name}" updated.`);
        setIsEditModalOpen(false);
        setEditingPoint(null);
    };

    const currentPointsToDisplay = aiEnhancedPoints.length > 0 ? aiEnhancedPoints : configuredDataPoints;

    return (
    <motion.div
        key="datapoint-config-step-v5" // Incremented key for potential full re-render on major change
        variants={containerVariants} initial="hidden" animate="visible" exit="exit"
        className="space-y-6 p-4 sm:p-6 bg-background text-foreground"
    >
        {/* Header Card */}
         <motion.div variants={itemVariants(0)}>
            <Card className="shadow-lg border-border">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <Sigma className="h-7 w-7 text-primary"/>
                        <CardTitle className="text-xl sm:text-2xl">Datapoint Configuration</CardTitle>
                    </div>
                    <CardDescription className="text-sm text-muted-foreground">
                        Discover datapoints from your OPC UA server, then (optionally) use AI to generate detailed configurations.
                    </CardDescription>
                </CardHeader>
            </Card>
        </motion.div>

        {/* OPC UA Discovery Section */}
        <motion.div variants={itemVariants(0.1)}>
            <Card className="border-border">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                         <div className="flex items-center space-x-3">
                            <RefreshCw className="h-6 w-6 text-blue-500 dark:text-blue-400 shrink-0"/>
                            <CardTitle className="text-lg">OPC UA Discovery</CardTitle>
                        </div>
                        <Button 
                            onClick={handleStartOpcuaDiscovery} 
                            disabled={isDiscovering || isAiProcessing}
                            variant={discoveredRawPoints.length > 0 || aiEnhancedPoints.length > 0 ? "outline" : "default"}
                            className="group w-full sm:w-auto"
                        >
                            {isDiscovering ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <ListChecks className="h-4 w-4 mr-2 group-hover:animate-pulse"/>}
                            {isDiscovering ? "Discovering..." : (discoveredRawPoints.length > 0 || aiEnhancedPoints.length > 0 ? "Re-Discover Points" : "Start PLC Discovery")}
                        </Button>
                    </div>
                     <CardDescription className="pt-2 text-xs text-muted-foreground">
                        Attempt to discover available datapoints (nodes) from the configured OPC UA server. This will clear previous discovery and AI results.
                    </CardDescription>
                </CardHeader>
                <AnimatePresence>
                {(isDiscovering || (discoveryStatusMessage && !isDiscovering)) && ( // Show if discovering OR if there's a status message and not currently discovering
                    <motion.div variants={contentAppearVariants} initial="hidden" animate="visible" exit="exit">
                        <CardContent className="pt-2">
                            {isDiscovering && (
                                <div className="space-y-2 mt-2">
                                    <Progress value={discoveryProgress} className="w-full h-2.5" />
                                    <p className="text-xs text-muted-foreground text-center animate-pulse">
                                        {discoveryStatusMessage} (Estimated: <span className="font-medium">{Math.max(0, estimatedDiscoveryTime).toFixed(0)}s</span>)
                                    </p>
                                </div>
                            )}
                            {/* This block now shows any discoveryStatusMessage when not discovering.
                                The styling depends on keywords. "aborted" typically signals an issue.
                                "unavailable" also usually indicates a problem.
                                We ensure the positive messages from discovery (like "Datapoints discovered...")
                                do NOT contain these keywords.
                            */}
                            {!isDiscovering && discoveryStatusMessage && (
                                 <p className={cn(
                                    "text-sm p-3 rounded-md border text-center",
                                    discoveryStatusMessage.toLowerCase().includes("error") || 
                                    discoveryStatusMessage.toLowerCase().includes("fail") || 
                                    discoveryStatusMessage.toLowerCase().includes("aborted") ||
                                    discoveryStatusMessage.toLowerCase().includes("unavailable") // Add "unavailable" for error styling
                                    ? 
                                    "bg-destructive/10 border-destructive/30 text-destructive dark:bg-red-900/30 dark:border-red-700/50 dark:text-red-300" 
                                    : 
                                    "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:bg-green-900/30 dark:border-green-700/50 dark:text-green-300"
                                )}>
                                    {discoveryStatusMessage}
                                </p>
                            )}
                        </CardContent>
                    </motion.div>
                )}
                </AnimatePresence>
            </Card>
        </motion.div>
        
        {/* Process Log */}
        <motion.div variants={itemVariants(0.15)}>
            <Card className="border-border">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                         <FileJson className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                        <CardTitle className="text-lg">Process Log</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea ref={processLogRef} className="h-48 w-full rounded-md border border-border p-3 text-xs bg-muted/20 dark:bg-neutral-800/40 shadow-inner">
                        {processLog.length === 0 && <p className="text-muted-foreground text-center italic py-4">No operations performed yet.</p>}
                        {processLog.map(log => (
                            <div key={log.id} className="mb-2.5 last:mb-0 border-b border-border/50 dark:border-neutral-700/60 pb-1.5 last:border-b-0 last:pb-0">
                                <span className="text-muted-foreground/80 dark:text-muted-foreground/70 mr-2 tabular-nums">{log.timestamp}</span>
                                <span className={cn("font-medium", 
                                    log.type === 'error' && "text-red-600 dark:text-red-400", 
                                    log.type === 'warning' && "text-amber-600 dark:text-amber-400", 
                                    log.type === 'info' && "text-sky-600 dark:text-sky-400", 
                                    log.type === 'system' && "text-gray-700 dark:text-gray-300", 
                                    log.type === 'ai' && "text-purple-600 dark:text-purple-400"
                                )}>
                                    [{log.type.toUpperCase()}]
                                </span>
                                <span className="ml-1.5 text-foreground/90 dark:text-foreground/80">{log.message}</span>
                                {log.details && <p className="ml-4 pl-1 text-muted-foreground/90 dark:text-muted-foreground/70 text-[0.7rem] break-all">{log.details}</p>}
                            </div>
                        ))}
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>

        {/* AI Enhancement Section */}
        <AnimatePresence>
        {/* Condition changed slightly: show if discovery has yielded points (raw or enhanced from previous step), 
            or a file path exists, AND we are not actively discovering (to prevent UI flicker/overlap)
            AND AI is not currently processing
        */}
        {( (discoveredRawPoints.length > 0 || aiEnhancedPoints.length > 0 || discoveredDataFilePath) && !isDiscovering && !isAiProcessing) && (
        <motion.div variants={contentAppearVariants} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
                 <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                         <div className="flex items-center space-x-3">
                            <Wand2 className="h-6 w-6 text-purple-500 dark:text-purple-400 shrink-0"/>
                            <CardTitle className="text-lg">AI Enhancement (Gemini)</CardTitle>
                        </div>
                        <Button 
                            onClick={handleStartAiEnhancement} 
                            disabled={isDiscovering || isAiProcessing || (discoveredRawPoints.length === 0 && !discoveredDataFilePath)}
                            className="group w-full sm:w-auto"
                            variant={aiEnhancedPoints.length > 0 && aiStatusMessage.toLowerCase().includes("success") && !isAiProcessing ? "outline" : "default"}
                         >
                            {isAiProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Sigma className="h-4 w-4 mr-2 group-hover:animate-pulse"/>}
                            {isAiProcessing ? "AI Processing..." : (aiEnhancedPoints.length > 0 && aiStatusMessage.toLowerCase().includes("success") ? "Re-Run AI Enhancement" : "Start AI Enhancement")}
                        </Button>
                    </div>
                     <CardDescription className="pt-2 text-xs text-muted-foreground">
                        Use Gemini AI to analyze discovered datapoints and generate richer configurations. Requires a configured Gemini API Key or providing one below.
                    </CardDescription>
                     {showGeminiKeyInput && (
                        <div className="mt-3 p-3 border border-border rounded-md bg-muted/20 dark:bg-neutral-800/30 space-y-2">
                             <Label htmlFor="gemini-key-input" className="text-sm font-medium">Enter Your Gemini API Key:</Label>
                            <div className="flex items-center space-x-2">
                                <Input id="gemini-key-input" type="password" value={userProvidedGeminiKey} onChange={(e) => setUserProvidedGeminiKey(e.target.value)} placeholder="Your Gemini API Key" className="flex-grow"/>
                                <Button size="sm" variant="secondary" onClick={() => { if (userProvidedGeminiKey.trim()) { toast.success("Gemini API Key temporarily set for this session."); setShowGeminiKeyInput(false); addLogEntry('system', 'User provided Gemini API key for session.') } else { toast.error("Please enter a valid API Key.");}}}>Set Key</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">This key will be used for this session only and is not stored permanently by this application unless configured in your environment.</p>
                        </div>
                     )}
                </CardHeader>
                <AnimatePresence>
                {(isAiProcessing || (aiStatusMessage && !isAiProcessing)) && (
                     <motion.div variants={contentAppearVariants} initial="hidden" animate="visible" exit="exit"> 
                        <CardContent className="pt-0"> 
                             {isAiProcessing && (
                                <div className="space-y-2 mt-2">
                                     <Progress value={aiProgress} className="w-full h-2.5 bg-purple-200 dark:bg-purple-800/50 [&>div]:bg-purple-500 dark:[&>div]:bg-purple-400" />
                                    <p className="text-xs text-muted-foreground text-center animate-pulse">
                                        {aiStatusMessage} (Estimated: <span className="font-medium">{Math.max(0, estimatedAiTime).toFixed(0)}s</span>)
                                    </p>
                                </div>
                            )}
                            {!isAiProcessing && aiStatusMessage && (
                                <p className={cn(
                                    "text-sm p-3 rounded-md border text-center", 
                                    aiStatusMessage.toLowerCase().includes("error") || aiStatusMessage.toLowerCase().includes("fail") ? 
                                    "bg-destructive/10 border-destructive/30 text-destructive dark:bg-red-900/30 dark:border-red-700/50 dark:text-red-300" : 
                                    "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700/50 dark:text-purple-300"
                                )}>
                                    {aiStatusMessage}
                                </p>
                            )}
                        </CardContent>
                    </motion.div>
                )}
                </AnimatePresence>
            </Card>
        </motion.div>
        )}
        </AnimatePresence>

        {/* Datapoints Table and Save actions */}
        <AnimatePresence>
        {(currentPointsToDisplay.length > 0) && (
            <motion.div variants={contentAppearVariants} initial="hidden" animate="visible" exit="exit" key="datapoints-display-card">
                 <Card className="border-border">
                     <CardHeader>
                         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3">
                                <Database className="h-6 w-6 text-green-500 dark:text-green-400 shrink-0"/>
                                <CardTitle className="text-lg">Configured Datapoints ({currentPointsToDisplay.length})</CardTitle>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                         <Button variant="outline" className="group flex-grow sm:flex-grow-0 border-amber-500/50 hover:border-amber-500 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:border-amber-600/50 dark:hover:border-amber-500 dark:hover:bg-amber-500/20">
                                            <RotateCcw className="h-4 w-4 mr-2 group-hover:rotate-[-45deg] transition-transform"/> Reset All
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Confirm Reset</AlertDialogTitle><AlertDialogDescription>Are you sure you want to reset all discovered and AI-enhanced datapoint configurations? This action cannot be undone for the current session.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleResetConfiguration} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Confirm Reset</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button onClick={handleSaveConfiguration} disabled={isLoading} className="group flex-grow sm:flex-grow-0">
                                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2 group-hover:scale-110"/> }
                                    {isLoading ? "Saving..." : "Save Configuration"}
                                </Button>
                            </div>
                        </div>
                         <CardDescription className="pt-2 text-xs text-muted-foreground">
                           Review and edit items. Click "Save Configuration" to apply these to the current onboarding data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 sm:px-2 md:px-4">
                        <ScrollArea className="max-h-[500px] sm:max-h-[600px] md:max-h-[700px] w-full rounded-md border border-border shadow-inner bg-card dark:bg-neutral-800/20">
                            <Table className="min-w-full text-xs">
                                <TableHeader className="sticky top-0 bg-muted/90 dark:bg-neutral-700/60 backdrop-blur-sm z-10"><TableRow className="border-b-border dark:border-b-neutral-600"><TableHead className="w-[150px] sm:w-[200px] px-2 py-2.5">Name / Label</TableHead><TableHead className="w-[180px] sm:w-[220px] px-2 py-2.5">NodeId (Address)</TableHead><TableHead className="w-[80px] sm:w-[100px] px-2 py-2.5">Data Type</TableHead><TableHead className="w-[80px] sm:w-[100px] px-2 py-2.5">UI Type</TableHead><TableHead className="w-[120px] sm:w-[150px] px-2 py-2.5">Category</TableHead><TableHead className="w-[50px] sm:w-[70px] px-2 py-2.5 text-center">Icon</TableHead><TableHead className="w-[60px] sm:w-[80px] px-2 py-2.5">Unit</TableHead><TableHead className="w-[50px] px-2 py-2.5 text-center">Edit</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {currentPointsToDisplay.map((dpExt, index) => {
                                        const dp = dpExt as ExtendedDataPointConfig; 
                                        const DisplayIcon = dp.icon && typeof dp.icon === 'function' ? dp.icon : (getIconComponent(dp.iconName) || DEFAULT_ICON);
                                        return (
                                            <TableRow key={dp.id || `dp-${index}-${dp.nodeId}`} className="hover:bg-muted/50 dark:hover:bg-neutral-700/40 border-b-border dark:border-b-neutral-700/60 last:border-b-0">
                                                <TableCell className="font-medium px-2 py-1.5 align-top"><span className="font-semibold block">{dp.label || dp.name}</span><span className="text-muted-foreground text-[0.7rem] block">{dp.name !== (dp.label || dp.name) ? `(${dp.name})`: ''}</span></TableCell>
                                                <TableCell className="text-muted-foreground px-2 py-1.5 align-top break-all">{dp.nodeId}</TableCell>
                                                <TableCell className="px-2 py-1.5 align-top">{dp.dataType}</TableCell><TableCell className="px-2 py-1.5 align-top">{dp.uiType}</TableCell><TableCell className="px-2 py-1.5 align-top">{dp.category}</TableCell>
                                                <TableCell className="px-2 py-1.5 align-top text-center">{DisplayIcon && typeof DisplayIcon === 'function' && <DisplayIcon className="h-4 w-4 inline-block text-muted-foreground" />}</TableCell>
                                                <TableCell className="px-2 py-1.5 align-top">{dp.unit || 'N/A'}</TableCell>
                                                <TableCell className="px-2 py-1.5 align-top text-center"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(dp)}><Maximize className="h-3.5 w-3.5 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"/></Button></TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </motion.div>
        )}
        </AnimatePresence>
         
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] max-h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle className="text-xl">Edit Data Point: {editingPoint?.name}</DialogTitle><DialogDescription className="text-muted-foreground">Modify the details. Changes are local until "Save Configuration".</DialogDescription></DialogHeader>
                <ScrollArea className="flex-grow pr-6 -mr-6">
                    {editingPoint && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 ">
                            <div className="space-y-1.5"><Label htmlFor="edit-id">ID (Read-only)</Label><Input id="edit-id" name="id" value={editingPoint.id} readOnly disabled className="bg-muted/50 dark:bg-neutral-700/40 opacity-70"/></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-nodeId">Node ID (Read-only)</Label><Input id="edit-nodeId" name="nodeId" value={editingPoint.nodeId} readOnly disabled className="bg-muted/50 dark:bg-neutral-700/40 opacity-70"/></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-name">Name</Label><Input id="edit-name" name="name" value={editingPoint.name} onChange={handleEditFormChange} /></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-label">Label (UI Display)</Label><Input id="edit-label" name="label" value={editingPoint.label ?? ''} onChange={handleEditFormChange} /></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-dataType">Data Type</Label><Select name="dataType" value={editingPoint.dataType} onValueChange={(value) => handleEditSelectChange('dataType', value)}><SelectTrigger id="edit-dataType"><SelectValue /></SelectTrigger><SelectContent>{DATA_TYPE_OPTIONS.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-uiType">UI Type</Label><Select name="uiType" value={editingPoint.uiType} onValueChange={(value) => handleEditSelectChange('uiType', value)}><SelectTrigger id="edit-uiType"><SelectValue /></SelectTrigger><SelectContent>{UI_TYPE_OPTIONS.map(uit => <SelectItem key={uit} value={uit}>{uit}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-iconName">Icon Name (Lucide)</Label><Input id="edit-iconName" name="iconName" value={editingPoint.iconName ?? ''} onChange={(e) => handleEditSelectChange('iconName', e.target.value)} /><p className="text-xs text-muted-foreground pt-1">E.g., "Zap", "Settings". Current: {getIconComponent(editingPoint.iconName) ? <span className="inline-flex items-center"><>{React.createElement(getIconComponent(editingPoint.iconName)!, {className: "h-3 w-3 mr-1"})} Valid</></span> : <span className="text-orange-500 dark:text-orange-400">Not found or invalid</span>}</p></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-unit">Unit</Label><Input id="edit-unit" name="unit" value={editingPoint.unit ?? ''} onChange={handleEditFormChange} /></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-category">Category</Label><Input id="edit-category" name="category" value={editingPoint.category ?? ''} onChange={handleEditFormChange} /></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-min">Min Value</Label><Input id="edit-min" name="min" type="number" value={editingPoint.min ?? ''} onChange={handleEditFormChange} /></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-max">Max Value</Label><Input id="edit-max" name="max" type="number" value={editingPoint.max ?? ''} onChange={handleEditFormChange} /></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-factor">Factor</Label><Input id="edit-factor" name="factor" type="number" value={editingPoint.factor ?? ''} onChange={handleEditFormChange} /></div>
                            <div className="space-y-1.5"><Label htmlFor="edit-precision">Precision (Decimals)</Label><Input id="edit-precision" name="precision" type="number" step="1" min="0" value={editingPoint.precision ?? ''} onChange={handleEditFormChange} /></div>
                            <div className="flex items-center space-x-2 pt-4 md:col-span-1"><Input type="checkbox" id="edit-isWritable" name="isWritable" checked={editingPoint.isWritable ?? false} onChange={handleEditFormChange} className="h-4 w-4 accent-primary"/><Label htmlFor="edit-isWritable" className="text-sm font-normal">Is Writable?</Label></div>
                            <div className="md:col-span-2 space-y-1.5"><Label htmlFor="edit-description">Description</Label><Textarea id="edit-description" name="description" value={editingPoint.description ?? ''} onChange={handleEditFormChange} className="min-h-[70px]" /></div>
                            <div className="md:col-span-2 space-y-1.5"><Label htmlFor="edit-notes">Internal Notes</Label><Textarea id="edit-notes" name="notes" value={editingPoint.notes ?? ''} onChange={handleEditFormChange} className="min-h-[70px]" /></div>
                        </div>
                    )}
                </ScrollArea>
                <DialogFooter className="pt-4 border-t border-border dark:border-neutral-700"><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={saveEditedPoint}>Save Changes</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </motion.div>
  );
}