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
    FileJson, Wand2, Maximize, Save, Download, UploadCloud, FileSpreadsheet, Trash2, Merge, CloudUpload, PlusCircle, XCircle, CheckCircle, AlertTriangle, Info, MessageSquare, Send, User, Bot, AlertCircle, CheckCircle2, InfoIcon, Loader as LoaderIcon
} from 'lucide-react';
import * as lucideIcons from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react'; // Added for template download footer
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox

import { cn } from '@/lib/utils';

const GEMINI_API_KEY_EXISTS_CLIENT = process.env.NEXT_PUBLIC_GEMINI_API_KEY_EXISTS === 'true';

interface ExtendedDataPointConfig extends DataPointConfig {
    iconName?: string;
    precision?: number;
    isWritable?: boolean;
    enumSet?: Record<number | string, string>;
    source?: 'discovered' | 'ai-enhanced' | 'manual' | 'imported'; // Added source field
}

// Enhanced getIconComponent to handle potential direct component passthrough
function getIconComponent(iconNameOrComponent: string | IconComponentType | undefined): IconComponentType | undefined {
    if (!iconNameOrComponent) return undefined;
    if (typeof iconNameOrComponent === 'function') return iconNameOrComponent; // Already a component

    const normalizedIconName = iconNameOrComponent.replace(/Icon$/, '');
    const icons = lucideIcons as unknown as Record<string, IconComponentType>;
    const iconKey = Object.keys(icons).find(key => key.toLowerCase() === normalizedIconName.toLowerCase());
    return iconKey ? icons[iconKey] : undefined;
}

const DEFAULT_ICON: IconComponentType = Merge; // Changed default icon to Merge

// --- Interfaces from DataPointConfigStep ---
interface ProcessingSummary {
    processed: number;
    updated: number;
    added: number;
    skipped: number;
    errors: number;
    errorDetails: string[];
    plantDetailsUpdated?: boolean;
}
type PartialDataPointFromFile = Partial<Omit<DataPointConfig, 'icon'>> & { icon?: string | IconComponentType };
interface FullConfigFile {
    plantName?: string;
    plantLocation?: string;
    plantType?: string;
    plantCapacity?: string;
    opcUaEndpointOffline?: string;
    appName?: string;
    opcUaEndpointOfflineIP?: string;
    opcUaEndpointOfflinePort?: number;
    opcUaEndpointOnlineIP?: string;
    opcUaEndpointOnlinePort?: number;
    configuredDataPoints: PartialDataPointFromFile[];
}

// Storing numbers as string | undefined from input for easier handling, convert on save
type ManualDataPointState = Partial<Omit<DataPointConfig, 'icon' | 'min' | 'max' | 'factor'> & {
    icon?: string;
    min?: string;
    max?: string;
    factor?: string;
}>;

const initialManualDataPointState: ManualDataPointState = {
    id: '',
    name: '',
    nodeId: '',
    dataType: 'Float',
    uiType: 'display',
    icon: 'Tag',
    unit: '',
    min: '',
    max: '',
    description: '',
    category: 'Manually Added',
    factor: '',
    phase: 'x',
    notes: '',
    label: '',
};

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

// Combined and de-duplicated DATA_TYPE_OPTIONS
const DATA_TYPE_OPTIONS_EXTENDED: ExtendedDataPointConfig['dataType'][] = [
    'Boolean', 'String', 'Float', 'Double', 'Int16', 'UInt16', 'Int32', 'UInt32', 'DateTime',
    'Byte', 'SByte', 'Guid', 'ByteString', 'Int64', 'UInt64' // From Discovery
];
const UI_TYPE_OPTIONS_EXTENDED = [ // Combined and de-duplicated
    'display', 'button', 'switch', 'gauge', 'input', 'slider', 'indicator', 'line-chart' // line-chart was implicitly supported by DataPointConfigStep via default template
] as const;


const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 }, }, };
const itemVariants = (delay: number = 0, yOffset: number = 20, blurAmount: number = 3) => ({ hidden: { opacity: 0, y: yOffset, filter: `blur(${blurAmount}px)` }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 110, damping: 16, delay, mass: 0.9 } }, exit: { opacity: 0, y: -(yOffset / 2), filter: `blur(${blurAmount}px)`, transition: { duration: 0.25 } } });
const contentAppearVariants = { hidden: { opacity: 0, height: 0, y: 15, scale: 0.97 }, visible: { opacity: 1, height: 'auto', y: 0, scale: 1, transition: { duration: 0.45, ease: 'circOut' } }, exit: { opacity: 0, height: 0, y: -15, scale: 0.97, transition: { duration: 0.35, ease: 'circIn' } } };
const buttonMotionProps = (delay: number = 0, primary: boolean = false) => ({ // From DataPointConfigStep
    variants: itemVariants(delay, 15, 2),
    whileHover: {
        scale: 1.03,
        boxShadow: primary ? "0px 7px 22px hsla(var(--primary)/0.3)" : "0px 5px 18px hsla(var(--foreground)/0.12)",
        transition: { type: "spring", stiffness: 350, damping: 12 }
    },
    whileTap: { scale: 0.97, transition: { type: "spring", stiffness: 400, damping: 15 } }
});
const dropzoneVariants = { // From DataPointConfigStep
    idle: { scale: 1, backgroundColor: "hsla(var(--muted)/0.3)", borderColor: "hsla(var(--border))" },
    dragging: { scale: 1.03, backgroundColor: "hsla(var(--primary)/0.05)", borderColor: "hsla(var(--primary)/0.7)" },
};

const formatLogTimestamp = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

const ESTIMATED_MS_PER_NODE_AI = 200; // For AI enhancement

// --- Chat Message Data Structure (Requirement 1) ---
interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
    type?: 'info' | 'error' | 'success' | 'progress' | 'welcome';
    details?: string;
}

// --- Utility function for timestamps (Requirement 6) ---
const formatChatMessageTimestamp = (date: Date = new Date()) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

// --- ChatMessageBubble Component (Requirement 3) ---
const ChatMessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const [showDetails, setShowDetails] = useState(false);
    const isUser = message.sender === 'user';

    const bubbleAlignment = isUser ? 'items-end' : 'items-start';
    const bubbleColor = isUser
        ? 'bg-primary text-primary-foreground'
        : message.type === 'error'
            ? 'bg-destructive text-destructive-foreground'
            : message.type === 'success'
                ? 'bg-green-600 text-white'
                : message.type === 'welcome'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                    : 'bg-muted text-muted-foreground';

    const IconComponent = () => {
        switch (message.type) {
            case 'error': return <AlertCircle className="h-5 w-5 mr-2 shrink-0" />;
            case 'success': return <CheckCircle2 className="h-5 w-5 mr-2 shrink-0" />;
            case 'progress': return <LoaderIcon className="h-5 w-5 mr-2 shrink-0 animate-spin" />;
            case 'info': return <InfoIcon className="h-5 w-5 mr-2 shrink-0" />;
            case 'welcome': return <Bot className="h-5 w-5 mr-2 shrink-0" />;
            default: return isUser ? <User className="h-5 w-5 mr-2 shrink-0" /> : <Bot className="h-5 w-5 mr-2 shrink-0" />;
        }
    };

    return (
        <motion.div
            className={`flex flex-col w-full my-1.5 ${bubbleAlignment}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className={cn("flex items-start max-w-[85%] sm:max-w-[75%] p-3 rounded-xl shadow-md", bubbleColor, isUser ? "rounded-br-none" : "rounded-bl-none")}>
                <IconComponent />
                <div className="flex-grow">
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    {message.details && (
                        <div className="mt-2 pt-1 border-t border-white/20">
                            <Button
                                size="sm"
                                variant="ghost"
                                className={cn("text-xs h-auto p-1 hover:underline", isUser ? "hover:bg-primary/80" : (message.type === 'error' ? "hover:bg-destructive/80" : "hover:bg-muted/80"))}
                                onClick={() => setShowDetails(!showDetails)}
                            >
                                {showDetails ? "Hide Details" : "Show Details"}
                            </Button>
                            {showDetails && <p className="text-xs mt-1 p-1.5 bg-black/10 dark:bg-white/5 rounded-sm break-all">{message.details}</p>}
                        </div>
                    )}
                </div>
            </div>
            <span className={cn("text-xs text-muted-foreground mt-1", isUser ? "mr-1" : "ml-1")}>{message.timestamp}</span>
        </motion.div>
    );
};

// --- AIChatInterface Component (Requirement 2 & 5) ---
const AIChatInterface: React.FC<{ messages: ChatMessage[]; isLoading?: boolean }> = ({ messages, isLoading }) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <Card className="border-border bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
            <CardHeader>
                <div className="flex items-center space-x-3">
                    <MessageSquare className="h-6 w-6 text-purple-500 dark:text-purple-400 shrink-0" />
                    <CardTitle className="text-lg sm:text-xl font-medium">AI Assistant Chat</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground pt-1.5">
                    Interact with the AI to enhance your datapoint configurations. Updates and results will appear here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea ref={scrollAreaRef} className="h-72 w-full rounded-md border border-border p-3 bg-muted/20 dark:bg-neutral-800/40 shadow-inner">
                    {messages.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Bot size={48} className="text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground text-center italic">No messages yet. Start AI enhancement to see updates.</p>
                        </div>
                    )}
                    {messages.map(msg => <ChatMessageBubble key={msg.id} message={msg} />)}
                    {isLoading && messages.length === 0 && ( // Show initial loading state if no messages yet
                         <div className="flex flex-col items-center justify-center h-full">
                            <LoaderIcon size={48} className="text-primary animate-spin mb-3" />
                            <p className="text-primary text-center">Waiting for AI process to start...</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
            {/* Input area can be added later if direct chat input is needed */}
        </Card>
    );
};


export default function DatapointDiscoveryStep() { // Renamed component
    const { configuredDataPoints, setConfiguredDataPoints, setPlantDetails, onboardingData } = useOnboarding();
    const [isLoading, setIsLoading] = useState(false); // General loading for save, etc.

    // States from DataPointConfigStep (file processing)
    const [file, setFile] = useState<File | null>(null);
    const [isFileProcessingLoading, setIsFileProcessingLoading] = useState(false); // Renamed from isLoading
    const [fileProcessingSummary, setFileProcessingSummary] = useState<ProcessingSummary | null>(null); // Renamed from processingSummary
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    // States for manual data point entry (from DataPointConfigStep)
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualDataPoint, setManualDataPoint] = useState<ManualDataPointState>(initialManualDataPointState);
    const [manualFormErrors, setManualFormErrors] = useState<Record<string, string>>({});

    // States from original DatapointDiscoveryStep
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveredRawPoints, setDiscoveredRawPoints] = useState<DiscoveredRawDataPoint[]>([]);
    const [discoveryProgress, setDiscoveryProgress] = useState(0);
    const [discoveryStatusMessage, setDiscoveryStatusMessage] = useState("");
    // const [estimatedDiscoveryTime, setEstimatedDiscoveryTime] = useState(0); // Removed
    const [discoveredDataFilePath, setDiscoveredDataFilePath] = useState<string | null>(null);
    const [progressPollIntervalId, setProgressPollIntervalId] = useState<NodeJS.Timeout | null>(null); // Added state for polling

    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);
    // const [aiStatusMessage, setAiStatusMessage] = useState(""); // Replaced by chat messages
    const [estimatedAiTime, setEstimatedAiTime] = useState(0);
    const [currentAiTaskId, setCurrentAiTaskId] = useState<string | null>(null);
    const [aiTaskPollIntervalId, setAiTaskPollIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [showContinueAiButton, setShowContinueAiButton] = useState<boolean>(false);

    const [aiEnhancedPoints, setAiEnhancedPoints] = useState<ExtendedDataPointConfig[]>([]);

    const [processLog, setProcessLog] = useState<ProcessingLogEntry[]>([]);
    const processLogRef = useRef<HTMLDivElement>(null);
    const discoveryStartTimeRef = useRef<number | null>(null);
    const aiStartTimeRef = useRef<number | null>(null);

    // --- State for Chat UI (Requirement 7 - part) ---
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([ // Requirement 5 - Initial placeholder
        {
            id: 'initial-ai-welcome',
            sender: 'ai',
            text: "Hello! I'm here to help you enhance your data point configurations using AI. When you start the AI enhancement process, I'll update you here.",
            timestamp: formatChatMessageTimestamp(new Date(Date.now() - 1000)), // A bit in the past
            type: 'welcome',
        }
    ]);

    const [editingPoint, setEditingPoint] = useState<ExtendedDataPointConfig | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userProvidedGeminiKey, setUserProvidedGeminiKey] = useState<string>('');
    const [showGeminiKeyInput, setShowGeminiKeyInput] = useState<boolean>(false);
    const [aiConsentGiven, setAiConsentGiven] = useState<boolean>(false);


    // --- Function to add chat messages (Requirement 6 & 7 - part) ---
    const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        setChatMessages(prev => {
            const newMessages = [
                ...prev,
                {
                    ...message,
                    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    timestamp: formatChatMessageTimestamp(),
                }
            ];
            // Keep only the last 50 messages to prevent performance issues
            if (newMessages.length > 50) return newMessages.slice(-50);
            return newMessages;
        });
    }, []);

    const addLogEntry = useCallback((type: ProcessingLogEntry['type'], message: string, details?: string) => {
        setProcessLog(prev => {
            const newLog = [...prev, { id: Date.now().toString(), timestamp: formatLogTimestamp(), type, message, details }];
            if (newLog.length > 100) return newLog.slice(-100); // Keep last 100 logs
            return newLog;
        });
        // Mirror some log entries to chat messages for better AI interaction visibility
        // This logic will be reviewed; direct addChatMessage calls in handleStartAiEnhancement will be primary for AI chat.
        if (type === 'ai' ||
            ((type === 'info' || type === 'warning' || type === 'error') && message.toLowerCase().includes('ai'))
           ) {
            // Avoid duplicating messages that are now directly sent to chat from AI functions
            if (message.startsWith("AI enhancement progress:") || message.startsWith("Starting AI enhancement process for") || message.startsWith("Great news! AI enhancement is complete")) {
                // These are now handled by more specific chat messages or progress updates.
                // However, we might still want to log them.
            } else {
                let chatType: ChatMessage['type'] = 'info';
                if (type === 'error') chatType = 'error';
                else if (type === 'warning') chatType = 'info';
                else if (type === 'ai' && message.toLowerCase().includes('progress')) chatType = 'progress';
                else if (type === 'ai' && (message.toLowerCase().includes('complete') || message.toLowerCase().includes('success'))) chatType = 'success';

                // Only add if it's not a direct duplicate of what will be sent by polling logic
                // This basic check might need refinement
                if (!chatMessages.find(cm => cm.text === message && cm.sender === 'ai')) {
                    addChatMessage({
                        sender: 'ai',
                        text: message,
                        details: details,
                        type: chatType
                    });
                }
            }
        } else if (type === 'system' && message.toLowerCase().includes('ai')) {
             if (!chatMessages.find(cm => cm.text === message && cm.sender === 'ai')) {
                addChatMessage({
                    sender: 'ai',
                    text: message,
                    details: details,
                    type: 'info'
                });
            }
        }
    }, [addChatMessage, chatMessages]); // Added chatMessages to dep array for the find check

    useEffect(() => {
        if (processLogRef.current) {
            processLogRef.current.scrollTop = processLogRef.current.scrollHeight;
        }
    }, [processLog]);

    // --- AI Task Polling Function ---
    const pollAiTaskStatus = useCallback(async (taskId: string) => {
        if (!taskId) return;

        try {
            const response = await fetch(`/api/ai/generate-datapoints/status/${taskId}`);
            if (!response.ok) {
                const errorText = await response.text();
                addChatMessage({ sender: 'ai', type: 'error', text: 'Error fetching AI task status.', details: `Status: ${response.status}. ${errorText}` });
                addLogEntry('error', `Polling failed for task ${taskId}`, `Status: ${response.status}. ${errorText}`);
                setIsAiProcessing(false);
                setShowContinueAiButton(false); // Don't show continue if polling itself fails badly
                if (aiTaskPollIntervalId) clearInterval(aiTaskPollIntervalId);
                setAiTaskPollIntervalId(null);
                setCurrentAiTaskId(null); // Task is considered failed or inaccessible
                return;
            }

            const status = await response.json();
            addLogEntry('ai', `Polled Task [${taskId}] Status: ${status.status}`, `Progress: ${status.progress?.percent}% Message: ${status.message}`);


            if (status.message && (!chatMessages.find(cm => cm.text === status.message && cm.sender === 'ai') || status.status === 'processing') ) { // Add new messages, or always update for processing status
                 addChatMessage({
                    sender: 'ai',
                    type: status.status === 'processing' ? 'progress' : status.status === 'completed' ? 'success' : status.status.startsWith('error') ? 'error' : 'info',
                    text: status.message,
                    details: status.progress ? `Processed: ${status.progress.current}/${status.progress.total} (${status.progress.percent}%)` : (status.errorDetails || undefined)
                });
            }
            if (status.progress?.percent) {
                setAiProgress(status.progress.percent);
            }

            if (status.status === 'completed') {
                addChatMessage({ sender: 'ai', type: 'success', text: status.message || 'AI processing completed successfully!', details: status.data ? `Enhanced ${status.data.length} points.` : "Completed." });
                setAiEnhancedPoints(status.data || []); // Assuming status.data is the array of ExtendedDataPointConfig
                setIsAiProcessing(false);
                setShowContinueAiButton(false);
                if (aiTaskPollIntervalId) clearInterval(aiTaskPollIntervalId);
                setAiTaskPollIntervalId(null);
                setCurrentAiTaskId(null);
            } else if (status.status === 'error_recoverable') {
                addChatMessage({ sender: 'ai', type: 'warning', text: status.message || 'AI processing paused due to a temporary issue.', details: status.errorDetails });
                setIsAiProcessing(false);
                setShowContinueAiButton(true); // Show continue button
                if (aiTaskPollIntervalId) clearInterval(aiTaskPollIntervalId);
                setAiTaskPollIntervalId(null);
                // currentAiTaskId remains set
            } else if (status.status === 'error_fatal') {
                addChatMessage({ sender: 'ai', type: 'error', text: status.message || 'AI processing failed with a fatal error.', details: status.errorDetails });
                setIsAiProcessing(false);
                setShowContinueAiButton(false);
                if (aiTaskPollIntervalId) clearInterval(aiTaskPollIntervalId);
                setAiTaskPollIntervalId(null);
                setCurrentAiTaskId(null);
            } else if (status.status === 'pending' || status.status === 'processing') {
                // Continue polling, no specific action here as interval is already running
                setIsAiProcessing(true); // Ensure it stays true
                setShowContinueAiButton(false);
            }

        } catch (error: any) {
            addChatMessage({ sender: 'ai', type: 'error', text: 'Failed to fetch or parse AI task status.', details: error.message });
            addLogEntry('error', `Polling exception for task ${taskId}`, error.message);
            setIsAiProcessing(false);
            setShowContinueAiButton(false);
            if (aiTaskPollIntervalId) clearInterval(aiTaskPollIntervalId);
            setAiTaskPollIntervalId(null);
            // setCurrentAiTaskId(null); // Optional: depends if we want to allow manual retry on client error
        }
    }, [addChatMessage, addLogEntry, aiTaskPollIntervalId, chatMessages]);


    // Cleanup polling interval on unmount
    useEffect(() => {
        return () => {
            if (aiTaskPollIntervalId) {
                clearInterval(aiTaskPollIntervalId);
            }
        };
    }, [aiTaskPollIntervalId]);

    // --- Progress Polling Functions --- (Original OPC UA discovery polling)
    const fetchDiscoveryProgress = async () => {
        try {
            const response = await fetch('/api/opcua/discover/status', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`API error ${response.status}`);
            }
            const progressData = await response.json();

            const displayMessage = `${progressData.status}${progressData.details ? `: ${progressData.details}` : ''}`;
            setDiscoveryStatusMessage(displayMessage.length > 150 ? displayMessage.substring(0, 147) + "..." : displayMessage);
            setDiscoveryProgress(progressData.percentage || 0);
            // Log progress polling updates (less verbose)
            if (progressData.percentage % 20 === 0 || progressData.percentage === 100) { // Log every 20% or at 100%
                addLogEntry('info', `Discovery progress: ${progressData.percentage}% - ${progressData.status}`, progressData.details);
            }

            if (progressData.percentage >= 100 ||
                progressData.status?.toLowerCase().includes("success") ||
                progressData.status?.toLowerCase().includes("error") ||
                progressData.status?.toLowerCase().includes("no datapoints found")) {
                stopDiscoveryProgressPolling();
                // Ensure final status is accurately reflected from the main discovery fetch if it completes around the same time.
                // This last fetch here is a fallback.
                if (progressData.percentage < 100 && !progressData.status?.toLowerCase().includes("error")) {
                    // If polling stops early but not due to error, make one last check after a short delay
                    // This is mostly a safeguard, as the main discovery fetch should provide the true final state.
                    setTimeout(async () => {
                        const finalResponse = await fetch('/api/opcua/discover/status', { cache: 'no-store' });
                        const finalProgressData = await finalResponse.json();
                        setDiscoveryStatusMessage(`${finalProgressData.status}${finalProgressData.details ? `: ${finalProgressData.details}` : ''}`);
                        setDiscoveryProgress(finalProgressData.percentage || 100);
                    }, 1000);
                }
            }
        } catch (error: any) {
            console.error("Error fetching discovery progress:", error);
            addLogEntry('warning', "Could not fetch discovery progress.", error.message);
            // Potentially stop polling on repeated errors, but for now, let it retry.
        }
    };

    const startDiscoveryProgressPolling = () => {
        if (progressPollIntervalId) {
            clearInterval(progressPollIntervalId);
        }
        fetchDiscoveryProgress(); // Initial fetch
        const intervalId = setInterval(fetchDiscoveryProgress, 2500);
        setProgressPollIntervalId(intervalId);
    };

    const stopDiscoveryProgressPolling = () => {
        if (progressPollIntervalId) {
            clearInterval(progressPollIntervalId);
            setProgressPollIntervalId(null);
            addLogEntry('system', "Discovery progress polling stopped.");
        }
    };

    // Cleanup effect for polling interval
    useEffect(() => {
        return () => {
            if (progressPollIntervalId) {
                clearInterval(progressPollIntervalId);
            }
        };
    }, [progressPollIntervalId]);


    const testOpcuaConnection = async (): Promise<boolean> => {
        addLogEntry('system', "Checking OPC UA server connection...");
        setDiscoveryStatusMessage("Verifying OPC UA connection...");
        try {
            const response = await fetch('/api/opcua/status', { cache: 'no-store' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `API error ${response.status}` }));
                const reason = `API error ${response.status}: ${errorData.message}`;
                addLogEntry('error', "OPC UA connection test failed", reason);
                setDiscoveryStatusMessage(`Connection test failed: ${reason}`);
                return false;
            }
            const data = await response.json();
            const serverStatus = data.status || data.connectionStatus;

            if (serverStatus === 'connected' || serverStatus === 'online' || serverStatus === 'offline') {
                const connectionType = serverStatus === 'offline' ? 'locally connected (offline mode)' : `connected (${serverStatus})`;
                addLogEntry('info', "OPC UA connection test successful.", `Server is ${connectionType}. Backend reports: ${serverStatus}.`);
                return true;
            } else {
                const reason = `Server reported: ${serverStatus || 'unknown status'}. Please check PLC & backend configuration.`;
                addLogEntry('error', "OPC UA connection test failed", reason);
                setDiscoveryStatusMessage(`OPC UA Connection Unavailable: ${reason}`);
                return false;
            }
        } catch (error: any) {
            const reason = `Network/fetch error: ${error.message}`;
            addLogEntry('error', "OPC UA connection test failed", reason);
            setDiscoveryStatusMessage(`Connection test failed: ${reason}`);
            return false;
        }
    };

    const handleStartOpcuaDiscovery = async () => {
        setIsDiscovering(true);
        setDiscoveryProgress(5);
        setDiscoveredRawPoints([]);
        setAiEnhancedPoints([]);
        setDiscoveredDataFilePath(null);
        setDiscoveryStatusMessage("Initializing discovery...");
        addLogEntry('info', "Initiating OPC UA datapoint discovery..."); // Requirement 1.1
        discoveryStartTimeRef.current = Date.now();

        const isConnected = await testOpcuaConnection(); // Logs success/failure internally
        if (!isConnected) {
            toast.error("Discovery Aborted", { description: discoveryStatusMessage || "Cannot start discovery without a valid OPC UA connection." });
            // OPC UA connection test failed log is handled by testOpcuaConnection
            setIsDiscovering(false);
            setDiscoveryProgress(0);
            return;
        }

        startDiscoveryProgressPolling();

        try {
            const response = await fetch('/api/opcua/discover', { method: 'POST' });
            const backendDurationSeconds = discoveryStartTimeRef.current ? ((Date.now() - discoveryStartTimeRef.current) / 1000).toFixed(1) : 'N/A';
            const result = await response.json();
            const specificSuccessMessage = "datapoints discovered and saved successfully";

            if (response.ok && result.success) {
                const nodesToProcess: DiscoveredRawDataPoint[] = Array.isArray(result.nodes) ? result.nodes : [];
                setDiscoveredRawPoints(nodesToProcess);
                setDiscoveredDataFilePath(result.filePath || null);

                const successMsg = `OPC UA Discovery Completed: Found ${nodesToProcess.length} datapoints.`;
                const detailsMsg = result.filePath ? `Data saved to ${result.filePath}` : (result.message || "Process completed.");
                addLogEntry('info', successMsg, detailsMsg); // Requirement 1.4
                if (nodesToProcess.length === 0) {
                    addLogEntry('info', "OPC UA Discovery: No datapoints found matching criteria."); // Requirement 1.6
                }
                setDiscoveryStatusMessage(result.message || `${nodesToProcess.length} datapoints found.`);
                toast.success("OPC UA Discovery Completed!", {
                    description: result.message || `${nodesToProcess.length} datapoints found.`
                });
                setDiscoveryProgress(100);

                const baseConfiguredPoints: ExtendedDataPointConfig[] = nodesToProcess.map((rawPoint: DiscoveredRawDataPoint, index: number) => {
                    let generatedId = rawPoint.browseName?.toLowerCase().replace(/[^a-z0-9_.]+/g, '-').replace(/^-+|-+$/g, '') || `dp-${index}-${Date.now()}`;
                    if (!generatedId || generatedId === `dp-${index}-${Date.now()}`) generatedId = rawPoint.nodeId.replace(/[^a-z0-9]+/gi, '-') || `unknown-node-${index}-${Date.now()}`;

                    let mappedDataType: ExtendedDataPointConfig['dataType'] = 'String'; // Default
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
                        source: 'discovered',
                    };
                });
                setAiEnhancedPoints(baseConfiguredPoints);

            } else {
                // Failure path
                let errorMessage = "An unknown error occurred during discovery.";
                if (result && result.message) {
                    errorMessage = result.message;
                } else if (!response.ok) {
                    errorMessage = `Discovery request failed: ${response.statusText} (${response.status})`;
                }
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error("Discovery process error:", error);
            // setDiscoveryProgress(0); // Polling might set this, or set to error state
            const errorMsgForDisplay = `Discovery Error: ${error.message}`;
            // setDiscoveryStatusMessage(errorMsgForDisplay); // Let polling handle or set final here
            addLogEntry('error', 'OPC UA Discovery Failed', error.message); // Enhanced log
            toast.error("Discovery Failed", { description: error.message.length > 100 ? error.message.substring(0, 97) + "..." : error.message });
        } finally {
            stopDiscoveryProgressPolling(); // Ensure polling is stopped
            // Optionally, fetch one last time to get the absolute final status
            await fetchDiscoveryProgress();
            setIsDiscovering(false);
            discoveryStartTimeRef.current = null;
            // setEstimatedDiscoveryTime(0); // Removed
        }
    };

    const handleStartAiEnhancement = async () => {
        // Clear previous task state if any
        if (aiTaskPollIntervalId) clearInterval(aiTaskPollIntervalId);
        setAiTaskPollIntervalId(null);
        setCurrentAiTaskId(null);
        setShowContinueAiButton(false);
        setAiProgress(0);

        if (!aiConsentGiven) {
            toast.error("Consent Required for AI Enhancement", { description: "Please check the consent box to proceed." });
            addChatMessage({ sender: 'ai', text: "I need your consent to proceed with AI enhancement. Please check the consent box above.", type: 'warning' });
            addLogEntry('warning', "AI Enhancement Aborted: User consent not provided.");
            return;
        }
        addChatMessage({ sender: 'ai', text: "Thanks for providing consent! I'm getting ready to start.", type: 'info' });
        addLogEntry('info', "User consent granted for AI enhancement.");

        const storedKey = typeof window !== "undefined" ? localStorage.getItem("geminiApiKey") : null;
        const apiKeyIsAvailable = GEMINI_API_KEY_EXISTS_CLIENT || userProvidedGeminiKey.trim() || storedKey;

        if (!apiKeyIsAvailable) {
            toast.error("Gemini API Key Missing", { description: "Please provide your Gemini API Key." });
            addChatMessage({ sender: 'ai', text: "I need a Gemini API Key to proceed. Please enter it in the field below or ensure it's set in your environment variables.", type: 'error' });
            addLogEntry('error', "AI Enhancement Aborted: Gemini API Key not available.");
            setShowGeminiKeyInput(true);
            return;
        }
        addLogEntry('info', `API Key available (User provided: ${!!userProvidedGeminiKey.trim()}, Stored: ${!!storedKey}, System: ${GEMINI_API_KEY_EXISTS_CLIENT})`);


        const pointsToProcess = currentPointsToDisplay.filter(p => p.source === 'discovered' || p.source === 'imported' || p.source === 'manual');
        if (pointsToProcess.length === 0 && !discoveredDataFilePath) { // Check if there are any points from any source if no discovery file
            toast.error("No Data for AI", { description: "Please discover, upload, or add data points first." });
            addChatMessage({ sender: 'ai', text: "It looks like there's no data for me to process. Please discover, upload, or add some data points first.", type: 'warning' });
            addLogEntry('warning', "AI Enhancement Aborted: No data available for processing.");
            return;
        }

        const numPointsForAI = discoveredDataFilePath ? 'data from file' : `${pointsToProcess.length} data points`; // Use discoveredDataFilePath if available

        setIsAiProcessing(true);
        setAiProgress(0); // Reset progress
        addChatMessage({ sender: 'ai', text: `Requesting AI enhancement for ${numPointsForAI}. Initializing...`, type: 'progress' });
        addLogEntry('ai', `Requesting AI enhancement for ${numPointsForAI}.`);
        aiStartTimeRef.current = Date.now(); // For estimated time, though backend drives actual progress

        try {
            const requestBody: { filePath?: string; geminiApiKey?: string } = {
                filePath: discoveredDataFilePath || undefined, // Send file path if available
                // We no longer send raw points from client. Backend will use filePath.
            };
            if (userProvidedGeminiKey.trim()) {
                requestBody.geminiApiKey = userProvidedGeminiKey.trim();
            } else if (storedKey) {
                requestBody.geminiApiKey = storedKey;
            }
            // If only system key, don't send it, backend will use its own env var.

            const response = await fetch('/api/ai/generate-datapoints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({ message: "Failed to start AI task. API returned an error."}));
                throw new Error(errorResult.message || `Failed to start AI task. Status: ${response.status}`);
            }

            const result = await response.json();
            if (result.taskId) {
                setCurrentAiTaskId(result.taskId);
                addChatMessage({ sender: 'ai', type: 'info', text: `AI processing task started (ID: ${result.taskId}). I will update you on the progress.` });
                addLogEntry('ai', `AI Task started with ID: ${result.taskId}`);

                // Start polling
                pollAiTaskStatus(result.taskId); // Initial immediate poll
                const intervalId = setInterval(() => pollAiTaskStatus(result.taskId), 5000); // Poll every 5 seconds
                setAiTaskPollIntervalId(intervalId);
            } else {
                throw new Error("Backend did not return a task ID.");
            }

        } catch (error: any) {
            console.error("AI Enhancement initiation error:", error);
            addChatMessage({ sender: 'ai', type: 'error', text: `Failed to start AI enhancement: ${error.message}` });
            addLogEntry('error', "AI Enhancement initiation failed", error.message);
            setIsAiProcessing(false);
        }
    };

    const handleContinueAiProcessing = () => {
        if (currentAiTaskId) {
            addChatMessage({ sender: 'ai', type: 'info', text: 'Attempting to continue AI processing...' });
            addLogEntry('ai', `Attempting to continue AI Task ID: ${currentAiTaskId}`);
            setIsAiProcessing(true);
            setShowContinueAiButton(false);

            // Re-initiate polling for the existing task ID
            pollAiTaskStatus(currentAiTaskId); // Initial immediate poll after continue
            const intervalId = setInterval(() => pollAiTaskStatus(currentAiTaskId), 5000); // Poll every 5 seconds
            setAiTaskPollIntervalId(intervalId);
        } else {
            addChatMessage({ sender: 'ai', type: 'error', text: 'No active AI task ID found to continue.'});
            addLogEntry('error', "Continue AI: No currentAiTaskId found.");
            setShowContinueAiButton(false);
        }
    };


    // --- Original OPC UA Discovery Polling ---
            const requestBody = {
                filePath: discoveredDataFilePath,
                geminiApiKey: apiKeyToUse || undefined
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
                const errMsg = errorData.message || `AI Enhancement API failed: ${response.statusText} (${response.status})`;
                addLogEntry('error', "AI Enhancement Error", errMsg); // Requirement 4.8
                throw new Error(errMsg);
            }
            setAiProgress(95); // Near completion
            const result = await response.json();

            if (result.success && result.data) {
                const enhancedPointsCount = result.data?.length || 0;
                const totalProcessed = numPointsForAI; // Assuming all sent points were processed in some way by AI
                const enhanced: ExtendedDataPointConfig[] = result.data.map((dp: any) => ({
                    ...dp,
                    id: dp.id || dp.nodeId?.replace(/[^a-z0-9]+/gi, '-') || `ai-dp-${Math.random().toString(36).substring(7)}`,
                    iconName: dp.icon || "Tag",
                    icon: getIconComponent(dp.icon) || DEFAULT_ICON,
                    source: 'ai-enhanced',
                }));
                const existingManualOrImported = aiEnhancedPoints.filter(p => p.source === 'manual' || p.source === 'imported');
                setAiEnhancedPoints([...enhanced, ...existingManualOrImported]);

                const successMsg = `AI Enhancement Completed: Processed ${totalProcessed} data points. ${enhancedPointsCount} points were enhanced.`; // Requirement 4.7
                setAiStatusMessage(successMsg);
                addLogEntry('ai', successMsg, result.message || 'AI processing completed and data updated.');
                toast.success("AI Enhancement Completed!");
                setAiProgress(100);
            } else {
                const failMsg = result.message || "AI enhancement process failed or returned no data.";
                addLogEntry('error', "AI Enhancement Error", failMsg); // Requirement 4.8
                throw new Error(failMsg);
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
            // Specific error already logged, this is a fallback if not caught by specific cases
            if (!error.message.includes("API failed") && !error.message.includes("failed or returned no data")) {
                 addLogEntry('error', "AI Enhancement Error", error.message); // Requirement 4.8 (general catch)
            }
            toast.error("AI Enhancement Failed", { description: error.message.length > 100 ? error.message.substring(0, 97) + "..." : error.message });
        } finally {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            setIsAiProcessing(false);
            aiStartTimeRef.current = null;
            setEstimatedAiTime(0);
        }
    };

    const handleSaveConfiguration = () => { // This function now saves ALL points (discovered, AI, manual, imported)
        const pointsToSave = currentPointsToDisplay; // Use currentPointsToDisplay as it holds the merged list

        if (pointsToSave.length === 0) {
            toast.info("No Data to Save", { description: "Please discover, enhance, upload, or add data points first." });
            return;
        }

        setIsLoading(true); // Use general isLoading
        addLogEntry('system', `Attempting to save ${pointsToSave.length} configured data points...`);

        const finalPointsToSave = pointsToSave.map((point) => {
            const { iconName, source, ...rest } = point as ExtendedDataPointConfig; // Exclude source before saving if it's only for UI
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
        setConfiguredDataPoints([]); // Clears the main context
        setDiscoveredRawPoints([]);
        setAiEnhancedPoints([]); // This will clear currentPointsToDisplay if it was showing AI points
        setFile(null); // Clear file selection
        setFileProcessingSummary(null); // Clear file processing summary
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        setShowManualForm(false); // Hide manual form
        setManualDataPoint(initialManualDataPointState); // Reset manual form
        setManualFormErrors({});
        setDiscoveredDataFilePath(null);
        // Keep system logs but clear operational ones or filter more selectively if needed.
        setProcessLog(prev => prev.filter(p => p.type === 'system' && p.message.includes("Configuration reset initiated") || p.message.includes("User provided Gemini API key")));
        setDiscoveryStatusMessage("");
        setAiStatusMessage("");
        setDiscoveryProgress(0);
        setAiProgress(0);
        toast.info("Configuration Reset", { description: "All discovered, AI-enhanced, imported, and manually added data points have been cleared from this step." });
    };

    // --- Helper functions from DataPointConfigStep ---
    const processUploadedFile = (uploadedFile: File) => {
        const fileName = uploadedFile.name.toLowerCase();
        if (fileName.endsWith('.csv') || fileName.endsWith('.json') || fileName.endsWith('.xlsx')) {
            setFile(uploadedFile);
            setFileProcessingSummary(null); // Clear previous summary
            addLogEntry('info', `File selected: ${uploadedFile.name}`); // Requirement 2.1
            toast.success(`File "${uploadedFile.name}" ready for processing.`);
        } else {
            addLogEntry('warning', `Invalid file type selected: ${uploadedFile.name}`, `Allowed types: CSV, JSON, XLSX.`);
            toast.error("Invalid file type.", { description: "Please upload a CSV, JSON, or Excel (XLSX) file." });
            if (fileInputRef.current) fileInputRef.current.value = "";
            setFile(null);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            processUploadedFile(event.target.files[0]); // Already logs file selection
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(false);
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            processUploadedFile(event.dataTransfer.files[0]); // Already logs file selection
        }
    };

    const clearFileSelection = () => {
        if (file) {
            addLogEntry('info', `File selection cleared: ${file.name}`);
        }
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        setFileProcessingSummary(null);
        toast.info("File selection cleared.");
    };

    const downloadTemplate = (type: 'csv' | 'json' = 'csv') => {
        const currentPlantName = onboardingData.plantName || "ExamplePlant";
        const currentPlantLocation = onboardingData.plantLocation || "Example Location";

        if (type === 'csv') {
            const headers = ["id", "name", "nodeId", "dataType", "uiType", "icon", "unit", "min", "max", "description", "category", "factor", "phase", "notes", "label"].join(',');
            const exampleRow = [`${currentPlantName.toLowerCase().replace(/\s+/g, '-')}-temp-sensor`, "Main Boiler Temperature", "ns=2;s=Device.PLC1.Boiler.Temperature", "Float", "line-chart", "Thermometer", "°C", "0", "150", "Temperature sensor for the main boiler unit.", "HVAC", "1", "L1", "Requires yearly calibration.", "Boiler Temp."].join(',');
            const csvContent = `${headers}\n${exampleRow}`;
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "datapoints_template.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("CSV Datapoint Template Downloaded.");
        } else if (type === 'json') {
            const jsonExample: FullConfigFile = {
                plantName: currentPlantName,
                plantLocation: currentPlantLocation,
                appName: onboardingData.appName || "MyMonitoringApp",
                opcUaEndpointOfflineIP: onboardingData.opcUaEndpointOffline?.split(':')[0] || '192.168.1.100',
                opcUaEndpointOfflinePort: Number(onboardingData.opcUaEndpointOffline?.split(':')[1]) || 4840,
                configuredDataPoints: [
                    {
                        id: `${currentPlantName.toLowerCase().replace(/\s+/g, '-')}-flow-rate`,
                        name: "Coolant Flow Rate",
                        nodeId: "ns=3;s=Factory.SystemA.Coolant.FlowRate",
                        dataType: "Double",
                        uiType: "gauge",
                        icon: "Gauge",
                        unit: "L/min",
                        min: 0,
                        max: 50,
                        label: "Coolant Flow",
                        category: "Process Values",
                        description: "Flow rate of the primary coolant loop."
                    },
                ]
            };
            const jsonContent = JSON.stringify(jsonExample, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "full_config_template.json");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("Full JSON Config Template Downloaded.");
        }
    };

    const mapRowToDataPoint = (rowData: Record<string, any>, rowIndex: number, errorDetails: string[]): PartialDataPointFromFile | null => {
        const id = rowData.id?.toString().trim();
        if (!id) {
            errorDetails.push(`Row/Object ${rowIndex + 1}: Missing 'id'. Entry skipped.`);
            return null;
        }
        const iconName = rowData.icon?.toString().trim();
        const dataType = rowData.dataType?.toString().trim();
        // Validate against extended data type options
        if (dataType && !DATA_TYPE_OPTIONS_EXTENDED.includes(dataType as any)) {
            errorDetails.push(`ID: ${id}, Row: ${rowIndex + 1}: Invalid dataType '${dataType}'. Will use default or existing.`);
        }
        const min = rowData.min !== undefined && rowData.min !== null && rowData.min !== '' ? parseFloat(rowData.min) : undefined;
        const max = rowData.max !== undefined && rowData.max !== null && rowData.max !== '' ? parseFloat(rowData.max) : undefined;
        const factor = rowData.factor !== undefined && rowData.factor !== null && rowData.factor !== '' ? parseFloat(rowData.factor) : undefined;

        return {
            id,
            name: rowData.name?.toString().trim() || undefined,
            nodeId: rowData.nodeId?.toString().trim() || undefined,
            dataType: dataType as DataPointConfig['dataType'] || undefined,
            uiType: rowData.uiType?.toString().trim() as DataPointConfig['uiType'] || undefined,
            icon: iconName,
            unit: rowData.unit?.toString().trim() || undefined,
            min: min !== undefined && !isNaN(min) ? min : undefined,
            max: max !== undefined && !isNaN(max) ? max : undefined,
            description: rowData.description?.toString().trim() || undefined,
            category: rowData.category?.toString().trim() || "Uncategorized",
            factor: factor !== undefined && !isNaN(factor) ? factor : undefined,
            phase: rowData.phase?.toString().trim() as DataPointConfig['phase'] || undefined,
            notes: rowData.notes?.toString().trim() || undefined,
            label: rowData.label?.toString().trim() || rowData.name?.toString().trim() || id,
        };
    };
    const currentPointsToDisplay: ExtendedDataPointConfig[] = aiEnhancedPoints.length > 0
        ? aiEnhancedPoints
        : configuredDataPoints.map(dp => ({ // Map context points to ExtendedDataPointConfig if needed
            ...dp,
            iconName: (dp.icon as any)?.displayName?.replace("Icon", "") || "Sigma", // Attempt to get name from component
            source: (dp as ExtendedDataPointConfig).source || 'imported' // Ensure source if loading from context that might not have it
        }));

    const parseAndProcessFile = useCallback(async (fileToProcess: File): Promise<ExtendedDataPointConfig[]> => {
        // Determine the base list for processing
        const basePointsForProcessing: ExtendedDataPointConfig[] = aiEnhancedPoints.length > 0 ? aiEnhancedPoints : configuredDataPoints.map(dp => ({
            ...dp,
            iconName: (dp.icon as any)?.displayName?.replace("Icon", "") || "Sigma",
            source: (dp as ExtendedDataPointConfig).source || 'imported'
        }));

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const localProcessingSummary: ProcessingSummary = {
                    processed: 0, updated: 0, added: 0, skipped: 0, errors: 0, errorDetails: [], plantDetailsUpdated: false
                };
                try {
                    const fileContent = event.target?.result;
                    let dataPointsFromFile: PartialDataPointFromFile[] = [];
                    let plantDetailsFromFile: Omit<FullConfigFile, 'configuredDataPoints'> | null = null;

                    if (fileToProcess.type === "application/json" || fileToProcess.name.endsWith('.json')) {
                        const jsonData: FullConfigFile | PartialDataPointFromFile[] = JSON.parse(fileContent as string);
                        if (Array.isArray(jsonData)) {
                            dataPointsFromFile = jsonData;
                        } else if (jsonData && typeof jsonData === 'object' && 'configuredDataPoints' in jsonData && Array.isArray(jsonData.configuredDataPoints)) {
                            dataPointsFromFile = jsonData.configuredDataPoints;
                            const { configuredDataPoints: _, ...rest } = jsonData;
                            plantDetailsFromFile = rest;
                        } else {
                            throw new Error("Invalid JSON. Expect an array of datapoints or an object with a 'configuredDataPoints' array.");
                        }
                    } else if (fileToProcess.type === "text/csv" || fileToProcess.name.endsWith('.csv')) {
                        const parseResult = Papa.parse(fileContent as string, { header: true, skipEmptyLines: true, dynamicTyping: false });
                        if (parseResult.errors.length > 0) {
                            const csvErrorMsg = `CSV parsing issues: ${parseResult.errors.map(e => `Row ${e.row}: ${e.message}`).join('; ')}`;
                            throw new Error(csvErrorMsg);
                        }
                        dataPointsFromFile = (parseResult.data as Record<string, any>[]).map((row, index) =>
                            mapRowToDataPoint(row, index, localProcessingSummary.errorDetails)
                        ).filter(dp => dp !== null) as PartialDataPointFromFile[];
                    } else if (fileToProcess.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || fileToProcess.name.endsWith('.xlsx')) {
                        const workbook = XLSX.read(fileContent, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        if (!sheetName) throw new Error("Excel file appears to be empty or has no accessible sheets.");
                        const worksheet = workbook.Sheets[sheetName];
                        const excelRows = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null }) as Record<string, any>[];
                        dataPointsFromFile = excelRows.map((row, index) =>
                            mapRowToDataPoint(row, index, localProcessingSummary.errorDetails)
                        ).filter(dp => dp !== null) as PartialDataPointFromFile[];
                    } else {
                        throw new Error(`Unsupported file type: ${fileToProcess.type || "unknown"}. Please use CSV, JSON, or XLSX.`);
                    }

                    if (plantDetailsFromFile && typeof setPlantDetails === 'function') {
                        const plantDetailKeys = Object.keys(plantDetailsFromFile).filter(
                            // @ts-ignore
                            key => plantDetailsFromFile[key] !== undefined && plantDetailsFromFile[key] !== null
                        );
                        if (plantDetailKeys.length > 0) {
                            setPlantDetails(plantDetailsFromFile);
                            localProcessingSummary.plantDetailsUpdated = true;
                            const updatedFieldsList = plantDetailKeys.join(', ');
                            addLogEntry('info', `Plant details updated from ${fileToProcess.name}: ${updatedFieldsList}`); // Requirement 2.5
                            toast.success("Plant details from JSON file applied.", {
                                description: `Updated fields: ${plantDetailKeys.slice(0, 3).join(', ')}${plantDetailKeys.length > 3 ? '...' : '.'}`
                            });
                        }
                    }

                    const newConfiguredPoints: ExtendedDataPointConfig[] = JSON.parse(JSON.stringify(basePointsForProcessing));

                    dataPointsFromFile.forEach((dpFromFilePartial) => {
                        localProcessingSummary.processed++;
                        if (!dpFromFilePartial || !dpFromFilePartial.id) {
                            localProcessingSummary.skipped++;
                            return;
                        }
                        const { icon: iconNameFromFile, ...restOfPointFromFile } = dpFromFilePartial;

                        let finalIcon: IconComponentType | undefined = undefined;
                        let finalIconName: string | undefined = undefined;
                        if (typeof iconNameFromFile === 'string' && iconNameFromFile.trim() !== '') {
                            const IconFromLib = getIconComponent(iconNameFromFile);
                            if (IconFromLib) {
                                finalIcon = IconFromLib;
                                finalIconName = iconNameFromFile.trim();
                            } else {
                                localProcessingSummary.errors++;
                                localProcessingSummary.errorDetails.push(`ID: ${dpFromFilePartial.id}: Icon '${iconNameFromFile}' not found. Existing or default icon will be used.`);
                            }
                        }

                        const existingPointIndex = newConfiguredPoints.findIndex(p => p.id === dpFromFilePartial.id);

                        if (existingPointIndex !== -1) {
                            const existingPoint = newConfiguredPoints[existingPointIndex];
                            Object.keys(restOfPointFromFile).forEach(keyStr => {
                                const key = keyStr as keyof typeof restOfPointFromFile;
                                const fileValue = restOfPointFromFile[key];
                                if (fileValue !== undefined) {
                                    if (typeof fileValue === 'string' && fileValue.trim() === '' && typeof existingPoint[key as keyof DataPointConfig] === 'string') {
                                        (existingPoint as any)[key] = '';
                                    } else if ((typeof fileValue === 'string' && fileValue.trim() !== '') || typeof fileValue !== 'string') {
                                        (existingPoint as any)[key] = fileValue;
                                    }
                                }
                            });
                            if (finalIcon) existingPoint.icon = finalIcon;
                            if (finalIconName) existingPoint.iconName = finalIconName;
                            existingPoint.source = 'imported'; // Mark as imported (updated)
                            localProcessingSummary.updated++;
                        } else {
                            const requiredFields: (keyof Omit<DataPointConfig, 'icon'>)[] = ['id', 'name', 'nodeId', 'dataType', 'uiType', 'label'];
                            const isNewPointValid = requiredFields.every(field => {
                                const val = restOfPointFromFile[field as keyof typeof restOfPointFromFile];
                                return val !== undefined && val !== null && (typeof val !== 'string' || val.trim() !== '');
                            });

                            if (isNewPointValid) {
                                newConfiguredPoints.push({
                                    ...restOfPointFromFile,
                                    icon: finalIcon || DEFAULT_ICON,
                                    iconName: finalIconName || (DEFAULT_ICON as any)?.displayName?.replace("Icon", "") || "Merge",
                                    category: restOfPointFromFile.category?.trim() || 'General',
                                    label: restOfPointFromFile.label?.trim() || restOfPointFromFile.name?.trim() || restOfPointFromFile.id!,
                                    source: 'imported', // Mark as imported (new)
                                } as ExtendedDataPointConfig);
                                localProcessingSummary.added++;
                            } else {
                                localProcessingSummary.errors++;
                                localProcessingSummary.skipped++;
                                const missing = requiredFields.filter(f => {
                                    const val = restOfPointFromFile[f];
                                    return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
                                }).join(', ') || 'invalid data types';
                                localProcessingSummary.errorDetails.push(`ID: ${dpFromFilePartial.id} (New Entry): Skipped. Missing/invalid required fields (${missing}).`);
                            }
                        }
                    });

                    setFileProcessingSummary(localProcessingSummary);

                    // Log completion of processing with summary (Requirement 2.3)
                    const summaryMsg = `File processing complete for ${fileToProcess.name}: Added ${localProcessingSummary.added}, Updated ${localProcessingSummary.updated}, Skipped ${localProcessingSummary.skipped}, Errors ${localProcessingSummary.errors}.`;
                    addLogEntry(localProcessingSummary.errors > 0 ? 'warning' : 'info', summaryMsg);

                    // Log detailed errors (Requirement 2.4)
                    localProcessingSummary.errorDetails.forEach(errDetail => {
                        addLogEntry('error', `File processing error: ${errDetail}`);
                    });

                    if (localProcessingSummary.processed === 0 && !localProcessingSummary.plantDetailsUpdated) {
                        addLogEntry('info', `File processed: No new data points or plant details found in ${fileToProcess.name}.`); // Requirement 2.6
                        toast.info("No New Data Processed", { description: "The file did not contain new data points or updatable plant details." });
                    } else if (localProcessingSummary.errors > 0 || localProcessingSummary.skipped > 0) {
                        toast.warning("File Processed with Issues", {
                            description: `${localProcessingSummary.errors} error(s), ${localProcessingSummary.skipped} skipped. See summary & logs.`,
                            duration: 7000,
                        });
                    } else {
                        let successToastMsg = `Processed: ${localProcessingSummary.processed}`;
                        if (localProcessingSummary.updated > 0) successToastMsg += `, Updated: ${localProcessingSummary.updated}`;
                        if (localProcessingSummary.added > 0) successToastMsg += `, Added: ${localProcessingSummary.added}`;
                        toast.success("File Processed Successfully!", { description: successToastMsg + "." });
                    }
                    resolve(newConfiguredPoints);

                } catch (e: any) {
                    console.error("Error parsing/processing file:", e);
                    const errorMessage = e.message || "An unknown error occurred.";
                    localProcessingSummary.errors++;
                    localProcessingSummary.errorDetails.push(`Critical error: ${errorMessage}`);
                    setFileProcessingSummary(localProcessingSummary);
                    addLogEntry('error', `Critical file processing error for ${fileToProcess.name}: ${errorMessage}`); // Requirement 2.4 (critical)
                    toast.error("File Processing Failed", { description: errorMessage, duration: 8000 });
                    reject(basePointsForProcessing);
                }
            };
            reader.onerror = (e) => {
                const readErrorMsg = "Failed to read the file. It might be corrupted or inaccessible.";
                console.error("FileReader error:", e);
                setFileProcessingSummary(prev => ({ ...(prev || { processed: 0, updated: 0, added: 0, skipped: 0, errors: 0, errorDetails: [] }), errors: (prev?.errors || 0) + 1, errorDetails: [...(prev?.errorDetails || []), readErrorMsg] }));
                addLogEntry('error', `File read error for ${fileToProcess.name}: ${readErrorMsg}`); // Requirement 2.4 (read error)
                toast.error("File Read Error", { description: readErrorMsg });
                reject(basePointsForProcessing);
            };

            if (fileToProcess.name.endsWith('.xlsx')) {
                reader.readAsArrayBuffer(fileToProcess);
            } else {
                reader.readAsText(fileToProcess);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPointsToDisplay, setPlantDetails, onboardingData, addLogEntry]);


    const handleUploadAndProcess = useCallback(async () => {
        if (!file) {
            toast.warning("No file selected.", { description: "Please select or drag & drop a file first." });
            return;
        }
        setIsFileProcessingLoading(true);
        setFileProcessingSummary(null);
        addLogEntry('info', `Processing uploaded file: ${file.name}...`); // Requirement 2.2
        try {
            const processedDataPoints = await parseAndProcessFile(file);
            if (aiEnhancedPoints.length > 0 || configuredDataPoints.length === 0) {
                setAiEnhancedPoints(processedDataPoints);
            } else {
                setConfiguredDataPoints(processedDataPoints);
            }
            // Logging of summary, errors, and no new data is handled within parseAndProcessFile
        } catch (error) { // This catch is for errors in the promise chain not handled inside parseAndProcessFile
            console.error("File processing promise rejected at top level:", error);
            addLogEntry('error', `File processing failed for ${file.name}`, (error as Error).message); // Requirement 2.4 (general)
            toast.error("Unhandled Processing Error", { description: "An unexpected critical error occurred." });
        } finally {
            setIsFileProcessingLoading(false);
            // Summary logs are now inside parseAndProcessFile to ensure they have the correct summary details.
        }
    }, [file, parseAndProcessFile, addLogEntry, aiEnhancedPoints, configuredDataPoints, setConfiguredDataPoints]);

    // --- Handlers for manual form (from DataPointConfigStep) ---
    const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setManualDataPoint(prev => ({ ...prev, [name]: value }));
        if (manualFormErrors[name]) {
            setManualFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleManualSelectChange = (fieldName: keyof ManualDataPointState, value: string) => {
        setManualDataPoint(prev => ({ ...prev, [fieldName]: value as any }));
        if (manualFormErrors[fieldName]) {
            setManualFormErrors(prev => ({ ...prev, [fieldName]: '' }));
        }
    };

    const validateManualForm = (): boolean => {
        const errors: Record<string, string> = {};
        const trimmedId = manualDataPoint.id?.trim();
        const trimmedName = manualDataPoint.name?.trim();
        const trimmedNodeId = manualDataPoint.nodeId?.trim();

        if (!trimmedId) errors.id = "ID is required.";
        // Check against currentPointsToDisplay for ID uniqueness
        else if (currentPointsToDisplay.some(dp => dp.id === trimmedId)) errors.id = "This ID already exists in the current configuration.";

        if (!trimmedName) errors.name = "Name is required.";
        if (!trimmedNodeId) errors.nodeId = "OPC UA Node ID is required.";

        const iconTrimmed = manualDataPoint.icon?.trim();
        if (iconTrimmed && !getIconComponent(iconTrimmed)) {
            errors.icon = "Icon name not found in Lucide library. Default will be used if saved, or clear the field.";
        }

        if (manualDataPoint.min && isNaN(Number(manualDataPoint.min))) errors.min = "Min must be a valid number.";
        if (manualDataPoint.max && isNaN(Number(manualDataPoint.max))) errors.max = "Max must be a valid number.";
        if (manualDataPoint.factor && isNaN(Number(manualDataPoint.factor))) errors.factor = "Factor must be a valid number.";

        setManualFormErrors(errors);
        return !errors.id && !errors.name && !errors.nodeId && !errors.min && !errors.max && !errors.factor;
    };

    const handleSaveManualDataPoint = () => {
        if (!validateManualForm()) {
            toast.error("Validation Error", { description: "Please fix the errors marked in the form." });
            return;
        }

        const iconString = manualDataPoint.icon?.trim() || initialManualDataPointState.icon || 'Tag';
        const IconComponent = getIconComponent(iconString) || DEFAULT_ICON;
        const iconName = iconString || (DEFAULT_ICON as any)?.displayName?.replace("Icon", "") || "Tag";

        const finalLabel = manualDataPoint.label?.trim() || manualDataPoint.name!.trim() || manualDataPoint.id!;

        const parseNumericField = (value?: string): number | undefined => {
            if (value === undefined || value.trim() === '') return undefined;
            const num = Number(value);
            return isNaN(num) ? undefined : num;
        };

        const newPoint: ExtendedDataPointConfig = {
            id: manualDataPoint.id!.trim(),
            name: manualDataPoint.name!.trim(),
            nodeId: manualDataPoint.nodeId!.trim(),
            label: finalLabel,
            dataType: manualDataPoint.dataType as DataPointConfig['dataType'],
            uiType: manualDataPoint.uiType as DataPointConfig['uiType'],
            icon: IconComponent,
            iconName: iconName,
            unit: manualDataPoint.unit?.trim() || undefined,
            min: parseNumericField(manualDataPoint.min),
            max: parseNumericField(manualDataPoint.max),
            description: manualDataPoint.description?.trim() || undefined,
            category: manualDataPoint.category?.trim() || 'General',
            factor: parseNumericField(manualDataPoint.factor),
            phase: manualDataPoint.phase?.trim() as DataPointConfig['phase'] || undefined,
            notes: manualDataPoint.notes?.trim() || undefined,
            source: 'manual',
        };

        if (aiEnhancedPoints.length > 0 || configuredDataPoints.length === 0) {
            setAiEnhancedPoints(prev => [...prev, newPoint]);
        } else {
            setConfiguredDataPoints(prev => [...prev, newPoint]);
        }
        addLogEntry('info', `Manually added data point: '${newPoint.name}' (ID: ${newPoint.id}).`); // Requirement 3.1
        toast.success(`Data point "${newPoint.name}" added successfully!`);
        setShowManualForm(false);
        setManualDataPoint(initialManualDataPointState);
        setManualFormErrors({});
    };

    const handleCancelManualForm = () => {
        setShowManualForm(false);
        setManualDataPoint(initialManualDataPointState);
        setManualFormErrors({});
    };

    const openEditModal = (pointToEdit: ExtendedDataPointConfig) => {
        const iconComp = pointToEdit.icon as any;
        let currentIconName = pointToEdit.iconName;
        if (!currentIconName && typeof iconComp === 'function') {
            currentIconName = Object.keys(lucideIcons).find(key => lucideIcons[key as keyof typeof lucideIcons] === iconComp);
        }
        currentIconName = currentIconName || "Sigma";

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
        }

        setEditingPoint(prev => prev ? ({ ...prev, [name]: finalValue }) : null);
    };

    const handleEditSelectChange = (fieldName: keyof ExtendedDataPointConfig, value: string) => {
        if (!editingPoint) return;
        setEditingPoint(prev => {
            if (!prev) return null;
            const updatedPoint = { ...prev, [fieldName]: value };
            if (fieldName === 'iconName') {
                updatedPoint.iconName = value;
            }
            return updatedPoint;
        });
    };

    const saveEditedPoint = () => {
        if (!editingPoint) return;

        if (editingPoint.min && isNaN(Number(editingPoint.min))) { toast.error("Invalid Min Value", { description: "Min must be a valid number or empty." }); return; }
        if (editingPoint.max && isNaN(Number(editingPoint.max))) { toast.error("Invalid Max Value", { description: "Max must be a valid number or empty." }); return; }
        if (editingPoint.factor && isNaN(Number(editingPoint.factor))) { toast.error("Invalid Factor", { description: "Factor must be a valid number or empty." }); return; }
        if (editingPoint.precision && (isNaN(Number(editingPoint.precision)) || Number(editingPoint.precision) < 0)) { toast.error("Invalid Precision", { description: "Precision must be a non-negative number or empty." }); return; }


        const finalEditedPoint: ExtendedDataPointConfig = {
            ...editingPoint,
            icon: getIconComponent(editingPoint.iconName) || DEFAULT_ICON,
            min: editingPoint.min === undefined || editingPoint.min === null ? undefined : Number(editingPoint.min),
            max: editingPoint.max === undefined || editingPoint.max === null ? undefined : Number(editingPoint.max),
            factor: editingPoint.factor === undefined || editingPoint.factor === null ? undefined : Number(editingPoint.factor),
            precision: editingPoint.precision === undefined ? undefined : Number(editingPoint.precision),
        };

        const updatedPoints = aiEnhancedPoints.map(p => p.id === finalEditedPoint.id ? finalEditedPoint : p);
        setAiEnhancedPoints(updatedPoints);

        addLogEntry('info', `Updated data point: '${finalEditedPoint.name}' (ID: ${finalEditedPoint.id}).`); // Requirement 3.2
        toast.success(`"${finalEditedPoint.name}" updated.`);
        setIsEditModalOpen(false);
        setEditingPoint(null);
    };

    // currentPointsToDisplay now primarily uses aiEnhancedPoints as it aggregates all sources
    // configuredDataPoints from context is loaded initially, but operations merge into aiEnhancedPoints


    // Effect to load configuredDataPoints from context into aiEnhancedPoints on initial mount
    // This ensures that any existing configuration is available for editing and merging.
    useEffect(() => {
        if (configuredDataPoints.length > 0 && aiEnhancedPoints.length === 0) {
            // Map to ExtendedDataPointConfig and assign a default 'imported' source if not present
            const mappedContextPoints = configuredDataPoints.map(dp => ({
                ...dp,
                iconName: (dp.icon as any)?.displayName?.replace("Icon", "") || Object.keys(lucideIcons).find(key => lucideIcons[key as keyof typeof lucideIcons] === dp.icon) || "Sigma",
                source: (dp as any).source || 'imported'
            } as ExtendedDataPointConfig));
            setAiEnhancedPoints(mappedContextPoints);
            addLogEntry('system', `Loaded ${mappedContextPoints.length} points from existing configuration context.`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configuredDataPoints]); // Only run when configuredDataPoints from context changes (e.g., initial load)


    return (
        <motion.div
            key="datapoint-discovery-step-merged" // Updated key
            variants={containerVariants} initial="hidden" animate="visible" exit="exit"
            className="space-y-6 p-4 sm:p-6 bg-background text-foreground"
        >
            {/* Header Card - Updated to reflect merged functionality */}
            <motion.div variants={itemVariants(0)}>
                <Card className="shadow-xl dark:shadow-black/30 border-border/60 bg-gradient-to-br from-card via-card to-card/90 dark:from-neutral-800 dark:via-neutral-800 dark:to-neutral-800/90 backdrop-blur-lg">
                    <CardHeader className="border-b border-border/50 dark:border-neutral-700/50 pb-4">
                        <div className="flex items-center space-x-3.5">
                            <Merge className="h-8 w-8 text-primary shrink-0" /> {/* Changed Icon */}
                            <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                                Comprehensive Datapoint Management
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground mt-0.5">
                                Discover, import, manually add, or AI-enhance your datapoint configurations.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5 text-xs text-muted-foreground">
                        <p className="flex items-start">
                            <Info size={18} className="mr-2 mt-px text-sky-500 shrink-0" />
                            <span>
                                Utilize OPC UA discovery, file uploads (CSV, JSON, XLSX), or manual entry. Optionally, enhance with AI. JSON files can also update plant settings.
                            </span>
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* OPC UA Discovery Section - Remains largely the same */}
            <motion.div variants={itemVariants(0.05)}>
                <Card className="bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg border-border">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3">
                                <RefreshCw className="h-6 w-6 text-blue-500 dark:text-blue-400 shrink-0" />
                                <CardTitle className="text-lg sm:text-xl font-medium">OPC UA Discovery</CardTitle>
                            </div>
                            <motion.div {...buttonMotionProps(0, false)} className="w-full sm:w-auto">
                                <Button
                                    onClick={handleStartOpcuaDiscovery}
                                    disabled={isDiscovering || isAiProcessing || isFileProcessingLoading}
                                    variant={(discoveredRawPoints.length > 0 || aiEnhancedPoints.some(p => p.source === 'discovered' || p.source === 'ai-enhanced')) && !isDiscovering ? "outline" : "default"}
                                    className="group w-full"
                                >
                                    {isDiscovering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListChecks className="h-4 w-4 mr-2 group-hover:animate-pulse" />}
                                    {isDiscovering ? "Discovering..." : ((discoveredRawPoints.length > 0 || aiEnhancedPoints.some(p => p.source === 'discovered' || p.source === 'ai-enhanced')) ? "Re-Discover Points" : "Start PLC Discovery")}
                                </Button>
                            </motion.div>
                        </div>
                        <CardDescription className="pt-2 text-xs sm:text-sm text-muted-foreground">
                            Scan the configured OPC UA server for available datapoints. Re-discovery will clear previous discovery and AI results but not imported or manual points.
                        </CardDescription>
                    </CardHeader>
                    <AnimatePresence>
                        {(isDiscovering || (discoveryStatusMessage && !isDiscovering)) && (
                            <motion.div variants={contentAppearVariants} initial="hidden" animate="visible" exit="exit">
                                <CardContent className="pt-2">
                                    {isDiscovering && (
                                        <div className="space-y-2 mt-2">
                                            <Progress value={discoveryProgress} className="w-full h-2.5" />
                                            <p className="text-xs text-muted-foreground text-center animate-pulse">
                                                {discoveryStatusMessage}
                                            </p>
                                        </div>
                                    )}
                                    {!isDiscovering && discoveryStatusMessage && (
                                        <>
                                            <p className={cn(
                                                "text-sm p-3 rounded-md border text-center",
                                                discoveryStatusMessage.toLowerCase().includes("error") ||
                                                    discoveryStatusMessage.toLowerCase().includes("fail") ||
                                                    discoveryStatusMessage.toLowerCase().includes("aborted") ||
                                                    discoveryStatusMessage.toLowerCase().includes("unavailable")
                                                    ? "bg-destructive/10 border-destructive/30 text-destructive dark:bg-red-900/30 dark:border-red-700/50 dark:text-red-300"
                                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:bg-green-900/30 dark:border-green-700/50 dark:text-green-300"
                                            )}>
                                                {discoveryStatusMessage}
                                            </p>
                                            {discoveredDataFilePath && !isDiscovering && (
                                                <p className="text-xs text-muted-foreground mt-2 text-center">Raw discovery data saved to: <code className='bg-muted p-1 rounded-sm'>{discoveredDataFilePath}</code></p>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </motion.div>

            {/* --- Download Templates Section (from DataPointConfigStep) --- */}
            <motion.div variants={itemVariants(0.1)}>
                <Card className="bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
                    <CardHeader>
                        <div className="flex items-center space-x-3">
                            <Download className="h-6 w-6 text-sky-500 dark:text-sky-400 shrink-0" />
                            <CardTitle className="text-lg sm:text-xl font-medium">Download Configuration Templates</CardTitle>
                        </div>
                        <CardDescription className="text-xs sm:text-sm text-muted-foreground pt-1.5">
                            Start with our pre-formatted templates for bulk configuration uploads.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <motion.div {...buttonMotionProps(0, false)}>
                            <Button
                                variant="outline"
                                onClick={() => downloadTemplate('csv')}
                                className="w-full group text-base py-6 
               border-green-500/50 
               hover:border-green-500 hover:bg-green-500/5 
               dark:border-green-400/40 
               dark:hover:border-green-400 dark:hover:bg-green-400/10"
                            >
                                <FileSpreadsheet className="h-5 w-5 mr-3 
                               text-green-600 dark:text-green-400 
                               transition-transform duration-200 
                               group-hover:rotate-[-5deg] group-hover:scale-110" />
                                Data Points (CSV)
                            </Button>
                        </motion.div>

                        <motion.div {...buttonMotionProps(0.05, false)}>
                            <Button
                                variant="outline"
                                onClick={() => downloadTemplate('json')}
                                className="w-full group text-base py-6 
               border-purple-500/50 
               hover:border-purple-500 hover:bg-purple-500/5 
               dark:border-purple-400/40 
               dark:hover:border-purple-400 dark:hover:bg-purple-400/10"
                            >
                                <FileJson className="h-5 w-5 mr-3 
                        text-purple-600 dark:text-purple-400 
                        transition-transform duration-200 
                        group-hover:rotate-[5deg] group-hover:scale-110" />
                                Full Config (JSON)
                            </Button>
                        </motion.div>
                    </CardContent>
                    <CardFooter className="pt-3">
                        <p className="text-xs text-muted-foreground flex items-center">
                            <ExternalLink size={14} className="mr-1.5 shrink-0" /> Icon names should match those on <a href="https://lucide.dev/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors"> Lucide.dev</a>.
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>

            {/* --- Upload File Section (from DataPointConfigStep) --- */}
            <motion.div variants={itemVariants(0.15)}>
                <Card className="bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
                    <CardHeader>
                        <div className="flex items-center space-x-3">
                            <CloudUpload className="h-6 w-6 text-indigo-500 dark:text-indigo-400 shrink-0" />
                            <CardTitle className="text-lg sm:text-xl font-medium">Upload Configuration File</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <motion.div
                            variants={dropzoneVariants}
                            animate={isDraggingOver ? "dragging" : "idle"}
                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                            className={cn(
                                "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ease-out",
                                { "ring-2 ring-primary ring-offset-2 ring-offset-background": isDraggingOver }
                            )}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <motion.div
                                animate={{ y: isDraggingOver ? -5 : 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 10 }}
                            >
                                <UploadCloud className={cn("h-12 w-12 mb-3 transition-colors", isDraggingOver ? "text-primary" : "text-gray-400 dark:text-gray-500")} />
                            </motion.div>
                            <p className={cn("text-base font-medium transition-colors", isDraggingOver ? "text-primary" : "text-gray-700 dark:text-gray-200")}>
                                {file ? `File: ${file.name}` : "Drag & drop your file here, or click to browse"}
                            </p>
                            <p className={cn("text-xs transition-colors mt-1.5", isDraggingOver ? "text-primary/80" : "text-muted-foreground")}>
                                Supports: CSV, JSON, XLSX
                            </p>
                            <Input
                                ref={fileInputRef}
                                id="file-upload-dnd"
                                type="file"
                                className="hidden"
                                onChange={handleFileChange}
                                accept=".csv, .json, application/json, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .xlsx"
                            />
                        </motion.div>
                        <AnimatePresence>
                            {file && (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                                    className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3"
                                >
                                    <motion.div {...buttonMotionProps(0, true)} className="w-full sm:flex-grow">
                                        <Button onClick={handleUploadAndProcess} disabled={isFileProcessingLoading || !file || isDiscovering || isAiProcessing} size="lg" className="w-full group text-base py-3">
                                            {isFileProcessingLoading ? (
                                                <Loader2 className="h-5 w-5 mr-2.5 animate-spin" />
                                            ) : (
                                                <ListChecks className="h-5 w-5 mr-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
                                            )}
                                            {isFileProcessingLoading ? "Processing..." : `Process: ${file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name}`}
                                        </Button>
                                    </motion.div>
                                    <motion.div {...buttonMotionProps(0.05)} className="w-full sm:w-auto">
                                        <Button variant="outline" size="lg" onClick={clearFileSelection} className="w-full group text-base py-3 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                                            <Trash2 className="h-5 w-5 mr-2 transition-transform duration-300 group-hover:scale-110" /> Clear File
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </motion.div>

            {/* --- Loading Indicator for file processing (from DataPointConfigStep) --- */}
            <AnimatePresence>
                {isFileProcessingLoading && !fileProcessingSummary && (
                    <motion.div
                        key="loading-indicator-file" // Unique key
                        variants={contentAppearVariants} initial="hidden" animate="visible" exit="exit"
                        className="flex flex-col items-center justify-center p-8 space-y-3.5 bg-card/50 dark:bg-neutral-800/40 rounded-lg shadow-inner"
                    >
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <p className="text-lg font-medium text-muted-foreground">Crunching File Data...</p>
                        <p className="text-sm text-muted-foreground/80">Hold tight, we're processing your uploaded file.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Processing Summary for file upload (from DataPointConfigStep) --- */}
            <AnimatePresence>
                {fileProcessingSummary && (
                    <motion.div
                        key="file-processing-summary-card" // Unique key
                        variants={contentAppearVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="mt-6" // Adjusted margin
                    >
                        <Card className={cn(
                            "shadow-xl dark:shadow-black/25 overflow-hidden",
                            fileProcessingSummary.errors > 0 || fileProcessingSummary.skipped > 0
                                ? 'border-orange-500/70 dark:border-orange-600/70 bg-orange-50/30 dark:bg-orange-900/10'
                                : 'border-green-500/70 dark:border-green-600/70 bg-green-50/30 dark:bg-green-900/10'
                        )}>
                            <CardHeader className={cn(
                                "border-b pb-3",
                                fileProcessingSummary.errors > 0 || fileProcessingSummary.skipped > 0
                                    ? 'border-orange-500/30 dark:border-orange-600/30 bg-orange-500/5 dark:bg-orange-800/10'
                                    : 'border-green-500/30 dark:border-green-600/30 bg-green-500/5 dark:bg-green-800/10'
                            )}>
                                <div className="flex items-center space-x-3.5">
                                    {fileProcessingSummary.errors > 0 || fileProcessingSummary.skipped > 0 ? (
                                        <AlertTriangle className="h-7 w-7 text-orange-500 shrink-0" />
                                    ) : (
                                        <CheckCircle className="h-7 w-7 text-green-500 shrink-0" />
                                    )}
                                    <CardTitle className={cn(
                                        "text-xl sm:text-2xl",
                                        fileProcessingSummary.errors > 0 || fileProcessingSummary.skipped > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'
                                    )}>
                                        File Processing Complete
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 sm:p-6 space-y-4 text-sm">
                                {fileProcessingSummary.plantDetailsUpdated && (
                                    <motion.div variants={itemVariants(0.05)} className="flex items-start p-3 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300">
                                        <Info className="h-5 w-5 mr-3 mt-0.5 shrink-0" />
                                        <p>Plant-level configuration details from your JSON file were successfully applied where new values were provided.</p>
                                    </motion.div>
                                )}
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-base">
                                    <li className="flex justify-between"><span>Entries Processed:</span> <span className="font-semibold">{fileProcessingSummary.processed}</span></li>
                                    <li className="flex justify-between text-sky-700 dark:text-sky-300"><span>Points Updated:</span> <span className="font-semibold">{fileProcessingSummary.updated}</span></li>
                                    <li className="flex justify-between text-emerald-700 dark:text-emerald-300"><span>Points Added:</span> <span className="font-semibold">{fileProcessingSummary.added}</span></li>

                                    {fileProcessingSummary.skipped > 0 && (
                                        <li className="flex justify-between text-amber-700 dark:text-amber-400"><span>Entries Skipped:</span> <span className="font-semibold">{fileProcessingSummary.skipped}</span></li>
                                    )}
                                    <li className={cn("flex justify-between", fileProcessingSummary.errors > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-300')}>
                                        <span>Field-Level Errors:</span> <span className="font-semibold">{fileProcessingSummary.errors}</span>
                                    </li>
                                </ul>

                                {(fileProcessingSummary.errors > 0 || fileProcessingSummary.skipped > 0) && fileProcessingSummary.errorDetails.length > 0 && (
                                    <motion.div variants={itemVariants(0.1)} className="pt-3">
                                        <p className="text-base font-medium text-gray-700 dark:text-gray-200 mb-1.5">Detailed Issues:</p>
                                        <ScrollArea className="max-h-52 rounded-lg border bg-background/70 dark:bg-neutral-800/50 p-3 shadow-inner">
                                            <ul className="space-y-1.5 text-xs">
                                                {fileProcessingSummary.errorDetails.map((err, i) => (
                                                    <li key={i} className="flex items-start text-muted-foreground">
                                                        <AlertTriangle className="h-4 w-4 mr-2 mt-px text-orange-500/80 shrink-0" />
                                                        <span>{err}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </ScrollArea>
                                    </motion.div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Manual Data Point Entry Section (from DataPointConfigStep) --- */}
            <motion.div variants={itemVariants(0.2)}>
                <Card className="bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <PlusCircle className="h-6 w-6 text-teal-500 dark:text-teal-400 shrink-0" />
                                <CardTitle className="text-lg sm:text-xl font-medium">Add Data Point Manually</CardTitle>
                            </div>
                            {!showManualForm && (
                                <motion.div {...buttonMotionProps(0, false)}>
                                    <Button onClick={() => setShowManualForm(true)} variant="outline" size="sm" className="group" disabled={isDiscovering || isAiProcessing || isFileProcessingLoading}>
                                        <PlusCircle className="h-4 w-4 mr-2 group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors" />
                                        Add New
                                    </Button>
                                </motion.div>
                            )}
                        </div>
                        <AnimatePresence>
                            {showManualForm && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                    <CardDescription className="text-xs sm:text-sm text-muted-foreground pt-2">
                                        Fill in the details for the new data point. Fields marked * are required. Ensure ID is unique.
                                    </CardDescription>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardHeader>

                    <AnimatePresence>
                        {showManualForm && (
                            <motion.div
                                key="manual-form-content"
                                variants={contentAppearVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                <CardContent className="space-y-5 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-id">ID *</Label>
                                            <Input id="manual-id" name="id" value={manualDataPoint.id ?? ''} onChange={handleManualInputChange} placeholder="Unique identifier" />
                                            {manualFormErrors.id && <p className="text-xs text-red-500 pt-1">{manualFormErrors.id}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-name">Name *</Label>
                                            <Input id="manual-name" name="name" value={manualDataPoint.name ?? ''} onChange={handleManualInputChange} placeholder="Descriptive name" />
                                            {manualFormErrors.name && <p className="text-xs text-red-500 pt-1">{manualFormErrors.name}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-nodeId">OPC UA Node ID *</Label>
                                            <Input id="manual-nodeId" name="nodeId" value={manualDataPoint.nodeId ?? ''} onChange={handleManualInputChange} placeholder="e.g., ns=2;s=Device.Boiler.Temp1" />
                                            {manualFormErrors.nodeId && <p className="text-xs text-red-500 pt-1">{manualFormErrors.nodeId}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-label">Label (UI Display)</Label>
                                            <Input id="manual-label" name="label" value={manualDataPoint.label ?? ''} onChange={handleManualInputChange} placeholder="Short name (uses Name if blank)" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-dataType">Data Type *</Label>
                                            <Select name="dataType" value={manualDataPoint.dataType} onValueChange={(value) => handleManualSelectChange('dataType', value)}>
                                                <SelectTrigger id="manual-dataType"><SelectValue placeholder="Select data type" /></SelectTrigger>
                                                <SelectContent>{DATA_TYPE_OPTIONS_EXTENDED.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-uiType">UI Type *</Label>
                                            <Select name="uiType" value={manualDataPoint.uiType} onValueChange={(value) => handleManualSelectChange('uiType', value)}>
                                                <SelectTrigger id="manual-uiType"><SelectValue placeholder="Select UI type" /></SelectTrigger>
                                                <SelectContent>{UI_TYPE_OPTIONS_EXTENDED.map(uit => <SelectItem key={uit} value={String(uit)}>{String(uit)}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-icon">Icon Name</Label>
                                            <Input id="manual-icon" name="icon" value={manualDataPoint.icon ?? ''} onChange={handleManualInputChange} placeholder="e.g., Thermometer" />
                                            {manualFormErrors.icon && <p className="text-xs text-orange-500 pt-1">{manualFormErrors.icon}</p>}
                                            <p className="text-xs text-muted-foreground pt-0.5">From <a href="https://lucide.dev/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Lucide.dev</a> (optional).</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-unit">Unit</Label>
                                            <Input id="manual-unit" name="unit" value={manualDataPoint.unit ?? ''} onChange={handleManualInputChange} placeholder="e.g., °C, kWh" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-category">Category</Label>
                                            <Input id="manual-category" name="category" value={manualDataPoint.category ?? ''} onChange={handleManualInputChange} placeholder="e.g., HVAC, Production" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-min">Min Value</Label>
                                            <Input id="manual-min" name="min" type="number" value={manualDataPoint.min ?? ''} onChange={handleManualInputChange} placeholder="Numeric minimum" />
                                            {manualFormErrors.min && <p className="text-xs text-red-500 pt-1">{manualFormErrors.min}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-max">Max Value</Label>
                                            <Input id="manual-max" name="max" type="number" value={manualDataPoint.max ?? ''} onChange={handleManualInputChange} placeholder="Numeric maximum" />
                                            {manualFormErrors.max && <p className="text-xs text-red-500 pt-1">{manualFormErrors.max}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-factor">Factor</Label>
                                            <Input id="manual-factor" name="factor" type="number" value={manualDataPoint.factor ?? ''} onChange={handleManualInputChange} placeholder="Multiplier (e.g., 0.1)" />
                                            {manualFormErrors.factor && <p className="text-xs text-red-500 pt-1">{manualFormErrors.factor}</p>}
                                        </div>
                                        <div className="space-y-1.5 lg:col-span-1">
                                            <Label htmlFor="manual-phase">Phase / Subsystem</Label>
                                            <Input id="manual-phase" name="phase" value={manualDataPoint.phase ?? ''} onChange={handleManualInputChange} placeholder="e.g., L1, Coolant Loop" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="manual-description">Description</Label>
                                        <Textarea id="manual-description" name="description" value={manualDataPoint.description ?? ''} onChange={handleManualInputChange} placeholder="Optional detailed description" className="min-h-[60px]" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="manual-notes">Internal Notes</Label>
                                        <Textarea id="manual-notes" name="notes" value={manualDataPoint.notes ?? ''} onChange={handleManualInputChange} placeholder="Optional internal notes or remarks" className="min-h-[60px]" />
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-6 flex justify-end space-x-3 border-t border-border/50 dark:border-neutral-700/50">
                                    <motion.div {...buttonMotionProps(0.05)}>
                                        <Button variant="outline" onClick={handleCancelManualForm} className="group">
                                            <XCircle className="h-4 w-4 mr-2 group-hover:text-muted-foreground transition-colors" /> Cancel
                                        </Button>
                                    </motion.div>
                                    <motion.div {...buttonMotionProps(0, true)}>
                                        <Button onClick={handleSaveManualDataPoint} className="group">
                                            <Save className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" /> Save Data Point
                                        </Button>
                                    </motion.div>
                                </CardFooter>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </motion.div>

            {/* Process Log - Remains largely the same, ensure it's placed appropriately */}
            <motion.div variants={itemVariants(0.25)}>
                <Card className="border-border bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg">
                    <CardHeader>
                        <div className="flex items-center space-x-3">
                            <FileJson className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            <CardTitle className="text-lg sm:text-xl font-medium">Process Log</CardTitle>
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

            {/* AI Interaction Section - Grouping Chat and Controls */}
            <motion.div
                variants={itemVariants(0.28)} // This group will animate as one item initially
                className="grid grid-cols-1 md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0" // Responsive grid
            >
                {/* AI Chat UI Section */}
                <div className="md:col-span-1"> {/* Chat takes one column */}
                    <AIChatInterface messages={chatMessages} isLoading={isAiProcessing && aiProgress < 5 && chatMessages.filter(cm => cm.sender === 'ai' && cm.type !== 'welcome').length === 0} />
                </div>

                {/* AI Enhancement Control Section */}
                <AnimatePresence>
                    {((discoveredRawPoints.length > 0 || aiEnhancedPoints.some(p => p.source === 'discovered' || p.source === 'imported' || p.source === 'manual') || discoveredDataFilePath) && !isDiscovering && !isFileProcessingLoading) && (
                        <motion.div
                            // variants={itemVariants(0)} // No individual animation delay if grouped, parent handles it
                            initial={{ opacity: 0, y: 20 }} // Simple appear for the card itself if shown
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="md:col-span-1" // Control card takes one column
                        >
                            <Card className="border-border bg-card/90 dark:bg-neutral-800/80 backdrop-blur-md shadow-lg h-full flex flex-col"> {/* Added h-full and flex flex-col */}
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-center space-x-3">
                                            <Wand2 className="h-6 w-6 text-purple-500 dark:text-purple-400 shrink-0" />
                                            <CardTitle className="text-lg sm:text-xl font-medium">AI Enhancement Control</CardTitle>
                                        </div>
                                    </div>
                                    <CardDescription className="pt-2 text-xs sm:text-sm text-muted-foreground">
                                        Use Gemini AI to analyze discovered or existing datapoints. Requires a Gemini API Key and your consent. Results will appear in the AI Assistant Chat.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 flex-grow"> {/* Added flex-grow */}
                                    <div className="space-y-4"> {/* Added a container for spacing */}
                                        <div className="p-3 border border-border rounded-md bg-muted/20 dark:bg-neutral-800/30 space-y-3">
                                    <div className="flex items-start space-x-2.5">
                                        <Checkbox
                                            id="ai-consent-checkbox"
                                            checked={aiConsentGiven}
                                            onCheckedChange={(checkedState) => setAiConsentGiven(checkedState as boolean)}
                                            className="mt-0.5"
                                        />
                                        <Label htmlFor="ai-consent-checkbox" className="text-xs sm:text-sm font-normal text-muted-foreground leading-relaxed">
                                            I understand and consent to send my discovered data point information (such as NodeIDs and names) to a third-party AI service (Google Gemini) for configuration enhancement. This data will be used solely for the purpose of generating improved configurations. See our <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Privacy Policy</a> for details.
                                        </Label>
                                    </div>
                                </div>

                                {/* Gemini API Key Input - shown if no env key and no stored/session key */}
                                {(showGeminiKeyInput || (!GEMINI_API_KEY_EXISTS_CLIENT && !userProvidedGeminiKey && (typeof window !== "undefined" && !localStorage.getItem("geminiApiKey")))) && (
                                    <div className="mt-4 p-3 border border-border rounded-md bg-muted/20 dark:bg-neutral-800/30 space-y-2">
                                        <Label htmlFor="gemini-key-input" className="text-sm font-medium">Enter Your Gemini API Key (Optional if already set):</Label>
                                        <div className="flex items-center space-x-2">
                                            <Input id="gemini-key-input" type="password" value={userProvidedGeminiKey} onChange={(e) => setUserProvidedGeminiKey(e.target.value)} placeholder="Your Gemini API Key" className="flex-grow" />
                                            <Button size="sm" variant="secondary" onClick={() => {
                                                if (userProvidedGeminiKey.trim()) {
                                                    toast.success("Gemini API Key set for this session.");
                                                    // setShowGeminiKeyInput(false); // Keep input visible for changes, or hide:
                                                    addLogEntry('system', 'User provided Gemini API key for session.');
                                                } else {
                                                    toast.error("Please enter a valid API Key.");
                                                }
                                            }}>Set Session Key</Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">This key will be used for this session only. It is not stored permanently by default.</p>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="pt-4"> {/* Added pt-4 to CardContent for spacing button */}
                                <motion.div {...buttonMotionProps(0, false)} className="w-full sm:w-auto">
                                    <Button
                                        onClick={handleStartAiEnhancement}
                                        disabled={!aiConsentGiven || isDiscovering || isAiProcessing || isFileProcessingLoading || (discoveredRawPoints.length === 0 && !discoveredDataFilePath && !aiEnhancedPoints.some(p => p.source === 'discovered'))}
                                        className="group w-full"
                                        variant={aiEnhancedPoints.some(p => p.source === 'ai-enhanced') && aiStatusMessage.toLowerCase().includes("success") && !isAiProcessing ? "outline" : "default"}
                                    >
                                        {isAiProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sigma className="h-4 w-4 mr-2 group-hover:animate-pulse" />}
                                        {isAiProcessing ? "AI Processing..." : (aiEnhancedPoints.some(p => p.source === 'ai-enhanced') && aiStatusMessage.toLowerCase().includes("success") ? "Re-Run AI Enhancement" : "Start AI Enhancement")}
                                    </Button>
                                </motion.div>
                                <AnimatePresence>
                                    {(isAiProcessing || (aiStatusMessage && !isAiProcessing && !aiStatusMessage.toLowerCase().includes("preparing data for ai..."))) && ( // Avoid showing stale status if just preparing
                                        <motion.div variants={contentAppearVariants} initial="hidden" animate="visible" exit="exit" className="mt-4">
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
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Datapoints Table and Save actions - Updated to show 'source' and use currentPointsToDisplay */}
            <AnimatePresence>
                {(currentPointsToDisplay.length > 0) && (
                    <motion.div variants={itemVariants(0.35)} initial="hidden" animate="visible" exit="exit" key="datapoints-display-card-merged"> {/* Adjusted delay and key */}
                        <Card className="border-border bg-card/95 dark:bg-neutral-800/85 backdrop-blur-md shadow-xl">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-center space-x-3">
                                        <Database className="h-6 w-6 text-green-500 dark:text-green-400 shrink-0" />
                                        <CardTitle className="text-lg sm:text-xl font-medium">Aggregated Datapoints ({currentPointsToDisplay.length})</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <motion.div {...buttonMotionProps(0.02)}>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" className="group flex-grow sm:flex-grow-0 border-amber-500/50 hover:border-amber-500 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:border-amber-600/50 dark:hover:border-amber-500 dark:hover:bg-amber-500/20">
                                                        <RotateCcw className="h-4 w-4 mr-2 group-hover:rotate-[-45deg] transition-transform" /> Reset All
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Confirm Full Reset</AlertDialogTitle><AlertDialogDescription>Are you sure you want to reset ALL datapoint configurations (discovered, AI-enhanced, imported, and manual)? This action cannot be undone for the current session.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleResetConfiguration} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Confirm Full Reset</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </motion.div>
                                        <motion.div {...buttonMotionProps(0, true)} className="flex-grow sm:flex-grow-0">
                                            <Button onClick={handleSaveConfiguration} disabled={isLoading || isDiscovering || isAiProcessing || isFileProcessingLoading} className="group w-full">
                                                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2 group-hover:scale-110" />}
                                                {isLoading ? "Saving..." : "Save to Onboarding"}
                                            </Button>
                                        </motion.div>
                                    </div>
                                </div>
                                <CardDescription className="pt-2 text-xs sm:text-sm text-muted-foreground">
                                    Review, edit, and manage all datapoints. Click "Save to Onboarding" to apply these to the overall onboarding configuration.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 sm:px-2 md:px-4">
                                <ScrollArea className="max-h-[500px] sm:max-h-[600px] md:max-h-[700px] w-full rounded-md border border-border shadow-inner bg-card dark:bg-neutral-800/20">
                                    <Table className="min-w-full text-xs">
                                        <TableHeader className="sticky top-0 bg-muted/90 dark:bg-neutral-700/60 backdrop-blur-sm z-10"><TableRow className="border-b-border dark:border-b-neutral-600">
                                            <TableHead className="w-[140px] sm:w-[180px] px-2 py-2.5">Name / Label</TableHead>
                                            <TableHead className="w-[160px] sm:w-[200px] px-2 py-2.5">NodeId (Address)</TableHead>
                                            <TableHead className="w-[70px] sm:w-[90px] px-2 py-2.5">Data Type</TableHead>
                                            <TableHead className="w-[70px] sm:w-[90px] px-2 py-2.5">UI Type</TableHead>
                                            <TableHead className="w-[100px] sm:w-[130px] px-2 py-2.5">Category</TableHead>
                                            <TableHead className="w-[70px] sm:w-[90px] px-2 py-2.5 text-center">Source</TableHead> {/* Added Source Column */}
                                            <TableHead className="w-[40px] sm:w-[60px] px-2 py-2.5 text-center">Icon</TableHead>
                                            <TableHead className="w-[50px] sm:w-[70px] px-2 py-2.5">Unit</TableHead>
                                            <TableHead className="w-[40px] px-2 py-2.5 text-center">Edit</TableHead>
                                        </TableRow></TableHeader>
                                        <TableBody>
                                            {currentPointsToDisplay.map((dp, index) => {
                                                const DisplayIcon = dp.icon && typeof dp.icon === 'function' ? dp.icon : (getIconComponent(dp.iconName) || DEFAULT_ICON);
                                                const sourceDisplay = {
                                                    'discovered': <span className="text-blue-600 dark:text-blue-400">Discovery</span>,
                                                    'ai-enhanced': <span className="text-purple-600 dark:text-purple-400">AI</span>,
                                                    'manual': <span className="text-teal-600 dark:text-teal-400">Manual</span>,
                                                    'imported': <span className="text-indigo-600 dark:text-indigo-400">Imported</span>
                                                };
                                                return (
                                                    <TableRow key={dp.id || `dp-${index}-${dp.nodeId}`} className="hover:bg-muted/50 dark:hover:bg-neutral-700/40 border-b-border dark:border-b-neutral-700/60 last:border-b-0">
                                                        <TableCell className="font-medium px-2 py-1.5 align-top"><span className="font-semibold block">{dp.label || dp.name}</span><span className="text-muted-foreground text-[0.7rem] block">{dp.name !== (dp.label || dp.name) ? `(${dp.name})` : ''}</span></TableCell>
                                                        <TableCell className="text-muted-foreground px-2 py-1.5 align-top break-all">{dp.nodeId}</TableCell>
                                                        <TableCell className="px-2 py-1.5 align-top">{dp.dataType}</TableCell>
                                                        <TableCell className="px-2 py-1.5 align-top">{dp.uiType}</TableCell>
                                                        <TableCell className="px-2 py-1.5 align-top">{dp.category}</TableCell>
                                                        <TableCell className="px-2 py-1.5 align-top text-center text-[0.75rem] font-medium">{dp.source ? sourceDisplay[dp.source] : 'N/A'}</TableCell>
                                                        <TableCell className="px-2 py-1.5 align-top text-center">{DisplayIcon && typeof DisplayIcon === 'function' && <DisplayIcon className="h-4 w-4 inline-block text-muted-foreground" />}</TableCell>
                                                        <TableCell className="px-2 py-1.5 align-top">{dp.unit || 'N/A'}</TableCell>
                                                        <TableCell className="px-2 py-1.5 align-top text-center"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(dp)}><Maximize className="h-3.5 w-3.5 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" /></Button></TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                                {currentPointsToDisplay.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8 text-sm italic">
                                        No datapoints configured yet. Use Discovery, Upload, or Manual Add to get started.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal - Remains largely the same, ensure options are using extended lists */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] max-h-[90vh] flex flex-col">
                    <DialogHeader><DialogTitle className="text-xl">Edit Data Point: {editingPoint?.name}</DialogTitle><DialogDescription className="text-muted-foreground">Modify the details. Changes are local until "Save to Onboarding".</DialogDescription></DialogHeader>
                    <ScrollArea className="flex-grow pr-6 -mr-6">
                        {editingPoint && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 ">
                                <div className="space-y-1.5"><Label htmlFor="edit-id">ID (Read-only)</Label><Input id="edit-id" name="id" value={editingPoint.id} readOnly disabled className="bg-muted/50 dark:bg-neutral-700/40 opacity-70" /></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-nodeId">Node ID (Read-only for discovered/AI)</Label><Input id="edit-nodeId" name="nodeId" value={editingPoint.nodeId} readOnly={editingPoint.source === 'discovered' || editingPoint.source === 'ai-enhanced'} disabled={editingPoint.source === 'discovered' || editingPoint.source === 'ai-enhanced'} className={cn("bg-muted/50 dark:bg-neutral-700/40 opacity-70", { "opacity-100": editingPoint.source !== 'discovered' && editingPoint.source !== 'ai-enhanced' })} /></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-name">Name</Label><Input id="edit-name" name="name" value={editingPoint.name} onChange={handleEditFormChange} /></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-label">Label (UI Display)</Label><Input id="edit-label" name="label" value={editingPoint.label ?? ''} onChange={handleEditFormChange} /></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-dataType">Data Type</Label><Select name="dataType" value={editingPoint.dataType} onValueChange={(value) => handleEditSelectChange('dataType', value)}><SelectTrigger id="edit-dataType"><SelectValue /></SelectTrigger><SelectContent>{DATA_TYPE_OPTIONS_EXTENDED.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-uiType">UI Type</Label><Select name="uiType" value={editingPoint.uiType} onValueChange={(value) => handleEditSelectChange('uiType', value)}><SelectTrigger id="edit-uiType"><SelectValue /></SelectTrigger><SelectContent>{UI_TYPE_OPTIONS_EXTENDED.map(uit => <SelectItem key={String(uit)} value={String(uit)}>{String(uit)}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-iconName">Icon Name (Lucide)</Label><Input id="edit-iconName" name="iconName" value={editingPoint.iconName ?? ''} onChange={(e) => handleEditSelectChange('iconName', e.target.value)} /><p className="text-xs text-muted-foreground pt-1">E.g., "Zap", "Settings". Current: {getIconComponent(editingPoint.iconName) ? <span className="inline-flex items-center"><>{React.createElement(getIconComponent(editingPoint.iconName)!, { className: "h-3 w-3 mr-1" })} Valid</></span> : <span className="text-orange-500 dark:text-orange-400">Not found or invalid</span>}</p></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-unit">Unit</Label><Input id="edit-unit" name="unit" value={editingPoint.unit ?? ''} onChange={handleEditFormChange} /></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-category">Category</Label><Input id="edit-category" name="category" value={editingPoint.category ?? ''} onChange={handleEditFormChange} /></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-min">Min Value</Label><Input id="edit-min" name="min" type="text" value={editingPoint.min ?? ''} onChange={handleEditFormChange} placeholder="e.g., 0 or -10.5" /></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-max">Max Value</Label><Input id="edit-max" name="max" type="text" value={editingPoint.max ?? ''} onChange={handleEditFormChange} placeholder="e.g., 100 or 55.75" /></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-factor">Factor</Label><Input id="edit-factor" name="factor" type="text" value={editingPoint.factor ?? ''} onChange={handleEditFormChange} placeholder="e.g., 1 or 0.01" /></div>
                                <div className="space-y-1.5"><Label htmlFor="edit-precision">Precision (Decimals)</Label><Input id="edit-precision" name="precision" type="number" step="1" min="0" value={editingPoint.precision ?? ''} onChange={handleEditFormChange} /></div>
                                <div className="flex items-center space-x-2 pt-4 md:col-span-1"><Input type="checkbox" id="edit-isWritable" name="isWritable" checked={editingPoint.isWritable ?? false} onChange={handleEditFormChange} className="h-4 w-4 accent-primary" /><Label htmlFor="edit-isWritable" className="text-sm font-normal">Is Writable?</Label></div>
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