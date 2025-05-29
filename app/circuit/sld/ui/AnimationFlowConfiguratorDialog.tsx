// app/circuit/sld/ui/AnimationFlowConfiguratorDialog.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect, ComboboxOption } from './SearchableSelect';
import { CustomFlowEdge, DataPoint } from '@/types/sld';
import DataLinkLiveValuePreview from './DataLinkLiveValuePreview'; // Import the new component
// Remove useAppStore import, dataPoints will be passed as a prop

export interface AnimationFlowConfig { // Ensure export
  flowActiveDataPointId?: string; // To be relabeled in usage context
  flowDirectionDataPointId?: string; // To be relabeled in usage context
  flowSpeedDataPointId?: string;
}

interface AnimationFlowConfiguratorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  edge: CustomFlowEdge | null;
  availableDataPoints: DataPoint[]; // Changed prop name for clarity
  onConfigure: (config: AnimationFlowConfig) => void;
}

const AnimationFlowConfiguratorDialog: React.FC<AnimationFlowConfiguratorDialogProps> = ({
  isOpen,
  onOpenChange,
  edge,
  availableDataPoints,
  onConfigure,
}) => {
  const [flowActiveDp, setFlowActiveDp] = useState<string | undefined>(undefined);
  const [flowDirectionDp, setFlowDirectionDp] = useState<string | undefined>(undefined);
  const [flowSpeedDp, setFlowSpeedDp] = useState<string | undefined>(undefined);

  const dataPointOptions = useMemo((): ComboboxOption[] =>
    Object.values(availableDataPoints).map(dp => ({
      value: dp.id,
      label: `${dp.name || dp.id}${dp.description ? ` (${dp.description})` : ''}`, // Slightly adjusted label
      description: `ID: ${dp.id} | Type: ${dp.dataType} | Unit: ${dp.unit || 'N/A'}`,
    })).sort((a, b) => a.label.localeCompare(b.label)),
  [availableDataPoints]);

  useEffect(() => {
    if (isOpen && edge?.data?.dataPointLinks) {
      // Initialize from existing links (simplified: assumes specific targetProperties)
      // This logic might need to be more robust to find the *intended* controlling datapoints.
      const activeLink = edge.data.dataPointLinks.find(l => l.targetProperty === 'isEnergized' || l.targetProperty === 'status');
      const directionLink = edge.data.dataPointLinks.find(l => l.targetProperty === 'flowDirection');
      const speedLink = edge.data.dataPointLinks.find(l => l.targetProperty === 'animationSpeedFactor');
      
      setFlowActiveDp(activeLink?.dataPointId);
      setFlowDirectionDp(directionLink?.dataPointId);
      setFlowSpeedDp(speedLink?.dataPointId);
    } else if (!isOpen) {
      // Reset when dialog is closed or no relevant links
      setFlowActiveDp(undefined);
      setFlowDirectionDp(undefined);
      setFlowSpeedDp(undefined);
    }
  }, [edge, isOpen]);

  const handleSave = () => {
    onConfigure({
      flowActiveDataPointId: flowActiveDp,
      flowDirectionDataPointId: flowDirectionDp,
      flowSpeedDataPointId: flowSpeedDp,
    });
    onOpenChange(false);
  };

  if (!edge) return null; // Don't render if no edge

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure Animation Flow: {edge.data?.label || edge.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="flowActiveDp" className="text-sm font-medium">
              Generation Data Point
            </Label>
            <SearchableSelect
              options={dataPointOptions}
              value={flowActiveDp}
              onChange={(value) => setFlowActiveDp(value || undefined)}
              placeholder="Select Data Point for Generation..."
              searchPlaceholder="Search data points..."
              notFoundText="No data points found."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Controls if flow is active (e.g., links to 'isEnergized' or 'status').
            </p>
            {flowActiveDp && (
              <div className="mt-2">
                <DataLinkLiveValuePreview
                  dataPointId={flowActiveDp}
                  valueMapping={undefined} 
                  format={undefined} 
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="flowDirectionDp" className="text-sm font-medium">
              Usage Data Point
            </Label>
            <SearchableSelect
              options={dataPointOptions}
              value={flowDirectionDp}
              onChange={(value) => setFlowDirectionDp(value || undefined)}
              placeholder="Select Data Point for Usage..."
              searchPlaceholder="Search data points..."
              notFoundText="No data points found."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Controls flow direction (e.g., links to 'flowDirection').
            </p>
            {flowDirectionDp && (
              <div className="mt-2">
                <DataLinkLiveValuePreview
                  dataPointId={flowDirectionDp}
                  valueMapping={undefined} 
                  format={undefined} 
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="flowSpeedDp" className="text-sm font-medium">
              Flow Speed Data Point
            </Label>
            <SearchableSelect
              options={dataPointOptions}
              value={flowSpeedDp}
              onChange={(value) => setFlowSpeedDp(value || undefined)}
              placeholder="Select Data Point for Flow Speed..."
              searchPlaceholder="Search data points..."
              notFoundText="No data points found."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Controls animation speed (e.g., links to 'animationSpeedFactor').
            </p>
            {flowSpeedDp && (
              <div className="mt-2">
                <DataLinkLiveValuePreview
                  dataPointId={flowSpeedDp}
                  valueMapping={undefined}
                  format={undefined}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave}>Apply Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnimationFlowConfiguratorDialog;

// Also, ensure SearchableSelect component path is correct.
// If SearchableSelect is not in './SearchableSelect', adjust the import path.
// For example, if it's in a shared components/ui directory:
// import { SearchableSelect, ComboboxOption } from '@/components/ui/SearchableSelect'; 
// For now, assuming it's co-located as per the original SLDInspectorDialog.
