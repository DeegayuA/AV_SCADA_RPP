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
    Unplug, ShieldAlert, ListFilter, SearchCode
} from 'lucide-react';

// Adjust the import path if SearchableSelect is not directly in ./
import { SearchableSelect, ComboboxOption } from './SearchableSelect';


export const categorizedComponents: PaletteCategory[] = [
  {
    name: 'Sources & Storage',
    components: [
      { type: SLDElementType.Panel, label: 'PV Array', icon: <Rows3 size={16}/>,
        defaultData: { label: 'PV Array', status: 'producing' } },
      { type: SLDElementType.Battery, label: 'Battery', icon: <BatteryCharging size={16}/>,
        defaultData: { label: 'Battery Bank', status: 'nominal', config: { capacityAh: 100, voltageNominalV: 48} } },
      { type: SLDElementType.Grid, label: 'Grid Source', icon: <Cable size={16}/>,
        defaultData: { label: 'Utility Grid', status: 'connected', config: {voltageLevel: "11kV"} } },
      { type: SLDElementType.Generator, label: 'Generator', icon: <Zap size={16}/>,
        defaultData: { label: 'Backup Gen', status: 'offline', config: {fuelType: "Diesel", ratingKVA: "150"} } },
    ],
  },
  {
    name: 'Conversion & Switching',
    components: [
      { type: SLDElementType.Inverter, label: 'Inverter', icon: <CircuitBoard size={16}/>,
        defaultData: { label: 'Inverter', status: 'nominal', config: { ratedPower: 100} } },
      { type: SLDElementType.Transformer, label: 'Transformer', icon: <GitFork size={16}/>,
        defaultData: { label: 'Transformer', status: 'nominal', config: {ratingMVA: "1", primaryVoltage: "11kV", secondaryVoltage: "0.4kV" } } },
      { type: SLDElementType.Breaker, label: 'Breaker', icon: <PlugZap size={16}/>,
        defaultData: { label: 'CB', status: 'closed', config: { type: "MCCB" } } },
      { type: SLDElementType.Contactor, label: 'Contactor', icon: <Zap size={16} className="opacity-80"/>,
        defaultData: { label: 'K1', status: 'open', config: { normallyOpen: true } } as Partial<ContactorNodeData> },
      { type: SLDElementType.Fuse, label: 'Fuse', icon: <ShieldAlert size={16}/>,
        defaultData: { label: 'F1', status: 'nominal', config: {ratingAmps: 10} } as Partial<FuseNodeData> },
      { type: SLDElementType.Isolator, label: 'Isolator', icon: <Unplug size={16}/>,
        defaultData: { label: 'QS1', status: 'open', config: {poles: 3} } as Partial<IsolatorNodeData> },
    ],
  },
  {
    name: 'Distribution & Loads',
    components: [
      { type: SLDElementType.Busbar, label: 'Busbar', icon: <Workflow size={16}/>,
        defaultData: { label: 'Main Bus', status: 'energized', config: { width: 120, height: 10 } } },
      { type: SLDElementType.Meter, label: 'Meter', icon: <DatabaseZap size={16}/>,
        defaultData: { label: 'Energy Meter', status: 'reading' } },
      { type: SLDElementType.Load, label: 'Generic Load', icon: <SlidersHorizontal size={16}/>,
        defaultData: { label: 'Load Center', status: 'active' } },
      { type: SLDElementType.JunctionBox, label: 'Junction Box', icon: <ToyBrick size={16}/>,
        defaultData: { label: 'JB-1', status: 'nominal', config: {numberOfStrings: 4} } as Partial<JunctionBoxNodeData>},
    ],
  },
  {
    name: 'Measurement & Control',
    components: [
      { type: SLDElementType.Sensor, label: 'Sensor', icon: <Thermometer size={16}/>,
        defaultData: { label: 'Sensor', status: 'reading', config: { sensorType: 'Temperature'} } },
      { type: SLDElementType.PLC, label: 'PLC', icon: <Cpu size={16}/>,
        defaultData: { label: 'Main PLC', status: 'running' } },
    ],
   },
  {
    name: 'Annotations',
    components: [
      { type: SLDElementType.DataLabel, label: 'Data Display', icon: <FileText size={16}/>,
        defaultData: { label: 'Value:', status: 'nominal' } },
      { type: SLDElementType.TextLabel, label: 'Text Box', icon: <TextCursorInput size={16}/>,
        defaultData: { label: 'Info Label', text: 'Your text here', status: 'nominal', styleConfig: { fontSize: '10px', padding: '3px 5px', color: 'var(--muted-foreground)' } } as Partial<TextLabelNodeData> },
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
    event.dataTransfer.effectAllowed = 'move';
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
            elementNode.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
            setTimeout(() => {
                elementNode.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 2000);
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
                          bg-card dark:bg-neutral-700/20
                          shadow-sm hover:shadow-md dark:hover:shadow-neutral-900/50
                          rounded-md
                          border border-border dark:border-neutral-700/50
                          hover:border-primary/70 dark:hover:border-primary/70
                          text-center text-[11px] font-medium text-foreground/80 dark:text-neutral-300
                          flex flex-col items-center justify-center gap-1.5 min-h-[60px]
                          transition-all duration-200 ease-out
                          ${searchTerm === component.type ? 'ring-2 ring-primary ring-offset-1' : ''}
                        `}
                      >
                        <motion.div // You can still use motion for internal layout or hover effects
                           variants={{ hover: { scale: 1.05, y: -2 }, tap: { scale: 0.98 } }}
                           whileHover="hover"
                           whileTap="tap"
                           className="flex flex-col items-center justify-center gap-1.5 w-full h-full" // Ensure motion div fills the li
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