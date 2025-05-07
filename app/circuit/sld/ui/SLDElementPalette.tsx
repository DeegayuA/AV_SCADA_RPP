// components/sld/ui/SLDElementPalette.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PaletteCategory, PaletteComponent, SLDElementType } from '@/types/sld';
import { ScrollArea } from "@/components/ui/scroll-area";
import { BatteryCharging, Rows, Cable, CircuitBoard, PlugZap, Zap, DatabaseZap, Thermometer, SlidersHorizontal, FileText, TextCursorInput, Cpu, ToyBrick } from 'lucide-react'; // Import icons

// --- Define Component Categories (Expanded) ---
export const categorizedComponents: PaletteCategory[] = [
  {
    name: 'Sources & Storage',
    components: [
      { type: SLDElementType.Panel, label: 'PV Panel Array', icon: <Rows size={14}/>, defaultData: { label: 'PV Array' } },
      { type: SLDElementType.Battery, label: 'Battery Storage', icon: <BatteryCharging size={14}/>, defaultData: { label: 'Battery' } },
      { type: SLDElementType.Grid, label: 'Grid Connection', icon: <Cable size={14}/>, defaultData: { label: 'Grid' } },
      // Add Generator etc.
    ],
  },
  {
    name: 'Conversion & Switching',
    components: [
      { type: SLDElementType.Inverter, label: 'Inverter', icon: <CircuitBoard size={14}/>, defaultData: { label: 'Inverter' } },
      { type: SLDElementType.Breaker, label: 'Circuit Breaker', icon: <PlugZap size={14}/>, defaultData: { label: 'CB-'} },
      { type: SLDElementType.Contactor, label: 'Contactor', icon: <Zap size={14}/>, defaultData: { label: 'K-', config: { normallyOpen: true } } },
      // Add Isolator, Fuses, Transfer Switch etc.
    ],
  },
    {
    name: 'Measurement & Loads',
    components: [
      { type: SLDElementType.Meter, label: 'Energy Meter', icon: <DatabaseZap size={14}/>, defaultData: { label: 'Meter' } },
      { type: SLDElementType.Load, label: 'Electrical Load', icon: <SlidersHorizontal size={14}/>, defaultData: { label: 'Load' } },
      { type: SLDElementType.Busbar, label: 'Busbar', icon: <Cable size={14}/>, defaultData: { label: 'Busbar' } },
       // Add specific sensors like Temperature
       { type: SLDElementType.GenericDevice, label: 'Temperature Sensor', icon: <Thermometer size={14}/>, defaultData: { label: 'Temp Sensor' } },
    ],
  },
   {
    name: 'Control & Logic',
    components: [
        { type: SLDElementType.GenericDevice, label: 'PLC', icon: <Cpu size={14}/>, defaultData: { label: 'PLC' } },
        { type: SLDElementType.GenericDevice, label: 'Relay', icon: <Zap size={14} />, defaultData: { label: 'Relay' } },
        // Add HMI, Control Button etc.
    ],
   },
  {
    name: 'Labels & Annotations',
    components: [
      { type: SLDElementType.DataLabel, label: 'Data Display', icon: <FileText size={14}/>, defaultData: { label: 'Data Label' } },
      { type: SLDElementType.TextLabel, label: 'Static Text', icon: <TextCursorInput size={14}/>, defaultData: { label: 'Info', text: 'Static Text' } },
       { type: SLDElementType.GenericDevice, label: 'Junction Box', icon: <ToyBrick size={14}/>, defaultData: { label: 'JB' } }, // Example using Generic
    ],
  },
];


interface SLDElementPaletteProps {} // Keep simple for now

const SLDElementPalette: React.FC<SLDElementPaletteProps> = () => {

  const onDragStart = (event: React.DragEvent, component: PaletteComponent) => {
    const nodeInfo = {
        type: component.type,
        defaultData: component.defaultData || { label: component.label, elementType: component.type }, // Ensure elementType is set
        label: component.label,
    };
    // Also add elementType to the defaultData if not present
    if (!nodeInfo.defaultData.elementType) {
        nodeInfo.defaultData.elementType = component.type;
    }
    event.dataTransfer.setData('application/reactflow-node', JSON.stringify(nodeInfo));
    event.dataTransfer.effectAllowed = 'move';
     // console.log("Dragging:", nodeInfo);
  };

  return (
    <Card className="h-full flex flex-col border-r dark:border-gray-700 shadow-sm">
      <CardHeader className="p-3 border-b dark:border-gray-700">
        <CardTitle className="text-base font-semibold text-center">Components</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-1">
          <Accordion type="multiple" defaultValue={categorizedComponents.map(c => c.name)} className="w-full">
            {categorizedComponents.map((category) => (
              <AccordionItem value={category.name} key={category.name} className="border-b-0 mb-1">
                <AccordionTrigger className="text-xs px-2 py-1.5 hover:no-underline bg-muted/50 dark:bg-gray-700/50 hover:bg-muted dark:hover:bg-gray-700 rounded font-medium">
                  {category.name}
                </AccordionTrigger>
                <AccordionContent className="px-1 pt-1 pb-0">
                  <ul className="grid grid-cols-2 gap-1.5 mt-1">
                    {category.components.map((component, idx) => (
                      <li
                        key={`${category.name}-${idx}`}
                        draggable
                        onDragStart={(e) => onDragStart(e, component)}
                        className="cursor-grab p-2 bg-background dark:bg-gray-700 shadow-sm rounded hover:bg-primary/10 text-center text-xs border border-border dark:border-gray-600 flex flex-col items-center justify-center gap-1 min-h-[50px]"
                        title={`Drag to add ${component.label}`}
                      >
                         {component.icon && <span className="text-muted-foreground">{component.icon}</span>}
                         <span className="block leading-tight">{component.label}</span>
                      </li>
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