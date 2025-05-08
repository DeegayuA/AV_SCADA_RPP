// src/pages/MyDashboardPage.tsx (or wherever your dashboard page lives)
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Plus, Edit, Save, X, Check, HelpCircle, LucideIcon } from 'lucide-react';
import { Layouts, Layout } from 'react-grid-layout';
import { NodeData, ThreePhaseGroupInfo } from '../DashboardData/dashboardInterfaces'; // Ensure this path is correct
import { DataPoint } from '@/config/dataPoints'; // Import DataPoint itself
import { DashboardGridWidgetItem, DEFAULT_WIDGET_HEIGHT, DEFAULT_WIDGET_WIDTH, findNextAvailablePosition, GRID_COLS } from '../control/controlGridConfig';
import DashboardItemConfigurator, { ConfiguratorThreePhaseGroup } from '@/components/DashboardItemConfigurator';
import DashboardGridLayout from '../control/ControlGridLayout';

import { dataPoints as dataPointRegistry } from '@/config/dataPoints';

// --- ERROR 1 FIX: Define DataPointCategory locally ---
// Extract the category type from the imported DataPoint interface
type DataPointCategory = DataPoint['category'] | 'general'; // Add 'general' if used as a default

export interface ThreePhaseGroupDefinition {
    name: string;
    representativeName: string;
    pointIds: {
        a?: string;
        b?: string;
        c?: string;
    };
    averagePointId?: string;
    totalPointId?: string;
    category?: DataPointCategory; // Use the locally defined type
    ids: string[];
    getAllMemberIds(): string[];
}

const threePhaseGroupsRegistry: ThreePhaseGroupDefinition[] = [

];

// Helper to build ThreePhaseGroupInfo from a group definition and its DPs
const buildThreePhaseGroupInfo = (groupConfig: ThreePhaseGroupDefinition, allDps: DataPoint[]): ThreePhaseGroupInfo | null => {
    const points: Partial<ThreePhaseGroupInfo['points']> = {};
    let hasPoints = false;

    (Object.keys(groupConfig.pointIds) as Array<keyof typeof groupConfig.pointIds>).forEach(phaseKey => {
        const dpId = groupConfig.pointIds[phaseKey];
        if (dpId) {
            const dp = allDps.find(d => d.id === dpId);
            if (dp) {
                points[phaseKey] = dp;
                hasPoints = true;
            }
        }
    });

    if (!hasPoints) return null;

    const representativeDpForConfig = points.a || points.b || points.c || undefined;

    return {
        groupKey: groupConfig.name,
        title: groupConfig.representativeName,
        points: points as ThreePhaseGroupInfo['points'], // Cast after ensuring structure is built
        average: groupConfig.averagePointId ? allDps.find(dp => dp.id === groupConfig.averagePointId) : undefined,
        total: groupConfig.totalPointId ? allDps.find(dp => dp.id === groupConfig.totalPointId) : undefined,
        category: groupConfig.category,
        // --- ERROR 3 INSTRUCTION: ---
        // `originalIds` MUST be added to the `ThreePhaseGroupInfo` interface definition
        // in `../DashboardData/dashboardInterfaces.ts` as `originalIds: string[];`
        originalIds: groupConfig.getAllMemberIds(),
        icon: HelpCircle as LucideIcon,
        uiType: 'display', // Default uiType, adjust if necessary
        // --- ERROR 2 INSTRUCTION: ---
        // The `config` property in `ThreePhaseGroupInfo` (in `../DashboardData/dashboardInterfaces.ts`)
        // MUST be made optional (e.g., `config?: DataPoint;`) for this assignment to be valid.
        config: representativeDpForConfig,
    };
};


const MyDashboardPage: React.FC = () => {
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
    const [widgets, setWidgets] = useState<DashboardGridWidgetItem[]>([]);
    const [layouts, setLayouts] = useState<Layouts>({});
    const [isEditMode, setIsEditMode] = useState(false);

    const [nodeValues, setNodeValues] = useState<NodeData>({});
    const lastToastTimestamps = useRef<Record<string, number>>({});
    const sendDataToWebSocket = (nodeId: string, value: any) => console.log('WS Send:', nodeId, value);
    const playNotificationSound = (type: 'success' | 'error' | 'warning' | 'info') => console.log('Sound:', type);

    useEffect(() => {
        const savedWidgets = localStorage.getItem('dashboardWidgets');
        const savedLayouts = localStorage.getItem('dashboardLayouts');
        if (savedWidgets) {
            try {
                setWidgets(JSON.parse(savedWidgets));
            } catch (e) {
                console.error("Failed to parse saved widgets from localStorage", e);
            }
        }
        if (savedLayouts) {
            try {
                setLayouts(JSON.parse(savedLayouts));
            } catch (e) {
                console.error("Failed to parse saved layouts from localStorage", e);
            }
        } else {
            const initialLayouts: Layouts = {};
            (Object.keys(GRID_COLS) as Array<keyof typeof GRID_COLS>).forEach(bp => {
                initialLayouts[bp] = [];
            });
            setLayouts(initialLayouts);
        }
    }, []);

    const saveDashboardState = useCallback(() => {
        try {
            localStorage.setItem('dashboardWidgets', JSON.stringify(widgets));
            localStorage.setItem('dashboardLayouts', JSON.stringify(layouts));
            console.log('Dashboard Saved!', { widgets, layouts });
        } catch (e) {
            console.error("Failed to save dashboard state to localStorage", e);
        }
    }, [widgets, layouts]);

    const handleAddMultipleDataPoints = (selectedIds: string[]) => {
        const newWidgetsToAdd: DashboardGridWidgetItem[] = [];
        const newLayoutItemsForRGL: Layout[] = [];

        const placementBreakpointKey = (Object.keys(layouts)[0] || 'lg') as keyof typeof GRID_COLS;
        const currentLayoutForNextAvailablePosition = layouts[placementBreakpointKey] || [];
        const addedGroupKeys = new Set<string>();
        let tempLayoutItemsForPlacement: Layout[] = [];

        threePhaseGroupsRegistry.forEach((groupConfig) => {
            if (!addedGroupKeys.has(groupConfig.name) && groupConfig.ids.every(id => selectedIds.includes(id))) {
                const groupInfo = buildThreePhaseGroupInfo(groupConfig, dataPointRegistry);
                if (groupInfo) {
                    const widgetId = groupInfo.groupKey;
                    if (widgets.find(w => w.id === widgetId) || newWidgetsToAdd.find(w => w.id === widgetId)) return;

                    newWidgetsToAdd.push({
                        id: widgetId,
                        content: { type: 'threePhaseGroup', data: groupInfo }
                    });
                    const pos = findNextAvailablePosition(
                        currentLayoutForNextAvailablePosition.concat(tempLayoutItemsForPlacement),
                        DEFAULT_WIDGET_WIDTH,
                        DEFAULT_WIDGET_HEIGHT.threePhaseGroup,
                        GRID_COLS[placementBreakpointKey]
                    );
                    const rglLayoutItem = { i: widgetId, x: pos.x, y: pos.y, w: DEFAULT_WIDGET_WIDTH, h: DEFAULT_WIDGET_HEIGHT.threePhaseGroup, minW: 2, minH: 2 };
                    newLayoutItemsForRGL.push(rglLayoutItem);
                    tempLayoutItemsForPlacement.push(rglLayoutItem);
                    addedGroupKeys.add(groupConfig.name);

                    groupConfig.ids.forEach(idToRemove => {
                        const index = selectedIds.indexOf(idToRemove);
                        if (index > -1) selectedIds.splice(index, 1);
                    });
                }
            }
        });

        selectedIds.forEach(id => {
            const dataPoint = dataPointRegistry.find(dp => dp.id === id);
            if (dataPoint) {
                if (widgets.find(w => w.id === id) || newWidgetsToAdd.find(w => w.id === id)) return;

                newWidgetsToAdd.push({
                    id: dataPoint.id,
                    content: { type: 'dataPoint', data: dataPoint }
                });
                const pos = findNextAvailablePosition(
                    currentLayoutForNextAvailablePosition.concat(tempLayoutItemsForPlacement),
                    DEFAULT_WIDGET_WIDTH,
                    DEFAULT_WIDGET_HEIGHT.dataPoint,
                    GRID_COLS[placementBreakpointKey]
                );
                const rglLayoutItem = { i: dataPoint.id, x: pos.x, y: pos.y, w: DEFAULT_WIDGET_WIDTH, h: DEFAULT_WIDGET_HEIGHT.dataPoint, minW: 1, minH: 1 };
                newLayoutItemsForRGL.push(rglLayoutItem);
                tempLayoutItemsForPlacement.push(rglLayoutItem);
            }
        });

        if (newWidgetsToAdd.length > 0) {
            setWidgets(prev => [...prev, ...newWidgetsToAdd]);

            const updatedLayoutsForAllBreakpoints = { ...layouts };
            (Object.keys(GRID_COLS) as Array<keyof typeof GRID_COLS>).forEach(bp => {
                const existingBpLayout = layouts[bp] || [];
                const newBpLayoutItemsForThisBreakpoint: Layout[] = [];
                let tempItemsForThisBpDynamicPlacement: Layout[] = [];

                newLayoutItemsForRGL.forEach(commonNewLayoutItem => {
                    const widgetContent = newWidgetsToAdd.find(w => w.id === commonNewLayoutItem.i)?.content;
                    const widgetHeight = widgetContent?.type === 'threePhaseGroup'
                        ? DEFAULT_WIDGET_HEIGHT.threePhaseGroup
                        : DEFAULT_WIDGET_HEIGHT.dataPoint;

                    const pos = findNextAvailablePosition(
                        existingBpLayout.concat(tempItemsForThisBpDynamicPlacement),
                        commonNewLayoutItem.w,
                        widgetHeight,
                        GRID_COLS[bp]
                    );
                    const finalBpLayoutItem = {
                        ...commonNewLayoutItem,
                        x: pos.x,
                        y: pos.y,
                    };
                    newBpLayoutItemsForThisBreakpoint.push(finalBpLayoutItem);
                    tempItemsForThisBpDynamicPlacement.push(finalBpLayoutItem);
                });
                updatedLayoutsForAllBreakpoints[bp] = [...existingBpLayout, ...newBpLayoutItemsForThisBreakpoint];
            });
            setLayouts(updatedLayoutsForAllBreakpoints);
        }
        setIsConfiguratorOpen(false);
    };

    const availableIndividualPoints = dataPointRegistry.filter(dp =>
        !widgets.some(w => w.content.type === 'dataPoint' && w.content.data.id === dp.id) &&
        !threePhaseGroupsRegistry.some((group) => group.ids.includes(dp.id) && widgets.some(w => w.id === group.name))
    );
    
    const availableThreePhaseGroups: ConfiguratorThreePhaseGroup[] = threePhaseGroupsRegistry
        .filter((group) => !widgets.some(w => w.id === group.name))
        .map((group) => ({
            name: group.name,
            representativeName: group.representativeName,
            ids: group.ids,
            // Ensure the category matches ConfiguratorThreePhaseGroup['category'] which expects string
            category: group.category || 'general', 
        }));

    const currentDisplayedIds = widgets.flatMap(w => {
        if (w.content.type === 'dataPoint') return [w.content.data.id];
        if (w.content.type === 'threePhaseGroup') {
            // --- ERROR 3 INSTRUCTION: ---
            // This relies on `originalIds` existing on `ThreePhaseGroupInfo`.
            // Ensure `originalIds: string[];` is in the interface definition in `../DashboardData/dashboardInterfaces.ts`.
            return w.content.data.originalIds || [];
        }
        return [];
    });

    const toggleEditMode = () => {
        if (isEditMode) {
            saveDashboardState();
        }
        setIsEditMode(!isEditMode);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
                    <LayoutDashboard className="mr-3 h-7 w-7 text-primary" /> My Dashboard
                </h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsConfiguratorOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Items
                    </Button>
                    <Button variant={isEditMode ? "default" : "outline"} onClick={toggleEditMode}>
                        {isEditMode ? <Check className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
                        {isEditMode ? 'Done Editing' : 'Edit Layout'}
                    </Button>
                    {isEditMode && (
                         <Button variant="secondary" onClick={saveDashboardState} title="Force save current layout changes">
                            <Save className="mr-2 h-4 w-4" /> Save Now
                        </Button>
                    )}
                </div>
            </div>

            <DashboardItemConfigurator
                isOpen={isConfiguratorOpen}
                onClose={() => setIsConfiguratorOpen(false)}
                availableIndividualPoints={availableIndividualPoints}
                availableThreePhaseGroups={availableThreePhaseGroups}
                currentDisplayedIds={currentDisplayedIds}
                onAddMultipleDataPoints={handleAddMultipleDataPoints}
            />

            <DashboardGridLayout
                widgets={widgets}
                onWidgetsChange={setWidgets}
                layouts={layouts}
                onLayoutsChange={setLayouts}
                isEditMode={isEditMode}
                nodeValues={nodeValues}
                isDisabled={false}
                sendDataToWebSocket={sendDataToWebSocket}
                playNotificationSound={playNotificationSound}
                lastToastTimestamps={lastToastTimestamps}
            />
        </div>
    );
};

export default MyDashboardPage;