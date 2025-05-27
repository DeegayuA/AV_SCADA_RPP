import React, { useState, useEffect } from 'react';
import { DataPoint } from '@/config/dataPoints';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PowerTimelineGraphConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
  allPossibleDataPoints: DataPoint[];
  currentGenerationDpIds: string[];
  currentUsageDpIds: string[];
  currentExportDpIds: string[];
  onSaveConfiguration: (config: {
    generationDpIds: string[];
    usageDpIds: string[];
    exportDpIds: string[];
    exportMode: 'auto' | 'manual';
  }) => void;
}

const PowerTimelineGraphConfigurator: React.FC<PowerTimelineGraphConfiguratorProps> = ({
  isOpen,
  onClose,
  allPossibleDataPoints,
  currentGenerationDpIds,
  currentUsageDpIds,
  currentExportDpIds,
  onSaveConfiguration,
}) => {
  const [generationDpIds, setGenerationDpIds] = useState<string[]>([]);
  const [usageDpIds, setUsageDpIds] = useState<string[]>([]);
  const [exportDpIds, setExportDpIds] = useState<string[]>([]);
  const [exportMode, setExportMode] = useState<'auto' | 'manual'>('auto');

  useEffect(() => {
    setGenerationDpIds(currentGenerationDpIds);
    setUsageDpIds(currentUsageDpIds);
    setExportDpIds(currentExportDpIds);
    // Determine initial exportMode based on currentExportDpIds
    // If currentExportDpIds is not empty, it implies manual mode was previously selected.
    // Otherwise, default to 'auto'. This logic might need refinement based on how
    // currentExportDpIds is managed when 'auto' is selected (e.g., it might be empty).
    if (currentExportDpIds.length > 0) {
      setExportMode('manual');
    } else {
      setExportMode('auto');
    }
  }, [isOpen, currentGenerationDpIds, currentUsageDpIds, currentExportDpIds]);

  const handleSave = () => {
    onSaveConfiguration({
      generationDpIds,
      usageDpIds,
      exportDpIds: exportMode === 'manual' ? exportDpIds : [], // Clear exportDpIds if auto
      exportMode,
    });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Helper to toggle selection in a list of IDs
  const toggleSelection = (id: string, selectedIds: string[], setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter(selectedId => selectedId !== id)
      : [...selectedIds, id];
    setSelectedIds(newSelectedIds);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configure Power Timeline Graph</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Generation Section */}
          <div>
            <Label className="text-lg font-semibold">Generation Data Points</Label>
            <ScrollArea className="h-[200px] rounded-md border p-2 mt-2">
              {allPossibleDataPoints.map((dp) => (
                <div key={dp.id} className="flex items-center space-x-2 mb-1">
                  <Checkbox
                    id={`gen-${dp.id}`}
                    checked={generationDpIds.includes(dp.id)}
                    onCheckedChange={() => toggleSelection(dp.id, generationDpIds, setGenerationDpIds)}
                  />
                  <Label htmlFor={`gen-${dp.id}`} className="text-sm font-normal">
                    {dp.name}
                  </Label>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Usage Section */}
          <div>
            <Label className="text-lg font-semibold">Usage Data Points</Label>
            <ScrollArea className="h-[200px] rounded-md border p-2 mt-2">
              {allPossibleDataPoints.map((dp) => (
                <div key={dp.id} className="flex items-center space-x-2 mb-1">
                  <Checkbox
                    id={`usage-${dp.id}`}
                    checked={usageDpIds.includes(dp.id)}
                    onCheckedChange={() => toggleSelection(dp.id, usageDpIds, setUsageDpIds)}
                  />
                  <Label htmlFor={`usage-${dp.id}`} className="text-sm font-normal">
                    {dp.name}
                  </Label>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Export Section */}
          <div>
            <Label className="text-lg font-semibold">Export Data</Label>
            <RadioGroup
              value={exportMode}
              onValueChange={(value: 'auto' | 'manual') => setExportMode(value)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto-export" />
                <Label htmlFor="auto-export">Auto-calculate Net Export (Generation - Usage)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual-export" />
                <Label htmlFor="manual-export">Manual - Select Data Points</Label>
              </div>
            </RadioGroup>

            {exportMode === 'manual' && (
              <ScrollArea className="h-[200px] rounded-md border p-2 mt-4">
                {allPossibleDataPoints.map((dp) => (
                  <div key={dp.id} className="flex items-center space-x-2 mb-1">
                    <Checkbox
                      id={`export-${dp.id}`}
                      checked={exportDpIds.includes(dp.id)}
                      onCheckedChange={() => toggleSelection(dp.id, exportDpIds, setExportDpIds)}
                    />
                    <Label htmlFor={`export-${dp.id}`} className="text-sm font-normal">
                      {dp.name}
                    </Label>
                  </div>
                ))}
              </ScrollArea>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PowerTimelineGraphConfigurator;
