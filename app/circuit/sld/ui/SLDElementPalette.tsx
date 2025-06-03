// components/sld/ui/SLDElementPalette.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    PaletteCategory,
    PaletteComponent,
    SLDElementType,
    TextLabelNodeData,
    ContactorNodeData,
    FuseNodeData,
    IsolatorNodeData,
    JunctionBoxNodeData,
} from '@/types/sld';
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from 'framer-motion';
import {
    BatteryCharging, Rows3, Cable, CircuitBoard, PlugZap, Zap, DatabaseZap, Thermometer,
    SlidersHorizontal, FileText, TextCursorInput, Cpu, ToyBrick, Workflow, GitFork, BoxSelect,
    Unplug, ShieldAlert, ListFilter, SearchCode, Gauge as GaugeIcon // Added GaugeIcon
} from 'lucide-react';

// Adjust the import path if SearchableSelect is not directly in ./
import { SearchableSelect, ComboboxOption } from './SearchableSelect';


export const categorizedComponents: PaletteCategory[] = [
  {
    name: 'Sources & Storage',
    components: [
      { type: SLDElementType.Panel, label: 'PV Array', icon: <Rows3 size={16}/>,
        defaultData: { label: 'PV Array', status: 'producing', elementType: SLDElementType.Panel } },
      { type: SLDElementType.Battery, label: 'Battery', icon: <BatteryCharging size={16}/>,
        defaultData: { label: 'Battery Bank', status: 'nominal', config: { capacityAh: 100, voltageNominalV: 48}, elementType: SLDElementType.Battery } },
      { type: SLDElementType.Grid, label: 'Grid Source', icon: <Cable size={16}/>,
        defaultData: { label: 'Utility Grid', status: 'connected', config: {voltageLevel: "11kV"}, elementType: SLDElementType.Grid } },
      { type: SLDElementType.Generator, label: 'Generator', icon: <Zap size={16}/>,
        defaultData: { label: 'Backup Gen', status: 'offline', config: {fuelType: "Diesel", ratingKVA: "150"}, elementType: SLDElementType.Generator } },
    ],
  },
  {
    name: 'Conversion & Switching',
    components: [
      { type: SLDElementType.Inverter, label: 'Inverter', icon: <CircuitBoard size={16}/>,
        defaultData: { label: 'Inverter', status: 'nominal', config: { ratedPower: 100}, elementType: SLDElementType.Inverter } },
      { type: SLDElementType.Transformer, label: 'Transformer', icon: <GitFork size={16}/>,
        defaultData: { label: 'Transformer', status: 'nominal', config: {ratingMVA: "1", primaryVoltage: "11kV", secondaryVoltage: "0.4kV" }, elementType: SLDElementType.Transformer } },
      { type: SLDElementType.Breaker, label: 'Breaker', icon: <PlugZap size={16}/>,
        defaultData: { label: 'CB', status: 'closed', config: { type: "MCCB" }, elementType: SLDElementType.Breaker } },
      { type: SLDElementType.Switch, label: 'Switch', icon: <SlidersHorizontal size={16}/>, // Assuming SlidersHorizontal for now, replace if a better icon is available
        defaultData: { label: 'Switch', status: 'open', elementType: SLDElementType.Switch } as Partial<any> },
      { type: SLDElementType.Contactor, label: 'Contactor', icon: <Zap size={16} className="opacity-80"/>,
        defaultData: { label: 'K1', status: 'open', config: { normallyOpen: true }, elementType: SLDElementType.Contactor } as Partial<ContactorNodeData> },
      { type: SLDElementType.Fuse, label: 'Fuse', icon: <ShieldAlert size={16}/>,
        defaultData: { label: 'F1', status: 'nominal', config: {ratingAmps: 10}, elementType: SLDElementType.Fuse } as Partial<FuseNodeData> },
      { type: SLDElementType.Isolator, label: 'Isolator', icon: <Unplug size={16}/>,
        defaultData: { label: 'QS1', status: 'open', config: {poles: 3}, elementType: SLDElementType.Isolator } as Partial<IsolatorNodeData> },
    ],
  },
  {
    name: 'Distribution & Loads',
    components: [
      { type: SLDElementType.Busbar, label: 'Busbar', icon: <Workflow size={16}/>,
        defaultData: { label: 'Main Bus', status: 'energized', config: { width: 120, height: 10 }, elementType: SLDElementType.Busbar } },
      { type: SLDElementType.Meter, label: 'Meter', icon: <DatabaseZap size={16}/>,
        defaultData: { label: 'Energy Meter', status: 'reading', elementType: SLDElementType.Meter } },
      { type: SLDElementType.Load, label: 'Generic Load', icon: <SlidersHorizontal size={16}/>,
        defaultData: { label: 'Load Center', status: 'active', elementType: SLDElementType.Load } },
      { type: SLDElementType.JunctionBox, label: 'Junction Box', icon: <ToyBrick size={16}/>,
        defaultData: { label: 'JB-1', status: 'nominal', config: {numberOfStrings: 4}, elementType: SLDElementType.JunctionBox } as Partial<JunctionBoxNodeData>},
      { type: SLDElementType.GenericDevice, label: 'Generic Device', icon: <BoxSelect size={16}/>,
        defaultData: { label: 'Device', status: 'nominal', elementType: SLDElementType.GenericDevice } },
    ],
  },
  {
    name: 'Measurement & Control',
    components: [
      { type: SLDElementType.Sensor, label: 'Sensor', icon: <Thermometer size={16}/>,
        defaultData: { label: 'Sensor', status: 'reading', config: { sensorType: 'Temperature'} } },
      { type: SLDElementType.PLC, label: 'PLC', icon: <Cpu size={16}/>,
        defaultData: { label: 'Main PLC', status: 'running' } },
      { 
        type: SLDElementType.Gauge, 
        label: 'Gauge', 
        icon: <GaugeIcon size={16}/>, 
        defaultData: { 
          label: 'Gauge', 
          elementType: SLDElementType.Gauge, 
          status: 'nominal', 
          config: { minVal: 0, maxVal: 100, unit: '%' }
        },
        description: 'Displays a single value as a visual gauge.'
      },
    ],
   },
  {
    name: 'Protection & Specialized',
    components: [
      { type: SLDElementType.ATS, label: 'ATS', icon: <GitFork size={16} />, // Placeholder icon, update if available
        defaultData: { label: 'ATS', status: 'source1_nominal', elementType: SLDElementType.ATS } as Partial<any> },
      { type: SLDElementType.CT, label: 'CT', icon: <Zap size={16} />, // Placeholder icon
        defaultData: { label: 'CT', status: 'nominal', elementType: SLDElementType.CT } as Partial<any> },
      { type: SLDElementType.PT, label: 'PT', icon: <Zap size={16} />, // Placeholder icon
        defaultData: { label: 'PT', status: 'nominal', elementType: SLDElementType.PT } as Partial<any> },
      { type: SLDElementType.Motor, label: 'Motor', icon: <SlidersHorizontal size={16} />, // Placeholder icon
        defaultData: { label: 'Motor', status: 'off', elementType: SLDElementType.Motor } as Partial<any> },
      { type: SLDElementType.Relay, label: 'Relay', icon: <CircuitBoard size={16} />, // Placeholder icon
        defaultData: { label: 'Relay', status: 'deactivated', elementType: SLDElementType.Relay } as Partial<any> },
    ],
  },
  {
    name: 'Annotations',
    components: [
      { type: SLDElementType.DataLabel, label: 'Data Display', icon: <FileText size={16}/>,
        defaultData: { label: 'Value:', status: 'nominal', elementType: SLDElementType.DataLabel } },
      { type: SLDElementType.TextLabel, label: 'Text Box', icon: <TextCursorInput size={16}/>,
        defaultData: { label: 'Info Label', text: 'Your text here', status: 'nominal', styleConfig: { fontSize: '10px', padding: '3px 5px', color: 'var(--muted-foreground)' }, elementType: SLDElementType.TextLabel } as Partial<TextLabelNodeData> },
    ],
  },
];


interface SLDElementPaletteProps {}

const SLDElementPalette: React.FC<SLDElementPaletteProps> = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(categorizedComponents.map(c => c.name));
  const elementRefs = useRef<Record<string, HTMLLIElement | null>>({});

  // Correctly typed for native HTML DragEvent
  const handleNativeDragStart = (event: React.DragEvent<HTMLLIElement>, component: PaletteComponent) => {
    const elementTypeString = component.type as string;
    const nodeInitialData = {
      elementType: component.type,
      label: component.defaultData?.label || component.label,
      status: component.defaultData?.status || 'nominal',
      ...(component.defaultData || {}),
    };

    if (component.type === SLDElementType.TextLabel && !(nodeInitialData as TextLabelNodeData).text) {
      (nodeInitialData as TextLabelNodeData).text = 'New Text';
    }
    if (component.type === SLDElementType.TextLabel && !(nodeInitialData as TextLabelNodeData).styleConfig) {
      (nodeInitialData as TextLabelNodeData).styleConfig = { fontSize: '12px', color: 'var(--foreground)', padding: '4px 6px' };
    }

    if (process.env.NODE_ENV === 'development') {
        console.log(`SLDElementPalette onDragStart - Type: ${elementTypeString}, Initial Node Data: ${JSON.stringify(nodeInitialData)}`);
    }

    event.dataTransfer.setData('application/reactflow-palette-item', elementTypeString);
    event.dataTransfer.setData('application/reactflow-palette-data', JSON.stringify(nodeInitialData));
    event.dataTransfer.effectAllowed = 'move'; // Standard cursor hint

    // Attempt to set grabbing cursor directly on the dragged element
    const draggedElement = event.target as HTMLLIElement;
    draggedElement.style.cursor = 'grabbing';

    // Clone the element for setDragImage
    const clone = draggedElement.cloneNode(true) as HTMLLIElement;
    // Apply styles for the drag image
    clone.style.position = 'absolute';
    clone.style.top = '-9999px'; // Position off-screen to prevent flicker
    clone.style.width = `${draggedElement.offsetWidth}px`;
    clone.style.height = `${draggedElement.offsetHeight}px`;
    clone.style.transform = 'scale(1.05)';
    clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    // Ensure background and padding are copied to avoid transparent or misaligned drag image
    const computedStyle = getComputedStyle(draggedElement);
    clone.style.backgroundColor = computedStyle.backgroundColor;
    clone.style.padding = computedStyle.padding;
    clone.style.margin = '0'; // Reset margin for the clone if any
    clone.classList.add(...Array.from(draggedElement.classList)); // Copy classes for consistent styling

    document.body.appendChild(clone);

    // Set the drag image, using a slight offset to better position it under the cursor
    event.dataTransfer.setDragImage(clone, 10, 10);

    // Cleanup clone after a short delay to ensure it's used for drag image
    // and reset cursor on original element
    setTimeout(() => {
      document.body.removeChild(clone);
      draggedElement.style.cursor = 'grab'; // Reset cursor on original element
    }, 0);
  };

  const allComponentOptions: ComboboxOption[] = useMemo(() => {
    const options: ComboboxOption[] = [];
    categorizedComponents.forEach(category => {
      category.components.forEach(component => {
        options.push({
          value: component.type,
          label: `${component.label} (${category.name})`,
          description: category.name,
        });
      });
    });
    return [{ value: "", label: "Search all components..." }, ...options];
  }, []);

  const handleElementSelect = (selectedElementType: SLDElementType | string) => {
    setSearchTerm(selectedElementType);
    if (selectedElementType) {
      let categoryNameOfSelectedElement: string | undefined;
      for (const category of categorizedComponents) {
        if (category.components.some(comp => comp.type === selectedElementType)) {
          categoryNameOfSelectedElement = category.name;
          break;
        }
      }
      if (categoryNameOfSelectedElement) {
        setOpenAccordionItems([categoryNameOfSelectedElement!]);
        setTimeout(() => {
          const elementKey = `${categoryNameOfSelectedElement}-${selectedElementType}`;
          const elementNode = elementRefs.current[elementKey];
          elementNode?.scrollIntoView({ behavior: 'smooth', block: 'center' });
           if(elementNode){
            // Enhanced temporary highlight: thicker ring, different offset, longer duration
            elementNode.classList.add('ring-4', 'ring-primary/70', 'ring-offset-1', 'ring-offset-background', 'transition-all', 'duration-500', 'ease-out');
            setTimeout(() => {
                elementNode.classList.remove('ring-4', 'ring-primary/70', 'ring-offset-1', 'ring-offset-background', 'ease-out');
                // Ensure the persistent selection ring is re-asserted if it was removed by the above class changes
                if (searchTerm === selectedElementType) {
                    // Re-apply the standard selection ring
                    elementNode.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
                }
            }, 2500); // Increased duration for visibility
           }
        }, 100);
      }
    } else {
      setOpenAccordionItems(categorizedComponents.map(c => c.name));
    }
  };

  return (
    <Card className="h-full flex flex-col border-r border-border bg-background shadow-lg">
      <CardHeader className="p-3 border-b border-border space-y-2">
        <CardTitle className="text-sm font-semibold text-center text-foreground flex items-center justify-center gap-2">
          <SearchCode size={16} />
          <span>SLD Components</span>
        </CardTitle>
        <SearchableSelect
            options={allComponentOptions}
            value={searchTerm}
            onChange={handleElementSelect}
            placeholder="Find component..."
            searchPlaceholder="Type to search..."
            className="w-full text-xs"
            popoverContentClassName="text-xs"
        />
      </CardHeader>
      <ScrollArea className="flex-grow" type="auto">
        <CardContent className="p-1.5">
          <Accordion
            type="multiple"
            value={openAccordionItems}
            onValueChange={setOpenAccordionItems}
            className="w-full"
          >
            {categorizedComponents.map((category) => (
              <AccordionItem value={category.name} key={category.name} className="border-none mb-1.5 last:mb-0">
                <AccordionTrigger
                  className="text-xs px-2.5 py-2 hover:no-underline bg-muted/60 dark:bg-neutral-700/40 hover:bg-muted dark:hover:bg-neutral-700/60 rounded-md font-medium text-foreground/90 transition-colors duration-150"
                >
                   <div className="flex items-center gap-2">
                     <ListFilter size={12} className={openAccordionItems.includes(category.name) ? "text-primary" : "text-muted-foreground"}/>
                     <span>{category.name}</span>
                   </div>
                </AccordionTrigger>
                <AccordionContent className="p-1.5 pt-2">
                  <ul className="grid grid-cols-2 gap-2">
                    {category.components.map((component) => {
                      const elementKey = `${category.name}-${component.type}`;
                      return (
                      // Use a standard <li> for native HTML drag-and-drop
                      // Keep motion.div for animations if desired, but attach D&D to the <li>
                      <li
                        key={elementKey}
                        ref={el => { elementRefs.current[elementKey] = el; }}
                        draggable // Native HTML draggable
                        onDragStart={(e) => handleNativeDragStart(e, component)} // Use correctly typed handler
                        title={`Drag to add ${component.label}`}
                        className={`
                          group/palette-item cursor-grab p-2.5
                          bg-card dark:bg-neutral-700/20 hover:bg-accent/50 dark:hover:bg-accent/40
                          shadow-sm hover:shadow-lg dark:hover:shadow-black/20 dark:hover:shadow-neutral-900/60 
                          rounded-md
                          border border-border dark:border-neutral-700/50
                          hover:border-primary/70 dark:hover:border-primary/80
                          text-center text-[11px] font-medium text-foreground/80 dark:text-neutral-300
                          flex flex-col items-center justify-center gap-1.5 min-h-[60px]
                          transition-all duration-150 ease-in-out
                          active:cursor-grabbing
                          ${searchTerm === component.type ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                        `}
                      >
                        {/* motion.div is kept for potential future use or if specific inner animations are desired,
                            but primary hover/drag effects are now mostly CSS driven on the <li> */}
                        <motion.div
                           // Direct motion hover/tap scaling can be re-enabled if preferred over CSS effects or for combined effects.
                           // For now, relying on CSS for hover scale via group-hover on parent <li>
                           variants={{ hover: { scale: 1.05, y: -2 }, tap: { scale: 0.98 } }}
                           whileHover="hover"
                           whileTap="tap"
                           className="flex flex-col items-center justify-center gap-1.5 w-full h-full"
                        >
                          {component.icon &&
                           <span className={`
                             ${searchTerm === component.type ? "text-primary-darker" : "text-primary dark:text-sky-400"}
                             group-hover/palette-item:text-primary-darker transition-colors duration-150
                           `}>
                             {React.cloneElement(component.icon as React.ReactElement<{ size?: number }>, { size: 18 })}
                           </span>
                          }
                          <span className="block leading-tight group-hover/palette-item:text-foreground dark:group-hover/palette-item:text-neutral-100 transition-colors duration-150">
                            {component.label}
                          </span>
                        </motion.div>
                      </li>
                    );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default SLDElementPalette;