"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, ListChecks, FileJson, Sparkles } from 'lucide-react';
import { useOnboarding } from './OnboardingContext';
import { DataPointConfig } from '@/config/dataPoints';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Simple utility to convert string to icon component (placeholder implementation)
const getIconComponent = (iconName: string) => {
  // Return undefined for now - this can be implemented later with proper icon mapping
  return undefined;
};

// Define the structure of a discovered data point for the frontend
interface DiscoveredDataPoint {
  name: string;
  address: string; // NodeId
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

// Interface for the AI generation API response (data part)
// This should match the DataPoint structure expected by setConfiguredDataPoints
// For this subtask, we assume it's compatible with DataPointConfig from '@/config/dataPoints'
// If DataPointConfig has function types for icons, the AI will return strings,
// and a transformation step would be needed later, or setConfiguredDataPoints needs to handle it.
interface AiGeneratedDataPoint extends Omit<DataPointConfig, 'icon'> {
  icon?: string; // AI provides icon name as string
}
interface AiApiResponse {
  success: boolean;
  message?: string; // Optional message from AI API
  data?: AiGeneratedDataPoint[];
  count?: number;
  error?: string;
  rawAiOutput?: string; // For debugging if parsing failed
}

interface ChatMessage {
  id: string; // For unique key in React list
  type: 'system' | 'ai' | 'error' | 'info';
  text: string;
  timestamp: Date;
}

const DatapointDiscoveryStep: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [discoveredData, setDiscoveredData] = useState<DiscoveredDataPoint[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [discoveryResponse, setDiscoveryResponse] = useState<Partial<DiscoveryApiResponse>>({});

  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGeneratedDataPointsCount, setAiGeneratedDataPointsCount] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showAiDataModal, setShowAiDataModal] = useState(false);

  const { configuredDataPoints, setConfiguredDataPoints, setIsStepLoading } = useOnboarding();

  const addChatMessage = (type: ChatMessage['type'], text: string) => {
    setChatMessages(prev => [...prev, { id: `msg-${Date.now()}-${Math.random()}`, type, text, timestamp: new Date() }]);
  };

  const handleDiscoverDatapoints = useCallback(async () => {
    setIsStepLoading(true);
    setIsLoading(true);
    setErrorMessage(null);
    setDiscoveredData([]);
    setDiscoveryResponse({});
    setAiError(null); // Clear previous AI errors
    setAiGeneratedDataPointsCount(null); // Clear previous AI counts
    setChatMessages([]);
    addChatMessage('system', 'Starting OPC UA datapoint discovery...');

    try {
      const response = await fetch('/api/opcua/discover', {
        method: 'POST',
      });

      const result: DiscoveryApiResponse = await response.json();

      if (response.ok && result.success) {
        setDiscoveredData(result.data || []);
        setDiscoveryResponse({
          count: result.count,
          filePath: result.filePath,
          message: result.message
        });
        addChatMessage('info', `Discovery successful: Found ${result.count} datapoints. Results saved to server at ${result.filePath}`);
        console.log("Discovery successful:", result);
      } else {
        const errorMsg = result.message || result.error || 'Failed to discover datapoints. The server returned an error.';
        setErrorMessage(errorMsg);
        addChatMessage('error', `Discovery failed: ${errorMsg}`);
        console.error("Discovery API error:", result);
      }
    } catch (error: any) {
      console.error("Network or unexpected error during discovery:", error);
      const errorMsg = `An unexpected error occurred: ${error.message || 'Please check the console for more details.'}`;
      setErrorMessage(errorMsg);
      addChatMessage('error', `Network or unexpected error during discovery: ${error.message}`);
      toast.error("Discovery Failed", { description: errorMsg });
    } finally {
      setIsLoading(false);
      setIsStepLoading(false);
    }
  }, [addChatMessage, setIsStepLoading]);

  const handleGenerateWithAi = useCallback(async () => {
    setChatMessages([]); // Clear chat messages for AI generation focus
    addChatMessage('system', 'Initializing AI generation process...');

    if (!discoveryResponse.filePath) {
      const errorMsg = "File path for discovered datapoints is not available. Please run discovery first.";
      setAiError(errorMsg);
      addChatMessage('error', errorMsg);
      toast.error("AI Generation Error", { description: errorMsg });
      return;
    }
    addChatMessage('system', `Using discovered datapoints file: ${discoveryResponse.filePath}`);

    const geminiApiKey = localStorage.getItem("geminiApiKey");
    if (!geminiApiKey) {
      const errorMsg = "Gemini API Key not found in local storage. Please configure it in the 'Gemini API Key' step.";
      addChatMessage('error', errorMsg);
      setAiError(errorMsg);
      setIsAiGenerating(false);
      // No setIsStepLoading(false) here as it's not set true yet for this path
      toast.error("Configuration Error", { description: "Gemini API Key not found." });
      return;
    }
    addChatMessage('system', 'Gemini API Key found. Proceeding with AI generation.');

    setIsStepLoading(true);
    setIsAiGenerating(true);
    setAiError(null);
    setAiGeneratedDataPointsCount(null);
    addChatMessage('system', 'Sending discovered datapoints to AI for processing. This might take a few moments.');

    try {
      const response = await fetch('/api/ai/generate-datapoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: discoveryResponse.filePath,
          geminiApiKey: geminiApiKey // Send the key
        }),
      });

      const result: AiApiResponse = await response.json();
      if (response.ok && result.success && result.data) {
        addChatMessage('ai', 'AI successfully processed the datapoints.');
        addChatMessage('info', `Successfully generated ${result.data.length} datapoint configurations.`);
        const transformedDataPoints: DataPointConfig[] = result.data.map(dp => {
          const { icon: iconName, ...restDp } = dp;
          const iconComponent = iconName ? getIconComponent(iconName) : undefined;
          const transformedDp: any = { ...restDp };
          if (iconComponent) {
            transformedDp.icon = iconComponent;
          }
          return transformedDp;
        });
        
        setConfiguredDataPoints(transformedDataPoints);
        setAiGeneratedDataPointsCount(result.data.length);
        toast.success("AI Generation Successful!", {
          description: `Successfully generated ${result.data.length} datapoint configurations.`,
        });
        console.log("AI generated data:", result.data);
      } else {
        const errorMsg = result.message || result.error || 'Failed to generate datapoint configurations with AI.';
        setAiError(errorMsg);
        addChatMessage('error', `AI generation failed: ${errorMsg}`);
        if (result.rawAiOutput) {
          addChatMessage('ai', `Raw AI Output (partial): ${result.rawAiOutput.substring(0, 200)}...`);
        }
        toast.error("AI Generation Failed", { description: errorMsg });
        console.error("AI Generation API error:", result);
      }
    } catch (error: any) {
      console.error("Network or unexpected error during AI generation:", error);
      const errorMsg = `An unexpected error occurred: ${error.message || 'Please check the console.'}`;
      setAiError(errorMsg);
      addChatMessage('error', `Network or unexpected error during AI generation: ${error.message}`);
      toast.error("AI Generation Failed", { description: errorMsg });
    } finally {
      setIsAiGenerating(false);
      setIsStepLoading(false);
    }
  }, [discoveryResponse.filePath, setConfiguredDataPoints, addChatMessage, setIsStepLoading]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Step 4: Automatic Datapoint Discovery & AI Configuration</CardTitle>
        <CardDescription>
          Discover datapoints from your OPC UA server, then use AI to generate detailed configurations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <Button onClick={handleDiscoverDatapoints} disabled={isLoading || isAiGenerating} size="lg">
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <FileJson className="mr-2 h-5 w-5" />
            )}
            {isLoading ? "Discovering..." : "Discover Datapoints from PLC"}
          </Button>

          {isLoading && (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Discovering datapoints, please wait...</span>
            </div>
          )}
        </div>

        {/* Chat Messages Display - Moved up to be visible during/after discovery and AI gen */}
        {chatMessages.length > 0 && (
          <div className="mt-6 p-3 border rounded-md max-h-60 overflow-y-auto bg-muted/30 space-y-2 shadow-inner">
            <h4 className="text-sm font-semibold mb-2 text-center text-muted-foreground sticky top-0 bg-muted/30 py-1">Process Log</h4>
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`text-xs p-1.5 rounded-md shadow-sm ${
                msg.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                msg.type === 'ai' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                msg.type === 'system' ? 'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300' :
                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' // info
              }`}>
                <span className="font-medium capitalize">{msg.type}: </span>{msg.text}
                <span className="block text-right text-gray-500 dark:text-gray-400 text-[10px] mt-0.5">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {errorMessage && !isLoading && ( // Show general discovery error if not loading and chat isn't covering it
          <div className="flex items-center space-x-2 text-red-600 bg-red-100 p-3 rounded-md">
            <AlertTriangle className="h-5 w-5" />
            <p>
              <strong>Discovery Error:</strong> {errorMessage}
            </p>
          </div>
        )}

        {!isLoading && discoveryResponse.message && !errorMessage && discoveredData.length === 0 && ( // Show if discovery finished, no errors, but no data
           <div className={`flex items-center space-x-2 p-3 rounded-md bg-blue-100 text-blue-700`}>
            <AlertTriangle className="h-5 w-5" />
            <p>
              <strong>Status:</strong> {discoveryResponse.message} No datapoints were found.
            </p>
          </div>
        )}


        {discoveredData.length > 0 && !isLoading && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-center">Discovered Datapoints ({discoveredData.length})</h3>
             <p className="text-sm text-muted-foreground text-center px-4">
                Review the discovered datapoints below. Then, use AI to enrich them for the application.
              </p>
            <div className="overflow-x-auto border rounded-md max-h-80 shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="py-2 px-3">Name</TableHead>
                    <TableHead className="py-2 px-3">Address (NodeId)</TableHead>
                    <TableHead className="py-2 px-3">Initial Value</TableHead>
                    <TableHead className="py-2 px-3">Data Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discoveredData.map((dp, index) => (
                    <TableRow key={dp.address || index} className="hover:bg-muted/30">
                      <TableCell className="font-medium py-2 px-3 text-sm">{dp.name}</TableCell>
                      <TableCell className="py-2 px-3 text-xs">{dp.address}</TableCell>
                      <TableCell className="py-2 px-3 text-xs">{String(dp.initialValue)}</TableCell>
                      <TableCell className="py-2 px-3 text-xs">{dp.dataType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="pt-6 space-y-3 border-t mt-8">
              <h4 className="text-md font-semibold text-center">Enhance with AI</h4>
              <p className="text-xs text-muted-foreground text-center px-4">
                Use AI to automatically generate full configurations (labels, UI types, icons, categories, etc.) for the discovered datapoints.
                These will populate the main configuration used in the Review step. Requires Gemini API Key.
              </p>
              <div className="flex flex-col items-center">
                <Button
                  onClick={handleGenerateWithAi}
                  disabled={isAiGenerating || isLoading || discoveredData.length === 0 || !discoveryResponse.filePath}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10 hover:text-primary shadow-sm"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      AI Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate Full Configuration with AI
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* This specific AI loading indicator can be removed if chat provides enough feedback */}
        {/* {isAiGenerating && (
          <div className="flex items-center text-muted-foreground justify-center p-4">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>AI is analyzing datapoints and generating configurations. Please wait...</span>
          </div>
        )} */}

        {aiError && !isAiGenerating && ( // Show general AI error if not loading and chat isn't covering it
          <div className="flex items-center space-x-2 text-red-600 bg-red-100 p-3 rounded-md mt-4">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm">
              <strong>AI Error:</strong> {aiError}
            </p>
          </div>
        )}

        {aiGeneratedDataPointsCount !== null && !isAiGenerating && !aiError && (
           // This success message is good, but the chat log will also contain it.
           // We can keep it for extra prominence or remove if chat log is deemed sufficient.
           // For now, keeping it.
          <div className="flex items-center space-x-2 text-green-700 bg-green-100 p-3 rounded-md mt-4">
            <ListChecks className="h-5 w-5" />
            <p className="text-sm">
              Successfully generated <strong>{aiGeneratedDataPointsCount}</strong> datapoint configurations using AI.
              These have been loaded and will be available in the Review step.
            </p>
          </div>
        )}

        {aiGeneratedDataPointsCount !== null && !isAiGenerating && !aiError && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => setShowAiDataModal(true)}>
              Show AI-Generated Data
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={showAiDataModal} onOpenChange={setShowAiDataModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI-Generated Datapoint Configurations</DialogTitle>
            <DialogDescription>
              This is the JSON representation of the datapoints configured by the AI.
              These will be saved at the end of the onboarding process.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] rounded-md border p-4 my-4">
            <pre className="text-xs">
              {JSON.stringify(configuredDataPoints, null, 2)}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DatapointDiscoveryStep;
