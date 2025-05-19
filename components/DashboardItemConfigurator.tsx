// src/components/dashboard/DashboardItemConfigurator.tsx
import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DataPoint, IconComponentType } from '@/config/dataPoints'; // Assuming IconComponentType is exported
import { X, Search, RotateCcw, PackagePlus, Info, CheckCheck, PlusCircle, ListFilter, HelpCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { VariableSizeGrid, GridChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { toast } from 'sonner';


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
const ROW_HEIGHTS = { GRID_ITEM: 80 };
const MIN_COLUMN_WIDTH = 170;
const DEFAULT_COLUMN_COUNT = 3;

// --- New DataPoint Form Data ---
export interface NewDataPointFormShape {
    label: string;
    name: string;
    nodeId: string;
    dataType: DataPoint['dataType'];
    uiType: DataPoint['uiType'];
    icon: string; 
    category: DataPoint['category'] | (string & {}); 
    unit?: string;
    min?: string; 
    max?: string;
    description?: string;
    factor?: string;
    phase?: DataPoint['phase'];
    isSinglePhase?: boolean;
    threePhaseGroup?: string;
    notes?: string;
}

// --- Component Props ---
interface DashboardItemConfiguratorProps {
    isOpen: boolean;
    onClose: () => void;
    availableIndividualPoints: DataPoint[];
    availableThreePhaseGroups: ConfiguratorThreePhaseGroup[];
    currentDisplayedIds: string[];
    onAddMultipleDataPoints: (selectedIds: string[]) => void;
    onSaveNewDataPoint: (data: NewDataPointFormShape) => Promise<{ success: boolean; error?: string; newPoint?: DataPoint }>;
    allDefinedCategories: DataPoint['category'][]; 
    allDefinedDataTypes: DataPoint['dataType'][];
    allDefinedUiTypes: DataPoint['uiType'][];
    allDefinedPhases: (DataPoint['phase'] | undefined)[];
}

// --- Main Component ---
const DashboardItemConfigurator: React.FC<DashboardItemConfiguratorProps> = ({
    isOpen, onClose, availableIndividualPoints, availableThreePhaseGroups,
    currentDisplayedIds, onAddMultipleDataPoints, onSaveNewDataPoint,
    allDefinedCategories, allDefinedDataTypes, allDefinedUiTypes, allDefinedPhases,
}) => {
    // --- State ---
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null); 
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
            setSelectedCategoryFilter(null);
            gridRef.current?.scrollTo({ scrollTop: 0, scrollLeft: 0 });
        }
    }, [isOpen]);

    const uniqueCategoriesForSidebar = useMemo(() => {
        const categories = new Set<string>();
        availableIndividualPoints.forEach(p => categories.add(p.category));
        availableThreePhaseGroups.forEach(g => categories.add(g.category));
        allDefinedCategories.forEach(cat => categories.add(cat));
        return Array.from(categories).sort();
    }, [availableIndividualPoints, availableThreePhaseGroups, allDefinedCategories]);

    const filteredDataItems = useMemo((): DataItem[] => {
        const lowerSearchTerm = searchTerm.toLowerCase();

        const individualFilter = (dp: DataPoint) => {
            if (currentDisplayedIds.includes(dp.id)) return false;
            if (selectedCategoryFilter && dp.category !== selectedCategoryFilter) return false;
            if (!searchTerm) return true;
            return dp.name.toLowerCase().includes(lowerSearchTerm) ||
                   dp.category.toLowerCase().includes(lowerSearchTerm) ||
                   dp.id.toLowerCase().includes(lowerSearchTerm);
        };

        const groupFilter = (g: ConfiguratorThreePhaseGroup) => {
            if (g.ids.every(id => currentDisplayedIds.includes(id))) return false; 
            if (selectedCategoryFilter && g.category !== selectedCategoryFilter) return false;
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

        return [...groups, ...individuals]; 
    }, [availableIndividualPoints, availableThreePhaseGroups, currentDisplayedIds, searchTerm, selectedCategoryFilter]);

    const itemCountsPerCategory = useMemo(() => {
        const counts: Record<string, number> = {};
        uniqueCategoriesForSidebar.forEach(cat => { counts[cat] = 0; });

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
    }, [availableIndividualPoints, availableThreePhaseGroups, uniqueCategoriesForSidebar, currentDisplayedIds]);
    
    useEffect(() => {
        gridRef.current?.resetAfterIndices?.({ columnIndex: 0, rowIndex: 0, shouldForceUpdate: true });
        gridRef.current?.scrollTo?.({ scrollTop: 0, scrollLeft: 0 });
    }, [searchTerm, selectedCategoryFilter, columnCount, filteredDataItems]);

    const gridRowCount = useMemo(() => Math.ceil(filteredDataItems.length / columnCount), [filteredDataItems, columnCount]);

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
    
    const handleSaveNewPointInternal = async (formData: NewDataPointFormShape) => {
        setIsSavingNewPoint(true);
        try {
            const result = await onSaveNewDataPoint(formData);
            if (result.success) {
                if (result.newPoint) {
                     const newPointId = result.newPoint.id;
                     const categoryMatch = !selectedCategoryFilter || result.newPoint.category === selectedCategoryFilter;
                     const searchMatch = !searchTerm || 
                                        result.newPoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (result.newPoint.category && result.newPoint.category.toLowerCase().includes(searchTerm.toLowerCase()));

                     if (categoryMatch && searchMatch && !currentDisplayedIds.includes(newPointId)) {
                        handleToggleIndividual(newPointId); 
                     }
                }
                setIsAddNewModalOpen(false); 
                toast.success("Data Point Saved", { description: `${result.newPoint?.name || 'New item'} added successfully.`});
            } else {
                 toast.error("Save Failed", { description: result.error || 'Could not save the data point.'});
            }
        } catch (error) {
            console.error("Error during onSaveNewDataPoint callback:", error);
            toast.error("Save Error", { description: "An unexpected error occurred while saving." });
        } finally {
            setIsSavingNewPoint(false);
        }
    };

    const itemDataForGrid = useMemo(() => ({
        items: filteredDataItems, columnCount, selectedIndividualIds, selectedGroupNames, currentDisplayedIds,
        handleToggleIndividual, handleToggleGroup, getGroupItemCounts,
    }), [filteredDataItems, columnCount, selectedIndividualIds, selectedGroupNames, currentDisplayedIds, handleToggleIndividual, handleToggleGroup, getGroupItemCounts]);

    const canSelectAnyVisible = useMemo(() => filteredDataItems.some(item => {
        if (item.itemType === 'individualItem') return !selectedIndividualIds.has(item.data.id) && !currentDisplayedIds.includes(item.data.id);
        if (item.itemType === 'groupItem') {
            const group = item.data as ConfiguratorThreePhaseGroup;
            const isFullyAdded = group.ids.every(id => currentDisplayedIds.includes(id));
            return !isFullyAdded && !selectedGroupNames.has(group.name);
        }
        return false;
    }), [filteredDataItems, selectedIndividualIds, selectedGroupNames, currentDisplayedIds]);

    const canDeselectAnyVisible = useMemo(() => filteredDataItems.some(item => {
        if (item.itemType === 'individualItem') return selectedIndividualIds.has(item.data.id);
        if (item.itemType === 'groupItem') return selectedGroupNames.has((item.data as ConfiguratorThreePhaseGroup).name);
        return false;
    }), [filteredDataItems, selectedIndividualIds, selectedGroupNames]);

    const handleSelectAllVisible = () => {
        const newIndIds = new Set(selectedIndividualIds);
        const newGrpNames = new Set(selectedGroupNames);
        filteredDataItems.forEach(item => {
            if (item.itemType === 'individualItem' && !currentDisplayedIds.includes(item.data.id)) {
                newIndIds.add(item.data.id);
            } else if (item.itemType === 'groupItem') {
                const group = item.data as ConfiguratorThreePhaseGroup;
                if (!group.ids.every(id => currentDisplayedIds.includes(id))) { // Not fully added
                    newGrpNames.add(group.name);
                }
            }
        });
        setSelectedIndividualIds(newIndIds); 
        setSelectedGroupNames(newGrpNames);
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
                <DialogContent className="max-w-5xl 2xl:max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden">
                     <DialogHeader className="p-4 border-b flex-shrink-0">
                        <DialogTitle className="text-2xl font-semibold">Add Dashboard Items</DialogTitle>
                        <DialogDescription className="text-sm">
                            Browse, search, and select items. You can also add new data point configurations.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-1 min-h-0">
                        <CategorySidebar
                            categories={uniqueCategoriesForSidebar}
                            selectedCategory={selectedCategoryFilter}
                            onSelectCategory={setSelectedCategoryFilter}
                            itemCounts={itemCountsPerCategory}
                            onAddNew={() => setIsAddNewModalOpen(true)}
                        />

                        <div className="flex-1 flex flex-col min-h-0 border-l">
                            <div className="px-4 py-3 flex-shrink-0 flex items-center justify-between gap-3 border-b">
                                <div className="relative flex-grow max-w-lg">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input type="search" placeholder="Search by name, category, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-8 h-9 text-sm rounded-md" />
                                    {searchTerm && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchTerm('')}><X className="h-3.5 w-3.5" /></Button>}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setIsAddNewModalOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Data Point
                                </Button>
                            </div>

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
                                <div className="flex-1 relative min-h-[100px]">
                                    {gridRowCount === 0 ? (
                                        <EmptyStateMessage searchTerm={searchTerm} selectedCategory={selectedCategoryFilter} />
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
                                                return ( <VariableSizeGrid key={`grid-${columnCount}-${selectedCategoryFilter}`} ref={gridRef} height={height} width={width} rowCount={gridRowCount} columnCount={columnCount} rowHeight={getRowHeight} columnWidth={() => getColumnWidth(width)} itemData={itemDataForGrid} className="custom-scrollbar">
                                                        {GridViewCell}
                                                    </VariableSizeGrid> );
                                            }}
                                        </AutoSizer>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
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
                onSave={handleSaveNewPointInternal} 
                isSaving={isSavingNewPoint}
                definedCategories={allDefinedCategories}
                definedDataTypes={allDefinedDataTypes}
                definedUiTypes={allDefinedUiTypes}
                definedPhases={allDefinedPhases.filter((p): p is DataPoint['phase'] => p !== undefined)}
            />
        </>
    );
};


interface CategorySidebarProps {
    categories: string[]; 
    selectedCategory: string | null;
    onSelectCategory: (category: string | null) => void;
    itemCounts: Record<string, number>;
    onAddNew: () => void;
}
const CategorySidebar: React.FC<CategorySidebarProps> = ({ categories, selectedCategory, onSelectCategory, itemCounts, onAddNew }) => {
    const totalAvailableItems = useMemo(() => Object.values(itemCounts).reduce((sum, count) => sum + (count || 0), 0), [itemCounts]);
    return ( <div className="w-56 flex-shrink-0 bg-muted/20 p-3 flex flex-col space-y-1 overflow-y-auto custom-scrollbar"> <p className="text-xs font-semibold text-muted-foreground px-2 mb-1 uppercase">Categories</p> <Button variant={selectedCategory === null ? "secondary" : "ghost"} size="sm" className="w-full justify-start text-sm" onClick={() => onSelectCategory(null)}> <ListFilter className="mr-2 h-4 w-4" /> All Items <Badge variant="outline" className="ml-auto">{totalAvailableItems}</Badge> </Button> {categories.map(category => ( <Button key={category} variant={selectedCategory === category ? "secondary" : "ghost"} size="sm" className="w-full justify-start text-sm truncate" onClick={() => onSelectCategory(category)} title={category}> <span className="truncate flex-1">{category}</span> <Badge variant="outline" className="ml-2">{itemCounts[category] || 0}</Badge> </Button> ))} <Button variant="ghost" size="sm" className="w-full justify-start text-sm mt-auto" onClick={onAddNew}> <PlusCircle className="mr-2 h-4 w-4" /> Add New Data Point </Button> </div> );
};
CategorySidebar.displayName = 'CategorySidebar';

const GridViewCell = memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => { 
    const { items, columnCount, ...restOfData } = data; 
    const itemIndex = rowIndex * columnCount + columnIndex; 
    const item = items[itemIndex] as DataItem | undefined; 
    if (!item) return <div style={style} />; 
    return ( <motion.div style={style} className="flex items-center justify-center p-1.5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: (rowIndex * columnCount + columnIndex) * 0.02 }} > <EnhancedSingleItemCard item={item} {...restOfData} /> </motion.div> ); 
});
GridViewCell.displayName = 'GridViewCell';

interface EnhancedSingleItemCardProps { item: DataItem; selectedIndividualIds: Set<string>; selectedGroupNames: Set<string>; currentDisplayedIds: string[]; handleToggleIndividual: (id: string) => void; handleToggleGroup: (name: string) => void; getGroupItemCounts: (group: ConfiguratorThreePhaseGroup) => { totalInGroup: number, displayableNow: number }; }
const EnhancedSingleItemCard: React.FC<EnhancedSingleItemCardProps> = memo(({item, selectedIndividualIds, selectedGroupNames, currentDisplayedIds, handleToggleIndividual, handleToggleGroup, getGroupItemCounts}) => { 
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
        } else if (displayableNow === totalInGroup && totalInGroup > 0) { 
            badgeContent = `${totalInGroup} Items`; 
            tooltipText += `Adds all ${totalInGroup} items from this group.`; 
        } else { 
            badgeContent = "No new items"; 
            tooltipText += "No new items available to add from this group."; 
        } 
    } else { 
        const dpData = dataPayload as DataPoint; 
        isFullyAddedToDashboard = currentDisplayedIds.includes(dpData.id); 
        isSelected = selectedIndividualIds.has(dpData.id) && !isFullyAddedToDashboard; 
        tooltipText = `${dpData.name} (Item) - ${dpData.category}.`; 
        if (isFullyAddedToDashboard) {
            tooltipText += " This item is already on the dashboard.";
        } else {
             tooltipText += " Click to select/deselect this item.";
        }
    } 
    const handleToggle = () => { 
        if (isFullyAddedToDashboard) return; 
        if (isGroup) handleToggleGroup(idOrName); 
        else handleToggleIndividual(idOrName); 
    }; 
    const cardVariants = { initial: { scale: 1, y: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }, hover: { scale: 1.03, y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", transition: { type: "spring", stiffness: 400, damping: 15, duration: 0.15 } }, }; 
    const cardContent = ( <motion.div variants={!isFullyAddedToDashboard ? cardVariants : { initial: cardVariants.initial }} initial="initial" whileHover="hover" onClick={handleToggle} className={clsx( "w-full h-full flex flex-col items-start justify-between p-2.5 text-left space-y-1.5", "border rounded-lg shadow-sm transition-colors duration-150 cursor-pointer overflow-hidden relative group", "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none", isFullyAddedToDashboard ? "opacity-60 bg-muted/50 border-dashed cursor-not-allowed" : "hover:border-primary/80", isSelected && !isFullyAddedToDashboard ? "bg-primary/10 border-primary ring-2 ring-primary" : "bg-card border-input" )} role="checkbox" aria-checked={isSelected} aria-disabled={isFullyAddedToDashboard} tabIndex={isFullyAddedToDashboard ? -1 : 0} onKeyDown={(e) => { if (!isFullyAddedToDashboard && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); handleToggle(); }}} > <div className="w-full"> <h4 className="font-semibold text-sm leading-tight line-clamp-2" title={displayName}>{displayName}</h4> <p className="text-muted-foreground text-xs line-clamp-1" title={category}>{category}</p> </div> <div className="w-full flex items-center justify-between mt-auto pt-1"> {badgeContent && ( <Badge variant={isFullyAddedToDashboard ? "outline" : (isSelected ? "default" : "secondary")} className={clsx("text-[10px] px-1.5 py-0.5", isFullyAddedToDashboard && "border-dashed")} > {badgeContent} </Badge> )} {!isFullyAddedToDashboard && ( <div className={clsx( "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ml-auto", isSelected ? "bg-primary border-primary" : "bg-background border-muted-foreground/50 group-hover:border-primary/70", )}> {isSelected && <CheckCheck className="h-3 w-3 text-primary-foreground" />} </div> )} {isFullyAddedToDashboard && ( <CheckCheck className="h-4 w-4 text-green-600 ml-auto" /> )} </div> </motion.div> ); 
    return ( <TooltipProvider delayDuration={300}> <Tooltip> <TooltipTrigger asChild>{cardContent}</TooltipTrigger> <TooltipContent side="bottom" align="start" className="text-xs max-w-xs"><p>{tooltipText}</p></TooltipContent> </Tooltip> </TooltipProvider> ); 
});
EnhancedSingleItemCard.displayName = 'EnhancedSingleItemCard';

const BulkSelectionActions: React.FC<{ onSelectAll: () => void; onDeselectAll: () => void; canSelectAll: boolean; canDeselectAll: boolean; selectionCount: number; }> = ({ onSelectAll, onDeselectAll, canSelectAll, canDeselectAll, selectionCount }) => ( <div className="flex-shrink-0 flex items-center gap-1 py-1.5 border-b mb-2 text-xs mx-1"> <span className="mr-auto text-xs text-muted-foreground px-1"> {selectionCount > 0 ? `${selectionCount} new items marked for addition` : "Select items below"} </span> <TooltipProvider delayDuration={150}> <Tooltip> <TooltipTrigger asChild> <Button variant="ghost" size="sm" onClick={onSelectAll} disabled={!canSelectAll}> <CheckCheck className="mr-1 h-3.5 w-3.5" />All Visible </Button> </TooltipTrigger> <TooltipContent><p>{canSelectAll ? "Select all visible & available items" : "All visible items already selected or none to select"}</p></TooltipContent> </Tooltip> <Tooltip> <TooltipTrigger asChild> <Button variant="ghost" size="sm" onClick={onDeselectAll} disabled={!canDeselectAll}> <X className="mr-1 h-3.5 w-3.5" />None Visible </Button> </TooltipTrigger> <TooltipContent><p>{canDeselectAll ? "Deselect all visible selected items" : "No visible items are selected"}</p></TooltipContent> </Tooltip> </TooltipProvider> </div> );
BulkSelectionActions.displayName = 'BulkSelectionActions';

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
    return ( <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3"> <Info className="h-12 w-12 text-muted-foreground/40" /> <p className="text-lg font-medium text-foreground">{title}</p> <p className="text-sm text-muted-foreground max-w-md">{message}</p> </div> )
};
EmptyStateMessage.displayName = 'EmptyStateMessage';

interface AddNewDataPointModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewDataPointFormShape) => Promise<void>; 
    isSaving: boolean;
    definedCategories: DataPoint['category'][];
    definedDataTypes: DataPoint['dataType'][];
    definedUiTypes: DataPoint['uiType'][];
    definedPhases: DataPoint['phase'][]; 
}

const AddNewDataPointModal: React.FC<AddNewDataPointModalProps> = ({
    isOpen, onClose, onSave, isSaving,
    definedCategories, definedDataTypes, definedUiTypes, definedPhases
}) => {
    const [formData, setFormData] = useState<Partial<NewDataPointFormShape>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [customCategory, setCustomCategory] = useState<string>("");


    const resetForm = useCallback(() => { // Wrapped in useCallback
        setFormData({
            isSinglePhase: false, 
            dataType: definedDataTypes[0], 
            uiType: definedUiTypes[0], 
            category: definedCategories[0], 
            // Set default values for all *required* fields in NewDataPointFormShape
            // to avoid them being undefined initially if not touched by user
            label: '',
            name: '',
            nodeId: '',
            icon: '',
        });
        setCustomCategory("");
        setFormError(null);
    }, [definedCategories, definedDataTypes, definedUiTypes]); // Dependencies for useCallback

    useEffect(() => {
        if (isOpen) resetForm();
    }, [isOpen, resetForm]); 

    const handleChange = (field: keyof NewDataPointFormShape, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSelectChange = (field: keyof NewDataPointFormShape) => (value: string | null | undefined) => { // Allow null/undefined for Select if placeholder is intended
         if (field === 'category' && value === '__custom__') {
             handleChange(field, '__custom__'); // Explicitly set category to '__custom__'
         } else {
            handleChange(field, value || ""); // Handle null/undefined from Select by defaulting to empty string or keeping value
         }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const finalFormData: Partial<NewDataPointFormShape> = { ...formData };

        if (finalFormData.category === '__custom__') {
            if (!customCategory.trim()) {
                setFormError("Custom category name cannot be empty if 'Add new category...' is selected.");
                return;
            }
            finalFormData.category = customCategory.trim();
        }
        
        const requiredFields: (keyof NewDataPointFormShape)[] = ['label', 'name', 'nodeId', 'dataType', 'uiType', 'category', 'icon'];
        for (const field of requiredFields) {
            const value = finalFormData[field];
            if (value === undefined || (typeof value === 'string' && !value.trim())) {
                setFormError(`Field "${field.charAt(0).toUpperCase() + field.slice(1)}" is required.`);
                return;
            }
        }
        
        await onSave(finalFormData as NewDataPointFormShape); // Assert type after validation
    };

    if (!isOpen) return null;
    
    const renderField = (id: string, label: string, children: React.ReactNode, required = false, tooltip?: string) => (
        <div className="grid grid-cols-4 items-center gap-x-2 gap-y-1">
            <Label htmlFor={id} className="text-right col-span-1 flex items-center justify-end">
                {label} {required && <span className="text-destructive ml-0.5">*</span>}
                {tooltip && (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger type="button" asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 p-0">
                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs"><p>{tooltip}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </Label>
            <div className="col-span-3">{children}</div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col" onPointerDownOutside={(e) => isSaving && e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="text-xl">Add New Data Point Configuration</DialogTitle>
                    <DialogDescription>Define all properties for a new data point. Required fields are marked with *.</DialogDescription>
                </DialogHeader>
                
                <form id="add-dp-form" onSubmit={handleSubmit} className="space-y-3 py-2 overflow-y-auto px-2 custom-scrollbar flex-grow">
                    {renderField("dp-label", "Label", <Input id="dp-label" value={formData.label || ""} onChange={e => handleChange('label', e.target.value)} placeholder="Short, unique display label" disabled={isSaving}/>, true, "A concise label for display, must be unique.")}
                    {renderField("dp-name", "Name", <Input id="dp-name" value={formData.name || ""} onChange={e => handleChange('name', e.target.value)} placeholder="Human-readable name" disabled={isSaving}/>, true, "Full descriptive name of the data point.")}
                    {renderField("dp-nodeId", "Node ID", <Input id="dp-nodeId" value={formData.nodeId || ""} onChange={e => handleChange('nodeId', e.target.value)} placeholder="OPC UA Node ID (e.g., ns=2;s=...)" disabled={isSaving}/>, true, "The OPC UA Node ID for data mapping.")}
                    
                    {renderField("dp-dataType", "Data Type", 
                        <Select value={formData.dataType || ""} onValueChange={handleSelectChange('dataType')} disabled={isSaving}>
                            <SelectTrigger id="dp-dataType"><SelectValue placeholder="Select data type..." /></SelectTrigger>
                            <SelectContent>{definedDataTypes.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}</SelectContent>
                        </Select>, true
                    )}
                    {renderField("dp-uiType", "UI Type", 
                        <Select value={formData.uiType || ""} onValueChange={handleSelectChange('uiType')} disabled={isSaving}>
                            <SelectTrigger id="dp-uiType"><SelectValue placeholder="Select UI type..." /></SelectTrigger>
                            <SelectContent>{definedUiTypes.map(ut => <SelectItem key={ut} value={ut}>{ut}</SelectItem>)}</SelectContent>
                        </Select>, true
                    )}
                    {renderField("dp-icon", "Icon Name", <Input id="dp-icon" value={formData.icon || ""} onChange={e => handleChange('icon', e.target.value)} placeholder="Lucide Icon (e.g., Zap)" disabled={isSaving}/>, true, "Name of a Lucide React icon (e.g., 'Thermometer', 'BatteryCharging').")}
                     
                    {renderField("dp-category", "Category", 
                        <div className="flex flex-col space-y-2">
                            <Select value={formData.category || ""} onValueChange={handleSelectChange('category')} disabled={isSaving}>
                                <SelectTrigger id="dp-category"><SelectValue placeholder="Select category..." /></SelectTrigger>
                                <SelectContent>
                                    {definedCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    <SelectItem value="__custom__">Add new category...</SelectItem>
                                </SelectContent>
                            </Select>
                            {formData.category === '__custom__' && (
                                <Input 
                                    value={customCategory} 
                                    onChange={e => setCustomCategory(e.target.value)} 
                                    placeholder="Enter new category name" 
                                    disabled={isSaving}
                                    className="mt-1.5"
                                />
                            )}
                        </div>, true
                    )}

                    {renderField("dp-unit", "Unit", <Input id="dp-unit" value={formData.unit || ""} onChange={e => handleChange('unit', e.target.value)} placeholder="e.g., V, A, kWh, %" disabled={isSaving}/>, false, "Physical unit of the data point (e.g., V, A, °C).")}
                    {renderField("dp-min", "Min Value", <Input id="dp-min" type="number" value={formData.min || ""} onChange={e => handleChange('min', e.target.value)} placeholder="Number" disabled={isSaving}/>, false, "Minimum expected value, for gauges or validation.")}
                    {renderField("dp-max", "Max Value", <Input id="dp-max" type="number" value={formData.max || ""} onChange={e => handleChange('max', e.target.value)} placeholder="Number" disabled={isSaving}/>, false, "Maximum expected value, for gauges or validation.")}
                    {renderField("dp-factor", "Factor", <Input id="dp-factor" type="number" step="any" value={formData.factor || ""} onChange={e => handleChange('factor', e.target.value)} placeholder="e.g., 0.1 or 1000" disabled={isSaving}/>, false, "Multiplier for the raw value (e.g., 0.001 to convert Wh to kWh).")}
                    
                    {renderField("dp-phase", "Phase", 
                        <Select value={formData.phase || ""} onValueChange={handleSelectChange('phase')} disabled={isSaving}>
                            <SelectTrigger id="dp-phase"><SelectValue placeholder="Select phase (if any)..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">N/A</SelectItem> 
                                {definedPhases
                                    .filter((ph): ph is NonNullable<DataPoint['phase']> => ph !== undefined)
                                    .map(ph => <SelectItem key={ph} value={ph}>{ph.toUpperCase()}</SelectItem>)}
                            </SelectContent>
                        </Select>, false, "Phase identifier (a, b, c, x) if applicable."
                    )}
                    {renderField("dp-threePhaseGroup", "3-Phase Group", <Input id="dp-threePhaseGroup" value={formData.threePhaseGroup || ""} onChange={e => handleChange('threePhaseGroup', e.target.value)} placeholder="Link ID for related phases" disabled={isSaving}/>, false, "Identifier to group this with other phase-related data points (e.g., 'grid-voltage').")}
                    
                    <div className="grid grid-cols-4 items-start gap-x-2 gap-y-1">
                        <Label htmlFor={"dp-description"} className="text-right col-span-1 pt-2">Description</Label>
                        <div className="col-span-3">
                            <Textarea id="dp-description" value={formData.description || ""} onChange={e => handleChange('description', e.target.value)} placeholder="Tooltip or extra information..." disabled={isSaving} rows={2}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-x-2 gap-y-1">
                         <Label htmlFor={"dp-notes"} className="text-right col-span-1 pt-2">Notes</Label>
                        <div className="col-span-3">
                            <Textarea id="dp-notes" value={formData.notes || ""} onChange={e => handleChange('notes', e.target.value)} placeholder="Internal notes for this configuration..." disabled={isSaving} rows={2}/>
                        </div>
                    </div>


                    <div className="col-span-3 col-start-2 flex items-center space-x-2 pt-2">
                         <Checkbox id="dp-isSinglePhase" checked={formData.isSinglePhase || false} onCheckedChange={checked => handleChange('isSinglePhase', Boolean(checked))} disabled={isSaving}/>
                         <Label htmlFor="dp-isSinglePhase" className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Is Single Phase (UI hint)</Label>
                    </div>

                    {formError && <p className="text-sm text-destructive col-span-full text-center py-1">{formError}</p>}
                </form>
                
                <DialogFooter className="pt-3 mt-auto border-t">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button type="submit" form="add-dp-form" 
                            disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {isSaving ? "Saving..." : "Save Data Point"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
AddNewDataPointModal.displayName = "AddNewDataPointModal";

export default DashboardItemConfigurator;