// app/circuit/sld/ui/AnimationFlowConfiguratorDialog.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect, ComboboxOption } from './SearchableSelect'; // Assuming this is correctly implemented
import { 
    CustomFlowEdge, DataPoint, 
    AnimationFlowConfig as EdgeAnimationConfig, // Renaming for clarity within this file
    GlobalSLDAnimationSettings // From types/sld.ts
} from '@/types/sld'; 
import DataLinkLiveValuePreview from './DataLinkLiveValuePreview';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Info, Repeat2, Globe, RotateCcw, Eye, RadioTower, ArrowRightLeft, Zap, SlidersHorizontal, Wind, Signal, Save } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"; 
import { useAppStore } from '@/stores/appStore';
import clsx from 'clsx';


// Local config type - aligns with AnimationFlowConfig from types/sld.ts but ensures all fields are explicitly listed if needed by dialog logic
export interface DialogAnimationFlowConfig extends EdgeAnimationConfig {
  animationType?: 'dynamic_power_flow' | 'constant_unidirectional' | 'none'; // Discriminator

  // Fields specific to 'constant_unidirectional' are already in EdgeAnimationConfig from types/sld.ts
  // constantFlowDirection?: 'forward' | 'reverse';
  // constantFlowSpeed?: 'slow' | 'medium' | 'fast' | number; 
  // constantFlowActivationDataPointId?: string; 
}

// This local type for global settings prop should match what's needed by the dialog
export interface DialogGlobalAnimationSettings extends DialogAnimationFlowConfig {
  globallyInvertDefaultFlowForAllEdges?: boolean; 
  // isEnabled from GlobalSLDAnimationSettings is not directly configured in this dialog.
}


export type AnimationFlowConfiguratorMode = 'single_edge' | 'selected_edges' | 'global';
type FlowDataSourceMode = 'gen_usage' | 'grid_net_flow';

const FlowPreview: React.FC<{
    config: Partial<DialogAnimationFlowConfig>; 
    liveValues: { gen?: number | null; usage?: number | null; gridNet?: number | null; constantActive?: boolean | null };
    globallyInverted?: boolean;
}> = React.memo(({ config, liveValues, globallyInverted }) => {
    let netFlow = 0;
    let isDynamicFlow = config.animationType === 'dynamic_power_flow';
    let isConstantFlow = config.animationType === 'constant_unidirectional';
    
    if (isDynamicFlow) {
        if (config.gridNetFlowDataPointId) {
            netFlow = typeof liveValues.gridNet === 'number' ? liveValues.gridNet : 0;
        } else {
            const gen = typeof liveValues.gen === 'number' ? liveValues.gen : 0;
            const use = typeof liveValues.usage === 'number' ? liveValues.usage : 0;
            netFlow = gen - use;
        }
    }

    let baseDirection: 'normal' | 'reverse' | 'none' = 'none';
    if (isDynamicFlow) {
        if (netFlow > 0) { baseDirection = 'reverse'; } // Default logic: Gen > Usage or Net Export (+) => Reverse (T->S)
        else if (netFlow < 0) { baseDirection = 'normal'; } // Default logic: Gen < Usage or Net Import (-) => Normal (S->T)
    } else if (isConstantFlow) {
        baseDirection = config.constantFlowDirection === 'forward' ? 'normal' : config.constantFlowDirection === 'reverse' ? 'reverse' : 'none';
    }
    
    let directionAfterGlobalInvert = baseDirection;
    if (isDynamicFlow && globallyInverted && baseDirection !== 'none') {
        directionAfterGlobalInvert = baseDirection === 'normal' ? 'reverse' : 'normal';
    }
  
    let finalDirection = directionAfterGlobalInvert;
    if (isDynamicFlow && config.invertFlowDirection && directionAfterGlobalInvert !== 'none') {
        finalDirection = directionAfterGlobalInvert === 'normal' ? 'reverse' : 'normal';
    } else if (isConstantFlow) {
        finalDirection = baseDirection; 
    }

    const isAnimating = (isDynamicFlow && baseDirection !== 'none') || 
                        (isConstantFlow && baseDirection !== 'none' && (config.constantFlowActivationDataPointId ? liveValues.constantActive === true : true));

    let previewAnimationDuration = '3s'; 
    if (isDynamicFlow && isAnimating && Math.abs(netFlow) > 0) {
        const magnitude = Math.abs(netFlow);
        const safeMultiplier = Math.max(0.1, config.speedMultiplier ?? 1);
        const calculatedDuration = 2 / (Math.log10(Math.max(1,magnitude)) * safeMultiplier + 1);
        previewAnimationDuration = `${Math.max(0.5, Math.min(3, Number(calculatedDuration.toFixed(1))))}s`;
    } else if (isConstantFlow) {
        if (config.constantFlowSpeed === 'slow') previewAnimationDuration = '3s';
        else if (config.constantFlowSpeed === 'medium') previewAnimationDuration = '1.5s';
        else if (config.constantFlowSpeed === 'fast') previewAnimationDuration = '0.7s';
        else if (typeof config.constantFlowSpeed === 'number' && config.constantFlowSpeed > 0) previewAnimationDuration = `${config.constantFlowSpeed}s`;
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
    setGlobalInvertFlag?: boolean 
  ) => void;
}


const AnimationFlowConfiguratorDialog: React.FC<AnimationFlowConfiguratorDialogProps> = ({
  isOpen, onOpenChange, mode, edge, initialGlobalSettings, availableDataPoints, onConfigure,
}) => {
  const { opcUaNodeValues } = useAppStore(state => ({ opcUaNodeValues: state.opcUaNodeValues }));

  const [activeTab, setActiveTab] = useState<'dynamic_power_flow' | 'constant_unidirectional' | 'none'>('dynamic_power_flow');
  
  const [flowDataSourceMode, setFlowDataSourceMode] = useState<FlowDataSourceMode>('gen_usage');
  const [generationDp, setGenerationDp] = useState<string | undefined>(undefined);
  const [usageDp, setUsageDp] = useState<string | undefined>(undefined);
  const [gridNetFlowDp, setGridNetFlowDp] = useState<string | undefined>(undefined);
  const [dynamicSpeedMultiplier, setDynamicSpeedMultiplier] = useState<number>(1);
  const [invertDynamicFlow, setInvertDynamicFlow] = useState<boolean>(false);

  const [constantDirection, setConstantDirection] = useState<'forward' | 'reverse'>('forward');
  const [constantSpeed, setConstantSpeed] = useState<string>('medium'); 
  const [constantActivationDp, setConstantActivationDp] = useState<string | undefined>(undefined);
  
  const [globallyInvertAllDynamicDefaultFlow, setGloballyInvertAllDynamicDefaultFlow] = useState<boolean>(false);

  const [initialFormState, setInitialFormState] = 
    useState<Partial<DialogAnimationFlowConfig & { 
        initialActiveTab?: typeof activeTab, // To track tab changes
        globalInvertForDialog?: boolean,      // To track master invert flag changes (for global mode)
        initialFlowDataSourceMode?: FlowDataSourceMode // To track dynamic flow mode changes
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


  const loadStateFromConfig = useCallback((config?: DialogAnimationFlowConfig, globalSettingsForDialog?: DialogGlobalAnimationSettings) => {
    const effectiveConfig = mode === 'global' ? globalSettingsForDialog : config;

    let animType = effectiveConfig?.animationType;
    if (!animType) { // Infer type if not explicitly set
        if (effectiveConfig?.generationDataPointId || effectiveConfig?.usageDataPointId || effectiveConfig?.gridNetFlowDataPointId) {
            animType = 'dynamic_power_flow';
        } else if (effectiveConfig?.constantFlowDirection) {
            animType = 'constant_unidirectional';
        } else {
            animType = 'none';
        }
    }
    setActiveTab(animType);

    let fdsMode: FlowDataSourceMode = 'gen_usage';
    if (effectiveConfig?.gridNetFlowDataPointId) fdsMode = 'grid_net_flow';
    else if (effectiveConfig?.generationDataPointId || effectiveConfig?.usageDataPointId) fdsMode = 'gen_usage';
    // For global mode, respect potentially pre-filled choice from global settings
    if (mode === 'global' && globalSettingsForDialog?.gridNetFlowDataPointId) fdsMode = 'grid_net_flow';
    
    setFlowDataSourceMode(fdsMode);
    setGenerationDp(fdsMode === 'gen_usage' ? effectiveConfig?.generationDataPointId : undefined);
    setUsageDp(fdsMode === 'gen_usage' ? effectiveConfig?.usageDataPointId : undefined);
    setGridNetFlowDp(fdsMode === 'grid_net_flow' ? effectiveConfig?.gridNetFlowDataPointId : undefined);
    setDynamicSpeedMultiplier(effectiveConfig?.speedMultiplier ?? 1);
    setInvertDynamicFlow(effectiveConfig?.invertFlowDirection ?? false);

    setConstantDirection(effectiveConfig?.constantFlowDirection ?? 'forward');
    
    // Handle constantFlowSpeed correctly by preserving its type
    const speedValue = effectiveConfig?.constantFlowSpeed ?? 'medium';
    setConstantSpeed(typeof speedValue === 'number' ? String(speedValue) : speedValue as 'slow' | 'medium' | 'fast');
    
    setConstantActivationDp(effectiveConfig?.constantFlowActivationDataPointId);

    const currentGlobalMasterInvert = globalSettingsForDialog?.globallyInvertDefaultFlowForAllEdges ?? false;
    setGloballyInvertAllDynamicDefaultFlow(currentGlobalMasterInvert);

    setInitialFormState({
        animationType: animType,
        initialActiveTab: animType,
        initialFlowDataSourceMode: fdsMode,
        generationDataPointId: effectiveConfig?.generationDataPointId,
        usageDataPointId: effectiveConfig?.usageDataPointId,
        gridNetFlowDataPointId: effectiveConfig?.gridNetFlowDataPointId,
        speedMultiplier: effectiveConfig?.speedMultiplier ?? 1,
        invertFlowDirection: effectiveConfig?.invertFlowDirection ?? false,
        constantFlowDirection: effectiveConfig?.constantFlowDirection ?? 'forward',
        constantFlowSpeed: effectiveConfig?.constantFlowSpeed ?? 'medium',
        constantFlowActivationDataPointId: effectiveConfig?.constantFlowActivationDataPointId,
        globalInvertForDialog: currentGlobalMasterInvert,
    });

  }, [mode]);

  const resetToInitial = useCallback(() => {
    const initialGlobalSettingsForReset = mode === 'global' 
        ? { ...initialFormState, globallyInvertDefaultFlowForAllEdges: initialFormState.globalInvertForDialog } as DialogGlobalAnimationSettings
        : initialGlobalSettings;
    loadStateFromConfig(initialFormState as DialogAnimationFlowConfig, initialGlobalSettingsForReset);
  }, [initialFormState, loadStateFromConfig, mode, initialGlobalSettings]);


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
       setFlowDataSourceMode('gen_usage');
       setGenerationDp(undefined); setUsageDp(undefined); setGridNetFlowDp(undefined);
       setDynamicSpeedMultiplier(1); setInvertDynamicFlow(false);
       setConstantDirection('forward'); setConstantSpeed('medium'); setConstantActivationDp(undefined);
       setGloballyInvertAllDynamicDefaultFlow(false); // Reset to default expectation for this flag
       setInitialFormState({});
    }
  }, [isOpen, mode, edge, initialGlobalSettings, loadStateFromConfig]);

  const handleSave = () => {
    let configOutput: DialogAnimationFlowConfig = { animationType: activeTab };

    if (activeTab === 'dynamic_power_flow') {
        configOutput.speedMultiplier = dynamicSpeedMultiplier;
        configOutput.invertFlowDirection = invertDynamicFlow;
        if (flowDataSourceMode === 'grid_net_flow') {
            configOutput.gridNetFlowDataPointId = gridNetFlowDp;
            // Clear other DPs
            configOutput.generationDataPointId = undefined;
            configOutput.usageDataPointId = undefined;
        } else {
            configOutput.generationDataPointId = generationDp;
            configOutput.usageDataPointId = usageDp;
            // Clear other DP
            configOutput.gridNetFlowDataPointId = undefined;
        }
    } else if (activeTab === 'constant_unidirectional') {
        configOutput.constantFlowDirection = constantDirection;
        const speedVal = parseFloat(constantSpeed);
        configOutput.constantFlowSpeed = isNaN(speedVal) ? constantSpeed as 'slow'|'medium'|'fast' : speedVal;
        configOutput.constantFlowActivationDataPointId = constantActivationDp;
    }
    
    if (mode === 'global') {
      onConfigure(configOutput, mode, globallyInvertAllDynamicDefaultFlow);
    } else {
      onConfigure(configOutput, mode); 
    }
    onOpenChange(false);
  };
  
  const title = useMemo(() => {
    if (mode === 'global') return "Global Animation Defaults";
    if (mode === 'selected_edges') return "Configure Selected Edges Animation";
    return `Configure Animation: ${edge?.id || 'Edge'}`;
  }, [mode, edge?.id]);

  const descriptionText = useMemo(() => {
    if (mode === 'global') return "Define default animation behavior for all edges that don't have specific overrides. These settings will be stored in the layout's metadata.";
    if (mode === 'selected_edges') return "Apply animation settings to all currently selected edges. Each selected edge will receive its own copy of this configuration.";
    return "Set animation properties for this specific edge. These settings will override global defaults.";
  }, [mode]);


  const isDirty = useMemo(() => {
    if (!initialFormState || Object.keys(initialFormState).length === 0) return false; // Not initialized yet or nothing to compare
    if (activeTab !== initialFormState.initialActiveTab) return true;
    if (flowDataSourceMode !== initialFormState.initialFlowDataSourceMode) return true;

    if (activeTab === 'dynamic_power_flow') {
        if (generationDp !== initialFormState.generationDataPointId) return true;
        if (usageDp !== initialFormState.usageDataPointId) return true;
        if (gridNetFlowDp !== initialFormState.gridNetFlowDataPointId) return true;
        if (dynamicSpeedMultiplier !== initialFormState.speedMultiplier) return true;
        if (invertDynamicFlow !== initialFormState.invertFlowDirection) return true;
    } else if (activeTab === 'constant_unidirectional') {
        if (constantDirection !== initialFormState.constantFlowDirection) return true;
        if (constantSpeed !== initialFormState.constantFlowSpeed) return true;
        if (constantActivationDp !== initialFormState.constantFlowActivationDataPointId) return true;
    }

    if (mode === 'global' && globallyInvertAllDynamicDefaultFlow !== initialFormState.globalInvertForDialog) {
      return true;
    }
    return false;
  }, [
    activeTab, flowDataSourceMode, generationDp, usageDp, gridNetFlowDp, dynamicSpeedMultiplier, invertDynamicFlow,
    constantDirection, constantSpeed, constantActivationDp,
    globallyInvertAllDynamicDefaultFlow, initialFormState, mode
  ]);


  const isSaveDisabled = useMemo(() => {
    if (mode !== 'global') {
        if (activeTab === 'dynamic_power_flow' && (
            (flowDataSourceMode === 'gen_usage' && (!generationDp || !usageDp)) ||
            (flowDataSourceMode === 'grid_net_flow' && !gridNetFlowDp)
        )) return true;
        if (activeTab === 'constant_unidirectional' && !constantDirection) return true; // Needs direction at least
    }
    
    // For global mode, allow save if anything is dirty (changed from initial)
    // For other modes, allow save if valid and dirty
    if (mode === 'global') return !isDirty;
    
    return !isDirty; // For single/selected, allow save if dirty and not invalid (first checks handle invalid)
  }, [activeTab, flowDataSourceMode, generationDp, usageDp, gridNetFlowDp, constantDirection, mode, isDirty]);
  
  const liveValuesForPreview = {
    gen: generationDp ? opcUaNodeValues[availableDataPoints.find(dp => dp.id === generationDp)?.nodeId ?? ''] as number | undefined : undefined,
    usage: usageDp ? opcUaNodeValues[availableDataPoints.find(dp => dp.id === usageDp)?.nodeId ?? ''] as number | undefined : undefined,
    gridNet: gridNetFlowDp ? opcUaNodeValues[availableDataPoints.find(dp => dp.id === gridNetFlowDp)?.nodeId ?? ''] as number | undefined : undefined,
    constantActive: constantActivationDp ? opcUaNodeValues[availableDataPoints.find(dp => dp.id === constantActivationDp)?.nodeId ?? ''] as boolean | undefined : null,
  };

  const currentConfigForPreview: Partial<DialogAnimationFlowConfig> = {
      animationType: activeTab,
      generationDataPointId: generationDp,
      usageDataPointId: usageDp,
      gridNetFlowDataPointId: gridNetFlowDp,
      speedMultiplier: dynamicSpeedMultiplier,
      invertFlowDirection: invertDynamicFlow,
      constantFlowDirection: constantDirection,
      constantFlowSpeed: ['slow', 'medium', 'fast'].includes(constantSpeed) 
          ? constantSpeed as 'slow' | 'medium' | 'fast' 
          : !isNaN(parseFloat(constantSpeed)) ? parseFloat(constantSpeed) : 'medium',
      constantFlowActivationDataPointId: constantActivationDp,
  };

  const globalInvertForPreview = mode === 'global' ? globallyInvertAllDynamicDefaultFlow : (initialGlobalSettings?.globallyInvertDefaultFlowForAllEdges ?? false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {mode === 'global' ? <Globe size={20} className="text-primary" /> : mode === 'selected_edges' ? <SlidersHorizontal size={20} className="text-primary" /> : <ArrowRightLeft size={20} className="text-primary" />}
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-0.5">
            {descriptionText}
          </DialogDescription>
        </DialogHeader>
        
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
            <TabsTrigger value="constant_unidirectional" className="text-xs px-2"><Signal size={14} className="mr-1.5"/>Constant Unidirectional</TabsTrigger>
            <TabsTrigger value="none" className="text-xs px-2">No Animation</TabsTrigger>
          </TabsList>

        <div className="space-y-4 py-3 flex-grow overflow-y-auto px-1 pr-3 custom-scrollbar mt-2 min-h-[200px]">
          <TabsContent value="dynamic_power_flow" className="mt-0 space-y-4 outline-none">
            <div className="p-3 border rounded-lg bg-card shadow-sm">
                <Label className="text-xs font-semibold text-foreground mb-2.5 block">Dynamic Flow: Data Source</Label>
                <RadioGroup value={flowDataSourceMode} onValueChange={(v) => setFlowDataSourceMode(v as FlowDataSourceMode)} className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <Label htmlFor="mode_gen_usage_dyn" className={clsx("flex items-start space-x-2 p-2.5 border rounded-md flex-1 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all cursor-pointer", flowDataSourceMode !== 'gen_usage' && "opacity-70 hover:opacity-100")}>
                        <RadioGroupItem value="gen_usage" id="mode_gen_usage_dyn" className="mt-0.5 shrink-0" />
                        <div className="grid gap-0.5 leading-none">
                            <span className="text-xs font-medium">Generation vs. Usage DPs</span>
                            <span className="text-[11px] text-muted-foreground">Supply vs. consumption values. Flow calculated from Gen - Usage.</span>
                        </div>
                    </Label>
                    <Label htmlFor="mode_grid_net_flow_dyn" className={clsx("flex items-start space-x-2 p-2.5 border rounded-md flex-1 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all cursor-pointer", flowDataSourceMode !== 'grid_net_flow' && "opacity-70 hover:opacity-100")}>
                        <RadioGroupItem value="grid_net_flow" id="mode_grid_net_flow_dyn" className="mt-0.5 shrink-0"/>
                        <div className="grid gap-0.5 leading-none">
                            <span className="text-xs font-medium">Single Net Flow DP</span>
                            <span className="text-[11px] text-muted-foreground">e.g., Grid Meter: Positive for export (T→S), Negative for import (S→T).</span>
                        </div>
                    </Label>
                </RadioGroup>
            </div>
            
            {flowDataSourceMode === 'gen_usage' && (
                <div className="p-3 border rounded-lg bg-card shadow-sm space-y-3 animate-fadeIn">
                    <h4 className="text-xs font-semibold text-foreground">Generation vs. Usage DataPoints</h4>
                    <div>
                        <Label htmlFor="generationDp" className="text-[11px] font-medium text-muted-foreground">Generation DataPoint</Label>
                        <SearchableSelect options={numericDataPointOptions} value={generationDp} onChange={(v) => setGenerationDp(v||undefined)} placeholder="Select Generation DP" searchPlaceholder="Search numeric DPs..." notFoundText="No numeric points."/>
                        {generationDp && (<div className="mt-1 rounded-md border bg-muted/30 p-1.5 text-xs shadow-inner"><DataLinkLiveValuePreview dataPointId={generationDp} format={{ type: 'number' }} valueMapping={undefined}/></div>)}
                    </div>
                    <div>
                        <Label htmlFor="usageDp" className="text-[11px] font-medium text-muted-foreground">Usage DataPoint</Label>
                        <SearchableSelect options={numericDataPointOptions} value={usageDp} onChange={(v) => setUsageDp(v||undefined)} placeholder="Select Usage DP" searchPlaceholder="Search numeric DPs..." notFoundText="No numeric points."/>
                        {usageDp && (<div className="mt-1 rounded-md border bg-muted/30 p-1.5 text-xs shadow-inner"><DataLinkLiveValuePreview dataPointId={usageDp} format={{ type: 'number' }} valueMapping={undefined}/></div>)}
                    </div>
                </div>
            )}
            {flowDataSourceMode === 'grid_net_flow' && (
                <div className="p-3 border rounded-lg bg-card shadow-sm animate-fadeIn">
                    <h4 className="text-xs font-semibold text-foreground">Single Net Flow DataPoint</h4>
                     <div>
                        <Label htmlFor="gridNetFlowDp" className="text-[11px] font-medium text-muted-foreground">Net Flow DataPoint</Label>
                        <SearchableSelect options={numericDataPointOptions} value={gridNetFlowDp} onChange={(v) => setGridNetFlowDp(v||undefined)} placeholder="Select Net Flow DP" searchPlaceholder="Search numeric DPs..." notFoundText="No numeric points."/>
                        {gridNetFlowDp && (<div className="mt-1 rounded-md border bg-muted/30 p-1.5 text-xs shadow-inner"><DataLinkLiveValuePreview dataPointId={gridNetFlowDp} format={{ type: 'number' }} valueMapping={undefined}/></div>)}
                    </div>
                </div>
            )}

            <div className="text-[11px] text-muted-foreground bg-card p-3 border rounded-lg shadow-sm flex items-start space-x-2">
              <Info size={28} className="shrink-0 text-blue-500 opacity-80"/>
              <div>
                <span className="font-semibold text-foreground/90">Default Dynamic Flow Logic:</span>
                <ul className="list-disc pl-3.5 mt-1 space-y-0.5">
                    <li><strong className="font-medium">Gen vs. Usage:</strong> Flow direction is Target → Source if (Gen - Usage) {'>'} 0 (i.e. export/surplus). Otherwise Source → Target.</li>
                    <li><strong className="font-medium">Single Net Flow:</strong> Flow direction is Target → Source if DP value {'>'} 0 (i.e. export/grid feed-in). Otherwise Source → Target.</li>
                </ul>
                This base direction can be flipped by "Invert" options below.
              </div>
            </div>

            <div className="p-3 border rounded-lg bg-card shadow-sm space-y-3"> 
                <h4 className="text-xs font-semibold text-foreground">Dynamic Flow: Direction Overrides</h4>
                 <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="invertDynamicFlow" checked={invertDynamicFlow} onCheckedChange={(cs) => setInvertDynamicFlow(Boolean(cs.valueOf()))} />
                        <Label htmlFor="invertDynamicFlow" className="text-xs font-normal cursor-pointer flex items-center gap-1.5">
                            <Repeat2 size={14} className="text-blue-500"/>
                            Invert Dynamic Flow Direction for {mode === 'global' ? 'GLOBAL DEFAULTS' : mode === 'selected_edges' ? 'SELECTED Edges' : 'THIS Edge'}
                        </Label>
                    </div>
                    <p className="text-[11px] text-muted-foreground/80 pl-6">Flips calculated direction (after any Global Master Invert) for this specific configuration.</p>
                </div>

                 {mode === 'global' && (
                    <div className="pt-2 mt-2 border-t space-y-0.5">
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="globallyInvertAllDynamicDefaultFlow" 
                                checked={globallyInvertAllDynamicDefaultFlow} 
                                onCheckedChange={(cs) => setGloballyInvertAllDynamicDefaultFlow(Boolean(cs.valueOf()))} 
                            />
                            <Label htmlFor="globallyInvertAllDynamicDefaultFlow" className="text-xs font-normal cursor-pointer flex items-center gap-1.5">
                                <RotateCcw size={14} className="text-purple-500"/>
                                <span className="font-semibold">Master Global Invert:</span> Flip Default Dynamic Flow for ALL Edges
                            </Label>
                        </div>
                        <p className="text-[11px] text-muted-foreground/80 pl-6">This master switch inverts the base calculated direction for all edges using dynamic flow, <strong className="font-medium">before</strong> any edge-specific or global default inversion is applied. Useful if your system's "positive" means import instead of export.</p>
                    </div>
                 )}
            </div>
            <div className="p-3 border rounded-lg bg-card shadow-sm">
                <h4 className="text-xs font-semibold text-foreground mb-1.5">Dynamic Flow: Animation Speed Multiplier</h4>
                 <div>
                    <Label htmlFor="dynamicSpeedMultiplier" className="text-[11px] font-medium text-muted-foreground">Speed Multiplier</Label>
                    <Input 
                        id="dynamicSpeedMultiplier" 
                        type="number" 
                        value={dynamicSpeedMultiplier} 
                        onChange={(e) => setDynamicSpeedMultiplier(Math.max(0.1, parseFloat(e.target.value)) || 1)} 
                        min={0.1} max={10} step={0.1} 
                        className="h-8 text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground/80 pt-0.5">Adjusts animation speed relative to flow magnitude. Default: 1. Higher = faster for same flow.</p>
                 </div>
            </div>
          </TabsContent>

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
                <h4 className="text-xs font-semibold text-foreground">Constant Flow: Speed & Activation</h4>
                <div>
                    <Label htmlFor="constantSpeed" className="text-[11px] font-medium text-muted-foreground">Animation Speed</Label>
                    <Select value={constantSpeed} onValueChange={setConstantSpeed}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="slow" className="text-xs">Slow (approx. 3s per cycle)</SelectItem>
                            <SelectItem value="medium" className="text-xs">Medium (approx. 1.5s per cycle)</SelectItem>
                            <SelectItem value="fast" className="text-xs">Fast (approx. 0.7s per cycle)</SelectItem>
                            {/* Add ability to input custom number if needed in future:
                                Or have a text input appear if 'custom' is selected. 
                                For now, string value is parsed if it's a number for handleSave.
                                Consider explicitly supporting a number input alongside presets later.
                            */}
                        </SelectContent>
                    </Select>
                    <Input
                        type="text"
                        value={constantSpeed}
                        onChange={(e) => setConstantSpeed(e.target.value)}
                        placeholder="Custom speed (e.g., 2 for 2s, or 'medium')"
                        className="h-8 text-xs mt-1.5"
                    />
                    <p className="text-[11px] text-muted-foreground/80 pt-0.5">Select a preset or enter a custom duration in seconds (e.g., "2.5" for 2.5 seconds).</p>
                </div>
                <div className="pt-2 mt-2 border-t">
                    <Label htmlFor="constantActivationDp" className="text-[11px] font-medium text-muted-foreground">Activation DataPoint (Optional)</Label>
                    <SearchableSelect options={booleanDataPointOptions} value={constantActivationDp} onChange={(v) => setConstantActivationDp(v||undefined)} placeholder="Select Boolean DP to toggle flow" searchPlaceholder="Search boolean DPs..." notFoundText="No boolean points."/>
                    <p className="text-[11px] text-muted-foreground/80 pt-0.5">If set, flow animates only when this DataPoint is true.</p>
                    {constantActivationDp && (<div className="mt-1 rounded-md border bg-muted/30 p-1.5 text-xs shadow-inner"><DataLinkLiveValuePreview dataPointId={constantActivationDp} format={{ type: 'boolean' }} valueMapping={undefined}/></div>)}
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

          {/* Live Flow Preview */}
          {activeTab !== 'none' && (
           (activeTab === 'dynamic_power_flow' && ((flowDataSourceMode === 'gen_usage' && (generationDp || usageDp)) || (flowDataSourceMode === 'grid_net_flow' && gridNetFlowDp))) ||
           (activeTab === 'constant_unidirectional' && constantDirection)
           ) ? (
             <div className="p-3 border rounded-lg bg-card shadow-sm animate-fadeIn mt-4 sticky bottom-0 bg-opacity-80 backdrop-blur-sm"> {/* Make preview sticky */}
                <h4 className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5"><Eye size={14} className="text-primary"/>Live Animation Preview</h4>
                 <FlowPreview 
                    config={currentConfigForPreview}
                    liveValues={liveValuesForPreview}
                    globallyInverted={globalInvertForPreview}
                />
                 <p className="text-[10px] text-muted-foreground/70 mt-1 text-center">
                    Preview is illustrative. Actual on-canvas animation may vary. Based on default Target→Source for positive net flow.
                 </p>
             </div>
          ) : null}

        </div> {/* End Scrollable Area */}
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