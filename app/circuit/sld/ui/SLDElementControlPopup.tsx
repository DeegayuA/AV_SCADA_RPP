// components/sld/ui/SLDElementDetailSheet.tsx
import React, { useState, useMemo, useCallback } from 'react'; // Added useCallback
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  CustomNodeData,
  CustomFlowEdgeData,
  CustomNodeType,
  CustomFlowEdge,
  DataPointLink,
  SLDElementType,
  // Import specific node data types if their config shapes are needed and distinct
  BreakerNodeData,
  ContactorNodeData,
  SwitchNodeData,
} from '@/types/sld';
import { getDataPointValue, formatDisplayValue, applyValueMapping } from '../nodes/nodeUtils';
import { useAppStore } from '@/stores/appStore';
import { useWebSocket } from '@/hooks/useWebSocketListener';
import { toast } from 'sonner';
import {
  Info,
  Settings,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ToggleLeft, ToggleRight, // For general toggle state
  Zap, ZapOff, // General power on/off
  Plug, PlugZap, // Specific to contactor-like things
  ListTree,
  HelpCircle,
  AlertOctagon,
  PowerIcon, // General On/Off toggle icon
} from 'lucide-react';
import clsx from 'clsx';

interface SLDElementControlPopupProps {
  element: CustomNodeType | CustomFlowEdge | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function isNode(element: any): element is CustomNodeType {
  return element && 'position' in element && 'data' in element;
}

// --- Confirmation Dialog Sub-component (no changes from your provided version) ---
interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  consequences: string;
  confirmText?: string;
  actionType?: 'destructive' | 'neutral' | 'constructive';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  consequences,
  confirmText = "Confirm",
  actionType = 'neutral',
}) => {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertOctagon className={clsx("mr-2 h-5 w-5", {
              'text-destructive': actionType === 'destructive',
              'text-primary': actionType === 'constructive', // Changed from text-green-600 to use theme
              'text-yellow-500': actionType === 'neutral',
            })} />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm font-semibold mb-1">Consequences:</p>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-dashed">
            {consequences}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={onConfirm}
            variant={actionType === 'destructive' ? 'destructive' : 'default'}
            className={clsx(actionType === 'constructive' && 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white dark:text-primary-foreground')}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- State Indicator Sub-component (enhanced for clarity) ---
interface StateIndicatorProps {
  label: string;
  stateDisplay: string;
  Icon?: React.ElementType;
  iconColor?: string;
  badgeText?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

const StateIndicator: React.FC<StateIndicatorProps> = ({ label, stateDisplay, Icon, iconColor, badgeText, badgeVariant }) => (
  <div className="flex items-center gap-3 p-3 bg-card border rounded-lg shadow-sm">
    {Icon && <Icon className={clsx("h-7 w-7 flex-shrink-0", iconColor || "text-muted-foreground")} />}
    <div className="flex-grow">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold leading-tight">{stateDisplay}</p>
    </div>
    {badgeText && <Badge variant={badgeVariant || "outline"} className="ml-auto whitespace-nowrap">{badgeText}</Badge>}
  </div>
);


const SLDElementControlPopup: React.FC<SLDElementControlPopupProps> = ({
  element,
  isOpen,
  onOpenChange,
}) => {
  const { opcUaNodeValues, dataPoints } = useAppStore(state => ({
    opcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));
  const { sendJsonMessage, isConnected: isWebSocketConnected } = useWebSocket();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState<{
    actionLabel: string;
    controlNodeId: string;
    valueToWrite: boolean | number | string; // Allow different types for control value
    elementName: string;
    consequences: string;
    actionType: 'destructive' | 'neutral' | 'constructive';
  } | null>(null);


  if (!element) return null;

  const elementData = element.data as CustomNodeData | CustomFlowEdgeData;
  const elementType = isNode(element) ? element.data.elementType : undefined;
  const elementTypeDisplay = isNode(element) ? (element.data.elementType || 'Generic Node') : 'Connection';
  const nodeConfig = isNode(element) ? (element.data as CustomNodeData).config : undefined;

  const getDisplayData = (link: DataPointLink): { label: string; value: string; unit?: string, rawValue?: any } | null => {
    const dpDefinition = dataPoints[link.dataPointId];
    if (!dpDefinition) return null;
    const rawValue = getDataPointValue(link.dataPointId, dataPoints, opcUaNodeValues);
    let displayValue = rawValue; // Start with raw
    // Apply mapping first IF it results in a non-object value (value mappings are for semantic meaning, not formatting usually)
    if (link.valueMapping) {
      const mapped = applyValueMapping(rawValue, link);
      if (mapped !== undefined && typeof mapped !== 'object' && String(mapped) !== String(rawValue)) { // Only use if truly mapped to a different primitive
        displayValue = mapped;
      }
    }
    // Then format the (potentially mapped) displayValue
    const formattedValue = formatDisplayValue(displayValue, {
      ...link.format, // Spread format from link first
      type: link.format?.type || dpDefinition.dataType as any, // Fallback to DP data type
      suffix: link.format?.suffix || dpDefinition.unit, // Fallback to DP unit for suffix
    });
    return {
      label: dpDefinition.label || dpDefinition.name,
      value: formattedValue,
      unit: dpDefinition.unit, // Retain original unit if needed
      rawValue: rawValue,
    };
  };

  const linkedDataInfo = elementData?.dataPointLinks
    ?.map(getDisplayData)
    .filter((item): item is Exclude<ReturnType<typeof getDisplayData>, null> => item !== null) ?? [];
  
  // Helper to interpret booleanish values loosely
  const isValueConsideredTrue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    const valStr = String(value).toLowerCase();
    return valStr === 'true' || valStr === '1' || valStr === 'on' || valStr === 'closed' || valStr === 'energized' || valStr === 'active';
  };

  // Centralized control logic
  const controlConfig = useMemo(() => {
    if (!isNode(element) || !nodeConfig?.controlNodeId) {
      return { isControlAvailable: false, statusLabel: "N/A" };
    }
    const controlNodeId = nodeConfig.controlNodeId as string;
    
    let currentRawStateValue: any;
    let stateDeterminingLink: DataPointLink | undefined;

    // Find the primary link determining the ON/OFF state
    if (elementType === SLDElementType.Breaker) stateDeterminingLink = elementData.dataPointLinks?.find(l => l.targetProperty === 'breaker.isOpen');
    else if (elementType === SLDElementType.Contactor) stateDeterminingLink = elementData.dataPointLinks?.find(l => l.targetProperty === 'contactor.isClosed');
    else if (elementType === SLDElementType.Switch) stateDeterminingLink = elementData.dataPointLinks?.find(l => l.targetProperty === 'switch.isOn'); // Assuming 'switch.isOn'
    // Add other types like Isolator, ATS, Fuse if they have similar boolean state targetProperty
    
    // Fallback to generic 'status' if specific state link not found or no value from it
    if (!stateDeterminingLink || getDataPointValue(stateDeterminingLink.dataPointId, dataPoints, opcUaNodeValues) === undefined) {
        stateDeterminingLink = elementData.dataPointLinks?.find(l => l.targetProperty === 'status');
    }
    
    if (stateDeterminingLink) {
        currentRawStateValue = getDataPointValue(stateDeterminingLink.dataPointId, dataPoints, opcUaNodeValues);
        if(stateDeterminingLink.valueMapping) { // apply mapping if exists for the state determining link
            currentRawStateValue = applyValueMapping(currentRawStateValue, stateDeterminingLink)
        }
    }

    // Interpret the state for UI: Is the device currently "ON" or "CLOSED" or "ENERGIZED"?
    // This interpretation might be inverse for some properties (e.g., breaker.isOpen=true means device is OFF)
    let isEffectivelyOn: boolean | undefined;
    let statusLabel: string = "State Unknown";
    let nextActionLabel: string = "Toggle State";
    let valueToWriteForNextAction: boolean = true; // Default: assume next action is to turn ON
    let actionTypeForNext: ConfirmationDialogProps['actionType'] = 'constructive';

    if (currentRawStateValue !== undefined) {
        if (elementType === SLDElementType.Breaker) {
            isEffectivelyOn = !isValueConsideredTrue(currentRawStateValue); // isOpen=true means OFF
            statusLabel = isEffectivelyOn ? "Closed" : "Open/Tripped";
            nextActionLabel = isEffectivelyOn ? "Trip Breaker" : "Close Breaker";
            valueToWriteForNextAction = isEffectivelyOn; // Write true to 'isOpen' to trip, false to close. Confusing... this value should be the value that represents the 'ON' state.
                                                         // If controlNodeId expects a boolean where 'true' = Closed:
            valueToWriteForNextAction = !isEffectivelyOn; // if currently OFF (isOpen=true), next action is to close (write true if true=closed)
            actionTypeForNext = isEffectivelyOn ? 'destructive' : 'constructive';
        } else if (elementType === SLDElementType.Contactor) {
            isEffectivelyOn = isValueConsideredTrue(currentRawStateValue); // isClosed=true means ON
            statusLabel = isEffectivelyOn ? "Energized/Closed" : "De-energized/Open";
            nextActionLabel = isEffectivelyOn ? "De-energize" : "Energize";
            valueToWriteForNextAction = !isEffectivelyOn;
            actionTypeForNext = isEffectivelyOn ? 'destructive' : 'constructive';
        } else if (elementType === SLDElementType.Switch) { // Example for a generic Switch
            isEffectivelyOn = isValueConsideredTrue(currentRawStateValue); // isOn=true means ON
            statusLabel = isEffectivelyOn ? "ON" : "OFF";
            nextActionLabel = isEffectivelyOn ? "Turn OFF" : "Turn ON";
            valueToWriteForNextAction = !isEffectivelyOn;
            actionTypeForNext = isEffectivelyOn ? 'destructive' : 'constructive';
        } else { // Default for other types if control is enabled
            isEffectivelyOn = isValueConsideredTrue(currentRawStateValue);
            statusLabel = isEffectivelyOn ? "Active" : "Inactive";
            nextActionLabel = isEffectivelyOn ? "Deactivate" : "Activate";
            valueToWriteForNextAction = !isEffectivelyOn;
            actionTypeForNext = isEffectivelyOn ? 'destructive' : 'constructive';
        }
    }

    // Value to write to controlNodeId:
    // This needs careful thought: does the controlNodeId expect true for ON or true for OFF?
    // Assuming controlNodeId expects: true = Energize/Close/ON; false = De-energize/Open/OFF
    // So, `valueToWriteForNextAction` should be the state you *want to achieve*.
    // If currently OFF (isEffectivelyOn = false), then `valueToWriteForNextAction` should be true.
    // If currently ON (isEffectivelyOn = true), then `valueToWriteForNextAction` should be false.
    // The above logic for `valueToWriteForNextAction = !isEffectivelyOn;` should cover this general case.

    return {
      isControlAvailable: true,
      controlNodeId,
      isEffectivelyOn, // true if device is considered ON/Closed/Energized
      statusLabel,
      nextActionLabel,
      valueToWriteForNextAction, // The value to send to achieve the next state
      actionTypeForNext,
    };

  }, [element, elementType, nodeConfig, elementData.dataPointLinks, opcUaNodeValues, dataPoints]);


  const handleToggleAction = () => {
    if (!controlConfig?.isControlAvailable || !controlConfig.controlNodeId || controlConfig.isEffectivelyOn === undefined) {
      toast.error("Cannot determine current state or control node is not configured.");
      return;
    }

    const elementName = elementData?.label || element.id;
    let consequences: string;
    
    if (elementType === SLDElementType.Breaker) {
      consequences = controlConfig.valueToWriteForNextAction // this value is what it will BECOME
        ? `This will attempt to CLOSE the breaker "${elementName}". Downstream circuits will be ENERGIZED.`
        : `This will attempt to TRIP (OPEN) the breaker "${elementName}". Downstream circuits will be DE-ENERGIZED.`;
    } else if (elementType === SLDElementType.Contactor) {
      consequences = controlConfig.valueToWriteForNextAction
        ? `This will attempt to ENERGIZE the contactor "${elementName}", allowing power flow.`
        : `This will attempt to DE-ENERGIZE the contactor "${elementName}", interrupting power flow.`;
    } else if (elementType === SLDElementType.Switch) {
        consequences = controlConfig.valueToWriteForNextAction
        ? `This will attempt to turn ON the switch "${elementName}".`
        : `This will attempt to turn OFF the switch "${elementName}".`;
    }
     else {
      consequences = `This will attempt to ${controlConfig.nextActionLabel.toLowerCase()} the element "${elementName}".`;
    }

    setConfirmationDetails({
      actionLabel: controlConfig.nextActionLabel,
      controlNodeId: controlConfig.controlNodeId,
      valueToWrite: controlConfig.valueToWriteForNextAction,
      elementName,
      consequences,
      actionType: controlConfig.actionTypeForNext,
    });
    setShowConfirmation(true);
  };

  const handleConfirmAndSendAction = () => { /* Unchanged, keep current */
    if (!confirmationDetails) return;
    if (!isWebSocketConnected) {
      toast.warning("WebSocket disconnected. Cannot send command.");
      setShowConfirmation(false); setConfirmationDetails(null); return;
    }
    const writePayload = { type: 'controlWrite', payload: {  [confirmationDetails.controlNodeId]: confirmationDetails.valueToWrite } };
    sendJsonMessage(writePayload);
    toast.info(`Attempting to ${confirmationDetails.actionLabel.toLowerCase()} "${confirmationDetails.elementName}"...`);
    setShowConfirmation(false); setConfirmationDetails(null);
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md md:max-w-lg flex flex-col max-h-[90vh] p-0">
          <DialogHeader className="p-4 sm:p-6 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">{elementData?.label || 'Element Details'}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
              Type: <Badge variant="outline" className="text-xs px-1.5 py-0.5">{elementTypeDisplay}</Badge>
              ID: <Badge variant="outline" className="text-xs font-mono px-1.5 py-0.5">{element.id}</Badge>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-grow overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-5">
              <section aria-labelledby="info-heading">
                <div className="flex items-center mb-2.5">
                  <ListTree className="h-4 w-4 mr-2 text-muted-foreground" />
                  <h3 id="info-heading" className="text-base font-medium text-foreground">Information</h3>
                </div>
                <div className="space-y-2.5 p-3 bg-muted/30 border rounded-md text-xs">
                  {nodeConfig && Object.keys(nodeConfig).length > 0 && (
                    <div className="pb-2 mb-2 border-b border-dashed border-border/50 last:border-b-0 last:mb-0 last:pb-0">
                      <h4 className="font-semibold text-muted-foreground/80 mb-1">CONFIGURATION</h4>
                      <div className="space-y-0.5">
                        {Object.entries(nodeConfig).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="font-mono text-foreground text-right break-all">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {linkedDataInfo.length > 0 && (
                     <div className="pb-2 mb-2 border-b border-dashed border-border/50 last:border-b-0 last:mb-0 last:pb-0">
                      <h4 className="font-semibold text-muted-foreground/80 mb-1">REAL-TIME DATA</h4>
                      <div className="space-y-0.5">
                        {linkedDataInfo.map((info, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-muted-foreground">{info.label}:</span>
                            <span className="font-semibold text-foreground text-right">{info.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(Object.keys(nodeConfig || {}).length === 0 && linkedDataInfo.length === 0) && (
                    <p className="text-xs text-muted-foreground italic text-center py-1.5">No specific configuration or linked data.</p>
                  )}
                </div>
              </section>
              
              {controlConfig && controlConfig.isControlAvailable && (
                <>
                <Separator className="my-5" />
                <section aria-labelledby="controls-heading">
                    <div className="flex items-center mb-2.5">
                    <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
                    <h3 id="controls-heading" className="text-base font-medium text-foreground">Controls</h3>
                    </div>
                    
                    <div className="space-y-3">
                         <StateIndicator 
                            label="Current Status" 
                            stateDisplay={controlConfig.statusLabel}
                            Icon={
                                controlConfig.isEffectivelyOn === undefined ? HelpCircle :
                                controlConfig.isEffectivelyOn ? Zap : ZapOff
                            }
                            iconColor={
                                controlConfig.isEffectivelyOn === undefined ? "text-muted-foreground" :
                                controlConfig.isEffectivelyOn ? "text-green-500" : "text-destructive"
                            }
                            badgeText={
                                controlConfig.isEffectivelyOn === undefined ? "UNKNOWN" :
                                controlConfig.isEffectivelyOn ? "ON / CLOSED" : "OFF / OPEN"
                            }
                            badgeVariant={
                                controlConfig.isEffectivelyOn === undefined ? "outline" :
                                controlConfig.isEffectivelyOn ? "default" : "destructive"
                            }
                        />

                        {!controlConfig.controlNodeId ? (
                        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/30">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>Control Node ID not configured.</span>
                        </div>
                        ) : !isWebSocketConnected ? (
                        <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-2.5 rounded-md border border-yellow-500/30">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>Controls offline: Not connected to server.</span>
                        </div>
                        ) : (
                            <Button
                                onClick={handleToggleAction}
                                disabled={controlConfig.isEffectivelyOn === undefined}
                                variant={controlConfig.actionTypeForNext === 'destructive' ? "destructive" : "outline"}
                                className={clsx("w-full group py-2.5 text-sm", 
                                    controlConfig.actionTypeForNext === 'constructive' && "hover:bg-green-500/10 hover:border-green-500",
                                    controlConfig.actionTypeForNext === 'destructive' && "hover:bg-destructive/10 hover:border-destructive",
                                )}
                            >
                                {controlConfig.isEffectivelyOn === undefined && <PowerIcon className="h-4 w-4 mr-2 opacity-70 group-hover:opacity-100"/>}
                                {controlConfig.actionTypeForNext === 'constructive' && <Zap className="h-4 w-4 mr-2 text-green-600/90 group-hover:text-green-600" />}
                                {controlConfig.actionTypeForNext === 'destructive' && <ZapOff className="h-4 w-4 mr-2 text-destructive/90 group-hover:text-destructive" />}
                                {controlConfig.nextActionLabel}
                            </Button>
                        )}
                    </div>
                </section>
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t mt-auto sticky bottom-0 bg-background z-10">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmationDetails && (
        <ConfirmationDialog
          isOpen={showConfirmation}
          onClose={() => { setShowConfirmation(false); setConfirmationDetails(null); }}
          onConfirm={handleConfirmAndSendAction}
          title={`Confirm: ${confirmationDetails.actionLabel}`}
          description={<>You are about to <span className="font-semibold">{confirmationDetails.actionLabel.toLowerCase()}</span> the element <Badge variant="secondary" className="font-normal">{confirmationDetails.elementName}</Badge>.</>}
          consequences={confirmationDetails.consequences}
          confirmText={`Yes, ${confirmationDetails.actionLabel}`}
          actionType={confirmationDetails.actionType}
        />
      )}
    </>
  );
};

// Custom Badge variant for success if not in theme
// If you add <Badge variant="success">... you might need this in global styles or your badge component theme
// .badge-success { @apply bg-green-100 text-green-800 border-green-200 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700; }

export default SLDElementControlPopup;