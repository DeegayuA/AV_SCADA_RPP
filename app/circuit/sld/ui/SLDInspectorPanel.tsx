// components/sld/ui/SLDInspectorPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Node, Edge, NodeHandleBounds } from 'reactflow'; // Import NodeHandleBounds if needed by CustomNodeType implicitly
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, PlusCircle, MinusCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  CustomNodeData, CustomFlowEdgeData, DataPoint,
  DataPointLink, SLDElementType, CustomNodeType, CustomFlowEdge,
  TextLabelNodeData, // Assume this is part of CustomNodeData union
  // Add other specific NodeData types if they are part of CustomNodeData union
  GenericDeviceNodeData, // Example: Assuming this exists in types/sld.ts
  ContactorNodeData,     // Example
  InverterNodeData,      // Example
} from '@/types/sld'; // Adjust path as needed
import { useAppStore } from '@/stores/appStore';
import { ComboboxOption, SearchableSelect } from './SearchableSelect';

interface SLDInspectorPanelProps {
  selectedElement: CustomNodeType | CustomFlowEdge | null;
  onUpdateElement: (element: CustomNodeType | CustomFlowEdge) => void;
  onDeleteElement: (elementId: string) => void;
}

const targetPropertiesOptions: ComboboxOption[] = [
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
    if (!element) return 'None';
    if (isNode(element)) {
        // Provide a more specific name if possible, fallback to 'Node'
        switch(element.data?.elementType) {
            case SLDElementType.TextLabel:
                return 'TextLabel';
            case SLDElementType.Contactor:
                return 'Contactor';
            case SLDElementType.Inverter:
                return 'Inverter';
            default:
                return 'Node';
        }
    }
    return 'Connection'; // Edges are connections
}

const SLDInspectorPanel: React.FC<SLDInspectorPanelProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement
}) => {
  const dataPoints = useAppStore((state) => state.dataPoints);
  // Use a more specific state type based on the selected element if possible,
  // but Partial union is often necessary for the form state.
  const [formData, setFormData] = useState<Partial<CustomNodeData & CustomFlowEdgeData>>({});
  const [dataLinks, setDataLinks] = useState<DataPointLink[]>([]);

  const dataPointOptions = React.useMemo((): ComboboxOption[] => {
    return Object.values(dataPoints).map(dp => ({
      value: dp.id,
      label: `${dp.name} (${dp.id}) - [${dp.category ?? 'general'}]`
    }));
  }, [dataPoints]);

  useEffect(() => {
    if (selectedElement) {
      const elementDataCopy = JSON.parse(JSON.stringify(selectedElement.data ?? {}));
      setFormData(elementDataCopy);
      setDataLinks(elementDataCopy.dataPointLinks ?? []);
    } else {
      setFormData({});
      setDataLinks([]);
    }
  }, [selectedElement]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    setDataLinks(prevLinks => {
      const newLinks = [...prevLinks];
      const linkToUpdate = { ...(newLinks[index] ?? {}) } as DataPointLink;

      (linkToUpdate as any)[field] = value;

      if (field === 'dataPointId') {
          const selectedDp = dataPoints[value as string];
          if (selectedDp?.unit) {
              // Ensure format exists and attempt to infer type before setting suffix
              const currentFormatType = linkToUpdate.format?.type;
              let inferredType = currentFormatType ?? 'string'; // Default
              if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(selectedDp.dataType)) {
                inferredType = 'number';
              } else if (selectedDp.dataType === 'Boolean') {
                inferredType = 'boolean';
              } else if (selectedDp.dataType === 'DateTime') {
                 inferredType = 'dateTime';
              }

              // Only set suffix if the format is not boolean (or doesn't exist yet)
              if(inferredType !== 'boolean') {
                 linkToUpdate.format = {
                    ...(linkToUpdate.format ?? {}), // Keep existing format fields
                    type: inferredType as any,        // Set the inferred type
                    suffix: selectedDp.unit         // Set the suffix
                 };
              } else {
                 // If it's boolean, just ensure the type is set correctly
                  linkToUpdate.format = {
                     ...(linkToUpdate.format ?? {}),
                     type: 'boolean'
                  };
              }
          } else {
            // If no unit, maybe still infer type but don't set suffix
            // Or clear suffix if DP changed from one with unit to one without? Optional.
            // linkToUpdate.format = { ...(linkToUpdate.format ?? {}), suffix: undefined };
          }
      }

      newLinks[index] = linkToUpdate;
      return newLinks;
    });
  }, [dataPoints]);

  const handleMappingTypeChange = useCallback((linkIndex: number, selectedValue: string) => {
    // selectedValue will now be '_none_', 'exact', 'range', etc.
    setDataLinks(prevLinks => {
         const newLinks = [...prevLinks];
         const link = { ...newLinks[linkIndex] } as DataPointLink; // Ensure link is typed

         if (selectedValue === '_none_') { // Check for our special "None" value
             link.valueMapping = undefined; // Clear mapping
         } else {
             // Initialize with default structure based on type
             const mapType = selectedValue as NonNullable<DataPointLink['valueMapping']>['type']; // Assert type now
             let defaultMapping: any[] = [];
             if (mapType === 'exact') defaultMapping = [{ match: '', value: '' }];
             else if (mapType === 'range') defaultMapping = [{ min: 0, max: 10, value: '' }];
             else if (mapType === 'threshold') defaultMapping = [{ threshold: 0, value: '' }];
             else if (mapType === 'boolean') defaultMapping = [{ match: true, value: '' }, { match: false, value: '' }];

             link.valueMapping = {
                 type: mapType,
                 mapping: defaultMapping,
                 defaultValue: '', // Add default value input later maybe
             };
         }
         newLinks[linkIndex] = link;
         return newLinks;
    });
}, []);

  const handleMappingEntryChange = useCallback((linkIndex: number, mapIndex: number, field: string, value: any) => {
      setDataLinks(prevLinks => {
          const newLinks = JSON.parse(JSON.stringify(prevLinks)); // Deep copy needed
          if (newLinks[linkIndex]?.valueMapping?.mapping[mapIndex] !== undefined) {
              newLinks[linkIndex].valueMapping.mapping[mapIndex][field] = value;
          }
          return newLinks;
      });
  }, []);

    const addMappingEntry = useCallback((linkIndex: number) => {
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
        setDataLinks(prevLinks => {
            const newLinks = JSON.parse(JSON.stringify(prevLinks));
            if (newLinks[linkIndex]?.valueMapping?.mapping && newLinks[linkIndex]?.valueMapping?.type !== 'boolean') {
                newLinks[linkIndex].valueMapping.mapping.splice(mapIndex, 1);
            }
            return newLinks;
        });
    }, []);

    const handleFormatChange = useCallback((linkIndex: number, field: keyof NonNullable<DataPointLink['format']>, value: any) => {
        setDataLinks(prevLinks => {
          const newLinks = [...prevLinks];
          const link = newLinks[linkIndex];
          if (!link) return prevLinks; // Should not happen, but safe check

          const dpId = link.dataPointId;
          const dp = dpId ? dataPoints[dpId] : undefined;

          // Ensure format object exists and determine/confirm its type
          let currentFormat: Partial<{ type: string }> = link.format ?? {};
          let inferredType = currentFormat.type;

          if (!inferredType && dp) { // Infer only if type is not already set
             if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(dp.dataType)) inferredType = 'number';
             else if (dp.dataType === 'Boolean') inferredType = 'boolean';
             else if (dp.dataType === 'DateTime') inferredType = 'dateTime';
             else inferredType = 'string'; // Default inference
          } else if (!inferredType) {
              inferredType = 'string'; // Default if no DP or type found
          }

          // Create the updated format object
           const updatedFormat = {
               ...currentFormat,
               type: inferredType as any, // Needs assertion as we are building it
               [field]: value === undefined || value === null ? undefined : value // Store undefined/null correctly, handle empty string for numbers elsewhere if needed
           };

           // Clean up properties not relevant to the type
          if (updatedFormat.type !== 'number') {
               delete (updatedFormat as any).precision;
               // Keep prefix/suffix for string potentially? Or clear them? User decision.
               // delete updatedFormat.prefix;
               // delete updatedFormat.suffix;
          }
          if (updatedFormat.type !== 'boolean') {
               delete (updatedFormat as any).trueLabel;
               delete (updatedFormat as any).falseLabel;
           }
           if (updatedFormat.type !== 'dateTime') {
               delete (updatedFormat as any).dateTimeFormat;
           }
            // Remove format object entirely if it only contains the type and type is 'string' (or default)
            // and no other formatting options are set. This is optional cleanup.
           const { type, ...restOfFormat } = updatedFormat;
           if (type === 'string' && Object.keys(restOfFormat).length === 0) {
               newLinks[linkIndex] = { ...link, format: undefined };
           } else {
              newLinks[linkIndex] = { ...link, format: updatedFormat as any }; // Assert final type
           }

          return newLinks;
        });
    }, [dataPoints]);


  const addDataLink = useCallback(() => {
    setDataLinks(prev => [...prev, { dataPointId: '', targetProperty: '' }]);
  }, []);

  const removeDataLink = useCallback((index: number) => {
    setDataLinks(prev => prev.filter((_, i) => i !== index));
  }, []);

  // --- Saving and Deleting ---
  // ***** MODIFIED SECTION *****
  const handleSaveChanges = useCallback(() => {
    if (!selectedElement) return;

    const validDataLinks = dataLinks.filter(link => link.dataPointId && link.targetProperty);

    let updatedElement: CustomNodeType | CustomFlowEdge; // Use the union type

    if (isNode(selectedElement)) {
        // --- Construct Node Data ---
        // Start with essential node properties from the original element
        const baseNodeData: Partial<CustomNodeData> = {
            elementType: selectedElement.data.elementType, // Keep original type
            label: selectedElement.data.label, // Keep original label (formData might overwrite)
        };

        // Merge with formData, ensuring properties match CustomNodeData structure
        const nodeFormData: Partial<CustomNodeData> = {
           label: formData.label,
           config: formData.config, // Assumes config is part of CustomNodeData
           isDrillable: formData.isDrillable, // Add other relevant node fields from formData
           subLayoutId: formData.subLayoutId,
           text: formData.elementType === SLDElementType.TextLabel ? formData.text : undefined, // Specific for TextLabel
           // Add other specific node data fields here from formData based on elementType if needed
        };

        // Create the final data object for the node
        let finalNodeData = {
            ...baseNodeData,
            ...nodeFormData,
            elementType: baseNodeData.elementType!, // Ensure elementType is non-null (it must exist for a node)
            dataPointLinks: validDataLinks,
            // Ensure required fields have defaults if not provided by formData or base
            label: nodeFormData.label ?? baseNodeData.label ?? '', // Example default
        } as unknown as CustomNodeData;

        // Clean up potentially empty config
        if (finalNodeData.config && Object.keys(finalNodeData.config).length === 0) {
           delete finalNodeData.config;
        }
        // Clean up potentially undefined text if not a text label
        if (finalNodeData.elementType !== SLDElementType.TextLabel) {
            delete (finalNodeData as any).text; // Remove text if not applicable
        }
        // Add more cleanup specific to node types if needed


        updatedElement = {
          ...selectedElement, // Spread the original node properties (id, position, etc.)
          data: finalNodeData as any, // Assign the validated node data (use 'as any' if TS still struggles with the exact union subtype)
        };

    } else if (isEdge(selectedElement)) {
        // --- Construct Edge Data ---
        // Start with essential edge properties (if any) besides links/label
         const baseEdgeData: Partial<CustomFlowEdgeData> = {
             label: selectedElement.data?.label, // Keep original label if it exists
         };

         // Merge with formData, ensuring properties match CustomFlowEdgeData structure
         const edgeFormData: Partial<CustomFlowEdgeData> = {
            label: formData.label,
            // Add other relevant edge fields from formData
            // e.g., animationSpeed: formData.animationSpeed, flowDirection: formData.flowDirection
         };

         // Create the final data object for the edge
         const finalEdgeData: CustomFlowEdgeData = {
             ...baseEdgeData,
             ...edgeFormData,
             dataPointLinks: validDataLinks,
              // Ensure required fields have defaults if not provided
             label: edgeFormData.label ?? baseEdgeData.label ?? '', // Example default
         };

         // No 'elementType' for edges generally. No 'config' assumed for edges.

        updatedElement = {
          ...selectedElement, // Spread the original edge properties (id, source, target, etc.)
          data: finalEdgeData as any, // Assign the validated edge data (use 'as any' if needed)
        };
    } else {
        console.error("Selected element is neither a node nor an edge:", selectedElement);
        return; // Should not happen with proper typing, but safe guard
    }

    // Now updatedElement should conform to either CustomNodeType or CustomFlowEdge
    onUpdateElement(updatedElement);
    console.log("Saving element:", updatedElement);

  }, [selectedElement, formData, dataLinks, onUpdateElement]);
  // ***** END OF MODIFIED SECTION *****


  const handleDelete = useCallback(() => {
      if(selectedElement) {
          onDeleteElement(selectedElement.id);
      }
  }, [selectedElement, onDeleteElement]);


  if (!selectedElement) {
    return (
      <Card className="h-full flex items-center justify-center bg-muted/30">
        <CardContent className="p-4 text-center text-muted-foreground">
          Select an element to inspect and configure.
        </CardContent>
      </Card>
    );
  }

  const elementType = getElementTypeName(selectedElement);
  const currentElementType = isNode(selectedElement) ? selectedElement.data.elementType : undefined;


  return (
    <Card className="h-full flex flex-col border-l dark:border-gray-700 shadow-md">
      <CardHeader className="p-3 flex-row justify-between items-center border-b dark:border-gray-700">
        <CardTitle className="text-base font-semibold">Inspector: {elementType}</CardTitle>
         <Button variant="ghost" size="icon" onClick={handleDelete} title="Delete Element" className="h-7 w-7">
            <Trash2 className="h-4 w-4 text-destructive"/>
        </Button>
      </CardHeader>

      <ScrollArea className="flex-grow">
        <Tabs defaultValue="properties" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9 rounded-none">
                <TabsTrigger value="properties" className="text-xs">Properties</TabsTrigger>
                <TabsTrigger value="data_linking" className="text-xs">Data Linking</TabsTrigger>
            </TabsList>

            {/* --- General Properties Tab --- */}
            <TabsContent value="properties" className="mt-0 p-3 space-y-4">
                <p className="text-xs text-muted-foreground">ID: {selectedElement.id}</p>
                 {/* Common Label Field */}
                <div className="space-y-1">
                    <Label htmlFor="label" className="text-xs">Label</Label>
                    <Input
                        id="label" name="label"
                        value={formData.label || ''}
                        onChange={handleInputChange} className="h-8 text-sm"
                    />
                </div>

                {/* Type-Specific Fields */}
                {isNode(selectedElement) && currentElementType === SLDElementType.TextLabel && (
                    <div className="space-y-1">
                        <Label htmlFor="text" className="text-xs">Static Text</Label>
                        <Input // Or Textarea for multiline
                        id="text" name="text"
                        // Use type assertion here as formData is a broad partial union
                        value={(formData as Partial<TextLabelNodeData>).text || ''}
                        onChange={handleInputChange} className="h-8 text-sm"
                        />
                    </div>
                )}

                 {isNode(selectedElement) && currentElementType === SLDElementType.Contactor && (
                    <div className="space-y-1">
                        <Label htmlFor="config.normallyOpen" className="text-xs">Contact Type</Label>
                         <Select
                             name="config.normallyOpen"
                             // Use type assertion and provide default for safety
                             value={String((formData as Partial<ContactorNodeData>).config?.normallyOpen ?? true)}
                             onValueChange={(val) => handleSelectChange("config.normallyOpen", val === 'true')}
                         >
                             <SelectTrigger className="h-8 text-sm">
                                 <SelectValue placeholder="Select type..." />
                             </SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="true">Normally Open (NO)</SelectItem>
                                 <SelectItem value="false">Normally Closed (NC)</SelectItem>
                             </SelectContent>
                         </Select>
                    </div>
                 )}

                  {isNode(selectedElement) && currentElementType === SLDElementType.Inverter && (
                    <div className="space-y-1">
                      <Label htmlFor="config.ratedPower" className="text-xs">Rated Power (kW)</Label>
                      <Input
                         type="number" id="config.ratedPower" name="config.ratedPower"
                          // Use type assertion
                         value={(formData as Partial<InverterNodeData>).config?.ratedPower || ''}
                         onChange={handleInputChange} className="h-8 text-sm"
                         placeholder="e.g., 5" step="0.1"
                      />
                    </div>
                  )}
                {/* Add more config fields based on elementType here */}

            </TabsContent>

            {/* --- Data Linking Tab --- */}
            <TabsContent value="data_linking" className="mt-0 p-3 space-y-3">
                 {dataLinks.map((link, index) => (
                    <Card key={index} className="p-3 space-y-3 bg-muted/40 border dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-medium text-muted-foreground">Link {index + 1}</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDataLink(index)} title="Remove Link">
                                <MinusCircle className="h-3.5 w-3.5 text-destructive"/>
                            </Button>
                        </div>

                        {/* Data Point Selection */}
                        <div className="space-y-1">
                            <Label htmlFor={`dp-select-${index}`} className="text-xs">Data Point</Label>
                             <SearchableSelect
                                 options={dataPointOptions}
                                 value={link.dataPointId}
                                 onChange={(value) => handleDataLinkChange(index, 'dataPointId', value)}
                                 placeholder="Select Data Point..."
                                 searchPlaceholder="Search Name/ID/Category..."
                                 notFoundText="No matching data point."
                             />
                        </div>

                        {/* Target Property Selection */}
                        <div className="space-y-1">
                            <Label htmlFor={`target-prop-${index}`} className="text-xs">Target Property</Label>
                             <SearchableSelect
                                 options={targetPropertiesOptions}
                                 value={link.targetProperty}
                                 onChange={(value) => handleDataLinkChange(index, 'targetProperty', value)}
                                 placeholder="Select Target Property..."
                                 searchPlaceholder="Search property..."
                                 notFoundText="No matching property."
                             />
                        </div>

                         <Separator className="my-3 dark:bg-gray-600"/>

                         {/* --- Value Mapping Section --- */}
                         <div className="space-y-2">
                         <Label className="text-xs flex justify-between items-center">
                                Value Mapping
                                 <Select
                                     value={link.valueMapping?.type ?? '_none_'} // Default to '_none_'
                                     onValueChange={(value) => handleMappingTypeChange(index, value)}
                                 >
                                     <SelectTrigger className="h-7 w-[120px] text-xs">
                                         <SelectValue placeholder="Map Type..." />
                                     </SelectTrigger>
                                     <SelectContent>
                                         {/* *** MODIFICATION 4: Update SelectItem value *** */}
                                         <SelectItem value="_none_">None</SelectItem>
                                         <SelectItem value="exact">Exact Match</SelectItem>
                                         <SelectItem value="range">Range</SelectItem>
                                         <SelectItem value="threshold">Threshold</SelectItem>
                                         <SelectItem value="boolean">Boolean</SelectItem>
                                     </SelectContent>
                                 </Select>
                             </Label>

                             {link.valueMapping && link.valueMapping.mapping.map((mapEntry, mapIdx) => (
                                <div key={mapIdx} className="flex gap-2 items-center pl-2">
                                     {link.valueMapping?.type === 'exact' && (
                                         <>
                                            <Input placeholder="Match Value" value={mapEntry.match ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'match', e.target.value)} className="h-7 text-xs"/>
                                            <Input placeholder="Set Property To" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-7 text-xs"/>
                                         </>
                                     )}
                                    {link.valueMapping?.type === 'range' && (
                                        <>
                                            <Input type="number" placeholder="Min" value={mapEntry.min ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'min', parseFloat(e.target.value) || 0)} className="h-7 text-xs w-16"/>
                                            <Input type="number" placeholder="Max" value={mapEntry.max ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'max', parseFloat(e.target.value) || 0)} className="h-7 text-xs w-16"/>
                                            <Input placeholder="Set Property To" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-7 text-xs"/>
                                        </>
                                    )}
                                     {link.valueMapping?.type === 'threshold' && (
                                        <>
                                            <Input type="number" placeholder="Threshold >=" value={mapEntry.threshold ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'threshold', parseFloat(e.target.value) || 0)} className="h-7 text-xs w-24"/>
                                            <Input placeholder="Set Property To" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-7 text-xs"/>
                                        </>
                                    )}
                                     {link.valueMapping?.type === 'boolean' && mapIdx === 0 && (
                                        <>
                                            <span className="text-xs font-medium w-16 shrink-0">If True:</span>
                                            <Input placeholder="Set Property To" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-7 text-xs"/>
                                        </>
                                    )}
                                     {link.valueMapping?.type === 'boolean' && mapIdx === 1 && (
                                        <>
                                            <span className="text-xs font-medium w-16 shrink-0">If False:</span>
                                            <Input placeholder="Set Property To" value={mapEntry.value ?? ''} onChange={(e) => handleMappingEntryChange(index, mapIdx, 'value', e.target.value)} className="h-7 text-xs"/>
                                        </>
                                    )}

                                     {link.valueMapping?.type !== 'boolean' && (
                                         <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={()=>removeMappingEntry(index, mapIdx)} title="Remove Mapping Entry">
                                             <MinusCircle className="h-3 w-3 text-destructive"/>
                                         </Button>
                                     )}
                                </div>
                             ))}
                              {link.valueMapping && link.valueMapping?.type !== 'boolean' && (
                                 <Button size="sm" variant="outline" onClick={()=>addMappingEntry(index)} className="text-xs h-7 mt-1 ml-2">
                                     <PlusCircle className="h-3 w-3 mr-1"/> Add Map Entry
                                 </Button>
                             )}
                         </div>

                         <Separator className="my-3 dark:bg-gray-600"/>

                         {/* --- Formatting Section --- */}
                         <div className="space-y-2">
                            <Label className="text-xs">Formatting (Optional)</Label>
                             {/* Conditionally render formatting based on inferred type */}
                             { link.format?.type === 'number' && (
                               <div className="grid grid-cols-2 gap-2 pl-2">
                                  <div className="space-y-1">
                                      <Label htmlFor={`format-prefix-${index}`} className="text-[10px]">Prefix</Label>
                                      <Input id={`format-prefix-${index}`} placeholder="e.g., '$'" value={link.format?.prefix ?? ''} onChange={(e) => handleFormatChange(index, 'prefix', e.target.value)} className="h-7 text-xs"/>
                                  </div>
                                  <div className="space-y-1">
                                      <Label htmlFor={`format-suffix-${index}`} className="text-[10px]">Suffix</Label>
                                      <Input id={`format-suffix-${index}`} placeholder="e.g., 'kW'" value={link.format?.suffix ?? ''} onChange={(e) => handleFormatChange(index, 'suffix', e.target.value)} className="h-7 text-xs"/>
                                  </div>
                                  <div className="space-y-1">
                                      <Label htmlFor={`format-precision-${index}`} className="text-[10px]">Precision</Label>
                                      <Input type="number" id={`format-precision-${index}`} placeholder="e.g., 2" value={link.format?.precision ?? ''}
                                            onChange={(e) => handleFormatChange(index, 'precision', e.target.value === '' ? undefined : parseInt(e.target.value))}
                                            min="0" step="1" className="h-7 text-xs"/>
                                  </div>
                              </div>
                             )}
                             { link.format?.type === 'boolean' && (
                               <div className="grid grid-cols-2 gap-2 pl-2">
                                  <div className="space-y-1">
                                      <Label htmlFor={`format-true-${index}`} className="text-[10px]">True Label</Label>
                                      <Input id={`format-true-${index}`} placeholder="e.g., 'ON'" value={link.format?.trueLabel ?? ''} onChange={(e) => handleFormatChange(index, 'trueLabel', e.target.value)} className="h-7 text-xs"/>
                                  </div>
                                   <div className="space-y-1">
                                      <Label htmlFor={`format-false-${index}`} className="text-[10px]">False Label</Label>
                                      <Input id={`format-false-${index}`} placeholder="e.g., 'OFF'" value={link.format?.falseLabel ?? ''} onChange={(e) => handleFormatChange(index, 'falseLabel', e.target.value)} className="h-7 text-xs"/>
                                  </div>
                               </div>
                             )}
                             { link.format?.type === 'dateTime' && (
                               <div className="pl-2">
                                  <div className="space-y-1">
                                      <Label htmlFor={`format-datetime-${index}`} className="text-[10px]">Date/Time Format</Label>
                                      <Input id={`format-datetime-${index}`} placeholder="e.g., 'YYYY-MM-DD HH:mm'" value={link.format?.dateTimeFormat ?? ''} onChange={(e) => handleFormatChange(index, 'dateTimeFormat', e.target.value)} className="h-7 text-xs"/>
                                      {/* Add link to formatting options documentation? */}
                                  </div>
                               </div>
                             )}
                              { link.format?.type === 'string' && ( // Allow prefix/suffix for string too
                               <div className="grid grid-cols-2 gap-2 pl-2">
                                  <div className="space-y-1">
                                      <Label htmlFor={`format-prefix-${index}`} className="text-[10px]">Prefix</Label>
                                      <Input id={`format-prefix-${index}`} placeholder="e.g., 'Status: '" value={link.format?.prefix ?? ''} onChange={(e) => handleFormatChange(index, 'prefix', e.target.value)} className="h-7 text-xs"/>
                                  </div>
                                  <div className="space-y-1">
                                      <Label htmlFor={`format-suffix-${index}`} className="text-[10px]">Suffix</Label>
                                      <Input id={`format-suffix-${index}`} placeholder="e.g., '!'" value={link.format?.suffix ?? ''} onChange={(e) => handleFormatChange(index, 'suffix', e.target.value)} className="h-7 text-xs"/>
                                  </div>
                                </div>
                              )}
                              {/* Show a placeholder if no format type is determined yet */}
                              { !link.format?.type && (
                                <p className="text-xs text-muted-foreground pl-2 italic">Select a Data Point to enable formatting options based on its type.</p>
                              )}
                         </div>
                    </Card>
                ))}
                <Button variant="outline" size="sm" onClick={addDataLink} className="w-full">
                    <PlusCircle className="h-4 w-4 mr-1"/> Add Data Link
                </Button>
            </TabsContent>
        </Tabs>
      </ScrollArea>

      <CardFooter className="p-3 border-t dark:border-gray-700">
        <Button onClick={handleSaveChanges} className="w-full h-9">Apply Changes</Button>
      </CardFooter>
    </Card>
  );
};

export default SLDInspectorPanel;