// components/sld/ui/SLDElementDetailSheet.tsx
import React, { useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Changed from Sheet
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CustomNodeData,
  CustomFlowEdgeData,
  CustomNodeType,
  CustomFlowEdge,
  DataPointLink,
  SLDElementType,
  BaseNodeData, // Assuming BaseNodeData exists and has elementType
} from '@/types/sld';
import { getDataPointValue, formatDisplayValue, applyValueMapping } from '../nodes/nodeUtils';
import { useAppStore } from '@/stores/appStore'; // Import only useAppStore

// Icons for element types (add more as needed)
import {
  Zap, // Generic Power
  MessageSquareText, // TextLabel
  DatabaseZap, // DataLabel
  GitFork, // Contactor, Breaker
  Server, // PLC, Inverter
  PanelTop, // Panel
  Gauge, // Meter
  BatteryCharging, // Battery
  TowerControl, // Grid
  Box, // Load
  Minus, // Busbar (can be improved)
  Cpu, // GenericDevice
  Cable, // Edge/Connection
  Workflow, // Transformer
  Wind, // Generator
  Settings2, // Sensor (or another icon)
  HelpCircle, // Unknown
} from 'lucide-react';

interface SLDElementDetailSheetProps {
  element: CustomNodeType | CustomFlowEdge | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // Prop to handle actions triggered from the dialog
  // The component calling this Dialog will implement the actual OPC UA write
  onPerformAction?: (elementId: string, actionType: string, payload?: any) => void;
}

function isNode(element: any): element is CustomNodeType {
  return element && 'position' in element && 'data' in element && 'id' in element;
}

// Helper to get an icon based on element type
const getElementIcon = (elementType?: SLDElementType | 'Connection'): React.ElementType => {
  switch (elementType) {
    case SLDElementType.TextLabel: return MessageSquareText;
    case SLDElementType.DataLabel: return DatabaseZap;
    case SLDElementType.Inverter: return Server;
    case SLDElementType.Panel: return PanelTop;
    case SLDElementType.Breaker: return GitFork;
    case SLDElementType.Meter: return Gauge;
    case SLDElementType.Battery: return BatteryCharging;
    case SLDElementType.Contactor: return GitFork;
    case SLDElementType.Grid: return TowerControl;
    case SLDElementType.Load: return Box;
    case SLDElementType.Busbar: return Minus;
    case SLDElementType.GenericDevice: return Cpu;
    case SLDElementType.Transformer: return Workflow;
    case SLDElementType.Generator: return Wind;
    case SLDElementType.PLC: return Server;
    case SLDElementType.Sensor: return Settings2;
    case 'Connection': return Cable;
    default: return HelpCircle;
  }
};

const SLDElementDetailSheet: React.FC<SLDElementDetailSheetProps> = ({
  element,
  isOpen,
  onOpenChange,
  onPerformAction,
}) => {
  const realtimeData = useAppStore((state) => state.realtimeData);
  const dataPoints = useAppStore((state) => state.dataPoints);
  // const { sendJsonMessage } = useWebSocket(); // Get the sendJsonMessage for performing actions if needed

  if (!element) return null;

  const elementData = element.data as CustomNodeData | CustomFlowEdgeData;
  const elementType = isNode(element) ? element.data.elementType : 'Connection';
  const IconComponent = getElementIcon(elementType);
  const nodeConfig = isNode(element) ? (element.data as CustomNodeData).config : undefined;

  const getDisplayData = (link: DataPointLink): { name: string; label: string; value: string; unit?: string; rawValue?: any } | null => {
    const dpDefinition = dataPoints[link.dataPointId];
    if (!dpDefinition) return null;

    const rawValue = getDataPointValue(link.dataPointId, realtimeData);
    let valueForDisplay = rawValue;

    if (link.valueMapping) {
      const mapped = applyValueMapping(rawValue, link);
      if (mapped !== undefined && typeof mapped !== 'object' && mapped !== rawValue && mapped !== null) {
        valueForDisplay = mapped;
      }
    }
    
    const formattedValue = formatDisplayValue(valueForDisplay, {
      ...link,
      ...(link.format ?? { type: dpDefinition.dataType as any, suffix: dpDefinition.unit })
    });

    return {
      name: dpDefinition.name || dpDefinition.id, // Fallback to id if name is not present
      label: dpDefinition.label || dpDefinition.name || link.targetProperty || dpDefinition.id, // Best available label
      value: formattedValue,
      unit: dpDefinition.unit,
      rawValue: rawValue,
    };
  };

  const linkedDataInfo = useMemo(() => {
    return elementData?.dataPointLinks
      ?.map(getDisplayData)
      .filter((item): item is Exclude<ReturnType<typeof getDisplayData>, null> => item !== null) ?? [];
  }, [elementData?.dataPointLinks, realtimeData, dataPoints]); // Dependencies are critical for memoization

  const currentStatusForAction = useMemo(() => {
    // Example: Find a specific data point that indicates the main status for control
    // This is highly dependent on your data point naming and configuration
    if (!isNode(element)) return undefined;

    const statusLink = (element.data as BaseNodeData).dataPointLinks?.find(
      link => link.targetProperty === 'status' || // generic status
              (element.data.elementType === SLDElementType.Breaker && link.targetProperty === 'breaker.isOpen') ||
              (element.data.elementType === SLDElementType.Contactor && link.targetProperty === 'contactor.isClosed') // Example property
    );
    if (statusLink) {
      return getDataPointValue(statusLink.dataPointId, realtimeData);
    }
    return undefined;
  }, [element, realtimeData]);


  const handleAction = (actionType: string, payload?: any) => {
    if (onPerformAction) {
      onPerformAction(element.id, actionType, payload);
      // Optionally close the dialog after action
      // onOpenChange(false);
    } else {
      console.warn("onPerformAction prop is not provided to SLDElementDetailSheet for element:", element.id);
    }
  };

  // Define available actions based on element type
  // This should be more dynamic based on element configuration (e.g. `data.config.controlNodeId`)
  const renderActions = () => {
    if (!isNode(element) || !onPerformAction) {
      return <p className="text-xs text-muted-foreground italic">No actions available for this element type or setup.</p>;
    }

    const baseData = element.data as BaseNodeData;
    const controlNodeId = baseData.config?.controlNodeId as string | undefined; // Assuming controlNodeId is in config

    switch (baseData.elementType) {
      case SLDElementType.Breaker:
      case SLDElementType.Contactor: // Grouping similar toggleable devices
        // For a real implementation, you'd check if a controlNodeId is configured for this element
        // and what its current state is (from a linked data point).
        const isCurrentlyClosed = typeof currentStatusForAction === 'boolean' ? currentStatusForAction : (String(currentStatusForAction).toLowerCase() === 'closed' || String(currentStatusForAction) === 'true' || Number(currentStatusForAction) === 1);
        
        // Use specific nodeIds from config or defined control datapoints if available
        const openValue = baseData.config?.openValue ?? false; // Default PLC value for "open"
        const closeValue = baseData.config?.closeValue ?? true; // Default PLC value for "closed"
        
        if (!controlNodeId) {
            return <p className="text-xs text-muted-foreground italic">Control Node ID not configured for this {baseData.elementType}.</p>;
        }

        return (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={isCurrentlyClosed ? "destructive" : "default"}
              size="sm"
              onClick={() => handleAction(isCurrentlyClosed ? 'OPEN' : 'CLOSE', isCurrentlyClosed ? openValue : closeValue)}
            >
              {isCurrentlyClosed ? `Open ${baseData.elementType}` : `Close ${baseData.elementType}`}
            </Button>
             {/* Example: An "Auto/Manual" toggle if applicable for some devices */}
            {baseData.config?.modeControlNodeId && (
                 <Button variant="outline" size="sm" onClick={() => handleAction('TOGGLE_MODE')}>
                    Toggle Auto/Manual
                 </Button>
            )}
          </div>
        );
      
      case SLDElementType.Inverter:
        return (
          <Button size="sm" onClick={() => handleAction('START_INVERTER')}>Start Inverter</Button>
        );

      default:
        return <p className="text-xs text-muted-foreground italic">No specific actions defined for this element type.</p>;
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl flex flex-col max-h-[85vh]">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <IconComponent className="h-7 w-7 text-primary flex-shrink-0" />
            <div>
              <DialogTitle className="text-xl font-semibold">{elementData?.label || 'Element Details'}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Type: <Badge variant="secondary" className="text-xs">{elementType}</Badge>
                <span className="mx-1.5">|</span>
                ID: <span className="font-mono text-xs">{element.id}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-grow px-6 py-4">
          <div className="space-y-6">
            {nodeConfig && Object.keys(nodeConfig).length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base font-medium">Static Configuration</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1.5 pt-0 pb-4">
                  {Object.entries(nodeConfig).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center odd:bg-muted/30 px-2 py-1 rounded-sm">
                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="font-medium text-right">{String(value)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {linkedDataInfo.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base font-medium">Real-time Data</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1.5 pt-0 pb-4">
                  {linkedDataInfo.map((info, index) => (
                    <div key={index} className="flex justify-between items-center odd:bg-muted/30 px-2 py-1 rounded-sm">
                      <span className="text-muted-foreground">{info.label}:</span>
                      <span className="font-medium text-right">{info.value}</span>
                    </div>
                  ))}
                  {linkedDataInfo.length === 0 && <p className="text-xs text-muted-foreground italic py-2">No data points linked to this element.</p>}
                </CardContent>
              </Card>
            )}

            {onPerformAction && ( // Only show Actions section if onPerformAction is provided
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-base font-medium">Available Actions</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 pt-0 pb-4">
                {renderActions()}
              </CardContent>
            </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t flex-shrink-0">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(SLDElementDetailSheet);