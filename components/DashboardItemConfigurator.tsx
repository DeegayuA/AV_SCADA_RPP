// src/components/dashboard/DashboardItemConfigurator.tsx
import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Checkbox removed as explicit checkbox in grid view items is not typical for compact design
import { DataPoint } from '@/config/dataPoints';
import { X, Search, RotateCcw, PackagePlus, Info, CheckCheck, Users, LayoutGrid } from 'lucide-react'; // Removed View, Rows icons
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from 'framer-motion';
import clsx from 'clsx';
// Separator removed as it was for list view
import { VariableSizeGrid, GridChildComponentProps } from 'react-window'; // VariableSizeList removed
import AutoSizer from 'react-virtualized-auto-sizer';

export interface ConfiguratorThreePhaseGroup {
    name: string;
    representativeName: string;
    ids: string[];
    category: string;
}

type DataItem =
    | { itemType: 'groupItem'; data: ConfiguratorThreePhaseGroup } // Removed originalIndex as it's not actively used
    | { itemType: 'individualItem'; data: DataPoint };

// Define heights/dimensions for grid elements
const ROW_HEIGHTS = {
    GRID_ITEM: 72,          // Compact grid item height (card itself will be slightly smaller due to cell padding)
    EMPTY_STATE_MIN_HEIGHT: 180 // Retained for standalone empty state if needed
};

// Grid configuration
const DEFAULT_COLUMN_COUNT = 4;
const MIN_COLUMN_WIDTH = 150;   // Slightly smaller min width for potentially more columns

// --- Component Props ---
interface DashboardItemConfiguratorProps {
    isOpen: boolean;
    onClose: () => void;
    availableIndividualPoints: DataPoint[];
    availableThreePhaseGroups: ConfiguratorThreePhaseGroup[];
    currentDisplayedIds: string[];
    onAddMultipleDataPoints: (selectedIds: string[]) => void;
}

// --- Main Component ---
const DashboardItemConfigurator: React.FC<DashboardItemConfiguratorProps> = ({
    isOpen, onClose, availableIndividualPoints, availableThreePhaseGroups,
    currentDisplayedIds, onAddMultipleDataPoints,
}) => {
    // --- State ---
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedIndividualIds, setSelectedIndividualIds] = useState<Set<string>>(new Set());
    const [selectedGroupNames, setSelectedGroupNames] = useState<Set<string>>(new Set());
    const [columnCount, setColumnCount] = useState(DEFAULT_COLUMN_COUNT);
    const gridRef = React.useRef<VariableSizeGrid>(null); // Changed from listRef and type VariableSizeList | VariableSizeGrid

    // --- Effects ---
    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedIndividualIds(new Set());
            setSelectedGroupNames(new Set());
            setSearchTerm('');
            if (gridRef.current) {
                gridRef.current.scrollTo?.({ scrollTop: 0, scrollLeft: 0 });
            }
        }
    }, [isOpen]);
    
    // Memoize filtered raw data items
    const filteredDataItems = useMemo((): DataItem[] => {
        const lowerSearchTerm = searchTerm.toLowerCase();

        const individualFilter = (dp: DataPoint) => {
            if (!currentDisplayedIds.includes(dp.id)) {
                if (!searchTerm) return true;
                return dp.name.toLowerCase().includes(lowerSearchTerm) ||
                       dp.category.toLowerCase().includes(lowerSearchTerm) ||
                       dp.id.toLowerCase().includes(lowerSearchTerm);
            }
            return false;
        };

        const groupFilter = (g: ConfiguratorThreePhaseGroup) => {
            if (!g.ids.every(id => currentDisplayedIds.includes(id))) { // Not all items already displayed
                if (!searchTerm) return true;
                return g.representativeName.toLowerCase().includes(lowerSearchTerm) ||
                       g.category.toLowerCase().includes(lowerSearchTerm) ||
                       g.name.toLowerCase().includes(lowerSearchTerm);
            }
            return false;
        };

        const individuals: DataItem[] = availableIndividualPoints
            .filter(individualFilter)
            .map(dp => ({ itemType: 'individualItem', data: dp }));

        const groups: DataItem[] = availableThreePhaseGroups
            .filter(groupFilter)
            .map(g => ({ itemType: 'groupItem', data: g }));

        return [...groups, ...individuals]; // Groups first
    }, [availableIndividualPoints, availableThreePhaseGroups, currentDisplayedIds, searchTerm]);
    
    // Reset virtualization cache and scroll on data/view changes
    useEffect(() => {
        if (gridRef.current) {
            const grid = gridRef.current;
            grid.resetAfterIndices?.({ columnIndex: 0, rowIndex: 0, shouldForceUpdate: true });
            grid.scrollTo?.({ scrollTop: 0, scrollLeft: 0 });
        }
    }, [searchTerm, columnCount, filteredDataItems]); // filteredDataItems dependency is important


    // Calculate grid row count
    const gridRowCount = useMemo(() => {
        if (filteredDataItems.length === 0) return 0; // No rows if empty, empty state handled separately
        return Math.ceil(filteredDataItems.length / columnCount);
    }, [filteredDataItems, columnCount]);

    // --- Callbacks ---
    const getRowHeightForGrid = useCallback((): number => ROW_HEIGHTS.GRID_ITEM, []);
    const getColumnWidthForGrid = useCallback((totalWidth: number): number => Math.max(MIN_COLUMN_WIDTH, totalWidth / columnCount), [columnCount]);

    // Selection toggling - FIXED
    const handleToggleIndividual = useCallback((id: string) => {
        setSelectedIndividualIds(prevIds => {
            const newIds = new Set(prevIds);
            if (newIds.has(id)) newIds.delete(id);
            else newIds.add(id);
            return newIds;
        });
    }, []);
    const handleToggleGroup = useCallback((name: string) => {
        setSelectedGroupNames(prevNames => {
            const newNames = new Set(prevNames);
            if (newNames.has(name)) newNames.delete(name);
            else newNames.add(name);
            return newNames;
        });
    }, []);

    // Get effectively selected IDs
    const getEffectiveIdsFromSelectedGroups = useCallback((): string[] => {
        let groupItemIds: string[] = [];
        selectedGroupNames.forEach(name => {
            const group = availableThreePhaseGroups.find(g => g.name === name);
            if (group) {
                group.ids.forEach(id => {
                    if (!currentDisplayedIds.includes(id)) groupItemIds.push(id);
                });
            }
        });
        return groupItemIds;
    }, [selectedGroupNames, availableThreePhaseGroups, currentDisplayedIds]);

    // Data for adding items
    const effectiveDataPointsToAdd = useMemo(() => Array.from(new Set([...Array.from(selectedIndividualIds), ...getEffectiveIdsFromSelectedGroups()])), [selectedIndividualIds, getEffectiveIdsFromSelectedGroups]);
    const effectiveDataPointsToAddCount = effectiveDataPointsToAdd.length;
    const totalSelectionsMadeCount = selectedIndividualIds.size + selectedGroupNames.size;

    // Button actions
    const handleAddSelected = () => { if (effectiveDataPointsToAdd.length > 0) { onAddMultipleDataPoints(effectiveDataPointsToAdd); onClose(); } };
    const handleClearAllSelections = () => { setSelectedIndividualIds(new Set()); setSelectedGroupNames(new Set()); };

    // Helper for group info
    const getGroupItemCounts = useCallback((g: ConfiguratorThreePhaseGroup) => ({ totalInGroup: g.ids.length, displayableNow: g.ids.filter(id => !currentDisplayedIds.includes(id)).length }), [currentDisplayedIds]);

    // Bulk selection logic
    const handleSelectAllVisibleLogic = () => {
        const newIndividualIds = new Set(selectedIndividualIds);
        const newGroupNames = new Set(selectedGroupNames);
        filteredDataItems.forEach(item => {
            if (item.itemType === 'individualItem' && !currentDisplayedIds.includes(item.data.id)) {
                newIndividualIds.add(item.data.id);
            } else if (item.itemType === 'groupItem' && !item.data.ids.every(id => currentDisplayedIds.includes(id))) {
                newGroupNames.add(item.data.name);
            }
        });
        setSelectedIndividualIds(newIndividualIds);
        setSelectedGroupNames(newGroupNames);
    };
    const handleDeselectAllVisibleLogic = () => {
        const visibleIndividualIds = new Set(filteredDataItems.filter(i => i.itemType === 'individualItem').map(i => (i.data as DataPoint).id));
        const visibleGroupNames = new Set(filteredDataItems.filter(i => i.itemType === 'groupItem').map(i => (i.data as ConfiguratorThreePhaseGroup).name));
        setSelectedIndividualIds(prev => new Set(Array.from(prev).filter(id => !visibleIndividualIds.has(id))));
        setSelectedGroupNames(prev => new Set(Array.from(prev).filter(name => !visibleGroupNames.has(name))));
    };

    // Memoized data for GridViewCell
    const itemDataForGrid = useMemo(() => ({
        items: filteredDataItems,
        columnCount,
        selectedIndividualIds,
        selectedGroupNames,
        currentDisplayedIds,
        handleToggleIndividual,
        handleToggleGroup,
        getGroupItemCounts,
    }), [filteredDataItems, columnCount, selectedIndividualIds, selectedGroupNames, currentDisplayedIds, handleToggleIndividual, handleToggleGroup, getGroupItemCounts]);

    // Conditional Rendering Flags
    const showBulkActions = filteredDataItems.length > 0;
    const canSelectAnyVisible = useMemo(() => filteredDataItems.some(item => {
        if (item.itemType === 'individualItem') return !selectedIndividualIds.has(item.data.id);
        if (item.itemType === 'groupItem') {
            const alreadyAdded = item.data.ids.every(id => currentDisplayedIds.includes(id));
            return !alreadyAdded && !selectedGroupNames.has(item.data.name);
        }
        return false;
    }), [filteredDataItems, selectedIndividualIds, selectedGroupNames, currentDisplayedIds]);
    const canDeselectAnyVisible = useMemo(() => filteredDataItems.some(item => {
        if (item.itemType === 'individualItem') return selectedIndividualIds.has(item.data.id);
        if (item.itemType === 'groupItem') return selectedGroupNames.has(item.data.name);
        return false;
    }), [filteredDataItems, selectedIndividualIds, selectedGroupNames]);


    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-7xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-4 sm:p-5 border-b flex-shrink-0">
                    <DialogTitle className="text-xl sm:text-2xl font-semibold">Add Items to Dashboard</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        {`Select from ${filteredDataItems.length} available items. Displayed in a compact grid.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 sm:px-5 pt-3 pb-2 flex-shrink-0 flex items-center justify-between gap-3 border-b">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Search name, category, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-8 h-9 text-sm rounded-md" />
                        {searchTerm && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchTerm('')}><X className="h-3.5 w-3.5" /></Button>}
                    </div>
                    {/* View toggle button removed */}
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-1.5 sm:px-2 pt-1.5 pb-0.5">
                    {showBulkActions && (
                        <BulkSelectionActions 
                            onSelectAll={handleSelectAllVisibleLogic} 
                            onDeselectAll={handleDeselectAllVisibleLogic} 
                            canSelectAll={canSelectAnyVisible} 
                            canDeselectAll={canDeselectAnyVisible} 
                            selectionCount={effectiveDataPointsToAddCount} 
                        />
                    )}
                    <div className="flex-1 relative min-h-100"> {/* AutoSizer wrapper */}
                        {gridRowCount === 0 ? (
                             <EmptyStateMessage searchTerm={searchTerm} />
                        ) : (
                            <AutoSizer>
                                {({ height, width }) => {
                                    if (width > 0) { // Ensure width is positive before calculation
                                        const newColCount = Math.max(1, Math.floor(width / MIN_COLUMN_WIDTH));
                                        if (newColCount !== columnCount) {
                                            // Defer state update to avoid issues during render
                                            Promise.resolve().then(() => setColumnCount(newColCount));
                                        }
                                    }
                                    if (height < 50 || width < 50) {
                                        return <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-1"><p>Loading layout...</p></div>;
                                    }
                                    
                                    return (
                                        <VariableSizeGrid
                                            key={`grid-${columnCount}`} // Re-key on column count change
                                            ref={gridRef}
                                            height={height}
                                            width={width}
                                            rowCount={gridRowCount}
                                            columnCount={columnCount}
                                            rowHeight={getRowHeightForGrid}
                                            columnWidth={() => getColumnWidthForGrid(width)} // columnWidth can take index, but here it's uniform based on total width
                                            itemData={itemDataForGrid}
                                            className="custom-scrollbar"
                                        >
                                            {GridViewCell}
                                        </VariableSizeGrid>
                                    );
                                }}
                            </AutoSizer>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-3 sm:p-4 flex-shrink-0 bg-secondary/40 border-t gap-2 items-center">
                    <div className="text-xs text-muted-foreground mr-auto whitespace-nowrap overflow-hidden text-ellipsis">
                        {totalSelectionsMadeCount > 0 ? `${totalSelectionsMadeCount} selected` : 'No items selected'}
                        {effectiveDataPointsToAddCount > 0 && totalSelectionsMadeCount > 0 && ` (${effectiveDataPointsToAddCount} new)`}
                    </div>
                    <Button type="button" variant="ghost" onClick={handleClearAllSelections} disabled={totalSelectionsMadeCount === 0} size="sm"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Clear</Button>
                    <DialogClose asChild><Button type="button" variant="outline" size="sm">Cancel</Button></DialogClose>
                    <Button type="button" onClick={handleAddSelected} disabled={effectiveDataPointsToAddCount === 0} size="sm"><PackagePlus className="mr-1.5 h-4 w-4" />Add ({effectiveDataPointsToAddCount})</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// ----- Child Components (Grid Focused and Compact) -----

// GridViewCell remains similar but simplified item access
const GridViewCell = memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {
    const { items, columnCount, ...restOfData } = data;
    const itemIndex = rowIndex * columnCount + columnIndex;
    const item = items[itemIndex] as DataItem | undefined;

    if (!item) {
        return <div style={style}></div>; // Empty cell (e.g., last row not full)
    }
    return (
        <div style={style} className="flex items-center justify-center p-1"> {/* Padding for spacing between cards */}
            <SingleItemCard item={item} {...restOfData} />
        </div>
    );
});
GridViewCell.displayName = 'GridViewCell';


interface SingleItemCardProps {
    item: DataItem;
    selectedIndividualIds: Set<string>;
    selectedGroupNames: Set<string>;
    currentDisplayedIds: string[];
    handleToggleIndividual: (id: string) => void;
    handleToggleGroup: (name: string) => void;
    getGroupItemCounts: (group: ConfiguratorThreePhaseGroup) => { totalInGroup: number, displayableNow: number };
}
const SingleItemCard: React.FC<SingleItemCardProps> = memo(({
    item, selectedIndividualIds, selectedGroupNames, currentDisplayedIds,
    handleToggleIndividual, handleToggleGroup, getGroupItemCounts
}) => {
    const isGroup = item.itemType === 'groupItem';
    const dataPayload = item.data;
    
    const idOrName = isGroup ? (dataPayload as ConfiguratorThreePhaseGroup).name : (dataPayload as DataPoint).id;
    const displayName = isGroup ? (dataPayload as ConfiguratorThreePhaseGroup).representativeName : (dataPayload as DataPoint).name;
    const category = dataPayload.category;

    let isSelected: boolean;
    let isFullyAddedToDashboard: boolean = false;
    let badgeText: string | React.ReactNode | undefined;
    let tooltipText: string | undefined;

    if (isGroup) {
        const groupData = dataPayload as ConfiguratorThreePhaseGroup;
        const { displayableNow, totalInGroup } = getGroupItemCounts(groupData);
        isFullyAddedToDashboard = groupData.ids.every(id => currentDisplayedIds.includes(id));
        isSelected = selectedGroupNames.has(groupData.name) && !isFullyAddedToDashboard;

        if (isFullyAddedToDashboard) {
            badgeText = "Added";
            tooltipText = "All items in this group are already on the dashboard.";
        } else if (displayableNow < totalInGroup && displayableNow > 0) {
            badgeText = `+${displayableNow}`;
            tooltipText = `Adds ${displayableNow} of ${totalInGroup} available items from this group. Others are already on dashboard.`;
        } else if (displayableNow === totalInGroup && totalInGroup > 0){
            badgeText = <CheckCheck className="w-3 h-3 text-green-600 group-hover:text-green-700" />;
            tooltipText = `Group: Adds all ${totalInGroup} items.`;
        } else { // displayableNow === 0, but not fully added implies error or specific state
             badgeText = "Info"; // Fallback, ideally handle this state if it occurs
             tooltipText = "This group has no new items to add currently.";
        }
    } else {
        isSelected = selectedIndividualIds.has((dataPayload as DataPoint).id);
        isFullyAddedToDashboard = currentDisplayedIds.includes((dataPayload as DataPoint).id); // Individual item already added
         if (isFullyAddedToDashboard) {
            tooltipText = "This item is already on the dashboard.";
        } else {
            tooltipText = `Item: ${displayName} - ${category}`;
        }
    }

    const handleToggle = () => {
        if (isFullyAddedToDashboard) return;
        if (isGroup) handleToggleGroup(idOrName);
        else handleToggleIndividual(idOrName);
    };
    
    const cardContent = (
        <motion.div
            onClick={handleToggle}
            className={clsx(
                "w-full h-full flex flex-col items-center justify-center p-1.5 text-center space-y-1", // Grid specific styling applied directly
                "border rounded-md transition-all duration-150 cursor-pointer overflow-hidden relative group",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                isFullyAddedToDashboard ? "opacity-60 bg-muted/40 cursor-not-allowed border-dashed" : "hover:border-primary/70 hover:shadow-sm",
                isSelected && !isFullyAddedToDashboard ? "bg-primary/10 border-primary ring-1 ring-primary" : "bg-card border-border"
            )}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={isFullyAddedToDashboard ? -1 : 0}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleToggle(); }}}
            whileHover={!isFullyAddedToDashboard ? { scale: 1.03, y: -1, transition: { duration: 0.1 } } : {}}
        >
            <div className="flex-grow overflow-hidden w-full flex flex-col justify-center items-center"> {/* Centering content better */}
                <p className="font-medium leading-tight text-[11px] break-words max-h-[3._em] overflow-hidden" title={displayName}>{displayName}</p> {/* Allow up to ~3 lines for name */}
                <p className="text-muted-foreground text-[9px] uppercase truncate w-full" title={category}>{category}</p>
            </div>
            
            {isGroup && badgeText && (
                <Badge
                    variant={isFullyAddedToDashboard ? "outline" : (isSelected ? "default" : "secondary")}
                    className={clsx(
                        "absolute top-1 right-1 text-[9px] px-1 py-0 h-4 font-medium",
                        isFullyAddedToDashboard && "border-dashed",
                        isSelected && !isFullyAddedToDashboard && "bg-primary text-primary-foreground"
                    )}
                >
                    {badgeText}
                </Badge>
            )}
             
             {!isFullyAddedToDashboard && (
                 <div className={clsx(
                     "absolute bottom-1 right-1 h-4 w-4 rounded-full border bg-background flex items-center justify-center transition-opacity duration-150",
                     isSelected ? "opacity-100 border-primary" : "opacity-0 group-hover:opacity-60 border-border"
                 )}>
                     {isSelected && <CheckCheck className="h-2.5 w-2.5 text-primary" />}
                 </div>
             )}
        </motion.div>
    );

    // Wrap with TooltipProvider if there's tooltipText. This allows badge inside to have its own if needed.
    // Main card tooltip is usually for disabled state or high-level info.
    if (tooltipText) {
      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-xs"><p>{tooltipText}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return cardContent;
});
SingleItemCard.displayName = 'SingleItemCard';

// Renamed from ListActions, using more descriptive tooltips
const BulkSelectionActions: React.FC<{
    onSelectAll: () => void;
    onDeselectAll: () => void;
    canSelectAll: boolean;
    canDeselectAll: boolean;
    selectionCount: number;
}> = ({ onSelectAll, onDeselectAll, canSelectAll, canDeselectAll, selectionCount }) => (
    <div className="flex-shrink-0 flex items-center gap-1 py-1 border-b mb-1 text-xs">
        <span className="mr-auto text-[11px] text-muted-foreground px-1">
            {selectionCount > 0 ? `${selectionCount} new items will be added` : "Select items from the grid"}
        </span>
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onSelectAll} disabled={!canSelectAll}>
                        <CheckCheck className="mr-1 h-3 w-3" />All
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{canSelectAll ? "Select all visible & available items." : "All visible items already selected or no items to select."}</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onDeselectAll} disabled={!canDeselectAll}>
                        <X className="mr-1 h-3 w-3" />None
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{canDeselectAll ? "Deselect all visible selected items." : "No items are currently selected."}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
);
BulkSelectionActions.displayName = 'BulkSelectionActions';


const EmptyStateMessage: React.FC<{ searchTerm: string }> = ({ searchTerm }) => (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 space-y-2.5"> {/* Takes full space of its parent */}
        <Info className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-base font-medium">{searchTerm ? "No items found" : "No available items"}</p>
        <p className="text-xs text-muted-foreground/80 max-w-sm">
            {searchTerm 
                ? `Your search for "${searchTerm}" did not match any available items. Try a different term or clear the search.`
                : `All items might already be on your dashboard, or there are no items to configure. If you used search, try clearing it.`}
        </p>
    </div>
);
EmptyStateMessage.displayName = 'EmptyStateMessage';


export default DashboardItemConfigurator;