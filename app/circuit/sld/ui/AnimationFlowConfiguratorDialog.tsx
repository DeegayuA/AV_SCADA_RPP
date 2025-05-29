// app/circuit/sld/ui/AnimationFlowConfiguratorDialog.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect, ComboboxOption } from './SearchableSelect';
import { CustomFlowEdge, DataPoint } from '@/types/sld';
import DataLinkLiveValuePreview from './DataLinkLiveValuePreview';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export interface AnimationFlowConfig {
  generationDataPointId?: string;
  usageDataPointId?: string;
  speedMultiplier?: number;
  applyToAllEdges?: boolean;
}

interface AnimationFlowConfiguratorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  edge: CustomFlowEdge | null; // Null if for global/bulk settings
  availableDataPoints: DataPoint[];
  onConfigure: (config: AnimationFlowConfig) => void;
}

const AnimationFlowConfiguratorDialog: React.FC<AnimationFlowConfiguratorDialogProps> = ({
  isOpen,
  onOpenChange,
  edge,
  availableDataPoints,
  onConfigure,
}) => {
  const [generationDp, setGenerationDp] = useState<string | undefined>(undefined);
  const [usageDp, setUsageDp] = useState<string | undefined>(undefined);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [applyToAllEdges, setApplyToAllEdges] = useState<boolean>(false);

  const dataPointOptions = useMemo((): ComboboxOption[] =>
    Object.values(availableDataPoints).map(dp => ({
      value: dp.id,
      label: `${dp.name || dp.id}${dp.description ? ` (${dp.description})` : ''}`,
      description: `ID: ${dp.id} | Type: ${dp.dataType} | Unit: ${dp.unit || 'N/A'}`,
    })).sort((a, b) => a.label.localeCompare(b.label)),
  [availableDataPoints]);

  useEffect(() => {
    if (isOpen) {
      const currentAnimSettings = edge?.data?.animationSettings;
      setGenerationDp(currentAnimSettings?.generationDataPointId);
      setUsageDp(currentAnimSettings?.usageDataPointId);
      setSpeedMultiplier(currentAnimSettings?.speedMultiplier ?? 1);
      
      setApplyToAllEdges(false); // Default to false when dialog opens for specific edge(s)
      
      // Legacy pre-fill (can be removed once animationSettings is primary)
      if (!currentAnimSettings && edge?.data?.dataPointLinks) {
          const activeLink = edge.data.dataPointLinks.find(l => l.targetProperty === 'isEnergized' || l.targetProperty === 'status');
          const directionLink = edge.data.dataPointLinks.find(l => l.targetProperty === 'flowDirection');
          if(activeLink) setGenerationDp(activeLink.dataPointId);
          if(directionLink) setUsageDp(directionLink.dataPointId);
          // Note: Speed multiplier from a link directly isn't straightforward, so it's not pre-filled from legacy links.
      }

    } else {
      setGenerationDp(undefined);
      setUsageDp(undefined);
      setSpeedMultiplier(1);
      setApplyToAllEdges(false);
    }
  }, [edge, isOpen]);

  const handleSave = () => {
    onConfigure({
      generationDataPointId: generationDp,
      usageDataPointId: usageDp,
      speedMultiplier: speedMultiplier,
      applyToAllEdges: applyToAllEdges,
    });
    onOpenChange(false);
  };

  // If edge is null, this dialog might be for global settings, adjust title accordingly.
  // For now, the prompt implies edge is not null when called from inspector, 
  // but it will be null when called for bulk configuration from SLDWidget.
  const dialogTitle = edge 
    ? `Configure Edge Animation: ${edge.data?.label || edge.id}` 
    : "Configure Animation for Selected Edges";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="generationDp" className="text-sm font-medium">
              Generation Data Point
            </Label>
            <SearchableSelect
              options={dataPointOptions}
              value={generationDp}
              onChange={(value) => setGenerationDp(value || undefined)}
              placeholder="Select Data Point for Generation..."
              searchPlaceholder="Search data points..."
              notFoundText="No data points found."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Numeric. Positive values indicate generation/source. Links to 'isEnergized'.
            </p>
            {generationDp && (
              <div className="mt-2">
                <DataLinkLiveValuePreview
                  dataPointId={generationDp}
                  valueMapping={undefined} 
                  format={undefined} 
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="usageDp" className="text-sm font-medium">
              Usage Data Point
            </Label>
            <SearchableSelect
              options={dataPointOptions}
              value={usageDp}
              onChange={(value) => setUsageDp(value || undefined)}
              placeholder="Select Data Point for Usage..."
              searchPlaceholder="Search data points..."
              notFoundText="No data points found."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Numeric. Positive values indicate consumption/load. Links to 'flowDirection'.
            </p>
            {usageDp && (
              <div className="mt-2">
                <DataLinkLiveValuePreview
                  dataPointId={usageDp}
                  valueMapping={undefined} 
                  format={undefined} 
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="speedMultiplier" className="text-sm font-medium">
              Speed Multiplier
            </Label>
            <Input
              id="speedMultiplier"
              type="number"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value) || 1)}
              min={0.1}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Multiplier for the speed calculated from |Generation - Usage|. Default is 1.
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-border/40"> {/* Adjusted pt for spacing after removing conditional */}
            <Checkbox
              id="applyToAllEdges"
                checked={applyToAllEdges}
                onCheckedChange={(checkedState) => setApplyToAllEdges(Boolean(checkedState.valueOf()))}
              />
              <Label htmlFor="applyToAllEdges" className="text-sm font-normal cursor-pointer">
                Apply this animation logic to all edges in this SLD
              </Label>
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
