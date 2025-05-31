[{
	"resource": "/Users/deeghayuadhikari/Documents/mobiOs/NICAPI/AV-Mini-Grid-Offline-Dashboard/app/circuit/sld/ui/SLDInspectorDialog.tsx",
	"owner": "typescript",
	"code": "2345",
	"severity": 8,
	"message": "Argument of type '{ dataPointId: string; targetProperty: string; format: { precision?: number | undefined; type: \"string\" | \"number\" | \"boolean\" | \"dateTime\"; suffix: string; }; } | undefined' is not assignable to parameter of type 'string | number | boolean | null | undefined'.\n  Type '{ dataPointId: string; targetProperty: string; format: { precision?: number | undefined; type: \"string\" | \"number\" | \"boolean\" | \"dateTime\"; suffix: string; }; }' is not assignable to type 'string | number | boolean | null | undefined'.",
	"source": "ts",
	"startLineNumber": 430,
	"startColumn": 1993,
	"endLineNumber": 430,
	"endColumn": 2176
}]



// components/sld/ui/SLDInspectorDialog.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge, isEdge as isReactFlowEdge } from 'reactflow';
import { Button } from "@/components/ui/button";
import AnimationFlowConfiguratorDialog, {
    DialogAnimationFlowConfig,
    AnimationFlowConfiguratorMode
} from './AnimationFlowConfiguratorDialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataLinkLiveValuePreview from './DataLinkLiveValuePreview';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Trash2, PlusCircle, MinusCircle, X, Info as InfoIconLucide, Sparkles, PencilLine, Link2, Settings2,
    Palmtree, Palette as PaletteIcon, CaseSensitive, AlignLeftIcon, BaselineIcon, Zap as ZapIcon,
    ArrowRight, TestTube2
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    CustomNodeData, CustomFlowEdgeData, DataPoint, DataPointLink, SLDElementType, CustomNodeType, CustomFlowEdge,
    TextLabelNodeData, TextNodeStyleConfig, ContactorNodeData, InverterNodeData, PanelNodeData, BreakerNodeData,
    MeterNodeData, BatteryNodeData, GridNodeData, LoadNodeData, BusbarNodeData, TransformerNodeData,
    GeneratorNodeData, PLCNodeData, SensorNodeData, GenericDeviceNodeData, IsolatorNodeData, ATSNodeData,
    JunctionBoxNodeData, FuseNodeData, GaugeNodeData, BaseNodeData, SwitchNodeData,
    AnimationFlowConfig as EdgeAnimationFlowConfig, GlobalSLDAnimationSettings
} from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ComboboxOption, SearchableSelect } from './SearchableSelect';
import { AVAILABLE_SLD_LAYOUT_IDS } from '@/config/constants';
import { Separator } from '@/components/ui/separator';

// --- START: Target Property Definitions ---
type TargetPropertyValueType = 'string' | 'number' | 'boolean' | 'color' | 'cssDimension' | 'integer' | 'opacity';
interface TargetPropertyDefinition extends ComboboxOption {
    inputHint?: string;
    valueType?: TargetPropertyValueType;
}
const commonTargetProperties: TargetPropertyDefinition[] = [ { value: 'label', label: 'Display Label', description: "Sets the main text label visible on/near the element.", inputHint: "e.g., Main Panel", valueType: 'string' }, { value: 'status', label: 'Device Status (Generic)', description: 'Sets a status string (e.g., "FAULT", "NOMINAL", "OFFLINE"). Drives color/icon in node.', inputHint: "e.g., FAULT, ONLINE", valueType: 'string' }, { value: 'statusText', label: 'Status Text (Descriptive)', description: 'Sets a descriptive text based on data (e.g., "Running", "Tripped", "Offline").', inputHint: "e.g., Generator Running", valueType: 'string' }, { value: 'fillColor', label: 'Fill Color (Background)', description: 'Changes background/fill color. Accepts CSS color strings.', inputHint: "e.g., red, #00FF00, rgba(0,0,255,0.5)", valueType: 'color' }, { value: 'strokeColor', label: 'Stroke/Border Color', description: 'Changes border or line color. Accepts CSS color strings.', inputHint: "e.g., black, #FFFF00", valueType: 'color' }, { value: 'textColor', label: 'Text Color (General)', description: 'Changes color of dynamic text if supported. Accepts CSS color strings.', inputHint: "e.g., white, #333333", valueType: 'color' }, { value: 'visible', label: 'Visibility', description: 'Boolean: true shows the element, false hides it.', inputHint: "true or false", valueType: 'boolean' }, { value: 'opacity', label: 'Opacity', description: 'Numeric (0.0 to 1.0): Sets element opacity.', inputHint: "e.g., 0.7 (0.0-1.0)", valueType: 'number' }, ];
const nodeSpecificTargetProperties: Partial<Record<SLDElementType, TargetPropertyDefinition[]>> = { [SLDElementType.TextLabel]: [ { value: 'text', label: 'Text Content', description: "Sets the text for a TextLabel.", inputHint: "Enter display text", valueType: 'string' }, ], [SLDElementType.DataLabel]: [ { value: 'value', label: 'Data Value', description: "Sets the value to display for a DataLabel.", inputHint: "e.g., 123.45, Active", valueType: 'string' }, ], [SLDElementType.Panel]: [ { value: 'powerOutput', label: 'Panel Power (Display)', description: 'Used by PanelNode to display current power output string (e.g., "150 W").', inputHint: "e.g., 150 W", valueType: 'string'}, { value: 'panel.powerGeneration', label: 'Panel Power (Animation)', description: 'Numeric data for PanelNode animation. Positive values activate animation; magnitude affects speed.', inputHint: "e.g., 150 (numeric for animation)", valueType: 'number'}, ], [SLDElementType.Inverter]: [ { value: 'inverter.powerOutput', label: 'Inverter Power Output', description: 'Displays power value specifically for Inverter nodes.', inputHint: "e.g., 5 kW", valueType: 'string'}, ], [SLDElementType.Breaker]: [ { value: 'breaker.isOpen', label: 'Breaker Open State', description: 'Boolean: true if breaker is open, false if closed.', inputHint: "true (open) or false (closed)", valueType: 'boolean'}, ], [SLDElementType.Contactor]: [ { value: 'contactor.isClosed', label: 'Contactor State (Closed/Open)', description: 'Boolean: true if contactor is closed, false if open. Affects visual representation.', inputHint: "true (closed) or false (open)", valueType: 'boolean'}, ], [SLDElementType.Gauge]: [ { value: 'gaugeValue', label: 'Gauge Value', description: 'The primary numeric value displayed on the gauge.', inputHint: "e.g., 75", valueType: 'number'}, ], };
const edgeTargetProperties: TargetPropertyDefinition[] = [ { value: 'isEnergized', label: 'Edge Energized State', description: 'Boolean: true indicates the edge is energized, affecting visual style.', inputHint: "true or false", valueType: 'boolean' }, ];
function getApplicableTargetProperties(element: CustomNodeType | CustomFlowEdge | null): TargetPropertyDefinition[] { if (!element) return []; let applicableProps: TargetPropertyDefinition[] = [...commonTargetProperties]; if (isNode(element) && element.data) { const nodeType = element.data.elementType; if (nodeType && nodeSpecificTargetProperties[nodeType]) { applicableProps.push(...nodeSpecificTargetProperties[nodeType]!); } } else if (isFlowEdge(element)) { applicableProps.push(...edgeTargetProperties); } const uniqueProps = Array.from(new Map(applicableProps.map(p => [p.value, p])).values()); uniqueProps.sort((a, b) => a.label.localeCompare(b.label)); return uniqueProps; }
// --- END: Target Property Definitions ---

const fontSizes = [ { label: "XXS (8px)", value: "8px" }, { label: "XS (10px)", value: "10px" }, { label: "S (12px)", value: "12px" }, { label: "M (14px)", value: "14px" }, { label: "L (16px)", value: "16px" }, { label: "XL (18px)", value: "18px" }, { label: "2XL (22px)", value: "22px" }, { label: "3XL (26px)", value: "26px" }, ];
const fontWeights = [ { label: "Light (300)", value: "300" }, { label: "Normal (400)", value: "normal" }, { label: "Medium (500)", value: "500" },{ label: "Semi-Bold (600)", value: "600" }, { label: "Bold (700)", value: "bold" }, ];

function isNode(element: any): element is CustomNodeType { return element && 'position' in element && 'data' in element && 'id' in element && !isFlowEdge(element); }
const isFlowEdge = isReactFlowEdge;
const getElementTypeName = (element: CustomNodeType | CustomFlowEdge | null): string => { 
    if (!element) return 'Element';
    if (isNode(element) && element.data) {
        const elementType = element.data.elementType;
        const nameMap: Partial<Record<SLDElementType, string>> = {
            [SLDElementType.TextLabel]: 'Text Label', [SLDElementType.DataLabel]: 'Data Label',
            [SLDElementType.Contactor]: 'Contactor', [SLDElementType.Inverter]: 'Inverter',
            [SLDElementType.Panel]: 'PV Panel', [SLDElementType.Breaker]: 'Breaker/Switch',
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
    onSetGlobalAnimationSettings?: (config: GlobalSLDAnimationSettings) => void;
    currentGlobalAnimationSettings?: GlobalSLDAnimationSettings;
    onConfigureEdgeAnimation?: (edge: CustomFlowEdge) => void;
}

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const SLDInspectorDialog: React.FC<SLDInspectorDialogProps> = ({
    isOpen, onOpenChange, selectedElement, onUpdateElement, onDeleteElement,
    onConfigureEdgeAnimation,
}) => {
    const { dataPoints } = useAppStore((state) => ({
        dataPoints: state.dataPoints,
    }));
    const [formData, setFormData] = useState<Partial<CustomNodeData & CustomFlowEdgeData & { styleConfig?: TextNodeStyleConfig }>>({});
    const [dataLinks, setDataLinks] = useState<DataPointLink[]>([]);
    const [activeTab, setActiveTab] = useState<string>("properties");
    const [devOverrideValues, setDevOverrideValues] = useState<Record<string, string>>({});

    const currentTargetPropertyOptions = useMemo(() => getApplicableTargetProperties(selectedElement), [selectedElement]);

    useEffect(() => { 
        if (isOpen && selectedElement) {
            const elementDataCopy = JSON.parse(JSON.stringify(selectedElement.data ?? {}));
            const initialFormData: Partial<CustomNodeData & CustomFlowEdgeData & { styleConfig?: TextNodeStyleConfig }> = { ...elementDataCopy, label: elementDataCopy.label || '' };
            if (isNode(selectedElement) && selectedElement.data) {
                initialFormData.elementType = selectedElement.data.elementType;
                if (selectedElement.data.elementType === SLDElementType.TextLabel) {
                    (initialFormData as Partial<TextLabelNodeData>).text = (elementDataCopy as TextLabelNodeData).text || '';
                    initialFormData.styleConfig = (elementDataCopy as TextLabelNodeData).styleConfig || {};
                }
                initialFormData.config = elementDataCopy.config && typeof elementDataCopy.config === 'object' ? elementDataCopy.config : {};
            } else if (isFlowEdge(selectedElement)) {
                initialFormData.flowType = elementDataCopy.flowType || '';
                initialFormData.voltageLevel = elementDataCopy.voltageLevel || '';
                initialFormData.currentRatingAmps = elementDataCopy.currentRatingAmps ?? undefined;
                initialFormData.cableType = elementDataCopy.cableType || '';
            }
            setFormData(initialFormData);
            setDataLinks(elementDataCopy.dataPointLinks ?? []);
            if (!["properties", "data_linking"].includes(activeTab)) setActiveTab("properties");
            setDevOverrideValues({});
        } else if (!isOpen) {
            setFormData({});
            setDataLinks([]);
            setDevOverrideValues({});
        }
    }, [selectedElement, isOpen, activeTab]);

    const dataPointOptions = useMemo((): ComboboxOption[] => { 
        return Object.values(dataPoints).map(dp => ({
            value: dp.id,
            label: `${dp.name || dp.label || dp.id}${dp.description ? ` (${dp.description.substring(0,30)}...)` : ''}`,
            description: `ID: ${dp.id} | Type: ${dp.dataType} | Unit: ${dp.unit || 'N/A'}`
        })).sort((a, b) => a.label.localeCompare(b.label));
     }, [dataPoints]);

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = event.target;
        const checked = (event.target as HTMLInputElement).checked;
        setFormData(prev => {
            const newState = JSON.parse(JSON.stringify(prev)); 
            const keys = name.split('.');
            let currentLevel: any = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]] || typeof currentLevel[keys[i]] !== 'object') { currentLevel[keys[i]] = {}; }
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
                if (!currentLevel[keys[i]] || typeof currentLevel[keys[i]] !== 'object') { currentLevel[keys[i]] = {}; }
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = value;
            return newState;
        });
    }, []);
    
    const handleDataLinkChange = useCallback((index: number, field: keyof DataPointLink, value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === index) {
                const updatedLink = { ...link, [field]: value };
                if (field === 'dataPointId') {
                    const selectedDp = dataPoints[value as string];
                    if (selectedDp) {
                        let inferredType: NonNullable<DataPointLink['format']>['type'] = link.format?.type || 'string';
                        const currentSuffix = link.format?.suffix;
                        if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(selectedDp.dataType)) inferredType = 'number';
                        else if (selectedDp.dataType === 'Boolean') inferredType = 'boolean';
                        else if (selectedDp.dataType === 'DateTime') inferredType = 'dateTime';
                        updatedLink.format = { ...(updatedLink.format || { type: inferredType }), type: inferredType };
                        if (selectedDp.unit && inferredType !== 'boolean') { updatedLink.format.suffix = selectedDp.unit; }
                        else if (!selectedDp.unit && inferredType !== 'boolean' && link.dataPointId && dataPoints[link.dataPointId] && currentSuffix === dataPoints[link.dataPointId]?.unit) { delete updatedLink.format.suffix }
                        if (inferredType === 'boolean') { delete updatedLink.format.suffix; delete updatedLink.format.precision; }
                    } else { if (updatedLink.format) { delete updatedLink.format.suffix; delete updatedLink.format.precision; } } // Clear if DP is removed
                }
                return updatedLink;
            }
            return link;
        }));
    }, [dataPoints]);
    const addDataLink = useCallback(() => setDataLinks(prev => [...prev, { dataPointId: '', targetProperty: '' }]), []);
    const removeDataLink = useCallback((index: number) => setDataLinks(prev => prev.filter((_, i) => i !== index)), []);
    const handleMappingTypeChange = useCallback((linkIndex: number, selectedValue: string) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex) {
                if (selectedValue === '_none_') return { ...link, valueMapping: undefined };
                const newMappingType = selectedValue as NonNullable<DataPointLink['valueMapping']>['type'];
                let defaultMapping: any[] = [{ value: '' }]; 
                if (newMappingType === 'boolean') { defaultMapping = [{value:''},{value:''}]; }
                else if (link.valueMapping?.type === newMappingType && link.valueMapping?.mapping && link.valueMapping.mapping.length > 0) { defaultMapping = link.valueMapping.mapping || defaultMapping; }
                else if (newMappingType === 'enum') { defaultMapping = [{match: '', value: ''}]; }
                return { ...link, valueMapping: { ...(link.valueMapping || {}), type: newMappingType, mapping: defaultMapping } };
            }
            return link;
        }));
     }, []);
    const handleMappingEntryChange = useCallback((linkIndex: number, mapIndex: number, field: string, value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping && link.valueMapping.mapping && link.valueMapping.mapping[mapIndex] !== undefined) {
                const newMappingEntries = [...link.valueMapping.mapping];
                let processedValue = value;
                if (field === 'value') {
                    const targetProp = currentTargetPropertyOptions.find(p => p.value === link.targetProperty);
                    if (targetProp?.valueType === 'boolean') {
                        if (String(value).toLowerCase() === 'true') processedValue = true;
                        else if (String(value).toLowerCase() === 'false') processedValue = false;
                    } else if (targetProp?.valueType === 'number' || targetProp?.valueType === 'integer' || targetProp?.valueType === 'opacity') {
                        const num = parseFloat(String(value));
                        processedValue = isNaN(num) ? value : num;
                    }
                }
                newMappingEntries[mapIndex] = { ...newMappingEntries[mapIndex], [field]: processedValue };
                return { ...link, valueMapping: { ...link.valueMapping, mapping: newMappingEntries } };
            }
            return link;
        }));
    }, [currentTargetPropertyOptions]); 
    
    const addMappingEntry = useCallback((linkIndex: number) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping && link.valueMapping.type === 'enum') {
                return { ...link, valueMapping: { ...link.valueMapping, mapping: [...(link.valueMapping.mapping || []), { match: '', value: '' }] } };
            }
            return link;
        }));
    }, []);
    const removeMappingEntry = useCallback((linkIndex: number, mapIndex: number) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping && link.valueMapping.type === 'enum') {
                const newMappingEntries = (link.valueMapping.mapping || []).filter((_, idx) => idx !== mapIndex);
                return { ...link, valueMapping: { ...link.valueMapping, mapping: newMappingEntries } };
            }
            return link;
        }));
    }, []);
    const handleFormatChange = useCallback((linkIndex: number, field: keyof NonNullable<DataPointLink['format']>, value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex) {
                const currentFormat = link.format || { type: 'string' };
                const newFormat = { ...currentFormat, [field]: value };
                if (field === 'type') { 
                    if (value !== 'number') { delete newFormat.precision; if(value !== 'string' && !(link.dataPointId && dataPoints[link.dataPointId]?.unit)) delete newFormat.suffix;} 
                    else if (link.dataPointId && !dataPoints[link.dataPointId]?.unit && value === 'number') delete newFormat.suffix; 
                    if (value !== 'boolean') { delete newFormat.trueLabel; delete newFormat.falseLabel; }
                    if (value !== 'dateTime') delete newFormat.dateTimeFormat;
                }
                return { ...link, format: newFormat };
            }
            return link;
        }));
    }, [dataPoints]);

     const handleDevOverrideChange = useCallback((dataPointId: string, overrideValue: string) => {
        setDevOverrideValues(prev => ({ ...prev, [dataPointId]: overrideValue, }));
    }, []);

    const handleSaveChangesAndClose = useCallback(() => { 
        if (!selectedElement) return;
        const validDataLinks = dataLinks.filter(link => link.dataPointId && link.targetProperty);
        
        // Start with a deep copy of original data to preserve unmanaged fields
        const newElementData = JSON.parse(JSON.stringify(selectedElement.data || {}));

        // Apply common formData fields
        newElementData.label = formData.label || newElementData.label || 'Unnamed Element';
        newElementData.dataPointLinks = validDataLinks.length > 0 ? validDataLinks : undefined;
        newElementData.notes = (formData as BaseNodeData).notes || (newElementData as BaseNodeData).notes;
        newElementData.assetId = (formData as BaseNodeData).assetId || (newElementData as BaseNodeData).assetId;

        // Merge config carefully
        if (formData.config && Object.keys(formData.config).length > 0) {
            newElementData.config = { ...(newElementData.config || {}), ...formData.config };
        } else if (!formData.config && newElementData.config && Object.keys(newElementData.config).length === 0){
             delete newElementData.config; // Remove empty config object if formData.config is not present
        } else if (!formData.config && !newElementData.config){
            delete newElementData.config; // ensure no empty config is added
        }


        if (isNode(selectedElement)) {
            const nodeData = newElementData as CustomNodeData; // Now newElementData is a CustomNodeData type object
            nodeData.elementType = selectedElement.data.elementType; // Ensure elementType is always original
            nodeData.isDrillable = typeof formData.isDrillable === 'boolean' ? formData.isDrillable : selectedElement.data.isDrillable;
            nodeData.subLayoutId = nodeData.isDrillable ? formData.subLayoutId : (selectedElement.data.isDrillable ? selectedElement.data.subLayoutId : undefined);

            if (selectedElement.data.elementType === SLDElementType.TextLabel) {
                (nodeData as TextLabelNodeData).text = (formData as Partial<TextLabelNodeData>).text ?? (selectedElement.data as TextLabelNodeData).text ?? '';
                // Merge styleConfig
                if (formData.styleConfig && Object.keys(formData.styleConfig).length > 0) {
                    (nodeData as TextLabelNodeData).styleConfig = { ...((selectedElement.data as TextLabelNodeData).styleConfig || {}), ...formData.styleConfig };
                } else if (!(selectedElement.data as TextLabelNodeData).styleConfig){
                    delete (nodeData as TextLabelNodeData).styleConfig;
                }
            }
            // For Gauge and other nodes with properties outside 'config', ensure they are correctly merged if changed via formData
            if (selectedElement.data.elementType === SLDElementType.Gauge) {
                if ((formData.config as GaugeNodeData['config'])?.valueDataPointLink) {
                    (nodeData as GaugeNodeData).config!.valueDataPointLink = (formData.config as GaugeNodeData['config'])!.valueDataPointLink;
                } else if ((formData.config as GaugeNodeData['config'])?.valueDataPointLink === undefined && formData.config && 'valueDataPointLink' in formData.config) {
                     // if valueDataPointLink was explicitly set to undefined/null in formData config for Gauge
                    if((nodeData as GaugeNodeData).config) {
                        delete (nodeData as GaugeNodeData).config!.valueDataPointLink;
                    }
                }
            }
        } else { // isFlowEdge(selectedElement)
            const edgeData = newElementData as CustomFlowEdgeData;
            edgeData.flowType = (formData as Partial<CustomFlowEdgeData>).flowType ?? edgeData.flowType;
            edgeData.voltageLevel = (formData as Partial<CustomFlowEdgeData>).voltageLevel ?? edgeData.voltageLevel;
            edgeData.currentRatingAmps = (formData as Partial<CustomFlowEdgeData>).currentRatingAmps ?? edgeData.currentRatingAmps;
            edgeData.cableType = (formData as Partial<CustomFlowEdgeData>).cableType ?? edgeData.cableType;
            edgeData.animationSettings = (formData as Partial<CustomFlowEdgeData>).animationSettings ?? edgeData.animationSettings;
            edgeData.isEnergized = typeof (formData as Partial<CustomFlowEdgeData>).isEnergized === 'boolean' 
                                ? (formData as Partial<CustomFlowEdgeData>).isEnergized 
                                : edgeData.isEnergized;
            edgeData.status = (formData as Partial<CustomFlowEdgeData>).status ?? edgeData.status;
        }
        onUpdateElement({ ...selectedElement, data: newElementData }); 
        onOpenChange(false);
    }, [selectedElement, formData, dataLinks, onUpdateElement, onOpenChange]);

    const handleDeleteAndClose = useCallback(() => { 
        if (selectedElement) { onDeleteElement(selectedElement.id); onOpenChange(false); }
    }, [selectedElement, onDeleteElement, onOpenChange]);
    const handleAnimationConfigurationFromDialog = ( 
        config: DialogAnimationFlowConfig, _applyTo: AnimationFlowConfiguratorMode
    ) => {
        if (selectedElement && isFlowEdge(selectedElement)) {
            const newEdgeAnimationSettings: EdgeAnimationFlowConfig = {
                animationType: config.animationType, generationDataPointId: config.generationDataPointId,
                usageDataPointId: config.usageDataPointId, gridNetFlowDataPointId: config.gridNetFlowDataPointId,
                speedMultiplier: config.speedMultiplier, invertFlowDirection: config.invertFlowDirection,
                constantFlowDirection: config.constantFlowDirection, constantFlowSpeed: config.constantFlowSpeed,
                constantFlowActivationDataPointId: config.constantFlowActivationDataPointId,
                dynamicMagnitudeDataPointId: config.dynamicMagnitudeDataPointId,
                minDynamicDuration: config.minDynamicDuration, maxDynamicDuration: config.maxDynamicDuration, 
                dynamicSpeedBaseDivisor: config.dynamicSpeedBaseDivisor, 
                minConstantDuration: config.minConstantDuration, maxConstantDuration: config.maxConstantDuration, 
            };
            setFormData(prevFormData => ({ ...prevFormData, animationSettings: newEdgeAnimationSettings, }));
            if (newEdgeAnimationSettings.animationType !== 'none') {
                setDataLinks(prevDataLinks => prevDataLinks.filter(link => !['isEnergized', 'flowDirection', 'animationSpeedFactor'].includes(link.targetProperty)) );
            }
        }
    };

    if (!isOpen || !selectedElement) return null;
    const elementTypeUserFriendly = getElementTypeName(selectedElement);
    const currentElementNodeSLDType = isNode(selectedElement) && selectedElement.data ? selectedElement.data.elementType : undefined;
    const actionableElementTypes: SLDElementType[] = [ SLDElementType.Breaker, SLDElementType.Contactor, SLDElementType.Fuse, SLDElementType.Isolator, SLDElementType.ATS ];
    
    const FieldInput = ({ id, label, value, onChange, type = "text", placeholder, name: fieldName, as: Component = Input, tooltip, children, info, ...props }: any) => (
        <div className="space-y-1.5"> <div className="flex items-center justify-between"> <Label htmlFor={id} className="text-xs font-medium text-muted-foreground flex items-center gap-1"> {label} {info && <Tooltip><TooltipTrigger type="button" className="focus:outline-none"><InfoIconLucide className="w-3 h-3 text-muted-foreground/70 cursor-help"/></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p>{info}</p></TooltipContent></Tooltip>} </Label> {tooltip && !info && ( <Tooltip> <TooltipTrigger type="button" className="focus:outline-none"><InfoIconLucide className="w-3 h-3 text-muted-foreground/70 cursor-help"/></TooltipTrigger> <TooltipContent side="left" className="max-w-xs"><p>{tooltip}</p></TooltipContent> </Tooltip> )} </div> <Component type={type} id={id} name={fieldName || id} value={value ?? ''} onChange={onChange} placeholder={placeholder} className="h-8 text-xs" {...props} /> {children && <div className="text-xs text-muted-foreground pt-0.5">{children}</div>} </div>
    );
    const LabelLayout: React.FC<{ icon: React.ElementType, children: React.ReactNode, tooltip?: string }> = ({ icon: Icon, children, tooltip }) => (
        <span className="flex items-center text-xs"> <Icon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/80" /> {children} {tooltip && ( <Tooltip> <TooltipTrigger asChild><button type="button" title={tooltip} aria-label={tooltip} className="ml-1 focus:outline-none"><InfoIconLucide className="w-3 h-3 text-muted-foreground/60 cursor-help"/></button></TooltipTrigger> <TooltipContent><p>{tooltip}</p></TooltipContent> </Tooltip> )} </span>
    );

    const getMappingValueInputHint = (targetPropertyKey: string | undefined): string => {
        if (!targetPropertyKey) return "Output value (e.g. true, 100, active)";
        const propDef = currentTargetPropertyOptions.find(p => p.value === targetPropertyKey);
        return propDef?.inputHint || "Enter output value";
    };

    const MappedValueInput: React.FC<{ linkIndex: number; mapIndex: number; field: 'value'; currentValue: any; targetProperty?: TargetPropertyDefinition;}> = ({ linkIndex, mapIndex, field, currentValue, targetProperty }) => {
        const placeholder = targetProperty?.inputHint || "Enter target value";
        const valueType = targetProperty?.valueType;
        if (valueType === 'boolean') { return ( <Select value={currentValue === undefined ? '_undef_' : String(currentValue)} onValueChange={(val) => { const processedVal = val === '_undef_' ? undefined : (val === 'true'); handleMappingEntryChange(linkIndex, mapIndex, field, processedVal); }} > <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder={placeholder} /></SelectTrigger> <SelectContent> <SelectItem value="_undef_" className="text-xs text-muted-foreground italic">Undefined</SelectItem> <SelectItem value="true" className="text-xs">True</SelectItem> <SelectItem value="false" className="text-xs">False</SelectItem> </SelectContent> </Select> ); }
        if (valueType === 'number' || valueType === 'integer' || valueType === 'opacity') { return ( <Input type="number" className="h-8 text-xs flex-1" value={currentValue === undefined ? '' : String(currentValue)} onChange={(e) => handleMappingEntryChange(linkIndex, mapIndex, field, e.target.value)} placeholder={placeholder} step={valueType === 'opacity' ? "0.1" : (valueType === 'integer' ? "1" : "any")} min={valueType === 'opacity' ? "0" : undefined} max={valueType === 'opacity' ? "1" : undefined} /> ); }
        if (valueType === 'color') { return ( <div className="flex items-center gap-2 flex-1"> <Input type="color" className="h-8 w-8 p-0.5 border-input rounded-md shrink-0" value={String(currentValue || '#000000')} onChange={(e) => handleMappingEntryChange(linkIndex, mapIndex, field, e.target.value)} /> <Input type="text" className="h-8 text-xs flex-1" value={String(currentValue || '')} onChange={(e) => handleMappingEntryChange(linkIndex, mapIndex, field, e.target.value)} placeholder={placeholder} /> </div> ); }
        return ( <Input className="h-8 text-xs flex-1" value={String(currentValue ?? '')} onChange={(e) => handleMappingEntryChange(linkIndex, mapIndex, field, e.target.value)} placeholder={placeholder} /> );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <TooltipProvider delayDuration={200}>
                <DialogContent className="max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] xl:max-h-[85vh] flex flex-col p-0 shadow-2xl rounded-lg border-border/70 bg-card">
                    <DialogHeader className="p-4 border-b border-border/60 flex flex-row justify-between items-center sticky top-0 bg-card/95 backdrop-blur-sm z-20"> <div className='space-y-0.5'> <DialogTitle className="text-lg font-semibold flex items-center"> <PencilLine className="w-5 h-5 mr-2 text-primary" /> Configure {elementTypeUserFriendly} </DialogTitle> <DialogDescription className="text-xs text-muted-foreground pl-[28px]">Element ID: <span className="font-mono">{selectedElement.id}</span></DialogDescription> </div> <div className="flex items-center space-x-2"> <Tooltip><TooltipTrigger asChild><Button variant="destructive" size="icon" onClick={handleDeleteAndClose} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Delete this {elementTypeUserFriendly.toLowerCase()}</p></TooltipContent></Tooltip> <DialogClose asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close dialog"> <X className="h-5 w-5" /> </Button></DialogClose> </div> </DialogHeader>
                    <ScrollArea className="flex-grow overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0" id="inspector-scroll-area">
                        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-11 sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b border-border/60 rounded-none"> <TabsTrigger value="properties" className="text-sm font-medium data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none h-full"><Settings2 className="w-4 h-4 mr-2" />Properties</TabsTrigger> <TabsTrigger value="data_linking" className="text-sm font-medium data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none h-full"><Link2 className="w-4 h-4 mr-2" />Data Linking</TabsTrigger> </TabsList>
                            <div className="p-4 md:p-5 lg:p-6">
                                <TabsContent value="properties" className="mt-0 space-y-5 outline-none">
                                    {/* --- Basic Info Card --- */}
                                    <Card className='shadow-md border-border/60'> <CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Basic Information</CardTitle></CardHeader> <CardContent className='p-3.5 pt-0 space-y-3'> <FieldInput id="label" label="Display Label / Name" value={formData.label || ''} onChange={handleInputChange} name="label" placeholder="e.g., Main Inverter" tooltip="The primary name shown on the diagram for this element."/> </CardContent> </Card>
                                    
                                    {/* === ALL YOUR ORIGINAL ELEMENT-SPECIFIC CONFIGURATION CARDS (RESTORED) === */}
                                    {isNode(selectedElement) && actionableElementTypes.includes(currentElementNodeSLDType as SLDElementType) && ( <Card className='shadow-md border-border/60'> <CardHeader className='p-3.5'><CardTitle className='text-base font-semibold flex items-center'><ZapIcon className="w-4 h-4 mr-2 text-orange-500" />Control Configuration</CardTitle></CardHeader> <CardContent className='p-3.5 pt-0 space-y-3'> <FieldInput id="config.controlNodeId" name="config.controlNodeId" label="Control OPC UA Node ID" value={formData.config?.controlNodeId || ''} as={SearchableSelect} options={dataPointOptions.filter(dp => dataPoints[dp.value]?.isWritable)} onChange={(value: string | null) => handleSelectChange('config.controlNodeId', value || undefined)} placeholder="Search & Select Writable Data Point..." searchPlaceholder="Type to search..." notFoundText="No writable data points found." info="OPC UA node to write to for controlling this element." /> {formData.config?.controlNodeId && dataPoints[formData.config.controlNodeId] && (<p className="text-xs text-muted-foreground pt-1">Selected: {dataPoints[formData.config.controlNodeId].name} (ID: {formData.config.controlNodeId})</p> )} </CardContent> </Card> )}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.TextLabel && ( <Card className='shadow-md border-border/60'> <CardHeader className='p-3.5'><CardTitle className='text-base font-semibold flex items-center'><Palmtree className="w-4 h-4 mr-2 text-green-500" />Text Content & Appearance</CardTitle></CardHeader> <CardContent className='p-3.5 pt-0 space-y-3'> <FieldInput id="text" name="text" label="Static Text Content" value={(formData as TextLabelNodeData).text || ''} onChange={handleInputChange} placeholder="Enter text for the label" as="textarea" rows={3} info="The text that will be displayed on this label."/> <Separator /> <h4 className="text-sm font-medium text-muted-foreground pt-1">Styling:</h4> <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 items-end"> <div className="space-y-1"> <Label htmlFor="styleConfig.fontSize" className="text-xs flex items-center"><BaselineIcon className="w-3.5 h-3.5 mr-1" />Font Size</Label> <Select value={(formData.styleConfig)?.fontSize || '14px'} onValueChange={(val) => handleSelectChange("styleConfig.fontSize", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontSizes.map(fs => <SelectItem key={fs.value} value={fs.value} className="text-xs">{fs.label}</SelectItem>)}</SelectContent> </Select> </div> <div className="space-y-1"> <Label htmlFor="styleConfig.fontWeight" className="text-xs flex items-center"><CaseSensitive className="w-3.5 h-3.5 mr-1" />Font Weight</Label> <Select value={String((formData.styleConfig)?.fontWeight || 'normal')} onValueChange={(val) => handleSelectChange("styleConfig.fontWeight", ['300', '500', '600', '700'].includes(val) ? parseInt(val) : val )}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontWeights.map(fw => <SelectItem key={fw.value} value={String(fw.value)} className="text-xs">{fw.label}</SelectItem>)}</SelectContent> </Select> </div> <div className="space-y-1"> <Label htmlFor="styleConfig.fontStyle" className="text-xs">Font Style</Label> <Select value={(formData.styleConfig)?.fontStyle || 'normal'} onValueChange={(val) => handleSelectChange("styleConfig.fontStyle", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="normal" className="text-xs">Normal</SelectItem><SelectItem value="italic" className="text-xs">Italic</SelectItem></SelectContent> </Select> </div> <FieldInput name="styleConfig.color" id="styleConfig.color" label={<LabelLayout icon={PaletteIcon}>Text Color</LabelLayout>} type="color" value={(formData.styleConfig)?.color || '#000000'} onChange={handleInputChange} className="h-8 p-0.5 border-input rounded-md w-full" /> <FieldInput name="styleConfig.backgroundColor" id="styleConfig.backgroundColor" label="BG Color" type="color" value={(formData.styleConfig)?.backgroundColor || '#00000000'} onChange={handleInputChange} className="h-8 p-0.5 border-input rounded-md w-full" title="Background color (transparent by default)" /> <div className="space-y-1"> <Label htmlFor="styleConfig.textAlign" className="text-xs flex items-center"><AlignLeftIcon className="w-3.5 h-3.5 mr-1" />Align</Label> <Select value={(formData.styleConfig)?.textAlign || 'left'} onValueChange={(val) => handleSelectChange("styleConfig.textAlign", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="left" className="text-xs">Left</SelectItem><SelectItem value="center" className="text-xs">Center</SelectItem><SelectItem value="right" className="text-xs">Right</SelectItem></SelectContent> </Select> </div> <FieldInput name="styleConfig.padding" id="styleConfig.padding" label="Padding" placeholder="e.g., 2px 4px" value={(formData.styleConfig)?.padding || '2px'} onChange={handleInputChange} className="col-span-full md:col-span-1" info="CSS padding value (e.g., 2px, 2px 4px)"/> </div> </CardContent> </Card> )}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Inverter && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Inverter Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput type="number" id="config.ratedPower" name="config.ratedPower" label="Rated Power (kW)" value={(formData.config as InverterNodeData['config'])?.ratedPower ?? ''} onChange={handleInputChange} placeholder="e.g., 5" step="0.1" min="0" info="Nominal rated power of the inverter in kilowatts."/></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Contactor && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Contactor Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><div className="space-y-1"> <Label htmlFor="config.normallyOpen" className="text-xs">Default Contact Type</Label> <Select value={String((formData.config as ContactorNodeData['config'])?.normallyOpen ?? true)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="true" className="text-xs">Normally Open (NO)</SelectItem><SelectItem value="false" className="text-xs">Normally Closed (NC)</SelectItem></SelectContent> </Select> </div></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Panel && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>PV Panel Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><div className="space-y-1"> <Label htmlFor="config.technology" className="text-xs">Technology</Label> <Select value={(formData.config as PanelNodeData['config'])?.technology || ''} onValueChange={(val) => handleSelectChange("config.technology", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select technology..." /></SelectTrigger> <SelectContent><SelectItem value="Mono-Si" className="text-xs">Mono-Si</SelectItem><SelectItem value="Poly-Si" className="text-xs">Poly-Si</SelectItem><SelectItem value="Thin-film" className="text-xs">Thin-film</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.powerRatingWp" name="config.powerRatingWp" label="Power Rating (Wp)" value={(formData.config as PanelNodeData['config'])?.powerRatingWp ?? ''} onChange={handleInputChange} placeholder="e.g., 300" min="0" info="Peak power rating in Watt-peak." /></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Breaker && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Breaker Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><div className="space-y-1"> <Label htmlFor="config.type" className="text-xs">Type</Label> <Select value={(formData.config as BreakerNodeData['config'])?.type || ''} onValueChange={(val) => handleSelectChange("config.type", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type..." /></SelectTrigger> <SelectContent><SelectItem value="MCB">MCB</SelectItem><SelectItem value="MCCB">MCCB</SelectItem><SelectItem value="ACB">ACB</SelectItem><SelectItem value="VCB">VCB</SelectItem><SelectItem value="SF6">SF6</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.tripRatingAmps" name="config.tripRatingAmps" label="Trip Rating (Amps)" value={(formData.config as BreakerNodeData['config'])?.tripRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 100" min="0" /><FieldInput type="number" id="config.interruptingCapacitykA" name="config.interruptingCapacitykA" label="Interrupting Capacity (kA)" value={(formData.config as BreakerNodeData['config'])?.interruptingCapacitykA ?? ''} onChange={handleInputChange} placeholder="e.g., 10" min="0" /><div className="space-y-1"> <Label htmlFor="config.normallyOpen" className="text-xs">Default State</Label> <Select value={String((formData.config as BreakerNodeData['config'])?.normallyOpen ?? false)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="false" className="text-xs">Normally Closed (NC)</SelectItem><SelectItem value="true" className="text-xs">Normally Open (NO)</SelectItem></SelectContent> </Select> </div></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Meter && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Meter Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><div className="space-y-1"> <Label htmlFor="config.meterType" className="text-xs">Meter Type</Label> <Select value={(formData.config as MeterNodeData['config'])?.meterType || ''} onValueChange={(val) => handleSelectChange("config.meterType", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select meter type..." /></SelectTrigger> <SelectContent><SelectItem value="Energy" className="text-xs">Energy Meter</SelectItem><SelectItem value="PowerQuality" className="text-xs">Power Quality Meter</SelectItem><SelectItem value="SubMeter" className="text-xs">Sub-Meter</SelectItem></SelectContent> </Select> </div><FieldInput id="config.accuracyClass" name="config.accuracyClass" label="Accuracy Class" value={(formData.config as MeterNodeData['config'])?.accuracyClass ?? ''} onChange={handleInputChange} placeholder="e.g., 0.5S" /></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Battery && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Battery Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><div className="space-y-1"> <Label htmlFor="config.technology" className="text-xs">Technology</Label> <Select value={(formData.config as BatteryNodeData['config'])?.technology || ''} onValueChange={(val) => handleSelectChange("config.technology", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select technology..." /></SelectTrigger> <SelectContent><SelectItem value="Li-ion">Li-ion</SelectItem><SelectItem value="Lead-Acid">Lead-Acid</SelectItem><SelectItem value="Flow">Flow Battery</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.capacityAh" name="config.capacityAh" label="Capacity (Ah)" value={(formData.config as BatteryNodeData['config'])?.capacityAh ?? ''} onChange={handleInputChange} placeholder="e.g., 1000" min="0"/><FieldInput type="number" id="config.voltageNominalV" name="config.voltageNominalV" label="Nominal Voltage (V)" value={(formData.config as BatteryNodeData['config'])?.voltageNominalV ?? ''} onChange={handleInputChange} placeholder="e.g., 48" min="0"/><FieldInput type="number" id="config.dodPercentage" name="config.dodPercentage" label="Depth of Discharge (%)" value={(formData.config as BatteryNodeData['config'])?.dodPercentage ?? ''} onChange={handleInputChange} placeholder="e.g., 80" min="0" max="100"/></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Grid && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Grid Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput id="config.voltageLevel" name="config.voltageLevel" label="Voltage Level (kV)" value={(formData.config as GridNodeData['config'])?.voltageLevel ?? ''} onChange={handleInputChange} placeholder="e.g., 11kV, 33kV, LT" /><div className="space-y-1"> <Label htmlFor="config.frequencyHz" className="text-xs">Frequency (Hz)</Label> <Select value={String((formData.config as GridNodeData['config'])?.frequencyHz || '50')} onValueChange={(val) => handleSelectChange("config.frequencyHz", parseFloat(val))}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="50">50 Hz</SelectItem><SelectItem value="60">60 Hz</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.faultLevelMVA" name="config.faultLevelMVA" label="Fault Level (MVA)" value={(formData.config as GridNodeData['config'])?.faultLevelMVA ?? ''} onChange={handleInputChange} placeholder="e.g., 500" min="0"/></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Load && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Load Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><div className="space-y-1"> <Label htmlFor="config.loadType" className="text-xs">Load Type</Label> <Select value={(formData.config as LoadNodeData['config'])?.loadType || ''} onValueChange={(val) => handleSelectChange("config.loadType", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select load type..." /></SelectTrigger> <SelectContent><SelectItem value="Resistive">Resistive</SelectItem><SelectItem value="Inductive">Inductive</SelectItem><SelectItem value="Capacitive">Capacitive</SelectItem><SelectItem value="Motor">Motor</SelectItem><SelectItem value="Lighting">Lighting</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.ratedPowerkW" name="config.ratedPowerkW" label="Rated Power (kW)" value={(formData.config as LoadNodeData['config'])?.ratedPowerkW ?? ''} onChange={handleInputChange} placeholder="e.g., 10" min="0"/><FieldInput type="number" id="config.powerFactor" name="config.powerFactor" label="Power Factor" value={(formData.config as LoadNodeData['config'])?.powerFactor ?? ''} onChange={handleInputChange} placeholder="e.g., 0.85" min="0" max="1" step="0.01"/></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Busbar && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Busbar Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><div className="space-y-1"> <Label htmlFor="config.material" className="text-xs">Material</Label> <Select value={(formData.config as BusbarNodeData['config'])?.material || ''} onValueChange={(val) => handleSelectChange("config.material", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select material..." /></SelectTrigger> <SelectContent><SelectItem value="Copper">Copper</SelectItem><SelectItem value="Aluminum">Aluminum</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.currentRatingAmps" name="config.currentRatingAmps" label="Current Rating (Amps)" value={(formData.config as BusbarNodeData['config'])?.currentRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 1000" min="0"/><FieldInput type="number" id="config.width" name="config.width" label="Width (px for display)" value={(formData.config as BusbarNodeData['config'])?.width ?? ''} onChange={handleInputChange} placeholder="e.g., 150" min="10"/><FieldInput type="number" id="config.height" name="config.height" label="Height (px for display)" value={(formData.config as BusbarNodeData['config'])?.height ?? ''} onChange={handleInputChange} placeholder="e.g., 12" min="5"/></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Transformer && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Transformer Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput id="config.ratingMVA" name="config.ratingMVA" label="Rating (MVA)" value={(formData.config as TransformerNodeData['config'])?.ratingMVA ?? ''} onChange={handleInputChange} placeholder="e.g., 1.5" /><FieldInput id="config.primaryVoltage" name="config.primaryVoltage" label="Primary Voltage (kV)" value={(formData.config as TransformerNodeData['config'])?.primaryVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 11kV" /><FieldInput id="config.secondaryVoltage" name="config.secondaryVoltage" label="Secondary Voltage (kV)" value={(formData.config as TransformerNodeData['config'])?.secondaryVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 0.433kV" /><FieldInput id="config.vectorGroup" name="config.vectorGroup" label="Vector Group" value={(formData.config as TransformerNodeData['config'])?.vectorGroup ?? ''} onChange={handleInputChange} placeholder="e.g., Dyn11" /><FieldInput type="number" id="config.impedancePercentage" name="config.impedancePercentage" label="Impedance (%)" value={(formData.config as TransformerNodeData['config'])?.impedancePercentage ?? ''} onChange={handleInputChange} placeholder="e.g., 5" min="0" step="0.1"/></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Generator && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Generator Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><div className="space-y-1"> <Label htmlFor="config.fuelType" className="text-xs">Fuel Type</Label> <Select value={(formData.config as GeneratorNodeData['config'])?.fuelType || ''} onValueChange={(val) => handleSelectChange("config.fuelType", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select fuel type..." /></SelectTrigger> <SelectContent><SelectItem value="Diesel">Diesel</SelectItem><SelectItem value="Gas">Natural Gas</SelectItem><SelectItem value="Hydro">Hydro</SelectItem><SelectItem value="Wind">Wind</SelectItem></SelectContent> </Select> </div><FieldInput id="config.ratingKVA" name="config.ratingKVA" label="Rating (kVA)" value={(formData.config as GeneratorNodeData['config'])?.ratingKVA ?? ''} onChange={handleInputChange} placeholder="e.g., 500" /><FieldInput id="config.outputVoltage" name="config.outputVoltage" label="Output Voltage (V)" value={(formData.config as GeneratorNodeData['config'])?.outputVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 415V" /></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.PLC && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>PLC Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput id="config.model" name="config.model" label="Model" value={(formData.config as PLCNodeData['config'])?.model ?? ''} onChange={handleInputChange} placeholder="e.g., Siemens S7-1500" /><FieldInput id="config.ipAddress" name="config.ipAddress" label="IP Address" value={(formData.config as PLCNodeData['config'])?.ipAddress ?? ''} onChange={handleInputChange} placeholder="e.g., 192.168.1.10" /></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Sensor && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Sensor Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><div className="space-y-1"> <Label htmlFor="config.sensorType" className="text-xs">Sensor Type</Label> <Select value={(formData.config as SensorNodeData['config'])?.sensorType || ''} onValueChange={(val) => handleSelectChange("config.sensorType", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select sensor type..." /></SelectTrigger> <SelectContent><SelectItem value="Temperature">Temperature</SelectItem><SelectItem value="Irradiance">Irradiance</SelectItem><SelectItem value="WindSpeed">Wind Speed</SelectItem><SelectItem value="Pressure">Pressure</SelectItem><SelectItem value="Flow">Flow</SelectItem></SelectContent> </Select> </div><FieldInput id="config.measurementRange" name="config.measurementRange" label="Measurement Range" value={(formData.config as SensorNodeData['config'])?.measurementRange ?? ''} onChange={handleInputChange} placeholder="e.g., 0-100°C, 0-10 bar" /></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.GenericDevice && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Generic Device Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput id="config.deviceType" name="config.deviceType" label="Device Type/Name" value={(formData.config as GenericDeviceNodeData['config'])?.deviceType ?? ''} onChange={handleInputChange} placeholder="e.g., UPS, VFD, Custom Relay" /><FieldInput id="config.iconName" name="config.iconName" label="Lucide Icon Name (optional)" value={(formData.config as GenericDeviceNodeData['config'])?.iconName ?? ''} onChange={handleInputChange} placeholder="e.g., Zap, Fan, Server" /></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Isolator && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Isolator Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput type="number" id="config.poles" name="config.poles" label="Number of Poles" value={(formData.config as IsolatorNodeData['config'])?.poles ?? ''} onChange={handleInputChange} placeholder="e.g., 3 or 4" min="1" /><div className="space-y-1"> <Label htmlFor="config.loadBreak" className="text-xs">Load Break Capability</Label> <Select value={String((formData.config as IsolatorNodeData['config'])?.loadBreak ?? false)} onValueChange={(val) => handleSelectChange("config.loadBreak", val === 'true')}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent> </Select> </div><div className="space-y-1"> <Label htmlFor="config.manualOrMotorized" className="text-xs">Operation Type</Label> <Select value={(formData.config as IsolatorNodeData['config'])?.manualOrMotorized || 'manual'} onValueChange={(val) => handleSelectChange("config.manualOrMotorized", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="motorized">Motorized</SelectItem></SelectContent> </Select> </div></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.ATS && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>ATS Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput type="number" id="config.transferTimeMs" name="config.transferTimeMs" label="Transfer Time (ms)" value={(formData.config as ATSNodeData['config'])?.transferTimeMs ?? ''} onChange={handleInputChange} placeholder="e.g., 50" min="0" /><FieldInput type="number" id="config.numPoles" name="config.numPoles" label="Number of Poles" value={(formData.config as ATSNodeData['config'])?.numPoles ?? ''} onChange={handleInputChange} placeholder="e.g., 4" min="1" /></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.JunctionBox && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Junction Box Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput id="config.material" name="config.material" label="Material" value={(formData.config as JunctionBoxNodeData['config'])?.material ?? ''} onChange={handleInputChange} placeholder="e.g., Polycarbonate, Metal" /><FieldInput id="config.ipRating" name="config.ipRating" label="IP Rating" value={(formData.config as JunctionBoxNodeData['config'])?.ipRating ?? ''} onChange={handleInputChange} placeholder="e.g., IP65" /><FieldInput type="number" id="config.numberOfStrings" name="config.numberOfStrings" label="Number of Strings" value={(formData.config as JunctionBoxNodeData['config'])?.numberOfStrings ?? ''} onChange={handleInputChange} placeholder="e.g., 4" min="1" /></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Fuse && (<Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Fuse Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput type="number" id="config.ratingAmps" name="config.ratingAmps" label="Rating (Amps)" value={(formData.config as FuseNodeData['config'])?.ratingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 63" min="0" /><FieldInput id="config.voltageRating" name="config.voltageRating" label="Voltage Rating (V)" value={(formData.config as FuseNodeData['config'])?.voltageRating ?? ''} onChange={handleInputChange} placeholder="e.g., 415V, 690V" /><div className="space-y-1"> <Label htmlFor="config.fuseType" className="text-xs">Fuse Type</Label> <Select value={(formData.config as FuseNodeData['config'])?.fuseType || ''} onValueChange={(val) => handleSelectChange("config.fuseType", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select fuse type..." /></SelectTrigger> <SelectContent><SelectItem value="Cartridge">Cartridge</SelectItem><SelectItem value="HRC">HRC</SelectItem><SelectItem value="Rewireable">Rewireable</SelectItem><SelectItem value="Semiconductor">Semiconductor Protection</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.breakingCapacitykA" name="config.breakingCapacitykA" label="Breaking Capacity (kA)" value={(formData.config as FuseNodeData['config'])?.breakingCapacitykA ?? ''} onChange={handleInputChange} placeholder="e.g., 80" min="0" /></CardContent></Card>)}
                                    {isNode(selectedElement) && currentElementNodeSLDType === SLDElementType.Gauge && (<> <Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Gauge Display Configuration</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput type="number" id="config.minVal" name="config.minVal" label="Minimum Value" value={(formData.config as GaugeNodeData['config'])?.minVal ?? ''} onChange={handleInputChange} placeholder="e.g., 0" info="The lowest value the gauge can display."/><FieldInput type="number" id="config.maxVal" name="config.maxVal" label="Maximum Value" value={(formData.config as GaugeNodeData['config'])?.maxVal ?? ''} onChange={handleInputChange} placeholder="e.g., 100" info="The highest value the gauge can display."/><FieldInput id="config.unit" name="config.unit" label="Unit" value={(formData.config as GaugeNodeData['config'])?.unit ?? ''} onChange={handleInputChange} placeholder="e.g., %, kW, °C" info="The unit of measurement to display with the value."/></CardContent></Card> <Card className='shadow-md border-border/60'><CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Gauge Value Data Point</CardTitle></CardHeader><CardContent className='p-3.5 pt-0 space-y-3'><FieldInput id="config.valueDataPointLink.dataPointId" name="config.valueDataPointLink.dataPointId" label="Value Data Point"  value={(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.dataPointId || ''}  onChange={(value: string | null) => { const selectedDp = value ? dataPoints[value] : null; let inferredType: NonNullable<DataPointLink['format']>['type'] = 'number'; if (selectedDp) { if (selectedDp.dataType === 'Boolean') inferredType = 'boolean'; else if (selectedDp.dataType === 'DateTime') inferredType = 'dateTime'; else if (selectedDp.dataType === 'String') inferredType = 'string'; } handleSelectChange("config.valueDataPointLink", value ? { dataPointId: value, targetProperty: 'value', format: { type: inferredType, suffix: selectedDp?.unit || '', ...(inferredType === 'number' && { precision: 2 }) } } : undefined); }} as={SearchableSelect} options={dataPointOptions} placeholder="Search & Select Data Point for Gauge Value..." searchPlaceholder="Type to search..." notFoundText="No data points found." info="Select the data point that will drive the gauge's value."/>{(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.dataPointId && dataPoints[(formData.config as GaugeNodeData['config'])!.valueDataPointLink!.dataPointId!] && ( <p className="text-xs text-muted-foreground pt-1">Selected: {dataPoints[(formData.config as GaugeNodeData['config'])!.valueDataPointLink!.dataPointId!].name}</p> )}</CardContent></Card></>)}
                                    {/* !!! END OF RESTORED PROPERTY CARDS SECTION !!! */}

                                    {/* Edge Specific Configuration */}
                                    {isFlowEdge(selectedElement) && ( <Card className='shadow-md border-border/60'> <CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Connection Configuration</CardTitle></CardHeader> <CardContent className='p-3.5 pt-0 space-y-3'> <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3"> <div className="space-y-1"> <Label htmlFor="flowType" className="text-xs">Flow Type</Label> <Select value={formData.flowType || ''} onValueChange={(val) => handleSelectChange("flowType", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger> <SelectContent><SelectItem value="AC">AC Power</SelectItem><SelectItem value="DC">DC Power</SelectItem><SelectItem value="CONTROL_SIGNAL">Control Signal</SelectItem><SelectItem value="DATA_BUS">Data Bus</SelectItem></SelectContent> </Select> </div> <div className="space-y-1"> <Label htmlFor="voltageLevel" className="text-xs">Voltage Level</Label> <Select value={formData.voltageLevel || ''} onValueChange={(val) => handleSelectChange("voltageLevel", val)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger> <SelectContent><SelectItem value="HV">High Voltage</SelectItem><SelectItem value="MV">Medium Voltage</SelectItem><SelectItem value="LV">Low Voltage</SelectItem><SelectItem value="ELV">Extra Low Voltage</SelectItem></SelectContent> </Select> </div> <FieldInput type="number" id="currentRatingAmps" name="currentRatingAmps" label="Current Rating (Amps)" value={formData.currentRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 250" min="0" /> <FieldInput id="cableType" name="cableType" label="Cable Type / Size" value={formData.cableType ?? ''} onChange={handleInputChange} placeholder="e.g., XLPE 3C x 185mm²" /> </div> <Separator className="my-3.5" /> <Button variant="outline" size="sm" className="w-full h-9" onClick={() => { if (isFlowEdge(selectedElement) && onConfigureEdgeAnimation) { onConfigureEdgeAnimation(selectedElement); } }} disabled={!onConfigureEdgeAnimation}><ZapIcon className="w-4 h-4 mr-2" />Configure Animated Flow</Button> </CardContent> </Card> )}
                                    {/* Drilldown Link Configuration */}
                                    {isNode(selectedElement) && ( <Card className='shadow-md border-border/60'> <CardHeader className='p-3.5'><CardTitle className='text-base font-semibold'>Drilldown Link (Optional)</CardTitle></CardHeader> <CardContent className='p-3.5 pt-0 space-y-3'> <div className="flex items-center space-x-2 pt-1"> <Input type="checkbox" id="isDrillable" name="isDrillable" checked={!!formData.isDrillable} onChange={handleInputChange} className="h-4 w-4 accent-primary shrink-0" /> <Label htmlFor="isDrillable" className="text-sm font-normal cursor-pointer">Enable drilldown to another SLD layout?</Label> </div> {formData.isDrillable && ( <div className="space-y-1.5 pt-2 pl-6 border-l-2 border-primary/20 ml-2"> <Label htmlFor="subLayoutId" className="text-xs font-medium">Target Sub-Layout ID <span className="text-red-500">*</span></Label> <Select value={formData.subLayoutId || ''} onValueChange={(value) => handleSelectChange("subLayoutId", value)}> <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select target SLD layout..." /></SelectTrigger> <SelectContent>{AVAILABLE_SLD_LAYOUT_IDS.filter(id => selectedElement && id !== selectedElement.id).map(id => (<SelectItem key={id} value={id} className="text-xs">{id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>))}</SelectContent> </Select> {formData.subLayoutId && <p className="text-xs text-muted-foreground pt-0.5">Selected target: {formData.subLayoutId}</p>} {!formData.subLayoutId && <p className="text-xs text-destructive pt-0.5">Please select a target layout for drilldown.</p>} </div> )} </CardContent> </Card> )}
                                </TabsContent>

                                {/* --- Data Linking Tab (Enhanced Version) --- */}
                                <TabsContent value="data_linking" className="mt-0 space-y-5 outline-none">
                                     {dataLinks.length === 0 && ( <div className="text-center py-10 px-6 bg-muted/20 dark:bg-gray-800/20 rounded-lg border border-dashed border-border/40"> <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/60" /> <h3 className="mt-2.5 text-md font-semibold text-foreground">No Data Links Yet</h3> <p className="mt-1 text-sm text-muted-foreground">Make this element dynamic by linking its properties to real-time data points.</p> <Button variant="default" size="sm" onClick={addDataLink} className="mt-5 h-9 text-xs px-4"><PlusCircle className="h-4 w-4 mr-2" /> Add First Data Link</Button> </div> )}
                                    {dataLinks.map((link, index) => {
                                        const selectedDataPoint = link.dataPointId ? dataPoints[link.dataPointId] : null;
                                        const selectedTargetPropDef = currentTargetPropertyOptions.find(p => p.value === link.targetProperty);
                                        
                                        return (
                                        <Card key={index} className='shadow-md border-border/60 bg-card overflow-hidden'> {/* Using index as key as dataPointId might be empty temporarily */}
                                            <CardHeader className="p-3 flex flex-row justify-between items-center bg-muted/30 dark:bg-gray-800/30 border-b border-border/60"> <div className="flex items-center gap-2"> <Link2 className="h-4 w-4 text-primary flex-shrink-0" /> <h3 className="font-medium text-sm">Data Link #{index + 1} {selectedDataPoint && selectedTargetPropDef && (<span className="text-xs text-muted-foreground font-normal ml-1.5 hidden sm:inline">(<span className="font-semibold">{selectedDataPoint.name || selectedDataPoint.id.substring(0,8)}</span> <ArrowRight className="inline h-3 w-3 mx-0.5 text-primary/70"/> <span className="font-semibold">{selectedTargetPropDef.label}</span>)</span>)}</h3></div> <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDataLink(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TooltipTrigger><TooltipContent><p>Remove this data link</p></TooltipContent></Tooltip> </CardHeader>
                                            <CardContent className='p-3 md:p-4 space-y-4'>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                                    <div className="space-y-1"> <Label htmlFor={`dataPointId-${index}`} className="text-xs font-medium">Data Point Source</Label> <SearchableSelect options={dataPointOptions} value={link.dataPointId || ''} onChange={(value) => handleDataLinkChange(index, 'dataPointId', value || '')} placeholder="Search & Select Data Point..." searchPlaceholder="Type to search data points..." notFoundText="No data points found."/> 
                                                        {selectedDataPoint && (
                                                            <div className="mt-1.5 space-y-1">
                                                                <DataLinkLiveValuePreview dataPointId={link.dataPointId} valueMapping={link.valueMapping} format={link.format} />
                                                                {IS_DEVELOPMENT && link.dataPointId && ( /* Show only if DP selected */
                                                                    <div className="relative">
                                                                        <TestTube2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500" />
                                                                        <Input type="text" placeholder="Dev Override Value..." value={devOverrideValues[link.dataPointId] || ''} onChange={(e) => handleDevOverrideChange(link.dataPointId, e.target.value)} className="h-7 text-xs pl-7 bg-amber-500/10 border-amber-500/30 focus:border-amber-500"/>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1"> <Label htmlFor={`targetProperty-${index}`} className="text-xs font-medium">Target Element Property</Label> <SearchableSelect options={currentTargetPropertyOptions} value={link.targetProperty || ''} onChange={(val) => handleDataLinkChange(index, 'targetProperty', val)} placeholder="Select property to influence..." searchPlaceholder='Search properties...' notFoundText='No properties found.'/> {selectedTargetPropDef && (<p className="text-xs text-muted-foreground pt-1 leading-tight"><span className="font-semibold">Affects:</span> {selectedTargetPropDef.description}</p>)}</div>
                                                </div>
                                                {link.dataPointId && link.targetProperty && ( <>
                                                     <Separator className="my-3" />
                                                    <div className="space-y-2.5">
                                                        <div className="flex justify-between items-center">
                                                            <Label className="text-xs font-medium flex items-center">Value Mapping <Tooltip><TooltipTrigger asChild><button type="button" title="Value mapping information" aria-label="Value mapping information" className="focus:outline-none"><InfoIconLucide className="w-3 h-3 ml-1.5 text-muted-foreground/70 cursor-help"/></button></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p>Define how incoming Data Point values translate to values for the Target Property. If no mapping, raw (or formatted) value is used.</p></TooltipContent></Tooltip></Label>
                                                            <Select value={link.valueMapping?.type || '_none_'} onValueChange={(val) => handleMappingTypeChange(index, val)}> <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="_none_" className="text-xs">No Mapping (Direct)</SelectItem> <SelectItem value="boolean" className="text-xs">Boolean (True/False)</SelectItem> <SelectItem value="enum" className="text-xs">Specific Values (Enum)</SelectItem> </SelectContent> </Select>
                                                        </div>
                                                        {link.valueMapping?.type === 'boolean' && link.valueMapping.mapping?.length === 2 && ( 
                                                            <div className="space-y-2 bg-muted/40 dark:bg-gray-800/40 p-2.5 rounded-md"> 
                                                                <div className="flex items-center gap-2"> <Label htmlFor={`map-val-true-${index}`} className="text-xs w-1/3 shrink-0">When DataPoint is TRUE, set to:</Label> 
                                                                    <MappedValueInput linkIndex={index} mapIndex={0} field="value" currentValue={link.valueMapping.mapping[0]?.value} targetProperty={selectedTargetPropDef} />
                                                                </div> 
                                                                <div className="flex items-center gap-2"> <Label htmlFor={`map-val-false-${index}`} className="text-xs w-1/3 shrink-0">When DataPoint is FALSE, set to:</Label> 
                                                                    <MappedValueInput linkIndex={index} mapIndex={1} field="value" currentValue={link.valueMapping.mapping[1]?.value} targetProperty={selectedTargetPropDef} />
                                                                </div> 
                                                            </div> 
                                                        )}
                                                        {link.valueMapping?.type === 'enum' && ( <div className="space-y-2.5 bg-muted/40 dark:bg-gray-800/40 p-2.5 rounded-md"> {(link.valueMapping.mapping || []).map((entry, mapIndex) => ( <div key={mapIndex} className="flex items-center space-x-2"> <Input className="h-8 text-xs" value={entry.match || ''} onChange={(e) => handleMappingEntryChange(index, mapIndex, 'match', e.target.value)} placeholder="If DP value is..." /> <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0"/> 
                                                            <MappedValueInput linkIndex={index} mapIndex={mapIndex} field="value" currentValue={entry.value} targetProperty={selectedTargetPropDef} />
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeMappingEntry(index, mapIndex)}><MinusCircle className="h-3.5 w-3.5 text-destructive" /></Button></TooltipTrigger><TooltipContent><p>Remove mapping entry</p></TooltipContent></Tooltip> </div> ))} <Button variant="outline" size="sm" onClick={() => addMappingEntry(index)} className="h-8 text-xs w-full mt-1"><PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Value Match</Button> </div> )}
                                                    </div>
                                                    <Separator className="my-3" />
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium flex items-center">Display Formatting <Tooltip><TooltipTrigger asChild><button type="button" title="Formatting information" aria-label="Formatting information" className="focus:outline-none"><InfoIconLucide className="w-3 h-3 ml-1.5 text-muted-foreground/70 cursor-help"/></button></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p>How the Data Point's value should be formatted for display, IF the Target Property shows text. This happens BEFORE mapping.</p></TooltipContent></Tooltip></Label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 items-start bg-muted/40 dark:bg-gray-800/40 p-2.5 rounded-md">
                                                            <div className="space-y-1"> <Label htmlFor={`format-type-${index}`} className="text-[10px] font-medium">Interpret As</Label> <Select value={link.format?.type || (selectedDataPoint ? (dataPoints[selectedDataPoint.id]?.dataType === 'Boolean' ? 'boolean' : (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32'].includes(dataPoints[selectedDataPoint.id]?.dataType) ? 'number' : 'string') ) : 'string')} onValueChange={(val) => handleFormatChange(index, 'type', val)}> <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="string" className="text-xs">Text (String)</SelectItem> <SelectItem value="number" className="text-xs">Number</SelectItem> <SelectItem value="boolean" className="text-xs">True/False (Boolean)</SelectItem> <SelectItem value="dateTime" className="text-xs">Date/Time</SelectItem> </SelectContent> </Select> </div>
                                                            <div> {/* Spacer for grid */} </div>
                                                            {link.format?.type === 'number' && ( <> <FieldInput type="number" id={`format-precision-${index}`} name={`format-precision-${index}`} label="Decimal Places" value={link.format?.precision ?? ''} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'precision', e.target.value === '' ? undefined : parseInt(e.target.value) || 0)} placeholder="e.g., 2" /> <FieldInput id={`format-suffix-${index}`} name={`format-suffix-${index}`} label="Unit/Suffix" value={link.format?.suffix || (selectedDataPoint && dataPoints[selectedDataPoint.id]?.unit) ||''} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'suffix', e.target.value)} placeholder="e.g., kW, °C"/> </> )}
                                                            {link.format?.type === 'boolean' && ( <> <FieldInput id={`format-true-${index}`} name={`format-true-${index}`} label="Show TRUE as" value={link.format?.trueLabel || 'True'} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'trueLabel', e.target.value)} placeholder="e.g., ON, Active"/> <FieldInput id={`format-false-${index}`} name={`format-false-${index}`} label="Show FALSE as" value={link.format?.falseLabel || 'False'} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'falseLabel', e.target.value)} placeholder="e.g., OFF, Inactive"/> </> )}
                                                            {link.format?.type === 'string' && ( <FieldInput id={`format-str-suffix-${index}`} name={`format-str-suffix-${index}`} label="Suffix (Optional)" value={link.format?.suffix || ''} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'suffix', e.target.value)} placeholder="e.g., !" /> )}
                                                            {link.format?.type === 'dateTime' && ( <FieldInput id={`format-dt-${index}`} name={`format-dt-${index}`} label="Date/Time Pattern" value={link.format?.dateTimeFormat || ''} onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleFormatChange(index, 'dateTimeFormat', e.target.value)} placeholder="e.g., YYYY-MM-DD HH:mm:ss"/> )}
                                                        </div>
                                                    </div>
                                                </> )}
                                            </CardContent>
                                        </Card>
                                        )
                                    })}
                                    {dataLinks.length > 0 && (<Button variant="outline" size="sm" onClick={addDataLink} className="w-full h-9 text-xs mt-1"><PlusCircle className="h-4 w-4 mr-2" /> Add Another Data Link</Button>)}
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

const LabelLayout: React.FC<{ icon: React.ElementType, children: React.ReactNode, tooltip?: string }> = ({ icon: Icon, children, tooltip }) => (
    <span className="flex items-center text-xs">
        <Icon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/80" />
        {children}
        {tooltip && (
             <Tooltip>
                <TooltipTrigger asChild><button type="button" title={tooltip} aria-label={tooltip} className="ml-1 focus:outline-none"><InfoIconLucide className="w-3 h-3 text-muted-foreground/60 cursor-help"/></button></TooltipTrigger>
                <TooltipContent><p>{tooltip}</p></TooltipContent>
            </Tooltip>
        )}
    </span>
);

export default React.memo(SLDInspectorDialog);