// components/sld/ui/SLDInspectorDialog.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge, isEdge as isReactFlowEdge } from 'reactflow'; // Keep Node, Edge
import { Button } from "@/components/ui/button";
// Removed: AnimationFlowConfiguratorDialog, DialogAnimationFlowConfig, AnimationFlowConfiguratorMode
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Added for notes
import { Label } from "@/components/ui/label";
import DataLinkLiveValuePreview from './DataLinkLiveValuePreview';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Trash2, PlusCircle, MinusCircle, X, Info as InfoIconLucide, Sparkles, PencilLine, Link2, Settings2,
    Palmtree, Palette as PaletteIcon, CaseSensitive, AlignLeftIcon, BaselineIcon, Zap as ZapIcon,
    ArrowRight, TestTube2, Layers3Icon, RowsIcon, ColumnsIcon,
    SunIcon, WrenchIcon, InfoIcon, // Added common icons
    LayoutPanelLeft, Building, Activity, FileKey, Sigma, Users, ToggleRight, Cable, Package, Wind, AlertTriangle, MessageSquare, Cog, Edit3, Type, SquareFunction
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox"; // Added for boolean inputs
import {
    CustomNodeData, CustomFlowEdgeData, DataPoint, DataPointLink, SLDElementType, CustomNodeType, CustomFlowEdge,
    TextLabelNodeData, TextNodeStyleConfig, ContactorNodeData, InverterNodeData, InverterType, PanelNodeData, BreakerNodeData,
    MeterNodeData, BatteryNodeData, GridNodeData, LoadNodeData, BusbarNodeData, TransformerNodeData,
    GeneratorNodeData, PLCNodeData, SensorNodeData, GenericDeviceNodeData, IsolatorNodeData, ATSNodeData,
    JunctionBoxNodeData, FuseNodeData, GaugeNodeData, BaseNodeData, SwitchNodeData, SwitchNodeConfig, WindTurbineNodeData, WindInverterNodeData,
    DataLabelNodeData,
    AnimationFlowConfig as EdgeAnimationFlowConfig, GlobalSLDAnimationSettings
} from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ComboboxOption, SearchableSelect } from './SearchableSelect';
import { AVAILABLE_SLD_LAYOUT_IDS } from '@/config/constants';
import { Separator } from '@/components/ui/separator';

// --- START: Target Property Definitions --- (Unchanged from original)
type TargetPropertyValueType = 'string' | 'number' | 'boolean' | 'color' | 'cssDimension' | 'integer' | 'opacity';
interface TargetPropertyDefinition extends ComboboxOption {
    inputHint?: string;
    valueType?: TargetPropertyValueType;
}
const commonTargetProperties: TargetPropertyDefinition[] = [ { value: 'label', label: 'Display Label', description: "Sets the main text label visible on/near the element.", inputHint: "e.g., Main Panel", valueType: 'string' }, { value: 'status', label: 'Device Status (Generic)', description: 'Sets a status string (e.g., "FAULT", "NOMINAL", "OFFLINE"). Drives color/icon in node.', inputHint: "e.g., FAULT, ONLINE", valueType: 'string' }, { value: 'statusText', label: 'Status Text (Descriptive)', description: 'Sets a descriptive text based on data (e.g., "Running", "Tripped", "Offline").', inputHint: "e.g., Generator Running", valueType: 'string' }, { value: 'fillColor', label: 'Fill Color (Background)', description: 'Changes background/fill color. Accepts CSS color strings.', inputHint: "e.g., red, #00FF00, rgba(0,0,255,0.5)", valueType: 'color' }, { value: 'strokeColor', label: 'Stroke/Border Color', description: 'Changes border or line color. Accepts CSS color strings.', inputHint: "e.g., black, #FFFF00", valueType: 'color' }, { value: 'textColor', label: 'Text Color (General)', description: 'Changes color of dynamic text if supported. Accepts CSS color strings.', inputHint: "e.g., white, #333333", valueType: 'color' }, { value: 'visible', label: 'Visibility', description: 'Boolean: true shows the element, false hides it.', inputHint: "true or false", valueType: 'boolean' }, { value: 'opacity', label: 'Opacity', description: 'Numeric (0.0 to 1.0): Sets element opacity.', inputHint: "e.g., 0.7 (0.0-1.0)", valueType: 'number' }, ];

const nodeSpecificTargetProperties: Partial<Record<SLDElementType, TargetPropertyDefinition[]>> = { 
    [SLDElementType.TextLabel]: [ { value: 'text', label: 'Text Content', description: "Sets the text for a TextLabel.", inputHint: "Enter display text", valueType: 'string' }, ], 
    [SLDElementType.DataLabel]: [ { value: 'value', label: 'Data Value', description: "Sets the value to display for a DataLabel.", inputHint: "e.g., 123.45, Active", valueType: 'string' }, ], 
    [SLDElementType.Panel]: [ 
        { value: 'powerOutput', label: 'Panel Power (Display Value)', description: 'Actual power output to be displayed (e.g., "150 W" or numeric value).', inputHint: "e.g., 150 or 150W", valueType: 'string'}, 
        { value: 'panel.powerGeneration', label: 'Panel Generation (Logic Value)', description: 'Numeric data representing raw generation, often used for internal logic/animation intensity (e.g., irradiance equivalent).', inputHint: "e.g., 150 (numeric)", valueType: 'number'}, 
    ], 
    [SLDElementType.Inverter]: [ 
        { value: 'inverter.powerOutput', label: 'Inverter Power Output', description: 'Active power output (numeric, typically kW).', inputHint: "e.g., 5.2 (for 5.2 kW)", valueType: 'number'}, 
        { value: 'temperature', label: 'Inverter Temperature', description: 'Internal temperature (numeric, typically °C).', inputHint: "e.g., 45", valueType: 'number'},
    ], 
    [SLDElementType.Breaker]: [ { value: 'breaker.isOpen', label: 'Breaker Open State', description: 'Boolean: true if breaker is open/tripped, false if closed.', inputHint: "true (open) or false (closed)", valueType: 'boolean'}, ], 
    [SLDElementType.Contactor]: [ { value: 'contactor.isClosed', label: 'Contactor Closed State', description: 'Boolean: true if contactor is closed/energized, false if open/de-energized.', inputHint: "true (closed) or false (open)", valueType: 'boolean'}, ], 
    [SLDElementType.Battery]: [
        { value: 'soc', label: 'Battery SOC (%)', description: "State of Charge percentage (0-100).", inputHint: "e.g., 85", valueType: 'number'},
        { value: 'powerFlow', label: 'Battery Power Flow (W/kW)', description: "Active power. Negative for charging, positive for discharging.", inputHint: "e.g., -1500 (charging), 2000 (discharging)", valueType: 'number'},
    ],
    [SLDElementType.Switch]: [
        { value: 'switch.isOn', label: 'Switch ON State (2-way)', description: 'Boolean: true if switch is ON/Closed, false if OFF/Open.', inputHint: "true (ON) or false (OFF)", valueType: 'boolean'},
        { value: 'switch.position', label: 'Switch Position (Multi-way)', description: 'String or Number indicating current switch position (e.g., "pos1", "pos2", 0, 1).', inputHint: "e.g., pos1, 1", valueType: 'string' /* Can be number too, but string covers it */},
    ],
    // Add other node-specific target properties as needed
};
const edgeTargetProperties: TargetPropertyDefinition[] = [ { value: 'isEnergized', label: 'Edge Energized State', description: 'Boolean: true indicates the edge is energized.', inputHint: "true or false", valueType: 'boolean' }, ];

function getApplicableTargetProperties(element: CustomNodeType | CustomFlowEdge | null): TargetPropertyDefinition[] {
    if (!element) return [];
    let applicableProps: TargetPropertyDefinition[] = [...commonTargetProperties];
    if (isNode(element) && element.data) {
        const nodeType = element.data.elementType;
        if (nodeType && nodeSpecificTargetProperties[nodeType]) {
            applicableProps.push(...nodeSpecificTargetProperties[nodeType]!);
        }
        if (nodeType === SLDElementType.Gauge) { 
            applicableProps = applicableProps.filter(prop => prop.value !== 'gaugeValue'); // 'gaugeValue' is for its own internal target for config.valueDataPointLink
        }
    } else if (isFlowEdge(element)) {
        applicableProps.push(...edgeTargetProperties);
    }
    const uniqueProps = Array.from(new Map(applicableProps.map(p => [p.value, p])).values());
    uniqueProps.sort((a, b) => a.label.localeCompare(b.label));
    return uniqueProps;
}
// --- END: Target Property Definitions ---

const fontFamilies = [ { label: "System UI", value: "system-ui, sans-serif" }, { label: "Inter", value: "Inter, sans-serif" }, { label: "Roboto", value: "Roboto, sans-serif" }, { label: "Monospace", value: "monospace" }];
const fontSizes = [ { label: "XXS (8px)", value: "8px" }, { label: "XS (10px)", value: "10px" }, { label: "S (12px)", value: "12px" }, { label: "M (14px)", value: "14px" }, { label: "L (16px)", value: "16px" }, { label: "XL (18px)", value: "18px" }, { label: "2XL (22px)", value: "22px" }, { label: "3XL (26px)", value: "26px" }, ];
const fontWeights = [ { label: "Light (300)", value: "300" }, { label: "Normal (400)", value: "normal" }, { label: "Medium (500)", value: "500" },{ label: "Semi-Bold (600)", value: "600" }, { label: "Bold (700)", value: "bold" }, ];
const borderRadiuses = [{label: "None (0px)", value: "0px"}, {label: "Sm (2px)", value: "2px"}, {label: "Base (4px)", value: "4px"}, {label: "Md (6px)", value: "6px"}, {label: "Lg (8px)", value: "8px"}, {label: "Full", value: "9999px"}];


function isNode(element: any): element is CustomNodeType { return element && 'position' in element && 'data' in element && 'id' in element && !isFlowEdge(element); }
const isFlowEdge = isReactFlowEdge;
const getElementTypeName = (element: CustomNodeType | CustomFlowEdge | null): string => { 
    if (!element) return 'Element';
    if (isNode(element) && element.data) {
        const elementType = element.data.elementType;
        const nameMap: Partial<Record<SLDElementType, string>> = {
            [SLDElementType.TextLabel]: 'Text Label', [SLDElementType.DataLabel]: 'Data Label',
            [SLDElementType.Contactor]: 'Contactor', [SLDElementType.Inverter]: 'Inverter',
            [SLDElementType.Panel]: 'PV Panel Array', [SLDElementType.Breaker]: 'Breaker/Switch',
            [SLDElementType.Meter]: 'Meter', [SLDElementType.Battery]: 'Battery System',
            [SLDElementType.Grid]: 'Grid Connection', [SLDElementType.Load]: 'Electrical Load',
            [SLDElementType.Busbar]: 'Busbar', [SLDElementType.Transformer]: 'Transformer',
            [SLDElementType.Generator]: 'Generator', [SLDElementType.PLC]: 'PLC',
            [SLDElementType.Sensor]: 'Sensor', [SLDElementType.GenericDevice]: 'Generic Device',
            [SLDElementType.Isolator]: 'Isolator', [SLDElementType.ATS]: 'ATS',
            [SLDElementType.JunctionBox]: 'Junction Box', [SLDElementType.Fuse]: 'Fuse',
            [SLDElementType.Gauge]: 'Gauge Display', [SLDElementType.Switch]: 'Switch'
        };
        if (elementType && nameMap[elementType]) { return nameMap[elementType]!; }
        const typeName = String(elementType || 'Unknown Node');
        return typeName.charAt(0).toUpperCase() + typeName.slice(1).replace(/([A-Z])/g, ' $1').trim() + ' Component';
    }
    if (isFlowEdge(element)) return 'Connection Line';
    return 'Diagram Element';
};

interface SLDInspectorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedElement: CustomNodeType | CustomFlowEdge | null;
    onUpdateElement: (element: CustomNodeType | CustomFlowEdge) => void;
    onDeleteElement: (elementId: string) => void;
    // Props passed from SLDWidget for animation configuration
    onConfigureEdgeAnimation?: (edge: CustomFlowEdge) => void; // To trigger SLDWidget's AnimationFlowConfiguratorDialog for a single edge
    onSetGlobalAnimationSettings?: () => void; // To trigger SLDWidget's AnimationFlowConfiguratorDialog for global settings
    currentGlobalAnimationSettings?: GlobalSLDAnimationSettings; // For display or context if needed
}

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const SLDInspectorDialog: React.FC<SLDInspectorDialogProps> = ({
    isOpen, onOpenChange, selectedElement, onUpdateElement, onDeleteElement,
    onConfigureEdgeAnimation,
    onSetGlobalAnimationSettings, // New prop
    currentGlobalAnimationSettings // New prop
}) => {
    const { dataPoints, opcUaNodeValues } = useAppStore((state) => ({ 
        dataPoints: state.dataPoints,
        opcUaNodeValues: state.opcUaNodeValues // For live preview of Gauge's value DP
    }));
    const [formData, setFormData] = useState<Partial<CustomNodeData & CustomFlowEdgeData & { styleConfig?: TextNodeStyleConfig } & { notes?: string; assetId?: string; }>>({});
    const [dataLinks, setDataLinks] = useState<DataPointLink[]>([]);
    const [activeTab, setActiveTab] = useState<string>("properties");
    const [devOverrideValues, setDevOverrideValues] = useState<Record<string, string>>({});

    // Handler specifically for Gauge's valueDataPointLink's format changes
    const handleGaugeValueDataPointFormatChange = useCallback((field: keyof NonNullable<DataPointLink['format']>, value: any) => {
        setFormData(prev => {
            const newFormData = JSON.parse(JSON.stringify(prev));
            if (newFormData.config && (newFormData.config as GaugeNodeData['config'])?.valueDataPointLink) {
                const gaugeConfig = newFormData.config as GaugeNodeData['config'];
                if (gaugeConfig && gaugeConfig.valueDataPointLink && !gaugeConfig.valueDataPointLink.format) { // Ensure format object exists
                    gaugeConfig.valueDataPointLink.format = { type: 'number' };
                }
                if (gaugeConfig && gaugeConfig.valueDataPointLink && gaugeConfig.valueDataPointLink.format) {
                    let currentFormat = gaugeConfig.valueDataPointLink.format;
                    currentFormat = { ...currentFormat, [field]: value };

                    if (field === 'type') {
                        const dpId = gaugeConfig.valueDataPointLink!.dataPointId;
                        const selectedDp = dpId ? dataPoints[dpId] : null;
                        if (value !== 'number') {
                            delete currentFormat.precision;
                            if (value !== 'string' && selectedDp?.unit && currentFormat.suffix === selectedDp.unit) {
                                delete currentFormat.suffix;
                            }
                        } else {
                            if (currentFormat.precision === undefined) currentFormat.precision = 2;
                            if (selectedDp?.unit && !currentFormat.suffix) currentFormat.suffix = selectedDp.unit;
                        }
                        if (value !== 'boolean') { delete currentFormat.trueLabel; delete currentFormat.falseLabel; }
                        if (value !== 'dateTime') delete currentFormat.dateTimeFormat;
                    }
                    gaugeConfig.valueDataPointLink!.format = currentFormat;
                }
            }
            return newFormData;
        });
    }, [dataPoints]);

    const currentTargetPropertyOptions = useMemo(() => getApplicableTargetProperties(selectedElement), [selectedElement]);

    useEffect(() => { 
        if (isOpen && selectedElement) {
            const elementDataCopy = JSON.parse(JSON.stringify(selectedElement.data ?? {}));
            const initialFormData: Partial<CustomNodeData & CustomFlowEdgeData & { styleConfig?: TextNodeStyleConfig; notes?: string; assetId?: string; }> = { ...elementDataCopy, label: elementDataCopy.label || '' };
            
            // Populate common base fields
            initialFormData.notes = (elementDataCopy as BaseNodeData).notes || '';
            initialFormData.assetId = (elementDataCopy as BaseNodeData).assetId || '';

            if (isNode(selectedElement) && selectedElement.data) {
                initialFormData.elementType = selectedElement.data.elementType;
                initialFormData.isDrillable = typeof elementDataCopy.isDrillable === 'boolean' ? elementDataCopy.isDrillable : false;
                initialFormData.subLayoutId = elementDataCopy.subLayoutId || undefined;

                if (selectedElement.data.elementType === SLDElementType.TextLabel || selectedElement.data.elementType === SLDElementType.DataLabel) {
                    if (selectedElement.data.elementType === SLDElementType.TextLabel) {
                        (initialFormData as Partial<TextLabelNodeData>).text = (elementDataCopy as TextLabelNodeData).text || '';
                    }
                    initialFormData.styleConfig = (elementDataCopy as TextLabelNodeData | DataLabelNodeData).styleConfig || {};
                }
                initialFormData.config = elementDataCopy.config && typeof elementDataCopy.config === 'object' 
                    ? { ...elementDataCopy.config } 
                    : {};

            } else if (isFlowEdge(selectedElement)) {
                initialFormData.flowType = elementDataCopy.flowType || '';
                initialFormData.voltageLevel = elementDataCopy.voltageLevel || '';
                initialFormData.currentRatingAmps = elementDataCopy.currentRatingAmps ?? undefined;
                initialFormData.cableType = elementDataCopy.cableType || '';
                initialFormData.animationSettings = elementDataCopy.animationSettings; // Populate current animation settings for the edge
            }
            setFormData(initialFormData);
            setDataLinks(elementDataCopy.dataPointLinks ?? []);
            if (!["properties", "data_linking"].includes(activeTab)) setActiveTab("properties");
            setDevOverrideValues({});
        } else if (!isOpen) {
            setFormData({}); setDataLinks([]); setDevOverrideValues({});
        }
    }, [selectedElement, isOpen]);

    const dataPointOptions = useMemo((): ComboboxOption[] => { 
        return Object.values(dataPoints).map(dp => ({
            value: dp.id,
            label: `${dp.name || dp.label || dp.id}${dp.description ? ` (${dp.description.substring(0,30)}...)` : ''}`,
            description: `ID: ${dp.id} | Type: ${dp.dataType} | Unit: ${dp.unit || 'N/A'}`
        })).sort((a, b) => a.label.localeCompare(b.label));
     }, [dataPoints]);

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = event.target;
        const checked = (event.target as HTMLInputElement).checked; // For HTMLInputElement specifically
        setFormData(prev => {
            const newState = JSON.parse(JSON.stringify(prev)); 
            const keys = name.split('.');
            let currentLevel: any = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]] || typeof currentLevel[keys[i]] !== 'object') currentLevel[keys[i]] = {};
                currentLevel = currentLevel[keys[i]];
            }
            let parsedValue: any = value;
            if (type === 'checkbox') parsedValue = checked;
            else if (type === 'number') {
                if (value === '') parsedValue = undefined; 
                else { const num = parseFloat(value); parsedValue = isNaN(num) ? value : num; }
            }
            currentLevel[keys[keys.length - 1]] = parsedValue;
            return newState;
        });
     }, []);
     



    const handleSelectChange = useCallback((name: string, value: string | boolean | number | Record<string, any> | null | undefined) => {
        setFormData(prev => {
            const newState = JSON.parse(JSON.stringify(prev)); 
            const keys = name.split('.');
            let currentLevel: any = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]] || typeof currentLevel[keys[i]] !== 'object') currentLevel[keys[i]] = {};
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = value;
            return newState;
        });
    }, []);

    // Specialized handler for ShadCN Checkbox as it uses onCheckedChange
    const handleCheckboxChange = useCallback((name: string, checked: boolean | 'indeterminate') => {
        if (typeof checked === 'boolean') {
            handleSelectChange(name, checked); // Reuse handleSelectChange logic
        }
    }, [handleSelectChange]);
    
    // Unchanged data linking handlers: handleDataLinkChange, addDataLink, removeDataLink, handleMappingTypeChange, handleMappingEntryChange, addMappingEntry, removeMappingEntry, handleFormatChange, handleDevOverrideChange
    const handleDataLinkChange = useCallback((index: number, field: keyof DataPointLink, value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === index) {
                const updatedLink = { ...link, [field]: value };
                if (field === 'dataPointId') {
                    const selectedDp = dataPoints[value as string];
                    updatedLink.format = updatedLink.format || { type: 'string' };
                    
                    if (selectedDp) {
                        let inferredType: NonNullable<DataPointLink['format']>['type'] = updatedLink.format.type;
                        const currentSuffix = updatedLink.format.suffix;
                        const dpDataType = selectedDp.dataType;
                        if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(dpDataType)) inferredType = 'number';
                        else if (dpDataType === 'Boolean') inferredType = 'boolean';
                        else if (dpDataType === 'DateTime') inferredType = 'dateTime';
                        else inferredType = 'string'; 

                        updatedLink.format.type = inferredType;

                        if (selectedDp.unit && inferredType !== 'boolean') { 
                            updatedLink.format.suffix = selectedDp.unit; 
                        } else if (!selectedDp.unit && inferredType !== 'boolean') {
                            const oldDpId = link.dataPointId; 
                            if (oldDpId && dataPoints[oldDpId]?.unit === currentSuffix) {
                                delete updatedLink.format.suffix;
                            }
                        }
                        if (inferredType !== 'number') delete updatedLink.format.precision;
                        if (inferredType !== 'boolean') { delete updatedLink.format.trueLabel; delete updatedLink.format.falseLabel; }
                        if (inferredType !== 'dateTime') delete updatedLink.format.dateTimeFormat;
                        if (inferredType === 'boolean') delete updatedLink.format.suffix; 
                    } else { 
                        if (updatedLink.format.suffix && link.dataPointId && dataPoints[link.dataPointId]?.unit === updatedLink.format.suffix) {
                            delete updatedLink.format.suffix;
                        }
                    }
                }
                return updatedLink;
            }
            return link;
        }));
     }, [dataPoints]);
    const addDataLink = useCallback(() => setDataLinks(prev => [...prev, { dataPointId: '', targetProperty: '', format: { type: 'string' } }]), []);
    const removeDataLink = useCallback((index: number) => setDataLinks(prev => prev.filter((_, i) => i !== index)), []);
    const handleMappingTypeChange = useCallback((linkIndex: number, selectedValue: string) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex) {
                if (selectedValue === '_none_') return { ...link, valueMapping: undefined };
                const newMappingType = selectedValue as NonNullable<DataPointLink['valueMapping']>['type'];
                let defaultMappingEntries: any[];
                if (newMappingType === 'boolean') { defaultMappingEntries = [{ value: true }, { value: false }]; } // For boolean, the 'match' is implicit (true/false)
                else if (newMappingType === 'enum') { defaultMappingEntries = [{ match: '', value: '' }]; }
                else { defaultMappingEntries = []; } // other types like 'range', 'threshold'
                
                const mapping = (link.valueMapping && link.valueMapping.type === newMappingType && Array.isArray(link.valueMapping.mapping)) 
                    ? link.valueMapping.mapping 
                    : defaultMappingEntries;

                return { ...link, valueMapping: { type: newMappingType, mapping } };
            }
            return link;
        }));
     }, []);
    const handleMappingEntryChange = useCallback((linkIndex: number, mapIndex: number, field: 'match' | 'value' | 'min' | 'max' | 'threshold' , value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping && link.valueMapping.mapping && link.valueMapping.mapping[mapIndex] !== undefined) {
                const newMappingEntries = JSON.parse(JSON.stringify(link.valueMapping.mapping)); 
                let processedValue = value;
                if (field === 'value' || field === 'match' || field === 'min' || field === 'max' || field === 'threshold') { // Check targetProperty for 'value' field only
                    const targetPropDef = currentTargetPropertyOptions.find(p => p.value === link.targetProperty);
                    if (targetPropDef && field === 'value') {
                        switch (targetPropDef.valueType) {
                            case 'boolean':
                                if (String(value).toLowerCase() === 'true') processedValue = true;
                                else if (String(value).toLowerCase() === 'false') processedValue = false;
                                break;
                            case 'number': case 'integer': case 'opacity':
                                const num = parseFloat(String(value));
                                processedValue = isNaN(num) ? value : num; 
                                break;
                        }
                    } else if (field !== 'value' && (field === 'min' || field === 'max' || field === 'threshold' || (field === 'match' && link.valueMapping?.type === 'exact' && (link.format?.type === 'number' || (dataPoints[link.dataPointId]?.dataType||'').toLowerCase().includes('int')) ) )) {
                        // For 'match' on exact number, or for range/threshold values, ensure they are numbers
                        const num = parseFloat(String(value));
                        processedValue = isNaN(num) ? value : num;
                    }
                }
                newMappingEntries[mapIndex][field] = processedValue;
                return { ...link, valueMapping: { ...link.valueMapping, mapping: newMappingEntries } };
            }
            return link;
        }));
    }, [currentTargetPropertyOptions, dataPoints]); 
    const addMappingEntry = useCallback((linkIndex: number) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping && (link.valueMapping.type === 'enum' || link.valueMapping.type === 'exact' || link.valueMapping.type === 'range')) {
                const newMapping = link.valueMapping.mapping ? [...link.valueMapping.mapping] : [];
                let newEntry: any = {};
                if (link.valueMapping.type === 'enum' || link.valueMapping.type === 'exact') newEntry = { match: '', value: '' };
                else if (link.valueMapping.type === 'range') newEntry = { min: undefined, max: undefined, value: '' };
                newMapping.push(newEntry);
                return { ...link, valueMapping: { ...link.valueMapping, mapping: newMapping } };
            }
            return link;
        }));
     }, []);
    const removeMappingEntry = useCallback((linkIndex: number, mapIndex: number) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping && (link.valueMapping.type === 'enum' || link.valueMapping.type === 'exact' || link.valueMapping.type === 'range') && link.valueMapping.mapping) {
                const newMappingEntries = link.valueMapping.mapping.filter((_, idx) => idx !== mapIndex);
                return { ...link, valueMapping: { ...link.valueMapping, mapping: newMappingEntries } };
            }
            return link;
        }));
     }, []);
     
    // Added DefaultValue mapping handler
    const handleDefaultValueMappingChange = useCallback((linkIndex: number, value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping) {
                let processedValue = value;
                const targetPropDef = currentTargetPropertyOptions.find(p => p.value === link.targetProperty);
                if (targetPropDef) {
                    switch (targetPropDef.valueType) {
                        case 'boolean':
                            if (String(value).toLowerCase() === 'true') processedValue = true;
                            else if (String(value).toLowerCase() === 'false') processedValue = false;
                            else if (value === undefined || value === null || String(value).trim() === '') processedValue = undefined; // Allow unsetting
                            break;
                        case 'number': case 'integer': case 'opacity':
                            const num = parseFloat(String(value));
                            processedValue = isNaN(num) ? ( (value === undefined || value === null || String(value).trim() === '') ? undefined : value) : num; 
                            break;
                        // For string, color, etc., raw value is fine or undefined if empty
                        default:
                            processedValue = (value === undefined || value === null || String(value).trim() === '') ? undefined : value;
                            break;
                    }
                }
                const newVm = { ...link.valueMapping, defaultValue: processedValue };
                if(newVm.defaultValue === undefined) delete newVm.defaultValue; // Clean up if undefined
                return { ...link, valueMapping: newVm };
            }
            return link;
        }));
    }, [currentTargetPropertyOptions]);
    
    const handleFormatChange = useCallback((linkIndex: number, field: keyof NonNullable<DataPointLink['format']>, value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex) {
                const currentFormat = link.format || { type: 'string' }; // Default to string if no format exists
                let newFormat = { ...currentFormat, [field]: value };
    
                if (field === 'type') { 
                    const dpId = link.dataPointId;
                    const selectedDp = dpId ? dataPoints[dpId] : null;
    
                    // Reset fields based on new type
                    delete newFormat.precision;
                    delete newFormat.prefix; // prefix applies to number and string
                    delete newFormat.suffix; // suffix applies to number and string
                    delete newFormat.trueLabel; 
                    delete newFormat.falseLabel;
                    delete newFormat.dateTimeFormat;
    
                    if (value === 'number') {
                        if (selectedDp?.unit) newFormat.suffix = selectedDp.unit;
                        newFormat.precision = 2; // Default precision for number
                    } else if (value === 'string') {
                        // Suffix/prefix can be useful for strings too
                        if (selectedDp?.unit) newFormat.suffix = selectedDp.unit; 
                    } else if (value === 'boolean') {
                        newFormat.trueLabel = 'True';
                        newFormat.falseLabel = 'False';
                    } else if (value === 'dateTime') {
                        newFormat.dateTimeFormat = 'YYYY-MM-DD HH:mm:ss';
                    }
                } else if (field === 'precision' && value === '') {
                    newFormat.precision = undefined; // allow clearing precision
                }
                return { ...link, format: newFormat };
            }
            return link;
        }));
     }, [dataPoints]);
    const handleDevOverrideChange = useCallback((dataPointId: string, overrideValue: string) => { setDevOverrideValues(prev => ({ ...prev, [dataPointId]: overrideValue, })); }, []);


    const handleSaveChangesAndClose = useCallback(() => {
        if (!selectedElement) return;

        const validDataLinks = dataLinks.filter(link => link.dataPointId && link.targetProperty);
        const newElementData: Partial<CustomNodeData & CustomFlowEdgeData> = JSON.parse(JSON.stringify(selectedElement.data || {}));
        
        // Common properties
        newElementData.label = formData.label || newElementData.label || 'Unnamed Element';
        newElementData.dataPointLinks = validDataLinks.length > 0 ? validDataLinks : undefined;
        (newElementData as BaseNodeData).notes = formData.notes || undefined;
        (newElementData as BaseNodeData).assetId = formData.assetId || undefined;
        
        // Config handling: deep merge formData.config into newElementData.config
        if (formData.config && Object.keys(formData.config).length > 0) {
            newElementData.config = { ...(newElementData.config || {}), ...formData.config };
        } else if (formData.config === undefined && newElementData.config){ // Explicitly removing config
             delete newElementData.config; 
        } else if (Object.keys(formData.config || {}).length === 0 && newElementData.config) { // If formData.config is an empty object
            // If the original also had config, decide if empty object means "clear" or "no change". 
            // Current approach: empty form config overwrites with empty.
             newElementData.config = {}; // or delete newElementData.config if that's preferred. For now, set to empty.
        }


        if (isNode(selectedElement)) {
            const nodeData = newElementData as CustomNodeData;
            nodeData.elementType = selectedElement.data.elementType; // Ensure original elementType is preserved
            nodeData.isDrillable = typeof formData.isDrillable === 'boolean' ? formData.isDrillable : selectedElement.data.isDrillable;
            nodeData.subLayoutId = nodeData.isDrillable ? formData.subLayoutId : undefined;

            if (selectedElement.data.elementType === SLDElementType.TextLabel || selectedElement.data.elementType === SLDElementType.DataLabel) {
                if (selectedElement.data.elementType === SLDElementType.TextLabel) {
                    (nodeData as TextLabelNodeData).text = (formData as Partial<TextLabelNodeData>).text ?? '';
                }
                if (formData.styleConfig && Object.keys(formData.styleConfig).length > 0) {
                    (nodeData as TextLabelNodeData | DataLabelNodeData).styleConfig = { 
                        ...((selectedElement.data as TextLabelNodeData | DataLabelNodeData).styleConfig || {}), 
                        ...formData.styleConfig 
                    };
                } else if (!formData.styleConfig && (nodeData as TextLabelNodeData | DataLabelNodeData).styleConfig && Object.keys((nodeData as TextLabelNodeData | DataLabelNodeData).styleConfig!).length === 0) {
                    delete (nodeData as TextLabelNodeData | DataLabelNodeData).styleConfig;
                }
            }
             // For Gauge, specific valueDataPointLink in config
             if (selectedElement.data.elementType === SLDElementType.Gauge) {
                const gaugeConfigFromForm = formData.config as GaugeNodeData['config'];
                const gaugeNodeData = nodeData as GaugeNodeData;
                if (!gaugeNodeData.config) gaugeNodeData.config = {};
                
                if (gaugeConfigFromForm?.valueDataPointLink && gaugeConfigFromForm.valueDataPointLink.dataPointId) {
                    gaugeNodeData.config.valueDataPointLink = gaugeConfigFromForm.valueDataPointLink;
                } else { // Handles case where it's undefined or dataPointId is missing
                    delete gaugeNodeData.config.valueDataPointLink;
                }
            }

            // Ensure specific config sub-objects are preserved or cleaned if empty
            const configKeys = Object.keys(nodeData.config || {});
            if (configKeys.length === 0) {
                delete nodeData.config;
            } else {
                // Example: For Switch, ensure specific nested config objects like `stateValuePos1` are handled.
                // The current general merge `...formData.config` should handle this for defined structures.
                // However, if some config fields in formData were set to undefined to signify deletion,
                // you'd need more granular cleanup. For simplicity, we assume all defined keys in formData.config
                // are intended to be set. Empty string vs undefined for optional fields should be managed by FieldInput.
            }

        } else { // Edge
            const edgeData = newElementData as CustomFlowEdgeData;
            edgeData.flowType = (formData as Partial<CustomFlowEdgeData>).flowType ?? edgeData.flowType;
            edgeData.voltageLevel = (formData as Partial<CustomFlowEdgeData>).voltageLevel ?? edgeData.voltageLevel;
            edgeData.currentRatingAmps = (formData as Partial<CustomFlowEdgeData>).currentRatingAmps ?? edgeData.currentRatingAmps;
            edgeData.cableType = (formData as Partial<CustomFlowEdgeData>).cableType ?? edgeData.cableType;
            // Animation settings are handled by SLDWidget, but if local changes are made via inspector (less likely now), preserve them.
            edgeData.animationSettings = (formData as Partial<CustomFlowEdgeData>).animationSettings ?? edgeData.animationSettings;
            edgeData.isEnergized = typeof (formData as Partial<CustomFlowEdgeData>).isEnergized === 'boolean' ? (formData as Partial<CustomFlowEdgeData>).isEnergized : edgeData.isEnergized;
            edgeData.status = (formData as Partial<CustomFlowEdgeData>).status ?? edgeData.status;
        }

        if (isNode(selectedElement)) {
            onUpdateElement({ ...selectedElement, data: newElementData as CustomNodeData });
        } else {
            onUpdateElement({ ...selectedElement, data: newElementData as CustomFlowEdgeData });
        }
        onOpenChange(false);
     }, [selectedElement, formData, dataLinks, onUpdateElement, onOpenChange]);

    const handleDeleteAndClose = useCallback(() => { if (selectedElement) { onDeleteElement(selectedElement.id); onOpenChange(false); } }, [selectedElement, onDeleteElement, onOpenChange]);
    
    // REMOVED: handleAnimationConfigurationFromDialog - this logic is now in SLDWidget

    if (!isOpen || !selectedElement) return null;
    const elementTypeUserFriendly = getElementTypeName(selectedElement);
    const currentElementNodeSLDType = isNode(selectedElement) && selectedElement.data ? selectedElement.data.elementType : undefined;
    const actionableElementTypes: SLDElementType[] = [ 
        SLDElementType.Breaker, SLDElementType.Contactor, SLDElementType.Fuse, 
        SLDElementType.Isolator, SLDElementType.ATS, SLDElementType.Switch 
    ];
    
    // FieldInput and MappedValueInput remain mostly unchanged from original but are vital
    const FieldInput = ({ id, label, value, onChange, type = "text", placeholder, name: fieldName, as: Component = Input, tooltip, children, info, inputClassName, step, min, max, rows, ...props }: any) => (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <Label htmlFor={id} className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    {label}
                    {info && (
                        <Tooltip><TooltipTrigger type="button" className="focus:outline-none"><InfoIconLucide className="w-3 h-3 text-muted-foreground/70 cursor-help"/></TooltipTrigger><TooltipContent side="top" className="max-w-xs z-[60]"><p>{info}</p></TooltipContent></Tooltip>
                    )}
                </Label>
                {tooltip && !info && (
                    <Tooltip><TooltipTrigger type="button" className="focus:outline-none"><InfoIconLucide className="w-3 h-3 text-muted-foreground/70 cursor-help"/></TooltipTrigger><TooltipContent side="left" className="max-w-xs z-[60]"><p>{tooltip}</p></TooltipContent></Tooltip>
                )}
            </div>
            <Component
                type={type}
                id={id}
                name={fieldName || id}
                value={value ?? (type === 'color' ? '#00000000' : '')} // Handle undefined for controlled inputs
                onChange={onChange}
                placeholder={placeholder}
                className={`h-8 text-xs ${inputClassName || ''}`}
                step={step}
                min={min}
                max={max}
                rows={rows}
                {...props}
            />
            {children && <div className="text-xs text-muted-foreground pt-0.5">{children}</div>}
        </div>
    );

    const MappedValueInput: React.FC<{ linkIndex: number; mapIndex: number; field: 'value' | 'defaultValue'; currentValue: any; targetProperty?: TargetPropertyDefinition; isDefaultValueField?: boolean}> = 
    ({ linkIndex, mapIndex, field, currentValue, targetProperty, isDefaultValueField }) => {
        const placeholder = targetProperty?.inputHint || "Enter target value";
        const valueType = targetProperty?.valueType;

        const handleChange = (val: any) => {
            if (isDefaultValueField) {
                 handleDefaultValueMappingChange(linkIndex, val);
            } else {
                 handleMappingEntryChange(linkIndex, mapIndex, 'value', val);
            }
        };
    
        if (valueType === 'boolean') {
            return (
                <Select
                    value={currentValue === undefined || currentValue === null ? '_undef_' : String(currentValue)}
                    onValueChange={(val) => {
                        const processedVal = val === '_undef_' ? undefined : (val === 'true');
                        handleChange(processedVal);
                    }}
                >
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder={placeholder} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_undef_" className="text-xs text-muted-foreground italic">Clear / Undefined</SelectItem>
                        <SelectItem value="true" className="text-xs">True</SelectItem>
                        <SelectItem value="false" className="text-xs">False</SelectItem>
                    </SelectContent>
                </Select>
            );
        }
        if (valueType === 'number' || valueType === 'integer' || valueType === 'opacity') {
            return (
                <Input
                    type="number"
                    className="h-8 text-xs flex-1"
                    value={currentValue === undefined || currentValue === null ? '' : String(currentValue)}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={placeholder}
                    step={valueType === 'opacity' ? "0.1" : (valueType === 'integer' ? "1" : "any")}
                    min={valueType === 'opacity' ? "0" : undefined}
                    max={valueType === 'opacity' ? "1" : undefined}
                />
            );
        }
        if (valueType === 'color') {
            return (
                <div className="flex items-center gap-2 flex-1">
                    <Input
                        type="color"
                        className="h-8 w-8 p-0.5 border-input rounded-md shrink-0"
                        value={String(currentValue || (field === 'defaultValue' ? '' : '#000000'))} // Default for 'value' could be black
                        onChange={(e) => handleChange(e.target.value)}
                    />
                    <Input
                        type="text"
                        className="h-8 text-xs flex-1"
                        value={String(currentValue || '')}
                        onChange={(e) => handleChange(e.target.value)}
                        placeholder={placeholder || 'e.g., #FF0000 or red'}
                    />
                </div>
            );
        }
        return (
            <Input
                className="h-8 text-xs flex-1"
                value={String(currentValue ?? '')}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
            />
        );
    };

    const ConfigCard: React.FC<{title: string, icon?: React.ElementType, children: React.ReactNode, titleClassName?: string}> = ({ title, icon: Icon, children, titleClassName }) => (
        <Card className='shadow-md border-border/60'>
            <CardHeader className='p-3.5'>
                <CardTitle className={`text-base font-semibold flex items-center ${titleClassName || ''}`}>
                    {Icon && <Icon className="w-4 h-4 mr-2 text-primary" />}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className='p-3.5 pt-0 space-y-3'>
                {children}
            </CardContent>
        </Card>
    );
    const GridSection: React.FC<{cols?: 1|2|3|4, children: React.ReactNode, className?: string}> = ({cols = 2, children, className}) => (
        <div className={`grid grid-cols-1 md:grid-cols-${cols > 1 ? '2' : '1'} lg:grid-cols-${cols} gap-x-4 gap-y-3 items-end ${className || ''}`}>
            {children}
        </div>
    );


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <TooltipProvider delayDuration={200}>
                <DialogContent className="max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] xl:max-h-[85vh] flex flex-col p-0 shadow-2xl rounded-lg border-border/70 bg-card">
                    <DialogHeader className="p-4 border-b border-border/60 flex flex-row justify-between items-center sticky top-0 bg-card/95 backdrop-blur-sm z-20">
                        <div className='space-y-0.5'>
                            <DialogTitle className="text-lg font-semibold flex items-center">
                                <PencilLine className="w-5 h-5 mr-2 text-primary" /> Configure {elementTypeUserFriendly}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground pl-[28px]">
                                Element ID: <span className="font-mono">{selectedElement.id}</span>
                            </DialogDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Tooltip><TooltipTrigger asChild><Button variant="destructive" size="icon" onClick={handleDeleteAndClose} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="bottom" className="z-[60]"><p>Delete this {elementTypeUserFriendly.toLowerCase()}</p></TooltipContent></Tooltip>
                            <DialogClose asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close dialog"> <X className="h-5 w-5" /> </Button></DialogClose>
                        </div>
                    </DialogHeader>
                    <ScrollArea className="flex-grow overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0" id="inspector-scroll-area">
                        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-11 sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b border-border/60 rounded-none">
                                <TabsTrigger value="properties" className="text-sm font-medium data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none h-full"><Settings2 className="w-4 h-4 mr-2" />Properties</TabsTrigger>
                                <TabsTrigger value="data_linking" className="text-sm font-medium data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none h-full"><Link2 className="w-4 h-4 mr-2" />Data Linking</TabsTrigger>
                            </TabsList>
                            <div className="p-4 md:p-5 lg:p-6">
                                <TabsContent value="properties" className="mt-0 space-y-5 outline-none">
                                    <ConfigCard title="General Settings" icon={InfoIcon}>
                                        <GridSection>
                                            <FieldInput id="label" label="Display Label / Name" value={formData.label || ''} onChange={handleInputChange} name="label" placeholder="e.g., Main Inverter" tooltip="The primary name shown on the diagram for this element."/>
                                            {isNode(selectedElement) && (
                                              <>
                                                <FieldInput id="assetId" label="Asset ID (Optional)" value={formData.assetId || ''} onChange={handleInputChange} name="assetId" placeholder="e.g., INV-001" info="Unique identifier for asset management systems."/>
                                                <FieldInput as={Textarea} rows={3} id="notes" label="Notes (Optional)" value={formData.notes || ''} onChange={handleInputChange} name="notes" placeholder="Internal notes or remarks..." className="col-span-full text-xs leading-snug h-auto py-1.5 px-2.5"/>
                                              </>
                                            )}
                                        </GridSection>
                                    </ConfigCard>
                                    
                                    {/* === Specific Node Configuration Cards === */}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Panel && (
                                        <ConfigCard title="PV Panel Array Configuration" icon={SunIcon}>
                                            <GridSection cols={2}>
                                                <FieldInput type="number" id="config.powerRatingWp" name="config.powerRatingWp" label="Total Power Rating (Wp)" value={(formData.config as PanelNodeData['config'])?.powerRatingWp ?? ''} onChange={handleInputChange} placeholder="e.g., 5000" min="0" info="Total peak power rating of the array in Watt-peak." />
                                                <div className="space-y-1"> <Label htmlFor="config.technology" className="text-xs">Panel Technology</Label> <Select value={(formData.config as PanelNodeData['config'])?.technology || ''} onValueChange={(val) => handleSelectChange("config.technology", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select technology..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">None/Other</SelectItem><SelectItem value="Mono-Si" className="text-xs">Monocrystalline Silicon</SelectItem><SelectItem value="Poly-Si" className="text-xs">Polycrystalline Silicon</SelectItem><SelectItem value="Thin-film" className="text-xs">Thin-film</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput type="number" id="config.numberOfPanels" name="config.numberOfPanels" label="Number of Panels" value={(formData.config as PanelNodeData['config'])?.numberOfPanels ?? ''} onChange={handleInputChange} placeholder="e.g., 16" min="1" info="Total number of individual panels in this array." />
                                                <div className="md:col-span-2 text-xs text-muted-foreground pt-1">Visual Representation:</div>
                                                <FieldInput icon={RowsIcon} type="number" id="config.arrayRows" name="config.arrayRows" label="Array Rows (Visual)" value={(formData.config as PanelNodeData['config'])?.arrayRows ?? ''} onChange={handleInputChange} placeholder="e.g., 2" min="1" max="5" info="Number of rows in the visual representation (1-5)." />
                                                <FieldInput icon={ColumnsIcon} type="number" id="config.arrayCols" name="config.arrayCols" label="Array Columns (Visual)" value={(formData.config as PanelNodeData['config'])?.arrayCols ?? ''} onChange={handleInputChange} placeholder="e.g., 4" min="1" max="8" info="Number of columns in the visual representation (1-8)." />
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && actionableElementTypes.includes(currentElementNodeSLDType as SLDElementType) && ( 
                                        <ConfigCard title="Control Configuration" icon={ZapIcon} titleClassName="text-orange-500">
                                            <FieldInput id="config.controlNodeId" name="config.controlNodeId" label="Control OPC UA Node ID" value={formData.config?.controlNodeId || ''} as={SearchableSelect} options={dataPointOptions.filter(dp => dataPoints[dp.value]?.isWritable)} onChange={(value: string | null) => handleSelectChange('config.controlNodeId', value || undefined)} placeholder="Search & Select Writable Data Point..." searchPlaceholder="Type to search..." notFoundText="No writable data points found." info="OPC UA node to write to for controlling this element." /> 
                                            {formData.config?.controlNodeId && dataPoints[formData.config.controlNodeId] && (<p className="text-xs text-muted-foreground pt-1">Selected: {dataPoints[formData.config.controlNodeId].name} (ID: {formData.config.controlNodeId})</p> )} 
                                        </ConfigCard> 
                                    )}

                                    {(isNode(selectedElement) && (currentElementNodeSLDType === SLDElementType.TextLabel || currentElementNodeSLDType === SLDElementType.DataLabel) ) && ( 
                                      <ConfigCard title={currentElementNodeSLDType === SLDElementType.TextLabel ? "Text Label Content & Style" : "Data Label Style"} icon={currentElementNodeSLDType === SLDElementType.TextLabel ? Edit3 : Type} >
                                            {currentElementNodeSLDType === SLDElementType.TextLabel && (
                                                <FieldInput id="text" name="text" label="Static Text Content" value={(formData as TextLabelNodeData).text || ''} onChange={handleInputChange} placeholder="Enter text for the label" as="textarea" rows={3} info="The text that will be displayed on this label."/>
                                            )}
                                            {currentElementNodeSLDType === SLDElementType.DataLabel && (
                                                <p className="text-xs text-muted-foreground py-1 px-2 rounded-md bg-muted/50 border border-dashed">The value for this label is configured in the "Data Linking" tab by targeting the 'Data Value' property.</p>
                                            )}
                                            <Separator className="my-3"/>
                                            <h4 className="text-sm font-medium text-muted-foreground pt-1">Styling:</h4>
                                            <GridSection cols={3}>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontFamily" className="text-xs flex items-center">Font Family</Label> <Select value={(formData.styleConfig)?.fontFamily || 'system-ui, sans-serif'} onValueChange={(val) => handleSelectChange("styleConfig.fontFamily", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontFamilies.map(fs => <SelectItem key={fs.value} value={fs.value} className="text-xs">{fs.label}</SelectItem>)}</SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontSize" className="text-xs flex items-center"><BaselineIcon className="w-3.5 h-3.5 mr-1" />Font Size</Label> <Select value={(formData.styleConfig)?.fontSize || '14px'} onValueChange={(val) => handleSelectChange("styleConfig.fontSize", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontSizes.map(fs => <SelectItem key={fs.value} value={fs.value} className="text-xs">{fs.label}</SelectItem>)}</SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontWeight" className="text-xs flex items-center"><CaseSensitive className="w-3.5 h-3.5 mr-1" />Font Weight</Label> <Select value={String((formData.styleConfig)?.fontWeight || 'normal')} onValueChange={(val) => handleSelectChange("styleConfig.fontWeight", ['300', '500', '600', '700', 'bold', 'normal'].includes(val) ? (['bold', 'normal'].includes(val) ? val : parseInt(val)) : 'normal' )}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontWeights.map(fw => <SelectItem key={fw.value} value={String(fw.value)} className="text-xs">{fw.label}</SelectItem>)}</SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontStyle" className="text-xs">Font Style</Label> <Select value={(formData.styleConfig)?.fontStyle || 'normal'} onValueChange={(val) => handleSelectChange("styleConfig.fontStyle", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="normal" className="text-xs">Normal</SelectItem><SelectItem value="italic" className="text-xs">Italic</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput name="styleConfig.color" id="styleConfig.color" label={<LabelLayout icon={PaletteIcon}>Text Color</LabelLayout>} type="color" value={(formData.styleConfig)?.color || '#000000'} onChange={handleInputChange} className="h-8 p-0.5 border-input rounded-md w-full" />
                                                <FieldInput name="styleConfig.backgroundColor" id="styleConfig.backgroundColor" label="BG Color" type="color" value={(formData.styleConfig)?.backgroundColor || '#00000000'} onChange={handleInputChange} className="h-8 p-0.5 border-input rounded-md w-full" title="Background color (transparent by default)" />
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.textAlign" className="text-xs flex items-center"><AlignLeftIcon className="w-3.5 h-3.5 mr-1" />Align</Label> <Select value={(formData.styleConfig)?.textAlign || 'left'} onValueChange={(val) => handleSelectChange("styleConfig.textAlign", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="left" className="text-xs">Left</SelectItem><SelectItem value="center" className="text-xs">Center</SelectItem><SelectItem value="right" className="text-xs">Right</SelectItem></SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.borderRadius" className="text-xs">Border Radius</Label> <Select value={(formData.styleConfig)?.borderRadius || '0px'} onValueChange={(val) => handleSelectChange("styleConfig.borderRadius", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{borderRadiuses.map(br => <SelectItem key={br.value} value={br.value} className="text-xs">{br.label}</SelectItem>)}</SelectContent> </Select> </div>
                                                <FieldInput name="styleConfig.padding" id="styleConfig.padding" label="Padding" placeholder="e.g., 2px 4px" value={(formData.styleConfig)?.padding || '2px'} onChange={handleInputChange} className="md:col-span-1" info="CSS padding value (e.g., 2px, 2px 4px)"/>
                                            </GridSection>
                                        </ConfigCard> 
                                    )}

                                    {isNode(selectedElement) && (currentElementNodeSLDType === SLDElementType.Inverter || currentElementNodeSLDType === SLDElementType.WindInverter) && (
                                        <ConfigCard title="Inverter Configuration" icon={SquareFunction}>
                                            <GridSection cols={2}>
                                                <FieldInput type="number" id="config.ratedPower" name="config.ratedPower" label="Rated Power (kW)" value={(formData.config as InverterNodeData['config'])?.ratedPower ?? ''} onChange={handleInputChange} placeholder="e.g., 5" step="0.1" min="0" info="Nominal rated power of the inverter in kilowatts."/>
                                                <div className="space-y-1"><Label htmlFor="config.inverterType" className="text-xs">Inverter Type</Label><Select value={(formData.config as InverterNodeData['config'])?.inverterType || 'on-grid'} onValueChange={(val) => handleSelectChange("config.inverterType", val as InverterType)} ><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="on-grid" className="text-xs">On-Grid</SelectItem><SelectItem value="off-grid" className="text-xs">Off-Grid</SelectItem><SelectItem value="hybrid" className="text-xs">Hybrid</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground pt-0.5">Hybrid type may add PV & Battery connection points visually.</p></div>
                                                <FieldInput type="number" id="config.warningTemperature" name="config.warningTemperature" label="Warning Temp (°C)" value={(formData.config as InverterNodeData['config'])?.warningTemperature ?? ''} onChange={handleInputChange} placeholder="e.g., 55"/>
                                                <FieldInput type="number" id="config.maxOperatingTemperature" name="config.maxOperatingTemperature" label="Max Operating Temp (°C)" value={(formData.config as InverterNodeData['config'])?.maxOperatingTemperature ?? ''} onChange={handleInputChange} placeholder="e.g., 70"/>
                                                <FieldInput type="number" id="config.efficiency" name="config.efficiency" label="Efficiency (%)" value={(formData.config as InverterNodeData['config'])?.efficiency ?? ''} onChange={handleInputChange} placeholder="e.g., 98" min="0" max="100" step="0.1"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}
                                    
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Contactor && (
                                        <ConfigCard title="Contactor Configuration" icon={ToggleRight}>
                                            <GridSection cols={2}>
                                                <div className="space-y-1"> <Label htmlFor="config.normallyOpen" className="text-xs">Default Contact Type</Label> <Select value={String((formData.config as ContactorNodeData['config'])?.normallyOpen ?? true)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="true" className="text-xs">Normally Open (NO)</SelectItem><SelectItem value="false" className="text-xs">Normally Closed (NC)</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput id="config.coilVoltage" name="config.coilVoltage" label="Coil Voltage" value={(formData.config as ContactorNodeData['config'])?.coilVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 24VDC, 230VAC"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Breaker && (
                                        <ConfigCard title="Breaker Configuration" icon={ZapIcon}>
                                            <GridSection cols={2}>
                                                <div className="space-y-1"> <Label htmlFor="config.type" className="text-xs">Breaker Type</Label> <Select value={(formData.config as BreakerNodeData['config'])?.type || ''} onValueChange={(val) => handleSelectChange("config.type", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Generic/Other</SelectItem><SelectItem value="MCB">MCB</SelectItem><SelectItem value="MCCB">MCCB</SelectItem><SelectItem value="ACB">ACB</SelectItem><SelectItem value="VCB">VCB</SelectItem><SelectItem value="SF6">SF6 Switchgear</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput type="number" id="config.tripRatingAmps" name="config.tripRatingAmps" label="Trip Rating (Amps)" value={(formData.config as BreakerNodeData['config'])?.tripRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 100" min="0" />
                                                <FieldInput type="number" id="config.interruptingCapacitykA" name="config.interruptingCapacitykA" label="Interrupting Capacity (kA)" value={(formData.config as BreakerNodeData['config'])?.interruptingCapacitykA ?? ''} onChange={handleInputChange} placeholder="e.g., 10" min="0" />
                                                <div className="space-y-1"> <Label htmlFor="config.normallyOpen" className="text-xs">Default State</Label> <Select value={String((formData.config as BreakerNodeData['config'])?.normallyOpen ?? false)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="false" className="text-xs">Normally Closed (NC)</SelectItem><SelectItem value="true" className="text-xs">Normally Open (NO)</SelectItem></SelectContent> </Select> </div>
                                            </GridSection>
                                        </ConfigCard>
                                    )}
                                    
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Meter && (
                                        <ConfigCard title="Meter Configuration" icon={Activity}>
                                            <GridSection cols={2}>
                                                <div className="space-y-1"> <Label htmlFor="config.meterType" className="text-xs">Meter Type</Label> <Select value={(formData.config as MeterNodeData['config'])?.meterType || ''} onValueChange={(val) => handleSelectChange("config.meterType", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select meter type..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Generic/Other</SelectItem><SelectItem value="Energy" className="text-xs">Energy Meter</SelectItem><SelectItem value="PowerQuality" className="text-xs">Power Quality Analyzer</SelectItem><SelectItem value="SubMeter" className="text-xs">Sub-Meter</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput id="config.accuracyClass" name="config.accuracyClass" label="Accuracy Class" value={(formData.config as MeterNodeData['config'])?.accuracyClass ?? ''} onChange={handleInputChange} placeholder="e.g., 0.5S, Class 1"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Battery && (
                                        <ConfigCard title="Battery System Configuration" icon={Layers3Icon}>
                                            <GridSection cols={2}>
                                                <div className="space-y-1"> <Label htmlFor="config.technology" className="text-xs">Technology</Label> <Select value={(formData.config as BatteryNodeData['config'])?.technology || ''} onValueChange={(val) => handleSelectChange("config.technology", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select technology..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Other/Not Specified</SelectItem><SelectItem value="Li-ion" className="text-xs">Lithium-ion (Generic)</SelectItem><SelectItem value="LFP" className="text-xs">LiFePO4 (LFP)</SelectItem><SelectItem value="NMC" className="text-xs">Nickel Manganese Cobalt (NMC)</SelectItem><SelectItem value="Lead-Acid" className="text-xs">Lead-Acid</SelectItem><SelectItem value="Flow" className="text-xs">Flow Battery</SelectItem><SelectItem value="NiCd" className="text-xs">Nickel-Cadmium (NiCd)</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput type="number" id="config.capacityAh" name="config.capacityAh" label="Total Capacity (Ah)" value={(formData.config as BatteryNodeData['config'])?.capacityAh ?? ''} onChange={handleInputChange} placeholder="e.g., 200" min="0"/>
                                                <FieldInput type="number" id="config.voltageNominalV" name="config.voltageNominalV" label="Nominal Voltage (V)" value={(formData.config as BatteryNodeData['config'])?.voltageNominalV ?? ''} onChange={handleInputChange} placeholder="e.g., 48" min="0"/>
                                                <FieldInput type="number" id="config.dodPercentage" name="config.dodPercentage" label="Depth of Discharge (%)" value={(formData.config as BatteryNodeData['config'])?.dodPercentage ?? ''} onChange={handleInputChange} placeholder="e.g., 80" min="0" max="100"/>
                                                <FieldInput type="number" id="config.numModules" name="config.numModules" label="Number of Modules" value={(formData.config as BatteryNodeData['config'])?.numModules ?? ''} onChange={handleInputChange} placeholder="e.g., 16" min="1"/>
                                                <FieldInput type="number" id="config.soc" name="config.soc" label="Initial/Fallback SOC (%)" value={(formData.config as BatteryNodeData['config'])?.soc ?? ''} onChange={handleInputChange} placeholder="e.g., 50" min="0" max="100" info="Manual SOC value if not driven by data point."/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Grid && (
                                        <ConfigCard title="Grid Connection Configuration" icon={Building}>
                                            <GridSection cols={2}>
                                                <FieldInput id="config.voltageLevel" name="config.voltageLevel" label="Voltage Level" value={(formData.config as GridNodeData['config'])?.voltageLevel ?? ''} onChange={handleInputChange} placeholder="e.g., 11kV, 400V"/>
                                                <div className="space-y-1"> <Label htmlFor="config.frequencyHz" className="text-xs">Frequency (Hz)</Label> <Select value={String((formData.config as GridNodeData['config'])?.frequencyHz || '_none_')} onValueChange={(val) => handleSelectChange("config.frequencyHz", val === '_none_' ? undefined : parseInt(val))}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select frequency..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Not Specified</SelectItem><SelectItem value="50" className="text-xs">50 Hz</SelectItem><SelectItem value="60" className="text-xs">60 Hz</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput type="number" id="config.faultLevelMVA" name="config.faultLevelMVA" label="Fault Level (MVA)" value={(formData.config as GridNodeData['config'])?.faultLevelMVA ?? ''} onChange={handleInputChange} placeholder="e.g., 250" min="0"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Load && (
                                        <ConfigCard title="Electrical Load Configuration" icon={WrenchIcon}>
                                            <GridSection cols={2}>
                                                <div className="space-y-1"> <Label htmlFor="config.loadType" className="text-xs">Load Type</Label> <Select value={(formData.config as LoadNodeData['config'])?.loadType || ''} onValueChange={(val) => handleSelectChange("config.loadType", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select load type..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Generic/Other</SelectItem><SelectItem value="Resistive" className="text-xs">Resistive</SelectItem><SelectItem value="Inductive" className="text-xs">Inductive</SelectItem><SelectItem value="Capacitive" className="text-xs">Capacitive</SelectItem><SelectItem value="Motor" className="text-xs">Motor</SelectItem><SelectItem value="Lighting" className="text-xs">Lighting</SelectItem><SelectItem value="Mixed" className="text-xs">Mixed Critical</SelectItem><SelectItem value="NonCritical" className="text-xs">Mixed Non-Critical</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput type="number" id="config.ratedPowerkW" name="config.ratedPowerkW" label="Rated Power (kW)" value={(formData.config as LoadNodeData['config'])?.ratedPowerkW ?? ''} onChange={handleInputChange} placeholder="e.g., 15" min="0"/>
                                                <FieldInput type="number" id="config.powerFactor" name="config.powerFactor" label="Power Factor" value={(formData.config as LoadNodeData['config'])?.powerFactor ?? ''} onChange={handleInputChange} placeholder="e.g., 0.9" min="0" max="1" step="0.01"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Busbar && (
                                        <ConfigCard title="Busbar Configuration" icon={LayoutPanelLeft}>
                                             <GridSection cols={2}>
                                                <div className="space-y-1"> <Label htmlFor="config.material" className="text-xs">Material</Label> <Select value={(formData.config as BusbarNodeData['config'])?.material || ''} onValueChange={(val) => handleSelectChange("config.material", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select material..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Other/Not Specified</SelectItem><SelectItem value="Copper" className="text-xs">Copper</SelectItem><SelectItem value="Aluminum" className="text-xs">Aluminum</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput type="number" id="config.currentRatingAmps" name="config.currentRatingAmps" label="Current Rating (Amps)" value={(formData.config as BusbarNodeData['config'])?.currentRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 1000" min="0"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Transformer && (
                                        <ConfigCard title="Transformer Configuration" icon={Sigma}>
                                            <GridSection cols={2}>
                                                <FieldInput id="config.ratingMVA" name="config.ratingMVA" label="Rating (MVA/kVA)" value={(formData.config as TransformerNodeData['config'])?.ratingMVA ?? ''} onChange={handleInputChange} placeholder="e.g., 1.5 MVA or 500 kVA"/>
                                                <FieldInput id="config.primaryVoltage" name="config.primaryVoltage" label="Primary Voltage" value={(formData.config as TransformerNodeData['config'])?.primaryVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 11kV"/>
                                                <FieldInput id="config.secondaryVoltage" name="config.secondaryVoltage" label="Secondary Voltage" value={(formData.config as TransformerNodeData['config'])?.secondaryVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 415V"/>
                                                <FieldInput id="config.vectorGroup" name="config.vectorGroup" label="Vector Group" value={(formData.config as TransformerNodeData['config'])?.vectorGroup ?? ''} onChange={handleInputChange} placeholder="e.g., Dyn11"/>
                                                <FieldInput type="number" id="config.impedancePercentage" name="config.impedancePercentage" label="Impedance (%)" value={(formData.config as TransformerNodeData['config'])?.impedancePercentage ?? ''} onChange={handleInputChange} placeholder="e.g., 5" min="0" step="0.1"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}
                                    
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Generator && (
                                        <ConfigCard title="Generator Configuration" icon={Wind}>
                                            <GridSection cols={2}>
                                                <div className="space-y-1"> <Label htmlFor="config.fuelType" className="text-xs">Fuel Type</Label> <Select value={(formData.config as GeneratorNodeData['config'])?.fuelType || ''} onValueChange={(val) => handleSelectChange("config.fuelType", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select fuel type..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Other/Not Specified</SelectItem><SelectItem value="Diesel" className="text-xs">Diesel</SelectItem><SelectItem value="Gas" className="text-xs">Natural Gas</SelectItem><SelectItem value="Biogas" className="text-xs">Biogas</SelectItem><SelectItem value="Hydro" className="text-xs">Hydro Turbine</SelectItem><SelectItem value="Wind" className="text-xs">Wind Turbine</SelectItem><SelectItem value="SolarPV" className="text-xs">Solar PV (as source, distinct from Panel array component)</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput id="config.ratingKVA" name="config.ratingKVA" label="Rating (kVA/kW)" value={(formData.config as GeneratorNodeData['config'])?.ratingKVA ?? ''} onChange={handleInputChange} placeholder="e.g., 500 kVA"/>
                                                <FieldInput id="config.outputVoltage" name="config.outputVoltage" label="Output Voltage" value={(formData.config as GeneratorNodeData['config'])?.outputVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 400V"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.WindTurbine && (
                                        <ConfigCard title="Wind Turbine Configuration" icon={Wind}>
                                            <GridSection cols={2}>
                                                <FieldInput type="number" id="config.ratingKVA" name="config.ratingKVA" label="Rating (kVA)" value={(formData.config as WindTurbineNodeData['config'])?.ratingKVA ?? ''} onChange={handleInputChange} placeholder="e.g., 1500" min="0" info="Nominal power rating of the wind turbine in kilovolt-amperes."/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.PLC && (
                                        <ConfigCard title="PLC Configuration" icon={Cog}>
                                            <GridSection cols={2}>
                                                <FieldInput id="config.model" name="config.model" label="Model / Type" value={(formData.config as PLCNodeData['config'])?.model ?? ''} onChange={handleInputChange} placeholder="e.g., Siemens S7-1500"/>
                                                <FieldInput id="config.ipAddress" name="config.ipAddress" label="IP Address" value={(formData.config as PLCNodeData['config'])?.ipAddress ?? ''} onChange={handleInputChange} placeholder="e.g., 192.168.1.10"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Sensor && (
                                        <ConfigCard title="Sensor Configuration" icon={Activity}>
                                             <GridSection cols={2}>
                                                <div className="space-y-1"> <Label htmlFor="config.sensorType" className="text-xs">Sensor Type</Label> <Select value={(formData.config as SensorNodeData['config'])?.sensorType || ''} onValueChange={(val) => handleSelectChange("config.sensorType", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select sensor type..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Generic/Other</SelectItem><SelectItem value="Temperature" className="text-xs">Temperature</SelectItem><SelectItem value="Irradiance" className="text-xs">Irradiance (Solar)</SelectItem><SelectItem value="WindSpeed" className="text-xs">Wind Speed</SelectItem><SelectItem value="Pressure" className="text-xs">Pressure</SelectItem><SelectItem value="Flow" className="text-xs">Flow Rate</SelectItem><SelectItem value="Humidity" className="text-xs">Humidity</SelectItem><SelectItem value="Current" className="text-xs">Current (CT)</SelectItem><SelectItem value="Voltage" className="text-xs">Voltage (PT)</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput id="config.measurementRange" name="config.measurementRange" label="Measurement Range" value={(formData.config as SensorNodeData['config'])?.measurementRange ?? ''} onChange={handleInputChange} placeholder="e.g., 0-100°C, 4-20mA"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}
                                    
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.GenericDevice && (
                                        <ConfigCard title="Generic Device Configuration" icon={Package}>
                                            <GridSection cols={2}>
                                                <FieldInput id="config.deviceType" name="config.deviceType" label="Device Type Label" value={(formData.config as GenericDeviceNodeData['config'])?.deviceType ?? ''} onChange={handleInputChange} placeholder="e.g., UPS, Filter, VSD" info="User-defined type displayed on node."/>
                                                <FieldInput id="config.iconName" name="config.iconName" label="Lucide Icon Name (Optional)" value={(formData.config as GenericDeviceNodeData['config'])?.iconName ?? ''} onChange={handleInputChange} placeholder="e.g., server, shield" info="Enter a valid Lucide icon name for display."/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Isolator && (
                                        <ConfigCard title="Isolator Configuration" icon={ToggleRight}>
                                             <GridSection cols={2}>
                                                <FieldInput type="number" id="config.poles" name="config.poles" label="Number of Poles" value={(formData.config as IsolatorNodeData['config'])?.poles ?? ''} onChange={handleInputChange} placeholder="e.g., 3 or 4" min="1"/>
                                                <div className="flex items-center space-x-2 pt-5"> <Checkbox id="config.loadBreak" name="config.loadBreak" checked={(formData.config as IsolatorNodeData['config'])?.loadBreak ?? false} onCheckedChange={(checked) => handleCheckboxChange("config.loadBreak", checked)} /><Label htmlFor="config.loadBreak" className="text-xs font-normal cursor-pointer">Load Break Switch?</Label></div>
                                                <div className="space-y-1"> <Label htmlFor="config.manualOrMotorized" className="text-xs">Operation</Label> <Select value={(formData.config as IsolatorNodeData['config'])?.manualOrMotorized || 'manual'} onValueChange={(val) => handleSelectChange("config.manualOrMotorized", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="manual" className="text-xs">Manual</SelectItem><SelectItem value="motorized" className="text-xs">Motorized</SelectItem></SelectContent> </Select> </div>
                                            </GridSection>
                                        </ConfigCard>
                                    )}
                                    
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.ATS && (
                                        <ConfigCard title="ATS Configuration" icon={Users}>
                                             <GridSection cols={2}>
                                                <FieldInput type="number" id="config.transferTimeMs" name="config.transferTimeMs" label="Transfer Time (ms)" value={(formData.config as ATSNodeData['config'])?.transferTimeMs ?? ''} onChange={handleInputChange} placeholder="e.g., 50" min="0"/>
                                                <FieldInput type="number" id="config.numPoles" name="config.numPoles" label="Number of Poles" value={(formData.config as ATSNodeData['config'])?.numPoles ?? ''} onChange={handleInputChange} placeholder="e.g., 4" min="1"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.JunctionBox && (
                                        <ConfigCard title="Junction Box Configuration" icon={Package}>
                                             <GridSection cols={2}>
                                                <FieldInput id="config.material" name="config.material" label="Material" value={(formData.config as JunctionBoxNodeData['config'])?.material ?? ''} onChange={handleInputChange} placeholder="e.g., Polycarbonate, Steel"/>
                                                <FieldInput id="config.ipRating" name="config.ipRating" label="IP Rating" value={(formData.config as JunctionBoxNodeData['config'])?.ipRating ?? ''} onChange={handleInputChange} placeholder="e.g., IP65"/>
                                                <FieldInput type="number" id="config.numberOfStrings" name="config.numberOfStrings" label="Number of Strings (If PV)" value={(formData.config as JunctionBoxNodeData['config'])?.numberOfStrings ?? ''} onChange={handleInputChange} placeholder="e.g., 4" min="0"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Fuse && (
                                        <ConfigCard title="Fuse Configuration" icon={AlertTriangle}>
                                             <GridSection cols={2}>
                                                <FieldInput type="number" id="config.ratingAmps" name="config.ratingAmps" label="Rating (Amps)" value={(formData.config as FuseNodeData['config'])?.ratingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 100" min="0"/>
                                                <FieldInput id="config.voltageRating" name="config.voltageRating" label="Voltage Rating" value={(formData.config as FuseNodeData['config'])?.voltageRating ?? ''} onChange={handleInputChange} placeholder="e.g., 690V AC"/>
                                                <div className="space-y-1"> <Label htmlFor="config.fuseType" className="text-xs">Fuse Type</Label> <Select value={(formData.config as FuseNodeData['config'])?.fuseType || ''} onValueChange={(val) => handleSelectChange("config.fuseType", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select fuse type..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Generic/Other</SelectItem><SelectItem value="Cartridge" className="text-xs">Cartridge</SelectItem><SelectItem value="HRC" className="text-xs">HRC (High Rupturing Capacity)</SelectItem><SelectItem value="Rewireable" className="text-xs">Rewireable</SelectItem><SelectItem value="Semiconductor" className="text-xs">Semiconductor Protection</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput type="number" id="config.breakingCapacitykA" name="config.breakingCapacitykA" label="Breaking Capacity (kA)" value={(formData.config as FuseNodeData['config'])?.breakingCapacitykA ?? ''} onChange={handleInputChange} placeholder="e.g., 80" min="0"/>
                                            </GridSection>
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Switch && (
                                        <ConfigCard title="Switch Configuration" icon={ToggleRight}>
                                            <GridSection cols={2}>
                                                <div className="space-y-1">
                                                    <Label htmlFor="config.switchType" className="text-xs">Switch Type</Label>
                                                    <Select
                                                        value={(formData.config as SwitchNodeConfig)?.switchType || 'two-way'}
                                                        onValueChange={(val) => handleSelectChange("config.switchType", val as SwitchNodeConfig['switchType'])}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="two-way" className="text-xs">Two-Way (On/Off)</SelectItem>
                                                            <SelectItem value="three-way" className="text-xs">Three-Way (Pos1/Off/Pos2 or Pos1/Pos2)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <FieldInput type="number" id="config.numPoles" name="config.numPoles" label="Number of Poles (Visual)" value={(formData.config as SwitchNodeConfig)?.numPoles ?? ''} onChange={handleInputChange} placeholder="e.g., 1 for SPST/SPDT" min="1"/>
                                                
                                                {(formData.config as SwitchNodeConfig)?.switchType === 'two-way' && (
                                                    <div className="space-y-1">
                                                        <Label htmlFor="config.normallyOpen" className="text-xs">Default State (Two-Way)</Label>
                                                        <Select value={String((formData.config as SwitchNodeConfig)?.normallyOpen ?? false)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}>
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="false" className="text-xs">Normally Closed (NC)</SelectItem>
                                                                <SelectItem value="true" className="text-xs">Normally Open (NO)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </GridSection>
                                            
                                            {(formData.config as SwitchNodeConfig)?.switchType === 'three-way' && (
                                              <>
                                                <Separator className="my-3"/>
                                                <p className="text-xs font-medium text-muted-foreground">Three-Way Specific Control (Optional):</p>
                                                <GridSection cols={1}>
                                                   <FieldInput id="config.controlNodeIdPos1" name="config.controlNodeIdPos1" label="Control Node ID for Position 1" value={(formData.config as SwitchNodeConfig)?.controlNodeIdPos1 || ''} as={SearchableSelect} options={dataPointOptions.filter(dp => dataPoints[dp.value]?.isWritable)} onChange={(value: string | null) => handleSelectChange('config.controlNodeIdPos1', value || undefined)} placeholder="Search Data Point for Pos 1..." />
                                                   <FieldInput id="config.controlNodeIdPos2" name="config.controlNodeIdPos2" label="Control Node ID for Position 2" value={(formData.config as SwitchNodeConfig)?.controlNodeIdPos2 || ''} as={SearchableSelect} options={dataPointOptions.filter(dp => dataPoints[dp.value]?.isWritable)} onChange={(value: string | null) => handleSelectChange('config.controlNodeIdPos2', value || undefined)} placeholder="Search Data Point for Pos 2..." />
                                                   <Separator className="my-2"/>
                                                   <p className="text-xs text-muted-foreground -mb-1">Alternatively, use one status DP and map values:</p>
                                                   <FieldInput id="config.stateValuePos1" name="config.stateValuePos1" label="DataPoint Value for Position 1" value={(formData.config as SwitchNodeConfig)?.stateValuePos1 || ''} onChange={handleInputChange} placeholder="e.g., 1, 'POS_1', true" />
                                                   <FieldInput id="config.stateValueOff" name="config.stateValueOff" label="DataPoint Value for Off State (Optional)" value={(formData.config as SwitchNodeConfig)?.stateValueOff || ''} onChange={handleInputChange} placeholder="e.g., 0, 'OFF', false" />
                                                   <FieldInput id="config.stateValuePos2" name="config.stateValuePos2" label="DataPoint Value for Position 2" value={(formData.config as SwitchNodeConfig)?.stateValuePos2 || ''} onChange={handleInputChange} placeholder="e.g., 2, 'POS_2'" />
                                                </GridSection>
                                              </>
                                            )}
                                        </ConfigCard>
                                    )}

                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Gauge && (
                                        <>
                                            <ConfigCard title="Gauge Display Configuration" icon={Sigma}>
                                                <GridSection cols={3}>
                                                    <FieldInput type="number" id="config.minVal" name="config.minVal" label="Minimum Value" value={(formData.config as GaugeNodeData['config'])?.minVal ?? ''} onChange={handleInputChange} placeholder="e.g., 0" info="The lowest value the gauge can display."/>
                                                    <FieldInput type="number" id="config.maxVal" name="config.maxVal" label="Maximum Value" value={(formData.config as GaugeNodeData['config'])?.maxVal ?? ''} onChange={handleInputChange} placeholder="e.g., 100" info="The highest value the gauge can display."/>
                                                    <FieldInput id="config.unit" name="config.unit" label="Display Unit" value={(formData.config as GaugeNodeData['config'])?.unit ?? ''} onChange={handleInputChange} placeholder="e.g., %, kW, °C" info="The unit shown on the gauge scale."/>
                                                </GridSection>
                                            </ConfigCard>
                                            <ConfigCard title="Gauge Value Data Point" icon={Link2}>
                                                <FieldInput 
                                                    id="config.valueDataPointLink.dataPointId" 
                                                    name="config.valueDataPointLink.dataPointId" 
                                                    label="Value Data Point" 
                                                    value={(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.dataPointId || ''} 
                                                    onChange={(value: string | null) => { 
                                                        const selectedDp = value ? dataPoints[value] : null; 
                                                        let inferredType: NonNullable<DataPointLink['format']>['type'] = 'number'; 
                                                        if (selectedDp) { 
                                                            if (['Boolean'].includes(selectedDp.dataType)) inferredType = 'boolean'; 
                                                            else if (['String', 'LocalizedText'].includes(selectedDp.dataType)) inferredType = 'string'; 
                                                            else if (['DateTime'].includes(selectedDp.dataType)) inferredType = 'dateTime';
                                                        } 
                                                        handleSelectChange("config.valueDataPointLink", value ? { 
                                                            dataPointId: value, 
                                                            targetProperty: 'value', // Fixed target property for gauge's main value
                                                            format: { 
                                                                type: inferredType, 
                                                                ...(inferredType === 'number' && { precision: selectedDp?.decimalPlaces ?? 2, suffix: selectedDp?.unit || '' }), 
                                                                ...(inferredType === 'string' && { suffix: selectedDp?.unit || '' }), 
                                                                ...(inferredType === 'boolean' && { trueLabel: 'True', falseLabel: 'False' }),
                                                                ...(inferredType === 'dateTime' && { dateTimeFormat: 'YYYY-MM-DD HH:mm:ss' })
                                                            } 
                                                        } : undefined); 
                                                    }} 
                                                    as={SearchableSelect} options={dataPointOptions} placeholder="Search & Select Data Point for Gauge Value..." searchPlaceholder="Type to search..." notFoundText="No data points found." info="Select the data point that will drive the gauge's value." 
                                                /> 
                                                {(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.dataPointId && dataPoints[(formData.config as GaugeNodeData['config'])!.valueDataPointLink!.dataPointId!] && ( 
                                                    <div className="mt-1.5 space-y-1">
                                                        <p className="text-xs text-muted-foreground">Selected: {dataPoints[(formData.config as GaugeNodeData['config'])!.valueDataPointLink!.dataPointId!].name}</p>
                                                        <DataLinkLiveValuePreview 
                                                            dataPointId={(formData.config as GaugeNodeData['config'])!.valueDataPointLink!.dataPointId!}
                                                            format={(formData.config as GaugeNodeData['config'])!.valueDataPointLink!.format}
                                                            valueMapping={undefined}
                                                            // No valueMapping for gauge's direct valueDataPointLink, formatting is key
                                                        />
                                                    </div>
                                                )}
                                                {(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.dataPointId && ( 
                                                    <div className="mt-2.5 pt-2.5 border-t border-border/40 space-y-2.5"> 
                                                        <Label className="text-xs font-medium flex items-center text-muted-foreground">Selected Value Formatting <Tooltip><TooltipTrigger type="button" className="ml-1.5 focus:outline-none"><InfoIconLucide className="w-3 h-3 text-muted-foreground/60 cursor-help"/></TooltipTrigger><TooltipContent side="top" className="max-w-xs z-[60]"><p>Define how the selected data point's value should be formatted before being displayed on the gauge.</p></TooltipContent></Tooltip> </Label> 
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 items-start bg-muted/20 dark:bg-gray-800/20 p-2.5 rounded-md"> 
                                                            <div className="space-y-1"> <Label htmlFor="gaugeValueFormat.type" className="text-[10px] font-medium">Interpret As</Label> <Select value={(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.type || 'number'} onValueChange={(val) => handleGaugeValueDataPointFormatChange('type', val as NonNullable<DataPointLink['format']>['type'])} > <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="number" className="text-xs">Number</SelectItem> <SelectItem value="string" className="text-xs">Text (String)</SelectItem> <SelectItem value="boolean" className="text-xs">True/False (Boolean)</SelectItem> <SelectItem value="dateTime" className="text-xs">Date/Time</SelectItem></SelectContent> </Select> </div> <div> {/* Spacer */} </div> 
                                                            {(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.type === 'number' && ( <FieldInput type="number" id="gaugeValueFormat.precision" label="Decimal Places" value={(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.precision ?? ''} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleGaugeValueDataPointFormatChange('precision', e.target.value === '' ? undefined : parseInt(e.target.value) || 0)} placeholder="e.g., 2" min="0" max="10" /> )} 
                                                            {((formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.type === 'number' || (formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.type === 'string') && ( <FieldInput id="gaugeValueFormat.suffix" label="Unit/Suffix" value={(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.suffix ?? ''} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleGaugeValueDataPointFormatChange('suffix', e.target.value)} placeholder="e.g., kW, °C (from DP if number type)"/> )} 
                                                            {(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.type === 'boolean' && ( <> <FieldInput id="gaugeValueFormat.trueLabel" label="Show TRUE as" value={(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.trueLabel || 'True'} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleGaugeValueDataPointFormatChange('trueLabel', e.target.value)} placeholder="e.g., ON, Active" /> <FieldInput id="gaugeValueFormat.falseLabel" label="Show FALSE as" value={(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.falseLabel || 'False'} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleGaugeValueDataPointFormatChange('falseLabel', e.target.value)} placeholder="e.g., OFF, Inactive" /> </> )} 
                                                            {(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.type === 'dateTime' && ( <FieldInput id="gaugeValueFormat.dateTime" label="Date/Time Format Pattern" value={(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.format?.dateTimeFormat || 'YYYY-MM-DD HH:mm'} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleGaugeValueDataPointFormatChange('dateTimeFormat', e.target.value)} placeholder="e.g., YYYY-MM-DD HH:mm:ss"/> )}
                                                        </div> 
                                                    </div> 
                                                )} 
                                            </ConfigCard>
                                        </>
                                    )}

                                    {isFlowEdge(selectedElement) && ( 
                                        <ConfigCard title="Connection Line Configuration" icon={Cable}>
                                            <GridSection cols={2}>
                                                <div className="space-y-1"> <Label htmlFor="flowType" className="text-xs">Flow Type</Label> <Select value={formData.flowType || ''} onValueChange={(val) => handleSelectChange("flowType", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Generic/Other</SelectItem><SelectItem value="AC">AC Power</SelectItem><SelectItem value="DC">DC Power</SelectItem><SelectItem value="NEUTRAL">Neutral</SelectItem><SelectItem value="EARTH">Earth/Ground</SelectItem><SelectItem value="CONTROL_SIGNAL">Control Signal</SelectItem><SelectItem value="DATA_BUS">Data Bus</SelectItem><SelectItem value="OFFLINE">Offline/Standby</SelectItem><SelectItem value="FAULT">Fault Path</SelectItem></SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="voltageLevel" className="text-xs">Voltage Level</Label> <Select value={formData.voltageLevel || ''} onValueChange={(val) => handleSelectChange("voltageLevel", val === '_none_' ? undefined : val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger> <SelectContent><SelectItem value="_none_" className="text-xs text-muted-foreground italic">Not Specified</SelectItem><SelectItem value="HV">High Voltage (&gt;1kV)</SelectItem><SelectItem value="MV">Medium Voltage (1kV-36kV)</SelectItem><SelectItem value="LV">Low Voltage (50V-1kV)</SelectItem><SelectItem value="ELV">Extra Low Voltage (&lt;50V)</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput type="number" id="currentRatingAmps" name="currentRatingAmps" label="Current Rating (Amps)" value={formData.currentRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 250" min="0" />
                                                <FieldInput id="cableType" name="cableType" label="Cable Type / Size" value={formData.cableType ?? ''} onChange={handleInputChange} placeholder="e.g., XLPE 3C x 185mm²" />
                                            </GridSection>
                                            <Separator className="my-3.5" />
                                            <Button variant="outline" size="sm" className="w-full h-9" onClick={() => { if (isFlowEdge(selectedElement) && onConfigureEdgeAnimation) { onConfigureEdgeAnimation(selectedElement); } }} disabled={!onConfigureEdgeAnimation}><ZapIcon className="w-4 h-4 mr-2" />Configure Animated Flow</Button>
                                            {onSetGlobalAnimationSettings && (
                                                <Button variant="link" size="sm" className="w-full h-8 text-xs mt-1 text-muted-foreground hover:text-primary" onClick={onSetGlobalAnimationSettings}>
                                                    Edit Global Animation Defaults...
                                                </Button>
                                            )}
                                        </ConfigCard> 
                                    )}

                                    {isNode(selectedElement) && ( 
                                        <ConfigCard title="Drilldown Link (Optional)" icon={FileKey}>
                                            <div className="flex items-center space-x-2 pt-1"> <Checkbox id="isDrillable" name="isDrillable" checked={!!formData.isDrillable} onCheckedChange={(checked) => handleCheckboxChange("isDrillable", checked)} className="h-4 w-4 accent-primary shrink-0" /> <Label htmlFor="isDrillable" className="text-sm font-normal cursor-pointer">Enable drilldown to another SLD layout?</Label> </div> 
                                            {formData.isDrillable && ( <div className="space-y-1.5 pt-2 pl-6 border-l-2 border-primary/20 ml-2"> <Label htmlFor="subLayoutId" className="text-xs font-medium">Target Sub-Layout ID <span className="text-red-500">*</span></Label> <Select value={formData.subLayoutId || ''} onValueChange={(value) => handleSelectChange("subLayoutId", value)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select target SLD layout..." /></SelectTrigger> <SelectContent>{AVAILABLE_SLD_LAYOUT_IDS.filter(id => selectedElement && id !== selectedElement.id /* Cannot drilldown to self if it had an ID matching layout */).map(id => (<SelectItem key={id} value={id} className="text-xs">{id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>))}</SelectContent> </Select> {formData.subLayoutId && <p className="text-xs text-muted-foreground pt-0.5">Selected target: {formData.subLayoutId}</p>} {!formData.subLayoutId && <p className="text-xs text-destructive pt-0.5">Please select a target layout for drilldown.</p>} </div> )} 
                                        </ConfigCard> 
                                    )}
                                </TabsContent>

                                <TabsContent value="data_linking" className="mt-0 space-y-5 outline-none">
                                     {dataLinks.length === 0 && ( <div className="text-center py-10 px-6 bg-muted/20 dark:bg-gray-800/20 rounded-lg border border-dashed border-border/40"> <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/60" /> <h3 className="mt-2.5 text-md font-semibold text-foreground">No Data Links Yet</h3> <p className="mt-1 text-sm text-muted-foreground">Make this element dynamic by linking its properties to real-time data points.</p> <Button variant="default" size="sm" onClick={addDataLink} className="mt-5 h-9 text-xs px-4"><PlusCircle className="h-4 w-4 mr-2" /> Add First Data Link</Button> </div> )}
                                    {dataLinks.map((link, index) => {
                                        const selectedDataPoint = link.dataPointId ? dataPoints[link.dataPointId] : null;
                                        const selectedTargetPropDef = currentTargetPropertyOptions.find(p => p.value === link.targetProperty);
                                        return (
                                        <Card key={index} className='shadow-md border-border/60 bg-card overflow-hidden'>
                                            <CardHeader className="p-3 flex flex-row justify-between items-center bg-muted/30 dark:bg-gray-800/30 border-b border-border/60"> <div className="flex items-center gap-2"> <Link2 className="h-4 w-4 text-primary flex-shrink-0" /> <h3 className="font-medium text-sm">Data Link #{index + 1} {selectedDataPoint && selectedTargetPropDef && (<span className="text-xs text-muted-foreground font-normal ml-1.5 hidden sm:inline">(<span className="font-semibold">{selectedDataPoint.name || selectedDataPoint.id.substring(0,8)}</span> <ArrowRight className="inline h-3 w-3 mx-0.5 text-primary/70"/> <span className="font-semibold">{selectedTargetPropDef.label}</span>)</span>)}</h3></div> <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDataLink(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TooltipTrigger><TooltipContent side="left" className="z-[60]"><p>Remove this data link</p></TooltipContent></Tooltip> </CardHeader>
                                            <CardContent className='p-3 md:p-4 space-y-4'>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                                    <div className="space-y-1"> <Label htmlFor={`dataPointId-${index}`} className="text-xs font-medium">Data Point Source</Label> <SearchableSelect options={dataPointOptions} value={link.dataPointId || ''} onChange={(value) => handleDataLinkChange(index, 'dataPointId', value || '')} placeholder="Search & Select Data Point..." searchPlaceholder="Type to search data points..." notFoundText="No data points found."/> 
                                                        {selectedDataPoint && ( <div className="mt-1.5 space-y-1"> <DataLinkLiveValuePreview dataPointId={link.dataPointId} valueMapping={link.valueMapping} format={link.format} /> {IS_DEVELOPMENT && link.dataPointId && ( <div className="relative"> <TestTube2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500" /> <Input type="text" placeholder="Dev Override Value..." value={devOverrideValues[link.dataPointId] || ''} onChange={(e) => handleDevOverrideChange(link.dataPointId, e.target.value)} className="h-7 text-xs pl-7 bg-amber-500/10 border-amber-500/30 focus:border-amber-500"/> </div> )} </div> )}
                                                    </div>
                                                    <div className="space-y-1"> <Label htmlFor={`targetProperty-${index}`} className="text-xs font-medium">Target Element Property</Label> <SearchableSelect options={currentTargetPropertyOptions} value={link.targetProperty || ''} onChange={(val) => handleDataLinkChange(index, 'targetProperty', val || '')} placeholder="Select property to influence..." searchPlaceholder='Search properties...' notFoundText='No properties found.'/> {selectedTargetPropDef && (<p className="text-xs text-muted-foreground pt-1 leading-tight"><span className="font-semibold">Affects:</span> {selectedTargetPropDef.description}</p>)}</div>
                                                </div>
                                                {link.dataPointId && link.targetProperty && ( <> <Separator className="my-3" /> <div className="space-y-2.5"> <div className="flex justify-between items-center"> <Label className="text-xs font-medium flex items-center">Value Mapping <Tooltip><TooltipTrigger asChild><button type="button" title="Value mapping information" aria-label="Value mapping information" className="focus:outline-none"><InfoIconLucide className="w-3 h-3 ml-1.5 text-muted-foreground/70 cursor-help"/></button></TooltipTrigger><TooltipContent side="top" className="max-w-xs z-[60]"><p>Define how incoming Data Point values translate to values for the Target Property. If no mapping, raw (or formatted) value is used.</p></TooltipContent></Tooltip></Label> <Select value={link.valueMapping?.type || '_none_'} onValueChange={(val) => handleMappingTypeChange(index, val)}> <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="_none_" className="text-xs">No Mapping (Direct/Formatted)</SelectItem> <SelectItem value="boolean" className="text-xs">Boolean (True/False Match)</SelectItem> <SelectItem value="enum" className="text-xs">Specific Values (Enum/Exact)</SelectItem><SelectItem value="range" className="text-xs">Range to Value</SelectItem><SelectItem value="threshold" className="text-xs">Threshold to Value</SelectItem></SelectContent> </Select> </div> 
                                                    {/* Boolean Mapping */}
                                                    {link.valueMapping?.type === 'boolean' && (link.valueMapping.mapping?.length || 0) >= 1 && ( <div className="space-y-2 bg-muted/40 dark:bg-gray-800/40 p-2.5 rounded-md"> <div className="flex items-center gap-2"> <Label className="text-xs w-1/3 shrink-0">If DataPoint is TRUE, set Prop to:</Label> <MappedValueInput linkIndex={index} mapIndex={0} field="value" currentValue={link.valueMapping.mapping[0]?.value} targetProperty={selectedTargetPropDef} /> </div> <div className="flex items-center gap-2"> <Label className="text-xs w-1/3 shrink-0">If DataPoint is FALSE, set Prop to:</Label> <MappedValueInput linkIndex={index} mapIndex={1} field="value" currentValue={link.valueMapping.mapping[1]?.value} targetProperty={selectedTargetPropDef} /> </div> </div> )}
                                                    {/* Enum/Exact Mapping */}
                                                    {(link.valueMapping?.type === 'enum' || link.valueMapping?.type === 'exact') && ( <div className="space-y-2.5 bg-muted/40 dark:bg-gray-800/40 p-2.5 rounded-md"> {(link.valueMapping.mapping || []).map((entry, mapIndex) => ( <div key={mapIndex} className="flex items-center space-x-2"> <Input className="h-8 text-xs" value={entry.match ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIndex, 'match', e.target.value)} placeholder="If DP value is..." /> <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0"/> <MappedValueInput linkIndex={index} mapIndex={mapIndex} field="value" currentValue={entry.value} targetProperty={selectedTargetPropDef} /> <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeMappingEntry(index, mapIndex)}><MinusCircle className="h-3.5 w-3.5 text-destructive" /></Button></TooltipTrigger><TooltipContent side="right" className="z-[60]"><p>Remove mapping entry</p></TooltipContent></Tooltip> </div> ))} <Button variant="outline" size="sm" onClick={() => addMappingEntry(index)} className="h-8 text-xs w-full mt-1"><PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Value Match</Button> </div> )}
                                                    {/* Range Mapping */}
                                                    {link.valueMapping?.type === 'range' && ( <div className="space-y-2.5 bg-muted/40 dark:bg-gray-800/40 p-2.5 rounded-md"> {(link.valueMapping.mapping || []).map((entry, mapIndex) => ( <div key={mapIndex} className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto] items-center gap-2"> <Input type="number" className="h-8 text-xs" value={entry.min ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIndex, 'min', e.target.value)} placeholder="Min (DP value)" /> <span className="text-xs text-muted-foreground">&le; DP &lt;</span> <Input type="number" className="h-8 text-xs" value={entry.max ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIndex, 'max', e.target.value)} placeholder="Max (DP value)" /> <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0"/> <MappedValueInput linkIndex={index} mapIndex={mapIndex} field="value" currentValue={entry.value} targetProperty={selectedTargetPropDef} /> <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeMappingEntry(index, mapIndex)}><MinusCircle className="h-3.5 w-3.5 text-destructive" /></Button></TooltipTrigger><TooltipContent side="right" className="z-[60]"><p>Remove range entry</p></TooltipContent></Tooltip> </div> ))} <Button variant="outline" size="sm" onClick={() => addMappingEntry(index)} className="h-8 text-xs w-full mt-1"><PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Range Condition</Button> </div> )}
                                                    {/* Threshold Mapping */}
                                                    {link.valueMapping?.type === 'threshold' && ( <div className="space-y-2.5 bg-muted/40 dark:bg-gray-800/40 p-2.5 rounded-md"> {(link.valueMapping.mapping || []).map((entry, mapIndex) => ( <div key={mapIndex} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"> <Input type="number" className="h-8 text-xs" value={entry.threshold ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIndex, 'threshold', e.target.value)} placeholder="If DP &ge; Threshold" />  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0"/> <MappedValueInput linkIndex={index} mapIndex={mapIndex} field="value" currentValue={entry.value} targetProperty={selectedTargetPropDef} /> <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeMappingEntry(index, mapIndex)}><MinusCircle className="h-3.5 w-3.5 text-destructive" /></Button></TooltipTrigger><TooltipContent side="right" className="z-[60]"><p>Remove threshold entry</p></TooltipContent></Tooltip> </div> ))} <Button variant="outline" size="sm" onClick={() => addMappingEntry(index)} className="h-8 text-xs w-full mt-1"><PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Threshold Condition</Button> <p className="text-[10px] text-muted-foreground p-1">Thresholds are evaluated top-down. First match applies.</p></div> )}
                                                
                                                {/* Default Fallback Value UI */}
                                                {link.valueMapping && link.valueMapping.type !== '_none_' && (
                                                    <div className="mt-2.5 pt-2.5 border-t border-border/40">
                                                        <Label className="text-xs font-medium flex items-center">Default Fallback Value <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="sm" title="Default fallback value information" aria-label="Default fallback value information" className="h-auto w-auto p-0 focus:outline-none"><InfoIconLucide className="w-3 h-3 ml-1.5 text-muted-foreground/70 cursor-help"/></Button></TooltipTrigger><TooltipContent side="top" className="max-w-xs z-[60]"><p>Value to use if data point is null/undefined, or if no other mappings match.</p></TooltipContent></Tooltip></Label>
                                                        <MappedValueInput
                                                            linkIndex={index}
                                                            mapIndex={-1} // Placeholder, not a real mapIndex
                                                            field="defaultValue" // Custom field prop to differentiate
                                                            currentValue={link.valueMapping.defaultValue}
                                                            targetProperty={selectedTargetPropDef}
                                                            isDefaultValueField={true}
                                                        />
                                                    </div>
                                                )}
                                                </div>

                                                <Separator className="my-3" /> <div className="space-y-1.5"> <Label className="text-xs font-medium flex items-center">Display Formatting <Tooltip><TooltipTrigger asChild><button type="button" title="Formatting information" aria-label="Formatting information" className="focus:outline-none"><InfoIconLucide className="w-3 h-3 ml-1.5 text-muted-foreground/70 cursor-help"/></button></TooltipTrigger><TooltipContent side="top" className="max-w-xs z-[60]"><p>How the Data Point's value should be formatted for display, IF the Target Property shows text. This happens BEFORE mapping (for 'match' field of mapping type 'enum'/'exact') and can also apply to the final output if mapping is not used or results in a number/string. Also used by Live Value Preview.</p></TooltipContent></Tooltip></Label> <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 items-start bg-muted/40 dark:bg-gray-800/40 p-2.5 rounded-md"> <div className="space-y-1"> <Label htmlFor={`format-type-${index}`} className="text-[10px] font-medium">Interpret Raw DP As</Label> <Select value={link.format?.type || (dataPoints[link.dataPointId]?.dataType.toLowerCase().includes('bool') ? 'boolean' : dataPoints[link.dataPointId]?.dataType.toLowerCase().includes('int') || dataPoints[link.dataPointId]?.dataType.toLowerCase().includes('float') || dataPoints[link.dataPointId]?.dataType.toLowerCase().includes('double') ? 'number' : dataPoints[link.dataPointId]?.dataType.toLowerCase().includes('date') ? 'dateTime' : 'string')} onValueChange={(val) => handleFormatChange(index, 'type', val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="string" className="text-xs">Text (String)</SelectItem> <SelectItem value="number" className="text-xs">Number</SelectItem> <SelectItem value="boolean" className="text-xs">True/False (Boolean)</SelectItem> <SelectItem value="dateTime" className="text-xs">Date/Time</SelectItem> </SelectContent> </Select> </div> <div> {/* Spacer for grid */} </div> 
                                                {(link.format?.type === 'number' || link.format?.type === 'string') && (<> <FieldInput id={`format-prefix-${index}`} label="Prefix (Optional)" value={link.format?.prefix || ''} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'prefix', e.target.value)} placeholder="e.g., $"/> <FieldInput id={`format-suffix-${index}`} label="Suffix (Optional)" value={link.format?.suffix || ''} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'suffix', e.target.value)} placeholder={link.format?.type === 'number' ? `e.g., ${selectedDataPoint?.unit || 'kW, °C'}` : 'e.g., units'}/> </>)}
                                                {link.format?.type === 'number' && ( <FieldInput type="number" id={`format-precision-${index}`} label="Decimal Places" value={link.format?.precision ?? ''} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'precision', e.target.value === '' ? undefined : parseInt(e.target.value) || 0)} placeholder={`e.g., ${selectedDataPoint?.decimalPlaces ?? 2}`} />)}
                                                {link.format?.type === 'boolean' && ( <> <FieldInput id={`format-true-${index}`} label="Show TRUE as" value={link.format?.trueLabel || 'True'} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'trueLabel', e.target.value)} placeholder="e.g., ON, Active"/> <FieldInput id={`format-false-${index}`} label="Show FALSE as" value={link.format?.falseLabel || 'False'} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'falseLabel', e.target.value)} placeholder="e.g., OFF, Inactive"/> </> )} 
                                                {link.format?.type === 'dateTime' && ( <FieldInput id={`format-dt-${index}`} label="Date/Time Pattern" value={link.format?.dateTimeFormat || 'YYYY-MM-DD HH:mm:ss'} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'dateTimeFormat', e.target.value)} placeholder="e.g., YYYY-MM-DD HH:mm:ss"/> )} 
                                                </div> </div> </> )} </CardContent> </Card> )})} {dataLinks.length > 0 && (<Button variant="outline" size="sm" onClick={addDataLink} className="w-full h-9 text-xs mt-1"><PlusCircle className="h-4 w-4 mr-2" /> Add Another Data Link</Button>)} 
                                </TabsContent>
                            </div>
                        </Tabs>
                    </ScrollArea>
                    <DialogFooter className="p-4 border-t border-border/60 flex-shrink-0 bottom-0 bg-card/95 backdrop-blur-sm z-20">
                        <DialogClose asChild><Button variant="outline" className="w-full sm:w-auto h-9">Cancel</Button></DialogClose>
                        <Button onClick={handleSaveChangesAndClose} className="w-full sm:w-auto h-9"><PencilLine className="h-4 w-4 mr-2" />Apply & Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </TooltipProvider>
        </Dialog>
    );
};

// LabelLayout remains unchanged
const LabelLayout: React.FC<{ icon: React.ElementType, children: React.ReactNode, tooltip?: string }> = ({ icon: Icon, children, tooltip }) => (
    <span className="flex items-center text-xs">
        <Icon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/80" />
        {children}
        {tooltip && (
             <Tooltip>
                <TooltipTrigger asChild><Button type="button" variant="ghost" size="sm" title={tooltip} aria-label={tooltip} className="ml-1 h-auto w-auto p-0 focus:outline-none"><InfoIconLucide className="w-3 h-3 text-muted-foreground/60 cursor-help"/></Button></TooltipTrigger>
                <TooltipContent className="z-[60]"><p>{tooltip}</p></TooltipContent>
            </Tooltip>
        )}
    </span>
);

export default React.memo(SLDInspectorDialog);