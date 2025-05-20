// components/sld/ui/SLDElementPalette.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PaletteCategory, PaletteComponent, SLDElementType, TextLabelNodeData, GenericDeviceNodeData, ContactorNodeData } from '@/types/sld';
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from 'framer-motion'; // For item hover effect
import { 
    BatteryCharging, Rows, Cable, CircuitBoard, PlugZap, Zap, DatabaseZap, Thermometer, 
    SlidersHorizontal, FileText, TextCursorInput, Cpu, ToyBrick, Workflow, GitBranchPlus, BoxSelect
} from 'lucide-react'; // Added some more icons

// --- Define Component Categories & Default Data (Improved) ---
// This structure helps define sensible defaults directly with the palette items.
// Ensure these SLDElementType values align with your types/sld.ts enum and SLDWidget.tsx nodeTypes
export const categorizedComponents: PaletteCategory[] = [
  {
    name: 'Sources & Storage',
    components: [
      { type: SLDElementType.Panel, label: 'PV Array', icon: <Rows size={16}/>, 
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
      { type: SLDElementType.Transformer, label: 'Transformer', icon: <GitBranchPlus size={16}/>, // More fitting icon for XFMR
        defaultData: { label: 'Transformer', status: 'nominal', config: {ratingMVA: "1", primaryVoltage: "11kV", secondaryVoltage: "0.4kV" } } },
      { type: SLDElementType.Breaker, label: 'Breaker', icon: <PlugZap size={16}/>, 
        defaultData: { label: 'CB', status: 'closed', config: { type: "MCCB" } } },
      { type: SLDElementType.Contactor, label: 'Contactor', icon: <Zap size={16}/>, 
        defaultData: { label: 'K1', status: 'open', config: { normallyOpen: true } } as Partial<ContactorNodeData> },
      { type: SLDElementType.Fuse, label: 'Fuse', icon: <Zap size={16} className="rotate-90 opacity-70"/>, // Simple Zap variation for Fuse
        defaultData: { label: 'F1', status: 'nominal' } },
      { type: SLDElementType.Isolator, label: 'Isolator', icon: <PlugZap size={16} className="opacity-70"/>, // Similar to Breaker icon but can differ in node
        defaultData: { label: 'QS1', status: 'open' } },
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
      { type: SLDElementType.Motor, label: 'Motor Load', icon: <Zap size={16} className="animate-spin animation-duration-2000 opacity-80"/>, 
        defaultData: { label: 'M1', status: 'running' } },
      { type: SLDElementType.JunctionBox, label: 'Junction Box', icon: <ToyBrick size={16}/>, 
        defaultData: { label: 'JB-1', status: 'nominal' } as Partial<GenericDeviceNodeData>},
    ],
  },
  {
    name: 'Measurement & Control',
    components: [
      { type: SLDElementType.Sensor, label: 'Temp Sensor', icon: <Thermometer size={16}/>, 
        defaultData: { label: 'Ambient Temp', status: 'nominal', config: { sensorType: 'Temperature'} } },
      { type: SLDElementType.CT, label: 'Current TX', icon: <BoxSelect size={16}/>, // Generic box representing CT/PT
        defaultData: { label: 'CT-1', status: 'nominal'} },
      { type: SLDElementType.PT, label: 'Potential TX', icon: <BoxSelect size={16} className="opacity-70"/>, 
        defaultData: { label: 'PT-1', status: 'nominal'} },
      { type: SLDElementType.PLC, label: 'PLC', icon: <Cpu size={16}/>, 
        defaultData: { label: 'Main PLC', status: 'running' } },
      { type: SLDElementType.Relay, label: 'Control Relay', icon: <Zap size={16} className="opacity-60" />, 
        defaultData: { label: 'KCR1', status: 'nominal', config: { deviceType: 'ControlRelay' } } as Partial<GenericDeviceNodeData>},
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

  const onDragStart = (event: React.DragEvent, component: PaletteComponent) => {
    const elementTypeString = component.type as string; 

    // Ensure elementType is part of defaultData structure for consistency
    const nodeInitialData = {
      elementType: component.type, // This is crucial!
      label: component.label,      // Default label from palette
      status: 'nominal',           // Sensible default status
      ...(component.defaultData || {}), // Spread specific defaults, overwriting label/status if provided
    };
    
    // Specific handling for TextLabel's `text` and `styleConfig` if not in defaultData
    if (component.type === SLDElementType.TextLabel && !nodeInitialData.text) {
      (nodeInitialData as TextLabelNodeData).text = 'New Text Label';
    }
    if (component.type === SLDElementType.TextLabel && !nodeInitialData.styleConfig) {
      (nodeInitialData as TextLabelNodeData).styleConfig = { fontSize: '12px', color: 'var(--foreground)', padding: '4px 6px' };
    }

    if (process.env.NODE_ENV === 'development') {
        console.log(`SLDElementPalette onDragStart - Type: ${elementTypeString}, Data: ${JSON.stringify(nodeInitialData)}`);
    }

    event.dataTransfer.setData('application/reactflow-palette-item', elementTypeString);
    event.dataTransfer.setData('application/reactflow-palette-data', JSON.stringify(nodeInitialData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card className="h-full flex flex-col border-r border-border bg-background shadow-lg">
      <CardHeader className="p-3 border-b border-border">
        <CardTitle className="text-sm font-semibold text-center text-foreground">
          SLD Components
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow" type="auto">
        <CardContent className="p-1.5">
          <Accordion type="multiple" defaultValue={categorizedComponents.map(c => c.name)} className="w-full">
            {categorizedComponents.map((category) => (
              <AccordionItem value={category.name} key={category.name} className="border-none mb-1.5 last:mb-0">
                <AccordionTrigger 
                  className="text-xs px-2.5 py-2 hover:no-underline bg-muted/60 dark:bg-neutral-700/40 hover:bg-muted dark:hover:bg-neutral-700/60 rounded-md font-medium text-foreground/90 transition-colors duration-150"
                >
                  {category.name}
                </AccordionTrigger>
                <AccordionContent className="p-1.5 pt-2">
                  <ul className="grid grid-cols-2 gap-2">
                    {category.components.map((component) => (
                      <motion.li
                        key={`${category.name}-${component.type}-${component.label}`}
                        draggable
                        onDragStart={(e) => onDragStart(e, component)}
                        className="
                          group/palette-item cursor-grab p-2.5 
                          bg-card dark:bg-neutral-700/20 
                          shadow-sm hover:shadow-md dark:hover:shadow-neutral-900/50
                          rounded-md 
                          border border-border dark:border-neutral-700/50
                          hover:border-primary/70 dark:hover:border-primary/70
                          text-center text-[11px] font-medium text-foreground/80 dark:text-neutral-300
                          flex flex-col items-center justify-center gap-1.5 min-h-[60px]
                          transition-all duration-200 ease-out
                        "
                        title={`Drag to add ${component.label}`}
                        variants={{ hover: { scale: 1.05, y: -2 }, tap: { scale: 0.98 } }}
                        whileHover="hover"
                        whileTap="tap"
                      >
                         {component.icon && 
                           <span className="text-primary dark:text-sky-400 group-hover/palette-item:text-primary-darker transition-colors duration-150">
                             {React.cloneElement(component.icon as React.ReactElement, { size: 18 })}
                           </span>
                         }
                         <span className="block leading-tight group-hover/palette-item:text-foreground dark:group-hover/palette-item:text-neutral-100 transition-colors duration-150">
                           {component.label}
                         </span>
                      </motion.li>
                    ))}
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