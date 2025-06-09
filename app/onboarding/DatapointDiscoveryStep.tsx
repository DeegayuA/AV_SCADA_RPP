"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, ListChecks, FileJson, Sparkles } from 'lucide-react'; // Added Sparkles for AI button
import { useOnboarding } from './OnboardingContext';
import { DataPointConfig } from '@/config/dataPoints'; // For setConfiguredDataPoints type
import { toast } from 'sonner';

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


const DatapointDiscoveryStep: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [discoveredData, setDiscoveredData] = useState<DiscoveredDataPoint[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [discoveryResponse, setDiscoveryResponse] = useState<Partial<DiscoveryApiResponse>>({});

  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGeneratedDataPointsCount, setAiGeneratedDataPointsCount] = useState<number | null>(null);

  const { setConfiguredDataPoints } = useOnboarding();

  const handleDiscoverDatapoints = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setDiscoveredData([]);
    setDiscoveryResponse({});
    setAiError(null); // Clear previous AI errors
    setAiGeneratedDataPointsCount(null); // Clear previous AI counts

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
        // Example: Store filepath in context if needed for next steps
        // if (result.filePath && setDiscoveredDatapointsFile) {
        //   setDiscoveredDatapointsFile(result.filePath);
        // }
        // Consider showing a success toast here if a toast system is integrated
        console.log("Discovery successful:", result);
      } else {
        setErrorMessage(result.message || result.error || 'Failed to discover datapoints. The server returned an error.');
        console.error("Discovery API error:", result);
      }
    } catch (error: any) {
      console.error("Network or unexpected error during discovery:", error);
      setErrorMessage(`An unexpected error occurred: ${error.message || 'Please check the console for more details.'}`);
      toast.error("Discovery Failed", { description: `An unexpected error occurred: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerateWithAi = useCallback(async () => {
    if (!discoveryResponse.filePath) {
      setAiError("File path for discovered datapoints is not available. Please run discovery first.");
      toast.error("AI Generation Error", { description: "File path for discovered datapoints is not available." });
      return;
    }

    setIsAiGenerating(true);
    setAiError(null);
    setAiGeneratedDataPointsCount(null);

    try {
      const response = await fetch('/api/ai/generate-datapoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: discoveryResponse.filePath }),
      });

      const result: AiApiResponse = await response.json();

      if (response.ok && result.success && result.data) {
        // The AI provides icon names as strings.
        // The DataPointConfig in context might expect LucideIcon components.
        // For now, we pass it as is. The ReviewStep or other components
        // will need to handle the string-to-component transformation for icons.
        // This matches the behavior of manual configuration where icon string is stored.
        setConfiguredDataPoints(result.data as DataPointConfig[]);
        setAiGeneratedDataPointsCount(result.data.length);
        toast.success("AI Generation Successful!", {
          description: `Successfully generated ${result.data.length} datapoint configurations.`,
        });
        console.log("AI generated data:", result.data);
      } else {
        const errorMsg = result.message || result.error || 'Failed to generate datapoint configurations with AI.';
        setAiError(errorMsg + (result.rawAiOutput ? ` (Raw AI Output: ${result.rawAiOutput.substring(0,100)}...)` : ""));
        toast.error("AI Generation Failed", { description: errorMsg });
        console.error("AI Generation API error:", result);
      }
    } catch (error: any) {
      console.error("Network or unexpected error during AI generation:", error);
      const errorMsg = `An unexpected error occurred: ${error.message || 'Please check the console.'}`;
      setAiError(errorMsg);
      toast.error("AI Generation Failed", { description: errorMsg });
    } finally {
      setIsAiGenerating(false);
    }
  }, [discoveryResponse.filePath, setConfiguredDataPoints]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Step 4: Automatic Datapoint Discovery</CardTitle>
        <CardDescription>
          Attempt to automatically discover available datapoints from your OPC UA server.
          This can help quickly populate your configuration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <Button onClick={handleDiscoverDatapoints} disabled={isLoading} size="lg">
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <FileJson className="mr-2 h-5 w-5" />
            )}
            Discover Datapoints from PLC
          </Button>

          {isLoading && (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Discovering datapoints, please wait...</span>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-100 p-3 rounded-md">
            <AlertTriangle className="h-5 w-5" />
            <p>
              <strong>Error:</strong> {errorMessage}
            </p>
          </div>
        )}

        {!isLoading && discoveryResponse.message && !errorMessage && (
           <div className={`flex items-center space-x-2 p-3 rounded-md ${discoveredData.length > 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {discoveredData.length > 0 ? <ListChecks className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" /> }
            <p>
              <strong>Status:</strong> {discoveryResponse.message}
              {discoveredData.length > 0 && ` Found ${discoveryResponse.count} datapoints.`}
              {discoveryResponse.filePath && ` Results saved to server at: ${discoveryResponse.filePath}`}
            </p>
          </div>
        )}

        {discoveredData.length > 0 && !isLoading && (
          <div className="space-y-4 p-1">
            <h3 className="text-lg font-semibold text-center">Discovered Datapoints ({discoveredData.length})</h3>
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

            <div className="pt-4 space-y-3 border-t mt-6">
              <h4 className="text-md font-semibold text-center">Enhance with AI</h4>
              <p className="text-xs text-muted-foreground text-center px-4">
                Use AI to automatically generate full configurations (labels, UI types, icons, categories, etc.) for the discovered datapoints.
                These will populate the main configuration used in the Review step.
              </p>
              <div className="flex flex-col items-center">
                <Button
                  onClick={handleGenerateWithAi}
                  disabled={isAiGenerating || isLoading || discoveredData.length === 0 || !discoveryResponse.filePath}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10 hover:text-primary"
                >
                  {isAiGenerating ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-5 w-5" />
                  )}
                  Generate Full Configuration with AI
                </Button>
              </div>
            </div>
          </div>
        )}

        {isAiGenerating && (
          <div className="flex items-center text-muted-foreground justify-center p-4">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>AI is generating configurations, please wait...</span>
          </div>
        )}

        {aiError && !isAiGenerating && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-100 p-3 rounded-md">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm">
              <strong>AI Error:</strong> {aiError}
            </p>
          </div>
        )}

        {aiGeneratedDataPointsCount !== null && !isAiGenerating && !aiError && (
          <div className="flex items-center space-x-2 text-green-700 bg-green-100 p-3 rounded-md">
            <ListChecks className="h-5 w-5" />
            <p className="text-sm">
              Successfully generated <strong>{aiGeneratedDataPointsCount}</strong> datapoint configurations using AI.
              These have been loaded and will be available in the Review step.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatapointDiscoveryStep;
