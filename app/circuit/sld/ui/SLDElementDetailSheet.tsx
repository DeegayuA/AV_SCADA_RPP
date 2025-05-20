// components/sld/ui/SLDElementDetailSheet.tsx
import React from 'react';
import { Node, Edge } from 'reactflow';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"; // Assuming Shadcn UI setup
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CustomNodeData,
  CustomFlowEdgeData,
  RealTimeData,
  CustomNodeType,
  CustomFlowEdge,
  DataPointLink
} from '@/types/sld';
import { getDataPointValue, formatDisplayValue, applyValueMapping } from '../nodes/nodeUtils'; // Use helpers
import { useAppStore } from '@/stores/appStore';

interface SLDElementDetailSheetProps {
  element: CustomNodeType | CustomFlowEdge | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function isNode(element: any): element is CustomNodeType {
  return element && 'position' in element && 'data' in element;
}

const SLDElementDetailSheet: React.FC<SLDElementDetailSheetProps> = ({
  element,
  isOpen,
  onOpenChange,
}) => {
  const realtimeData = useAppStore((state) => state.realtimeData);
  const dataPoints = useAppStore((state) => state.dataPoints);

  if (!element) return null;

  const elementData = element.data as CustomNodeData | CustomFlowEdgeData; // Type assertion
  const elementType = isNode(element) ? element.data.elementType : 'Connection';
  const nodeConfig = isNode(element) ? (element.data as CustomNodeData).config : undefined;

  // Function to get display info for a linked data point
  const getDisplayData = (link: DataPointLink): { label: string; value: string; unit?: string, rawValue?: any } | null => {
      const dpDefinition = dataPoints[link.dataPointId];
      if (!dpDefinition) return null;

      const rawValue = getDataPointValue(link.dataPointId, realtimeData);
      let displayValue = rawValue;

      // Prefer mapped value if exists for display interpretation (e.g., 'ON'/'OFF')
      if (link.valueMapping) {
          const mapped = applyValueMapping(rawValue, link);
          // Only use mapped value if it's different and not just a visual property like color
          if (mapped !== undefined && typeof mapped !== 'object' && mapped !== rawValue) {
               displayValue = mapped;
          }
      }

      // Format the potentially mapped or raw value
        const formattedValue = formatDisplayValue(displayValue, { 
          ...link, 
          ...(link.format ?? { type: dpDefinition.dataType as any, suffix: dpDefinition.unit }) 
        });


      return {
          label: dpDefinition.label,
          value: formattedValue,
          unit: dpDefinition.unit,
          rawValue: rawValue,
      };
  };

  const linkedDataInfo = elementData?.dataPointLinks
      ?.map(getDisplayData)
      .filter((item): item is Exclude<ReturnType<typeof getDisplayData>, null> => item !== null) ?? [];


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>{elementData?.label || 'Element Details'}</SheetTitle>
          <SheetDescription>
             Type: <Badge variant="outline">{elementType}</Badge> {isNode(element) ? `(ID: ${element.id})` : `(ID: ${element.id})`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {nodeConfig && Object.keys(nodeConfig).length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2 text-sm">Configuration</h3>
                     <div className="text-xs space-y-1 text-muted-foreground">
                        {Object.entries(nodeConfig).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                                <span>{key}:</span>
                                <span>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                    <Separator className="my-3" />
                </div>
            )}



          {/* Real-time Data Section */}
          {linkedDataInfo.length > 0 && (
             <div>
                 <h3 className="font-semibold mb-2 text-sm">Real-time Data</h3>
                <div className="space-y-2">
                    {linkedDataInfo.map((info, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{info.label}:</span>
                        <span className="font-medium">{info.value}</span>
                    </div>
                    ))}
                </div>
                 <Separator className="my-3" />
            </div>
          )}

          {/* Placeholder for Actions */}
          <div>
              <h3 className="font-semibold mb-2 text-sm">Actions</h3>
              <div className="text-center text-muted-foreground text-xs">
                  (No actions available yet)
                  <Button variant="outline" size="sm">Acknowledge Alarm</Button>
              </div>
          </div>

        </div>

        <SheetFooter className="p-4 border-t">
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default SLDElementDetailSheet;