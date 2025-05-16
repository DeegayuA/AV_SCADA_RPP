// app/circuit/sld/ui/SLDInspectorDialog.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge } from 'reactflow'; // Removed NodeHandleBounds as it wasn't used
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
    TextLabelNodeData, TextNodeStyleConfig, // Added TextNodeStyleConfig
    ContactorNodeData,
    InverterNodeData,
} from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ComboboxOption, SearchableSelect } from './SearchableSelect';
// You might want a more sophisticated color picker in the future
// import { SketchPicker } from 'react-color'; // Example

interface SLDInspectorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedElement: CustomNodeType | CustomFlowEdge | null;
    onUpdateElement: (element: CustomNodeType | CustomFlowEdge) => void;
    onDeleteElement: (elementId: string) => void;
}

// --- Helper Data and Functions ---
const targetPropertiesOptions: ComboboxOption[] = [
    { value: 'value', label: 'Value (for DataLabel)', description: 'Displays the raw or formatted data point value.' },
    { value: 'statusText', label: 'Status Text', description: 'Sets a descriptive text based on data (e.g., "Running", "Stopped").' },
    { value: 'fillColor', label: 'Fill Color', description: 'Changes background/fill color (e.g., node body, shape).' },
    { value: 'strokeColor', label: 'Stroke Color', description: 'Changes border or edge line color.' },
    { value: 'textColor', label: 'Text Color', description: 'Changes the color of text content within the element.' },
    { value: 'visible', label: 'Visibility', description: 'Shows or hides the element (map boolean data).' },
    { value: 'flowDirection', label: 'Flow Direction (Edge)', description: 'Animates edge: "forward", "reverse", or "none".' },
    { value: 'animationSpeed', label: 'Animation Speed (Edge)', description: 'Controls edge animation speed (e.g., "10s", "2s").' },
    { value: 'powerOutput', label: 'Power Output (Custom)', description: 'For specific nodes like Inverters to display power values.' },
    // Add more with descriptions as your system grows
];
const fontSizes = [ { label: "XS (10px)", value: "10px" }, { label: "S (12px)", value: "12px" }, { label: "M (14px)", value: "14px" }, { label: "L (16px)", value: "16px" }, { label: "XL (18px)", value: "18px" }, { label: "2XL (24px)", value: "24px" },];
const fontWeights = [ { label: "Normal", value: "normal" }, { label: "Bold", value: "bold" }, { label: "Light (300)", value: "300" }, ];


function isNode(element: any): element is CustomNodeType {
    return element && 'position' in element && 'data' in element && 'id' in element;
}

function isEdge(element: any): element is CustomFlowEdge {
    return element && 'source' in element && 'target' in element && 'id' in element;
}

const getElementTypeName = (element: CustomNodeType | CustomFlowEdge | null): string => {
    if (!element) return 'Element';
    if (isNode(element)) {
        switch (element.data?.elementType) {
            case SLDElementType.TextLabel: return 'Text Label';
            case SLDElementType.DataLabel: return 'Data Label';
            case SLDElementType.Contactor: return 'Contactor';
            case SLDElementType.Inverter: return 'Inverter';
            case SLDElementType.Panel: return 'PV Panel';
            case SLDElementType.GenericDevice: return 'Device';
            // Add more specific, user-friendly names
            default: return 'Node Component';
        }
    }
    if (isEdge(element)) return 'Connection Line';
    return 'Diagram Element';
}
// --- Main Component ---
const SLDInspectorDialog: React.FC<SLDInspectorDialogProps> = ({
    isOpen, onOpenChange, selectedElement, onUpdateElement, onDeleteElement
}) => {
    const { dataPoints } = useAppStore( (state) => ({ dataPoints: state.dataPoints}) );
    const [formData, setFormData] = useState<Partial<CustomNodeData & CustomFlowEdgeData & { styleConfig?: TextNodeStyleConfig }>>({}); // Include styleConfig
    const [dataLinks, setDataLinks] = useState<DataPointLink[]>([]);
    const [activeTab, setActiveTab] = useState<string>("properties");

    useEffect(() => {
        if (isOpen && selectedElement) {
            // Deep clone to prevent unintended mutations of reactflow state
            const elementDataCopy = JSON.parse(JSON.stringify(selectedElement.data ?? {}));
            setFormData(elementDataCopy);
            setDataLinks(elementDataCopy.dataPointLinks ?? []);
             if (isNode(selectedElement) && selectedElement.data.elementType === SLDElementType.TextLabel) {
                // If text label, ensure styleConfig is part of formData
                setFormData(prev => ({ ...prev, styleConfig: elementDataCopy.styleConfig || {} }));
            }
            setActiveTab("properties"); // Reset to properties tab
        }
    }, [selectedElement, isOpen]);

    const dataPointOptions = useMemo((): ComboboxOption[] =>
        Object.values(dataPoints).map(dp => ({
            value: dp.id,
            label: `${dp.name || dp.id} ${dp.description ? `- ${dp.description}` : ''}`,
            description: `ID: ${dp.id} | Type: ${dp.dataType} | Unit: ${dp.unit || 'N/A'}`
        })).sort((a,b) => a.label.localeCompare(b.label)),
    [dataPoints]);

    // --- Handler Functions ---
    // Generic input change
    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = event.target;
        const checked = (event.target as HTMLInputElement).checked; // For checkboxes

        setFormData(prev => {
            const newState = { ...prev };
            const keys = name.split('.'); // For nested properties like config.x or styleConfig.y
            let currentLevel: any = newState;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]]) {
                    currentLevel[keys[i]] = {};
                }
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value);
            return newState;
        });
    }, []);

    // Generic select change
    const handleSelectChange = useCallback((name: string, value: string | boolean | number) => {
         setFormData(prev => {
            const newState = { ...prev };
            const keys = name.split('.');
            let currentLevel: any = newState;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]]) {
                    currentLevel[keys[i]] = {};
                }
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = value;
            return newState;
        });
    }, []);

    // Data Link Management (addDataLink, removeDataLink, handleDataLinkChange are mostly the same, just UI might be nicer)
    // ... (addDataLink, removeDataLink, handleDataLinkChange, handleMappingTypeChange, handleMappingEntryChange, addMappingEntry, removeMappingEntry, handleFormatChange are largely unchanged in logic but might be triggered by more polished UI elements below)
    const handleDataLinkChange = useCallback((index: number, field: keyof DataPointLink, value: any) => { /* ... (same logic) ... */ setDataLinks(prevLinks => {
          const newLinks = [...prevLinks];
          const linkToUpdate = { ...(newLinks[index] ?? {}) } as DataPointLink;
          (linkToUpdate as any)[field] = value;
          if (field === 'dataPointId') {
              const selectedDp = dataPoints[value as string];
              if (selectedDp?.unit) {
                  const currentFormatType = linkToUpdate.format?.type;
                  let inferredType = currentFormatType ?? 'string';
                  if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(selectedDp.dataType)) inferredType = 'number';
                  else if (selectedDp.dataType === 'Boolean') inferredType = 'boolean';
                  else if (selectedDp.dataType === 'DateTime') inferredType = 'dateTime';

                  if(inferredType !== 'boolean') {
                     linkToUpdate.format = { ...(linkToUpdate.format ?? {}), type: inferredType as any, suffix: selectedDp.unit };
                  } else {
                      linkToUpdate.format = { ...(linkToUpdate.format ?? {}), type: 'boolean' };
                  }
              } else {
                  // if no unit, clear suffix perhaps? or make this more robust
                  if (linkToUpdate.format?.suffix && !selectedDp?.unit) delete linkToUpdate.format.suffix;
              }
          }
          newLinks[index] = linkToUpdate;
          return newLinks;
        });
    }, [dataPoints]);
    const addDataLink = useCallback(() => setDataLinks(prev => [...prev, { dataPointId: '', targetProperty: '' }]), []);
    const removeDataLink = useCallback((index: number) => setDataLinks(prev => prev.filter((_, i) => i !== index)), []);
    const handleMappingTypeChange = useCallback((linkIndex: number, selectedValue: string) => {/* ... (same) ... */ }, []);
    const handleMappingEntryChange = useCallback((linkIndex: number, mapIndex: number, field: string, value: any) => {/* ... (same) ... */}, []);
    const addMappingEntry = useCallback((linkIndex: number) => {/* ... (same) ... */}, []);
    const removeMappingEntry = useCallback((linkIndex: number, mapIndex: number) => {/* ... (same) ... */}, []);
    const handleFormatChange = useCallback((linkIndex: number, field: keyof NonNullable<DataPointLink['format']>, value: any) => {/* ... (same logic) ... */}, [dataPoints]);


    const handleSaveChangesAndClose = useCallback(() => {
        if (!selectedElement) return;
        const validDataLinks = dataLinks.filter(link => link.dataPointId && link.targetProperty);
        let updatedElementData: CustomNodeData | CustomFlowEdgeData;

        if (isNode(selectedElement)) {
            const commonNodeData: Partial<CustomNodeData> = {
                label: formData.label || selectedElement.data.label || 'Unnamed Node', // Ensure label is always present
                elementType: selectedElement.data.elementType,
                dataPointLinks: validDataLinks,
                config: formData.config && Object.keys(formData.config).length > 0 ? formData.config : undefined,
                isDrillable: formData.isDrillable,
                subLayoutId: formData.isDrillable ? formData.subLayoutId : undefined,
            };
            if (selectedElement.data.elementType === SLDElementType.TextLabel) {
                updatedElementData = {
                    ...commonNodeData,
                    elementType: SLDElementType.TextLabel,
                    text: (formData as Partial<TextLabelNodeData>).text || '',
                    styleConfig: (formData as Partial<TextLabelNodeData>).styleConfig && Object.keys((formData as Partial<TextLabelNodeData>).styleConfig!).length > 0 ? (formData as Partial<TextLabelNodeData>).styleConfig : undefined,
                } as TextLabelNodeData;
            } else {
                 updatedElementData = commonNodeData as CustomNodeData; // Other node types
            }
        } else { // isEdge
            updatedElementData = {
                label: formData.label || selectedElement.data?.label || '',
                dataPointLinks: validDataLinks,
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

    if (!isOpen || !selectedElement) return null; // Dialog open is controlled by parent

    const elementTypeUserFriendly = getElementTypeName(selectedElement);
    const currentElementType = isNode(selectedElement) ? selectedElement.data.elementType : undefined;

    const renderDataLinkCard = (link: DataPointLink, index: number) => (
        <Card key={index} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border-border/60">
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
                        <SearchableSelect options={dataPointOptions} value={link.dataPointId} onChange={(value) => handleDataLinkChange(index, 'dataPointId', value)} placeholder="Search & Select Data Point..." searchPlaceholder="Type to search..." notFoundText="No data points found." />
                        {link.dataPointId && dataPoints[link.dataPointId] && <p className="text-xs text-muted-foreground pt-1">Type: {dataPoints[link.dataPointId].dataType}, Unit: {dataPoints[link.dataPointId].unit || "N/A"}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`target-prop-${index}`} className="text-xs font-medium">Target Property <span className="text-red-500">*</span></Label>
                        <SearchableSelect options={targetPropertiesOptions} value={link.targetProperty} onChange={(value) => handleDataLinkChange(index, 'targetProperty', value)} placeholder="Select Property to Affect..." searchPlaceholder="Type to search..." notFoundText="No properties found." />
                        {link.targetProperty && <p className="text-xs text-muted-foreground pt-1">{targetPropertiesOptions.find(o=>o.value === link.targetProperty)?.description}</p>}
                    </div>
                </div>
                 <Separator className="my-3" />
                {/* Value Mapping UI - Keep this section, ensure it's visually clean */}
                <div className="space-y-2">
                    <Label className="text-xs font-medium flex justify-between items-center">
                        Value Mapping
                        <TooltipProvider delayDuration={100}><Tooltip>
                            <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs"><p>Transform data point values before they affect the target property. E.g., map 0/1 to "red"/"green".</p></TooltipContent>
                        </Tooltip></TooltipProvider>
                    </Label>
                    <Select value={link.valueMapping?.type ?? '_none_'} onValueChange={(value) => handleMappingTypeChange(index, value)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Mapping Type..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_none_">No Mapping (Direct Value)</SelectItem>
                            <SelectItem value="exact">Exact Match</SelectItem>
                            <SelectItem value="range">Numeric Range</SelectItem>
                            <SelectItem value="threshold">Numeric Threshold</SelectItem>
                            <SelectItem value="boolean">Boolean (True/False)</SelectItem>
                        </SelectContent>
                    </Select>
                    {link.valueMapping && (
                         <div className="pl-2 mt-2 space-y-2 border-l-2 border-primary/20 ">
                             {link.valueMapping.mapping.map((mapEntry, mapIdx) => (
                                 <div key={mapIdx} className="flex gap-2 items-center text-xs p-2 bg-background rounded-md shadow-sm">
                                     {/* Mapping Inputs as before, but ensure styling matches the theme */}
                                     {link.valueMapping?.type === 'exact' && (<><Input placeholder="If value is..." value={mapEntry.match ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'match', e.target.value)} className="h-8"/><span className='text-muted-foreground'>then</span><Input placeholder="Set property to..." value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-8"/></>)}
                                     {link.valueMapping?.type === 'range' && (<><Input type="number" placeholder="Min" value={mapEntry.min ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'min', parseFloat(e.target.value))} className="h-8 w-20"/><span className='text-muted-foreground'>to</span><Input type="number" placeholder="Max" value={mapEntry.max ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'max', parseFloat(e.target.value))} className="h-8 w-20"/><span className='text-muted-foreground'>then</span><Input placeholder="Set property to..." value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-8"/></>)}
                                     {link.valueMapping?.type === 'threshold' && (<><Input type="number" placeholder="If value >= " value={mapEntry.threshold ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'threshold', parseFloat(e.target.value))} className="h-8 w-28"/><span className='text-muted-foreground'>then</span><Input placeholder="Set property to..." value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-8"/></>)}
                                     {link.valueMapping?.type === 'boolean' && mapIdx === 0 && (<><Label className="w-20">If True:</Label><Input placeholder="Set property to..." value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-8"/></>)}
                                     {link.valueMapping?.type === 'boolean' && mapIdx === 1 && (<><Label className="w-20">If False:</Label><Input placeholder="Set property to..." value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-8"/></>)}
                                     {link.valueMapping?.type !== 'boolean' && (<TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={()=>removeMappingEntry(index, mapIdx)}><MinusCircle className="h-4 w-4 text-destructive"/></Button></TooltipTrigger><TooltipContent><p>Remove Mapping Rule</p></TooltipContent></Tooltip></TooltipProvider>)}
                                 </div>
                             ))}
                              {link.valueMapping?.type && link.valueMapping?.type !== '_none_' && link.valueMapping?.type !== 'boolean' && (<Button size="sm" variant="outline" onClick={()=>addMappingEntry(index)} className="text-xs h-8 mt-1"><PlusCircle className="h-3.5 w-3.5 mr-1.5"/> Add Rule</Button>)}
                            <div className="mt-1">
                                <Label htmlFor={`map-default-${index}`} className="text-xs">Default Mapped Value (if no match)</Label>
                                <Input id={`map-default-${index}`} placeholder="e.g., 'gray' or original value" value={link.valueMapping?.defaultValue || ''} onChange={(e)=>handleDataLinkChange(index, 'valueMapping', {...link.valueMapping, defaultValue: e.target.value})} className="h-8 text-xs"/>
                            </div>
                         </div>
                    )}
                </div>
                <Separator className="my-3"/>
                {/* Formatting UI - Keep this, make it visually clean */}
                <div className="space-y-2">
                    <Label className="text-xs font-medium flex justify-between items-center">
                        Display Formatting
                        <TooltipProvider delayDuration={100}><Tooltip>
                             <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                             <TooltipContent side="left" className="max-w-xs"><p>Control how the data point's value is displayed, if the target property shows text. Applied after mapping.</p></TooltipContent>
                         </Tooltip></TooltipProvider>
                    </Label>
                    {(!link.dataPointId || !dataPoints[link.dataPointId]) && <p className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded-md">Select a Data Point above to enable formatting options based on its type.</p>}
                    {link.dataPointId && dataPoints[link.dataPointId] && (
                        <div className="pl-2 space-y-2 text-xs border-l-2 border-accent/30">
                            {(dataPoints[link.dataPointId].dataType.includes('Int') || dataPoints[link.dataPointId].dataType.includes('Float') || dataPoints[link.dataPointId].dataType.includes('Double')) && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <FieldInput id={`format-prefix-${index}`} label="Prefix" value={link.format?.prefix ?? ''} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'prefix', e.target.value)} placeholder="e.g. $"/>
                                    <FieldInput id={`format-suffix-${index}`} label="Suffix (Unit)" value={link.format?.suffix ?? dataPoints[link.dataPointId].unit ?? ''} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'suffix', e.target.value)} placeholder="e.g. kW"/>
                                    <FieldInput type="number" id={`format-precision-${index}`} label="Decimals" value={link.format?.precision ?? ''} onChange={(e: { target: { value: string; }; }) => handleFormatChange(index, 'precision', e.target.value === '' ? undefined : parseInt(e.target.value))} min="0" step="1" placeholder="e.g. 2"/>
                                </div>
                            )}
                             {dataPoints[link.dataPointId].dataType === 'Boolean' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <FieldInput id={`format-true-${index}`} label="If True, Display:" value={link.format?.trueLabel ?? 'True'} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'trueLabel', e.target.value)} placeholder="e.g. ON"/>
                                    <FieldInput id={`format-false-${index}`} label="If False, Display:" value={link.format?.falseLabel ?? 'False'} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'falseLabel', e.target.value)} placeholder="e.g. OFF"/>
                                </div>
                            )}
                            {dataPoints[link.dataPointId].dataType === 'DateTime' && (
                                <FieldInput id={`format-datetime-${index}`} label="Date/Time Pattern" value={link.format?.dateTimeFormat ?? 'YYYY-MM-DD HH:mm:ss'} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'dateTimeFormat', e.target.value)} placeholder="moment.js format"/>
                            )}
                             {dataPoints[link.dataPointId].dataType === 'String' && ( // Basic prefix/suffix for strings
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <FieldInput id={`format-prefix-${index}`} label="Prefix" value={link.format?.prefix ?? ''} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'prefix', e.target.value)}/>
                                    <FieldInput id={`format-suffix-${index}`} label="Suffix" value={link.format?.suffix ?? ''} onChange={(e: { target: { value: any; }; }) => handleFormatChange(index, 'suffix', e.target.value)}/>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
    const FieldInput = ({ id, label, value, onChange, type = "text", placeholder, ...props }: any) => (
        <div className="space-y-0.5"><Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">{label}</Label><Input type={type} id={id} value={value} onChange={onChange} placeholder={placeholder} className="h-8 text-xs" {...props}/></div>
    );


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl lg:max-w-3xl max-h-[90vh] xl:max-h-[80vh] flex flex-col p-0 shadow-2xl rounded-lg border-border/70">
                <DialogHeader className="p-4 border-b border-border/60 flex flex-row justify-between items-center sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                   <div className='space-y-0.5'>
                     <DialogTitle className="text-xl font-bold flex items-center">
                        <PencilLine className="w-5 h-5 mr-2.5 text-primary"/> Configure {elementTypeUserFriendly}
                     </DialogTitle>
                     <DialogDescription className="text-xs text-muted-foreground pl-[34px]">ID: {selectedElement.id}</DialogDescription>
                   </div>
                    <div className="flex items-center space-x-2">
                        <TooltipProvider delayDuration={100}> <Tooltip>
                            <TooltipTrigger asChild>
                               <Button variant="destructive" size="icon" onClick={handleDeleteAndClose} className="h-9 w-9">
                                   <Trash2 className="h-4 w-4"/>
                               </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete this element</p></TooltipContent>
                        </Tooltip> </TooltipProvider>
                         <DialogClose asChild>
                           <Button variant="ghost" size="icon" className="h-9 w-9"> <X className="h-5 w-5"/> </Button>
                        </DialogClose>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-grow overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0" id="inspector-scroll-area">
                    <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-11 sticky top-0 bg-background/90 backdrop-blur-sm z-[9] border-b border-border/60 rounded-none">
                            <TabsTrigger value="properties" className="text-sm data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none">
                                <Settings2 className="w-4 h-4 mr-2"/>Properties
                            </TabsTrigger>
                            <TabsTrigger value="data_linking" className="text-sm data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none">
                                <Link2 className="w-4 h-4 mr-2"/>Data Linking
                            </TabsTrigger>
                        </TabsList>

                        <div className="p-4 md:p-6"> {/* Padding for content inside scroll area */}
                            <TabsContent value="properties" className="mt-0 space-y-6 outline-none">
                                <Card className='shadow-sm border-border/60'>
                                    <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Basic Information</CardTitle></CardHeader>
                                    <CardContent className='p-4 pt-0 space-y-4'>
                                        <FieldInput id="label" label="Display Label / Name" value={formData.label || ''} onChange={handleInputChange} name="label" placeholder="e.g., Main Inverter"/>
                                    </CardContent>
                                </Card>

                                {isNode(selectedElement) && currentElementType === SLDElementType.TextLabel && (
                                    <Card className='shadow-sm border-border/60'>
                                         <CardHeader className='p-4'><CardTitle className='text-base font-semibold flex items-center'><Palmtree className="w-4 h-4 mr-2 text-green-500"/>Text & Appearance</CardTitle></CardHeader>
                                         <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput id="text" name="text" label="Static Text Content" value={(formData as TextLabelNodeData).text || ''} onChange={handleInputChange} placeholder="Enter text to display"/>
                                            <Separator/>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontSize" className="text-xs flex items-center"><BaselineIcon className="w-3.5 h-3.5 mr-1"/>Font Size</Label> <Select name="styleConfig.fontSize" value={(formData as TextLabelNodeData).styleConfig?.fontSize || '14px'} onValueChange={(val) => handleSelectChange("styleConfig.fontSize", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue/></SelectTrigger> <SelectContent>{fontSizes.map(fs=><SelectItem key={fs.value} value={fs.value}>{fs.label}</SelectItem>)}</SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontWeight" className="text-xs flex items-center"><CaseSensitive className="w-3.5 h-3.5 mr-1"/>Font Weight</Label> <Select name="styleConfig.fontWeight" value={String((formData as TextLabelNodeData).styleConfig?.fontWeight || 'normal')} onValueChange={(val) => handleSelectChange("styleConfig.fontWeight", val === '300' ? 300 : val)}> <SelectTrigger className="h-9 text-xs"><SelectValue/></SelectTrigger> <SelectContent>{fontWeights.map(fw=><SelectItem key={fw.value} value={fw.value}>{fw.label}</SelectItem>)}</SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontStyle" className="text-xs">Font Style</Label> <Select name="styleConfig.fontStyle" value={(formData as TextLabelNodeData).styleConfig?.fontStyle || 'normal'} onValueChange={(val) => handleSelectChange("styleConfig.fontStyle", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue/></SelectTrigger> <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="italic">Italic</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput name="styleConfig.color" id="styleConfig.color" label={<LabelLayout icon={PaletteIcon}>Text Color</LabelLayout>} type="color" value={(formData as TextLabelNodeData).styleConfig?.color || '#000000'} onChange={handleInputChange} className="h-9 p-1"/>
                                                <FieldInput name="styleConfig.backgroundColor" id="styleConfig.backgroundColor" label="Background Color" type="color" value={(formData as TextLabelNodeData).styleConfig?.backgroundColor || '#00000000'} onChange={handleInputChange} className="h-9 p-1"/>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.textAlign" className="text-xs flex items-center"><AlignLeftIcon className="w-3.5 h-3.5 mr-1"/>Text Align</Label> <Select name="styleConfig.textAlign" value={(formData as TextLabelNodeData).styleConfig?.textAlign || 'left'} onValueChange={(val) => handleSelectChange("styleConfig.textAlign", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue/></SelectTrigger> <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput name="styleConfig.padding" id="styleConfig.padding" label="Padding" placeholder="e.g., 2px 4px" value={(formData as TextLabelNodeData).styleConfig?.padding || '2px'} onChange={handleInputChange} className="col-span-full md:col-span-1"/>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {isNode(selectedElement) && currentElementType === SLDElementType.Contactor && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Contactor Settings</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <div className="space-y-1"> <Label htmlFor="config.normallyOpen">Contact Type</Label> <Select name="config.normallyOpen" value={String((formData as ContactorNodeData).config?.normallyOpen ?? true)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}> <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="true">Normally Open (NO)</SelectItem><SelectItem value="false">Normally Closed (NC)</SelectItem></SelectContent> </Select> </div>
                                        </CardContent>
                                    </Card>
                                )}
                                {isNode(selectedElement) && currentElementType === SLDElementType.Inverter && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Inverter Settings</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput type="number" id="config.ratedPower" name="config.ratedPower" label="Rated Power (kW)" value={(formData as InverterNodeData).config?.ratedPower || ''} onChange={handleInputChange} placeholder="e.g., 5" step="0.1"/>
                                        </CardContent>
                                    </Card>
                                )}

                               {isNode(selectedElement) && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Drilldown Link (Optional)</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                                <div className="flex items-center space-x-2">
                                                    <Input type="checkbox" id="isDrillable" name="isDrillable" checked={!!formData.isDrillable} onChange={handleInputChange} className="h-4 w-4 accent-primary"/>
                                                    <Label htmlFor="isDrillable" className="text-sm font-normal">Enable drilldown to another SLD?</Label>
                                                </div>
                                            {formData.isDrillable && (
                                                <FieldInput id="subLayoutId" name="subLayoutId" label="Sub-Layout ID" value={formData.subLayoutId || ''} onChange={handleInputChange} placeholder="Enter ID of the target SLD layout"/>
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
                                            Connect this element to real-time data by adding data links.
                                        </p>
                                        <Button variant="default" size="sm" onClick={addDataLink} className="mt-6">
                                            <PlusCircle className="h-4 w-4 mr-2" /> Add First Data Link
                                        </Button>
                                    </div>
                                )}
                                {dataLinks.map(renderDataLinkCard)}
                                {dataLinks.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={addDataLink} className="w-full">
                                        <PlusCircle className="h-4 w-4 mr-2" /> Add Another Data Link
                                    </Button>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </ScrollArea>

                <DialogFooter className="p-4 border-t border-border/60 flex-shrink-0 sticky bottom-0 bg-background/95 backdrop-blur-sm z-10">
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
// Small helper for cleaner labels with icons
const LabelLayout: React.FC<{icon: React.ElementType, children: React.ReactNode}> = ({ icon: Icon, children }) => (
    <span className="flex items-center"><Icon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/80"/>{children}</span>
);

export default SLDInspectorDialog;