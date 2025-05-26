// components/sld/ui/SLDElementDetailSheet.tsx
import React from 'react';
import { Node, Edge } from 'reactflow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Changed from sheet to dialog
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area"; // Added for scrollable content
import { Badge } from "@/components/ui/badge";
import {
  CustomNodeData,
  CustomFlowEdgeData,
  RealTimeData,
  CustomNodeType,
  CustomFlowEdge,
  DataPointLink,
  SLDElementType // Added for future use in controls
} from '@/types/sld';
import { getDataPointValue, formatDisplayValue, applyValueMapping } from '../nodes/nodeUtils'; // Use helpers
import { useAppStore } from '@/stores/appStore';
import { useWebSocket } from '@/hooks/useWebSocketListener'; // Added WebSocket hook
import { toast } from 'sonner'; // Added toast


interface SLDElementControlPopupProps { // Renamed props interface
  element: CustomNodeType | CustomFlowEdge | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function isNode(element: any): element is CustomNodeType {
  return element && 'position' in element && 'data' in element;
}

const SLDElementControlPopup: React.FC<SLDElementControlPopupProps> = ({ // Renamed component
  element,
  isOpen,
  onOpenChange,
}) => {
  const { opcUaNodeValues, dataPoints } = useAppStore(state => ({ // Corrected selector
    opcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));
  const { sendJsonMessage, isConnected: isWebSocketConnected } = useWebSocket(); // Initialized WebSocket

  if (!element) return null;

  const elementData = element.data as CustomNodeData | CustomFlowEdgeData; 
  const elementType = isNode(element) ? element.data.elementType : undefined; // Use elementType for logic
  const elementTypeDisplay = isNode(element) ? element.data.elementType : 'Connection';
  const nodeConfig = isNode(element) ? (element.data as CustomNodeData).config : undefined;

  const getDisplayData = (link: DataPointLink): { label: string; value: string; unit?: string, rawValue?: any } | null => {
    const dpDefinition = dataPoints[link.dataPointId];
    if (!dpDefinition) return null;
    const rawValue = getDataPointValue(link.dataPointId, opcUaNodeValues, dataPoints); // Corrected arguments
    let displayValue = rawValue;
    if (link.valueMapping) {
      const mapped = applyValueMapping(rawValue, link);
      if (mapped !== undefined && typeof mapped !== 'object' && mapped !== rawValue) {
        displayValue = mapped;
      }
    }
    const formattedValue = formatDisplayValue(displayValue, {
      ...link,
      ...(link.format ?? { type: dpDefinition.dataType as any, suffix: dpDefinition.unit })
    });
    return {
      label: dpDefinition.label,
      value: formattedValue,
      unit: dpDefinition.unit,
      rawValue: rawValue,
    };
  };

  const linkedDataInfo = elementData?.dataPointLinks
    ?.map(getDisplayData)
    .filter((item): item is Exclude<ReturnType<typeof getDisplayData>, null> => item !== null) ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]"> {/* Adjusted size, flex-col, max-h */}
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{elementData?.label || 'Element Details'}</DialogTitle>
          <DialogDescription>
             Type: <Badge variant="outline">{elementTypeDisplay}</Badge> (ID: {element.id})
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow p-4"> {/* Scrollable Body */}
          <div className="space-y-4">
            {/* Information Section */}
            <div>
              <h3 className="font-semibold mb-2 text-sm text-primary">Information</h3>
              {nodeConfig && Object.keys(nodeConfig).length > 0 && (
                <div className="mb-3">
                    <h4 className="font-medium mb-1 text-xs text-muted-foreground">Configuration</h4>
                     <div className="text-xs space-y-1 text-muted-foreground bg-muted/50 p-2 rounded-md">
                        {Object.entries(nodeConfig).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                <span>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {linkedDataInfo.length > 0 && (
                 <div className="mb-3">
                     <h4 className="font-medium mb-1 text-xs text-muted-foreground">Real-time Data</h4>
                    <div className="space-y-1 text-xs bg-muted/50 p-2 rounded-md">
                        {linkedDataInfo.map((info, index) => (
                        <div key={index} className="flex justify-between items-center">
                            <span className="text-muted-foreground">{info.label}:</span>
                            <span className="font-medium">{info.value}</span>
                        </div>
                        ))}
                    </div>
                </div>
              )}
              {(Object.keys(nodeConfig || {}).length === 0 && linkedDataInfo.length === 0) && (
                <p className="text-xs text-muted-foreground italic">No configuration or real-time data links for this element.</p>
              )}
              <Separator className="my-4" />
            </div>

            {/* Controls Section */}
            <div>
              <h3 className="font-semibold mb-2 text-sm text-primary">Controls</h3>
              {isNode(element) && (elementType === SLDElementType.Breaker || elementType === SLDElementType.Contactor) ? (
                (() => {
                  const controlNodeId = nodeConfig?.controlNodeId as string | undefined;
                  let currentState: boolean | undefined = undefined; // true for Open/De-energized, false for Closed/Energized
                  let trueActionLabel = "Trip (Open)";
                  let falseActionLabel = "Close";
                  let currentStatusDisplay = "Unknown";

                  if (elementType === SLDElementType.Breaker) {
                    trueActionLabel = "Trip Breaker (Open)";
                    falseActionLabel = "Close Breaker";
                    // Breaker state logic (similar to SLDWidget handleElementClick)
                    const isOpenLink = elementData.dataPointLinks?.find(l => l.targetProperty === 'isOpen');
                    const statusLink = elementData.dataPointLinks?.find(l => l.targetProperty === 'status');
                    if (isOpenLink && dataPoints && dataPoints[isOpenLink.dataPointId] && opcUaNodeValues) { // Check opcUaNodeValues and dataPoints
                      const rawValue = getDataPointValue(isOpenLink.dataPointId, opcUaNodeValues, dataPoints); // Corrected arguments
                      currentState = applyValueMapping(rawValue, isOpenLink) === true;
                    } else if (statusLink && dataPoints && dataPoints[statusLink.dataPointId] && opcUaNodeValues) { // Check opcUaNodeValues and dataPoints
                      const rawValue = getDataPointValue(statusLink.dataPointId, opcUaNodeValues, dataPoints); // Corrected arguments
                      const mappedStatus = String(applyValueMapping(rawValue, statusLink)).toLowerCase();
                      if (mappedStatus === 'open' || mappedStatus === 'tripped') currentState = true;
                      else if (mappedStatus === 'closed') currentState = false;
                    } else if (nodeConfig?.normallyOpen !== undefined) {
                       currentState = !!nodeConfig.normallyOpen; // Fallback to config if no link
                    }
                    currentStatusDisplay = currentState === undefined ? "State Unknown" : currentState ? "Open / Tripped" : "Closed";
                  } else if (elementType === SLDElementType.Contactor) {
                    trueActionLabel = "De-energize Contactor";
                    falseActionLabel = "Energize Contactor";
                    // Contactor state logic
                    const isClosedLink = elementData.dataPointLinks?.find(l => l.targetProperty === 'isClosed'); // More direct
                    const statusLink = elementData.dataPointLinks?.find(l => l.targetProperty === 'status');
                     if (isClosedLink && dataPoints && dataPoints[isClosedLink.dataPointId] && opcUaNodeValues) { // Check opcUaNodeValues and dataPoints
                        const rawValue = getDataPointValue(isClosedLink.dataPointId, opcUaNodeValues, dataPoints); // Corrected arguments
                        const mappedValue = applyValueMapping(rawValue, isClosedLink);
                        currentState = mappedValue === false; // isClosed=true means currentState (isOpen/isDeenergized) is false
                    } else if (statusLink && dataPoints && dataPoints[statusLink.dataPointId] && opcUaNodeValues) { // Check opcUaNodeValues and dataPoints
                      const rawValue = getDataPointValue(statusLink.dataPointId, opcUaNodeValues, dataPoints); // Corrected arguments
                      const mappedStatus = String(applyValueMapping(rawValue, statusLink)).toLowerCase();
                      if (mappedStatus === 'open' || mappedStatus === 'de-energized' || mappedStatus === 'off') currentState = true;
                      else if (mappedStatus === 'closed' || mappedStatus === 'energized' || mappedStatus === 'on') currentState = false;
                    } else if (nodeConfig?.normallyOpen !== undefined) {
                       currentState = !!nodeConfig.normallyOpen; // Fallback
                    }
                    currentStatusDisplay = currentState === undefined ? "State Unknown" : currentState ? "De-energized / Open" : "Energized / Closed";
                  }

                  const handleControlAction = (valueToWrite: boolean) => {
                    if (!controlNodeId) {
                      toast.error("Control Node ID not configured for this element.");
                      return;
                    }
                    if (!isWebSocketConnected) {
                      toast.warning("WebSocket disconnected. Cannot send command.");
                      return;
                    }
                    const writePayload = { 
                      type: 'controlWrite', 
                      payload: { [controlNodeId]: valueToWrite }
                    }; // Format matching WebSocketMessageToServer interface
                    sendJsonMessage(writePayload); // Send the payload directly
                    toast.info(`Attempting to ${valueToWrite ? trueActionLabel : falseActionLabel}...`);
                  };

                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Current State: <span className="font-semibold text-foreground">{currentStatusDisplay}</span></p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          onClick={() => handleControlAction(true)} 
                          disabled={currentState === true || currentState === undefined || !controlNodeId || !isWebSocketConnected}
                          variant="outline"
                        >
                          {trueActionLabel}
                        </Button>
                        <Button 
                          onClick={() => handleControlAction(false)} 
                          disabled={currentState === false || currentState === undefined || !controlNodeId || !isWebSocketConnected}
                        >
                          {falseActionLabel}
                        </Button>
                      </div>
                      {!controlNodeId && <p className="text-xs text-destructive text-center mt-2">Control Node ID not configured.</p>}
                    </div>
                  );
                })()
              ) : (
                <div className="text-center text-muted-foreground text-xs py-4">
                  (No controls available for this element type.)
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t mt-auto"> {/* mt-auto to push footer to bottom */}
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SLDElementControlPopup; // Renamed export