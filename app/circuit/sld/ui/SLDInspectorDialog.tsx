// app/circuit/sld/ui/SLDInspectorDialog.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Node, Edge, NodeHandleBounds } from 'reactflow';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, PlusCircle, MinusCircle, X } from 'lucide-react'; // Added X for close
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose, // Use DialogClose for easy closing
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card"; // Keep Card for inner sections like Data Links
import {
    CustomNodeData, CustomFlowEdgeData, DataPoint,
    DataPointLink, SLDElementType, CustomNodeType, CustomFlowEdge,
    TextLabelNodeData,
    GenericDeviceNodeData,
    ContactorNodeData,
    InverterNodeData,
} from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ComboboxOption, SearchableSelect } from './SearchableSelect';

// --- Renamed Props Interface ---
interface SLDInspectorDialogProps {
    isOpen: boolean; // Controlled by parent
    onOpenChange: (open: boolean) => void; // Callback to parent to change state
    selectedElement: CustomNodeType | CustomFlowEdge | null; // Element to inspect
    onUpdateElement: (element: CustomNodeType | CustomFlowEdge) => void;
    onDeleteElement: (elementId: string) => void;
}

// --- Helper Functions (remain the same) ---
const targetPropertiesOptions: ComboboxOption[] = [
    // ... (options remain the same)
    { value: 'value', label: 'Value (for DataLabel)' },
    { value: 'statusText', label: 'Status Text' },
    { value: 'fillColor', label: 'Fill Color (Background)' },
    { value: 'strokeColor', label: 'Stroke Color (Border/Edge)' },
    { value: 'textColor', label: 'Text Color' },
    { value: 'visible', label: 'Visibility (true/false)' },
    { value: 'flowDirection', label: 'Flow Direction (Edge: forward/reverse/none)' },
    { value: 'animationSpeed', label: 'Animation Speed (Edge: e.g., "10s")' },
    { value: 'powerOutput', label: 'Power Output (Custom)' },
];

function isNode(element: any): element is CustomNodeType {
    return element && 'position' in element && 'data' in element && 'id' in element;
}

function isEdge(element: any): element is CustomFlowEdge {
    return element && 'source' in element && 'target' in element && 'id' in element;
}

const getElementTypeName = (element: CustomNodeType | CustomFlowEdge | null): string => {
    if (!element) return 'Element'; // Default title part
    if (isNode(element)) {
        switch (element.data?.elementType) {
            case SLDElementType.TextLabel: return 'Text Label';
            case SLDElementType.Contactor: return 'Contactor';
            case SLDElementType.Inverter: return 'Inverter';
            // Add other specific types if needed
            case SLDElementType.GenericDevice: return 'Device';
            default: return 'Node';
        }
    }
    return 'Connection';
}
// --- Component ---
const SLDInspectorDialog: React.FC<SLDInspectorDialogProps> = ({
    isOpen,
    onOpenChange,
    selectedElement,
    onUpdateElement,
    onDeleteElement
}) => {
    const dataPoints = useAppStore((state) => state.dataPoints);
    const [formData, setFormData] = useState<Partial<CustomNodeData & CustomFlowEdgeData>>({});
    const [dataLinks, setDataLinks] = useState<DataPointLink[]>([]);

    // Reset form when the selected element changes *or* when the dialog opens with a new element
    useEffect(() => {
        if (isOpen && selectedElement) {
            const elementDataCopy = JSON.parse(JSON.stringify(selectedElement.data ?? {}));
            setFormData(elementDataCopy);
            setDataLinks(elementDataCopy.dataPointLinks ?? []);
        } else if (!isOpen) {
             // Optional: Clear form when closed to avoid stale data flash on reopen
            // setFormData({});
            // setDataLinks([]);
        }
    }, [selectedElement, isOpen]); // Depend on isOpen as well

    // DataPoint options memo (remains the same)
    const dataPointOptions = React.useMemo((): ComboboxOption[] => {
       return Object.values(dataPoints).map(dp => ({
          value: dp.id,
          label: `${dp.name} (${dp.id}) - [${dp.category ?? 'general'}]`
       }));
    }, [dataPoints]);

    // --- Handlers (remain mostly the same, but may need to close dialog) ---
    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // ... (implementation is the same)
        const { name, value } = event.target;
        setFormData(prev => {
            const newState = {...prev};
            if (name.startsWith('config.')) {
                const configKey = name.split('.')[1];
                newState.config = { ...(newState.config ?? {}), [configKey]: value };
            } else {
                (newState as any)[name] = value;
            }
            return newState;
        });
    }, []);

    const handleSelectChange = useCallback((name: string, value: string | boolean) => {
        // ... (implementation is the same)
        setFormData(prev => {
            const newState = {...prev};
            if (name.startsWith('config.')) {
                const configKey = name.split('.')[1];
                newState.config = { ...(newState.config ?? {}), [configKey]: value };
            } else {
                (newState as any)[name] = value;
            }
            return newState;
        });
    }, []);

    const handleDataLinkChange = useCallback((index: number, field: keyof DataPointLink, value: any) => {
        // ... (implementation is the same)
        setDataLinks(prevLinks => {
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
              }
          }
          newLinks[index] = linkToUpdate;
          return newLinks;
        });
    }, [dataPoints]);

    const handleMappingTypeChange = useCallback((linkIndex: number, selectedValue: string) => {
        // ... (implementation is the same)
        setDataLinks(prevLinks => {
             const newLinks = [...prevLinks];
             const link = { ...newLinks[linkIndex] } as DataPointLink;
             if (selectedValue === '_none_') {
                 link.valueMapping = undefined;
             } else {
                 const mapType = selectedValue as NonNullable<DataPointLink['valueMapping']>['type'];
                 let defaultMapping: any[] = [];
                 if (mapType === 'exact') defaultMapping = [{ match: '', value: '' }];
                 else if (mapType === 'range') defaultMapping = [{ min: 0, max: 10, value: '' }];
                 else if (mapType === 'threshold') defaultMapping = [{ threshold: 0, value: '' }];
                 else if (mapType === 'boolean') defaultMapping = [{ match: true, value: '' }, { match: false, value: '' }];

                 link.valueMapping = { type: mapType, mapping: defaultMapping, defaultValue: '' };
             }
             newLinks[linkIndex] = link;
             return newLinks;
        });
    }, []);

    const handleMappingEntryChange = useCallback((linkIndex: number, mapIndex: number, field: string, value: any) => {
        // ... (implementation is the same)
        setDataLinks(prevLinks => {
            const newLinks = JSON.parse(JSON.stringify(prevLinks));
            if (newLinks[linkIndex]?.valueMapping?.mapping[mapIndex] !== undefined) {
                newLinks[linkIndex].valueMapping.mapping[mapIndex][field] = value;
            }
            return newLinks;
        });
    }, []);

    const addMappingEntry = useCallback((linkIndex: number) => {
       // ... (implementation is the same)
       setDataLinks(prevLinks => {
           const newLinks = JSON.parse(JSON.stringify(prevLinks));
           if (newLinks[linkIndex]?.valueMapping?.mapping && newLinks[linkIndex]?.valueMapping?.type !== 'boolean') {
               const type = newLinks[linkIndex].valueMapping.type;
               let newEntry = {};
               if (type === 'exact') newEntry = { match: '', value: '' };
               else if (type === 'range') newEntry = { min: 0, max: 10, value: '' };
               else if (type === 'threshold') newEntry = { threshold: 0, value: '' };
               newLinks[linkIndex].valueMapping.mapping.push(newEntry);
           }
           return newLinks;
       });
    }, []);

    const removeMappingEntry = useCallback((linkIndex: number, mapIndex: number) => {
        // ... (implementation is the same)
        setDataLinks(prevLinks => {
            const newLinks = JSON.parse(JSON.stringify(prevLinks));
            if (newLinks[linkIndex]?.valueMapping?.mapping && newLinks[linkIndex]?.valueMapping?.type !== 'boolean') {
                newLinks[linkIndex].valueMapping.mapping.splice(mapIndex, 1);
            }
            return newLinks;
        });
    }, []);

    const handleFormatChange = useCallback((linkIndex: number, field: keyof NonNullable<DataPointLink['format']>, value: any) => {
        // ... (implementation is the same)
         setDataLinks(prevLinks => {
          const newLinks = [...prevLinks];
          const link = newLinks[linkIndex];
          if (!link) return prevLinks;

          const dpId = link.dataPointId;
          const dp = dpId ? dataPoints[dpId] : undefined;

          let currentFormat: Partial<any> = link.format ?? {}; // Use Partial<any> for flexibility during build
          let inferredType = currentFormat.type;

          if (!inferredType && dp) {
             if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(dp.dataType)) inferredType = 'number';
             else if (dp.dataType === 'Boolean') inferredType = 'boolean';
             else if (dp.dataType === 'DateTime') inferredType = 'dateTime';
             else inferredType = 'string';
          } else if (!inferredType) {
              inferredType = 'string';
          }

           const updatedFormat = {
               ...currentFormat,
               type: inferredType,
               [field]: value === undefined || value === null ? undefined : value
           };

           // Clean up
          if (updatedFormat.type !== 'number') delete updatedFormat.precision;
          if (updatedFormat.type !== 'boolean') { delete updatedFormat.trueLabel; delete updatedFormat.falseLabel; }
          if (updatedFormat.type !== 'dateTime') delete updatedFormat.dateTimeFormat;

           const { type, ...restOfFormat } = updatedFormat;
           if (type === 'string' && Object.keys(restOfFormat).filter(k => restOfFormat[k] !== undefined).length === 0) { // Check if only type=string exists
               newLinks[linkIndex] = { ...link, format: undefined };
           } else {
              newLinks[linkIndex] = { ...link, format: updatedFormat as DataPointLink['format'] }; // Assert final type
           }

          return newLinks;
        });
    }, [dataPoints]);


    const addDataLink = useCallback(() => {
        // ... (implementation is the same)
        setDataLinks(prev => [...prev, { dataPointId: '', targetProperty: '' }]);
    }, []);

    const removeDataLink = useCallback((index: number) => {
        // ... (implementation is the same)
        setDataLinks(prev => prev.filter((_, i) => i !== index));
    }, []);

    // --- Saving and Deleting (Now need to close the dialog) ---
    const handleSaveChangesAndClose = useCallback(() => {
        if (!selectedElement) return;
        // Logic from previous handleSaveChanges is identical
        const validDataLinks = dataLinks.filter(link => link.dataPointId && link.targetProperty);
        let updatedElement: CustomNodeType | CustomFlowEdge;

        if (isNode(selectedElement)) {
            const baseNodeData: Partial<CustomNodeData> = { elementType: selectedElement.data.elementType, label: selectedElement.data.label };
            const nodeFormData: Partial<CustomNodeData> = { label: formData.label, config: formData.config, isDrillable: formData.isDrillable, subLayoutId: formData.subLayoutId, text: formData.elementType === SLDElementType.TextLabel ? formData.text : undefined };
            let finalNodeData = { ...baseNodeData, ...nodeFormData, elementType: baseNodeData.elementType!, dataPointLinks: validDataLinks, label: nodeFormData.label ?? baseNodeData.label ?? '' } as unknown as CustomNodeData;
            if (finalNodeData.config && Object.keys(finalNodeData.config).length === 0) delete finalNodeData.config;
            if (finalNodeData.elementType !== SLDElementType.TextLabel) delete (finalNodeData as any).text;
            updatedElement = { ...selectedElement, data: finalNodeData as any };
        } else if (isEdge(selectedElement)) {
            const baseEdgeData: Partial<CustomFlowEdgeData> = { label: selectedElement.data?.label };
            const edgeFormData: Partial<CustomFlowEdgeData> = { label: formData.label };
            const finalEdgeData: CustomFlowEdgeData = { ...baseEdgeData, ...edgeFormData, dataPointLinks: validDataLinks, label: edgeFormData.label ?? baseEdgeData.label ?? '' };
            updatedElement = { ...selectedElement, data: finalEdgeData as any };
        } else {
            console.error("Selected element is neither a node nor an edge:", selectedElement);
            return;
        }

        onUpdateElement(updatedElement);
        console.log("Saving element:", updatedElement);
        onOpenChange(false); // Close dialog after saving

    }, [selectedElement, formData, dataLinks, onUpdateElement, onOpenChange]);


    const handleDeleteAndClose = useCallback(() => {
        if (selectedElement) {
            onDeleteElement(selectedElement.id);
            onOpenChange(false); // Close dialog after deleting
        }
    }, [selectedElement, onDeleteElement, onOpenChange]);

    // --- Render Logic ---
    if (!selectedElement) {
        // This component is now always rendered when isOpen=true,
        // so this check is mostly a safeguard if parent logic allows opening without an element.
        return null;
    }

    const elementType = getElementTypeName(selectedElement);
    const currentElementType = isNode(selectedElement) ? selectedElement.data.elementType : undefined;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl lg:max-w-2xl max-h-[85vh] flex flex-col p-0"> {/* Adjust size, remove padding */}
                <DialogHeader className="p-4 border-b dark:border-gray-700 flex-row justify-between items-center space-y-0"> {/* Adjust padding, flex */}
                   <div className='space-y-1'>
                     <DialogTitle className="text-lg font-semibold">Configure {elementType}</DialogTitle>
                     <DialogDescription className="text-xs text-muted-foreground">ID: {selectedElement.id}</DialogDescription>
                   </div>
                    {/* Delete Button */}
                    <DialogClose asChild>
                       <Button variant="ghost" size="icon" onClick={handleDeleteAndClose} title="Delete Element" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                           <Trash2 className="h-4 w-4"/>
                       </Button>
                    </DialogClose>
                </DialogHeader>

                {/* Make Tabs Content Scrollable */}
                <ScrollArea className="flex-grow overflow-y-auto"> {/* Let ScrollArea manage height */}
                    <Tabs defaultValue="properties" className="w-full p-4"> {/* Add padding to content area */}
                        <TabsList className="grid w-full grid-cols-2 h-9">
                            <TabsTrigger value="properties" className="text-xs">Properties</TabsTrigger>
                            <TabsTrigger value="data_linking" className="text-xs">Data Linking</TabsTrigger>
                        </TabsList>

                        {/* --- Properties Tab Content --- */}
                        <TabsContent value="properties" className="mt-4 space-y-4"> {/* Add margin top */}
                           {/* ... (All the input fields for label, config, text remain exactly the same) ... */}
                            {/* Common Label Field */}
                            <div className="space-y-1">
                                <Label htmlFor="label" className="text-xs">Label</Label>
                                <Input id="label" name="label" value={formData.label || ''} onChange={handleInputChange} className="h-8 text-sm"/>
                            </div>
                            {/* TextLabel Specific */}
                            {isNode(selectedElement) && currentElementType === SLDElementType.TextLabel && (
                                <div className="space-y-1">
                                    <Label htmlFor="text" className="text-xs">Static Text</Label>
                                    <Input id="text" name="text" value={(formData as Partial<TextLabelNodeData>).text || ''} onChange={handleInputChange} className="h-8 text-sm"/>
                                </div>
                            )}
                            {/* Contactor Specific */}
                             {isNode(selectedElement) && currentElementType === SLDElementType.Contactor && (
                                <div className="space-y-1">
                                    <Label htmlFor="config.normallyOpen" className="text-xs">Contact Type</Label>
                                     <Select name="config.normallyOpen" value={String((formData as Partial<ContactorNodeData>).config?.normallyOpen ?? true)} onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')} >
                                         <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
                                         <SelectContent><SelectItem value="true">Normally Open (NO)</SelectItem><SelectItem value="false">Normally Closed (NC)</SelectItem></SelectContent>
                                     </Select>
                                </div>
                             )}
                             {/* Inverter Specific */}
                             {isNode(selectedElement) && currentElementType === SLDElementType.Inverter && (
                                <div className="space-y-1">
                                  <Label htmlFor="config.ratedPower" className="text-xs">Rated Power (kW)</Label>
                                  <Input type="number" id="config.ratedPower" name="config.ratedPower" value={(formData as Partial<InverterNodeData>).config?.ratedPower || ''} onChange={handleInputChange} className="h-8 text-sm" placeholder="e.g., 5" step="0.1"/>
                                </div>
                              )}
                        </TabsContent>

                        {/* --- Data Linking Tab Content --- */}
                        <TabsContent value="data_linking" className="mt-4 space-y-3">
                             {dataLinks.map((link, index) => (
                                // Use Card for visual separation of links
                                <Card key={index} className="p-3 space-y-3 bg-muted/40 border dark:border-gray-700 shadow-sm">
                                    {/* ... (Content of each data link card remains exactly the same) ... */}
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-medium text-muted-foreground">Link {index + 1}</p>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDataLink(index)} title="Remove Link">
                                            <MinusCircle className="h-3.5 w-3.5 text-destructive"/>
                                        </Button>
                                    </div>
                                    {/* Data Point */}
                                    <div className="space-y-1">
                                        <Label htmlFor={`dp-select-${index}`} className="text-xs">Data Point</Label>
                                         <SearchableSelect options={dataPointOptions} value={link.dataPointId} onChange={(value) => handleDataLinkChange(index, 'dataPointId', value)} placeholder="Select Data Point..." searchPlaceholder="Search..." notFoundText="No match."/>
                                    </div>
                                    {/* Target Prop */}
                                    <div className="space-y-1">
                                        <Label htmlFor={`target-prop-${index}`} className="text-xs">Target Property</Label>
                                         <SearchableSelect options={targetPropertiesOptions} value={link.targetProperty} onChange={(value) => handleDataLinkChange(index, 'targetProperty', value)} placeholder="Select Target Property..." searchPlaceholder="Search..." notFoundText="No match."/>
                                    </div>
                                    <Separator className="my-3 dark:bg-gray-600"/>
                                    {/* Value Mapping */}
                                     <div className="space-y-2">
                                         <Label className="text-xs flex justify-between items-center">Value Mapping <Select value={link.valueMapping?.type ?? '_none_'} onValueChange={(value) => handleMappingTypeChange(index, value)}><SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue placeholder="Map Type..." /></SelectTrigger><SelectContent><SelectItem value="_none_">None</SelectItem><SelectItem value="exact">Exact</SelectItem><SelectItem value="range">Range</SelectItem><SelectItem value="threshold">Threshold</SelectItem><SelectItem value="boolean">Boolean</SelectItem></SelectContent></Select></Label>
                                          {/* Mapping entries rendering */}
                                          {link.valueMapping && link.valueMapping.mapping.map((mapEntry, mapIdx) => <div key={mapIdx} className="flex gap-2 items-center pl-2">{/* ... mapping inputs ... */}{link.valueMapping?.type === 'exact' && (<><Input placeholder="Match Value" value={mapEntry.match ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'match', e.target.value)} className="h-7 text-xs"/><Input placeholder="Set Property To" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-7 text-xs"/></>)}{link.valueMapping?.type === 'range' && (<><Input type="number" placeholder="Min" value={mapEntry.min ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'min', parseFloat(e.target.value) || 0)} className="h-7 text-xs w-16"/><Input type="number" placeholder="Max" value={mapEntry.max ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'max', parseFloat(e.target.value) || 0)} className="h-7 text-xs w-16"/><Input placeholder="Set Property To" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-7 text-xs"/></>)}{link.valueMapping?.type === 'threshold' && (<><Input type="number" placeholder="Threshold >=" value={mapEntry.threshold ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'threshold', parseFloat(e.target.value) || 0)} className="h-7 text-xs w-24"/><Input placeholder="Set Property To" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-7 text-xs"/></>)}{link.valueMapping?.type === 'boolean' && mapIdx === 0 && (<><span className="text-xs font-medium w-16 shrink-0">If True:</span><Input placeholder="Set Property To" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-7 text-xs"/></>)}{link.valueMapping?.type === 'boolean' && mapIdx === 1 && (<><span className="text-xs font-medium w-16 shrink-0">If False:</span><Input placeholder="Set Property To" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-7 text-xs"/></>)}{link.valueMapping?.type !== 'boolean' && (<Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={()=>removeMappingEntry(index, mapIdx)} title="Remove Mapping Entry"><MinusCircle className="h-3 w-3 text-destructive"/></Button>)}</div>)}
                                          {/* Add mapping entry button */}
                                          {link.valueMapping && link.valueMapping?.type !== 'boolean' && (<Button size="sm" variant="outline" onClick={()=>addMappingEntry(index)} className="text-xs h-7 mt-1 ml-2"><PlusCircle className="h-3 w-3 mr-1"/> Add Map Entry</Button>)}
                                     </div>
                                    <Separator className="my-3 dark:bg-gray-600"/>
                                    {/* Formatting */}
                                    <div className="space-y-2">
                                        <Label className="text-xs">Formatting (Optional)</Label>
                                        {/* Conditional formatting inputs */}
                                        { link.format?.type === 'number' && ( <div className="grid grid-cols-2 gap-2 pl-2">{/*... number inputs ...*/}<div className="space-y-1"><Label htmlFor={`format-prefix-${index}`} className="text-[10px]">Prefix</Label><Input id={`format-prefix-${index}`} placeholder="e.g., '$'" value={link.format?.prefix ?? ''} onChange={(e) => handleFormatChange(index, 'prefix', e.target.value)} className="h-7 text-xs"/></div><div className="space-y-1"><Label htmlFor={`format-suffix-${index}`} className="text-[10px]">Suffix</Label><Input id={`format-suffix-${index}`} placeholder="e.g., 'kW'" value={link.format?.suffix ?? ''} onChange={(e) => handleFormatChange(index, 'suffix', e.target.value)} className="h-7 text-xs"/></div><div className="space-y-1"><Label htmlFor={`format-precision-${index}`} className="text-[10px]">Precision</Label><Input type="number" id={`format-precision-${index}`} placeholder="e.g., 2" value={link.format?.precision ?? ''} onChange={(e) => handleFormatChange(index, 'precision', e.target.value === '' ? undefined : parseInt(e.target.value))} min="0" step="1" className="h-7 text-xs"/></div></div> )}
                                        { link.format?.type === 'boolean' && ( <div className="grid grid-cols-2 gap-2 pl-2">{/*... boolean inputs ...*/}<div className="space-y-1"><Label htmlFor={`format-true-${index}`} className="text-[10px]">True Label</Label><Input id={`format-true-${index}`} placeholder="e.g., 'ON'" value={link.format?.trueLabel ?? ''} onChange={(e) => handleFormatChange(index, 'trueLabel', e.target.value)} className="h-7 text-xs"/></div><div className="space-y-1"><Label htmlFor={`format-false-${index}`} className="text-[10px]">False Label</Label><Input id={`format-false-${index}`} placeholder="e.g., 'OFF'" value={link.format?.falseLabel ?? ''} onChange={(e) => handleFormatChange(index, 'falseLabel', e.target.value)} className="h-7 text-xs"/></div></div> )}
                                        { link.format?.type === 'dateTime' && ( <div className="pl-2">{/*... datetime input ...*/}<div className="space-y-1"><Label htmlFor={`format-datetime-${index}`} className="text-[10px]">Date/Time Format</Label><Input id={`format-datetime-${index}`} placeholder="e.g., 'YYYY-MM-DD HH:mm'" value={link.format?.dateTimeFormat ?? ''} onChange={(e) => handleFormatChange(index, 'dateTimeFormat', e.target.value)} className="h-7 text-xs"/></div></div> )}
                                        { link.format?.type === 'string' && ( <div className="grid grid-cols-2 gap-2 pl-2">{/*... string inputs ...*/}<div className="space-y-1"><Label htmlFor={`format-prefix-${index}`} className="text-[10px]">Prefix</Label><Input id={`format-prefix-${index}`} placeholder="e.g., 'Status: '" value={link.format?.prefix ?? ''} onChange={(e) => handleFormatChange(index, 'prefix', e.target.value)} className="h-7 text-xs"/></div><div className="space-y-1"><Label htmlFor={`format-suffix-${index}`} className="text-[10px]">Suffix</Label><Input id={`format-suffix-${index}`} placeholder="e.g., '!'" value={link.format?.suffix ?? ''} onChange={(e) => handleFormatChange(index, 'suffix', e.target.value)} className="h-7 text-xs"/></div></div> )}
                                        { !link.format?.type && ( <p className="text-xs text-muted-foreground pl-2 italic">Select a Data Point to enable formatting.</p> )}
                                    </div>
                                </Card>
                             ))}
                            <Button variant="outline" size="sm" onClick={addDataLink} className="w-full mt-3"> {/* Add margin top */}
                                <PlusCircle className="h-4 w-4 mr-1" /> Add Data Link
                            </Button>
                        </TabsContent>
                    </Tabs>
                </ScrollArea>

                <DialogFooter className="p-4 border-t dark:border-gray-700"> {/* Adjust padding */}
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveChangesAndClose}>Apply Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SLDInspectorDialog; 