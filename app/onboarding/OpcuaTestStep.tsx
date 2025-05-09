// components/onboarding/OpcuaTestStep.tsx
'use client';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, Loader2, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { useOnboarding } from './OnboardingContext';

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failed';

interface EndpointTestResult {
  endpoint: string;
  status: ConnectionStatus;
  message?: string;
}

export default function OpcuaTestStep() {
  const { onboardingData, nextStep } = useOnboarding();
  const [testResults, setTestResults] = useState<EndpointTestResult[]>([]);
  
  const endpointsToTest = useMemo(() => {
    const offlineUrl = onboardingData.opcUaEndpointOffline ? `opc.tcp://${onboardingData.opcUaEndpointOffline}` : null;
    const onlineUrl = onboardingData.opcUaEndpointOnline ? `opc.tcp://${onboardingData.opcUaEndpointOnline}` : null;
    
    const endpoints = [];
    if (offlineUrl) {
      endpoints.push({ name: "Offline", url: offlineUrl });
    }
    if (onlineUrl) {
      endpoints.push({ name: "Online",  url: onlineUrl });
    }
    return endpoints;
  }, [onboardingData.opcUaEndpointOffline, onboardingData.opcUaEndpointOnline]);

  const handleTestConnection = async (endpointName: string, endpointUrl: string) => {
    setTestResults(prev => prev.map(r => r.endpoint === endpointUrl ? { ...r, status: 'testing', message: undefined } : r));
    
    try {
      // Backend /api/opcua/status only has GET and ignores query params.
      // The specific endpointUrl in the query is for informational/logging purposes if desired,
      // but the backend's response is based on its global connection state.
      const testApiUrl = `/api/opcua/status?testedClientSideEndpoint=${encodeURIComponent(endpointUrl)}`;
      
      const response = await fetch(testApiUrl, { 
        method: 'GET',
      });
      
      if (!response.ok) {
        let errorPayload: { message: string, error?: string } = { message: `API Error: ${response.status} ${response.statusText}` };
        const errorText = await response.text(); // Read body once as text
        try {
          const errorJson = JSON.parse(errorText); // Try to parse text as JSON
          if (errorJson.error || errorJson.message) { // Prefer structured error
            errorPayload = errorJson;
          } else if (errorText) {
            errorPayload.message += `. Details: ${errorText}`;
          }
        } catch (e) {
          if (errorText) { // If not JSON, use text
            errorPayload.message += `. Details: ${errorText}`;
          }
        }
        throw new Error(errorPayload.error || errorPayload.message || `Request to ${testApiUrl} failed with status ${response.status}`);
      }

      // Expect response: { connectionStatus: "offline" | "online" | "disconnected" }
      const result = await response.json(); 

      if (!result || typeof result.connectionStatus === 'undefined') {
        throw new Error('Invalid response format from server. Expected { connectionStatus: string }.');
      }

      const backendStatus = result.connectionStatus;
      let isSuccessForThisTest = false;
      let uiMessage = "";
      let toastMessage = "";

      if (backendStatus === "disconnected") {
        isSuccessForThisTest = false;
        uiMessage = `Server reports: No OPC UA connection to its configured endpoints.`;
        toastMessage = `Test for ${endpointName}: Server is disconnected.`;
      } else if (endpointName === "Offline") {
        if (backendStatus === "offline") {
          isSuccessForThisTest = true;
          uiMessage = `Server confirmed connection to its configured OFFLINE endpoint.`;
        } else { // backendStatus must be "online"
          isSuccessForThisTest = false;
          uiMessage = `Server is connected to its ONLINE endpoint. Test for specific Offline endpoint connection was not confirmed this way.`;
        }
        toastMessage = `Offline Test: ${uiMessage}`;
      } else if (endpointName === "Online") {
        if (backendStatus === "online") {
          isSuccessForThisTest = true;
          uiMessage = `Server confirmed connection to its configured ONLINE endpoint.`;
        } else { // backendStatus must be "offline"
          isSuccessForThisTest = false;
          uiMessage = `Server is connected to its OFFLINE endpoint. Test for specific Online endpoint connection was not confirmed this way.`;
        }
        toastMessage = `Online Test: ${uiMessage}`;
      } else {
        // Should not be reached given backend enum for connectionStatus
        isSuccessForThisTest = false;
        uiMessage = `Received unexpected backend status: '${backendStatus}'.`;
        toastMessage = uiMessage;
      }
      
      setTestResults(prev => prev.map(r => r.endpoint === endpointUrl ? { 
        ...r, 
        status: isSuccessForThisTest ? 'success' : 'failed', 
        message: uiMessage 
      } : r));

      if (isSuccessForThisTest) {
        toast.success(toastMessage);
      } else {
        // Using toast.error for clear failure, toast.warning could be used if interpretation is more nuanced
        toast.error(toastMessage);
      }

    } catch (error: any) { // Catches network errors and errors thrown above
      const errorMessage = error.message || `Failed to test connection for ${endpointName}. An unknown error occurred.`;
      setTestResults(prev => prev.map(r => r.endpoint === endpointUrl ? { ...r, status: 'failed', message: errorMessage } : r));
      toast.error(errorMessage);
    }
  };

  React.useEffect(() => {
    setTestResults(
      endpointsToTest.map(ep => ({ endpoint: ep.url, status: 'idle' }))
    );
  }, [endpointsToTest]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Test OPC UA Connections (Optional)</h2>
      <p className="text-muted-foreground">
        Verify connectivity. This test checks the backend's global OPC UA connection status. 
        The backend attempts to connect to its pre-configured Offline endpoint, then its Online endpoint.
        The result reflects which of these the backend is currently connected to.
      </p>
      
      {endpointsToTest.length === 0 && (
          <p className="text-muted-foreground text-center py-4">No OPC UA endpoints configured in the previous step.</p>
      )}

      <div className="space-y-4">
        {endpointsToTest.map(({ name, url }) => {
          const result = testResults.find(r => r.endpoint === url);
          
          return (
            <Card key={url}>
              <CardHeader>
                <CardTitle className="text-lg">OPC UA {name} Endpoint</CardTitle>
                <CardDescription>{url}</CardDescription>
              </CardHeader>
              <CardContent>
                {result?.status === 'testing' && <Loader2 className="h-5 w-5 animate-spin text-primary mr-2 inline-block" />}
                {result?.status === 'success' && <Wifi className="h-5 w-5 text-green-500 mr-2 inline-block" />}
                {result?.status === 'failed' && <WifiOff className="h-5 w-5 text-red-500 mr-2 inline-block" />}
                <span className={`
                  ${result?.status === 'success' ? 'text-green-600' : ''}
                  ${result?.status === 'failed' ? 'text-red-600' : ''}
                `}>
                  {result?.message || (result?.status === 'idle' ? 'Ready to test.' : '')}
                </span>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleTestConnection(name, url)} 
                  disabled={result?.status === 'testing'}
                  variant={result?.status === 'success' ? 'default' : result?.status === 'failed' ? 'destructive' : 'default'}
                >
                  {result?.status === 'testing' ? 'Testing...' : `Test ${name} (via Global Status)`}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
       <Button variant="outline" onClick={nextStep} className="mt-6 w-full sm:w-auto">
            <SkipForward className="mr-2 h-4 w-4" />
            Skip and Continue
        </Button>
    </div>
  );
}