// src/components/dashboard/DashboardItemConfigurator.tsx
import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataPoint } from '@/config/dataPoints';
import { X, Search, RotateCcw, PackagePlus, Info, CheckCheck, PlusCircle, ListFilter, Edit3 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { VariableSizeGrid, GridChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// --- Types ---
export interface ConfiguratorThreePhaseGroup {
    name: string;
    representativeName: string;
    ids: string[];
    category: string;
}

type DataItem =
    | { itemType: 'groupItem'; data: ConfiguratorThreePhaseGroup }
    | { itemType: 'individualItem'; data: DataPoint };

// Grid configuration
const ROW_HEIGHTS = { GRID_ITEM: 80 }; // Slightly taller for enhanced card
const MIN_COLUMN_WIDTH = 170; // Adjusted min width
const DEFAULT_COLUMN_COUNT = 3; // Adjusted default based on sidebar

// --- New DataPoint Form Data ---
export interface NewDataPointFormData {
    name: string;
    category: string;
    unit?: string;
    description?: string;
}

// --- Component Props ---
interface DashboardItemConfiguratorProps {
    isOpen: boolean;
    onClose: () => void;
    availableIndividualPoints: DataPoint[];
    availableThreePhaseGroups: ConfiguratorThreePhaseGroup[];
    currentDisplayedIds: string[];
    onAddMultipleDataPoints: (selectedIds: string[]) => void;
    // New prop for saving a new data point.
    // It should handle persistence and update the availableIndividualPoints list.
    // Returns a promise, can indicate success/failure or return the newly created point.
    onSaveNewDataPoint: (data: NewDataPointFormData) => Promise<{ success: boolean; error?: string; newPoint?: DataPoint }>;
}

// --- Main Component ---
const DashboardItemConfigurator: React.FC<DashboardItemConfiguratorProps> = ({
    isOpen, onClose, availableIndividualPoints, availableThreePhaseGroups,
    currentDisplayedIds, onAddMultipleDataPoints, onSaveNewDataPoint,
}) => {
    // --- State ---
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedIndividualIds, setSelectedIndividualIds] = useState<Set<string>>(new Set());
    const [selectedGroupNames, setSelectedGroupNames] = useState<Set<string>>(new Set());
    const [columnCount, setColumnCount] = useState(DEFAULT_COLUMN_COUNT);
    const [isAddNewModalOpen, setIsAddNewModalOpen] = useState(false);
    const [isSavingNewPoint, setIsSavingNewPoint] = useState(false);

    const gridRef = useRef<VariableSizeGrid>(null);

    // --- Effects ---
    useEffect(() => {
        if (isOpen) {
            setSelectedIndividualIds(new Set());
            setSelectedGroupNames(new Set());
            setSearchTerm('');
            setSelectedCategory(null);
            gridRef.current?.scrollTo({ scrollTop: 0, scrollLeft: 0 });
        }
    }, [isOpen]);

    // --- Memoized Derived Data ---
    const allCategories = useMemo(() => {
        const categories = new Set<string>();
        availableIndividualPoints.forEach(p => categories.add(p.category));
        availableThreePhaseGroups.forEach(g => categories.add(g.category));
        return Array.from(categories).sort();
    }, [availableIndividualPoints, availableThreePhaseGroups]);

    const filteredDataItems = useMemo((): DataItem[] => {
        const lowerSearchTerm = searchTerm.toLowerCase();

        const individualFilter = (dp: DataPoint) => {
            if (currentDisplayedIds.includes(dp.id)) return false;
            if (selectedCategory && dp.category !== selectedCategory) return false;
            if (!searchTerm) return true;
            return dp.name.toLowerCase().includes(lowerSearchTerm) ||
                   dp.category.toLowerCase().includes(lowerSearchTerm) ||
                   dp.id.toLowerCase().includes(lowerSearchTerm);
        };

        const groupFilter = (g: ConfiguratorThreePhaseGroup) => {
            if (g.ids.every(id => currentDisplayedIds.includes(id))) return false; // Already fully added
            if (selectedCategory && g.category !== selectedCategory) return false;
            if (!searchTerm) return true;
            return g.representativeName.toLowerCase().includes(lowerSearchTerm) ||
                   g.category.toLowerCase().includes(lowerSearchTerm) ||
                   g.name.toLowerCase().includes(lowerSearchTerm);
        };

        const individuals: DataItem[] = availableIndividualPoints
            .filter(individualFilter)
            .map(dp => ({ itemType: 'individualItem', data: dp }));

        const groups: DataItem[] = availableThreePhaseGroups
            .filter(groupFilter)
            .map(g => ({ itemType: 'groupItem', data: g }));

        return [...groups, ...individuals]; // Groups first or sort as preferred
    }, [availableIndividualPoints, availableThreePhaseGroups, currentDisplayedIds, searchTerm, selectedCategory]);

    const itemCountsPerCategory = useMemo(() => {
        const counts: Record<string, number> = {};
        allCategories.forEach(cat => { counts[cat] = 0; });

        const countItem = (itemCategory: string) => {
             if (counts[itemCategory] !== undefined) {
                counts[itemCategory]++;
            }
        };
        availableIndividualPoints.forEach(p => {
            if(!currentDisplayedIds.includes(p.id)) countItem(p.category)
        });
        availableThreePhaseGroups.forEach(g => {
            if(!g.ids.every(id => currentDisplayedIds.includes(id))) countItem(g.category);
        });
        return counts;
    }, [availableIndividualPoints, availableThreePhaseGroups, allCategories, currentDisplayedIds]);
    
    useEffect(() => {
        gridRef.current?.resetAfterIndices?.({ columnIndex: 0, rowIndex: 0, shouldForceUpdate: true });
        gridRef.current?.scrollTo?.({ scrollTop: 0, scrollLeft: 0 });
    }, [searchTerm, selectedCategory, columnCount, filteredDataItems]);

    const gridRowCount = useMemo(() => Math.ceil(filteredDataItems.length / columnCount), [filteredDataItems, columnCount]);

    // --- Callbacks ---
    const getRowHeight = useCallback(() => ROW_HEIGHTS.GRID_ITEM, []);
    const getColumnWidth = useCallback((totalWidth: number) => Math.max(MIN_COLUMN_WIDTH, totalWidth / columnCount), [columnCount]);

    const handleToggleIndividual = useCallback((id: string) => {
        setSelectedIndividualIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }, []);
    const handleToggleGroup = useCallback((name: string) => {
        setSelectedGroupNames(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
    }, []);

    const getEffectiveIdsFromSelectedGroups = useCallback((): string[] => {
        let ids: string[] = [];
        selectedGroupNames.forEach(name => {
            const group = availableThreePhaseGroups.find(g => g.name === name);
            if (group) ids.push(...group.ids.filter(id => !currentDisplayedIds.includes(id)));
        });
        return ids;
    }, [selectedGroupNames, availableThreePhaseGroups, currentDisplayedIds]);

    const effectiveDataPointsToAdd = useMemo(() => Array.from(new Set([...Array.from(selectedIndividualIds), ...getEffectiveIdsFromSelectedGroups()])), [selectedIndividualIds, getEffectiveIdsFromSelectedGroups]);
    const totalSelectionsCount = selectedIndividualIds.size + selectedGroupNames.size;

    const handleAddSelected = () => { if (effectiveDataPointsToAdd.length > 0) { onAddMultipleDataPoints(effectiveDataPointsToAdd); onClose(); } };
    const handleClearAllSelections = () => { setSelectedIndividualIds(new Set()); setSelectedGroupNames(new Set()); };

    const getGroupItemCounts = useCallback((g: ConfiguratorThreePhaseGroup) => ({
        totalInGroup: g.ids.length, displayableNow: g.ids.filter(id => !currentDisplayedIds.includes(id)).length
    }), [currentDisplayedIds]);
    
    const handleSaveNewPoint = async (data: NewDataPointFormData) => {
        setIsSavingNewPoint(true);
        try {
            const result = await onSaveNewDataPoint(data);
            if (result.success) {
                // Optionally, if the new item fits current filters, select it.
                if (result.newPoint) {
                     const newPointId = result.newPoint.id;
                     // Check if new item is visible with current filters
                     const categoryMatch = !selectedCategory || result.newPoint.category === selectedCategory;
                     const searchMatch = !searchTerm || 
                                        result.newPoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        result.newPoint.category.toLowerCase().includes(searchTerm.toLowerCase());

                     if (categoryMatch && searchMatch && !currentDisplayedIds.includes(newPointId)) {
                        handleToggleIndividual(newPointId);
                     }
                }
                setIsAddNewModalOpen(false); 
            } else {
                alert(`Error saving: ${result.error || 'Unknown error'}`); // Replace with better error UI
            }
        } catch (error) {
            console.error("Failed to save new data point:", error);
            alert("An unexpected error occurred while saving."); // Replace with better error UI
        } finally {
            setIsSavingNewPoint(false);
        }
    };

    const itemDataForGrid = useMemo(() => ({
        items: filteredDataItems, columnCount, selectedIndividualIds, selectedGroupNames, currentDisplayedIds,
        handleToggleIndividual, handleToggleGroup, getGroupItemCounts,
    }), [filteredDataItems, columnCount, selectedIndividualIds, selectedGroupNames, currentDisplayedIds, handleToggleIndividual, handleToggleGroup, getGroupItemCounts]);

    // Conditional Rendering Flags
    const canSelectAnyVisible = useMemo(() => filteredDataItems.some(item => {
        if (item.itemType === 'individualItem') return !selectedIndividualIds.has(item.data.id);
        if (item.itemType === 'groupItem') return !selectedGroupNames.has(item.data.name) && !item.data.ids.every(id => currentDisplayedIds.includes(id));
        return false;
    }), [filteredDataItems, selectedIndividualIds, selectedGroupNames, currentDisplayedIds]);
    const canDeselectAnyVisible = useMemo(() => filteredDataItems.some(item => {
        if (item.itemType === 'individualItem') return selectedIndividualIds.has(item.data.id);
        if (item.itemType === 'groupItem') return selectedGroupNames.has(item.data.name);
        return false;
    }), [filteredDataItems, selectedIndividualIds, selectedGroupNames]);

    const handleSelectAllVisible = () => {
        const newIndIds = new Set(selectedIndividualIds);
        const newGrpNames = new Set(selectedGroupNames);
        filteredDataItems.forEach(item => {
            if (item.itemType === 'individualItem' && !currentDisplayedIds.includes(item.data.id)) newIndIds.add(item.data.id);
            else if (item.itemType === 'groupItem' && !item.data.ids.every(id => currentDisplayedIds.includes(id))) newGrpNames.add(item.data.name);
        });
        setSelectedIndividualIds(newIndIds); setSelectedGroupNames(newGrpNames);
    };
    const handleDeselectAllVisible = () => {
        const visIndIds = new Set(filteredDataItems.filter(i => i.itemType === 'individualItem').map(i => (i.data as DataPoint).id));
        const visGrpNames = new Set(filteredDataItems.filter(i => i.itemType === 'groupItem').map(i => (i.data as ConfiguratorThreePhaseGroup).name));
        setSelectedIndividualIds(prev => new Set(Array.from(prev).filter(id => !visIndIds.has(id))));
        setSelectedGroupNames(prev => new Set(Array.from(prev).filter(name => !visGrpNames.has(name))));
    };


    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
                <DialogContent className="max-w-6xl 2xl:max-w-8xl h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b flex-shrink-0">
                        <DialogTitle className="text-2xl font-semibold">Add Dashboard Items</DialogTitle>
                        <DialogDescription className="text-sm">
                            Browse, search, and select items to add to your dashboard.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-1 min-h-0"> {/* Main layout: Sidebar + Content */}
                        {/* Category Sidebar */}
                        <CategorySidebar
                            categories={allCategories}
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                            itemCounts={itemCountsPerCategory}
                            onAddNew={() => setIsAddNewModalOpen(true)}
                        />

                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col min-h-0 border-l">
                            {/* Search and Actions Bar */}
                            <div className="px-4 py-3 flex-shrink-0 flex items-center justify-between gap-3 border-b">
                                <div className="relative flex-grow max-w-lg">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input type="search" placeholder="Search name, category, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-8 h-9 text-sm rounded-md" />
                                    {searchTerm && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchTerm('')}><X className="h-3.5 w-3.5" /></Button>}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setIsAddNewModalOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Data Point
                                </Button>
                            </div>

                            {/* Item Grid Section */}
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2">
                                {filteredDataItems.length > 0 && (
                                    <BulkSelectionActions
                                        onSelectAll={handleSelectAllVisible}
                                        onDeselectAll={handleDeselectAllVisible}
                                        canSelectAll={canSelectAnyVisible}
                                        canDeselectAll={canDeselectAnyVisible}
                                        selectionCount={effectiveDataPointsToAdd.length}
                                    />
                                )}
                                <div className="flex-1 relative min-h-[100px]"> {/* AutoSizer requires positive dimensions */}
                                    {gridRowCount === 0 ? (
                                        <EmptyStateMessage searchTerm={searchTerm} selectedCategory={selectedCategory} />
                                    ) : (
                                        <AutoSizer>
                                            {({ height, width }) => {
                                                if (width > 0 && height > 0) {
                                                    const newColCount = Math.max(1, Math.floor(width / MIN_COLUMN_WIDTH));
                                                    if (newColCount !== columnCount) {
                                                        Promise.resolve().then(() => setColumnCount(newColCount));
                                                    }
                                                }
                                                if (height < 50 || width < 50) {
                                                    return <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-1">Adjusting layout...</div>;
                                                }
                                                return (
                                                    <VariableSizeGrid
                                                        key={`grid-${columnCount}-${selectedCategory}`}
                                                        ref={gridRef}
                                                        height={height}
                                                        width={width}
                                                        rowCount={gridRowCount}
                                                        columnCount={columnCount}
                                                        rowHeight={getRowHeight}
                                                        columnWidth={() => getColumnWidth(width)}
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
                        </div>
                    </div>

                    {/* Footer */}
                    <DialogFooter className="p-3 flex-shrink-0 bg-muted/30 border-t gap-2 items-center">
                        <div className="text-xs text-muted-foreground mr-auto">
                            {totalSelectionsCount > 0 ? `${totalSelectionsCount} selected` : 'No items selected'}
                            {effectiveDataPointsToAdd.length > 0 && ` (${effectiveDataPointsToAdd.length} new to add)`}
                        </div>
                        <Button type="button" variant="ghost" onClick={handleClearAllSelections} disabled={totalSelectionsCount === 0} size="sm"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Clear</Button>
                        <DialogClose asChild><Button type="button" variant="outline" size="sm">Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleAddSelected} disabled={effectiveDataPointsToAdd.length === 0} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            <PackagePlus className="mr-1.5 h-4 w-4" />Add ({effectiveDataPointsToAdd.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AddNewDataPointModal
                isOpen={isAddNewModalOpen}
                onClose={() => setIsAddNewModalOpen(false)}
                onSave={handleSaveNewPoint}
                existingCategories={allCategories}
                isSaving={isSavingNewPoint}
            />
        </>
    );
};

// --- Category Sidebar Component ---
interface CategorySidebarProps {
    categories: string[];
    selectedCategory: string | null;
    onSelectCategory: (category: string | null) => void;
    itemCounts: Record<string, number>;
    onAddNew: () => void; // For the "Add New" button in sidebar if needed, or keep it main panel only
}
const CategorySidebar: React.FC<CategorySidebarProps> = ({ categories, selectedCategory, onSelectCategory, itemCounts }) => {
    const totalAvailableItems = useMemo(() => Object.values(itemCounts).reduce((sum, count) => sum + count, 0), [itemCounts]);

    return (
        <div className="w-56 flex-shrink-0 bg-muted/20 p-3 flex flex-col space-y-1 overflow-y-auto custom-scrollbar">
            <p className="text-xs font-semibold text-muted-foreground px-2 mb-1 uppercase">Categories</p>
            <Button
                variant={selectedCategory === null ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => onSelectCategory(null)}
            >
                <ListFilter className="mr-2 h-4 w-4" />
                All Items
                <Badge variant="outline" className="ml-auto">{totalAvailableItems}</Badge>
            </Button>
            {categories.map(category => (
                <Button
                    key={category}
                    variant={selectedCategory === category ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-sm truncate"
                    onClick={() => onSelectCategory(category)}
                    title={category}
                >
                   <span className="truncate flex-1">{category}</span>
                   <Badge variant="outline" className="ml-2">{itemCounts[category] || 0}</Badge>
                </Button>
            ))}
             {/* Optional: Add New button here as well or instead of main panel */}
            {/* <Button variant="outline" size="sm" className="w-full mt-auto" onClick={onAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Data Point
            </Button> */}
        </div>
    );
};

// --- GridViewCell (Renders EnhancedSingleItemCard) ---
const GridViewCell = memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {
    const { items, columnCount, ...restOfData } = data;
    const itemIndex = rowIndex * columnCount + columnIndex;
    const item = items[itemIndex] as DataItem | undefined;

    if (!item) return <div style={style} />;

    return (
        <motion.div 
            style={style} 
            className="flex items-center justify-center p-1.5" // Padding around each card
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: (rowIndex * columnCount + columnIndex) * 0.02 }} // Stagger effect
        >
            <EnhancedSingleItemCard item={item} {...restOfData} />
        </motion.div>
    );
});
GridViewCell.displayName = 'GridViewCell';


// --- Enhanced Single Item Card ---
interface EnhancedSingleItemCardProps {
    item: DataItem;
    selectedIndividualIds: Set<string>;
    selectedGroupNames: Set<string>;
    currentDisplayedIds: string[];
    handleToggleIndividual: (id: string) => void;
    handleToggleGroup: (name: string) => void;
    getGroupItemCounts: (group: ConfiguratorThreePhaseGroup) => { totalInGroup: number, displayableNow: number };
}
const EnhancedSingleItemCard: React.FC<EnhancedSingleItemCardProps> = memo(({
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
    let badgeContent: string | React.ReactNode = null;
    let tooltipText: string = '';

    if (isGroup) {
        const groupData = dataPayload as ConfiguratorThreePhaseGroup;
        const { displayableNow, totalInGroup } = getGroupItemCounts(groupData);
        isFullyAddedToDashboard = displayableNow === 0 && groupData.ids.every(id => currentDisplayedIds.includes(id));
        isSelected = selectedGroupNames.has(groupData.name) && !isFullyAddedToDashboard;

        tooltipText = `${groupData.representativeName} (Group) - ${groupData.category}. `;
        if (isFullyAddedToDashboard) {
            badgeContent = "All Added";
            tooltipText += `All ${totalInGroup} items in this group are on the dashboard.`;
        } else if (displayableNow < totalInGroup && displayableNow > 0) {
            badgeContent = `+${displayableNow} of ${totalInGroup}`;
            tooltipText += `Adds ${displayableNow} new items. ${totalInGroup - displayableNow} item(s) already on dashboard.`;
        } else if (displayableNow === totalInGroup) {
            badgeContent = `${totalInGroup} Items`;
            tooltipText += `Adds all ${totalInGroup} items from this group.`;
        } else { // displayableNow === 0, and not fully added. Potentially a configuration mismatch.
            badgeContent = "No new items";
            tooltipText += "No new items available to add from this group.";
        }
    } else { // Individual Item
        const dpData = dataPayload as DataPoint;
        isFullyAddedToDashboard = currentDisplayedIds.includes(dpData.id);
        isSelected = selectedIndividualIds.has(dpData.id) && !isFullyAddedToDashboard;
        tooltipText = `${dpData.name} (Item) - ${dpData.category}.`;
        if (isFullyAddedToDashboard) tooltipText += " This item is already on the dashboard.";
        else tooltipText += " Click to select/deselect this item."
    }

    const handleToggle = () => {
        if (isFullyAddedToDashboard) return;
        if (isGroup) handleToggleGroup(idOrName);
        else handleToggleIndividual(idOrName);
    };
    
    const cardVariants = {
        initial: { scale: 1, y: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
        hover: { 
            scale: 1.03, 
            y: -2, 
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            transition: { type: "spring", stiffness: 400, damping: 15, duration: 0.15 }
        },
    };

    const cardContent = (
        <motion.div
            variants={!isFullyAddedToDashboard ? cardVariants : { initial: cardVariants.initial }} // Disable hover animation if disabled
            initial="initial"
            whileHover="hover"
            onClick={handleToggle}
            className={clsx(
                "w-full h-full flex flex-col items-start justify-between p-2.5 text-left space-y-1.5",
                "border rounded-lg shadow-sm transition-colors duration-150 cursor-pointer overflow-hidden relative group",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                isFullyAddedToDashboard ? "opacity-60 bg-muted/50 border-dashed cursor-not-allowed" : "hover:border-primary/80",
                isSelected && !isFullyAddedToDashboard ? "bg-primary/10 border-primary ring-2 ring-primary" : "bg-card border-input"
            )}
            role="checkbox"
            aria-checked={isSelected}
            aria-disabled={isFullyAddedToDashboard}
            tabIndex={isFullyAddedToDashboard ? -1 : 0}
            onKeyDown={(e) => { if (!isFullyAddedToDashboard && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); handleToggle(); }}}
        >
            {/* Card Top: Name and Category */}
            <div className="w-full">
                <h4 className="font-semibold text-sm leading-tight line-clamp-2" title={displayName}>{displayName}</h4>
                <p className="text-muted-foreground text-xs line-clamp-1" title={category}>{category}</p>
            </div>

            {/* Card Bottom: Badge and Selection Check */}
            <div className="w-full flex items-center justify-between mt-auto pt-1">
                {badgeContent && (
                     <Badge
                        variant={isFullyAddedToDashboard ? "outline" : (isSelected ? "default" : "secondary")}
                        className={clsx("text-[10px] px-1.5 py-0.5", isFullyAddedToDashboard && "border-dashed")}
                    >
                        {badgeContent}
                    </Badge>
                )}
                {!isFullyAddedToDashboard && (
                    <div className={clsx(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ml-auto",
                        isSelected ? "bg-primary border-primary" : "bg-background border-muted-foreground/50 group-hover:border-primary/70",
                    )}>
                        {isSelected && <CheckCheck className="h-3 w-3 text-primary-foreground" />}
                    </div>
                )}
                {isFullyAddedToDashboard && (
                     <CheckCheck className="h-4 w-4 text-green-600 ml-auto" />
                )}
            </div>
        </motion.div>
    );

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="text-xs max-w-xs"><p>{tooltipText}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});
EnhancedSingleItemCard.displayName = 'EnhancedSingleItemCard';


// --- Bulk Selection Actions --- (styling can be updated)
const BulkSelectionActions: React.FC<{
    onSelectAll: () => void; onDeselectAll: () => void; canSelectAll: boolean; canDeselectAll: boolean; selectionCount: number;
}> = ({ onSelectAll, onDeselectAll, canSelectAll, canDeselectAll, selectionCount }) => (
    <div className="flex-shrink-0 flex items-center gap-1 py-1.5 border-b mb-2 text-xs mx-1">
        <span className="mr-auto text-xs text-muted-foreground px-1">
            {selectionCount > 0 ? `${selectionCount} new items marked for addition` : "Select items below"}
        </span>
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onSelectAll} disabled={!canSelectAll}>
                        <CheckCheck className="mr-1 h-3.5 w-3.5" />All Visible
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{canSelectAll ? "Select all visible & available items" : "All visible items already selected or none to select"}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onDeselectAll} disabled={!canDeselectAll}>
                        <X className="mr-1 h-3.5 w-3.5" />None Visible
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{canDeselectAll ? "Deselect all visible selected items" : "No visible items are selected"}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
);
BulkSelectionActions.displayName = 'BulkSelectionActions';


// --- Empty State Message ---
const EmptyStateMessage: React.FC<{ searchTerm: string, selectedCategory: string | null }> = ({ searchTerm, selectedCategory }) => {
    let title = "No Available Items";
    let message = "All items might already be on your dashboard, or there are no items matching the current filters.";
    if (searchTerm && selectedCategory) {
        title = "No items found";
        message = `Your search for "${searchTerm}" in category "${selectedCategory}" did not match any available items. Try adjusting your filters.`;
    } else if (searchTerm) {
        title = "No items found";
        message = `Your search for "${searchTerm}" did not match any available items. Try a different term or clear the search.`;
    } else if (selectedCategory) {
        title = "No items in category";
        message = `There are no available items in the "${selectedCategory}" category. Try a different category or 'All Items'.`;
    }

    return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
        <Info className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
    </div>
)};
EmptyStateMessage.displayName = 'EmptyStateMessage';

// --- Add New Data Point Modal ---
interface AddNewDataPointModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewDataPointFormData) => Promise<void>;
    existingCategories: string[];
    isSaving: boolean;
}

const AddNewDataPointModal: React.FC<AddNewDataPointModalProps> = ({ isOpen, onClose, onSave, existingCategories, isSaving }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [unit, setUnit] = useState('');
    const [description, setDescription] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => { // Reset form when opened
        if (isOpen) {
            setName(''); setCategory(''); setUnit(''); setDescription(''); setFormError(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !category.trim()) {
            setFormError("Name and Category are required.");
            return;
        }
        setFormError(null);
        await onSave({ name: name.trim(), category: category.trim(), unit: unit.trim(), description: description.trim() });
        // onClose(); // Parent should close on successful save if desired
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
            <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => isSaving && e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="text-xl">Add New Data Point</DialogTitle>
                    <DialogDescription>Enter the details for the new data point. It will become available for selection.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div>
                        <label htmlFor="dp-name" className="block text-sm font-medium text-muted-foreground mb-1">Name <span className="text-destructive">*</span></label>
                        <Input id="dp-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Main Power Consumption" disabled={isSaving} />
                    </div>
                    <div>
                        <label htmlFor="dp-category" className="block text-sm font-medium text-muted-foreground mb-1">Category <span className="text-destructive">*</span></label>
                        <Input id="dp-category" list="dp-categories" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Power, Temperature" disabled={isSaving}/>
                        <datalist id="dp-categories">
                            {existingCategories.map(cat => <option key={cat} value={cat} />)}
                        </datalist>
                    </div>
                     <div>
                        <label htmlFor="dp-unit" className="block text-sm font-medium text-muted-foreground mb-1">Unit (Optional)</label>
                        <Input id="dp-unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g., kWh, °C" disabled={isSaving} />
                    </div>
                    <div>
                        <label htmlFor="dp-description" className="block text-sm font-medium text-muted-foreground mb-1">Description (Optional)</label>
                        <textarea id="dp-description" value={description} onChange={e => setDescription(e.target.value)} rows={3}
                                  className="w-full p-2 border rounded-md text-sm focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" 
                                  placeholder="Additional details about this data point..." disabled={isSaving}/>
                    </div>
                    {formError && <p className="text-sm text-destructive">{formError}</p>}

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                        <Button type="submit" disabled={isSaving || !name.trim() || !category.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            {isSaving ? "Saving..." : "Save Data Point"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
AddNewDataPointModal.displayName = "AddNewDataPointModal";


export default DashboardItemConfigurator;