// src/components/dashboard/DashboardItemConfigurator.tsx
import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataPoint } from '@/config/dataPoints';
import { X, Search, RotateCcw, PackagePlus, Info, CheckCheck, PlusCircle, ListFilter } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from 'framer-motion';
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
const ROW_HEIGHTS = { GRID_ITEM: 80 };
const MIN_COLUMN_WIDTH = 170;
// const DEFAULT_COLUMN_COUNT = 3; // No longer used as columnCount is dynamic via AutoSizer

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
    onSaveNewDataPoint: (data: NewDataPointFormData) => Promise<{ success: boolean; error?: string; newPoint?: DataPoint }>;
    itemTypeName?: string; // For "Add {itemTypeName} Items" e.g., "Widgets", "Gauges"
}

// --- Main Component ---
const DashboardItemConfigurator: React.FC<DashboardItemConfiguratorProps> = ({
    isOpen, onClose, availableIndividualPoints, availableThreePhaseGroups,
    currentDisplayedIds, onAddMultipleDataPoints, onSaveNewDataPoint,
    itemTypeName = "Dashboard", // Default item type name
}) => {
    // --- State ---
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedIndividualIds, setSelectedIndividualIds] = useState<Set<string>>(new Set());
    const [selectedGroupNames, setSelectedGroupNames] = useState<Set<string>>(new Set());
    const [columnCount, setColumnCount] = useState(3); // Initial arbitrary, will be updated
    const [isAddNewModalOpen, setIsAddNewModalOpen] = useState(false);
    const [isSavingNewPoint, setIsSavingNewPoint] = useState(false);

    const gridRef = useRef<VariableSizeGrid>(null);
    
    const capitalizedItemTypeName = useMemo(() => {
        if (!itemTypeName) return "Items";
        return itemTypeName.charAt(0).toUpperCase() + itemTypeName.slice(1).toLowerCase();
    }, [itemTypeName]);

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
        availableIndividualPoints.forEach(p => { if (p.category) categories.add(p.category); });
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
                   (dp.category && dp.category.toLowerCase().includes(lowerSearchTerm)) ||
                   dp.id.toLowerCase().includes(lowerSearchTerm);
        };

        const groupFilter = (g: ConfiguratorThreePhaseGroup) => {
            if (g.ids.every(id => currentDisplayedIds.includes(id))) return false;
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

        return [...groups, ...individuals];
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
            if(!currentDisplayedIds.includes(p.id) && p.category) countItem(p.category)
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
                if (result.newPoint) {
                     const newPointId = result.newPoint.id;
                     const categoryMatch = !selectedCategory || result.newPoint.category === selectedCategory;
                     const searchMatch = !searchTerm || 
                                        result.newPoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (result.newPoint.category && result.newPoint.category.toLowerCase().includes(searchTerm.toLowerCase()));
                     if (categoryMatch && searchMatch && !currentDisplayedIds.includes(newPointId)) {
                        handleToggleIndividual(newPointId);
                     }
                }
                setIsAddNewModalOpen(false); 
            } else {
                alert(`Error saving: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Failed to save new data point:", error);
            alert("An unexpected error occurred while saving.");
        } finally {
            setIsSavingNewPoint(false);
        }
    };

    const itemDataForGrid = useMemo(() => ({
        items: filteredDataItems, columnCount, selectedIndividualIds, selectedGroupNames, currentDisplayedIds,
        handleToggleIndividual, handleToggleGroup, getGroupItemCounts,
    }), [filteredDataItems, columnCount, selectedIndividualIds, selectedGroupNames, currentDisplayedIds, handleToggleIndividual, handleToggleGroup, getGroupItemCounts]);

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
                <DialogContent className="w-full max-w-full md:max-w-6xl 2xl:max-w-8xl h-full md:h-[90vh] flex flex-col p-0 overflow-hidden md:rounded-lg">
                    <DialogHeader className="p-3 sm:p-4 border-b flex-shrink-0">
                        <DialogTitle className="text-xl sm:text-2xl font-semibold">Add {capitalizedItemTypeName} Items</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            Browse, search, and select items to add to your {itemTypeName.toLowerCase()}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col md:flex-row flex-1 min-h-0"> {/* Main layout: Sidebar + Content */}
                        <CategorySidebar
                            categories={allCategories}
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                            itemCounts={itemCountsPerCategory}
                            onAddNew={() => setIsAddNewModalOpen(true)}
                        />

                        <div className="flex-1 flex flex-col min-h-0 md:border-l"> {/* Main Content Area */}
                            <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex-shrink-0 flex flex-col xs:flex-row items-stretch xs:items-center xs:justify-between gap-2 sm:gap-3 border-b">
                                <div className="relative flex-grow w-full xs:max-w-xs sm:max-w-sm md:max-w-md">
                                    <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <Input type="search" placeholder="Search name, category, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 sm:pl-9 pr-8 h-8 sm:h-9 text-xs sm:text-sm rounded-md" />
                                    {searchTerm && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchTerm('')}><X className="h-3.5 w-3.5" /></Button>}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setIsAddNewModalOpen(true)} className="w-full xs:w-auto h-8 sm:h-9 text-xs sm:text-sm">
                                    <PlusCircle className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> Add New Data Point
                                </Button>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-1.5 sm:p-2">
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
                                                        key={`grid-${columnCount}-${selectedCategory || 'all'}-${filteredDataItems.length}`}
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

                    <DialogFooter className="p-2.5 sm:p-3 flex-shrink-0 bg-muted/30 border-t gap-2 flex-col xs:flex-row items-stretch xs:items-center">
                        <div className="text-[11px] sm:text-xs text-muted-foreground mr-auto text-center xs:text-left mb-1 xs:mb-0">
                            {totalSelectionsCount > 0 ? `${totalSelectionsCount} selected` : 'No items selected'}
                            {effectiveDataPointsToAdd.length > 0 && ` (${effectiveDataPointsToAdd.length} new to add)`}
                        </div>
                        <Button type="button" variant="ghost" onClick={handleClearAllSelections} disabled={totalSelectionsCount === 0} size="sm" className="xs:size-sm"><RotateCcw className="mr-1.5 h-3 w-3 xs:h-3.5 xs:w-3.5" />Clear</Button>
                        <DialogClose asChild><Button type="button" variant="outline" size="sm" className="xs:size-sm">Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleAddSelected} disabled={effectiveDataPointsToAdd.length === 0} size="sm" className="xs:size-sm bg-primary hover:bg-primary/90 text-primary-foreground">
                            <PackagePlus className="mr-1.5 h-3.5 w-3.5 xs:h-4 xs:w-4" />Add ({effectiveDataPointsToAdd.length})
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

interface CategorySidebarProps {
    categories: string[];
    selectedCategory: string | null;
    onSelectCategory: (category: string | null) => void;
    itemCounts: Record<string, number>;
    onAddNew: () => void;
}
const CategorySidebar: React.FC<CategorySidebarProps> = ({ categories, selectedCategory, onSelectCategory, itemCounts }) => {
    const totalAvailableItems = useMemo(() => Object.values(itemCounts).reduce((sum, count) => sum + count, 0), [itemCounts]);

    return (
        <div className="w-full md:w-56 lg:w-64 flex-shrink-0 bg-muted/20 p-2 sm:p-3 flex flex-col space-y-0.5 sm:space-y-1 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r max-h-[35vh] md:max-h-none">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground px-1.5 sm:px-2 mb-1 uppercase">Categories</p>
            <Button
                variant={selectedCategory === null ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => onSelectCategory(null)}
            >
                <ListFilter className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                All Items
                <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0 sm:text-[10px] sm:px-1.5 sm:py-0.5">{totalAvailableItems}</Badge>
            </Button>
            {categories.map(category => (
                <Button
                    key={category}
                    variant={selectedCategory === category ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-xs sm:text-sm truncate h-8 sm:h-9"
                    onClick={() => onSelectCategory(category)}
                    title={category}
                >
                   <span className="truncate flex-1">{category}</span>
                   <Badge variant="outline" className="ml-1.5 sm:ml-2 text-[9px] px-1 py-0 sm:text-[10px] sm:px-1.5 sm:py-0.5 flex-shrink-0">{itemCounts[category] || 0}</Badge>
                </Button>
            ))}
        </div>
    );
};

const GridViewCell = memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {
    const { items, columnCount, ...restOfData } = data;
    const itemIndex = rowIndex * columnCount + columnIndex;
    const item = items[itemIndex] as DataItem | undefined;

    if (!item) return <div style={style} />;

    return (
        <motion.div 
            style={style} 
            className="flex items-center justify-center p-1 sm:p-1.5"
            initial={{ opacity: 0, y: 15 }} // Slightly reduced y
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: (rowIndex * columnCount + columnIndex) * 0.015 }} // Faster stagger
        >
            <EnhancedSingleItemCard item={item} {...restOfData} />
        </motion.div>
    );
});
GridViewCell.displayName = 'GridViewCell';

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

        tooltipText = `${groupData.representativeName} (Group) - ${groupData.category || 'Uncategorized'}. `;
        if (isFullyAddedToDashboard) {
            badgeContent = "All Added";
            tooltipText += `All ${totalInGroup} items in this group are on the dashboard.`;
        } else if (displayableNow < totalInGroup && displayableNow > 0) {
            badgeContent = `+${displayableNow} of ${totalInGroup}`;
            tooltipText += `Adds ${displayableNow} new items. ${totalInGroup - displayableNow} item(s) already on dashboard.`;
        } else if (displayableNow === totalInGroup) {
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
        tooltipText = `${dpData.name} (Item) - ${dpData.category || 'Uncategorized'}.`;
        if (isFullyAddedToDashboard) tooltipText += " This item is already on the dashboard.";
        else tooltipText += " Click to select/deselect this item."
    }

    const handleToggle = () => {
        if (isFullyAddedToDashboard) return;
        if (isGroup) handleToggleGroup(idOrName);
        else handleToggleIndividual(idOrName);
    };
    
    const cardVariants = {
        initial: { scale: 1, y: 0, boxShadow: "0 1px 2px rgba(0,0,0,0.07)" },
        hover: { 
            scale: 1.02, y: -1, boxShadow: "0 3px 8px rgba(0,0,0,0.12)",
            transition: { type: "spring", stiffness: 350, damping: 15, duration: 0.1 }
        },
    };

    const cardContent = (
        <motion.div
            variants={!isFullyAddedToDashboard ? cardVariants : { initial: cardVariants.initial }}
            initial="initial"
            whileHover="hover"
            onClick={handleToggle}
            className={clsx(
                "w-full h-full flex flex-col items-start justify-between p-2 sm:p-2.5 text-left space-y-1 sm:space-y-1.5",
                "border rounded-md sm:rounded-lg shadow-sm transition-colors duration-150 cursor-pointer overflow-hidden relative group",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isFullyAddedToDashboard ? "opacity-60 bg-muted/50 border-dashed cursor-not-allowed" : "hover:border-primary/80",
                isSelected && !isFullyAddedToDashboard ? "bg-primary/10 border-primary ring-1 sm:ring-2 ring-primary" : "bg-card border-input"
            )}
            role="checkbox" aria-checked={isSelected} aria-disabled={isFullyAddedToDashboard}
            tabIndex={isFullyAddedToDashboard ? -1 : 0}
            onKeyDown={(e) => { if (!isFullyAddedToDashboard && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); handleToggle(); }}}
        >
            <div className="w-full">
                <h4 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2" title={displayName}>{displayName}</h4>
                <p className="text-muted-foreground text-[10px] sm:text-xs line-clamp-1" title={category || 'Uncategorized'}>{category || 'Uncategorized'}</p>
            </div>
            <div className="w-full flex items-center justify-between mt-auto pt-0.5 sm:pt-1">
                {badgeContent && (
                     <Badge
                        variant={isFullyAddedToDashboard ? "outline" : (isSelected ? "default" : "secondary")}
                        className={clsx("text-[9px] px-1 py-0 sm:text-[10px] sm:px-1.5 sm:py-0.5", isFullyAddedToDashboard && "border-dashed")}
                    >
                        {badgeContent}
                    </Badge>
                )}
                {!isFullyAddedToDashboard && (
                    <div className={clsx(
                        "h-4 w-4 sm:h-5 sm:w-5 rounded-full border flex sm:border-2 items-center justify-center transition-all duration-200 ml-auto",
                        isSelected ? "bg-primary border-primary" : "bg-background border-muted-foreground/50 group-hover:border-primary/70",
                    )}>
                        {isSelected && <CheckCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground" />}
                    </div>
                )}
                {isFullyAddedToDashboard && (
                     <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 ml-auto" />
                )}
            </div>
        </motion.div>
    );

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="text-xs max-w-xs sm:max-w-sm"><p>{tooltipText}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});
EnhancedSingleItemCard.displayName = 'EnhancedSingleItemCard';

const BulkSelectionActions: React.FC<{
    onSelectAll: () => void; onDeselectAll: () => void; canSelectAll: boolean; canDeselectAll: boolean; selectionCount: number;
}> = ({ onSelectAll, onDeselectAll, canSelectAll, canDeselectAll, selectionCount }) => (
    <div className="flex-shrink-0 flex items-center gap-1 py-1 sm:py-1.5 border-b mb-1.5 sm:mb-2 text-xs mx-0.5 sm:mx-1">
        <span className="mr-auto text-[10px] sm:text-xs text-muted-foreground px-1">
            {selectionCount > 0 ? `${selectionCount} new marked` : "Select items"}
        </span>
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onSelectAll} disabled={!canSelectAll} className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                        <CheckCheck className="mr-1 h-3 w-3" />All Vis
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{canSelectAll ? "Select all visible & available items" : "All visible items already selected or none to select"}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onDeselectAll} disabled={!canDeselectAll} className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                        <X className="mr-1 h-3 w-3" />None Vis
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{canDeselectAll ? "Deselect all visible selected items" : "No visible items are selected"}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
);
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
        message = `There are no available items in the "${selectedCategory}" category. Try 'All Items'.`;
    }
    return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-2 sm:space-y-3">
        <Info className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40" />
        <p className="text-base sm:text-lg font-medium text-foreground">{title}</p>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xs sm:max-w-md">{message}</p>
    </div>
)};
EmptyStateMessage.displayName = 'EmptyStateMessage';

interface AddNewDataPointModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewDataPointFormData) => Promise<void>; // Assuming onSave will close modal internally upon success if needed
    existingCategories: string[];
    isSaving: boolean;
}

const AddNewDataPointModal: React.FC<AddNewDataPointModalProps> = ({ isOpen, onClose, onSave, existingCategories, isSaving }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [unit, setUnit] = useState('');
    const [description, setDescription] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
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
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
            <DialogContent className="w-[90vw] max-w-md sm:max-w-lg" onPointerDownOutside={(e) => isSaving && e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Add New Data Point</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">Enter details for the new data point. It will then be available.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 py-2">
                    <div>
                        <label htmlFor="dp-name" className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1">Name <span className="text-destructive">*</span></label>
                        <Input id="dp-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Main Power Consumption" disabled={isSaving} className="h-9 text-xs sm:text-sm"/>
                    </div>
                    <div>
                        <label htmlFor="dp-category" className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1">Category <span className="text-destructive">*</span></label>
                        <Input id="dp-category" list="dp-categories" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Power, Temperature" disabled={isSaving} className="h-9 text-xs sm:text-sm"/>
                        <datalist id="dp-categories">
                            {existingCategories.map(cat => <option key={cat} value={cat} />)}
                        </datalist>
                    </div>
                     <div>
                        <label htmlFor="dp-unit" className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1">Unit (Optional)</label>
                        <Input id="dp-unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g., kWh, °C" disabled={isSaving} className="h-9 text-xs sm:text-sm"/>
                    </div>
                    <div>
                        <label htmlFor="dp-description" className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1">Description (Optional)</label>
                        <textarea id="dp-description" value={description} onChange={e => setDescription(e.target.value)} rows={3}
                                  className="w-full p-2 border rounded-md text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50" 
                                  placeholder="Additional details..." disabled={isSaving}/>
                    </div>
                    {formError && <p className="text-xs sm:text-sm text-destructive">{formError}</p>}

                    <DialogFooter className="pt-2 flex-col-reverse sm:flex-row">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="w-full sm:w-auto" size="sm">Cancel</Button>
                        <Button type="submit" disabled={isSaving || !name.trim() || !category.trim()} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
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