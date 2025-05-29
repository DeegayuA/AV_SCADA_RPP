// components/sld/ui/SLDInspectorDialog.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge, isEdge as isReactFlowEdge } from 'reactflow'; // Keep reactflow's isEdge
import { Button } from "@/components/ui/button";
// Import the correct type from the dialog
import AnimationFlowConfiguratorDialog, { 
    DialogAnimationFlowConfig, // This is the main config type from the dialog
    AnimationFlowConfiguratorMode 
} from './AnimationFlowConfiguratorDialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataLinkLiveValuePreview from './DataLinkLiveValuePreview';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, PlusCircle, MinusCircle, X, Info as InfoIcon, Sparkles, PencilLine, Link2, Settings2, Palmtree, Palette as PaletteIcon, CaseSensitive, AlignLeftIcon, BaselineIcon, Zap as ZapIcon } from 'lucide-react';
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
    ATSNodeData, JunctionBoxNodeData, FuseNodeData, GaugeNodeData,
    BaseNodeData, 
    AnimationFlowConfig as EdgeAnimationFlowConfig, // This is from types/sld.ts for saving on the edge
    GlobalSLDAnimationSettings
} from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ComboboxOption, SearchableSelect } from './SearchableSelect';
import { AVAILABLE_SLD_LAYOUT_IDS } from '@/config/constants';
import { Separator } from '@/components/ui/separator';

interface SLDInspectorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedElement: CustomNodeType | CustomFlowEdge | null;
    onUpdateElement: (element: CustomNodeType | CustomFlowEdge) => void;
    onDeleteElement: (elementId: string) => void;
    
    // For Global Animation Config (typically launched from a layout settings button, but could be here)
    onSetGlobalAnimationSettings?: (config: GlobalSLDAnimationSettings) => void; // Adjusted to take full global settings
    currentGlobalAnimationSettings?: GlobalSLDAnimationSettings; // To pass to configurator

    // For Single Edge Animation Config
    onConfigureEdgeAnimation?: (edge: CustomFlowEdge) => void;
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
    { value: 'isEnergized', label: 'Energized State (Edge/Device)', description: 'Boolean: true if energized, false if de-energized. Affects color/animation.'},
    { value: 'status', label: 'Device Status (Generic)', description: 'General status string e.g., "FAULT", "WARNING", "NOMINAL", "OFFLINE". Can drive color changes.' },
    { value: 'inverter.powerOutput', label: 'Inverter Power Output', description: 'Displays power value specifically for Inverter nodes.' },
    { value: 'breaker.isOpen', label: 'Breaker Open State', description: 'Boolean: true if breaker is open, false if closed.'},
    // Properties flowDirection and animationSpeedFactor are now managed by AnimationFlowConfig system.
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

// Renaming reactflow's isEdge for clarity
const isFlowEdge = isReactFlowEdge;


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
            case SLDElementType.Gauge: return 'Gauge Display';
            default: 
                const typeName = (element.data as BaseNodeData)?.elementType || 'Unknown Node';
                return typeName.charAt(0).toUpperCase() + typeName.slice(1) + ' Component';
        }
    }
    if (isFlowEdge(element)) return 'Connection Line'; // Using reactflow's isEdge renamed
    return 'Diagram Element';
};

// --- Main Component ---
const SLDInspectorDialog: React.FC<SLDInspectorDialogProps> = ({
    isOpen, onOpenChange, selectedElement, onUpdateElement, onDeleteElement, 
    onSetGlobalAnimationSettings, // This is for triggering GLOBAL settings, from main UI, not inspector
    onConfigureEdgeAnimation,     // This will trigger dialog for a single edge
    currentGlobalAnimationSettings
}) => {
    const { dataPoints } = useAppStore((state) => ({ dataPoints: state.dataPoints }));
    
    const [formData, setFormData] = useState<Partial<CustomNodeData & CustomFlowEdgeData & { styleConfig?: TextNodeStyleConfig }>>({});
    const [dataLinks, setDataLinks] = useState<DataPointLink[]>([]);
    const [activeTab, setActiveTab] = useState<string>("properties");
   
    // No longer needed directly in inspector. It launches AnimationFlowConfiguratorDialog
    // const [isAnimationConfiguratorOpen, setIsAnimationConfiguratorOpen] = useState(false);


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
                initialFormData.config = elementDataCopy.config && typeof elementDataCopy.config === 'object' 
                                         ? elementDataCopy.config 
                                         : {};
            } else if (isFlowEdge(selectedElement)) {
                initialFormData.flowType = elementDataCopy.flowType || '';
                initialFormData.voltageLevel = elementDataCopy.voltageLevel || '';
                initialFormData.currentRatingAmps = elementDataCopy.currentRatingAmps ?? undefined; // Keep as number or undefined
                initialFormData.cableType = elementDataCopy.cableType || '';
                // animationSettings are part of elementDataCopy and thus formData if present
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
            label: `${dp.name || dp.label || dp.id}${dp.description ? ` - ${dp.description}` : ''}`,
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
            
            let parsedValue: string | number | boolean | undefined = value; // Allow undefined for empty number fields
            if (type === 'checkbox') parsedValue = checked;
            else if (type === 'number') {
                if (value === '') parsedValue = undefined; // Treat empty string for number as undefined or null
                else parsedValue = parseFloat(value); 
                if (isNaN(parsedValue as number) && value !== '') parsedValue = value; // If still NaN but not empty, keep original string (shouldn't happen with type=number)
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
                elementType: selectedElement.data.elementType, // Should be immutable from inspector
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
        } else { // isFlowEdge(selectedElement)
            updatedElementData = {
                label: formData.label || selectedElement.data?.label || undefined, // Label optional for edges
                dataPointLinks: validDataLinks.length > 0 ? validDataLinks : undefined,
                flowType: (formData as Partial<CustomFlowEdgeData>).flowType,
                voltageLevel: (formData as Partial<CustomFlowEdgeData>).voltageLevel,
                currentRatingAmps: (formData as Partial<CustomFlowEdgeData>).currentRatingAmps, // May be undefined
                cableType: (formData as Partial<CustomFlowEdgeData>).cableType,
                animationSettings: (formData as Partial<CustomFlowEdgeData>).animationSettings, // Persist animation settings
            } as CustomFlowEdgeData;
            // isEnergized is removed as it should be derived or controlled by animation/DPs
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

    // Function to call when AnimationConfiguratorDialog is saved (from within this inspector)
    // This updates the formData, which will then be saved with handleSaveChangesAndClose
    const handleAnimationConfigurationFromDialog = (
        config: DialogAnimationFlowConfig, // This is from the AnimationFlowConfiguratorDialog
        applyTo: AnimationFlowConfiguratorMode, // will be 'single_edge'
        // setGlobalInvertFlag is not used here as this path is for single edge
    ) => {
         if (applyTo === 'single_edge' && selectedElement && isFlowEdge(selectedElement)) {
            // Construct the EdgeAnimationFlowConfig (from types/sld.ts) to store on the edge
            const newEdgeAnimationSettings: EdgeAnimationFlowConfig = {
                animationType: config.animationType,
                generationDataPointId: config.generationDataPointId,
                usageDataPointId: config.usageDataPointId,
                gridNetFlowDataPointId: config.gridNetFlowDataPointId,
                speedMultiplier: config.speedMultiplier,
                invertFlowDirection: config.invertFlowDirection,
                constantFlowDirection: config.constantFlowDirection,
                constantFlowSpeed: config.constantFlowSpeed,
                constantFlowActivationDataPointId: config.constantFlowActivationDataPointId,
            };
             setFormData(prevFormData => ({
                ...prevFormData,
                animationSettings: newEdgeAnimationSettings,
            }));
             // Clean up old DPLinks if new system is active for this edge
            if (newEdgeAnimationSettings.animationType !== 'none') {
                setDataLinks(prevDataLinks => {
                    return prevDataLinks.filter(link => 
                        !['isEnergized', 'flowDirection', 'animationSpeedFactor'].includes(link.targetProperty)
                    );
                });
            }
        }
        // The AnimationFlowConfiguratorDialog will close itself via its own onOpenChange
    };


    if (!isOpen || !selectedElement) return null;

    const elementTypeUserFriendly = getElementTypeName(selectedElement);
    const currentElementType = isNode(selectedElement) ? selectedElement.data.elementType : undefined;

    const actionableElementTypes: SLDElementType[] = [
        SLDElementType.Breaker, SLDElementType.Contactor, SLDElementType.Fuse, 
        SLDElementType.Isolator, SLDElementType.ATS,
    ];
    
    const FieldInput = ({ id, label, value, onChange, type = "text", placeholder, name: fieldName, as: Component = Input, ...props }: any) => (
        <div className="space-y-0.5">
            <Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">{label}</Label>
            <Component type={type} id={id} name={fieldName || id} value={value ?? ''} onChange={onChange} placeholder={placeholder} className="h-8 text-xs" {...props} />
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

                        <div className="p-4 md:p-6">
                            <TabsContent value="properties" className="mt-0 space-y-6 outline-none">
                                {/* Cards for various properties based on element type */}
                                {/* ... Basic Info Card ... */}
                                <Card className='shadow-sm border-border/60'>
                                    <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Basic Information</CardTitle></CardHeader>
                                    <CardContent className='p-4 pt-0 space-y-4'>
                                        <FieldInput id="label" label="Display Label / Name" value={formData.label || ''} onChange={handleInputChange} name="label" placeholder="e.g., Main Inverter, Feeder Line" />
                                    </CardContent>
                                </Card>


                                {isNode(selectedElement) && actionableElementTypes.includes(currentElementType as SLDElementType) && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'>
                                        <CardTitle className='text-base font-semibold flex items-center'>
                                            <ZapIcon className="w-4 h-4 mr-2 text-orange-500" />
                                            Control Configuration
                                        </CardTitle>
                                        </CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                        <div className="space-y-1">
                                            <Label htmlFor="config.controlNodeId" className="text-xs font-medium">
                                            Control OPC UA Node ID (Writable)
                                            <TooltipProvider delayDuration={100}>
                                                <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <InfoIcon className="w-3 h-3 ml-1.5 text-muted-foreground cursor-help inline" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <p>OPC UA node to write to for controlling this element (e.g., toggle open/close when clicked in view mode).</p>
                                                </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            </Label>
                                            <SearchableSelect
                                            options={dataPointOptions} 
                                            value={formData.config?.controlNodeId || ''}
                                            onChange={(value) => handleSelectChange('config.controlNodeId', value || undefined)} 
                                            placeholder="Search & Select Writable Data Point..."
                                            searchPlaceholder="Type to search..."
                                            notFoundText="No data points found."
                                            />
                                            {formData.config?.controlNodeId && dataPoints[formData.config.controlNodeId] && (
                                            <p className="text-xs text-muted-foreground pt-1">
                                                Selected: {dataPoints[formData.config.controlNodeId].name} (ID: {formData.config.controlNodeId})
                                            </p>
                                            )}
                                        </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Gauge && (
                                   <Card className='shadow-sm border-border/60'>
                                   <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Gauge Configuration</CardTitle></CardHeader>
                                   <CardContent className='p-4 pt-0 space-y-4'>
                                       <FieldInput type="number" id="config.minVal" name="config.minVal" label="Minimum Value" value={(formData.config as GaugeNodeData['config'])?.minVal ?? ''} onChange={handleInputChange} placeholder="e.g., 0" />
                                       <FieldInput type="number" id="config.maxVal" name="config.maxVal" label="Maximum Value" value={(formData.config as GaugeNodeData['config'])?.maxVal ?? ''} onChange={handleInputChange} placeholder="e.g., 100" />
                                       <FieldInput id="config.unit" name="config.unit" label="Unit" value={(formData.config as GaugeNodeData['config'])?.unit ?? ''} onChange={handleInputChange} placeholder="e.g., %, kW, °C" />
                                   </CardContent>
                                   </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Gauge && (
                                     <Card className='shadow-sm border-border/60'>
                                     <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Gauge Value Data Point</CardTitle></CardHeader>
                                     <CardContent className='p-4 pt-0 space-y-4'>
                                         <div className="space-y-1">
                                             <Label htmlFor="config.valueDataPointLink.dataPointId" className="text-xs font-medium">
                                                 Value Data Point
                                                 <TooltipProvider delayDuration={100}>
                                                     <Tooltip>
                                                         <TooltipTrigger asChild>
                                                             <InfoIcon className="w-3 h-3 ml-1.5 text-muted-foreground cursor-help inline" />
                                                         </TooltipTrigger>
                                                         <TooltipContent side="top" className="max-w-xs"><p>Select the data point that will drive the gauge's value.</p></TooltipContent>
                                                     </Tooltip>
                                                 </TooltipProvider>
                                             </Label>
                                             <SearchableSelect
                                                 options={dataPointOptions}
                                                 value={(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.dataPointId || ''}
                                                 onChange={(value) => {
                                                     if (!value) {
                                                         setFormData(prev => { const newState = JSON.parse(JSON.stringify(prev)); if (newState.config) {newState.config.valueDataPointLink = undefined;} return newState; });
                                                         return;
                                                     }
                                                     const selectedDp = dataPoints[value as string];
                                                     let inferredType: NonNullable<DataPointLink['format']>['type'] = 'number';
                                                     if (selectedDp) {
                                                         if (['Boolean'].includes(selectedDp.dataType)) inferredType = 'boolean';
                                                         else if (selectedDp.dataType === 'DateTime') inferredType = 'dateTime';
                                                         else if (selectedDp.dataType === 'String') inferredType = 'string';
                                                     }
                                                     setFormData(prev => {
                                                         const newState = JSON.parse(JSON.stringify(prev)); if (!newState.config) newState.config = {};
                                                         newState.config.valueDataPointLink = { dataPointId: value, targetProperty: 'value', format: { type: inferredType, suffix: selectedDp?.unit || '', ...(inferredType === 'number' && { precision: 2 }),}};
                                                         return newState;
                                                     });
                                                 }}
                                                 placeholder="Search & Select Data Point for Gauge Value..."
                                                 searchPlaceholder="Type to search..."
                                                 notFoundText="No data points found."
                                             />
                                             {(formData.config as GaugeNodeData['config'])?.valueDataPointLink?.dataPointId && dataPoints[(formData.config as GaugeNodeData['config'])!.valueDataPointLink!.dataPointId!] && (
                                                 <p className="text-xs text-muted-foreground pt-1">Selected: {dataPoints[(formData.config as GaugeNodeData['config'])!.valueDataPointLink!.dataPointId!].name}</p>
                                             )}
                                         </div>
                                     </CardContent>
                                     </Card>
                                )}


                                {isNode(selectedElement) && currentElementType === SLDElementType.TextLabel && (
                                    <Card className='shadow-sm border-border/60'>
                                    <CardHeader className='p-4'><CardTitle className='text-base font-semibold flex items-center'><Palmtree className="w-4 h-4 mr-2 text-green-500" />Text Content & Appearance</CardTitle></CardHeader>
                                    <CardContent className='p-4 pt-0 space-y-4'>
                                        <FieldInput id="text" name="text" label="Static Text Content (can be multi-line)" value={(formData as TextLabelNodeData).text || ''} onChange={handleInputChange} placeholder="Enter text to display on the label" as="textarea" rows={3}/>
                                        <Separator />
                                        <h4 className="text-sm font-medium text-muted-foreground pt-2">Styling:</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
                                            <div className="space-y-1"> <Label htmlFor="styleConfig.fontSize" className="text-xs flex items-center"><BaselineIcon className="w-3.5 h-3.5 mr-1" />Font Size</Label> <Select value={(formData.styleConfig)?.fontSize || '14px'} onValueChange={(val) => handleSelectChange("styleConfig.fontSize", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontSizes.map(fs => <SelectItem key={fs.value} value={fs.value} className="text-xs">{fs.label}</SelectItem>)}</SelectContent> </Select> </div>
                                            <div className="space-y-1"> <Label htmlFor="styleConfig.fontWeight" className="text-xs flex items-center"><CaseSensitive className="w-3.5 h-3.5 mr-1" />Font Weight</Label> <Select value={String((formData.styleConfig)?.fontWeight || 'normal')} onValueChange={(val) => handleSelectChange("styleConfig.fontWeight", ['300', '500', '600', '700'].includes(val) ? parseInt(val) : val )}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontWeights.map(fw => <SelectItem key={fw.value} value={String(fw.value)} className="text-xs">{fw.label}</SelectItem>)}</SelectContent> </Select> </div>
                                            <div className="space-y-1"> <Label htmlFor="styleConfig.fontStyle" className="text-xs">Font Style</Label> <Select value={(formData.styleConfig)?.fontStyle || 'normal'} onValueChange={(val) => handleSelectChange("styleConfig.fontStyle", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="normal" className="text-xs">Normal</SelectItem><SelectItem value="italic" className="text-xs">Italic</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput name="styleConfig.color" id="styleConfig.color" label={<LabelLayout icon={PaletteIcon}>Text Color</LabelLayout>} type="color" value={(formData.styleConfig)?.color || '#000000'} onChange={handleInputChange} className="h-9 p-0.5 border-input rounded-md w-full" />
                                            <FieldInput name="styleConfig.backgroundColor" id="styleConfig.backgroundColor" label="Background Color" type="color" value={(formData.styleConfig)?.backgroundColor || '#00000000'} onChange={handleInputChange} className="h-9 p-0.5 border-input rounded-md w-full" title="Choose background color (transparent by default)" />
                                            <div className="space-y-1"> <Label htmlFor="styleConfig.textAlign" className="text-xs flex items-center"><AlignLeftIcon className="w-3.5 h-3.5 mr-1" />Text Align</Label> <Select value={(formData.styleConfig)?.textAlign || 'left'} onValueChange={(val) => handleSelectChange("styleConfig.textAlign", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="left" className="text-xs">Left</SelectItem><SelectItem value="center" className="text-xs">Center</SelectItem><SelectItem value="right" className="text-xs">Right</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput name="styleConfig.padding" id="styleConfig.padding" label="Padding (CSS)" placeholder="e.g., 2px 4px" value={(formData.styleConfig)?.padding || '2px'} onChange={handleInputChange} className="col-span-full md:col-span-1" />
                                        </div>
                                    </CardContent>
                                </Card>
                                )}
                                
                                {/* ... other node-specific cards ... */}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Inverter && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Inverter Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><FieldInput type="number" id="config.ratedPower" name="config.ratedPower" label="Rated Power (kW)" value={(formData.config as InverterNodeData['config'])?.ratedPower ?? ''} onChange={handleInputChange} placeholder="e.g., 5" step="0.1" min="0" /></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Contactor && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Contactor Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><div className="space-y-1"> <Label htmlFor="config.normallyOpen" className="text-xs">Default Contact Type</Label> <Select value={String((formData.config as ContactorNodeData['config'])?.normallyOpen ?? true)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="true" className="text-xs">Normally Open (NO)</SelectItem><SelectItem value="false" className="text-xs">Normally Closed (NC)</SelectItem></SelectContent> </Select> </div></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Panel && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>PV Panel Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><div className="space-y-1"> <Label htmlFor="config.technology" className="text-xs">Technology</Label> <Select value={(formData.config as PanelNodeData['config'])?.technology || ''} onValueChange={(val) => handleSelectChange("config.technology", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select technology..." /></SelectTrigger> <SelectContent><SelectItem value="Mono-Si" className="text-xs">Mono-Si</SelectItem><SelectItem value="Poly-Si" className="text-xs">Poly-Si</SelectItem><SelectItem value="Thin-film" className="text-xs">Thin-film</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.powerRatingWp" name="config.powerRatingWp" label="Power Rating (Wp)" value={(formData.config as PanelNodeData['config'])?.powerRatingWp ?? ''} onChange={handleInputChange} placeholder="e.g., 300" min="0" /></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Breaker && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Breaker Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><div className="space-y-1"> <Label htmlFor="config.type" className="text-xs">Type</Label> <Select value={(formData.config as BreakerNodeData['config'])?.type || ''} onValueChange={(val) => handleSelectChange("config.type", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select type..." /></SelectTrigger> <SelectContent><SelectItem value="MCB" className="text-xs">MCB</SelectItem><SelectItem value="MCCB" className="text-xs">MCCB</SelectItem><SelectItem value="ACB" className="text-xs">ACB</SelectItem><SelectItem value="VCB" className="text-xs">VCB</SelectItem><SelectItem value="SF6" className="text-xs">SF6</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.tripRatingAmps" name="config.tripRatingAmps" label="Trip Rating (Amps)" value={(formData.config as BreakerNodeData['config'])?.tripRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 100" min="0" /><FieldInput type="number" id="config.interruptingCapacitykA" name="config.interruptingCapacitykA" label="Interrupting Capacity (kA)" value={(formData.config as BreakerNodeData['config'])?.interruptingCapacitykA ?? ''} onChange={handleInputChange} placeholder="e.g., 10" min="0" /><div className="space-y-1"> <Label htmlFor="config.normallyOpen" className="text-xs">Default State</Label> <Select value={String((formData.config as BreakerNodeData['config'])?.normallyOpen ?? false)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="false" className="text-xs">Normally Closed (NC)</SelectItem><SelectItem value="true" className="text-xs">Normally Open (NO)</SelectItem></SelectContent> </Select> </div></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Meter && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Meter Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><div className="space-y-1"> <Label htmlFor="config.meterType" className="text-xs">Meter Type</Label> <Select value={(formData.config as MeterNodeData['config'])?.meterType || ''} onValueChange={(val) => handleSelectChange("config.meterType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select meter type..." /></SelectTrigger> <SelectContent><SelectItem value="Energy" className="text-xs">Energy Meter</SelectItem><SelectItem value="PowerQuality" className="text-xs">Power Quality Meter</SelectItem><SelectItem value="SubMeter" className="text-xs">Sub-Meter</SelectItem></SelectContent> </Select> </div><FieldInput id="config.accuracyClass" name="config.accuracyClass" label="Accuracy Class" value={(formData.config as MeterNodeData['config'])?.accuracyClass ?? ''} onChange={handleInputChange} placeholder="e.g., 0.5S" /></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Battery && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Battery Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><div className="space-y-1"> <Label htmlFor="config.technology" className="text-xs">Technology</Label> <Select value={(formData.config as BatteryNodeData['config'])?.technology || ''} onValueChange={(val) => handleSelectChange("config.technology", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select technology..." /></SelectTrigger> <SelectContent><SelectItem value="Li-ion" className="text-xs">Li-ion</SelectItem><SelectItem value="Lead-Acid" className="text-xs">Lead-Acid</SelectItem><SelectItem value="Flow" className="text-xs">Flow Battery</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.capacityAh" name="config.capacityAh" label="Capacity (Ah)" value={(formData.config as BatteryNodeData['config'])?.capacityAh ?? ''} onChange={handleInputChange} placeholder="e.g., 1000" min="0"/><FieldInput type="number" id="config.voltageNominalV" name="config.voltageNominalV" label="Nominal Voltage (V)" value={(formData.config as BatteryNodeData['config'])?.voltageNominalV ?? ''} onChange={handleInputChange} placeholder="e.g., 48" min="0"/><FieldInput type="number" id="config.dodPercentage" name="config.dodPercentage" label="Depth of Discharge (%)" value={(formData.config as BatteryNodeData['config'])?.dodPercentage ?? ''} onChange={handleInputChange} placeholder="e.g., 80" min="0" max="100"/></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Grid && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Grid Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><FieldInput id="config.voltageLevel" name="config.voltageLevel" label="Voltage Level (kV)" value={(formData.config as GridNodeData['config'])?.voltageLevel ?? ''} onChange={handleInputChange} placeholder="e.g., 11kV, 33kV, LT" /><div className="space-y-1"> <Label htmlFor="config.frequencyHz" className="text-xs">Frequency (Hz)</Label> <Select value={String((formData.config as GridNodeData['config'])?.frequencyHz || '50')} onValueChange={(val) => handleSelectChange("config.frequencyHz", parseFloat(val))}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="50" className="text-xs">50 Hz</SelectItem><SelectItem value="60" className="text-xs">60 Hz</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.faultLevelMVA" name="config.faultLevelMVA" label="Fault Level (MVA)" value={(formData.config as GridNodeData['config'])?.faultLevelMVA ?? ''} onChange={handleInputChange} placeholder="e.g., 500" min="0"/></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Load && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Load Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><div className="space-y-1"> <Label htmlFor="config.loadType" className="text-xs">Load Type</Label> <Select value={(formData.config as LoadNodeData['config'])?.loadType || ''} onValueChange={(val) => handleSelectChange("config.loadType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select load type..." /></SelectTrigger> <SelectContent><SelectItem value="Resistive" className="text-xs">Resistive</SelectItem><SelectItem value="Inductive" className="text-xs">Inductive</SelectItem><SelectItem value="Capacitive" className="text-xs">Capacitive</SelectItem><SelectItem value="Motor" className="text-xs">Motor</SelectItem><SelectItem value="Lighting" className="text-xs">Lighting</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.ratedPowerkW" name="config.ratedPowerkW" label="Rated Power (kW)" value={(formData.config as LoadNodeData['config'])?.ratedPowerkW ?? ''} onChange={handleInputChange} placeholder="e.g., 10" min="0"/><FieldInput type="number" id="config.powerFactor" name="config.powerFactor" label="Power Factor" value={(formData.config as LoadNodeData['config'])?.powerFactor ?? ''} onChange={handleInputChange} placeholder="e.g., 0.85" min="0" max="1" step="0.01"/></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Busbar && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Busbar Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><div className="space-y-1"> <Label htmlFor="config.material" className="text-xs">Material</Label> <Select value={(formData.config as BusbarNodeData['config'])?.material || ''} onValueChange={(val) => handleSelectChange("config.material", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select material..." /></SelectTrigger> <SelectContent><SelectItem value="Copper" className="text-xs">Copper</SelectItem><SelectItem value="Aluminum" className="text-xs">Aluminum</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.currentRatingAmps" name="config.currentRatingAmps" label="Current Rating (Amps)" value={(formData.config as BusbarNodeData['config'])?.currentRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 1000" min="0"/><FieldInput type="number" id="config.width" name="config.width" label="Width (px for display)" value={(formData.config as BusbarNodeData['config'])?.width ?? ''} onChange={handleInputChange} placeholder="e.g., 150" min="10"/><FieldInput type="number" id="config.height" name="config.height" label="Height (px for display)" value={(formData.config as BusbarNodeData['config'])?.height ?? ''} onChange={handleInputChange} placeholder="e.g., 12" min="5"/></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Transformer && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Transformer Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><FieldInput id="config.ratingMVA" name="config.ratingMVA" label="Rating (MVA)" value={(formData.config as TransformerNodeData['config'])?.ratingMVA ?? ''} onChange={handleInputChange} placeholder="e.g., 1.5" /><FieldInput id="config.primaryVoltage" name="config.primaryVoltage" label="Primary Voltage (kV)" value={(formData.config as TransformerNodeData['config'])?.primaryVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 11kV" /><FieldInput id="config.secondaryVoltage" name="config.secondaryVoltage" label="Secondary Voltage (kV)" value={(formData.config as TransformerNodeData['config'])?.secondaryVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 0.433kV" /><FieldInput id="config.vectorGroup" name="config.vectorGroup" label="Vector Group" value={(formData.config as TransformerNodeData['config'])?.vectorGroup ?? ''} onChange={handleInputChange} placeholder="e.g., Dyn11" /><FieldInput type="number" id="config.impedancePercentage" name="config.impedancePercentage" label="Impedance (%)" value={(formData.config as TransformerNodeData['config'])?.impedancePercentage ?? ''} onChange={handleInputChange} placeholder="e.g., 5" min="0" step="0.1"/></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Generator && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Generator Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><div className="space-y-1"> <Label htmlFor="config.fuelType" className="text-xs">Fuel Type</Label> <Select value={(formData.config as GeneratorNodeData['config'])?.fuelType || ''} onValueChange={(val) => handleSelectChange("config.fuelType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select fuel type..." /></SelectTrigger> <SelectContent><SelectItem value="Diesel" className="text-xs">Diesel</SelectItem><SelectItem value="Gas" className="text-xs">Natural Gas</SelectItem><SelectItem value="Hydro" className="text-xs">Hydro</SelectItem><SelectItem value="Wind" className="text-xs">Wind</SelectItem></SelectContent> </Select> </div><FieldInput id="config.ratingKVA" name="config.ratingKVA" label="Rating (kVA)" value={(formData.config as GeneratorNodeData['config'])?.ratingKVA ?? ''} onChange={handleInputChange} placeholder="e.g., 500" /><FieldInput id="config.outputVoltage" name="config.outputVoltage" label="Output Voltage (V)" value={(formData.config as GeneratorNodeData['config'])?.outputVoltage ?? ''} onChange={handleInputChange} placeholder="e.g., 415V" /></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.PLC && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>PLC Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><FieldInput id="config.model" name="config.model" label="Model" value={(formData.config as PLCNodeData['config'])?.model ?? ''} onChange={handleInputChange} placeholder="e.g., Siemens S7-1500" /><FieldInput id="config.ipAddress" name="config.ipAddress" label="IP Address" value={(formData.config as PLCNodeData['config'])?.ipAddress ?? ''} onChange={handleInputChange} placeholder="e.g., 192.168.1.10" /></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Sensor && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Sensor Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><div className="space-y-1"> <Label htmlFor="config.sensorType" className="text-xs">Sensor Type</Label> <Select value={(formData.config as SensorNodeData['config'])?.sensorType || ''} onValueChange={(val) => handleSelectChange("config.sensorType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select sensor type..." /></SelectTrigger> <SelectContent><SelectItem value="Temperature" className="text-xs">Temperature</SelectItem><SelectItem value="Irradiance" className="text-xs">Irradiance</SelectItem><SelectItem value="WindSpeed" className="text-xs">Wind Speed</SelectItem><SelectItem value="Pressure" className="text-xs">Pressure</SelectItem><SelectItem value="Flow" className="text-xs">Flow</SelectItem></SelectContent> </Select> </div><FieldInput id="config.measurementRange" name="config.measurementRange" label="Measurement Range" value={(formData.config as SensorNodeData['config'])?.measurementRange ?? ''} onChange={handleInputChange} placeholder="e.g., 0-100°C, 0-10 bar" /></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.GenericDevice && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Generic Device Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><FieldInput id="config.deviceType" name="config.deviceType" label="Device Type/Name" value={(formData.config as GenericDeviceNodeData['config'])?.deviceType ?? ''} onChange={handleInputChange} placeholder="e.g., UPS, VFD, Custom Relay" /><FieldInput id="config.iconName" name="config.iconName" label="Lucide Icon Name (optional)" value={(formData.config as GenericDeviceNodeData['config'])?.iconName ?? ''} onChange={handleInputChange} placeholder="e.g., Zap, Fan, Server" /></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Isolator && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Isolator Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><FieldInput type="number" id="config.poles" name="config.poles" label="Number of Poles" value={(formData.config as IsolatorNodeData['config'])?.poles ?? ''} onChange={handleInputChange} placeholder="e.g., 3 or 4" min="1" /><div className="space-y-1"> <Label htmlFor="config.loadBreak" className="text-xs">Load Break Capability</Label> <Select value={String((formData.config as IsolatorNodeData['config'])?.loadBreak ?? false)} onValueChange={(val) => handleSelectChange("config.loadBreak", val === 'true')}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="true" className="text-xs">Yes</SelectItem><SelectItem value="false" className="text-xs">No</SelectItem></SelectContent> </Select> </div><div className="space-y-1"> <Label htmlFor="config.manualOrMotorized" className="text-xs">Operation Type</Label> <Select value={(formData.config as IsolatorNodeData['config'])?.manualOrMotorized || 'manual'} onValueChange={(val) => handleSelectChange("config.manualOrMotorized", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="manual" className="text-xs">Manual</SelectItem><SelectItem value="motorized" className="text-xs">Motorized</SelectItem></SelectContent> </Select> </div></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.ATS && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>ATS Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><FieldInput type="number" id="config.transferTimeMs" name="config.transferTimeMs" label="Transfer Time (ms)" value={(formData.config as ATSNodeData['config'])?.transferTimeMs ?? ''} onChange={handleInputChange} placeholder="e.g., 50" min="0" /><FieldInput type="number" id="config.numPoles" name="config.numPoles" label="Number of Poles" value={(formData.config as ATSNodeData['config'])?.numPoles ?? ''} onChange={handleInputChange} placeholder="e.g., 4" min="1" /></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.JunctionBox && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Junction Box Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><FieldInput id="config.material" name="config.material" label="Material" value={(formData.config as JunctionBoxNodeData['config'])?.material ?? ''} onChange={handleInputChange} placeholder="e.g., Polycarbonate, Metal" /><FieldInput id="config.ipRating" name="config.ipRating" label="IP Rating" value={(formData.config as JunctionBoxNodeData['config'])?.ipRating ?? ''} onChange={handleInputChange} placeholder="e.g., IP65" /><FieldInput type="number" id="config.numberOfStrings" name="config.numberOfStrings" label="Number of Strings" value={(formData.config as JunctionBoxNodeData['config'])?.numberOfStrings ?? ''} onChange={handleInputChange} placeholder="e.g., 4" min="1" /></CardContent></Card>)}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Fuse && (<Card className='shadow-sm border-border/60'><CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Fuse Configuration</CardTitle></CardHeader><CardContent className='p-4 pt-0 space-y-4'><FieldInput type="number" id="config.ratingAmps" name="config.ratingAmps" label="Rating (Amps)" value={(formData.config as FuseNodeData['config'])?.ratingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 63" min="0" /><FieldInput id="config.voltageRating" name="config.voltageRating" label="Voltage Rating (V)" value={(formData.config as FuseNodeData['config'])?.voltageRating ?? ''} onChange={handleInputChange} placeholder="e.g., 415V, 690V" /><div className="space-y-1"> <Label htmlFor="config.fuseType" className="text-xs">Fuse Type</Label> <Select value={(formData.config as FuseNodeData['config'])?.fuseType || ''} onValueChange={(val) => handleSelectChange("config.fuseType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select fuse type..." /></SelectTrigger> <SelectContent><SelectItem value="Cartridge" className="text-xs">Cartridge</SelectItem><SelectItem value="HRC" className="text-xs">HRC</SelectItem><SelectItem value="Rewireable" className="text-xs">Rewireable</SelectItem><SelectItem value="Semiconductor" className="text-xs">Semiconductor Protection</SelectItem></SelectContent> </Select> </div><FieldInput type="number" id="config.breakingCapacitykA" name="config.breakingCapacitykA" label="Breaking Capacity (kA)" value={(formData.config as FuseNodeData['config'])?.breakingCapacitykA ?? ''} onChange={handleInputChange} placeholder="e.g., 80" min="0" /></CardContent></Card>)}
                                
                                {isFlowEdge(selectedElement) && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Edge/Connection Configuration</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="flowType" className="text-xs">Flow Type</Label> <Select value={formData.flowType || ''} onValueChange={(val) => handleSelectChange("flowType", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select flow type..." /></SelectTrigger> <SelectContent><SelectItem value="AC" className="text-xs">AC Power</SelectItem><SelectItem value="DC" className="text-xs">DC Power</SelectItem><SelectItem value="CONTROL_SIGNAL" className="text-xs">Control Signal</SelectItem><SelectItem value="DATA_BUS" className="text-xs">Data Bus</SelectItem></SelectContent> </Select> </div>
                                            <div className="space-y-1"> <Label htmlFor="voltageLevel" className="text-xs">Voltage Level</Label> <Select value={formData.voltageLevel || ''} onValueChange={(val) => handleSelectChange("voltageLevel", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select voltage level..." /></SelectTrigger> <SelectContent><SelectItem value="HV" className="text-xs">High Voltage (HV)</SelectItem><SelectItem value="MV" className="text-xs">Medium Voltage (MV)</SelectItem><SelectItem value="LV" className="text-xs">Low Voltage (LV)</SelectItem><SelectItem value="ELV" className="text-xs">Extra Low Voltage (ELV)</SelectItem></SelectContent> </Select> </div>
                                            <FieldInput type="number" id="currentRatingAmps" name="currentRatingAmps" label="Current Rating (Amps)" value={formData.currentRatingAmps ?? ''} onChange={handleInputChange} placeholder="e.g., 250" min="0" />
                                            <FieldInput id="cableType" name="cableType" label="Cable Type / Size" value={formData.cableType ?? ''} onChange={handleInputChange} placeholder="e.g., XLPE 3C x 185mm²" />
                                            
                                            <Separator className="my-4" />

                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="w-full mt-4"
                                              onClick={() => {
                                                if (isFlowEdge(selectedElement) && onConfigureEdgeAnimation) {
                                                    onConfigureEdgeAnimation(selectedElement);
                                                }
                                              }}
                                              disabled={!onConfigureEdgeAnimation} // Disable if handler not provided
                                            >
                                              <ZapIcon className="w-4 h-4 mr-2" />
                                              Configure Animated Flow
                                            </Button>
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
                                                    <Label htmlFor="subLayoutId" className="text-xs font-medium">Target Sub-Layout ID <span className="text-red-500">*</span></Label>
                                                    <Select value={formData.subLayoutId || ''} onValueChange={(value) => handleSelectChange("subLayoutId", value)}>
                                                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select target SLD layout..." /></SelectTrigger>
                                                        <SelectContent>{AVAILABLE_SLD_LAYOUT_IDS.filter(id => id !== selectedElement?.id /*Prevent self loop if ID structure could allow it */).map(id => (<SelectItem key={id} value={id} className="text-xs">{id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>))}</SelectContent>
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
                                        <p className="mt-1 text-sm text-muted-foreground">Make this element dynamic by linking its properties to real-time data points.</p>
                                        <Button variant="default" size="sm" onClick={addDataLink} className="mt-6 h-9"><PlusCircle className="h-4 w-4 mr-2" /> Add First Data Link</Button>
                                    </div>
                                )}
                                {dataLinks.map((link, index) => (
                                    <Card key={index} className='shadow-sm border-border/60 mb-4'>
                                        <CardContent className='p-4 space-y-4'>
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-medium text-sm">Data Link #{index + 1}</h3>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDataLink(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <Label htmlFor={`dataPointId-${index}`} className="text-xs">Data Point Source</Label>
                                                <SearchableSelect
                                                    options={dataPointOptions}
                                                    value={link.dataPointId || ''}
                                                    onChange={(value) => handleDataLinkChange(index, 'dataPointId', value || '')}
                                                    placeholder="Search data points..."
                                                    searchPlaceholder="Type to search..."
                                                    notFoundText="No data points found."
                                                />
                                                {link.dataPointId && dataPoints[link.dataPointId] && (
                                                    <DataLinkLiveValuePreview 
                                                        dataPointId={link.dataPointId} 
                                                        valueMapping={link.valueMapping}
                                                        format={link.format}
                                                    />
                                                )}
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <Label htmlFor={`targetProperty-${index}`} className="text-xs">Target Property</Label>
                                                <Select value={link.targetProperty || ''} onValueChange={(val) => handleDataLinkChange(index, 'targetProperty', val)}>
                                                    <SelectTrigger className="h-9 text-xs">
                                                        <SelectValue placeholder="Select target property..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectLabel className="text-xs">Element Properties</SelectLabel>
                                                            {targetPropertiesOptions.map(option => (
                                                                <SelectItem key={option.value} value={option.value} className="text-xs">
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                {link.targetProperty && targetPropertiesOptions.find(o => o.value === link.targetProperty) && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {targetPropertiesOptions.find(o => o.value === link.targetProperty)?.description}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            {/* Format and mapping controls */}
                                            {link.dataPointId && link.targetProperty && (
                                                <>
                                                    <Separator className="my-2" />
                                                    <div className="space-y-4">
                                                        <div className="space-y-1">
                                                            <Label htmlFor={`format-${index}`} className="text-xs">Value Format (Optional)</Label>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <Select value={link.format?.type || 'string'} onValueChange={(val) => handleFormatChange(index, 'type', val)}>
                                                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="string" className="text-xs">String</SelectItem>
                                                                        <SelectItem value="number" className="text-xs">Number</SelectItem>
                                                                        <SelectItem value="boolean" className="text-xs">Boolean</SelectItem>
                                                                        <SelectItem value="dateTime" className="text-xs">Date/Time</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                
                                                                {link.format?.type === 'number' && (
                                                                    <Input type="number" placeholder="Decimal places" 
                                                                        className="h-8 text-xs" value={link.format?.precision || ''}
                                                                        onChange={(e) => handleFormatChange(index, 'precision', parseInt(e.target.value) || 0)}
                                                                    />
                                                                )}
                                                                
                                                                {(link.format?.type === 'number' || link.format?.type === 'string') && (
                                                                    <Input placeholder="Suffix" 
                                                                        className="h-8 text-xs" value={link.format?.suffix || ''}
                                                                        onChange={(e) => handleFormatChange(index, 'suffix', e.target.value)}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-1">
                                                            <Label htmlFor={`mapping-${index}`} className="text-xs">Value Mapping (Optional)</Label>
                                                            <Select value={link.valueMapping?.type || '_none_'} onValueChange={(val) => handleMappingTypeChange(index, val)}>
                                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="_none_" className="text-xs">No Mapping</SelectItem>
                                                                    <SelectItem value="boolean" className="text-xs">Boolean Mapping (true/false)</SelectItem>
                                                                    <SelectItem value="enum" className="text-xs">Enum Mapping (multiple values)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        
                                                        {link.valueMapping?.type === 'boolean' && (
                                                            <div className="space-y-3">
                                                                <div className="bg-muted/50 p-2 rounded-md">
                                                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                                                        <Label className="text-xs font-medium text-center">When false/0:</Label>
                                                                        <Label className="text-xs font-medium text-center">When true/1:</Label>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <Input className="h-8 text-xs" 
                                                                            value={(link.valueMapping?.mapping[0]?.value || '')} 
                                                                            onChange={(e) => handleMappingEntryChange(index, 0, 'value', e.target.value)}
                                                                            placeholder="Value when false"
                                                                        />
                                                                        <Input className="h-8 text-xs" 
                                                                            value={(link.valueMapping?.mapping[1]?.value || '')}
                                                                            onChange={(e) => handleMappingEntryChange(index, 1, 'value', e.target.value)}
                                                                            placeholder="Value when true"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {link.valueMapping?.type === 'enum' && (
                                                            <div className="space-y-3">
                                                                {(link.valueMapping.mapping || []).map((entry, mapIndex) => (
                                                                    <div key={mapIndex} className="flex items-center space-x-2 bg-muted/50 p-2 rounded-md">
                                                                        <Input className="h-8 text-xs flex-1" 
                                                                            value={entry.match || ''} 
                                                                            onChange={(e) => handleMappingEntryChange(index, mapIndex, 'match', e.target.value)}
                                                                            placeholder="Input value" 
                                                                        />
                                                                        <span className="text-xs">→</span>
                                                                        <Input className="h-8 text-xs flex-1" 
                                                                            value={entry.value || ''} 
                                                                            onChange={(e) => handleMappingEntryChange(index, mapIndex, 'value', e.target.value)}
                                                                            placeholder="Output value" 
                                                                        />
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMappingEntry(index, mapIndex)}>
                                                                            <MinusCircle className="h-4 w-4 text-destructive" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                                <Button variant="outline" size="sm" onClick={() => addMappingEntry(index)} className="h-8 text-xs w-full">
                                                                    <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Mapping
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                                {dataLinks.length > 0 && (<Button variant="outline" size="sm" onClick={addDataLink} className="w-full h-9"><PlusCircle className="h-4 w-4 mr-2" /> Add Another Data Link</Button>)}
                            </TabsContent>
                        </div>
                    </Tabs>
                </ScrollArea>

                <DialogFooter className="p-4 border-t border-border/60 flex-shrink-0 bottom-0 bg-background/95 backdrop-blur-sm z-10">
                    <DialogClose asChild><Button variant="outline" className="w-full sm:w-auto">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveChangesAndClose} className="w-full sm:w-auto"><PencilLine className="h-4 w-4 mr-2" />Apply & Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const LabelLayout: React.FC<{ icon: React.ElementType, children: React.ReactNode }> = ({ icon: Icon, children }) => (
    <span className="flex items-center text-xs"><Icon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/80" />{children}</span>
);

export default React.memo(SLDInspectorDialog);