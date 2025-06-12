// components/onboarding/ReviewStep.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { useOnboarding } from './OnboardingContext';
import { DataPointConfig } from '@/config/dataPoints';

export default function ReviewStep() {
  const { onboardingData, configuredDataPoints, completeOnboarding } = useOnboarding();

  const downloadConfiguration = () => {
    const configToDownload = {
      ...onboardingData,
      configuredDataPoints: configuredDataPoints, // ensure the latest are included
      onboardingCompleted: true, // Tentatively, actual save is on confirm
      version: "N/A_during_review" // or APP_VERSION from constants
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(configToDownload, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "minigrid_config_review.json";
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Configuration JSON downloaded for review.");
  };


  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Review & Confirm Your Setup</h2>
      <p className="text-muted-foreground">
        Please review all your configured settings below. If everything looks correct,
        click "Confirm & Save Settings" to finalize the setup.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Plant & Application Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Plant Name:</strong> {onboardingData.plantName || 'Not set'}</p>
          <p><strong>Location:</strong> {onboardingData.plantLocation || 'Not set'}</p>
          <p><strong>Type:</strong> {onboardingData.plantType || 'Not set'}</p>
          <p><strong>Capacity:</strong> {onboardingData.plantCapacity || 'Not set'}</p>
          <p><strong>Application Name:</strong> {onboardingData.appName || onboardingData.plantName || 'Not set'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>OPC UA Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Offline Endpoint:</strong> {onboardingData.opcUaEndpointOffline ? `opc.tcp://${onboardingData.opcUaEndpointOffline}`: 'Not set'}</p>
          <p><strong>Online Endpoint:</strong> {onboardingData.opcUaEndpointOnline ? `opc.tcp://${onboardingData.opcUaEndpointOnline}`: 'Not set (Optional)'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Data Points Configuration</CardTitle>
                <CardDescription>
                    Total Data Points: {configuredDataPoints.length}
                </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadConfiguration}>
                <Download className="h-4 w-4 mr-2"/>
                Download Config (JSON)
            </Button>
        </CardHeader>
        <CardContent>
            {configuredDataPoints.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-1 text-xs border p-2 rounded-md">
                    {configuredDataPoints.slice(0, 10).map((dp: DataPointConfig) => ( // Show first 10 as preview
                        (<div key={dp.id} className="flex justify-between items-center p-1 hover:bg-muted/50 rounded">
                          <span>{dp.name} ({dp.id})</span>
                          <span className="text-muted-foreground">{dp.nodeId}</span>
                        </div>)
                    ))}
                    {configuredDataPoints.length > 10 && <p className="text-center text-muted-foreground p-1">...and {configuredDataPoints.length - 10} more.</p>}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">No custom data points configured. Defaults will be used.</p>
            )}
        </CardContent>
      </Card>
      {/* "Confirm & Save Settings" is handled by the global OnboardingNavigation */}
    </div>
  );
}