import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataPoint } from '@/config/dataPoints'; // Assuming this path is correct
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { X, PlusCircle, Search, Zap, Activity, Send, Settings2, ArrowLeft, ArrowRight, Save } from 'lucide-react'; // Icons
import { Badge } from '@/components/ui/badge';

// Interface for Props remains the same
interface PowerTimelineGraphConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
  allPossibleDataPoints: DataPoint[];
  currentGenerationDpIds: string[];
  currentUsageDpIds: string[];
  currentExportDpIds: string[];
  initialExportMode?: 'auto' | 'manual';
  onSaveConfiguration: (config: {
    generationDpIds: string[];
    usageDpIds: string[];
    exportDpIds: string[];
    exportMode: 'auto' | 'manual';
  }) => void;
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

      <div className="flex-grow flex flex-col min-h-0"> {/* Allow this div to shrink and grow */}
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
        <ScrollArea className="h-[180px] rounded-md border flex-grow"> {/* flex-grow for scroll area */}
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

// Define steps
const STEPS = [
  { id: 'generation', title: 'Generation', description: 'Select data points that represent power generation.' },
  { id: 'usage', title: 'Usage', description: 'Choose data points for tracking power consumption.' },
  { id: 'export', title: 'Export', description: 'Configure how exported power is calculated or tracked.' },
] as const;


const PowerTimelineGraphConfigurator: React.FC<PowerTimelineGraphConfiguratorProps> = ({
  isOpen,
  onClose,
  allPossibleDataPoints,
  currentGenerationDpIds,
  currentUsageDpIds,
  currentExportDpIds,
  initialExportMode = 'auto',
  onSaveConfiguration,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward');

  const [generationDpIds, setGenerationDpIds] = useState<string[]>([]);
  const [usageDpIds, setUsageDpIds] = useState<string[]>([]);
  const [exportDpIds, setExportDpIds] = useState<string[]>([]);
  const [exportMode, setExportMode] = useState<'auto' | 'manual'>(initialExportMode);

  const dataPointsMap = useMemo(() => {
    const map = new Map<string, DataPoint>();
    allPossibleDataPoints.forEach(dp => map.set(dp.id, dp));
    return map;
  }, [allPossibleDataPoints]);

  useEffect(() => {
    if (isOpen) {
      // Reset to first step and reload current props
      setCurrentStepIndex(0);
      setGenerationDpIds([...currentGenerationDpIds]);
      setUsageDpIds([...currentUsageDpIds]);
      setExportDpIds([...currentExportDpIds]);

      let mode = initialExportMode;
      if (currentExportDpIds.length > 0 && initialExportMode === 'auto') {
        mode = 'manual';
      } else if (currentExportDpIds.length === 0 && initialExportMode === 'manual') {
        mode = 'auto';
      } else {
        mode = (currentExportDpIds.length > 0 || initialExportMode === 'manual') ? 'manual' : 'auto';
      }
      setExportMode(mode);
    }
  }, [isOpen, currentGenerationDpIds, currentUsageDpIds, currentExportDpIds, initialExportMode]);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setAnimationDirection('forward');
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setAnimationDirection('backward');
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSave = () => {
    onSaveConfiguration({
      generationDpIds,
      usageDpIds,
      exportDpIds: exportMode === 'manual' ? exportDpIds : [],
      exportMode,
    });
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

  if (!isOpen) {
    return null;
  }

  const currentStepDetails = STEPS[currentStepIndex];

  const stepAnimationVariants = {
    enter: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? '100%' : '-100%',
      opacity: 0,
      position: 'absolute' as 'absolute', // Keep current item in place while new one enters
    }),
    center: {
      x: 0,
      opacity: 1,
      position: 'relative' as 'relative',
    },
    exit: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? '-100%' : '100%',
      opacity: 0,
      position: 'absolute' as 'absolute', // Allow item to slide out without affecting layout
    }),
  };
  
  const exportSectionMotionVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0, overflow: 'hidden' },
    visible: { opacity: 1, height: 'auto', marginTop: '1rem', overflow: 'visible' },
    exit: { opacity: 0, height: 0, marginTop: 0, overflow: 'hidden', transition: { duration: 0.2 } },
  };


  const renderStepContent = () => {
    switch (STEPS[currentStepIndex].id) {
      case 'generation':
        return (
          <CategoryDataPointManager
            instanceId="gen"
            categoryTitle="Generation Data Points"
            allPossibleDataPoints={allPossibleDataPoints}
            selectedDataPointIds={generationDpIds}
            onDataPointAdd={(id) => addDataPoint(id, generationDpIds, setGenerationDpIds)}
            onDataPointRemove={(id) => removeDataPoint(id, setGenerationDpIds)}
            dataPointsMap={dataPointsMap}
            icon={<Zap className="h-5 w-5" />}
          />
        );
      case 'usage':
        return (
          <CategoryDataPointManager
            instanceId="usage"
            categoryTitle="Usage Data Points"
            allPossibleDataPoints={allPossibleDataPoints}
            selectedDataPointIds={usageDpIds}
            onDataPointAdd={(id) => addDataPoint(id, usageDpIds, setUsageDpIds)}
            onDataPointRemove={(id) => removeDataPoint(id, setUsageDpIds)}
            dataPointsMap={dataPointsMap}
            icon={<Activity className="h-5 w-5" />}
          />
        );
      case 'export':
        return (
          <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-card h-full flex flex-col">
            <div className="flex items-center space-x-3">
                <Send className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Export Data Mode</h3>
            </div>
            <RadioGroup
              value={exportMode}
              onValueChange={(value: 'auto' | 'manual') => setExportMode(value)}
              className="space-y-2"
            >
              <Label htmlFor="auto-export" className="flex items-center space-x-3 p-3 rounded-md border hover:border-primary has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-primary/30 transition-all cursor-pointer select-none bg-background hover:bg-muted/50">
                <RadioGroupItem value="auto" id="auto-export" />
                <div className="flex-grow">
                  <span className="font-medium">Auto-calculate Net Export</span>
                  <p className="text-xs text-muted-foreground">(Generation - Usage)</p>
                </div>
              </Label>
              <Label htmlFor="manual-export" className="flex items-center space-x-3 p-3 rounded-md border hover:border-primary has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-primary/30 transition-all cursor-pointer select-none bg-background hover:bg-muted/50">
                <RadioGroupItem value="manual" id="manual-export" />
                <div className="flex-grow">
                  <span className="font-medium">Manual - Select Data Points</span>
                    <p className="text-xs text-muted-foreground">Choose specific data points for export.</p>
                </div>
              </Label>
            </RadioGroup>

            <div className="flex-grow min-h-0"> {/* This div will contain the animated part */}
              <AnimatePresence initial={false} mode="popLayout">
                {exportMode === 'manual' && (
                  <motion.div
                    key="manual-export-selector"
                    variants={exportSectionMotionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
                    className="h-full" // Ensure this takes height for CDM
                  >
                    <CategoryDataPointManager
                      instanceId="export-manual" // Changed instanceId to avoid conflicts
                      categoryTitle="Data Points for Manual Export"
                      allPossibleDataPoints={allPossibleDataPoints}
                      selectedDataPointIds={exportDpIds}
                      onDataPointAdd={(id) => addDataPoint(id, exportDpIds, setExportDpIds)}
                      onDataPointRemove={(id) => removeDataPoint(id, setExportDpIds)}
                      dataPointsMap={dataPointsMap}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); }}}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[750px] p-0 flex flex-col overflow-hidden h-[90vh] max-h-[800px]">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl flex items-center">
            <Settings2 className="h-5 w-5 mr-2 text-primary" />
            Configure Power Timeline Graph
          </DialogTitle>
          <DialogDescription>
             Step {currentStepIndex + 1} of {STEPS.length}: {currentStepDetails.description}
          </DialogDescription>
        </DialogHeader>
        
        {/* Container for animated steps. Fixed height needed for absolute positioning during animation. */}
        <div className="flex-grow p-6 overflow-hidden relative min-h-[450px]"> {/* Added min-height */}
          <AnimatePresence initial={false} custom={animationDirection} mode="wait">
            <motion.div
              key={currentStepIndex}
              custom={animationDirection}
              variants={stepAnimationVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full h-full" // Ensure motion.div takes full space of its container
            >
              {/* The content of the step itself. It should handle its own internal scrolling if necessary. */}
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="p-6 border-t shrink-0 flex justify-between">
          <div>
            {currentStepIndex > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            {currentStepIndex < STEPS.length - 1 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PowerTimelineGraphConfigurator;