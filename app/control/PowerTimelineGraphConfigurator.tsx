import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataPoint } from '@/config/dataPoints'; // Assuming this path is correct
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { X, PlusCircle, Search, Zap, Activity, Send, Settings2, ArrowLeft, ArrowRight, Save, ArrowUp, ArrowDown } from 'lucide-react'; // Icons
import { Badge } from '@/components/ui/badge';
import IconPicker from './IconPicker';

// Interface for Props remains the same
import { icons } from 'lucide-react';

export interface TimelineSeries {
  id: string;
  name:string;
  dpIds: string[];
  color: string;
  displayType: 'line' | 'area';
  role: 'generation' | 'usage' | 'gridFeed' | 'other';
  icon: keyof typeof icons;
  visible: boolean;
  drawOnGraph: boolean;
  unit?: string;
  multiplier?: number;
  precision?: number;
  invert?: boolean;
}

export interface PowerTimelineGraphConfig {
  series: TimelineSeries[];
  exportMode: 'auto' | 'manual';
  // Future global settings like auto-scaling can go here
}

interface PowerTimelineGraphConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
  allPossibleDataPoints: DataPoint[];
  currentConfig: PowerTimelineGraphConfig;
  onSaveConfiguration: (newConfig: PowerTimelineGraphConfig) => void;
}

// CategoryDataPointManager remains the same as your previous good version
interface CategoryDataPointManagerProps {
  categoryTitle: string;
  allPossibleDataPoints: DataPoint[];
  selectedDataPointIds: string[];
  onDataPointAdd: (dpId: string) => void;
  onDataPointRemove: (dpId: string) => void;
  dataPointsMap: Map<string, DataPoint>;
  icon?: React.ReactNode;
  instanceId: string;
}

const CategoryDataPointManager: React.FC<CategoryDataPointManagerProps> = ({
  categoryTitle,
  allPossibleDataPoints,
  selectedDataPointIds,
  onDataPointAdd,
  onDataPointRemove,
  dataPointsMap,
  icon,
  instanceId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const availableDataPointsToSelect = useMemo(() => {
    return allPossibleDataPoints.filter(dp =>
      !selectedDataPointIds.includes(dp.id) &&
      dp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allPossibleDataPoints, selectedDataPointIds, searchTerm]);

  const selectedDataPointsObjects = useMemo(() => {
    return selectedDataPointIds.map(id => dataPointsMap.get(id)).filter(Boolean) as DataPoint[];
  }, [selectedDataPointIds, dataPointsMap]);

  const pillAnimationVariants = {
    initial: { opacity: 0, y: -10, scale: 0.8 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, x: -20, scale: 0.8, transition: { duration: 0.2 } },
  };
  
  const listItemAnimationVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10, transition: { duration: 0.15 } },
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg shadow-sm bg-card h-full flex flex-col">
      <div className="flex items-center space-x-3">
        {icon && <span className="text-primary">{icon}</span>}
        <h3 className="text-lg font-semibold text-foreground">{categoryTitle}</h3>
        <Badge variant="secondary" className="ml-auto px-2.5 py-0.5 text-sm">
          {selectedDataPointIds.length} selected
        </Badge>
      </div>

      {selectedDataPointsObjects.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Selected items:</Label>
          <ScrollArea className="max-h-[100px] rounded-md p-1 -m-1">
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {selectedDataPointsObjects.map((dp) => (
                  <motion.div
                    key={`${instanceId}-selected-${dp.id}`}
                    layout
                    variants={pillAnimationVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    <Badge variant="outline" className="text-sm py-1 pl-2.5 pr-1.5 border-primary/50 bg-primary/10">
                      <span className="mr-1">{dp.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => onDataPointRemove(dp.id)}
                        aria-label={`Remove ${dp.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="flex-grow flex flex-col min-h-0">
        <Label className="text-xs font-medium text-muted-foreground mb-1 block">Available to add:</Label>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search & add data points..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-10"
            aria-label="Search available data points"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <ScrollArea className="flex-grow rounded-md border">
          <AnimatePresence mode="sync">
            {availableDataPointsToSelect.length > 0 ? (
              availableDataPointsToSelect.map((dp) => (
                <motion.div
                    key={`${instanceId}-available-${dp.id}`}
                    layout
                    variants={listItemAnimationVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ type: 'spring', stiffness: 500, damping: 25, duration: 0.2 }}
                      className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded-md"
                  >
                    <Label htmlFor={`add-${instanceId}-${dp.id}`} className="text-sm font-normal cursor-pointer flex-grow select-none">
                      {dp.name} <span className="text-xs text-muted-foreground">({dp.id})</span>
                    </Label>
                    <Button
                      id={`add-${instanceId}-${dp.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onDataPointAdd(dp.id)}
                      className="text-primary hover:text-primary shrink-0"
                      aria-label={`Add ${dp.name}`}
                  >
                      <PlusCircle className="h-4 w-4 mr-1.5" /> Add
                    </Button>
                  </motion.div>
                ))
              ) : (
              searchTerm ?
                <p className="text-sm text-muted-foreground text-center py-4 px-2">No matches for "{searchTerm}".</p> :
                <p className="text-sm text-muted-foreground text-center py-4 px-2">All possible items selected or none available.</p>
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>
    </div>
  );
};

const PowerTimelineGraphConfigurator: React.FC<PowerTimelineGraphConfiguratorProps> = ({
  isOpen,
  onClose,
  allPossibleDataPoints,
  currentConfig,
  onSaveConfiguration,
}) => {
  const [config, setConfig] = useState<PowerTimelineGraphConfig>(currentConfig);

  const dataPointsMap = useMemo(() => {
    const map = new Map<string, DataPoint>();
    allPossibleDataPoints.forEach(dp => map.set(dp.id, dp));
    return map;
  }, [allPossibleDataPoints]);

  useEffect(() => {
    if (isOpen) {
      // Deep copy to prevent modifying the original object directly
      setConfig(JSON.parse(JSON.stringify(currentConfig)));
    }
  }, [isOpen, currentConfig]);

  const handleSave = () => {
    onSaveConfiguration(config);
    onClose();
  };
  
  const addDataPoint = (id: string, currentIds: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (!currentIds.includes(id)) {
      setter(prevIds => [...prevIds, id]);
    }
  };

  const removeDataPoint = (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prevIds => prevIds.filter(dpId => dpId !== id));
  };

  const handleReorder = (seriesId: string, direction: 'up' | 'down') => {
    const index = config.series.findIndex(s => s.id === seriesId);
    if (index === -1) return;

    const newSeries = [...config.series];
    const [item] = newSeries.splice(index, 1);

    if (direction === 'up' && index > 0) {
      newSeries.splice(index - 1, 0, item);
    } else if (direction === 'down' && index < newSeries.length) {
      newSeries.splice(index + 1, 0, item);
    } else {
        // if move is not possible, put it back
        newSeries.splice(index, 0, item);
    }

    setConfig({ ...config, series: newSeries });
  };

  const [editingSeries, setEditingSeries] = useState<TimelineSeries | null>(null);

  if (!isOpen) {
    return null;
  }

  const renderSeriesList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Configured Series</h3>
        <Button onClick={() => setEditingSeries({ id: `new_${Date.now()}`, name: 'New Series', dpIds: [], color: '#4d4dff', displayType: 'line', role: 'other', icon: 'Zap', visible: true, drawOnGraph: true, unit: 'kW', multiplier: 1, precision: 2, invert: false })}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Series
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3 pr-4">
          {config.series.map((series, index) => (
            <motion.div
              key={series.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-3 border rounded-lg flex items-center gap-4 hover:bg-muted/50"
            >
              <div className="w-6 h-6 rounded-sm shrink-0" style={{ backgroundColor: series.color }} />
              <div className="flex-grow">
                <p className="font-semibold">{series.name}</p>
                <p className="text-xs text-muted-foreground">{series.dpIds.length} data point(s) - Unit: {series.unit || 'auto'} - Precision: {series.precision ?? 2}</p>
              </div>
              <div className="flex items-center gap-1">
                 <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === 0} onClick={() => handleReorder(series.id, 'up')}>
                        <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === config.series.length - 1} onClick={() => handleReorder(series.id, 'down')}>
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                 </div>
                <Button variant="outline" size="sm" onClick={() => setEditingSeries(series)}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => {
                  const newSeries = config.series.filter(s => s.id !== series.id);
                  setConfig({ ...config, series: newSeries });
                }}>
                  Remove
                </Button>
              </div>
            </motion.div>
          ))}
          {config.series.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No data series configured.</p>
              <p className="text-sm">Click "Add New Series" to get started.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderEditView = () => {
    if (!editingSeries) return null;

    const handleSeriesUpdate = (updatedSeries: TimelineSeries) => {
      const index = config.series.findIndex(s => s.id === updatedSeries.id);
      let newSeriesList: TimelineSeries[];
      if (index > -1) {
        newSeriesList = [...config.series];
        newSeriesList[index] = updatedSeries;
      } else {
        newSeriesList = [...config.series, updatedSeries];
      }
      setConfig({ ...config, series: newSeriesList });
      setEditingSeries(null);
    };

    return (
      <div className="space-y-1 h-full flex flex-col">
        <Button variant="ghost" onClick={() => setEditingSeries(null)} className="self-start">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Series List
        </Button>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="md:col-span-2">
            <Label htmlFor="series-name">Series Name</Label>
            <Input
              id="series-name"
              value={editingSeries.name}
              onChange={(e) => setEditingSeries({ ...editingSeries, name: e.target.value })}
              placeholder="e.g., Solar Production"
            />
          </div>
          <div>
            <Label htmlFor="series-color">Color</Label>
            <Input
              id="series-color"
              type="color"
              value={editingSeries.color}
              onChange={(e) => setEditingSeries({ ...editingSeries, color: e.target.value })}
              className="h-10"
            />
          </div>
          <div className="md:col-span-3 grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor="series-role">Series Role</Label>
                <Select
                  value={editingSeries.role}
                  onValueChange={(value: 'generation' | 'usage' | 'gridFeed' | 'other') => setEditingSeries({ ...editingSeries, role: value })}
                >
                  <SelectTrigger id="series-role">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generation">Generation</SelectItem>
                    <SelectItem value="usage">Usage</SelectItem>
                    <SelectItem value="gridFeed">Grid Feed</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Used for Net Power calculation.</p>
            </div>
            <div>
                <Label htmlFor="display-type">Display Type</Label>
                <Select
                  value={editingSeries.displayType}
                  onValueChange={(value: 'line' | 'area') => setEditingSeries({ ...editingSeries, displayType: value })}
                >
                  <SelectTrigger id="display-type">
                    <SelectValue placeholder="Select a type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                  </SelectContent>
                </Select>
                 <p className="text-xs text-muted-foreground mt-1">Visual style on the graph.</p>
            </div>
          </div>
           <div className="md:col-span-3">
                <IconPicker
                    selectedIcon={editingSeries.icon}
                    onIconSelect={(iconName) => setEditingSeries({ ...editingSeries, icon: iconName as keyof typeof icons})}
                />
            </div>
            <div>
                <Label htmlFor="series-unit">Unit</Label>
                <Input
                    id="series-unit"
                    value={editingSeries.unit}
                    onChange={(e) => setEditingSeries({ ...editingSeries, unit: e.target.value })}
                    placeholder="e.g., kW"
                />
            </div>
            <div>
                <Label htmlFor="series-multiplier">Multiplier</Label>
                <Input
                    id="series-multiplier"
                    type="number"
                    value={editingSeries.multiplier}
                    onChange={(e) => setEditingSeries({ ...editingSeries, multiplier: parseFloat(e.target.value) })}
                    placeholder="e.g., 1"
                />
            </div>
            <div>
                <Label htmlFor="series-precision">Precision</Label>
                <Input
                    id="series-precision"
                    type="number"
                    value={editingSeries.precision}
                    onChange={(e) => setEditingSeries({ ...editingSeries, precision: parseInt(e.target.value) })}
                    placeholder="e.g., 2"
                    min="0"
                    max="10"
                />
            </div>
        </div>
        <div className="flex items-center space-x-2 rounded-lg border p-3 mt-1">
            <Switch
                id="draw-on-graph"
                checked={editingSeries.drawOnGraph}
                onCheckedChange={(checked) => setEditingSeries({ ...editingSeries, drawOnGraph: checked })}
            />
            <Label htmlFor="draw-on-graph" className="cursor-pointer">
                Draw this series on the graph
            </Label>
        </div>
        <div className="flex items-center space-x-2 rounded-lg border p-3 mt-1">
            <Switch
                id="invert-series"
                checked={editingSeries.invert}
                onCheckedChange={(checked) => setEditingSeries({ ...editingSeries, invert: checked })}
            />
            <Label htmlFor="invert-series" className="cursor-pointer">
                Invert Series (+/-)
            </Label>
        </div>
        <div className="flex-grow min-h-0 pt-1">
            <CategoryDataPointManager
                instanceId={`series-editor-${editingSeries.id}`}
                categoryTitle="Data Points for this Series"
                allPossibleDataPoints={allPossibleDataPoints}
                selectedDataPointIds={editingSeries.dpIds}
                onDataPointAdd={(id) => setEditingSeries(prev => prev ? { ...prev, dpIds: [...prev.dpIds, id] } : null)}
                onDataPointRemove={(id) => setEditingSeries(prev => prev ? { ...prev, dpIds: prev.dpIds.filter(dpId => dpId !== id) } : null)}
                dataPointsMap={dataPointsMap}
            />
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={() => handleSeriesUpdate(editingSeries)}>
            <Save className="h-4 w-4 mr-2" />
            Save Series
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); }}}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[750px] p-0 flex flex-col overflow-hidden h-[95vh] max-h-[900px]">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl flex items-center">
            <Settings2 className="h-5 w-5 mr-2 text-primary" />
            Configure Power Timeline Graph
          </DialogTitle>
          <DialogDescription>
            Add, remove, and edit the data series displayed on the timeline graph.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow p-6 overflow-y-auto">
          {editingSeries ? renderEditView() : renderSeriesList()}
        </div>

        <DialogFooter className="p-6 border-t shrink-0 flex justify-end">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PowerTimelineGraphConfigurator;