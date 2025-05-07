// src/components/dashboard/DashboardItemConfigurator.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataPoint } from '@/config/dataPoints';
import { X, Search, RotateCcw, ListChecks, Rows } from 'lucide-react'; // Added ListChecks, Rows
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";


export interface ConfiguratorThreePhaseGroup {
    name: string;
    representativeName: string;
    ids: string[];
    category: string;
}

interface DashboardItemConfiguratorProps {
    isOpen: boolean;
    onClose: () => void;
    availableIndividualPoints: DataPoint[]; // All individual DPs not yet displayed
    availableThreePhaseGroups: ConfiguratorThreePhaseGroup[]; // All 3-phase groups
    currentDisplayedIds: string[]; // Needed to check if a group's members are ALREADY displayed
    onAddMultipleDataPoints: (selectedDataPointIds: string[]) => void;
}

const DashboardItemConfigurator: React.FC<DashboardItemConfiguratorProps> = ({
    isOpen,
    onClose,
    availableIndividualPoints,
    availableThreePhaseGroups,
    currentDisplayedIds,
    onAddMultipleDataPoints,
}) => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedIndividualIds, setSelectedIndividualIds] = useState<Set<string>>(new Set());
    const [selectedGroupNames, setSelectedGroupNames] = useState<Set<string>>(new Set()); // Select groups by their unique 'name' or representativeName
    const [activeTab, setActiveTab] = useState<"individual" | "groups">("individual");

    useEffect(() => {
        if (isOpen) {
            setSelectedIndividualIds(new Set());
            setSelectedGroupNames(new Set());
            setSearchTerm('');
            setActiveTab("individual"); // Default to individual tab
        }
    }, [isOpen]);

    const filteredIndividualPoints = useMemo(() => {
        return availableIndividualPoints
            .filter(dp => !currentDisplayedIds.includes(dp.id)) // Ensure not displayed
            .filter(dp => {
                if (!searchTerm) return true;
                const lower = searchTerm.toLowerCase();
                return dp.name.toLowerCase().includes(lower) || dp.category.toLowerCase().includes(lower) || dp.id.toLowerCase().includes(lower);
            });
    }, [availableIndividualPoints, currentDisplayedIds, searchTerm]);

    const filteredThreePhaseGroups = useMemo(() => {
        return availableThreePhaseGroups
             // A group is considered "available" if not ALL its constituent IDs are already displayed
            .filter(group => !group.ids.every(id => currentDisplayedIds.includes(id)))
            .filter(group => {
                if (!searchTerm) return true;
                const lower = searchTerm.toLowerCase();
                return group.representativeName.toLowerCase().includes(lower) || group.category.toLowerCase().includes(lower) || group.name.toLowerCase().includes(lower);
            });
    }, [availableThreePhaseGroups, currentDisplayedIds, searchTerm]);

    const handleToggleIndividual = (id: string) => {
        setSelectedIndividualIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleGroup = (groupName: string) => {
        setSelectedGroupNames(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) next.delete(groupName);
            else next.add(groupName);
            return next;
        });
    };
    
    const getIdsFromSelectedGroups = (): string[] => {
        let groupIdsToAdd: string[] = [];
        selectedGroupNames.forEach(groupName => {
            const group = availableThreePhaseGroups.find(g => g.name === groupName);
            if (group) {
                // Add only IDs from the group that are not already displayed
                group.ids.forEach(id => {
                    if (!currentDisplayedIds.includes(id)) {
                        groupIdsToAdd.push(id);
                    }
                });
            }
        });
        return groupIdsToAdd;
    }


    const handleAddSelected = () => {
        const individualIdsArray = Array.from(selectedIndividualIds);
        const groupRelatedIdsArray = getIdsFromSelectedGroups();
        
        const allIdsToAdd = Array.from(new Set([...individualIdsArray, ...groupRelatedIdsArray]));

        if (allIdsToAdd.length > 0) {
            onAddMultipleDataPoints(allIdsToAdd);
        }
    };

    const handleClearAllSelections = () => {
        setSelectedIndividualIds(new Set());
        setSelectedGroupNames(new Set());
    };

    const totalSelectedCount = selectedIndividualIds.size + selectedGroupNames.size; // Or count of effective IDs

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add Items to Dashboard</DialogTitle>
                    <DialogDescription>
                        Search and select individual data points or three-phase groups.
                        {totalSelectedCount > 0 && ` (${totalSelectedCount} item/group selections)`}
                    </DialogDescription>
                </DialogHeader>

                <div className="relative my-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search" placeholder="Search by name, category, ID..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full"
                    />
                    {searchTerm && (
                        <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "individual" | "groups")} className="flex-grow flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="individual">
                            <Rows className="mr-2 h-4 w-4"/> Individual Points ({filteredIndividualPoints.length})
                        </TabsTrigger>
                        <TabsTrigger value="groups">
                             <ListChecks className="mr-2 h-4 w-4"/> Three-Phase Groups ({filteredThreePhaseGroups.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="individual" className="flex-grow overflow-hidden mt-2">
                        {filteredIndividualPoints.length > 0 ? (
                            <ScrollArea className="h-full pr-2 max-h-[calc(80vh-250px)]"> {/* Adjust max-h as needed */}
                                <div className="space-y-1.5">
                                    {filteredIndividualPoints.map((dp) => (
                                        <ItemRow key={dp.id} id={dp.id} name={dp.name} category={dp.category} isSelected={selectedIndividualIds.has(dp.id)} onToggle={handleToggleIndividual} />
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : <EmptyState searchTerm={searchTerm} type="individual points" />}
                    </TabsContent>

                    <TabsContent value="groups" className="flex-grow overflow-hidden mt-2">
                         {filteredThreePhaseGroups.length > 0 ? (
                            <ScrollArea className="h-full pr-2 max-h-[calc(80vh-250px)]"> {/* Adjust max-h as needed */}
                                <div className="space-y-1.5">
                                    {filteredThreePhaseGroups.map((group) => (
                                        <ItemRow key={group.name} id={group.name} name={group.representativeName} category={group.category} isSelected={selectedGroupNames.has(group.name)} onToggle={handleToggleGroup} badgeText="Group" />
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : <EmptyState searchTerm={searchTerm} type="three-phase groups" />}
                    </TabsContent>
                </Tabs>


                <DialogFooter className="mt-auto pt-4 gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="ghost" onClick={handleClearAllSelections} disabled={totalSelectedCount === 0}>
                        <RotateCcw className="mr-2 h-4 w-4"/> Clear All Selections
                    </Button>
                    <div className="flex gap-2">
                        <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleAddSelected} disabled={totalSelectedCount === 0}>
                            Add Selected ({totalSelectedCount})
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// Helper component for list items
const ItemRow: React.FC<{ id: string; name: string; category: string; isSelected: boolean; onToggle: (id: string) => void; badgeText?: string }> =
 ({ id, name, category, isSelected, onToggle, badgeText }) => (
    <div
        className="flex items-center space-x-3 p-2.5 border rounded-md hover:bg-accent/80 cursor-pointer transition-colors data-[state=checked]:bg-accent"
        data-state={isSelected ? "checked" : "unchecked"}
        onClick={() => onToggle(id)}
    >
        <Checkbox id={`cb-${id}`} checked={isSelected} onCheckedChange={() => onToggle(id)} />
        <label htmlFor={`cb-${id}`} className="text-sm font-medium leading-none flex-grow cursor-pointer">
            {name}
            {badgeText && <Badge variant="secondary" className="ml-2">{badgeText}</Badge>}
            <p className="text-xs text-muted-foreground">({category})</p>
        </label>
    </div>
);

const EmptyState: React.FC<{searchTerm: string, type: string}> = ({searchTerm, type}) => (
     <div className="flex-grow flex items-center justify-center h-full text-center">
        <p className="text-sm text-muted-foreground">
            {searchTerm ? `No matching ${type} found for "${searchTerm}".` : `All available ${type} are displayed or none exist.`}
        </p>
    </div>
);

export default DashboardItemConfigurator;