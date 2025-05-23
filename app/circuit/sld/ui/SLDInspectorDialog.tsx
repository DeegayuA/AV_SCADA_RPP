// components/sld/ui/SLDInspectorDialog.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge, isEdge } from 'reactflow';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, PlusCircle, MinusCircle, X, Info, Sparkles, PencilLine, Link2, Settings2, Palmtree, Palette as PaletteIcon, CaseSensitive, AlignLeftIcon, BaselineIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    CustomNodeData, CustomFlowEdgeData, DataPoint,
    DataPointLink, SLDElementType, CustomNodeType, CustomFlowEdge,
    TextLabelNodeData, TextNodeStyleConfig,
    ContactorNodeData, InverterNodeData, PanelNodeData, BreakerNodeData, MeterNodeData,
    BatteryNodeData, GridNodeData, LoadNodeData, BusbarNodeData, TransformerNodeData,
    GeneratorNodeData, PLCNodeData, SensorNodeData, GenericDeviceNodeData, IsolatorNodeData,
    ATSNodeData, JunctionBoxNodeData, FuseNodeData,
    BaseNodeData, // Import BaseNodeData for common properties
} from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ComboboxOption, SearchableSelect } from './SearchableSelect'; // Ensure this component is robust
import { AVAILABLE_SLD_LAYOUT_IDS } from '@/config/constants';

interface SLDInspectorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedElement: CustomNodeType | CustomFlowEdge | null;
    onUpdateElement: (element: CustomNodeType | CustomFlowEdge) => void;
    onDeleteElement: (elementId: string) => void;
}

// --- Helper Data and Functions ---
const targetPropertiesOptions: ComboboxOption[] = [
    { value: 'label', label: 'Display Label', description: "Sets the main text label visible on/near the element." },
    { value: 'text', label: 'Static Text (TextLabel)', description: "Sets the primary static text content for a TextLabel node." },
    { value: 'value', label: 'Data Value (DataLabel)', description: 'Displays the raw or formatted data point value for DataLabel.' },
    { value: 'statusText', label: 'Status Text', description: 'Sets a descriptive text based on data (e.g., "Running", "Tripped").' },
    { value: 'fillColor', label: 'Fill Color', description: 'Changes background/fill color (e.g., node body, shape interior).' },
    { value: 'strokeColor', label: 'Stroke/Border Color', description: 'Changes border or edge line color.' },
    { value: 'textColor', label: 'Text Color (General)', description: 'Changes the color of dynamic text (like data values) if supported.' },
    { value: 'visible', label: 'Visibility', description: 'Shows or hides the element based on boolean data (true=visible, false=hidden).' },
    { value: 'opacity', label: 'Opacity', description: 'Sets element opacity (0.0 to 1.0). Map numeric data directly.'},
    { value: 'flowDirection', label: 'Flow Direction (Edge)', description: 'Animates edge: "forward", "reverse", or "none". Typically for power flow.' },
    { value: 'animationSpeedFactor', label: 'Animation Speed Factor (Edge)', description: 'Multiplies base edge animation speed (e.g., 0.5, 1, 2). Higher = faster.' },
    { value: 'currentLoadPercent', label: 'Load Percentage (Edge/Device)', description: 'Represents load from 0-100%. Can affect visuals like animation speed or color intensity.' },
    { value: 'isEnergized', label: 'Energized State (Edge/Device)', description: 'Boolean: true if energized, false if de-energized. Affects color/animation.'},
    { value: 'status', label: 'Device Status (Generic)', description: 'General status string e.g., "FAULT", "WARNING", "NOMINAL", "OFFLINE". Can drive color changes.' },
    // Node-specific potentially:
    { value: 'inverter.powerOutput', label: 'Inverter Power Output', description: 'Displays power value specifically for Inverter nodes.' },
    { value: 'breaker.isOpen', label: 'Breaker Open State', description: 'Boolean: true if breaker is open, false if closed.'},
    // Add more properties as your system grows and components support them
];

const fontSizes = [
    { label: "XXS (8px)", value: "8px" }, { label: "XS (10px)", value: "10px" }, 
    { label: "S (12px)", value: "12px" }, { label: "M (14px)", value: "14px" }, 
    { label: "L (16px)", value: "16px" }, { label: "XL (18px)", value: "18px" }, 
    { label: "2XL (22px)", value: "22px" }, { label: "3XL (26px)", value: "26px" },
];
const fontWeights = [
    { label: "Light (300)", value: "300" }, { label: "Normal (400)", value: "normal" }, 
    { label: "Medium (500)", value: "500" },{ label: "Semi-Bold (600)", value: "600" },
    { label: "Bold (700)", value: "bold" },
];


function isNode(element: any): element is CustomNodeType {
    return element && 'position' in element && 'data' in element && 'id' in element;
}

// function isEdge(element: any): element is CustomFlowEdge { // Already defined, assuming correct
//     return element && 'source' in element && 'target' in element && 'id' in element;
// }

const getElementTypeName = (element: CustomNodeType | CustomFlowEdge | null): string => {
    if (!element) return 'Element';
    if (isNode(element)) {
        switch (element.data?.elementType) {
            case SLDElementType.TextLabel: return 'Text Label';
            case SLDElementType.DataLabel: return 'Data Label';
            case SLDElementType.Contactor: return 'Contactor';
            case SLDElementType.Inverter: return 'Inverter';
            case SLDElementType.Panel: return 'PV Panel';
            case SLDElementType.Breaker: return 'Breaker/Switch';
            case SLDElementType.Meter: return 'Meter';
            case SLDElementType.Battery: return 'Battery System';
            case SLDElementType.Grid: return 'Grid Connection';
            case SLDElementType.Load: return 'Electrical Load';
            case SLDElementType.Busbar: return 'Busbar';
            case SLDElementType.Transformer: return 'Transformer';
            case SLDElementType.Generator: return 'Generator';
            case SLDElementType.PLC: return 'PLC';
            case SLDElementType.Sensor: return 'Sensor';
            case SLDElementType.GenericDevice: return 'Generic Device';
            case SLDElementType.Isolator: return 'Isolator';
            case SLDElementType.ATS: return 'ATS';
            case SLDElementType.JunctionBox: return 'Junction Box';
            case SLDElementType.Fuse: return 'Fuse';
            default: 
                const typeName = (element.data as BaseNodeData)?.elementType || 'Unknown Node';
                return typeName.charAt(0).toUpperCase() + typeName.slice(1) + ' Component';
        }
    }
    if (isEdge(element)) return 'Connection Line';
    return 'Diagram Element';
};

// --- Main Component ---
const SLDInspectorDialog: React.FC<SLDInspectorDialogProps> = ({
    isOpen, onOpenChange, selectedElement, onUpdateElement, onDeleteElement
}) => {
    const { dataPoints } = useAppStore((state) => ({ dataPoints: state.dataPoints }));
    
    const [formData, setFormData] = useState<Partial<CustomNodeData & CustomFlowEdgeData & { styleConfig?: TextNodeStyleConfig }>>({});
    const [dataLinks, setDataLinks] = useState<DataPointLink[]>([]);
    const [activeTab, setActiveTab] = useState<string>("properties");

    useEffect(() => {
        if (isOpen && selectedElement) {
            const elementDataCopy = JSON.parse(JSON.stringify(selectedElement.data ?? {}));
            
            const initialFormData: Partial<CustomNodeData & CustomFlowEdgeData & { styleConfig?: TextNodeStyleConfig }> = {
                ...elementDataCopy,
                label: elementDataCopy.label || '',
            };

            if (isNode(selectedElement)) {
                initialFormData.elementType = selectedElement.data.elementType;
                if (selectedElement.data.elementType === SLDElementType.TextLabel) {
                    (initialFormData as Partial<TextLabelNodeData>).text = (elementDataCopy as TextLabelNodeData).text || '';
                    initialFormData.styleConfig = (elementDataCopy as TextLabelNodeData).styleConfig || {};
                }
                // Ensure config is an object for all node types
                initialFormData.config = elementDataCopy.config && typeof elementDataCopy.config === 'object' 
                                         ? elementDataCopy.config 
                                         : {};
            } else if (isEdge(selectedElement)) {
                 // For edges, ensure specific properties are initialized if not present
                initialFormData.flowType = elementDataCopy.flowType || '';
                initialFormData.voltageLevel = elementDataCopy.voltageLevel || '';
                initialFormData.currentRatingAmps = elementDataCopy.currentRatingAmps ?? '';
                initialFormData.cableType = elementDataCopy.cableType || '';
            }


            setFormData(initialFormData);
            setDataLinks(elementDataCopy.dataPointLinks ?? []);
            setActiveTab("properties");
        } else if (!isOpen) {
            setFormData({});
            setDataLinks([]);
        }
    }, [selectedElement, isOpen]);

    const dataPointOptions = useMemo((): ComboboxOption[] =>
        Object.values(dataPoints).map(dp => ({
            value: dp.id,
            label: `${dp.name || dp.id}${dp.description ? ` - ${dp.description}` : ''}`,
            description: `ID: ${dp.id} | Type: ${dp.dataType} | Unit: ${dp.unit || 'N/A'}`
        })).sort((a, b) => a.label.localeCompare(b.label)),
        [dataPoints]);

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = event.target;
        const checked = (event.target as HTMLInputElement).checked;

        setFormData(prev => {
            const newState = JSON.parse(JSON.stringify(prev)); 
            const keys = name.split('.'); 
            let currentLevel: any = newState;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]] || typeof currentLevel[keys[i]] !== 'object') {
                    currentLevel[keys[i]] = {}; 
                }
                currentLevel = currentLevel[keys[i]];
            }
            
            let parsedValue: string | number | boolean = value;
            if (type === 'checkbox') parsedValue = checked;
            else if (type === 'number') {
                if (value === '') parsedValue = ''; 
                else parsedValue = parseFloat(value); 
                if (isNaN(parsedValue as number) && value !== '') parsedValue = value; 
            }
            
            currentLevel[keys[keys.length - 1]] = parsedValue;
            return newState;
        });
    }, []);

    const handleSelectChange = useCallback((name: string, value: string | boolean | number | null | undefined) => {
        setFormData(prev => {
            const newState = JSON.parse(JSON.stringify(prev)); 
            const keys = name.split('.');
            let currentLevel: any = newState;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]] || typeof currentLevel[keys[i]] !== 'object') {
                    currentLevel[keys[i]] = {};
                }
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = value;
            return newState;
        });
    }, []);
    
    const handleDataLinkChange = useCallback((index: number, field: keyof DataPointLink, value: any) => {
        setDataLinks(prevLinks => {
            const newLinks = prevLinks.map((link, i) => {
                if (i === index) {
                    const updatedLink = { ...link, [field]: value };
                    if (field === 'dataPointId') {
                        const selectedDp = dataPoints[value as string];
                        if (selectedDp) {
                            let inferredType: NonNullable<DataPointLink['format']>['type'] = 'string';
                            if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(selectedDp.dataType)) inferredType = 'number';
                            else if (selectedDp.dataType === 'Boolean') inferredType = 'boolean';
                            else if (selectedDp.dataType === 'DateTime') inferredType = 'dateTime';
                            
                            updatedLink.format = { 
                                ...(updatedLink.format || {}), 
                                type: inferredType,
                                suffix: selectedDp.unit || updatedLink.format?.suffix 
                            };
                            if (inferredType === 'boolean' && updatedLink.format) {
                               delete updatedLink.format.suffix; 
                               delete updatedLink.format.precision;
                            }
                        } else { 
                            if (updatedLink.format) { 
                                delete updatedLink.format.suffix;
                                delete updatedLink.format.precision;
                            }
                        }
                    }
                    return updatedLink;
                }
                return link;
            });
            return newLinks;
        });
    }, [dataPoints]);

    const addDataLink = useCallback(() => setDataLinks(prev => [...prev, { dataPointId: '', targetProperty: '' }]), []);
    const removeDataLink = useCallback((index: number) => setDataLinks(prev => prev.filter((_, i) => i !== index)), []);
    
    const handleMappingTypeChange = useCallback((linkIndex: number, selectedValue: string) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex) {
                if (selectedValue === '_none_') {
                    return { ...link, valueMapping: undefined };
                }
                const newMappingType = selectedValue as NonNullable<DataPointLink['valueMapping']>['type'];
                return { 
                    ...link, 
                    valueMapping: { 
                        ...(link.valueMapping || {}), 
                        type: newMappingType, 
                        mapping: newMappingType === 'boolean' ? [{value: ''},{value: ''}] : [] 
                    } 
                };
            }
            return link;
        }));
    }, []);

    const handleMappingEntryChange = useCallback((linkIndex: number, mapIndex: number, field: string, value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping) {
                const newMappingEntries = [...link.valueMapping.mapping];
                newMappingEntries[mapIndex] = { ...newMappingEntries[mapIndex], [field]: value };
                return { ...link, valueMapping: { ...link.valueMapping, mapping: newMappingEntries }};
            }
            return link;
        }));
    }, []);

    const addMappingEntry = useCallback((linkIndex: number) => {
            setDataLinks(prevLinks => prevLinks.map((link, i) => {
                if (i === linkIndex && link.valueMapping) {
                    return { ...link, valueMapping: { ...link.valueMapping, mapping: [...link.valueMapping.mapping, { value: '' }] }};
                }
                return link;
            }));
        }, []);
    
    const removeMappingEntry = useCallback((linkIndex: number, mapIndex: number) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping) {
                const newMappingEntries = link.valueMapping.mapping.filter((_, idx) => idx !== mapIndex);
                return { ...link, valueMapping: { ...link.valueMapping, mapping: newMappingEntries }};
            }
            return link;
        }));
    }, []);
    
    const handleFormatChange = useCallback((linkIndex: number, field: keyof NonNullable<DataPointLink['format']>, value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex) {
                return { ...link, format: { ...(link.format || { type: 'string'}), [field]: value } };
            }
            return link;
        }));
    }, []);

    const handleSaveChangesAndClose = useCallback(() => {
        if (!selectedElement) return;
        const validDataLinks = dataLinks.filter(link => link.dataPointId && link.targetProperty);
        
        let updatedElementData: CustomNodeData | CustomFlowEdgeData;

        if (isNode(selectedElement)) {
            const commonNodeData: Partial<BaseNodeData> = {
                label: formData.label || selectedElement.data?.label || 'Unnamed Element',
                elementType: selectedElement.data.elementType,
                dataPointLinks: validDataLinks.length > 0 ? validDataLinks : undefined,
                config: formData.config && Object.keys(formData.config).length > 0 ? formData.config : undefined,
                isDrillable: !!formData.isDrillable,
                subLayoutId: formData.isDrillable ? formData.subLayoutId : undefined,
            };

            if (selectedElement.data.elementType === SLDElementType.TextLabel) {
                updatedElementData = {
                    ...commonNodeData,
                    elementType: SLDElementType.TextLabel,
                    text: (formData as Partial<TextLabelNodeData>).text || '',
                    styleConfig: (formData as Partial<TextLabelNodeData>).styleConfig && Object.keys((formData as Partial<TextLabelNodeData>).styleConfig!).length > 0 
                                 ? (formData as Partial<TextLabelNodeData>).styleConfig 
                                 : undefined,
                } as TextLabelNodeData;
            } else {
                updatedElementData = { ...commonNodeData, elementType: selectedElement.data.elementType } as CustomNodeData;
            }
        } else { 
            updatedElementData = {
                label: formData.label || selectedElement.data?.label || undefined,
                dataPointLinks: validDataLinks.length > 0 ? validDataLinks : undefined,
                flowType: (formData as Partial<CustomFlowEdgeData>).flowType,
                voltageLevel: (formData as Partial<CustomFlowEdgeData>).voltageLevel,
                currentRatingAmps: (formData as Partial<CustomFlowEdgeData>).currentRatingAmps,
                cableType: (formData as Partial<CustomFlowEdgeData>).cableType,
                isEnergized: !!(formData as Partial<CustomFlowEdgeData>).isEnergized,
            } as CustomFlowEdgeData;
        }
        
        onUpdateElement({ ...selectedElement, data: updatedElementData as any }); 
        onOpenChange(false);
    }, [selectedElement, formData, dataLinks, onUpdateElement, onOpenChange]);

    const handleDeleteAndClose = useCallback(() => {
        if (selectedElement) {
            onDeleteElement(selectedElement.id);
            onOpenChange(false);
        }
    }, [selectedElement, onDeleteElement, onOpenChange]);

    if (!isOpen || !selectedElement) return null;

    const elementTypeUserFriendly = getElementTypeName(selectedElement);
    const currentElementType = isNode(selectedElement) ? selectedElement.data.elementType : undefined;

    const renderDataLinkCard = (link: DataPointLink, index: number) => (
        <Card key={index} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border-border/60 bg-card">
            <CardHeader className="p-3 bg-muted/30 border-b border-border/60 flex flex-row justify-between items-center">
                <CardTitle className="text-sm font-semibold flex items-center">
                    <Link2 className="w-4 h-4 mr-2 text-primary" />
                    Data Link {index + 1}
                </CardTitle>
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDataLink(index)}>
                                <MinusCircle className="h-4 w-4 text-destructive hover:text-destructive/80" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Remove this Data Link</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label htmlFor={`dp-select-${index}`} className="text-xs font-medium">Data Point <span className="text-red-500">*</span></Label>
                        <SearchableSelect options={dataPointOptions} value={link.dataPointId || ''} onChange={(value) => handleDataLinkChange(index, 'dataPointId', value)} placeholder="Search & Select Data Point..." searchPlaceholder="Type to search..." notFoundText="No data points found." />
                        {link.dataPointId && dataPoints[link.dataPointId] && <p className="text-xs text-muted-foreground pt-1">Type: {dataPoints[link.dataPointId].dataType}, Unit: {dataPoints[link.dataPointId].unit || "N/A"}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`target-prop-${index}`} className="text-xs font-medium">Target Property <span className="text-red-500">*</span></Label>
                        <SearchableSelect options={targetPropertiesOptions} value={link.targetProperty || ''} onChange={(value) => handleDataLinkChange(index, 'targetProperty', value)} placeholder="Select Property to Affect..." searchPlaceholder="Type to search..." notFoundText="No properties found." />
                        {link.targetProperty && <p className="text-xs text-muted-foreground pt-1">{targetPropertiesOptions.find(o => o.value === link.targetProperty)?.description}</p>}
                    </div>
                </div>
                <Separator className="my-3" />
                <div className="space-y-2">
                    <Label className="text-xs font-medium flex justify-between items-center">
                        Value Mapping (Optional)
                        <TooltipProvider delayDuration={100}><Tooltip>
                            <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs"><p>Transform data point values before they affect the target property. E.g., map 0/1 to "red"/"green", or numeric ranges to status strings.</p></TooltipContent>
                        </Tooltip></TooltipProvider>
                    </Label>
                    <Select value={link.valueMapping?.type ?? '_none_'} onValueChange={(value) => handleMappingTypeChange(index, value)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Mapping Type..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_none_">No Mapping (Use Direct Value)</SelectItem>
                            <SelectItem value="exact">Exact Match (String/Number)</SelectItem>
                            <SelectItem value="range">Numeric Range</SelectItem>
                            <SelectItem value="threshold">Numeric Threshold (Value &gt;= X)</SelectItem>
                            <SelectItem value="boolean">Boolean (True/False to Values)</SelectItem>
                        </SelectContent>
                    </Select>
                    {link.valueMapping && link.valueMapping.type && link.valueMapping.type !== '_none_' && (
                        <div className="pl-2 mt-2 space-y-2 border-l-2 border-primary/20 ">
                            {link.valueMapping.mapping?.map((mapEntry, mapIdx) => (
                                <div key={mapIdx} className="flex gap-2 items-center text-xs p-2 bg-background rounded-md shadow-sm">
                                    {link.valueMapping?.type === 'exact' && (<><Input placeholder="If Source Value Is..." value={mapEntry.match ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'match', e.target.value)} className="h-8 flex-1" /><span className='text-muted-foreground mx-1'>then set to</span><Input placeholder="Target Value" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-8 flex-1" /></>)}
                                    {link.valueMapping?.type === 'range' && (<><Input type="number" placeholder="Min" value={mapEntry.min ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'min', parseFloat(e.target.value))} className="h-8 w-20" /><span className='text-muted-foreground mx-1'>to</span><Input type="number" placeholder="Max" value={mapEntry.max ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'max', parseFloat(e.target.value))} className="h-8 w-20" /><span className='text-muted-foreground mx-1'>then set to</span><Input placeholder="Target Value" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-8 flex-1" /></>)}
                                    {link.valueMapping?.type === 'threshold' && (<><Input type="number" placeholder="If Source >= " value={mapEntry.threshold ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'threshold', parseFloat(e.target.value))} className="h-8 w-28" /><span className='text-muted-foreground mx-1'>then set to</span><Input placeholder="Target Value" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-8 flex-1" /></>)}
                                    {link.valueMapping?.type === 'boolean' && mapIdx === 0 && (<><Label className="w-24 text-right pr-2">If True, set to:</Label><Input placeholder="Target Value for True" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-8 flex-1" /></>)}
                                    {link.valueMapping?.type === 'boolean' && mapIdx === 1 && (<><Label className="w-24 text-right pr-2">If False, set to:</Label><Input placeholder="Target Value for False" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-8 flex-1" /></>)}
                                    {link.valueMapping?.type !== 'boolean' && (<TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => removeMappingEntry(index, mapIdx)}><MinusCircle className="h-4 w-4 text-destructive" /></Button></TooltipTrigger><TooltipContent><p>Remove This Mapping Rule</p></TooltipContent></Tooltip></TooltipProvider>)}
                                </div>
                            ))}
                            {link.valueMapping?.type && !['_none_', 'boolean'].includes(link.valueMapping.type) && (<Button size="sm" variant="outline" onClick={() => addMappingEntry(index)} className="text-xs h-8 mt-1"><PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Rule</Button>)}
                            <div className="mt-2">
                                <Label htmlFor={`map-default-${index}`} className="text-xs">Default Value (if no rule matches or on error)</Label>
                                <Input id={`map-default-${index}`} placeholder="e.g., 'gray' or {passthrough_value}" value={link.valueMapping?.defaultValue ?? ''} onChange={(e) => handleDataLinkChange(index, 'valueMapping', { ...link.valueMapping, defaultValue: e.target.value })} className="h-8 text-xs" />
                                <p className="text-xs text-muted-foreground pt-0.5">Use <code className='text-xs p-0.5 bg-muted rounded-sm'>{'{passthrough_value}'}</code> to use the original data point value.</p>
                            </div>
                        </div>
                    )}
                </div>
                <Separator className="my-3" />
                <div className="space-y-2">
                    <Label className="text-xs font-medium flex justify-between items-center">
                        Display Formatting (Optional)
                         <TooltipProvider delayDuration={100}><Tooltip>
                            <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs"><p>Control how the data point's value is displayed IF the Target Property expects text (e.g., Label, Data Value). Applied AFTER mapping.</p></TooltipContent>
                        </Tooltip></TooltipProvider>
                    </Label>
                    {(!link.dataPointId || !dataPoints[link.dataPointId]) && <p className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded-md">Select a Data Point above to enable formatting options based on its type.</p>}
                    {link.dataPointId && dataPoints[link.dataPointId] && (
                        <div className="pl-2 space-y-2 text-xs border-l-2 border-accent/30">
                            {(['Int16','Int32','UInt16','UInt32','Float','Double','Byte','SByte','Int64','UInt64'].includes(dataPoints[link.dataPointId].dataType)) && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <FieldInput id={`format-prefix-${index}`} label="Prefix" value={link.format?.prefix ?? ''} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'prefix', e.target.value)} placeholder="e.g. $" />
                                    <FieldInput id={`format-suffix-${index}`} label="Suffix (Unit)" value={link.format?.suffix ?? dataPoints[link.dataPointId].unit ?? ''} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'suffix', e.target.value)} placeholder="e.g. kW" />
                                    <FieldInput type="number" id={`format-precision-${index}`} label="Decimal Places" value={link.format?.precision ?? ''} onChange={(e: { target: { value: string; }; }) => handleFormatChange(index, 'precision', e.target.value === '' ? undefined : parseInt(e.target.value))} min="0" step="1" placeholder="e.g. 2" />
                                </div>
                            )}
                            {dataPoints[link.dataPointId].dataType === 'Boolean' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <FieldInput id={`format-true-${index}`} label="If True, Display:" value={link.format?.trueLabel ?? 'True'} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'trueLabel', e.target.value)} placeholder="e.g. ON, Active" />
                                    <FieldInput id={`format-false-${index}`} label="If False, Display:" value={link.format?.falseLabel ?? 'False'} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'falseLabel', e.target.value)} placeholder="e.g. OFF, Inactive" />
                                </div>
                            )}
                            {dataPoints[link.dataPointId].dataType === 'DateTime' && (
                                <FieldInput id={`format-datetime-${index}`} label="Date/Time Pattern" value={link.format?.dateTimeFormat ?? 'YYYY-MM-DD HH:mm:ss'} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'dateTimeFormat', e.target.value)} placeholder="moment.js / date-fns format" />
                            )}
                            {dataPoints[link.dataPointId].dataType === 'String' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <FieldInput id={`format-prefix-${index}`} label="Prefix" value={link.format?.prefix ?? ''} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'prefix', e.target.value)} />
                                    <FieldInput id={`format-suffix-${index}`} label="Suffix" value={link.format?.suffix ?? ''} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'suffix', e.target.value)} />
                                </div>)
                            }
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
    
    const FieldInput = ({ id, label, value, onChange, type = "text", placeholder, name: fieldName, ...props }: any) => (
        <div className="space-y-0.5">
            <Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">{label}</Label>
            <Input type={type} id={id} name={fieldName || id} value={value ?? ''} onChange={onChange} placeholder={placeholder} className="h-8 text-xs" {...props} />
        </div>
    );


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl lg:max-w-3xl max-h-[90vh] xl:max-h-[80vh] flex flex-col p-0 shadow-2xl rounded-lg border-border/70 bg-background">
                <DialogHeader className="p-4 border-b border-border/60 flex flex-row justify-between items-center top-0 bg-background/95 backdrop-blur-sm z-10">
                    <div className='space-y-0.5'>
                        <DialogTitle className="text-xl font-bold flex items-center">
                            <PencilLine className="w-5 h-5 mr-2.5 text-primary" /> Configure {elementTypeUserFriendly}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground pl-[34px]">Element ID: {selectedElement.id}</DialogDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <TooltipProvider delayDuration={100}> <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="destructive" size="icon" onClick={handleDeleteAndClose} className="h-9 w-9">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete this element from the diagram</p></TooltipContent>
                        </Tooltip> </TooltipProvider>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Close dialog"> <X className="h-5 w-5" /> </Button>
                        </DialogClose>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-grow overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0" id="inspector-scroll-area">
                    <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-11 sticky top-0 bg-background/90 backdrop-blur-sm z-[9] border-b border-border/60 rounded-none">
                            <TabsTrigger value="properties" className="text-sm data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none h-full">
                                <Settings2 className="w-4 h-4 mr-2" />Properties
                            </TabsTrigger>
                            <TabsTrigger value="data_linking" className="text-sm data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none h-full">
                                <Link2 className="w-4 h-4 mr-2" />Data Linking
                            </TabsTrigger>
                        </TabsList>

                        <div className="p-4 md:p-6"> {/* Padding for content inside scroll area */}
                            <TabsContent value="properties" className="mt-0 space-y-6 outline-none">
                                <Card className='shadow-sm border-border/60'>
                                    <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Basic Information</CardTitle></CardHeader>
                                    <CardContent className='p-4 pt-0 space-y-4'>
                                        <FieldInput id="label" label="Display Label / Name" value={formData.label || ''} onChange={handleInputChange} name="label" placeholder="e.g., Main Inverter, Feeder Line" />
                                    </CardContent>
                                </Card>

                                {isNode(selectedElement) && currentElementType === SLDElementType.TextLabel && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold flex items-center'><Palmtree className="w-4 h-4 mr-2 text-green-500" />Text Content & Appearance</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput id="text" name="text" label="Static Text Content (can be multi-line)" value={(formData as TextLabelNodeData).text || ''} onChange={handleInputChange} placeholder="Enter text to display on the label" as="textarea" rows={3}/>
                                            <Separator />
                                            <h4 className="text-sm font-medium text-muted-foreground pt-2">Styling:</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontSize" className="text-xs flex items-center"><BaselineIcon className="w-3.5 h-3.5 mr-1" />Font Size</Label> <Select name="styleConfig.fontSize" value={(formData.styleConfig)?.fontSize || '14px'} onValueChange={(val) => handleSelectChange("styleConfig.fontSize", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontSizes.map(fs => <SelectItem key={fs.value} value={fs.value} className="text-xs">{fs.label}</SelectItem>)}</SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontWeight" className="text-xs flex items-center"><CaseSensitive className="w-3.5 h-3.5 mr-1" />Font Weight</Label> <Select name="styleConfig.fontWeight" value={String((formData.styleConfig)?.fontWeight || 'normal')} onValueChange={(val) => handleSelectChange("styleConfig.fontWeight", val === '300' || val === '500' || val === '600' || val === '700' ? parseInt(val) : val )}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontWeights.map(fw => <SelectItem key={fw.value} value={String(fw.value)} className="text-xs">{fw.label}</SelectItem>)}</SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontStyle" className="text-xs">Font Style</Label> <Select name="styleConfig.fontStyle" value={(formData.styleConfig)?.fontStyle || 'normal'} onValueChange={(val) => handleSelectChange("styleConfig.fontStyle", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="normal" className="text-xs">Normal</SelectItem><SelectItem value="italic" className="text-xs">Italic</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput name="styleConfig.color" id="styleConfig.color" label={<LabelLayout icon={PaletteIcon}>Text Color</LabelLayout>} type="color" value={(formData.styleConfig)?.color || '#000000'} onChange={handleInputChange} className="h-9 p-0.5 border-none rounded-md w-full" />
                                                <FieldInput name="styleConfig.backgroundColor" id="styleConfig.backgroundColor" label="Background Color" type="color" value={(formData.styleConfig)?.backgroundColor || '#00000000'} onChange={handleInputChange} className="h-9 p-0.5 border-none rounded-md w-full" title="Choose background color (transparent by default)" />
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.textAlign" className="text-xs flex items-center"><AlignLeftIcon className="w-3.5 h-3.5 mr-1" />Text Align</Label> <Select name="styleConfig.textAlign" value={(formData.styleConfig)?.textAlign || 'left'} onValueChange={(val) => handleSelectChange("styleConfig.textAlign", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="left" className="text-xs">Left</SelectItem><SelectItem value="center" className="text-xs">Center</SelectItem><SelectItem value="right" className="text-xs">Right</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput name="styleConfig.padding" id="styleConfig.padding" label="Padding (CSS)" placeholder="e.g., 2px 4px" value={(formData.styleConfig)?.padding || '2px'} onChange={handleInputChange} className="col-span-full md:col-span-1" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                                
                                {isNode(selectedElement) && currentElementType === SLDElementType.Inverter && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Inverter Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput type="number" id="config.ratedPower" name="config.ratedPower" label="Rated Power (kW)" value={(formData.config as InverterNodeData['config'])?.ratedPower ?? ''} onChange={handleInputChange} placeholder="e.g., 5" step="0.1" min="0" />
                                        </CardContent>
                                    </Card>
                                )}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Contactor && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Contactor Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="config.normallyOpen" className="text-xs">Default Contact Type</Label> <Select name="config.normallyOpen" value={String((formData.config as ContactorNodeData['config'])?.normallyOpen ?? true)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="true" className="text-xs">Normally Open (NO)</SelectItem><SelectItem value="false" className="text-xs">Normally Closed (NC)</SelectItem></SelectContent> </Select> </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Panel && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>PV Panel Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="config.technology" className="text-xs">Technology</Label> <Select name="config.technology" value={(formData.config as PanelNodeData['config'])?.technology || ''} onValueChange={(val) => handleSelectChange("config.technology", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select technology..." /></SelectTrigger> <SelectContent><SelectItem value="Mono-Si" className="text-xs">Mono-Si</SelectItem><SelectItem value="Poly-Si" className="text-xs">Poly-Si</SelectItem><SelectItem value="Thin-film" className="text-xs">Thin-film</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput type="number" id="config.powerRatingWp" name="config.powerRatingWp" label="Power Rating (Wp)" value={(formData.config as PanelNodeData['config'])?.powerRatingWp ?? ''} onChange={handleInputChange} placeholder="e.g., 300" min="0" />
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Breaker && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Breaker Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="config.type" className="text-xs">Type</Label> <Select name="config.type" value={(formData.config as BreakerNodeData['config'])?.type || ''} onValueChange={(val) => handleSelectChange("config.type", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select type..." /></SelectTrigger> <SelectContent><SelectItem value="MCB" className="text-xs">MCB</SelectItem><SelectItem value="MCCB" className="text-xs">MCCB</SelectItem><SelectItem value="ACB" className="text-xs">ACB</SelectItem><SelectItem value="VCB" className="text-xs">VCB</SelectItem><SelectItem value="SF6" className="text-xs">SF6</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput type="number" id="config.tripRatingAmps" name="config.tripRatingAmps" label="Trip Rating (Amps)" value={(formData.config as BreakerNodeData['config'])?.tripRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 100" min="0" />
                                            <FieldInput type="number" id="config.interruptingCapacitykA" name="config.interruptingCapacitykA" label="Interrupting Capacity (kA)" value={(formData.config as BreakerNodeData['config'])?.interruptingCapacitykA ?? ''} onChange={handleInputChange} placeholder="e.g., 10" min="0" />
                                            <div className="space-y-1"> <Label htmlFor="config.normallyOpen" className="text-xs">Default State</Label> <Select name="config.normallyOpen" value={String((formData.config as BreakerNodeData['config'])?.normallyOpen ?? false)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="false" className="text-xs">Normally Closed (NC)</SelectItem><SelectItem value="true" className="text-xs">Normally Open (NO)</SelectItem></SelectContent> </Select> </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Meter && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Meter Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="config.meterType" className="text-xs">Meter Type</Label> <Select name="config.meterType" value={(formData.config as MeterNodeData['config'])?.meterType || ''} onValueChange={(val) => handleSelectChange("config.meterType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select meter type..." /></SelectTrigger> <SelectContent><SelectItem value="Energy" className="text-xs">Energy Meter</SelectItem><SelectItem value="PowerQuality" className="text-xs">Power Quality Meter</SelectItem><SelectItem value="SubMeter" className="text-xs">Sub-Meter</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput id="config.accuracyClass" name="config.accuracyClass" label="Accuracy Class" value={(formData.config as MeterNodeData['config'])?.accuracyClass ?? ''} onChange={handleInputChange} placeholder="e.g., 0.5S" />
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Battery && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Battery Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="config.technology" className="text-xs">Technology</Label> <Select name="config.technology" value={(formData.config as BatteryNodeData['config'])?.technology || ''} onValueChange={(val) => handleSelectChange("config.technology", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select technology..." /></SelectTrigger> <SelectContent><SelectItem value="Li-ion" className="text-xs">Li-ion</SelectItem><SelectItem value="Lead-Acid" className="text-xs">Lead-Acid</SelectItem><SelectItem value="Flow" className="text-xs">Flow Battery</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput type="number" id="config.capacityAh" name="config.capacityAh" label="Capacity (Ah)" value={(formData.config as BatteryNodeData['config'])?.capacityAh ?? ''} onChange={handleInputChange} placeholder="e.g., 1000" min="0"/>
                                            <FieldInput type="number" id="config.voltageNominalV" name="config.voltageNominalV" label="Nominal Voltage (V)" value={(formData.config as BatteryNodeData['config'])?.voltageNominalV ?? ''} onChange={handleInputChange} placeholder="e.g., 48" min="0"/>
                                            <FieldInput type="number" id="config.dodPercentage" name="config.dodPercentage" label="Depth of Discharge (%)" value={(formData.config as BatteryNodeData['config'])?.dodPercentage ?? ''} onChange={handleInputChange} placeholder="e.g., 80" min="0" max="100"/>
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Grid && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Grid Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput id="config.voltageLevel" name="config.voltageLevel" label="Voltage Level (kV)" value={(formData.config as GridNodeData['config'])?.voltageLevel ?? ''} onChange={handleInputChange} placeholder="e.g., 11kV, 33kV, LT" />
                                            <div className="space-y-1"> <Label htmlFor="config.frequencyHz" className="text-xs">Frequency (Hz)</Label> <Select name="config.frequencyHz" value={String((formData.config as GridNodeData['config'])?.frequencyHz || '50')} onValueChange={(val) => handleSelectChange("config.frequencyHz", parseFloat(val))}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="50" className="text-xs">50 Hz</SelectItem><SelectItem value="60" className="text-xs">60 Hz</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput type="number" id="config.faultLevelMVA" name="config.faultLevelMVA" label="Fault Level (MVA)" value={(formData.config as GridNodeData['config'])?.faultLevelMVA ?? ''} onChange={handleInputChange} placeholder="e.g., 500" min="0"/>
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Load && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Load Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="config.loadType" className="text-xs">Load Type</Label> <Select name="config.loadType" value={(formData.config as LoadNodeData['config'])?.loadType || ''} onValueChange={(val) => handleSelectChange("config.loadType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select load type..." /></SelectTrigger> <SelectContent><SelectItem value="Resistive" className="text-xs">Resistive</SelectItem><SelectItem value="Inductive" className="text-xs">Inductive</SelectItem><SelectItem value="Capacitive" className="text-xs">Capacitive</SelectItem><SelectItem value="Motor" className="text-xs">Motor</SelectItem><SelectItem value="Lighting" className="text-xs">Lighting</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput type="number" id="config.ratedPowerkW" name="config.ratedPowerkW" label="Rated Power (kW)" value={(formData.config as LoadNodeData['config'])?.ratedPowerkW ?? ''} onChange={handleInputChange} placeholder="e.g., 10" min="0"/>
                                            <FieldInput type="number" id="config.powerFactor" name="config.powerFactor" label="Power Factor" value={(formData.config as LoadNodeData['config'])?.powerFactor ?? ''} onChange={handleInputChange} placeholder="e.g., 0.85" min="0" max="1" step="0.01"/>
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Busbar && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Busbar Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="config.material" className="text-xs">Material</Label> <Select name="config.material" value={(formData.config as BusbarNodeData['config'])?.material || ''} onValueChange={(val) => handleSelectChange("config.material", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select material..." /></SelectTrigger> <SelectContent><SelectItem value="Copper" className="text-xs">Copper</SelectItem><SelectItem value="Aluminum" className="text-xs">Aluminum</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput type="number" id="config.currentRatingAmps" name="config.currentRatingAmps" label="Current Rating (Amps)" value={(formData.config as BusbarNodeData['config'])?.currentRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 1000" min="0"/>
                                            <FieldInput type="number" id="config.width" name="config.width" label="Width (px for display)" value={(formData.config as BusbarNodeData['config'])?.width ?? ''} onChange={handleInputChange} placeholder="e.g., 150" min="10"/>
                                            <FieldInput type="number" id="config.height" name="config.height" label="Height (px for display)" value={(formData.config as BusbarNodeData['config'])?.height ?? ''} onChange={handleInputChange} placeholder="e.g., 12" min="5"/>
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Transformer && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Transformer Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput id="config.ratingMVA" name="config.ratingMVA" label="Rating (MVA)" value={(formData.config as TransformerNodeData['config'])?.ratingMVA ?? ''} onChange={handleInputChange} placeholder="e.g., 1.5" />
                                            <FieldInput id="config.primaryVoltage" name="config.primaryVoltage" label="Primary Voltage (kV)" value={(formData.config as TransformerNodeData['config'])?.primaryVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 11kV" />
                                            <FieldInput id="config.secondaryVoltage" name="config.secondaryVoltage" label="Secondary Voltage (kV)" value={(formData.config as TransformerNodeData['config'])?.secondaryVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 0.433kV" />
                                            <FieldInput id="config.vectorGroup" name="config.vectorGroup" label="Vector Group" value={(formData.config as TransformerNodeData['config'])?.vectorGroup ?? ''} onChange={handleInputChange} placeholder="e.g., Dyn11" />
                                            <FieldInput type="number" id="config.impedancePercentage" name="config.impedancePercentage" label="Impedance (%)" value={(formData.config as TransformerNodeData['config'])?.impedancePercentage ?? ''} onChange={handleInputChange} placeholder="e.g., 5" min="0" step="0.1"/>
                                        </CardContent>
                                    </Card>
                                )}
                                
                                {isNode(selectedElement) && currentElementType === SLDElementType.Generator && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Generator Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="config.fuelType" className="text-xs">Fuel Type</Label> <Select name="config.fuelType" value={(formData.config as GeneratorNodeData['config'])?.fuelType || ''} onValueChange={(val) => handleSelectChange("config.fuelType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select fuel type..." /></SelectTrigger> <SelectContent><SelectItem value="Diesel" className="text-xs">Diesel</SelectItem><SelectItem value="Gas" className="text-xs">Natural Gas</SelectItem><SelectItem value="Hydro" className="text-xs">Hydro</SelectItem><SelectItem value="Wind" className="text-xs">Wind</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput id="config.ratingKVA" name="config.ratingKVA" label="Rating (kVA)" value={(formData.config as GeneratorNodeData['config'])?.ratingKVA ?? ''} onChange={handleInputChange} placeholder="e.g., 500" />
                                            <FieldInput id="config.outputVoltage" name="config.outputVoltage" label="Output Voltage (V)" value={(formData.config as GeneratorNodeData['config'])?.outputVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 415V" />
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.PLC && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>PLC Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput id="config.model" name="config.model" label="Model" value={(formData.config as PLCNodeData['config'])?.model ?? ''} onChange={handleInputChange} placeholder="e.g., Siemens S7-1500" />
                                            <FieldInput id="config.ipAddress" name="config.ipAddress" label="IP Address" value={(formData.config as PLCNodeData['config'])?.ipAddress ?? ''} onChange={handleInputChange} placeholder="e.g., 192.168.1.10" />
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Sensor && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Sensor Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="config.sensorType" className="text-xs">Sensor Type</Label> <Select name="config.sensorType" value={(formData.config as SensorNodeData['config'])?.sensorType || ''} onValueChange={(val) => handleSelectChange("config.sensorType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select sensor type..." /></SelectTrigger> <SelectContent><SelectItem value="Temperature" className="text-xs">Temperature</SelectItem><SelectItem value="Irradiance" className="text-xs">Irradiance</SelectItem><SelectItem value="WindSpeed" className="text-xs">Wind Speed</SelectItem><SelectItem value="Pressure" className="text-xs">Pressure</SelectItem><SelectItem value="Flow" className="text-xs">Flow</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput id="config.measurementRange" name="config.measurementRange" label="Measurement Range" value={(formData.config as SensorNodeData['config'])?.measurementRange ?? ''} onChange={handleInputChange} placeholder="e.g., 0-100°C, 0-10 bar" />
                                        </CardContent>
                                    </Card>
                                )}
                                
                                {isNode(selectedElement) && currentElementType === SLDElementType.GenericDevice && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Generic Device Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput id="config.deviceType" name="config.deviceType" label="Device Type/Name" value={(formData.config as GenericDeviceNodeData['config'])?.deviceType ?? ''} onChange={handleInputChange} placeholder="e.g., UPS, VFD, Custom Relay" />
                                            <FieldInput id="config.iconName" name="config.iconName" label="Lucide Icon Name (optional)" value={(formData.config as GenericDeviceNodeData['config'])?.iconName ?? ''} onChange={handleInputChange} placeholder="e.g., Zap, Fan, Server" />
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Isolator && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Isolator Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput type="number" id="config.poles" name="config.poles" label="Number of Poles" value={(formData.config as IsolatorNodeData['config'])?.poles ?? ''} onChange={handleInputChange} placeholder="e.g., 3 or 4" min="1" />
                                            <div className="space-y-1"> <Label htmlFor="config.loadBreak" className="text-xs">Load Break Capability</Label> <Select name="config.loadBreak" value={String((formData.config as IsolatorNodeData['config'])?.loadBreak ?? false)} onValueChange={(val) => handleSelectChange("config.loadBreak", val === 'true')}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="true" className="text-xs">Yes</SelectItem><SelectItem value="false" className="text-xs">No</SelectItem></SelectContent> </Select> </div>
                                            <div className="space-y-1"> <Label htmlFor="config.manualOrMotorized" className="text-xs">Operation Type</Label> <Select name="config.manualOrMotorized" value={(formData.config as IsolatorNodeData['config'])?.manualOrMotorized || 'manual'} onValueChange={(val) => handleSelectChange("config.manualOrMotorized", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="manual" className="text-xs">Manual</SelectItem><SelectItem value="motorized" className="text-xs">Motorized</SelectItem></SelectContent> </Select> </div>
                                        </CardContent>
                                    </Card>
                                )}
                                {isNode(selectedElement) && currentElementType === SLDElementType.ATS && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>ATS Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput type="number" id="config.transferTimeMs" name="config.transferTimeMs" label="Transfer Time (ms)" value={(formData.config as ATSNodeData['config'])?.transferTimeMs ?? ''} onChange={handleInputChange} placeholder="e.g., 50" min="0" />
                                            <FieldInput type="number" id="config.numPoles" name="config.numPoles" label="Number of Poles" value={(formData.config as ATSNodeData['config'])?.numPoles ?? ''} onChange={handleInputChange} placeholder="e.g., 4" min="1" />
                                        </CardContent>
                                    </Card>
                                )}
                                {isNode(selectedElement) && currentElementType === SLDElementType.JunctionBox && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Junction Box Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput id="config.material" name="config.material" label="Material" value={(formData.config as JunctionBoxNodeData['config'])?.material ?? ''} onChange={handleInputChange} placeholder="e.g., Polycarbonate, Metal" />
                                            <FieldInput id="config.ipRating" name="config.ipRating" label="IP Rating" value={(formData.config as JunctionBoxNodeData['config'])?.ipRating ?? ''} onChange={handleInputChange} placeholder="e.g., IP65" />
                                            <FieldInput type="number" id="config.numberOfStrings" name="config.numberOfStrings" label="Number of Strings" value={(formData.config as JunctionBoxNodeData['config'])?.numberOfStrings ?? ''} onChange={handleInputChange} placeholder="e.g., 4" min="1" />
                                        </CardContent>
                                    </Card>
                                )}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Fuse && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Fuse Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput type="number" id="config.ratingAmps" name="config.ratingAmps" label="Rating (Amps)" value={(formData.config as FuseNodeData['config'])?.ratingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 63" min="0" />
                                            <FieldInput id="config.voltageRating" name="config.voltageRating" label="Voltage Rating (V)" value={(formData.config as FuseNodeData['config'])?.voltageRating ?? ''} onChange={handleInputChange} placeholder="e.g., 415V, 690V" />
                                            <div className="space-y-1"> <Label htmlFor="config.fuseType" className="text-xs">Fuse Type</Label> <Select name="config.fuseType" value={(formData.config as FuseNodeData['config'])?.fuseType || ''} onValueChange={(val) => handleSelectChange("config.fuseType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select fuse type..." /></SelectTrigger> <SelectContent><SelectItem value="Cartridge" className="text-xs">Cartridge</SelectItem><SelectItem value="HRC" className="text-xs">HRC</SelectItem><SelectItem value="Rewireable" className="text-xs">Rewireable</SelectItem><SelectItem value="Semiconductor" className="text-xs">Semiconductor Protection</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput type="number" id="config.breakingCapacitykA" name="config.breakingCapacitykA" label="Breaking Capacity (kA)" value={(formData.config as FuseNodeData['config'])?.breakingCapacitykA ?? ''} onChange={handleInputChange} placeholder="e.g., 80" min="0" />
                                        </CardContent>
                                    </Card>
                                )}

                                {isEdge(selectedElement) && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Edge/Connection Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="flowType" className="text-xs">Flow Type</Label> <Select name="flowType" value={formData.flowType || ''} onValueChange={(val) => handleSelectChange("flowType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select flow type..." /></SelectTrigger> <SelectContent><SelectItem value="AC" className="text-xs">AC Power</SelectItem><SelectItem value="DC" className="text-xs">DC Power</SelectItem><SelectItem value="CONTROL_SIGNAL" className="text-xs">Control Signal</SelectItem><SelectItem value="DATA_BUS" className="text-xs">Data Bus</SelectItem></SelectContent> </Select> </div>
                                            <div className="space-y-1"> <Label htmlFor="voltageLevel" className="text-xs">Voltage Level</Label> <Select name="voltageLevel" value={formData.voltageLevel || ''} onValueChange={(val) => handleSelectChange("voltageLevel", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select voltage level..." /></SelectTrigger> <SelectContent><SelectItem value="HV" className="text-xs">High Voltage (HV)</SelectItem><SelectItem value="MV" className="text-xs">Medium Voltage (MV)</SelectItem><SelectItem value="LV" className="text-xs">Low Voltage (LV)</SelectItem><SelectItem value="ELV" className="text-xs">Extra Low Voltage (ELV)</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput type="number" id="currentRatingAmps" name="currentRatingAmps" label="Current Rating (Amps)" value={formData.currentRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 250" min="0" />
                                            <FieldInput id="cableType" name="cableType" label="Cable Type / Size" value={formData.cableType ?? ''} onChange={handleInputChange} placeholder="e.g., XLPE 3C x 185mm²" />
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Drilldown Link (Optional)</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="flex items-center space-x-2 pt-1">
                                                <Input type="checkbox" id="isDrillable" name="isDrillable" checked={!!formData.isDrillable} onChange={handleInputChange} className="h-4 w-4 accent-primary shrink-0" />
                                                <Label htmlFor="isDrillable" className="text-sm font-normal cursor-pointer">Enable drilldown to another SLD layout?</Label>
                                            </div>
                                            {formData.isDrillable && (
                                                <div className="space-y-1 pt-2 pl-6">
                                                    <Label htmlFor="subLayoutId" className="text-xs font-medium">
                                                        Target Sub-Layout ID <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Select
                                                        name="subLayoutId" // Stored on BaseNodeData
                                                        value={formData.subLayoutId || ''}
                                                        onValueChange={(value) => handleSelectChange("subLayoutId", value)}
                                                    >
                                                        <SelectTrigger className="h-9 text-xs">
                                                            <SelectValue placeholder="Select target SLD layout..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {AVAILABLE_SLD_LAYOUT_IDS.filter(id => id !== selectedElement.data?.subLayoutId && id !== (selectedElement as CustomNodeType).data.subLayoutId /* TODO: Better way to get current top layoutId to prevent self-linking */) 
                                                            .map(id => (
                                                                <SelectItem key={id} value={id} className="text-xs">
                                                                    {id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {formData.subLayoutId && <p className="text-xs text-muted-foreground pt-1">Selected target: {formData.subLayoutId}</p>}
                                                    {!formData.subLayoutId && <p className="text-xs text-destructive pt-1">Please select a target layout for drilldown.</p>}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}


                            </TabsContent>

                            <TabsContent value="data_linking" className="mt-0 space-y-4 outline-none">
                                {dataLinks.length === 0 && (
                                    <div className="text-center py-10 px-6 bg-muted/30 rounded-lg border border-dashed border-border/50">
                                        <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/70" />
                                        <h3 className="mt-2 text-lg font-semibold text-foreground">No Data Links Yet</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Make this element dynamic by linking its properties to real-time data points.
                                        </p>
                                        <Button variant="default" size="sm" onClick={addDataLink} className="mt-6 h-9">
                                            <PlusCircle className="h-4 w-4 mr-2" /> Add First Data Link
                                        </Button>
                                    </div>
                                )}
                                {dataLinks.map(renderDataLinkCard)}
                                {dataLinks.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={addDataLink} className="w-full h-9">
                                        <PlusCircle className="h-4 w-4 mr-2" /> Add Another Data Link
                                    </Button>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </ScrollArea>

                <DialogFooter className="p-4 border-t border-border/60 flex-shrink-0 bottom-0 bg-background/95 backdrop-blur-sm z-10">
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveChangesAndClose} className="w-full sm:w-auto">
                        <PencilLine className="h-4 w-4 mr-2" />Apply & Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const LabelLayout: React.FC<{ icon: React.ElementType, children: React.ReactNode }> = ({ icon: Icon, children }) => (
    <span className="flex items-center text-xs"><Icon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/80" />{children}</span>
);

export default React.memo(SLDInspectorDialog);