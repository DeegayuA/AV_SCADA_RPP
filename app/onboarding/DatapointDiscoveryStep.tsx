// components/onboarding/DatapointDiscoveryStep.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, AlertTriangle, ListChecks, FileJson, Sparkles, Network, Terminal, MessageSquare, DatabaseZap, X
} from 'lucide-react';
import { useOnboarding } from './OnboardingContext'; // Assuming context is in this path
import { DataPointConfig } from '@/config/dataPoints'; // Assuming this path
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import GeminiKeyConfigStep from './GeminiKeyConfigStep'; // Updated import
import { cn } from "@/lib/utils"; // Assuming you have this

// --- Framer Motion Variants (can be shared or defined per component) ---
const stepContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const cardVariants = { // Slightly different delay for the second card
  hidden: { opacity: 0, y: 30, filter: 'blur(5px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 90, damping: 15, mass: 0.8 }
  },
  exit: { opacity: 0, y: -20, filter: 'blur(5px)', transition: { duration: 0.2 } }
};

const itemVariants = (delay: number = 0) => ({
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 100, damping: 15, delay, mass: 0.8 }
  },
});

const buttonMotionProps = (delay: number = 0, primary: boolean = false) => ({
  variants: itemVariants(delay),
  whileHover: {
    scale: 1.03,
    boxShadow: primary ? "0px 6px 20px hsla(var(--primary)/0.3)" : "0px 4px 15px hsla(var(--foreground)/0.1)",
    transition: { type: "spring", stiffness: 300, damping: 10 }
  },
  whileTap: { scale: 0.97 }
});

const contentAppearVariants = {
  hidden: { opacity: 0, height: 0, y: 10 },
  visible: { opacity: 1, height: 'auto', y: 0, transition: { duration: 0.4, ease: 'circOut' } },
  exit: { opacity: 0, height: 0, y: -10, transition: { duration: 0.3, ease: 'circIn' } }
};

const chatMessageVariants = {
  hidden: { opacity: 0, x: -10, scale: 0.98 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 20, mass: 0.5 } },
  exit: { opacity: 0, x: 10, scale: 0.98, transition: { duration: 0.15 } }
};

// --- Interfaces (Copied from your provided snippet) ---
const getIconComponent = (iconName: string) => undefined; // Placeholder

interface DiscoveredDataPoint {
  name: string;
  address: string;
  initialValue: any;
  dataType: string;
}
interface DiscoveryApiResponse {
  success: boolean;
  message: string;
  count: number;
  filePath?: string;
  data?: DiscoveredDataPoint[];
  error?: string;
}
interface AiGeneratedDataPoint extends Omit<DataPointConfig, 'icon'> {
  icon?: string;
}
interface AiApiResponse {
  success: boolean;
  message?: string;
  data?: AiGeneratedDataPoint[];
  count?: number;
  error?: string;
  rawAiOutput?: string;
}
interface ChatMessage {
  id: string;
  type: 'system' | 'ai' | 'error' | 'info';
  text: string;
  timestamp: Date;
}

const DatapointDiscoveryStep: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [discoveredData, setDiscoveredData] = useState<DiscoveredDataPoint[]>([]);
  const [discoveryResponse, setDiscoveryResponse] = useState<Partial<DiscoveryApiResponse>>({});

  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGeneratedDataPointsCount, setAiGeneratedDataPointsCount] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showAiDataModal, setShowAiDataModal] = useState(false);

  const { configuredDataPoints, setConfiguredDataPoints, setIsStepLoading } = useOnboarding();

  const addChatMessage = useCallback((type: ChatMessage['type'], text: string) => {
    setChatMessages(prev => {
      const newMessages = [...prev, { id: `msg-${Date.now()}-${Math.random()}`, type, text, timestamp: new Date() }];
      // Keep only the last N messages if needed, e.g., 50
      // return newMessages.slice(-50); 
      return newMessages;
    });
  }, []);

  const resetDiscoveryState = () => {
    setDiscoveredData([]);
    setDiscoveryResponse({});
    // Ai related states are reset before AI generation usually
  };

  const handleDiscoverDatapoints = useCallback(async () => {
    resetDiscoveryState();
    setIsStepLoading(true);
    setIsLoading(true);
    setAiError(null);
    setAiGeneratedDataPointsCount(null);
    setChatMessages([]);
    addChatMessage('system', 'Initiating OPC UA datapoint discovery sequence...');

    try {
      const response = await fetch('/api/opcua/discover', { method: 'POST' });
      const result: DiscoveryApiResponse = await response.json();

      if (response.ok && result.success) {
        setDiscoveredData(result.data || []);
        setDiscoveryResponse({ count: result.count, filePath: result.filePath, message: result.message });
        addChatMessage('info', `Discovery successful: Found ${result.count} datapoints. Server log: ${result.message}`);
        if (result.filePath) addChatMessage('system', `Discovered data logged to server at: ${result.filePath}`);
        if (result.count === 0) {
          toast.info("Discovery Complete", { description: "No datapoints found or reported by the server." });
        } else {
          toast.success("Discovery Successful!", { description: `Found ${result.count} datapoints.` });
        }
      } else {
        const errorMsg = result.message || result.error || 'Datapoint discovery failed on the server.';
        addChatMessage('error', `Discovery API Error: ${errorMsg}`);
        toast.error("Discovery Failed", { description: errorMsg });
      }
    } catch (error: any) {
      const errorMsg = `Network or client-side error during discovery: ${error.message || 'Unknown error.'}`;
      addChatMessage('error', errorMsg);
      toast.error("Discovery System Error", { description: errorMsg });
    } finally {
      setIsLoading(false);
      setIsStepLoading(false);
    }
  }, [addChatMessage, setIsStepLoading]);

  const handleGenerateWithAi = useCallback(async () => {
    // Keep discovery chat messages, append AI messages or clear and focus?
    // Current behavior keeps existing chat. To clear: setChatMessages([]);
    addChatMessage('system', 'Preparing for AI-driven configuration generation...');

    if (!discoveryResponse.filePath) {
      const errorMsg = "Discovered datapoints file path missing. Please run discovery first.";
      setAiError(errorMsg); // This sets an overall AI error message if needed
      addChatMessage('error', errorMsg);
      toast.error("AI Pre-requisite Missing", { description: errorMsg });
      return;
    }
    addChatMessage('system', `Using datapoint file: ${discoveryResponse.filePath}`);

    const geminiApiKey = localStorage.getItem("geminiApiKey");
    if (!geminiApiKey) {
      const errorMsg = "Gemini API Key is not configured. Please set it up first.";
      setAiError(errorMsg);
      addChatMessage('error', errorMsg);
      toast.warning("API Key Required", { description: "Please configure your Gemini API Key." });
      // Potentially focus or highlight the GeminiKeyConfigStep here
      return;
    }
    addChatMessage('system', 'Gemini API Key found. Initiating AI processing...');

    setIsStepLoading(true);
    setIsAiGenerating(true);
    setAiError(null);
    setAiGeneratedDataPointsCount(null);

    try {
      const response = await fetch('/api/ai/generate-datapoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: discoveryResponse.filePath, geminiApiKey }),
      });

      const result: AiApiResponse = await response.json();
      if (response.ok && result.success && result.data) {
        addChatMessage('ai', `AI successfully processed and generated ${result.data.length} configurations.`);

        const transformedDataPoints: DataPointConfig[] = result.data.map(dp => {
          const { icon: iconName, ...restDp } = dp;
          const iconComponent = iconName ? getIconComponent(iconName) : undefined;
          const transformedDp: any = { ...restDp };
          if (iconComponent) transformedDp.icon = iconComponent;
          return transformedDp;
        });

        setConfiguredDataPoints(transformedDataPoints);
        setAiGeneratedDataPointsCount(result.data.length);
        toast.success("AI Configuration Complete!", {
          description: `Generated ${result.data.length} datapoint configurations.`,
        });
      } else {
        const errorMsg = result.message || result.error || 'AI generation failed or returned no data.';
        setAiError(errorMsg);
        addChatMessage('error', `AI Generation Error: ${errorMsg}`);
        if (result.rawAiOutput) {
          addChatMessage('ai', `Diagnostics: Raw AI output (truncated): ${result.rawAiOutput.substring(0, 150)}...`);
        }
        toast.error("AI Generation Failed", { description: errorMsg });
      }
    } catch (error: any) {
      const errorMsg = `Network/client error during AI generation: ${error.message || 'Unknown error.'}`;
      setAiError(errorMsg);
      addChatMessage('error', errorMsg);
      toast.error("AI System Error", { description: errorMsg });
    } finally {
      setIsAiGenerating(false);
      setIsStepLoading(false);
    }
  }, [discoveryResponse.filePath, setConfiguredDataPoints, addChatMessage, setIsStepLoading]);

  const geminiKeyConfigured = typeof window !== 'undefined' && !!localStorage.getItem("geminiApiKey");


  return (
    <motion.div className="space-y-6 sm:space-y-8" variants={stepContainerVariants} initial="hidden" animate="visible">
      {/* Gemini API Key Configuration always visible as the first item */}
      <GeminiKeyConfigStep />

      {/* Datapoint Discovery and AI Configuration Card */}
      <motion.div variants={cardVariants}>
        <Card className="w-full shadow-lg dark:shadow-black/20 border-border/50 bg-card/80 dark:bg-neutral-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <motion.div variants={itemVariants(0)} className="flex items-center space-x-3">
              <Network className="h-7 w-7 text-primary" />
              <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                Datapoint Configuration
              </CardTitle>
            </motion.div>
            <motion.div variants={itemVariants(0.05)}>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Discover datapoints from your OPC UA server, then (optionally) use AI to generate detailed configurations for the application.
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6 sm:space-y-8 pt-2">
            {/* --- Discovery Section --- */}
            <motion.div variants={itemVariants(0.1)} className="space-y-4 p-4 sm:p-5 rounded-lg border border-border/40 dark:border-neutral-700/40 bg-background/20 dark:bg-neutral-900/20 shadow-sm">
              <div className="flex items-center gap-3">
                <FileJson className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">OPC UA Discovery</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Attempt to discover available datapoints (nodes) from the configured OPC UA server.
              </p>
              <motion.div {...buttonMotionProps(0, true)} className="flex flex-row items-center gap-3 sm:gap-4">
                <Button
                  onClick={handleDiscoverDatapoints}
                  disabled={isLoading || isAiGenerating}
                  size="lg"
                  className="w-full group bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Network className="mr-2.5 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  )}
                  {isLoading ? "Discovering..." : "Start PLC Discovery"}
                </Button>
                {isLoading && (
                  <motion.div variants={itemVariants(0)} className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Accessing PLC, please wait...</span>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>

            {/* --- Chat/Log Section --- */}
            <AnimatePresence>
              {chatMessages.length > 0 && (
                <motion.div
                  variants={contentAppearVariants}
                  initial="hidden" animate="visible" exit="exit"
                  className="space-y-3"
                >
                  <motion.div variants={itemVariants(0)} className="flex items-center gap-2 px-1">
                    <Terminal className="h-5 w-5 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-muted-foreground">Process Log</h4>
                  </motion.div>
                  <ScrollArea className="h-48 max-h-60 w-full rounded-md border border-border/40 dark:border-neutral-700/40 bg-muted/20 dark:bg-neutral-900/30 p-3 sm:p-4 shadow-inner">
                    <div className="space-y-2.5">
                      <AnimatePresence>
                        {chatMessages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            layout
                            variants={chatMessageVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className={cn("text-xs p-2 rounded-md shadow-sm relative overflow-hidden",
                              msg.type === 'error' && 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-l-4 border-red-500',
                              msg.type === 'ai' && 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-l-4 border-indigo-500',
                              msg.type === 'system' && 'bg-slate-50 dark:bg-neutral-700/40 text-slate-600 dark:text-neutral-300 border-l-4 border-slate-500',
                              msg.type === 'info' && 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-l-4 border-green-500'
                            )}
                          >
                            <span className="font-medium capitalize">{msg.type}: </span>{msg.text}
                            <span className="block text-right text-gray-400 dark:text-gray-500 text-[10px] mt-1 opacity-80">
                              {msg.timestamp.toLocaleTimeString()}
                            </span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>

            {/* --- General Error Message Display (e.g. if chat doesn't cover some case) --- */}
            {/* This could be for API errors outside specific flows handled by chat. Currently, most errors are added to chat. */}
            {/* This block is a fallback or for specific prominent errors if needed */}


            {/* --- Discovered Datapoints Table --- */}
            <AnimatePresence>
              {discoveredData.length > 0 && !isLoading && (
                <motion.div
                  key="discovered-data-section"
                  variants={contentAppearVariants}
                  initial="hidden" animate="visible" exit="exit"
                  className="space-y-4 pt-5 sm:pt-6 border-t border-border/40 dark:border-neutral-700/40"
                >
                  <motion.div variants={itemVariants(0)} className="text-center">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      Discovered Datapoints ({discoveredData.length})
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Review items found on the OPC UA server. You can then enhance them with AI.
                    </p>
                  </motion.div>
                  <motion.div variants={itemVariants(0.05)} className="overflow-hidden border border-border/40 dark:border-neutral-700/40 rounded-lg shadow-md bg-card dark:bg-neutral-800">
                    <ScrollArea className="max-h-96">
                      <Table className="min-w-full">
                        <TableHeader className="bg-muted/50 dark:bg-neutral-700/30 sticky top-0 z-[5]">
                          <TableRow>
                            <TableHead className="py-2.5 px-3 sm:px-4">Name</TableHead>
                            <TableHead className="py-2.5 px-3 sm:px-4">Address (NodeId)</TableHead>
                            <TableHead className="py-2.5 px-3 sm:px-4">Initial Value</TableHead>
                            <TableHead className="py-2.5 px-3 sm:px-4">Data Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {discoveredData.map((dp, index) => (
                            <TableRow key={dp.address || index} className="hover:bg-muted/20 dark:hover:bg-neutral-700/20 text-xs sm:text-sm">
                              <TableCell className="font-medium py-2 px-3 sm:px-4 ">{dp.name}</TableCell>
                              <TableCell className="py-2 px-3 sm:px-4 text-muted-foreground">{dp.address}</TableCell>
                              <TableCell className="py-2 px-3 sm:px-4 text-muted-foreground">{String(dp.initialValue)}</TableCell>
                              <TableCell className="py-2 px-3 sm:px-4 text-muted-foreground">{dp.dataType}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </motion.div>

                  {/* --- AI Generation Section (Appears after discovery) --- */}
                  <motion.div
                    variants={itemVariants(0.1)}
                    className="pt-5 sm:pt-6 space-y-4 p-4 sm:p-5 rounded-lg border border-border/40 dark:border-neutral-700/40 bg-background/20 dark:bg-neutral-900/20 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">AI Enhancement</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Use Gemini AI to analyze discovered datapoints and generate rich configurations (e.g., labels, UI types, units, categories).
                      Requires a configured Gemini API Key.
                    </p>
                    <motion.div {...buttonMotionProps(0, true)} className="flex flex-col items-center gap-3 sm:gap-4">
                      <Button
                        onClick={handleGenerateWithAi}
                        disabled={isAiGenerating || isLoading || discoveredData.length === 0 || !discoveryResponse.filePath || !geminiKeyConfigured}
                        variant="default"
                        size="lg"
                        className="w-full group bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                        title={!geminiKeyConfigured ? "Gemini API Key not configured" : ""}
                      >
                        {isAiGenerating ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2.5 h-5 w-5 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-[15deg]" />
                        )}
                        {isAiGenerating ? "AI Processing..." : "Generate with AI"}
                      </Button>
                      {isAiGenerating && (
                        <motion.div variants={itemVariants(0)} className="flex items-center text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span>
                            AI is analyzing data...<br />
                            Since this is free and works with a lot of data points, this will take some time.
                          </span>                        </motion.div>
                      )}
                      {!geminiKeyConfigured && discoveredData.length > 0 && (
                        <motion.p variants={itemVariants(0)} className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                          <AlertTriangle size={14} /> API Key required for AI features.
                        </motion.p>
                      )}
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fallback messages if discovery yields nothing */}
            <AnimatePresence>
              {!isLoading && !discoveryResponse.message && discoveredData.length === 0 && chatMessages.length > 0 && discoveryResponse.count === 0 && (
                <motion.div
                  key="no-data-found"
                  variants={contentAppearVariants} initial="hidden" animate="visible" exit="exit"
                  className="flex items-center space-x-3 p-3 sm:p-4 rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50"
                >
                  <DatabaseZap className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-300">
                      No Datapoints Discovered
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-500">
                      The discovery process completed but found no datapoints. Check PLC connection & configuration.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


            {/* --- AI Generation Results Display --- */}
            <AnimatePresence>
              {aiGeneratedDataPointsCount !== null && !isAiGenerating && !aiError && (
                <motion.div
                  key="ai-results-section"
                  variants={contentAppearVariants}
                  initial="hidden" animate="visible" exit="exit"
                  className="space-y-3 pt-5 sm:pt-6 border-t border-border/40 dark:border-neutral-700/40"
                >
                  <motion.div variants={itemVariants(0)} className="flex items-center space-x-3 p-3 sm:p-4 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50">
                    <ListChecks className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-300">
                        AI Generation Successful
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        Generated <strong>{aiGeneratedDataPointsCount}</strong> datapoint configurations. These are now staged for review.
                      </p>
                    </div>
                  </motion.div>
                  <motion.div {...buttonMotionProps(0.1)} className="flex justify-center">
                    <Button variant="outline" onClick={() => setShowAiDataModal(true)}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Show AI-Generated JSON
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {aiError && !isAiGenerating && (
                <motion.div
                  key="ai-error-section"
                  variants={contentAppearVariants}
                  initial="hidden" animate="visible" exit="exit"
                  className="space-y-3 pt-5 sm:pt-6 border-t border-border/40 dark:border-neutral-700/40"
                >
                  <motion.div variants={itemVariants(0)} className="flex items-center space-x-3 p-3 sm:p-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-300">
                        AI Generation Error
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-500">
                        {aiError}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
          <AnimatePresence>
            {(discoveredData.length > 0 || aiGeneratedDataPointsCount !== null || chatMessages.length > 0) &&
              <motion.div variants={itemVariants(0.2)}>
                <CardFooter className="pt-4 border-t border-border/40 dark:border-neutral-700/40">
                  <p className="text-xs text-muted-foreground text-center w-full">
                    Proceed to the last step to review and finalize these configurations.
                  </p>
                </CardFooter>
              </motion.div>
            }
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* --- AI Generated Data Modal --- */}
      <AnimatePresence>
        {showAiDataModal && (
          <Dialog open={showAiDataModal} onOpenChange={setShowAiDataModal}>
            <DialogContent
              className="sm:max-w-2xl md:max-w-3xl w-[95vw] p-0 max-h-[90vh] flex flex-col 
                         bg-card/90 dark:bg-neutral-800/90 backdrop-blur-md 
                         shadow-2xl rounded-xl border border-border/50">
              <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border/70 dark:border-neutral-700 sticky top-0 bg-transparent z-10 rounded-t-xl">
                <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center text-gray-800 dark:text-gray-100">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-primary shrink-0" />
                  AI-Generated Datapoint Configurations
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  JSON view of the datapoints configured by AI. This data is staged for the final review step.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-grow overflow-hidden p-0">
                <ScrollArea className="h-[calc(90vh-150px)] w-full custom-scrollbar"> {/* Adjust height based on header/footer */}
                  <pre className="text-xs p-4 sm:p-6 whitespace-pre-wrap break-all">
                    {JSON.stringify(configuredDataPoints, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
              <DialogFooter className="px-4 py-3 sm:px-6 sm:py-4 border-t border-border/70 dark:border-neutral-700 sticky bottom-0 bg-transparent z-10 rounded-b-xl">
                <DialogClose asChild>
                  <Button variant="outline">
                    <X className="mr-2 h-4 w-4" /> Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DatapointDiscoveryStep;