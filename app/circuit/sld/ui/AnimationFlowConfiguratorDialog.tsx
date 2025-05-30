// app/circuit/sld/ui/AnimationFlowConfiguratorDialog.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect, ComboboxOption } from './SearchableSelect';
import { 
    CustomFlowEdge, DataPoint, 
    AnimationFlowConfig as EdgeAnimationConfig,
    GlobalSLDAnimationSettings,
    DynamicFlowType // Import the new type
} from '@/types/sld'; 
import DataLinkLiveValuePreview from './DataLinkLiveValuePreview';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Info, Repeat2, Globe, RotateCcw, Eye, RadioTower, ArrowRightLeft, Zap, SlidersHorizontal, ArrowRightFromLine, ArrowLeftFromLine, Save, Timer, Gauge, TrendingUp, TrendingDown, Hourglass, HelpCircle, Signal } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"; 
import { useAppStore } from '@/stores/appStore';
import clsx from 'clsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


export interface DialogAnimationFlowConfig extends EdgeAnimationConfig {
  animationType?: 'dynamic_power_flow' | 'constant_unidirectional' | 'none';
  dynamicFlowType?: DynamicFlowType; // Added
  dynamicMagnitudeDataPointId?: string; // Added
  minDynamicDuration?: number;
  maxDynamicDuration?: number;
  dynamicSpeedBaseDivisor?: number;
  minConstantDuration?: number;
  maxConstantDuration?: number;
  globallyInvertDefaultDynamicFlowLogic?: boolean;
}

export interface DialogGlobalAnimationSettings extends DialogAnimationFlowConfig {}


export type AnimationFlowConfiguratorMode = 'single_edge' | 'selected_edges' | 'global';
// Removed FlowDataSourceMode, will use dynamicFlowType directly

const FlowPreview: React.FC<{
    config: Partial<DialogAnimationFlowConfig>; 
    liveValues: { gen?: number | null; usage?: number | null; gridNet?: number | null; magnitude?: number | null; constantActive?: boolean | null };
    globallyInverted?: boolean;
}> = React.memo(({ config, liveValues, globallyInverted }) => {
    let flowValueForSpeed = 0; // Used for magnitude/speed calculation
    let isDynamicFlow = config.animationType === 'dynamic_power_flow';
    let isConstantFlow = config.animationType === 'constant_unidirectional';
    
    let baseDirection: 'normal' | 'reverse' | 'none' = 'none';
    let applyGlobalInvertToPreview = false;

    if (isDynamicFlow) {
        const dynamicType = config.dynamicFlowType ?? 'bidirectional_from_net';
        switch(dynamicType) {
            case 'bidirectional_gen_vs_usage':
                const gen = typeof liveValues.gen === 'number' ? liveValues.gen : 0;
                const use = typeof liveValues.usage === 'number' ? liveValues.usage : 0;
                const netGenUsage = gen - use;
                flowValueForSpeed = Math.abs(netGenUsage);
                if (netGenUsage > 0) baseDirection = 'reverse';
                else if (netGenUsage < 0) baseDirection = 'normal';
                applyGlobalInvertToPreview = true;
                break;
            case 'bidirectional_from_net':
                const gridNet = typeof liveValues.gridNet === 'number' ? liveValues.gridNet : 0;
                flowValueForSpeed = Math.abs(gridNet);
                if (gridNet > 0) baseDirection = 'reverse';
                else if (gridNet < 0) baseDirection = 'normal';
                applyGlobalInvertToPreview = true;
                break;
            case 'unidirectional_export':
                flowValueForSpeed = typeof liveValues.magnitude === 'number' ? Math.abs(liveValues.magnitude) : 0;
                baseDirection = 'reverse'; // Default T->S
                applyGlobalInvertToPreview = false;
                break;
            case 'unidirectional_import':
                flowValueForSpeed = typeof liveValues.magnitude === 'number' ? Math.abs(liveValues.magnitude) : 0;
                baseDirection = 'normal'; // Default S->T
                applyGlobalInvertToPreview = false;
                break;
        }
    } else if (isConstantFlow) {
        baseDirection = config.constantFlowDirection === 'forward' ? 'normal' : config.constantFlowDirection === 'reverse' ? 'reverse' : 'none';
    }
    
    let directionAfterGlobalInvert = baseDirection;
    if (isDynamicFlow && applyGlobalInvertToPreview && globallyInverted && baseDirection !== 'none') {
        directionAfterGlobalInvert = baseDirection === 'normal' ? 'reverse' : 'normal';
    }
  
    let finalDirection = directionAfterGlobalInvert;
    if (isDynamicFlow && config.invertFlowDirection && directionAfterGlobalInvert !== 'none') {
        finalDirection = directionAfterGlobalInvert === 'normal' ? 'reverse' : 'normal';
    } else if (isConstantFlow) { // For constant flow, global invert doesn't apply, only its own direction.
        finalDirection = baseDirection; 
    }

    const isAnimating = (isDynamicFlow && baseDirection !== 'none' && flowValueForSpeed > 0.001) || 
                        (isConstantFlow && baseDirection !== 'none' && (config.constantFlowActivationDataPointId ? liveValues.constantActive === true : true));

    let previewAnimationDuration = '3s'; 
    if (isDynamicFlow && isAnimating) {
        const DYNAMIC_SPEED_MULTIPLIER_PREVIEW = config.speedMultiplier ?? 10;
        const MIN_DURATION_PREVIEW = config.minDynamicDuration ?? 0.5;
        const MAX_DURATION_PREVIEW = config.maxDynamicDuration !== undefined ? Math.min(config.maxDynamicDuration, 5) : 5; 
        const BASE_DIVISOR_PREVIEW = config.dynamicSpeedBaseDivisor ?? 30;
        const BASE_SPEED_ADJUST_PREVIEW = 5; 

        const speedFactorPreview = flowValueForSpeed * DYNAMIC_SPEED_MULTIPLIER_PREVIEW * BASE_SPEED_ADJUST_PREVIEW;
        if (speedFactorPreview > 0.001) {
            const clampedSpeedFactorPreview = Math.max(0.02, Math.min(speedFactorPreview, 200));
            let duration = BASE_DIVISOR_PREVIEW / clampedSpeedFactorPreview;
            duration = Math.max(MIN_DURATION_PREVIEW, Math.min(MAX_DURATION_PREVIEW, duration));
            previewAnimationDuration = `${Number(duration.toFixed(1))}s`;
        } else {
            previewAnimationDuration = `${MAX_DURATION_PREVIEW}s`;
        }
    } else if (isDynamicFlow) { 
        previewAnimationDuration = `${config.maxDynamicDuration ?? 5}s`;
    } else if (isConstantFlow) {
        // ... constant flow preview duration logic (unchanged)
        const speed = config.constantFlowSpeed;
        if (speed === 'slow') previewAnimationDuration = '3s';
        else if (speed === 'medium') previewAnimationDuration = '1.5s';
        else if (speed === 'fast') previewAnimationDuration = '0.7s';
        else if (typeof speed === 'number' && speed > 0) {
            const minConstDurPreview = config.minConstantDuration ?? 0.2;
            const maxConstDurPreview = config.maxConstantDuration !== undefined ? Math.min(config.maxConstantDuration, 5) : 5; 
            previewAnimationDuration = `${Math.max(minConstDurPreview, Math.min(maxConstDurPreview, speed)).toFixed(1)}s`;
        }
    }
    
    return ( 
        <div className="w-full h-10 bg-muted/30 dark:bg-muted/20 rounded-md flex items-center justify-center relative overflow-hidden border shadow-inner p-2">
            <span className="absolute top-1 left-2 text-[10px] text-muted-foreground font-medium">S</span>
            <div className="w-full h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full relative mx-4">
            {isAnimating && finalDirection !== 'none' && (
                <div
                className="absolute top-0 h-full bg-primary rounded-full"
                style={{
                    width: '10px',
                    animationName: finalDirection === 'normal' ? 'flow-preview-bullet-normal' : 'flow-preview-bullet-reverse',
                    animationDuration: previewAnimationDuration, 
                    animationIterationCount: 'infinite',
                    animationTimingFunction: 'linear',
                }}
                />
            )}
            </div>
            <span className="absolute top-1 right-2 text-[10px] text-muted-foreground font-medium">T</span>
            {!isAnimating && <span className="absolute text-[10px] text-muted-foreground font-semibold">No Flow</span>}
            {isConstantFlow && config.constantFlowActivationDataPointId && liveValues.constantActive === false && <span className="absolute text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold">Paused (Activation DP False)</span>}
        </div>
    );
});
FlowPreview.displayName = 'FlowPreview';


interface AnimationFlowConfiguratorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AnimationFlowConfiguratorMode;
  edge: CustomFlowEdge | null; 
  initialGlobalSettings?: DialogGlobalAnimationSettings;
  availableDataPoints: DataPoint[];
  onConfigure: (
    config: DialogAnimationFlowConfig, 
    applyTo: AnimationFlowConfiguratorMode,
    setGlobalInvertFlagValue?: boolean
  ) => void;
}


const AnimationFlowConfiguratorDialog: React.FC<AnimationFlowConfiguratorDialogProps> = ({
  isOpen, onOpenChange, mode, edge, initialGlobalSettings, availableDataPoints, onConfigure,
}) => {
  const { opcUaNodeValues } = useAppStore(state => ({ opcUaNodeValues: state.opcUaNodeValues }));

  const [activeTab, setActiveTab] = useState<'dynamic_power_flow' | 'constant_unidirectional' | 'none'>('dynamic_power_flow');
  
  // Dynamic Flow State
  const [dynamicFlowType, setDynamicFlowType] = useState<DynamicFlowType>('bidirectional_from_net');
  const [generationDp, setGenerationDp] = useState<string | undefined>(undefined);
  const [usageDp, setUsageDp] = useState<string | undefined>(undefined);
  const [gridNetFlowDp, setGridNetFlowDp] = useState<string | undefined>(undefined);
  const [dynamicMagnitudeDp, setDynamicMagnitudeDp] = useState<string | undefined>(undefined); // New
  const [dynamicSpeedMultiplier, setDynamicSpeedMultiplier] = useState<number>(10);
  const [invertDynamicFlow, setInvertDynamicFlow] = useState<boolean>(false);
  const [minDynamicDuration, setMinDynamicDuration] = useState<number>(0.5);
  const [maxDynamicDuration, setMaxDynamicDuration] = useState<number>(60);
  const [dynamicSpeedBaseDivisor, setDynamicSpeedBaseDivisor] = useState<number>(30);

  // Constant Flow State (unchanged)
  const [constantDirection, setConstantDirection] = useState<'forward' | 'reverse'>('forward');
  const [constantSpeed, setConstantSpeed] = useState<string>('medium'); 
  const [constantActivationDp, setConstantActivationDp] = useState<string | undefined>(undefined);
  const [minConstantDuration, setMinConstantDuration] = useState<number>(0.2);
  const [maxConstantDuration, setMaxConstantDuration] = useState<number>(15);
  
  const [globallyInvertAllDynamicDefaultFlowMasterFlag, setGloballyInvertAllDynamicDefaultFlowMasterFlag] = useState<boolean>(false);

  const [initialFormState, setInitialFormState] = 
    useState<Partial<DialogAnimationFlowConfig & { 
        initialActiveTab?: typeof activeTab,
        globalInvertForDialogInitialState?: boolean,
        initialDynamicFlowType?: DynamicFlowType // Changed from initialFlowDataSourceMode
    }>>({});

  const numericDataPointOptions = useMemo((): ComboboxOption[] =>
    Object.values(availableDataPoints)
      .filter(dp => ['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Int64', 'UInt64', 'Byte', 'SByte'].includes(dp.dataType))
      .map(dp => ({ value: dp.id, label: dp.label || dp.name || dp.id }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  [availableDataPoints]);
  
  const booleanDataPointOptions = useMemo((): ComboboxOption[] =>
    Object.values(availableDataPoints)
      .filter(dp => dp.dataType === 'Boolean')
      .map(dp => ({ value: dp.id, label: dp.label || dp.name || dp.id }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  [availableDataPoints]);


  const loadStateFromConfig = useCallback((configToLoad?: EdgeAnimationConfig, globalSettingsForDialogContext?: GlobalSLDAnimationSettings) => {
    const effectiveConfig = mode === 'global' ? globalSettingsForDialogContext : configToLoad;

    let animType = effectiveConfig?.animationType ?? 'none';
    if (!effectiveConfig?.animationType) { // Infer if not explicitly set
        if (effectiveConfig?.dynamicFlowType || effectiveConfig?.generationDataPointId || effectiveConfig?.gridNetFlowDataPointId || effectiveConfig?.dynamicMagnitudeDataPointId) {
            animType = 'dynamic_power_flow';
        } else if (effectiveConfig?.constantFlowDirection) {
            animType = 'constant_unidirectional';
        }
    }
    setActiveTab(animType as typeof activeTab);

    // Determine dynamicFlowType based on available DPs if not explicitly set, default to bidirectional_from_net
    let dft: DynamicFlowType = effectiveConfig?.dynamicFlowType ?? 'bidirectional_from_net';
    if (!effectiveConfig?.dynamicFlowType) { // Infer if not set
        if (effectiveConfig?.generationDataPointId && effectiveConfig?.usageDataPointId) dft = 'bidirectional_gen_vs_usage';
        else if (effectiveConfig?.gridNetFlowDataPointId) dft = 'bidirectional_from_net';
        // Default for export/import would need explicit setting or better inference; for now, prefer bidirectional if old fields exist
    }
    // For global mode, ensure global default dft is respected
    if (mode === 'global' && globalSettingsForDialogContext?.dynamicFlowType) {
      dft = globalSettingsForDialogContext.dynamicFlowType;
    }
    setDynamicFlowType(dft);
    
    setGenerationDp(dft === 'bidirectional_gen_vs_usage' ? effectiveConfig?.generationDataPointId : undefined);
    setUsageDp(dft === 'bidirectional_gen_vs_usage' ? effectiveConfig?.usageDataPointId : undefined);
    setGridNetFlowDp(dft === 'bidirectional_from_net' ? effectiveConfig?.gridNetFlowDataPointId : undefined);
    setDynamicMagnitudeDp(['unidirectional_export', 'unidirectional_import'].includes(dft) ? effectiveConfig?.dynamicMagnitudeDataPointId : undefined);
    
    setDynamicSpeedMultiplier(effectiveConfig?.speedMultiplier ?? 10);
    setInvertDynamicFlow(effectiveConfig?.invertFlowDirection ?? false);
    setMinDynamicDuration(effectiveConfig?.minDynamicDuration ?? 0.5);
    setMaxDynamicDuration(effectiveConfig?.maxDynamicDuration ?? 60);
    setDynamicSpeedBaseDivisor(effectiveConfig?.dynamicSpeedBaseDivisor ?? 30);

    setConstantDirection(effectiveConfig?.constantFlowDirection ?? 'forward');
    const speedValue = effectiveConfig?.constantFlowSpeed ?? 'medium';
    setConstantSpeed(typeof speedValue === 'number' ? String(speedValue) : speedValue as 'slow' | 'medium' | 'fast');
    setConstantActivationDp(effectiveConfig?.constantFlowActivationDataPointId);
    setMinConstantDuration(effectiveConfig?.minConstantDuration ?? 0.2);
    setMaxConstantDuration(effectiveConfig?.maxConstantDuration ?? 15);

    const currentGlobalMasterInvert = globalSettingsForDialogContext?.globallyInvertDefaultDynamicFlowLogic ?? false;
    setGloballyInvertAllDynamicDefaultFlowMasterFlag(currentGlobalMasterInvert);

    setInitialFormState({
        ...(effectiveConfig || {}),
        animationType: animType as any,
        initialActiveTab: animType as any,
        dynamicFlowType: dft,
        initialDynamicFlowType: dft, // Save initial dynamic flow type
        speedMultiplier: effectiveConfig?.speedMultiplier ?? 10,
        minDynamicDuration: effectiveConfig?.minDynamicDuration ?? 0.5,
        maxDynamicDuration: effectiveConfig?.maxDynamicDuration ?? 60,
        dynamicSpeedBaseDivisor: effectiveConfig?.dynamicSpeedBaseDivisor ?? 30,
        minConstantDuration: effectiveConfig?.minConstantDuration ?? 0.2,
        maxConstantDuration: effectiveConfig?.maxConstantDuration ?? 15,
        globalInvertForDialogInitialState: currentGlobalMasterInvert,
    });
  }, [mode]);

  const resetToInitial = useCallback(() => {
    const initialGlobalSettingsForReset = (mode === 'global' || !edge?.data?.animationSettings)
        ? { ...initialFormState, globallyInvertDefaultDynamicFlowLogic: initialFormState.globalInvertForDialogInitialState } as GlobalSLDAnimationSettings
        : initialGlobalSettings;

    loadStateFromConfig(initialFormState as EdgeAnimationConfig, initialGlobalSettingsForReset);
  }, [initialFormState, loadStateFromConfig, mode, edge, initialGlobalSettings]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'global') {
        loadStateFromConfig(initialGlobalSettings, initialGlobalSettings);
      } else if (edge?.data?.animationSettings) {
        loadStateFromConfig(edge.data.animationSettings, initialGlobalSettings);
      } else { 
        loadStateFromConfig(undefined, initialGlobalSettings); 
      }
    } else {
       setActiveTab('dynamic_power_flow'); 
       setDynamicFlowType('bidirectional_from_net');
       setGenerationDp(undefined); setUsageDp(undefined); setGridNetFlowDp(undefined); setDynamicMagnitudeDp(undefined);
       setDynamicSpeedMultiplier(10); setInvertDynamicFlow(false);
       setMinDynamicDuration(0.5); setMaxDynamicDuration(60); setDynamicSpeedBaseDivisor(30);
       setConstantDirection('forward'); setConstantSpeed('medium'); setConstantActivationDp(undefined);
       setMinConstantDuration(0.2); setMaxConstantDuration(15);
       setGloballyInvertAllDynamicDefaultFlowMasterFlag(initialGlobalSettings?.globallyInvertDefaultDynamicFlowLogic ?? false);
       setInitialFormState({});
    }
  }, [isOpen, mode, edge, initialGlobalSettings, loadStateFromConfig]);

  const handleSave = () => {
    let configOutput: DialogAnimationFlowConfig = { animationType: activeTab };

    if (activeTab === 'dynamic_power_flow') {
        configOutput.dynamicFlowType = dynamicFlowType;
        configOutput.speedMultiplier = dynamicSpeedMultiplier;
        configOutput.invertFlowDirection = invertDynamicFlow;
        configOutput.minDynamicDuration = minDynamicDuration;
        configOutput.maxDynamicDuration = maxDynamicDuration;
        configOutput.dynamicSpeedBaseDivisor = dynamicSpeedBaseDivisor;

        configOutput.generationDataPointId = undefined; // Clear all DPs first
        configOutput.usageDataPointId = undefined;
        configOutput.gridNetFlowDataPointId = undefined;
        configOutput.dynamicMagnitudeDataPointId = undefined;

        switch(dynamicFlowType) {
            case 'bidirectional_gen_vs_usage':
                configOutput.generationDataPointId = generationDp;
                configOutput.usageDataPointId = usageDp;
                break;
            case 'bidirectional_from_net':
                configOutput.gridNetFlowDataPointId = gridNetFlowDp;
                break;
            case 'unidirectional_export':
            case 'unidirectional_import':
                configOutput.dynamicMagnitudeDataPointId = dynamicMagnitudeDp;
                break;
        }
    } else if (activeTab === 'constant_unidirectional') {
        // ... constant flow save logic (unchanged)
        configOutput.constantFlowDirection = constantDirection;
        const speedVal = parseFloat(constantSpeed);
        configOutput.constantFlowSpeed = isNaN(speedVal) ? constantSpeed as 'slow'|'medium'|'fast' : speedVal;
        configOutput.constantFlowActivationDataPointId = constantActivationDp;
        configOutput.minConstantDuration = minConstantDuration;
        configOutput.maxConstantDuration = maxConstantDuration;
    }
    
    if (mode === 'global') {
      (configOutput as DialogGlobalAnimationSettings).globallyInvertDefaultDynamicFlowLogic = globallyInvertAllDynamicDefaultFlowMasterFlag;
      onConfigure(configOutput, mode, globallyInvertAllDynamicDefaultFlowMasterFlag);
    } else {
      onConfigure(configOutput, mode); 
    }
    onOpenChange(false);
  };
  
  const isDirty = useMemo(() => {
    if (!initialFormState || Object.keys(initialFormState).length === 0) return false;
    if (activeTab !== initialFormState.initialActiveTab) return true;
    if (dynamicFlowType !== initialFormState.initialDynamicFlowType) return true;

    if (activeTab === 'dynamic_power_flow') {
        if (generationDp !== initialFormState.generationDataPointId) return true;
        if (usageDp !== initialFormState.usageDataPointId) return true;
        if (gridNetFlowDp !== initialFormState.gridNetFlowDataPointId) return true;
        if (dynamicMagnitudeDp !== initialFormState.dynamicMagnitudeDataPointId) return true;
        if (dynamicSpeedMultiplier !== initialFormState.speedMultiplier) return true;
        if (invertDynamicFlow !== initialFormState.invertFlowDirection) return true;
        if (minDynamicDuration !== initialFormState.minDynamicDuration) return true;
        if (maxDynamicDuration !== initialFormState.maxDynamicDuration) return true;
        if (dynamicSpeedBaseDivisor !== initialFormState.dynamicSpeedBaseDivisor) return true;
    } else if (activeTab === 'constant_unidirectional') {
        // ... constant flow dirty check (unchanged)
        if (constantDirection !== initialFormState.constantFlowDirection) return true;
        if (constantSpeed !== initialFormState.constantFlowSpeed) return true; 
        if (constantActivationDp !== initialFormState.constantFlowActivationDataPointId) return true;
        if (minConstantDuration !== initialFormState.minConstantDuration) return true;
        if (maxConstantDuration !== initialFormState.maxConstantDuration) return true;
    }

    if (mode === 'global' && globallyInvertAllDynamicDefaultFlowMasterFlag !== initialFormState.globalInvertForDialogInitialState) {
      return true;
    }
    return false;
  }, [
    activeTab, dynamicFlowType, generationDp, usageDp, gridNetFlowDp, dynamicMagnitudeDp,
    dynamicSpeedMultiplier, invertDynamicFlow, minDynamicDuration, maxDynamicDuration, dynamicSpeedBaseDivisor,
    constantDirection, constantSpeed, constantActivationDp, minConstantDuration, maxConstantDuration,
    globallyInvertAllDynamicDefaultFlowMasterFlag, initialFormState, mode
  ]);

  const isSaveDisabled = useMemo(() => {
    if (mode !== 'global' && activeTab === 'dynamic_power_flow') {
        switch(dynamicFlowType) {
            case 'bidirectional_gen_vs_usage': if (!generationDp || !usageDp) return true; break;
            case 'bidirectional_from_net': if (!gridNetFlowDp) return true; break;
            case 'unidirectional_export':
            case 'unidirectional_import': if (!dynamicMagnitudeDp) return true; break;
        }
    }
    return !isDirty;
  }, [activeTab, dynamicFlowType, generationDp, usageDp, gridNetFlowDp, dynamicMagnitudeDp, mode, isDirty]);
  
  const liveValuesForPreview = {
    gen: generationDp ? opcUaNodeValues[availableDataPoints.find(dp => dp.id === generationDp)?.nodeId ?? ''] as number | undefined : undefined,
    usage: usageDp ? opcUaNodeValues[availableDataPoints.find(dp => dp.id === usageDp)?.nodeId ?? ''] as number | undefined : undefined,
    gridNet: gridNetFlowDp ? opcUaNodeValues[availableDataPoints.find(dp => dp.id === gridNetFlowDp)?.nodeId ?? ''] as number | undefined : undefined,
    magnitude: dynamicMagnitudeDp ? opcUaNodeValues[availableDataPoints.find(dp => dp.id === dynamicMagnitudeDp)?.nodeId ?? ''] as number | undefined : undefined,
    constantActive: constantActivationDp ? opcUaNodeValues[availableDataPoints.find(dp => dp.id === constantActivationDp)?.nodeId ?? ''] as boolean | undefined : null,
  };

  const currentConfigForPreview: Partial<DialogAnimationFlowConfig> = {
      animationType: activeTab,
      dynamicFlowType: dynamicFlowType,
      generationDataPointId: generationDp,
      usageDataPointId: usageDp,
      gridNetFlowDataPointId: gridNetFlowDp,
      dynamicMagnitudeDataPointId: dynamicMagnitudeDp,
      speedMultiplier: dynamicSpeedMultiplier,
      invertFlowDirection: invertDynamicFlow,
      minDynamicDuration: minDynamicDuration,
      maxDynamicDuration: maxDynamicDuration,
      dynamicSpeedBaseDivisor: dynamicSpeedBaseDivisor,
      constantFlowDirection: constantDirection,
      constantFlowSpeed: ['slow', 'medium', 'fast'].includes(constantSpeed) 
          ? constantSpeed as 'slow' | 'medium' | 'fast' 
          : !isNaN(parseFloat(constantSpeed)) ? parseFloat(constantSpeed) : 'medium',
      constantFlowActivationDataPointId: constantActivationDp,
      minConstantDuration: minConstantDuration,
      maxConstantDuration: maxConstantDuration,
  };
  const globalInvertForPreview = mode === 'global' 
    ? globallyInvertAllDynamicDefaultFlowMasterFlag
    : (initialGlobalSettings?.globallyInvertDefaultDynamicFlowLogic ?? false);

  const dynamicFlowTypeHelp: Record<DynamicFlowType, string> = {
    bidirectional_gen_vs_usage: "Direction based on (Generation - Usage). Positive = T→S (Export); Negative = S→T (Import).",
    bidirectional_from_net: "Direction based on Net Flow DP value. Positive = T→S (Export); Negative = S→T (Import). Master Global Invert can flip this interpretation.",
    unidirectional_export: "Flow always Target→Source (Export), speed by Magnitude DP. 'Invert' flips to S→T.",
    unidirectional_import: "Flow always Source→Target (Import), speed by Magnitude DP. 'Invert' flips to T→S."
  };
  
  // UI Structure - key changes will be within <TabsContent value="dynamic_power_flow">
  const title = useMemo(() => {
    if (mode === 'global') return 'Global Animation Flow Settings';
    if (mode === 'selected_edges') return 'Configure Animation Flow for Selected Edges';
    return 'Configure Edge Animation Flow';
  }, [mode]);

  const descriptionText = useMemo(() => {
    if (mode === 'global') return 'Configure default animation settings for all SLD flow edges.';
    if (mode === 'selected_edges') return 'Apply animation configuration to all selected edges.';
    return 'Configure how power flows along this specific edge.';
  }, [mode]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {mode === 'global' ? <Globe size={20} className="text-primary" /> : mode === 'selected_edges' ? <SlidersHorizontal size={20} className="text-primary" /> : <ArrowRightLeft size={20} className="text-primary" />}
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-0.5">
            {descriptionText}
          </DialogDescription>
        </DialogHeader>
        
        {/* ... (selected_edges info box) ... */}
        {mode === 'selected_edges' && (
          <div className="p-2.5 mb-1 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 flex items-start gap-2">
            <Info size={16} className="shrink-0 mt-0.5"/>
            <div>
                Settings applied here will overwrite any existing animation configurations on the 
                selected edges. Individual edge labels or other properties are not affected.
            </div>
          </div>
        )}


        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full pt-2 flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 h-11 shrink-0">
            <TabsTrigger value="dynamic_power_flow" className="text-xs px-2"><Zap size={14} className="mr-1.5"/>Dynamic Power Flow</TabsTrigger>
            <TabsTrigger value="constant_unidirectional" className="text-xs px-2"><RadioTower size={14} className="mr-1.5"/>Constant Unidirectional</TabsTrigger>
            <TabsTrigger value="none" className="text-xs px-2"><Signal size={14} className="mr-1.5" />No Animation</TabsTrigger>
          </TabsList>

        <div className="space-y-4 py-3 flex-grow overflow-y-auto px-1 pr-3 custom-scrollbar mt-2 min-h-[300px]">
          <TabsContent value="dynamic_power_flow" className="mt-0 space-y-4 outline-none">
            {/* MODIFIED: Dynamic Flow Type Selection */}
            <div className="p-3 border rounded-lg bg-card shadow-sm">
                <Label className="text-xs font-semibold text-foreground mb-2.5 block">Dynamic Flow Behavior</Label>
                <RadioGroup 
                    value={dynamicFlowType} 
                    onValueChange={(v) => setDynamicFlowType(v as DynamicFlowType)} 
                    className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
                >
                    <Label htmlFor="dft_gen_usage" className={clsx("flex items-start space-x-2 p-2.5 border rounded-md flex-1 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all cursor-pointer", dynamicFlowType !== 'bidirectional_gen_vs_usage' && "opacity-70 hover:opacity-100")}>
                        <RadioGroupItem value="bidirectional_gen_vs_usage" id="dft_gen_usage" className="mt-0.5 shrink-0" />
                        <div className="grid gap-0.5 leading-none">
                            <span className="text-xs font-medium">Bidirectional (Gen vs. Usage)</span>
                            <span className="text-[11px] text-muted-foreground">Net flow from (Gen - Usage) DPs.</span>
                        </div>
                    </Label>
                    <Label htmlFor="dft_net_flow" className={clsx("flex items-start space-x-2 p-2.5 border rounded-md flex-1 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all cursor-pointer", dynamicFlowType !== 'bidirectional_from_net' && "opacity-70 hover:opacity-100")}>
                        <RadioGroupItem value="bidirectional_from_net" id="dft_net_flow" className="mt-0.5 shrink-0"/>
                        <div className="grid gap-0.5 leading-none">
                            <span className="text-xs font-medium">Bidirectional (Net Flow DP)</span>
                            <span className="text-[11px] text-muted-foreground">Net flow from a single DP.</span>
                        </div>
                    </Label>
                    <Label htmlFor="dft_uni_export" className={clsx("flex items-start space-x-2 p-2.5 border rounded-md flex-1 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all cursor-pointer", dynamicFlowType !== 'unidirectional_export' && "opacity-70 hover:opacity-100")}>
                        <RadioGroupItem value="unidirectional_export" id="dft_uni_export" className="mt-0.5 shrink-0"/>
                        <div className="grid gap-0.5 leading-none">
                            <span className="text-xs font-medium flex items-center gap-1">Unidirectional (Export) <ArrowRightFromLine size={12} className="opacity-70"/></span>
                            <span className="text-[11px] text-muted-foreground">Fixed export direction (T→S default).</span>
                        </div>
                    </Label>
                    <Label htmlFor="dft_uni_import" className={clsx("flex items-start space-x-2 p-2.5 border rounded-md flex-1 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all cursor-pointer", dynamicFlowType !== 'unidirectional_import' && "opacity-70 hover:opacity-100")}>
                        <RadioGroupItem value="unidirectional_import" id="dft_uni_import" className="mt-0.5 shrink-0"/>
                        <div className="grid gap-0.5 leading-none">
                             <span className="text-xs font-medium flex items-center gap-1">Unidirectional (Import) <ArrowLeftFromLine size={12} className="opacity-70"/></span>
                            <span className="text-[11px] text-muted-foreground">Fixed import direction (S→T default).</span>
                        </div>
                    </Label>
                </RadioGroup>
            </div>
            
            {/* Conditional DP Selectors */}
            {dynamicFlowType === 'bidirectional_gen_vs_usage' && (
                <div className="p-3 border rounded-lg bg-card shadow-sm space-y-3 animate-fadeIn">
                    <h4 className="text-xs font-semibold text-foreground">Generation vs. Usage DataPoints</h4>
                    <div>
                        <Label htmlFor="generationDp" className="text-[11px] font-medium text-muted-foreground">Generation DataPoint</Label>
                        <SearchableSelect options={numericDataPointOptions} value={generationDp} onChange={(v) => setGenerationDp(v||undefined)} placeholder="Select Generation DP" />
                        {generationDp && (<div className="mt-1 rounded-md border bg-muted/30 p-1.5 text-xs shadow-inner"><DataLinkLiveValuePreview dataPointId={generationDp} valueMapping={undefined} format={{ type: 'number' }} /></div>)}
                    </div>
                    <div>
                        <Label htmlFor="usageDp" className="text-[11px] font-medium text-muted-foreground">Usage DataPoint</Label>
                        <SearchableSelect options={numericDataPointOptions} value={usageDp} onChange={(v) => setUsageDp(v||undefined)} placeholder="Select Usage DP" />
                        {usageDp && (<div className="mt-1 rounded-md border bg-muted/30 p-1.5 text-xs shadow-inner"><DataLinkLiveValuePreview dataPointId={usageDp} valueMapping={undefined} format={{ type: 'number' }} /></div>)}
                    </div>
                </div>
            )}
            {dynamicFlowType === 'bidirectional_from_net' && (
                <div className="p-3 border rounded-lg bg-card shadow-sm animate-fadeIn">
                    <h4 className="text-xs font-semibold text-foreground">Net Flow DataPoint</h4>
                     <div>
                        <Label htmlFor="gridNetFlowDp" className="text-[11px] font-medium text-muted-foreground">Net Flow DataPoint (value can be positive or negative)</Label>
                        <SearchableSelect options={numericDataPointOptions} value={gridNetFlowDp} onChange={(v) => setGridNetFlowDp(v||undefined)} placeholder="Select Net Flow DP"/>
                        {gridNetFlowDp && (<div className="mt-1 rounded-md border bg-muted/30 p-1.5 text-xs shadow-inner"><DataLinkLiveValuePreview dataPointId={gridNetFlowDp} valueMapping={undefined} format={{ type: 'number' }}/></div>)}
                    </div>
                </div>
            )}
            {(dynamicFlowType === 'unidirectional_export' || dynamicFlowType === 'unidirectional_import') && (
                <div className="p-3 border rounded-lg bg-card shadow-sm animate-fadeIn">
                    <h4 className="text-xs font-semibold text-foreground">Flow Magnitude DataPoint</h4>
                     <div>
                        <Label htmlFor="dynamicMagnitudeDp" className="text-[11px] font-medium text-muted-foreground">Magnitude DataPoint (value should be positive)</Label>
                        <SearchableSelect options={numericDataPointOptions} value={dynamicMagnitudeDp} onChange={(v) => setDynamicMagnitudeDp(v||undefined)} placeholder="Select Magnitude DP"/>
                        {dynamicMagnitudeDp && (<div className="mt-1 rounded-md border bg-muted/30 p-1.5 text-xs shadow-inner"><DataLinkLiveValuePreview dataPointId={dynamicMagnitudeDp} valueMapping={undefined} format={{ type: 'number' }}/></div>)}
                    </div>
                </div>
            )}
            
            {/* Dynamic Flow Logic Info */}
             <div className="text-[11px] text-muted-foreground bg-card p-3 border rounded-lg shadow-sm flex items-start space-x-2">
              <Info size={28} className="shrink-0 text-blue-500 opacity-80"/>
              <div>
                <span className="font-semibold text-foreground/90">Dynamic Flow Logic ({dynamicFlowType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}):</span>
                <p className="mt-1">{dynamicFlowTypeHelp[dynamicFlowType]}</p>
                <p className="mt-0.5">Local 'Invert' option below flips the above described base direction. Master Global Invert only applies to bidirectional types.</p>
              </div>
            </div>

            {/* Speed and Duration Controls (unchanged structure, but context from dynamicFlowType applies) */}
            <div className="p-3 border rounded-lg bg-card shadow-sm space-y-3">
                <h4 className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5"><Gauge size={14}/>Dynamic Flow: Animation Speed & Duration</h4>
                {/* ... Speed Multiplier, Min/Max Duration, Divisor Inputs ... */}
                 <div className="space-y-2">
                    <div>
                        <Label htmlFor="dynamicSpeedMultiplier" className="text-[11px] font-medium text-muted-foreground">Speed Multiplier</Label>
                        <Input 
                            id="dynamicSpeedMultiplier" type="number" value={dynamicSpeedMultiplier} 
                            onChange={(e) => setDynamicSpeedMultiplier(Math.max(0.1, parseFloat(e.target.value)) || 1)} 
                            min={0.1} max={100} step={0.1} className="h-8 text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground/80 pt-0.5">Adjusts animation speed relative to flow magnitude. Default: 10.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div>
                            <Label htmlFor="minDynamicDuration" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><TrendingUp size={12}/>Min Duration (s)</Label>
                            <Input
                                id="minDynamicDuration" type="number" value={minDynamicDuration}
                                onChange={(e) => { const val = parseFloat(e.target.value); setMinDynamicDuration(val >= 0.1 ? val : 0.1); if (maxDynamicDuration < val + 0.1) setMaxDynamicDuration(val + 0.1);}}
                                min={0.1} step={0.1} className="h-8 text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground/80 pt-0.5">Fastest. Default: 0.5s.</p>
                        </div>
                        <div>
                            <Label htmlFor="maxDynamicDuration" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><TrendingDown size={12}/>Max Duration (s)</Label>
                            <Input
                                id="maxDynamicDuration" type="number" value={maxDynamicDuration}
                                onChange={(e) => setMaxDynamicDuration(Math.max(minDynamicDuration + 0.1, parseFloat(e.target.value)) || (minDynamicDuration + 0.1))}
                                min={(minDynamicDuration || 0) + 0.1} step={0.1} className="h-8 text-xs" // ensure min is a number
                            />
                            <p className="text-[11px] text-muted-foreground/80 pt-0.5">Slowest. Default: 60s.</p>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="dynamicSpeedBaseDivisor" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><Hourglass size={12}/>Speed Sensitivity Divisor</Label>
                        <Input
                            id="dynamicSpeedBaseDivisor" type="number" value={dynamicSpeedBaseDivisor}
                            onChange={(e) => setDynamicSpeedBaseDivisor(Math.max(1, parseFloat(e.target.value)) || 1)}
                            min={1} step={1} className="h-8 text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground/80 pt-0.5">Duration ≈ Divisor / (FlowMag * Multiplier). Smaller = faster. Default: 30.</p>
                    </div>
                 </div>
            </div>
            
            {/* Direction Overrides */}
            <div className="p-3 border rounded-lg bg-card shadow-sm space-y-3"> 
                <h4 className="text-xs font-semibold text-foreground">Dynamic Flow: Direction Overrides</h4>
                <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="invertDynamicFlow" checked={invertDynamicFlow} onCheckedChange={(cs) => setInvertDynamicFlow(Boolean(cs.valueOf()))} />
                        <Label htmlFor="invertDynamicFlow" className="text-xs font-normal cursor-pointer flex items-center gap-1.5">
                            <Repeat2 size={14} className="text-blue-500"/>
                            Invert Base Dynamic Flow Direction for {mode === 'global' ? 'GLOBAL DEFAULTS' : mode === 'selected_edges' ? 'SELECTED Edges' : 'THIS Edge'}
                        </Label>
                    </div>
                    <p className="text-[11px] text-muted-foreground/80 pl-6">Flips the base direction (after any Master Global Invert for bidirectional types).</p>
                </div>

                 {mode === 'global' && (
                    <div className="pt-2 mt-2 border-t space-y-0.5">
                        <div className="flex items-center space-x-2">
                             <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Checkbox 
                                            id="globallyInvertAllDynamicDefaultFlowMasterFlag" 
                                            checked={globallyInvertAllDynamicDefaultFlowMasterFlag} 
                                            onCheckedChange={(cs) => setGloballyInvertAllDynamicDefaultFlowMasterFlag(Boolean(cs.valueOf()))} 
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs text-xs">
                                        <p>Applies only to <strong className="font-medium">Bidirectional</strong> dynamic flow types. It flips the interpretation of positive/negative net flow for direction (e.g., if positive usually means export T→S, this makes it S→T).</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Label htmlFor="globallyInvertAllDynamicDefaultFlowMasterFlag" className="text-xs font-normal cursor-pointer flex items-center gap-1.5">
                                <RotateCcw size={14} className="text-purple-500"/>
                                <span className="font-semibold">Master Global Invert (Bidirectional Only):</span> Flip Net Flow Interpretation
                                <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger type="button" onClick={(e)=>e.preventDefault()} className="ml-1"><HelpCircle size={12} className="text-muted-foreground"/></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs"><p>Applies only to Bidirectional dynamic flow types. It flips the interpretation of positive/negative net flow for direction.</p></TooltipContent></Tooltip></TooltipProvider>
                            </Label>
                        </div>
                        <p className="text-[11px] text-muted-foreground/80 pl-6">This master switch inverts the direction derived from positive/negative net values for <strong className="font-medium">bidirectional</strong> dynamic flows. It's applied <strong className="font-medium">before</strong> any edge-specific or global default 'Invert Base Direction' option.</p>
                    </div>
                 )}
            </div>
          </TabsContent>

          {/* ... TabsContent for constant_unidirectional and none (mostly unchanged) ... */}
           <TabsContent value="constant_unidirectional" className="mt-0 space-y-4 outline-none">
             <div className="p-3 border rounded-lg bg-card shadow-sm space-y-3">
                <h4 className="text-xs font-semibold text-foreground">Constant Flow: Direction</h4>
                <RadioGroup value={constantDirection} onValueChange={(v) => setConstantDirection(v as 'forward'|'reverse')} className="flex flex-col sm:flex-row gap-3">
                    <Label htmlFor="c_forward" className="flex items-center space-x-2 p-2.5 border rounded-md flex-1 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all cursor-pointer">
                        <RadioGroupItem value="forward" id="c_forward"/> <span className="text-xs">Forward (Source <span className="font-mono text-xs mx-1">→</span> Target)</span>
                    </Label>
                    <Label htmlFor="c_reverse" className="flex items-center space-x-2 p-2.5 border rounded-md flex-1 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all cursor-pointer">
                        <RadioGroupItem value="reverse" id="c_reverse"/> <span className="text-xs">Reverse (Target <span className="font-mono text-xs mx-1">→</span> Source)</span>
                    </Label>
                </RadioGroup>
             </div>
             <div className="p-3 border rounded-lg bg-card shadow-sm space-y-3">
                <h4 className="text-xs font-semibold text-foreground  mb-1.5 flex items-center gap-1.5"><Timer size={14}/>Constant Flow: Speed & Activation</h4>
                <div>
                    <Label htmlFor="constantSpeedSelect" className="text-[11px] font-medium text-muted-foreground">Animation Speed Presets</Label>
                    <Select value={constantSpeed} onValueChange={setConstantSpeed}>
                        <SelectTrigger id="constantSpeedSelect" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="slow" className="text-xs">Slow (approx. 4s cycle)</SelectItem>
                            <SelectItem value="medium" className="text-xs">Medium (approx. 2s cycle)</SelectItem>
                            <SelectItem value="fast" className="text-xs">Fast (approx. 1s cycle)</SelectItem>
                        </SelectContent>
                    </Select>
                    <Label htmlFor="constantSpeedInput" className="text-[11px] font-medium text-muted-foreground mt-2 block">Custom Speed (Duration in seconds)</Label>
                    <Input
                        id="constantSpeedInput"
                        type="text" 
                        value={constantSpeed}
                        onChange={(e) => setConstantSpeed(e.target.value)}
                        placeholder="e.g., 2.5 (for 2.5s) or 'medium'"
                        className="h-8 text-xs mt-1"
                    />
                     <p className="text-[11px] text-muted-foreground/80 pt-0.5">Select a preset or enter custom duration (s). Range below applies to custom numbers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 mt-2 border-t">
                    <div>
                        <Label htmlFor="minConstantDuration" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><TrendingUp size={12}/>Min Custom Duration (s)</Label>
                        <Input
                            id="minConstantDuration" type="number" value={minConstantDuration}
                            onChange={(e) => { const val = parseFloat(e.target.value); setMinConstantDuration(val >= 0.1 ? val : 0.1); if (maxConstantDuration < val + 0.1) setMaxConstantDuration(val + 0.1); }}
                            min={0.1} step={0.1} className="h-8 text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground/80 pt-0.5">Default: 0.2s.</p>
                    </div>
                    <div>
                        <Label htmlFor="maxConstantDuration" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><TrendingDown size={12}/>Max Custom Duration (s)</Label>
                        <Input
                            id="maxConstantDuration" type="number" value={maxConstantDuration}
                            onChange={(e) => setMaxConstantDuration(Math.max((minConstantDuration || 0) + 0.1, parseFloat(e.target.value)) || ((minConstantDuration||0) + 0.1))}
                            min={(minConstantDuration || 0) + 0.1} step={0.1} className="h-8 text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground/80 pt-0.5">Default: 15s.</p>
                    </div>
                </div>

                <div className="pt-2 mt-2 border-t">
                    <Label htmlFor="constantActivationDp" className="text-[11px] font-medium text-muted-foreground">Activation DataPoint (Optional)</Label>
                    <SearchableSelect options={booleanDataPointOptions} value={constantActivationDp} onChange={(v) => setConstantActivationDp(v||undefined)} placeholder="Select Boolean DP to toggle flow"/>
                    <p className="text-[11px] text-muted-foreground/80 pt-0.5">If set, flow animates only when this DataPoint is true.</p>
                    {constantActivationDp && (<div className="mt-1 rounded-md border bg-muted/30 p-1.5 text-xs shadow-inner"><DataLinkLiveValuePreview dataPointId={constantActivationDp} valueMapping={undefined} format={{ type: 'boolean' }}/></div>)}
                </div>
             </div>
          </TabsContent>

          <TabsContent value="none" className="mt-0 outline-none">
             <div className="p-6 border rounded-lg bg-card shadow-sm text-center">
                <Signal size={24} className="mx-auto text-muted-foreground/70 mb-2" strokeWidth={1.5}/>
                <p className="text-sm font-medium text-foreground">No Animation Selected</p>
                <p className="text-xs text-muted-foreground mt-1">This edge {mode === 'global' ? 'will default to no' : 'will not have any'} dynamic flow animation.</p>
             </div>
          </TabsContent>


          {/* Live Flow Preview - unchanged from previous, uses updated currentConfigForPreview */}
          {activeTab !== 'none' && (
            // Show preview if dynamic and a valid DP set or global, OR if constant
            (activeTab === 'dynamic_power_flow' && (
                (dynamicFlowType === 'bidirectional_gen_vs_usage' && (generationDp || usageDp)) ||
                (dynamicFlowType === 'bidirectional_from_net' && gridNetFlowDp) ||
                (['unidirectional_export', 'unidirectional_import'].includes(dynamicFlowType) && dynamicMagnitudeDp) ||
                mode === 'global' // Show for global dynamic even if DPs aren't picked yet for default config
            )) ||
           (activeTab === 'constant_unidirectional') 
           ) ? (
             <div className="p-3 border rounded-lg bg-background shadow-sm animate-fadeIn mt-4 sticky bottom-0 bg-opacity-80 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5"><Eye size={14} className="text-primary"/>Live Animation Preview</h4>
                 <FlowPreview 
                    config={currentConfigForPreview}
                    liveValues={liveValuesForPreview}
                    globallyInverted={globalInvertForPreview}
                />
                 <p className="text-[10px] text-muted-foreground/70 mt-1 text-center">
                    Preview is illustrative. Direction rules based on configuration.
                 </p>
             </div>
          ) : null}

        </div>
        </Tabs> 

        <DialogFooter className="pt-3 border-t justify-between items-center shrink-0">
            <div>
                <Button variant="outline" size="sm" onClick={resetToInitial} disabled={!isDirty}>
                    <RotateCcw size={14} className="mr-1.5"/> Reset Changes
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost" size="sm">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleSave} disabled={isSaveDisabled} size="sm">
                    <Save size={14} className="mr-1.5"/>
                    {mode === 'global' ? 'Save Global Defaults' : 'Apply Configuration'}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnimationFlowConfiguratorDialog;